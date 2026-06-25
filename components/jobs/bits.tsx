"use client";

import { Channel, Priority, Stage } from "@/lib/jobs/types";

/* Stage accent ramp — drawn entirely from the existing warm palette.
   Colour here is semantic (it encodes pipeline state), not decoration:
   cool coffee for the cold end, olive as things warm up, espresso at the
   decision point, muted clay for closed. */
export const STAGE_COLOR: Record<Stage, string> = {
  lead: "var(--coffee-soft)",
  to_contact: "var(--coffee)",
  contacted: "var(--olive-soft)",
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
  cold: "var(--coffee-soft)",
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

const CHANNEL_TAG_LABEL: Record<Channel, string> = {
  linkedin: "LinkedIn",
  email: "Email",
  x: "X",
  referral: "Referral",
  other: "Other",
};

/** Build a usable href from a stored contact handle, given its channel.
   Email → mailto:, anything else → an https URL. Returns null when empty. */
export function contactHref(channel: Channel, link?: string): string | null {
  const v = (link ?? "").trim();
  if (!v) return null;
  if (channel === "email") return v.startsWith("mailto:") ? v : `mailto:${v}`;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export function ChannelTag({ channel, link }: { channel: Channel; link?: string }) {
  const base = "label !text-[9px] !tracking-[0.1em] border hairline px-1.5 py-[1px]";
  const href = contactHref(channel, link);
  if (href) {
    return (
      <a
        href={href}
        target={channel === "email" ? undefined : "_blank"}
        rel="noreferrer"
        title={link}
        onClick={(e) => e.stopPropagation()}
        className={`${base} text-olive-deep hover:bg-olive/10 hover:border-olive/50 transition-colors`}
      >
        {CHANNEL_TAG_LABEL[channel]} ↗
      </a>
    );
  }
  return (
    <span className={`${base} text-coffee`}>{CHANNEL_TAG_LABEL[channel]}</span>
  );
}

/** Format an ISO date (YYYY-MM-DD) as e.g. "Jun 15". Empty -> "". */
export function shortDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso.length > 10 ? iso.slice(0, 10) : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
