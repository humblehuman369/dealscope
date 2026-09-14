/** "1 price cut" / "2 price cuts". */
export function pluralNoun(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural
}

export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${pluralNoun(count, singular, plural)}`
}
