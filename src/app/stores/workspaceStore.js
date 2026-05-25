import { create } from 'zustand'
import { mockPages, mockRegions, mockLayers, mockComments } from '../../shared/constants/mock-data'

/**
 * 📦 workspaceStore — Quản lý không gian làm việc (workspace) cho việc
 *                      duyệt/chỉnh sửa page, region, layer, comment, annotation
 *                      trong quy trình sản xuất manga.
 *
 * Các nhóm state chính:
 *   - Chapter/Page: chapterId, currentPageId, pages[]
 *   - Region: regions[], selectedRegionId
 *   - Layer: layers[], selectedAnnotationId (annotation nằm trên layer)
 *   - Comment: comments[], selectedCommentId
 *   - Annotation: annotations[]
 *   - UI Control: zoom, mode, activeTab
 *   - Submission: pendingSubmissions{} (bài nộp chờ duyệt)
 */
export const useWorkspaceStore = create((set) => ({
  // ── Chapter / Page ────────────────────────────────────
  /** ID của chapter đang làm việc */
  chapterId: null,

  /** ID của page đang được hiển thị */
  currentPageId: null,

  /** Danh sách pages của chapter hiện tại */
  pages: [],

  // ── Region (vùng chọn trên page) ──────────────────────
  /** Danh sách regions của page hiện tại */
  regions: [],

  // ── Layer (tầng lớp đồ hoạ) ───────────────────────────
  /** Danh sách layers của page hiện tại */
  layers: [],

  // ── Comment (bình luận) ───────────────────────────────
  /** Danh sách comments của page hiện tại */
  comments: [],

  // ── Annotation (chú thích trên layer) ─────────────────
  /** Danh sách annotations trên page hiện tại */
  annotations: [],

  // ── UI Control ────────────────────────────────────────
  /** Mức zoom (0.1 → 10, mặc định 1) */
  zoom: 1,

  /** Chế độ làm việc: 'select' | 'draw' | 'comment' | ... */
  mode: 'select',

  /** ID của region đang được chọn (null = không chọn) */
  selectedRegionId: null,

  /** ID của comment đang được chọn (null = không chọn) */
  selectedCommentId: null,

  /** ID của annotation đang được chọn (null = không chọn) */
  selectedAnnotationId: null,

  /** Tab đang active trong sidebar: 'regions' | 'layers' | 'comments' */
  activeTab: 'regions',

  // ── Submission (bài nộp chờ duyệt) ────────────────────
  /**
   * Các bài nộp đang chờ duyệt, keyed theo taskId.
   * Khi task được approve → dữ liệu chuyển thành layer mới.
   */
  pendingSubmissions: {},

  // ── Actions ───────────────────────────────────────────

  /**
   * Load toàn bộ dữ liệu của một chapter (pages, regions, layers, comments).
   * Page đầu tiên được chọn làm page hiện tại.
   */
  loadChapter: (chapterId) => {
    const pages = mockPages[chapterId] || []
    set({ chapterId, pages, currentPageId: pages[0]?.id || null, annotations: [] })
    if (pages[0]) {
      set({
        regions: mockRegions[pages[0].id] || [],
        layers: mockLayers[pages[0].id] || [],
        comments: mockComments[pages[0].id] || [],
      })
    }
  },

  /**
   * Chuyển sang page khác và load regions/layers/comments tương ứng.
   * Reset selection state (selectedRegionId, selectedAnnotationId).
   */
  loadPage: (pageId) => {
    set({
      currentPageId: pageId,
      regions: mockRegions[pageId] || [],
      layers: mockLayers[pageId] || [],
      comments: mockComments[pageId] || [],
      selectedRegionId: null,
      selectedAnnotationId: null,
      annotations: [],
    })
  },

  /** Đặt chế độ làm việc (select/draw/comment...) */
  setMode: (mode) => set({ mode }),

  /** Đặt mức zoom, giới hạn trong khoảng [0.1, 10] */
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),

  /** Chọn region theo ID */
  selectRegion: (regionId) => set({ selectedRegionId: regionId }),

  /** Chọn comment theo ID */
  selectComment: (commentId) => set({ selectedCommentId: commentId }),

  /** Chọn annotation theo ID */
  selectAnnotation: (annotationId) => set({ selectedAnnotationId: annotationId }),

  /** Chuyển tab trong sidebar */
  setActiveTab: (activeTab) => set({ activeTab }),

  /** Cập nhật thông tin một region (merge patch vào region hiện tại) */
  updateRegion: (regionId, patch) => set((s) => ({
    regions: s.regions.map((r) => r.id === regionId ? { ...r, ...patch } : r),
  })),

  /** Xoá region theo ID, tự động clear selectedRegionId nếu đang chọn region đó */
  deleteRegion: (regionId) => set((s) => ({
    regions: s.regions.filter((r) => r.id !== regionId),
    selectedRegionId: s.selectedRegionId === regionId ? null : s.selectedRegionId,
  })),

  /** Thêm region mới vào danh sách */
  addRegion: (region) => set((s) => ({
    regions: [...s.regions, region],
  })),

  /** Cập nhật thông tin một layer (merge patch) */
  updateLayer: (layerId, patch) => set((s) => ({
    layers: s.layers.map((l) => l.id === layerId ? { ...l, ...patch } : l),
  })),

  /** Sắp xếp lại thứ tự layers dựa trên mảng orderedIds, gán sortOrder tương ứng */
  reorderLayers: (orderedIds) => set((s) => ({
    layers: orderedIds.map((id, i) => {
      const layer = s.layers.find((l) => l.id === id)
      return layer ? { ...layer, sortOrder: i } : layer
    }).filter(Boolean),
  })),

  /** Xoá layer theo ID */
  deleteLayer: (layerId) => set((s) => ({
    layers: s.layers.filter((l) => l.id !== layerId),
  })),

  /** Cập nhật thông tin một comment (merge patch) */
  updateComment: (commentId, patch) => set((s) => ({
    comments: s.comments.map((c) => c.id === commentId ? { ...c, ...patch } : c),
  })),

  /** Thêm comment mới vào danh sách */
  addComment: (comment) => set((s) => ({
    comments: [...s.comments, comment],
  })),

  /** Thêm layer mới vào danh sách */
  addLayer: (layer) => set((s) => ({
    layers: [...s.layers, layer],
  })),

  /** Lưu dữ liệu bài nộp vào pendingSubmissions, keyed theo taskId */
  addPendingSubmission: (taskId, data) => set((s) => ({
    pendingSubmissions: { ...s.pendingSubmissions, [taskId]: data },
  })),

  /**
   * Duyệt bài nộp: chuyển dữ liệu từ pendingSubmissions thành layer mới.
   * Layer mới được gán sortOrder = max hiện tại + 1 để nằm trên cùng.
   * Nếu taskId không tồn tại trong pendingSubmissions → bỏ qua.
   */
  approveSubmission: (taskId) => set((s) => {
    const data = s.pendingSubmissions[taskId]
    if (!data) return s
    const rest = { ...s.pendingSubmissions }
    delete rest[taskId]
    const maxSortOrder = s.layers.reduce((max, l) => Math.max(max, l.sortOrder), 0)
    const newLayer = {
      id: Date.now(),
      pageId: data.pageId,
      label: data.label,
      taskSubmissionId: taskId,
      fileUrl: data.imageDataUrl,
      thumbnailUrl: '',
      sortOrder: maxSortOrder + 1,
      opacity: 1,
      visible: true,
      blendMode: 'normal',
      locked: false,
      createdBy: data.createdBy,
      createdAt: new Date().toISOString(),
    }
    return { pendingSubmissions: rest, layers: [...s.layers, newLayer] }
  }),

  /**
   * Thêm page mới vào chapter hiện tại.
   * Tự động tạo Base Page layer tương ứng và đồng bộ với mockLayers.
   * Chuyển sang page mới ngay sau khi tạo.
   */
  addPage: (imageDataUrl, createdBy) => set((s) => {
    const last = s.pages[s.pages.length - 1]
    const maxId = Math.max(0, ...s.pages.map(p => p.id))
    const newId = maxId + 1
    const newPage = {
      id: newId,
      chapterId: s.chapterId,
      pageNumber: (last?.pageNumber ?? 0) + 1,
      originalImageUrl: imageDataUrl || '',
      webImageUrl: imageDataUrl || '',
      width: 4200,
      height: 6000,
      status: 'UPLOADED',
      createdAt: new Date().toISOString(),
    }
    const newLayer = {
      id: Date.now(),
      pageId: newId,
      label: 'Base Page',
      fileUrl: '',
      thumbnailUrl: '',
      sortOrder: 0,
      opacity: 1,
      visible: true,
      blendMode: 'normal',
      locked: false,
      createdBy: createdBy || { id: 1, displayName: 'Ichikawa' },
      createdAt: new Date().toISOString(),
    }
    if (!mockLayers[newId]) mockLayers[newId] = []
    mockLayers[newId].push(newLayer)
    return {
      pages: [...s.pages, newPage],
      currentPageId: newId,
      regions: [],
      layers: [newLayer],
      comments: [],
    }
  }),

  /**
   * Cập nhật ảnh cho page (upload ảnh mới).
   * Đồng thời cập nhật fileUrl của Base Page layer và mockLayers.
   */
  updatePageImage: (pageId, imageDataUrl) => set((s) => {
    const baseLayer = s.layers.find((l) => l.pageId === pageId && l.label === 'Base Page')
    const updatedLayers = baseLayer
      ? s.layers.map((l) => l.id === baseLayer.id ? { ...l, fileUrl: imageDataUrl || '' } : l)
      : s.layers
    if (baseLayer && mockLayers[pageId]) {
      mockLayers[pageId] = mockLayers[pageId].map((l) => l.id === baseLayer.id ? { ...l, fileUrl: imageDataUrl || '' } : l)
    }
    return {
      pages: s.pages.map((p) => p.id === pageId ? { ...p, originalImageUrl: imageDataUrl, webImageUrl: imageDataUrl } : p),
      layers: updatedLayers,
    }
  }),

  /** Thêm annotation mới */
  addAnnotation: (annotation) => set((s) => ({
    annotations: [...s.annotations, annotation],
  })),

  /** Xoá annotation, tự động clear selectedAnnotationId nếu đang chọn */
  deleteAnnotation: (annotationId) => set((s) => ({
    annotations: s.annotations.filter((a) => a.id !== annotationId),
    selectedAnnotationId: s.selectedAnnotationId === annotationId ? null : s.selectedAnnotationId,
  })),

  /** Xoá tất cả annotations và bỏ chọn */
  clearAnnotations: () => set({ annotations: [], selectedAnnotationId: null }),

  /** Reset toàn bộ workspace về trạng thái ban đầu (khi rời chapter) */
  reset: () => set({
    chapterId: null, currentPageId: null, pages: [], regions: [],
    layers: [], comments: [], annotations: [], zoom: 1, mode: 'select',
    selectedRegionId: null, selectedCommentId: null, selectedAnnotationId: null, activeTab: 'regions',
  }),
}))
