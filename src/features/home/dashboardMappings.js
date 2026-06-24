function toNumberId(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export const ACTIVE_SERIES_STATUSES = new Set([
  'ONGOING',
  'AT_RISK',
  'HIATUS',
  'PUBLISHED',
])

export function resolveSeriesOwnerId(series) {
  return (
    toNumberId(series?.mangakaId) ||
    toNumberId(series?.mangaka?.id) ||
    toNumberId(series?.authorId) ||
    null
  )
}

export function isActiveSeriesStatus(status) {
  return ACTIVE_SERIES_STATUSES.has(status)
}
