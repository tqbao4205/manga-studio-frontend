import taskService from '../../../services/taskService'
import assistantService from '../../../services/assistantService'
import seriesService from '../../../services/seriesService'
import chapterService from '../../../services/chapterService'
import pageService from '../../../services/pageService'
import regionService from '../../../services/regionService'

export const tasksListService = {
  fetchTasks: async (params = {}) => {
    const response = await taskService.getAll({ page: 0, size: 100, ...params })
    return response?.content || []
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
        .map((task) => task?.regionId)
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
              chapterNumber: chapter.chapterNumber,
              pageNumber: page.pageNumber,
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
