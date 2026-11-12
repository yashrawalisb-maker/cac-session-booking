"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  STAGES,
  buildStageIndex,
  statsFor,
  type SlotStats,
  type Stage,
  type StageMap,
  type TravelCheckpointDTO,
  type TravelScanDTO,
  type TravelSlotDTO,
  type TravelSnapshot,
  type TravelStudentDTO,
} from "@/lib/travel-shared";

/**
 * Live Travel Log data for the admin dashboard and the team member check-in station.
 *
 * - Loads one snapshot, then polls /api/travel/scans every few seconds (≈11 viewers, so polling
 *   is effectively live without adding Supabase Realtime + RLS to Prisma-owned tables).
 * - Every check-in goes into a localStorage queue first and is flushed in order, so scans made
 *   with no signal are kept and sync automatically on reconnect.
 * - The last snapshot is cached per user so QR lookups still work offline.
 */

type QueuedScan = {
  userId: string;
  checkpointId: string;
  method: "qr" | "manual";
  notes: string | null;
  scannedAt: string;
};

type RecordInput = { userId: string; checkpointId: string; method: "qr" | "manual"; notes?: string | null };

type Ctx = {
  status: "loading" | "ready" | "error";
  loadError: string | null;
  me: TravelSnapshot["me"] | null;
  slots: TravelSlotDTO[];
  checkpoints: TravelCheckpointDTO[];
  students: TravelStudentDTO[];
  scans: TravelScanDTO[];
  online: boolean;
  live: boolean;
  syncing: boolean;
  queueSize: number;
  notice: string | null;
  clearNotice: () => void;
  recordScan: (input: RecordInput) => void;
  undoScan: (userId: string, checkpointId: string) => Promise<void>;
  setMyCheckpoint: (checkpointId: string) => Promise<void>;
  refresh: () => Promise<void>;
  slotById: Map<string, TravelSlotDTO>;
  checkpointById: Map<string, TravelCheckpointDTO>;
  studentById: Map<string, TravelStudentDTO>;
  scannerName: (id: string | null) => string;
  checkpointFor: (slotId: string | null | undefined, stage: Stage) => TravelCheckpointDTO | undefined;
  stagesFor: (userId: string) => StageMap;
  slotStats: (slotId: string | null) => SlotStats;
};

const TravelContext = createContext<Ctx | null>(null);

export function useTravel() {
  const ctx = useContext(TravelContext);
  if (!ctx) throw new Error("useTravel must be used inside <TravelDataProvider>");
  return ctx;
}

const POLL_MS = 5000;
const FULL_REFRESH_MS = 60000;
const scanKey = (s: { userId: string; checkpointId: string }) => `${s.userId}:${s.checkpointId}`;

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full/blocked — the app still works, just without the offline copy */
  }
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function getJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status, (body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

const isNetworkError = (e: unknown) => !(e instanceof HttpError);

export function TravelDataProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const cacheKey = `travel.cache.v1:${userId}`;
  const queueKey = `travel.queue.v1:${userId}`;
  const adminCpKey = `travel.adminCheckpoint:${userId}`;

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [snap, setSnap] = useState<Omit<TravelSnapshot, "scans"> | null>(null);
  const [serverScans, setServerScans] = useState<Map<string, TravelScanDTO>>(new Map());
  const [queue, setQueue] = useState<QueuedScan[]>([]);
  const [browserOnline, setBrowserOnline] = useState(true);
  const [netFail, setNetFail] = useState(false);
  const [lastPollOk, setLastPollOk] = useState(0);
  const [clock, setClock] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const queueRef = useRef<QueuedScan[]>([]);
  const flushingRef = useRef(false);
  const namesRef = useRef<Map<string, string>>(new Map());

  const updateQueue = useCallback(
    (fn: (q: QueuedScan[]) => QueuedScan[]) => {
      queueRef.current = fn(queueRef.current);
      setQueue(queueRef.current);
      writeJSON(queueKey, queueRef.current);
    },
    [queueKey],
  );

  const applySnapshot = useCallback(
    (s: TravelSnapshot) => {
      // Admins have no coordinator row; remember their checkpoint on this device instead.
      const me = s.me.isAdmin ? { ...s.me, checkpointId: readJSON<string>(adminCpKey) } : s.me;
      const { scans, ...rest } = s;
      setSnap({ ...rest, me });
      setServerScans(new Map(scans.map((x) => [scanKey(x), x])));
    },
    [adminCpKey],
  );

  const loadAll = useCallback(async () => {
    const s = await getJSON<TravelSnapshot>("/api/travel/snapshot");
    applySnapshot(s);
    writeJSON(cacheKey, s);
    setNetFail(false);
    setLastPollOk(Date.now());
  }, [applySnapshot, cacheKey]);

  const loadScans = useCallback(async () => {
    const { scans } = await getJSON<{ scans: TravelScanDTO[] }>("/api/travel/scans");
    setServerScans(new Map(scans.map((x) => [scanKey(x), x])));
    setNetFail(false);
    setLastPollOk(Date.now());
  }, []);

  // ---- initial load: offline copy first, then the network ---------------------------------
  useEffect(() => {
    let cancelled = false;
    // Deferred so the cached state isn't set synchronously inside the effect body.
    const t = setTimeout(async () => {
      setBrowserOnline(navigator.onLine);
      const cached = readJSON<TravelSnapshot>(cacheKey);
      if (cached) {
        applySnapshot(cached);
        setStatus("ready");
      }
      queueRef.current = readJSON<QueuedScan[]>(queueKey) ?? [];
      setQueue(queueRef.current);
      try {
        await loadAll();
        if (!cancelled) setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        if (isNetworkError(e)) setNetFail(true);
        if (e instanceof HttpError && e.status === 401) location.href = "/login";
        if (!cached) {
          setLoadError(isNetworkError(e) ? "Can't reach the server and there's no offline copy on this phone yet." : (e as Error).message);
          setStatus("error");
        }
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [applySnapshot, cacheKey, loadAll, queueKey]);

  // ---- offline queue -----------------------------------------------------------------------
  const flush = useCallback(async () => {
    if (flushingRef.current || !queueRef.current.length) return;
    flushingRef.current = true;
    setSyncing(true);
    try {
      while (queueRef.current.length) {
        const item = queueRef.current[0];
        try {
          const { scan } = await getJSON<{ scan: TravelScanDTO }>("/api/travel/scans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          });
          setNetFail(false);
          setServerScans((prev) => new Map(prev).set(scanKey(scan), scan));
        } catch (e) {
          if (isNetworkError(e)) {
            setNetFail(true);
            break; // keep it queued; retry later
          }
          const err = e as HttpError;
          if (err.status === 401 || err.status >= 500) {
            if (err.status === 401) setNotice("Your sign-in expired. Check-ins are saved on this phone — sign in again to sync them.");
            break;
          }
          setNotice(`Couldn't save a check-in for ${namesRef.current.get(item.userId) ?? "a student"}: ${err.message}`);
        }
        updateQueue((q) => q.slice(1));
      }
    } finally {
      flushingRef.current = false;
      setSyncing(false);
    }
  }, [updateQueue]);

  const recordScan = useCallback(
    ({ userId: studentId, checkpointId, method, notes }: RecordInput) => {
      updateQueue((q) => [
        ...q,
        { userId: studentId, checkpointId, method, notes: notes?.trim() || null, scannedAt: new Date().toISOString() },
      ]);
      void flush();
    },
    [flush, updateQueue],
  );

  // ---- polling + reconnect -----------------------------------------------------------------
  useEffect(() => {
    if (status !== "ready") return;
    let lastFull = Date.now();
    const tick = async () => {
      setClock(Date.now());
      if (document.visibilityState !== "visible") return;
      void flush();
      try {
        if (Date.now() - lastFull > FULL_REFRESH_MS) {
          lastFull = Date.now();
          await loadAll();
        } else {
          await loadScans();
        }
      } catch (e) {
        if (isNetworkError(e)) setNetFail(true);
      }
    };
    const onOnline = () => {
      setBrowserOnline(true);
      void tick();
    };
    const onOffline = () => setBrowserOnline(false);
    const onVisible = () => document.visibilityState === "visible" && void tick();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(tick, POLL_MS);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [status, flush, loadAll, loadScans]);

  // ---- derived -------------------------------------------------------------------------------
  const slots = useMemo(() => snap?.slots ?? [], [snap]);
  const checkpoints = useMemo(() => snap?.checkpoints ?? [], [snap]);
  const students = useMemo(() => snap?.students ?? [], [snap]);
  const me = snap?.me ?? null;

  useEffect(() => {
    namesRef.current = new Map(students.map((s) => [s.id, s.name]));
  }, [students]);

  const scans = useMemo(() => {
    const merged = new Map(serverScans);
    for (const q of queue) {
      const k = scanKey(q);
      merged.set(k, {
        id: `pending:${k}`,
        userId: q.userId,
        checkpointId: q.checkpointId,
        scannedById: me?.userId ?? null,
        scannedAt: q.scannedAt,
        method: q.method,
        notes: q.notes ?? merged.get(k)?.notes ?? null,
        pending: true,
      });
    }
    return [...merged.values()];
  }, [serverScans, queue, me]);

  const slotById = useMemo(() => new Map(slots.map((s) => [s.id, s])), [slots]);
  const checkpointById = useMemo(() => new Map(checkpoints.map((c) => [c.id, c])), [checkpoints]);
  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const scannerNames = useMemo(() => new Map((snap?.scanners ?? []).map((m) => [m.id, m.name])), [snap]);
  const cpIndex = useMemo(() => new Map(checkpoints.map((c) => [`${c.slotId}:${c.stage}`, c])), [checkpoints]);
  const stageIndex = useMemo(() => buildStageIndex(scans, checkpointById, studentById), [scans, checkpointById, studentById]);
  const statsBySlot = useMemo(() => {
    const out = new Map<string | null, SlotStats>();
    for (const slot of slots) out.set(slot.id, statsFor(students.filter((s) => s.slotId === slot.id), stageIndex));
    out.set(null, statsFor(students.filter((s) => !s.slotId || !slotById.has(s.slotId)), stageIndex));
    return out;
  }, [slots, students, stageIndex, slotById]);

  const checkpointFor = useCallback(
    (slotId: string | null | undefined, stage: Stage) => (slotId ? cpIndex.get(`${slotId}:${stage}`) : undefined),
    [cpIndex],
  );
  const stagesFor = useCallback((id: string) => stageIndex.get(id) ?? {}, [stageIndex]);
  const slotStats = useCallback(
    (id: string | null) =>
      statsBySlot.get(id) ?? { total: 0, counts: { BUS: 0, AIRPORT: 0, GATE: 0 }, activeStage: STAGES[0], done: 0, pct: 0 },
    [statsBySlot],
  );
  const scannerName = useCallback((id: string | null) => (id ? (scannerNames.get(id) ?? "") : ""), [scannerNames]);

  // ---- actions -------------------------------------------------------------------------------
  const undoScan = useCallback(
    async (studentId: string, checkpointId: string) => {
      updateQueue((q) => q.filter((x) => !(x.userId === studentId && x.checkpointId === checkpointId)));
      await getJSON("/api/travel/scans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: studentId, checkpointId }),
      });
      setServerScans((prev) => {
        const next = new Map(prev);
        next.delete(`${studentId}:${checkpointId}`);
        return next;
      });
    },
    [updateQueue],
  );

  const setMyCheckpoint = useCallback(
    async (checkpointId: string) => {
      if (snap?.me.isAdmin) writeJSON(adminCpKey, checkpointId);
      else
        await getJSON("/api/travel/my-checkpoint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkpointId }),
        });
      setSnap((prev) => (prev ? { ...prev, me: { ...prev.me, checkpointId } } : prev));
    },
    [snap, adminCpKey],
  );

  const refresh = useCallback(async () => {
    try {
      await loadAll();
      void flush();
    } catch (e) {
      if (isNetworkError(e)) setNetFail(true);
      else setNotice((e as Error).message);
    }
  }, [loadAll, flush]);

  const online = browserOnline && !netFail;
  const value: Ctx = {
    status,
    loadError,
    me,
    slots,
    checkpoints,
    students,
    scans,
    online,
    live: online && clock - lastPollOk < POLL_MS * 3,
    syncing,
    queueSize: queue.length,
    notice,
    clearNotice: () => setNotice(null),
    recordScan,
    undoScan,
    setMyCheckpoint,
    refresh,
    slotById,
    checkpointById,
    studentById,
    scannerName,
    checkpointFor,
    stagesFor,
    slotStats,
  };

  return <TravelContext.Provider value={value}>{children}</TravelContext.Provider>;
}
