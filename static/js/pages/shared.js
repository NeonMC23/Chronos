// Shared helpers for home previews and formatting.
export function formatTimeHMS(date, timeZone) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  } catch {
    return "--:--:--";
  }
}

export function findBestTimezoneEntry(entries, timeZone) {
  if (!Array.isArray(entries) || !timeZone) return null;
  return entries.find((e) => e && e.timezone === timeZone) || null;
}
