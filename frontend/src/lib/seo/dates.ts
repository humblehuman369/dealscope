/**
 * Schema.org `datePublished` / `dateModified` want a full ISO 8601 datetime
 * with a UTC offset; Google's Rich Results Test flags a bare `YYYY-MM-DD` as
 * "Invalid datetime value … missing a timezone". Content dates stay
 * `YYYY-MM-DD` everywhere else (frontmatter, `config/site.ts`, the visible
 * "Updated …" copy, the sitemap); this derives the schema form from them.
 *
 * Dates are anchored at 09:00 local in the HQ time zone (America/New_York;
 * Boca Raton) with that day's offset, so `-05:00` in EST and `-04:00` in EDT.
 */
const SCHEMA_TIME_ZONE = 'America/New_York'
const SCHEMA_LOCAL_TIME = '09:00:00'
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function toSchemaDateTime(isoDate: string): string
export function toSchemaDateTime(isoDate: string | undefined): string | undefined
export function toSchemaDateTime(isoDate: string | undefined): string | undefined {
  if (!isoDate || !ISO_DATE.test(isoDate)) return isoDate
  // Sample the offset around 09:00 local (14:00Z is 09:00 EST / 10:00 EDT):
  // a DST switch happens at 02:00 local, so it is already in effect by then.
  const probe = new Date(`${isoDate}T14:00:00Z`)
  if (Number.isNaN(probe.getTime())) return isoDate
  return `${isoDate}T${SCHEMA_LOCAL_TIME}${utcOffset(probe, SCHEMA_TIME_ZONE)}`
}

/** `±HH:MM` offset of `timeZone` from UTC at `instant`. */
function utcOffset(instant: Date, timeZone: string): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(instant)
    .find((p) => p.type === 'timeZoneName')?.value
  // "GMT-05:00" → "-05:00"; a zero offset is rendered as plain "GMT".
  const offset = name?.replace(/^GMT/, '') ?? ''
  return offset || '+00:00'
}
