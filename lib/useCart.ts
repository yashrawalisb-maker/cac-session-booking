"use client";

import { useCallback, useEffect, useState } from "react";

/** A tentative (not-yet-booked) pick in a student's booking plan for one event. */
export type CartItem = {
  sessionId: string;
  title: string;
  timeLabel: string;
  startsAtMs: number;
  endsAtMs: number;
  // Set only for WIB sessions — the chosen table track.
  sessionTrackId?: string;
  trackLabel?: string;
};

function storageKey(eventId: string) {
  return `cac-cart:${eventId}`;
}

function readCart(eventId: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(eventId));
    const val = raw ? JSON.parse(raw) : [];
    return Array.isArray(val) ? (val as CartItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * The student's booking "cart" for one event — tentative picks held entirely in the browser
 * (localStorage), never touching the server until a batched Confirm-all. Persists across refreshes
 * and syncs across tabs via the `storage` event. Use ONE instance per page (drill handlers down),
 * since same-document writes don't fire the `storage` event on themselves.
 */
export function useCart(eventId: string) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable client-side, so the initial read happens post-mount to avoid an SSR hydration mismatch
    setItems(readCart(eventId));
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey(eventId)) setItems(readCart(eventId));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [eventId]);

  const update = useCallback(
    (fn: (prev: CartItem[]) => CartItem[]) => {
      setItems((prev) => {
        const next = fn(prev);
        try {
          window.localStorage.setItem(storageKey(eventId), JSON.stringify(next));
        } catch {
          // ignore quota/serialization errors — the in-memory state is still updated
        }
        return next;
      });
    },
    [eventId]
  );

  const add = useCallback(
    (item: CartItem) => update((prev) => [...prev.filter((i) => i.sessionId !== item.sessionId), item]),
    [update]
  );
  const remove = useCallback(
    (sessionId: string) => update((prev) => prev.filter((i) => i.sessionId !== sessionId)),
    [update]
  );
  const clear = useCallback(() => update(() => []), [update]);
  const has = useCallback((sessionId: string) => items.some((i) => i.sessionId === sessionId), [items]);

  return { items, add, remove, clear, has, count: items.length };
}
