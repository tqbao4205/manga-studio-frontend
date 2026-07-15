import taskService from '../../../services/taskService'
import assistantService from '../../../services/assistantService'
import seriesService from '../../../services/seriesService'
import chapterService from '../../../services/chapterService'
import pageService from '../../../services/pageService'
import regionService from '../../../services/regionService'

export function toArray(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.content)) return payload.content
  return []
}

export function toNumberId(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function extractTaskRegionIds(task) {
  const ids = new Set()

  const directRegionId =
    toNumberId(task?.regionId) ||
    toNumberId(task?.region?.id)

  if (directRegionId) ids.add(directRegionId)

  ;(task?.regions || []).forEach((region) => {
    const id = toNumberId(region?.id)
    if (id) ids.add(id)
  })

  return Array.from(ids)
}

export function resolveTotalPages(payload) {
  const fromRoot = Number(payload?.totalPages)
  if (Number.isInteger(fromRoot) && fromRoot > 0) return fromRoot

  const fromPage = Number(payload?.page?.totalPages)
  if (Number.isInteger(fromPage) && fromPage > 0) return fromPage

  return 1
}

export const tasksListService = {
  fetchTasks: async (params = {}) => {
    const firstPage = await taskService.getAll({ page: 0, size: 100, ...params })
    const totalPages = resolveTotalPages(firstPage)

    if (totalPages <= 1) {
      return toArray(firstPage)
    }

    const remainingPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        taskService.getAll({ page: index + 1, size: 100, ...params }),
      ),
    )

    return [firstPage, ...remainingPages].flatMap((page) => toArray(page))
  },

  fetchTaskDetail: async (taskId) => {
    return taskService.getById(taskId)
  },

  updateTask: async (taskId, payload) => {
    return taskService.update(taskId, payload)
  },

  updateTaskStatus: async (taskId, status) => {
    return taskService.updateStatus(taskId, status)
  },

  deleteTask: async (taskId) => {
    return taskService.delete(taskId)
  },

  resolveRegionSeriesLookup: async (tasks = [], seriesItems = []) => {
    const neededRegionIds = new Set(
      tasks
        .flatMap((task) => extractTaskRegionIds(task))
        .filter(Boolean)
        .map((id) => Number(id)),
    )

    const lookup = new Map()
    if (neededRegionIds.size === 0 || seriesItems.length === 0) {
      return lookup
    }

    for (const series of seriesItems) {
      if (!series?.id || neededRegionIds.size === 0) break

      let chapters = []
      try {
        chapters = await chapterService.getBySeries(series.id)
      } catch {
        chapters = []
      }

      for (const chapter of chapters || []) {
        if (!chapter?.id || neededRegionIds.size === 0) break

        let pages = []
        try {
          pages = await pageService.getByChapter(chapter.id)
        } catch {
          pages = []
        }

        for (const page of pages || []) {
          if (!page?.id || neededRegionIds.size === 0) break

          let regions = []
          try {
            regions = await regionService.getByPage(page.id)
          } catch {
            regions = []
          }

          for (const region of regions || []) {
            const regionId = Number(region?.id)
            if (!neededRegionIds.has(regionId)) continue

            lookup.set(regionId, {
              seriesId: series.id,
              seriesTitle: series.title || `Series #${series.id}`,
              chapterId: chapter.id,
              chapterNumber: chapter.chapterNumber,
              pageNumber: page.pageNumber,
              pageId: page.id,
              pageWidth: page.width,
              pageHeight: page.height,
            })
            neededRegionIds.delete(regionId)

            if (neededRegionIds.size === 0) break
          }
        }
      }
    }

    return lookup
  },

  fetchFilterOptions: async () => {
    const [assistantsResult, seriesResult] = await Promise.allSettled([
      assistantService.getAssistants(),
      seriesService.getAll({ page: 0, size: 100 }),
    ])

    const assistants = assistantsResult.status === 'fulfilled'
      ? (assistantsResult.value || [])
      : []

    const series = seriesResult.status === 'fulfilled'
      ? (seriesResult.value?.content || [])
      : []

    return { assistants, series }
  },
}
