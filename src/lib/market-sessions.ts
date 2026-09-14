/**
 * Real US-equities session windows, from Backpack Securities' public
 * market-sessions and market-holidays endpoints.
 *
 * The chart's whole claim is "the reference price is only live while the
 * traditional market is open". Drawing that from hardcoded 9:30-16:00 would
 * mean inventing the calendar — wrong on holidays, wrong on half-days, and
 * wrong for an hour twice a year around DST. These come from the issuer.
 */

const SESSIONS_URL = "https://api.backpack.exchange/api/v1/market-sessions";
const HOLIDAYS_URL = "https://api.backpack.exchange/api/v1/market-holidays";

/** The session whose hours define "the traditional market is open". */
const REGULAR = "US_EQUITIES_REGULAR";

export type Window = { from: number; to: number };

type Session = {
  name: string;
  startTime: string;
  endTime: string;
  startWeekday: number;
  endWeekday: number;
  timezone: string;
};

type Holiday = {
  date: string;
  market: string;
  name: string;
  startTime: string;
  endTime: string;
};

/**
 * Minutes to add to a UTC instant to read it as wall-clock time in `zone`.
 * Negative for New York (-240 in EDT, -300 in EST).
 */
function zoneOffsetMinutes(at: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(at));

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  // Intl renders hour 24 for midnight in some engines; normalise to 0.
  const hour = get("hour") % 24;
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );
  return (asIfUtc - at) / 60_000;
}

/** The UTC instant of a wall-clock time on a given calendar date in `zone`. */
function zonedTimeToUtc(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
  zone: string,
): number {
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  // Offset sampled at the naive instant, then corrected once. A single
  // correction is enough except exactly inside a DST transition, which never
  // overlaps the 09:30-16:00 window.
  const first = zoneOffsetMinutes(naive, zone);
  const candidate = naive - first * 60_000;
  const second = zoneOffsetMinutes(candidate, zone);
  return naive - second * 60_000;
}

/** Calendar date and weekday of an instant, as seen in `zone`. 1 = Monday. */
function zonedDateParts(at: number, zone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date(at));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: weekdays.indexOf(get("weekday")) + 1,
    iso: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

const parseHms = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return { h, m };
};

/**
 * Regular-session windows overlapping [from, to].
 * Exported for testing — the fetch wrapper below is the runtime entry point.
 */
export function buildRegularWindows(
  session: Session,
  holidays: Holiday[],
  from: number,
  to: number,
): Window[] {
  const zone = session.timezone;
  const start = parseHms(session.startTime);
  const end = parseHms(session.endTime);

  // Full-day closures for US equities, keyed by ET calendar date.
  const closed = new Set(
    holidays
      .filter(
        (h) =>
          h.market === "US_EQUITIES" &&
          h.startTime === "00:00:00" &&
          h.endTime >= session.endTime,
      )
      .map((h) => h.date),
  );

  const windows: Window[] = [];
  // Step a day at a time from the ET date one day before `from`, to cover a
  // window that opens before the range starts.
  for (let cursor = from - 86_400_000; cursor <= to + 86_400_000; cursor += 86_400_000) {
    const { year, month, day, weekday, iso } = zonedDateParts(cursor, zone);

    if (weekday < session.startWeekday || weekday > session.endWeekday) continue;
    if (closed.has(iso)) continue;

    const open = zonedTimeToUtc(year, month, day, start.h, start.m, zone);
    const close = zonedTimeToUtc(year, month, day, end.h, end.m, zone);

    // Clip to the requested range; drop anything that falls outside it.
    const clippedFrom = Math.max(open, from);
    const clippedTo = Math.min(close, to);
    if (clippedTo > clippedFrom) windows.push({ from: clippedFrom, to: clippedTo });
  }

  // Days are visited in order, but a clipped first window can duplicate.
  return windows
    .sort((a, b) => a.from - b.from)
    .filter((w, i, all) => i === 0 || w.from !== all[i - 1].from);
}

/** Fetches sessions + holidays and returns open windows. [] on any failure. */
export async function fetchOpenWindows(
  from: number,
  to: number,
  revalidate: number,
  notes: string[],
): Promise<Window[]> {
  try {
    const headers = { accept: "application/json" };
    const [sessionsRes, holidaysRes] = await Promise.all([
      fetch(SESSIONS_URL, { headers, next: { revalidate } }),
      fetch(HOLIDAYS_URL, { headers, next: { revalidate } }),
    ]);

    if (!sessionsRes.ok) {
      notes.push(`Market sessions unavailable (${sessionsRes.status}).`);
      return [];
    }

    const sessions = (await sessionsRes.json()) as Session[];
    const session = sessions.find((s) => s.name === REGULAR);
    if (!session) {
      notes.push("No regular US-equities session published.");
      return [];
    }

    // Holidays are a refinement, not a requirement: without them the shading
    // is still right on every ordinary day.
    const holidays = holidaysRes.ok ? ((await holidaysRes.json()) as Holiday[]) : [];

    return buildRegularWindows(session, holidays, from, to);
  } catch {
    notes.push("Could not reach the market-sessions source.");
    return [];
  }
}
