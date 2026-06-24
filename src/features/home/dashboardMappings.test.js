import { describe, expect, it } from 'vitest'
import {
  isActiveSeriesStatus,
  resolveSeriesOwnerId,
} from './dashboardMappings'

describe('dashboardMappings', () => {
  it('maps owner id from mangakaId', () => {
    expect(resolveSeriesOwnerId({ mangakaId: 42 })).toBe(42)
  })

  it('maps owner id from nested mangaka.id', () => {
    expect(resolveSeriesOwnerId({ mangaka: { id: '77' } })).toBe(77)
  })

  it('accepts backend active statuses and rejects pending approval', () => {
    expect(isActiveSeriesStatus('ONGOING')).toBe(true)
    expect(isActiveSeriesStatus('AT_RISK')).toBe(true)
    expect(isActiveSeriesStatus('PENDING_APPROVAL')).toBe(false)
    expect(isActiveSeriesStatus('IN_REVIEW')).toBe(false)
  })
})
