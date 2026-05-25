import { create } from 'zustand'
import { mockPages, mockRegions, mockLayers, mockComments, mockAnnotations } from '../../shared/constants/mock-data'

export const useWorkspaceStore = create((set) => ({
  chapterId: null,
  currentPageId: null,
  pages: [],
  regions: [],
  layers: [],
  comments: [],
  annotations: [],
  zoom: 1,
  mode: 'select',
  selectedRegionId: null,
  selectedCommentId: null,
  selectedAnnotationId: null,
  activeTab: 'regions',
  pendingSubmissions: {},

  loadChapter: (chapterId) => {
    const pages = mockPages[chapterId] || []
    set({ chapterId, pages, currentPageId: pages[0]?.id || null, annotations: [] })
    if (pages[0]) {
      set({
        regions: mockRegions[pages[0].id] || [],
        layers: mockLayers[pages[0].id] || [],
        comments: mockComments[pages[0].id] || [],
        annotations: mockAnnotations[pages[0].id] || [],
      })
    }
  },

  loadPage: (pageId) => {
    set({
      currentPageId: pageId,
      regions: mockRegions[pageId] || [],
      layers: mockLayers[pageId] || [],
      comments: mockComments[pageId] || [],
      annotations: mockAnnotations[pageId] || [],
      selectedRegionId: null,
      selectedCommentId: null,
      selectedAnnotationId: null,
    })
  },

  setMode: (mode) => set({ mode }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
  selectRegion: (regionId) => set({ selectedRegionId: regionId }),
  selectComment: (commentId) => set({ selectedCommentId: commentId }),
  selectAnnotation: (annotationId) => set({ selectedAnnotationId: annotationId }),
  setActiveTab: (activeTab) => set({ activeTab }),

  updateRegion: (regionId, patch) => set((s) => ({
    regions: s.regions.map((r) => r.id === regionId ? { ...r, ...patch } : r),
  })),

  deleteRegion: (regionId) => set((s) => ({
    regions: s.regions.filter((r) => r.id !== regionId),
    selectedRegionId: s.selectedRegionId === regionId ? null : s.selectedRegionId,
  })),

  addRegion: (region) => set((s) => ({
    regions: [...s.regions, region],
  })),

  updateLayer: (layerId, patch) => set((s) => ({
    layers: s.layers.map((l) => l.id === layerId ? { ...l, ...patch } : l),
  })),

  reorderLayers: (orderedIds) => set((s) => ({
    layers: orderedIds.map((id, i) => {
      const layer = s.layers.find((l) => l.id === id)
      return layer ? { ...layer, sortOrder: i } : layer
    }).filter(Boolean),
  })),

  deleteLayer: (layerId) => set((s) => ({
    layers: s.layers.filter((l) => l.id !== layerId),
  })),

  updateComment: (commentId, patch) => set((s) => ({
    comments: s.comments.map((c) => c.id === commentId ? { ...c, ...patch } : c),
  })),

  addComment: (comment) => set((s) => ({
    comments: [...s.comments, comment],
  })),

  addLayer: (layer) => set((s) => ({
    layers: [...s.layers, layer],
  })),

  addPendingSubmission: (taskId, data) => set((s) => ({
    pendingSubmissions: { ...s.pendingSubmissions, [taskId]: data },
  })),

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
      fileUrl: data.imageDataUrl || '',
      thumbnailUrl: '',
      sortOrder: maxSortOrder + 1,
      opacity: 1,
      visible: true,
      blendMode: 'normal',
      locked: false,
      createdBy: data.createdBy || 1,
      createdAt: new Date().toISOString(),
    }
    return { pendingSubmissions: rest, layers: [...s.layers, newLayer] }
  }),

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
      finalImageUrl: '',
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
      createdBy: createdBy || 1,
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
      annotations: [],
    }
  }),

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

  addAnnotation: (annotation) => set((s) => ({
    annotations: [...s.annotations, annotation],
  })),

  deleteAnnotation: (annotationId) => set((s) => ({
    annotations: s.annotations.filter((a) => a.id !== annotationId),
    selectedAnnotationId: s.selectedAnnotationId === annotationId ? null : s.selectedAnnotationId,
  })),

  clearAnnotations: () => set({ annotations: [], selectedAnnotationId: null }),

  reset: () => set({
    chapterId: null, currentPageId: null, pages: [], regions: [],
    layers: [], comments: [], annotations: [], zoom: 1, mode: 'select',
    selectedRegionId: null, selectedCommentId: null, selectedAnnotationId: null, activeTab: 'regions',
  }),
}))
