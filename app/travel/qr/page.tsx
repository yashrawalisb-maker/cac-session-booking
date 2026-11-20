import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, Download } from "lucide-react";
import { requireUser } from "@/lib/authz";
import { TRAVEL_STAGES, canUseTravelScanner } from "@/lib/travel";
import { requestOrigin, stageCheckinUrls } from "@/lib/travel-token";
import { STAGE_LABEL, type Stage } from "@/lib/travel-shared";
import { PrintButton } from "@/components/travel/print-button";

const WHERE: Record<Stage, string> = {
  BUS: "Board the bus at Mohali campus → Chandigarh airport",
  AIRPORT: "Chandigarh airport → flight to Hyderabad",
  GATE: "Board the bus at Hyderabad airport → campus",
};

/**
 * The three static check-in QR codes (one per checkpoint, the same for every flight), ready to print
 * one per page or download as PNGs. Admins and travel team members only. Print from the live site so
 * the QRs point at it.
 */
export default async function TravelQrPage() {
  const user = await requireUser();
  if (!(await canUseTravelScanner(user))) redirect("/travel");

  const urls = stageCheckinUrls(requestOrigin(await headers()));
  const cards = await Promise.all(
    TRAVEL_STAGES.map(async (stage) => ({
      stage,
      png: await QRCode.toDataURL(urls[stage], { margin: 2, width: 1000, errorCorrectionLevel: "M" }),
    })),
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 bg-white px-4 py-8 text-gray-900 print:max-w-none print:gap-0 print:p-0">
      <div className="flex flex-col gap-3 print:hidden">
        <Link href={user.isAdmin ? "/admin/travel" : "/travel/station"} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Check-in QR codes</h1>
        <p className="text-sm text-gray-600">
          Three QR codes, the same for every flight. Put each one up at its checkpoint. When a student scans it, the check-in counts
          for their own flight. Students who aren&apos;t on a flight are told to see a team member.
        </p>
        <div>
          <PrintButton />
        </div>
      </div>

      {cards.map(({ stage, png }, i) => (
        <section
          key={stage}
          className="flex flex-col items-center gap-4 rounded-2xl border border-gray-200 p-6 text-center print:min-h-screen print:justify-center print:rounded-none print:border-0 print:break-after-page"
        >
          <p className="text-sm font-medium tracking-wide text-gray-500 uppercase">{`CAC Mohali · Travel check-in · ${i + 1} of 3`}</p>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">{STAGE_LABEL[stage]}</h2>
          <p className="text-base text-gray-600">{WHERE[stage]}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={png} alt={`${STAGE_LABEL[stage]} check-in QR`} className="aspect-square w-full max-w-md" />
          <p className="max-w-md text-sm text-gray-600">
            {"Scan with the CAC app (Travel → Scan to check in) or your phone camera."}
          </p>
          <a
            href={png}
            download={`cac-mohali-checkin-${STAGE_LABEL[stage].toLowerCase().replace(/\s+/g, "-")}.png`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 underline-offset-4 hover:underline print:hidden"
          >
            <Download className="size-4" /> Download PNG
          </a>
        </section>
      ))}
    </main>
  );
}
