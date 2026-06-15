"use client";

import { Channel, Priority, Stage } from "@/lib/jobs/types";

/* Stage accent ramp — drawn entirely from the existing warm palette.
   Colour here is semantic (it encodes pipeline state), not decoration:
   cool coffee for the cold end, olive as things warm up, espresso at the
   decision point, muted clay for closed. */
export const STAGE_COLOR: Record<Stage, string> = {
  lead: "#8C7560", // coffee-soft
  to_contact: "var(--coffee)",
  contacted: "#878A5A", // olive-soft
  replied: "var(--olive)",
  interviewing: "var(--olive-deep)",
  offer: "var(--espresso)",
  closed: "var(--clay)",
};

export function StageDot({ stage }: { stage: Stage }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0"
      style={{ backgroundColor: STAGE_COLOR[stage] }}
      aria-hidden
    />
  );
}

const PRIORITY_COLOR: Record<Priority, string> = {
  hot: "var(--clay)",
  warm: "var(--olive)",
  cold: "#8C7560", // coffee-soft
};

export function PriorityDot({ p, withLabel }: { p: Priority; withLabel?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: PRIORITY_COLOR[p] }}
        aria-hidden
      />
      {withLabel && (
        <span className="label !text-[9px]" style={{ color: PRIORITY_COLOR[p] }}>
          {p}
        </span>
      )}
    </span>
  );
}

export function ChannelTag({ channel }: { channel: Channel }) {
  const label: Record<Channel, string> = {
    linkedin: "LinkedIn",
    email: "Email",
    x: "X",
    referral: "Referral",
    other: "Other",
  };
  return (
    <span className="label !text-[9px] !tracking-[0.1em] border hairline px-1.5 py-[1px] text-coffee">
      {label[channel]}
    </span>
  );
}

/** Format an ISO date (YYYY-MM-DD) as e.g. "Jun 15". Empty -> "". */
export function shortDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso.length > 10 ? iso.slice(0, 10) : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
