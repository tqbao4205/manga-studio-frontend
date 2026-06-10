import { useCallback, useEffect, useMemo, useState } from 'react'
import { tasksListService } from '../services/tasksListService'

function decorateTask(task, regionSeriesLookup = new Map()) {
  const mappedSeries = regionSeriesLookup.get(Number(task.regionId)) || null
  const seriesId = task.seriesId || mappedSeries?.seriesId || null
  const seriesTitle = task.seriesTitle || mappedSeries?.seriesTitle || 'Unknown Series'
  const chapterId = task.chapterId || mappedSeries?.chapterId || null
  const chapterNumber = task.chapterNumber || mappedSeries?.chapterNumber || null
  const pageNumber = task.pageNumber || mappedSeries?.pageNumber || null
  const pageWidth = task.pageWidth || mappedSeries?.pageWidth || null
  const pageHeight = task.pageHeight || mappedSeries?.pageHeight || null

  return {
    ...task,
    assistant: task.assistant || (task.assistantId ? { id: task.assistantId } : null),
    assignedBy: task.assignedBy || null,
    seriesId,
    seriesTitle,
    chapterId,
    pageWidth,
    pageHeight,
    chapterLabel: chapterNumber ? `Chapter ${chapterNumber}` : null,
    pageLabel: pageNumber ? `Page ${pageNumber}` : null,
    thumbnailUrl: task.pageImageUrl || task.referenceImageUrl || '',
  }
}

export function useTasksListData() {
  const [tasks, setTasks] = useState([])
  const [assistants, setAssistants] = useState([])
  const [series, setSeries] = useState([])
  const [regionSeriesLookup, setRegionSeriesLookup] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [{ assistants: assistantItems, series: seriesItems }, items] = await Promise.all([
        tasksListService.fetchFilterOptions(),
        tasksListService.fetchTasks(),
      ])

      const nextRegionSeriesLookup = await tasksListService.resolveRegionSeriesLookup(
        items,
        seriesItems,
      )

      setAssistants(assistantItems)
      setSeries(seriesItems)
      setRegionSeriesLookup(nextRegionSeriesLookup)
      setTasks(items.map((task) => decorateTask(task, nextRegionSeriesLookup)))
    } catch (err) {
      setError(err.message || 'Could not load tasks')
      setTasks([])
      setAssistants([])
      setSeries([])
      setRegionSeriesLookup(new Map())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const openTaskDetail = useCallback(async (task) => {
    setSelectedTaskId(task.id)
    setDetailLoading(true)

    try {
      const detail = await tasksListService.fetchTaskDetail(task.id)
      setSelectedTaskDetail(decorateTask(detail, regionSeriesLookup))
    } catch {
      setSelectedTaskDetail(task)
    } finally {
      setDetailLoading(false)
    }
  }, [regionSeriesLookup])

  const closeTaskDetail = useCallback(() => {
    setSelectedTaskId(null)
    setSelectedTaskDetail(null)
    setDetailLoading(false)
  }, [])

  const fallbackSeriesOptions = useMemo(() => {
    const unique = new Map()
    tasks.forEach((task) => {
      if (task.seriesId) unique.set(task.seriesId, task.seriesTitle)
    })

    return Array.from(unique.entries()).map(([value, label]) => ({
      value: String(value),
      label,
    }))
  }, [tasks])

  const fallbackAssigneeOptions = useMemo(() => {
    const unique = new Map()
    tasks.forEach((task) => {
      if (task.assistant?.id) {
        unique.set(task.assistant.id, task.assistant.displayName || `User #${task.assistant.id}`)
      }
    })

    return Array.from(unique.entries()).map(([value, label]) => ({
      value: String(value),
      label,
    }))
  }, [tasks])

  const seriesOptions = useMemo(() => {
    if (series.length > 0) {
      return series
        .filter((item) => item?.id)
        .map((item) => ({
          value: String(item.id),
          label: item.title || `Series #${item.id}`,
        }))
    }
    return fallbackSeriesOptions
  }, [series, fallbackSeriesOptions])

  const assigneeOptions = useMemo(() => {
    if (assistants.length > 0) {
      return assistants
        .filter((item) => item?.id)
        .map((item) => ({
          value: String(item.id),
          label: item.displayName || item.username || `User #${item.id}`,
        }))
    }
    return fallbackAssigneeOptions
  }, [assistants, fallbackAssigneeOptions])

  return {
    tasks,
    loading,
    error,
    reloadTasks: loadTasks,
    selectedTaskId,
    selectedTaskDetail,
    detailLoading,
    openTaskDetail,
    closeTaskDetail,
    assigneeOptions,
    seriesOptions,
  }
}
