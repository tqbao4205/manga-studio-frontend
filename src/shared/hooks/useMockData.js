import { useState, useEffect } from 'react'
import {
  mockSeries, mockChapters, mockPages, mockRegions, mockTasks,
  mockTaskSubmissions, mockTaskAttachments, mockLayers, mockComments,
  mockAnnotations, mockRankings, mockDashboardStats,
  mockActivities, mockSchedules, mockUsers,
  mockBoardVotes,
} from '../constants/mock-data'
import taskService from '../../services/taskService'

function delay(data, ms = 200) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function useAsyncData(fetchFn, deps) {
  const [state, setState] = useState({ data: null, isLoading: true })
  useEffect(() => {
    let cancelled = false
    setState({ data: null, isLoading: true })
    fetchFn().then((data) => {
      if (!cancelled) setState({ data, isLoading: false })
    })
    return () => { cancelled = true }
  }, deps)
  return state
}

export function useSeriesList() {
  return useAsyncData(() => delay({ content: mockSeries, page: 0, size: 20, totalElements: mockSeries.length, totalPages: 1 }), [])
}

export function useSeriesDetail(id) {
  return useAsyncData(() => delay(mockSeries.find(s => s.id === id) || null), [id])
}

export function useChaptersBySeries(seriesId) {
  const chapters = mockChapters[seriesId] || []
  return useAsyncData(() => delay({ content: chapters, page: 0, size: 20, totalElements: chapters.length, totalPages: 1 }), [seriesId])
}

export function useChapterDetail(id) {
  const allChapters = Object.values(mockChapters).flat()
  return useAsyncData(() => delay(allChapters.find(c => c.id === id) || null), [id])
}

export function usePagesByChapter(chapterId) {
  const pages = mockPages[chapterId] || []
  return useAsyncData(() => delay(pages), [chapterId])
}

export function useRegionsByPage(pageId) {
  const regions = mockRegions[pageId] || []
  return useAsyncData(() => delay(regions), [pageId])
}

export function useLayersByPage(pageId) {
  const layers = mockLayers[pageId] || []
  return useAsyncData(() => delay(layers), [pageId])
}

export function useTasks() {
  return useAsyncData(async () => {
    try {
      const response = await taskService.getAll({ page: 0, size: 100 })
      return response?.content || []
    } catch {
      return mockTasks
    }
  }, [])
}

export function useTaskSubmissions(taskId) {
  const subs = taskId
    ? mockTaskSubmissions.filter(s => s.taskId === taskId)
    : mockTaskSubmissions
  return useAsyncData(() => delay(subs), [taskId])
}

export function useTaskAttachments(taskId) {
  const atts = taskId
    ? mockTaskAttachments.filter(a => a.taskId === taskId)
    : mockTaskAttachments
  return useAsyncData(() => delay(atts), [taskId])
}

export function useCommentsByPage(pageId) {
  const comments = mockComments[pageId] || []
  return useAsyncData(() => delay(comments), [pageId])
}

export function useAnnotationsByPage(pageId) {
  const annotations = mockAnnotations[pageId] || []
  return useAsyncData(() => delay(annotations), [pageId])
}

export function useCurrentRankings() {
  return useAsyncData(() => delay({ content: mockRankings, page: 0, size: 20, totalElements: mockRankings.length, totalPages: 1 }), [])
}

export function useDashboardStats(userId) {
  const stats = mockDashboardStats[userId]
  return useAsyncData(() => delay(stats || null), [userId])
}

export function useActivities() {
  return useAsyncData(() => delay(mockActivities), [])
}

export function useSchedules() {
  return useAsyncData(() => delay(mockSchedules), [])
}

export function useUsers() {
  return useAsyncData(() => delay(mockUsers), [])
}

export function useBoardVotes() {
  return useAsyncData(() => delay(mockBoardVotes), [])
}
