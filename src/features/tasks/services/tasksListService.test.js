import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../services/taskService', () => ({
  default: {
    getAll: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../services/assistantService', () => ({
  default: { getAssistants: vi.fn() },
}))

vi.mock('../../../services/seriesService', () => ({
  default: { getAll: vi.fn() },
}))

vi.mock('../../../services/chapterService', () => ({
  default: { getBySeries: vi.fn() },
}))

vi.mock('../../../services/pageService', () => ({
  default: { getByChapter: vi.fn() },
}))

vi.mock('../../../services/regionService', () => ({
  default: { getByPage: vi.fn() },
}))

import taskService from '../../../services/taskService'
import {
  extractTaskRegionIds,
  tasksListService,
} from './tasksListService'

describe('tasksListService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches all pages based on totalPages', async () => {
    taskService.getAll
      .mockResolvedValueOnce({
        content: [{ id: 1 }],
        totalPages: 3,
      })
      .mockResolvedValueOnce({
        content: [{ id: 2 }],
        totalPages: 3,
      })
      .mockResolvedValueOnce({
        content: [{ id: 3 }],
        totalPages: 3,
      })

    const tasks = await tasksListService.fetchTasks({ status: 'TODO' })

    expect(tasks.map((task) => task.id)).toEqual([1, 2, 3])
    expect(taskService.getAll).toHaveBeenCalledTimes(3)
    expect(taskService.getAll).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ page: 0, size: 100, status: 'TODO' }),
    )
    expect(taskService.getAll).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 1, size: 100, status: 'TODO' }),
    )
    expect(taskService.getAll).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ page: 2, size: 100, status: 'TODO' }),
    )
  })

  it('extracts region ids from both regionId and regions[] shapes', () => {
    const ids = extractTaskRegionIds({
      regionId: 11,
      regions: [{ id: 22 }, { id: '33' }],
    })

    expect(ids).toEqual([11, 22, 33])
  })
})
