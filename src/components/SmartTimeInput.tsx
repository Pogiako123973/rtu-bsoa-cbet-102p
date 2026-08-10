import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * A 12-hour time input that auto-normalizes AM/PM for end times relative
 * to a sibling start time, so admins don't accidentally type "9:00" and
 * "1:00" and end up with a class that ends before it starts.
 *
 * On the wire, it always emits a 24-hour "HH:MM" string — compatible
 * with Postgres `time` and <input type="time">.
 */
export function SmartTimeInput({
  id,
  value,
  onChange,
  required,
  siblingStart, // "HH:MM" or undefined — used to pick the end's AM/PM
  label,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  /** When provided, the input defaults to PM if siblingStart is in AM, etc. */
  siblingStart?: string;
  label: string;
}) {
  // The native picker is 24h; we show 12h label alongside for clarity.
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  const hour24 = match ? Number(match[1]) : NaN;
  const minute = match ? match[2] : "";

  const display =
    Number.isFinite(hour24) && hour24 >= 0 && hour24 <= 23
      ? `${hour24 % 12 === 0 ? 12 : hour24 % 12}:${minute} ${hour24 < 12 ? "AM" : "PM"}`
      : "";

  // Smart default: when the sibling start is set and the current end time
  // (raw "H:MM" without AM/PM, hour 1-11) would be EARLIER than the start,
  // bump the end to PM by adding 12.
  useEffect(() => {
    if (!siblingStart || !match) return;
    const sMatch = /^(\d{1,2}):(\d{2})/.exec(siblingStart);
    if (!sMatch) return;
    const sH = Number(sMatch[1]);
    const h = Number(match[1]);
    if (Number.isNaN(sH) || Number.isNaN(h)) return;
    // Only auto-correct when both hours are 1-11 (the ambiguous zone).
    if (h >= 1 && h <= 11 && sH >= 1 && sH <= 11 && h <= sH) {
      onChange(`${String(h + 12).padStart(2, "0")}:${minute}`);
    }
  }, [siblingStart]); // intentional: only re-run when start changes

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="time"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-14"
        />
        {display && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground">
            {display}
          </span>
        )}
      </div>
    </div>
  );
}
