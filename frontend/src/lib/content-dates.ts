/** Format a `YYYY-MM-DD` frontmatter date for display; UTC-noon anchors avoid off-by-one days. */
export function formatContentDate(raw?: string): string | null {
  if (!raw) return null
  const date = new Date(`${raw}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
