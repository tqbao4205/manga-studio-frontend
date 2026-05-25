/**
 * ── useMockData.js ──
 * Custom hooks mô phỏng (mock) các API call cho giai đoạn phát triển frontend.
 *
 * 🎯 Mục đích:
 *   - Cho phép component sử dụng dữ liệu giả mà không cần backend thật
 *   - Mô phỏng độ trễ mạng (200ms) để kiểm tra trạng thái loading
 *   - Dễ dàng thay thế bằng API thật sau này (chỉ cần sửa hooks, không sửa component)
 *
 * 🔄 Cách hoạt động:
 *   1. Mỗi hook gọi fetchFn trả về Promise (dữ liệu mock sau delay)
 *   2. useAsyncData quản lý state { data, isLoading } và cleanup
 *   3. Component dùng: const { data, isLoading } = useSeriesList()
 *
 * 🗺️ Các hook:
 *   useSeriesList()          → danh sách tất cả series (phân trang giả)
 *   useSeriesDetail(id)      → chi tiết một series
 *   useChaptersBySeries(id)  → danh sách chapter của series
 *   useChapterDetail(id)     → chi tiết một chapter
 *   usePagesByChapter(id)    → danh sách trang của chapter
 *   useRegionsByPage(id)     → danh sách region trên trang
 *   useLayersByPage(id)      → danh sách layer của trang
 *   useTasks()               → tất cả task (công việc)
 *   useCommentsByPage(id)    → bình luận trên trang
 *   useCurrentRankings()     → bảng xếp hạng hiện tại
 *   useDashboardStats(id)    → thống kê cho dashboard
 *   useActivities()          → hoạt động gần đây
 *   useNotifications()       → thông báo
 *   useSchedules()           → lịch xuất bản
 *   useUsers()               → danh sách người dùng
 */

import { useState, useEffect } from 'react'
import {
  mockSeries, mockChapters, mockPages, mockRegions, mockTasks,
  mockLayers, mockComments, mockRankings, mockDashboardStats,
  mockActivities, mockNotifications, mockSchedules, mockUsers,
} from '../constants/mock-data'

/**
 * delay — Mô phỏng độ trễ mạng bằng setTimeout.
 *
 * @param {*} data - Dữ liệu cần trả về
 * @param {number} [ms=200] - Thời gian delay (milliseconds)
 * @returns {Promise<*>} - Promise resolve với dữ liệu sau delay
 */
function delay(data, ms = 200) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

/**
 * useAsyncData — Hook nội bộ quản lý trạng thái async.
 *
 * @param {Function} fetchFn - Hàm async trả về dữ liệu
 * @param {Array}    deps    - Mảng dependencies (giống useEffect)
 * @returns {{ data: any, isLoading: boolean }}
 *
 * State:
 *   - data      → dữ liệu nhận được từ fetchFn (null nếu chưa load / đang load lại)
 *   - isLoading → true khi đang chờ fetchFn hoàn thành
 *
 * Luồng:
 *   1. deps thay đổi → setState({ data: null, isLoading: true })
 *   2. Gọi fetchFn()
 *   3. Nếu component chưa unmount → setState({ data, isLoading: false })
 *   4. Cleanup function đặt cancelled = true → ngăn setState sau unmount
 */
function useAsyncData(fetchFn, deps) {
  const [state, setState] = useState({ data: null, isLoading: true })
  useEffect(() => {
    let cancelled = false
    setState({ data: null, isLoading: true })
    fetchFn().then((data) => {
      if (!cancelled) setState({ data, isLoading: false })
    })
    return () => { cancelled = true }
  }, deps)  // eslint-disable-line react-hooks/exhaustive-deps
  return state
}

// ──────────────────────────────────────────────
//  Series
// ──────────────────────────────────────────────

/** useSeriesList — Danh sách tất cả series (mô phỏng phân trang). */
export function useSeriesList() {
  return useAsyncData(() => delay({ content: mockSeries, page: 0, size: 20, totalElements: mockSeries.length, totalPages: 1 }), [])
}

/** useSeriesDetail — Chi tiết một series theo ID. */
export function useSeriesDetail(id) {
  return useAsyncData(() => delay(mockSeries.find(s => s.id === id) || null), [id])
}

// ──────────────────────────────────────────────
//  Chapters
// ──────────────────────────────────────────────

/** useChaptersBySeries — Danh sách chapter của một series. */
export function useChaptersBySeries(seriesId) {
  const chapters = mockChapters[seriesId] || []
  return useAsyncData(() => delay({ content: chapters, page: 0, size: 20, totalElements: chapters.length, totalPages: 1 }), [seriesId])
}

/** useChapterDetail — Chi tiết một chapter (tìm trong tất cả series). */
export function useChapterDetail(id) {
  const allChapters = Object.values(mockChapters).flat()
  return useAsyncData(() => delay(allChapters.find(c => c.id === id) || null), [id])
}

// ──────────────────────────────────────────────
//  Pages & Regions
// ──────────────────────────────────────────────

/** usePagesByChapter — Danh sách trang của một chapter. */
export function usePagesByChapter(chapterId) {
  const pages = mockPages[chapterId] || []
  return useAsyncData(() => delay(pages), [chapterId])
}

/** useRegionsByPage — Danh sách region trên một trang. */
export function useRegionsByPage(pageId) {
  const regions = mockRegions[pageId] || []
  return useAsyncData(() => delay(regions), [pageId])
}

// ──────────────────────────────────────────────
//  Layers
// ──────────────────────────────────────────────

/** useLayersByPage — Danh sách layer của một trang. */
export function useLayersByPage(pageId) {
  const layers = mockLayers[pageId] || []
  return useAsyncData(() => delay(layers), [pageId])
}

// ──────────────────────────────────────────────
//  Tasks
// ──────────────────────────────────────────────

/** useTasks — Tất cả công việc (task) trong hệ thống. */
export function useTasks() {
  return useAsyncData(() => delay(mockTasks), [])
}

// ──────────────────────────────────────────────
//  Comments
// ──────────────────────────────────────────────

/** useCommentsByPage — Bình luận trên một trang. */
export function useCommentsByPage(pageId) {
  const comments = mockComments[pageId] || []
  return useAsyncData(() => delay(comments), [pageId])
}

// ──────────────────────────────────────────────
//  Rankings
// ──────────────────────────────────────────────

/** useCurrentRankings — Bảng xếp hạng hiện tại (phân trang giả). */
export function useCurrentRankings() {
  return useAsyncData(() => delay({ content: mockRankings, page: 0, size: 20, totalElements: mockRankings.length, totalPages: 1 }), [])
}

// ──────────────────────────────────────────────
//  Dashboard
// ──────────────────────────────────────────────

/** useDashboardStats — Thống kê dashboard theo userId. */
export function useDashboardStats(userId) {
  const stats = mockDashboardStats[userId]
  return useAsyncData(() => delay(stats || null), [userId])
}

// ──────────────────────────────────────────────
//  Activities & Notifications
// ──────────────────────────────────────────────

/** useActivities — Lịch sử hoạt động gần đây. */
export function useActivities() {
  return useAsyncData(() => delay(mockActivities), [])
}

/** useNotifications — Danh sách thông báo. */
export function useNotifications() {
  return useAsyncData(() => delay(mockNotifications), [])
}

// ──────────────────────────────────────────────
//  Schedules
// ──────────────────────────────────────────────

/** useSchedules — Lịch xuất bản các chapter. */
export function useSchedules() {
  return useAsyncData(() => delay(mockSchedules), [])
}

// ──────────────────────────────────────────────
//  Users
// ──────────────────────────────────────────────

/** useUsers — Danh sách tất cả người dùng. */
export function useUsers() {
  return useAsyncData(() => delay(mockUsers), [])
}
