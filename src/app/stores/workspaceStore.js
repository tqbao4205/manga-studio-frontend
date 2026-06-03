/**
 * ── workspaceStore.js — State quản lý Workspace (kết nối API thật) ──
 *
 * 🎯 Mục đích:
 *   - Quản lý toàn bộ state cho trang Workspace: pages, layers, regions, comments, annotations
 *   - Các async actions gọi API qua service files (pageService, layerService, regionService)
 *   - UI state thuần (zoom, mode, selected*) được giữ local, không gọi API
 *
 * 📌 Luồng dữ liệu:
 *   ┌────────────┐     ┌──────────────┐     ┌─────────────┐
 *   │ Component  │────→│ workspaceStore│────→│ API Service │
 *   │ (click)    │←────│ (async action)│←────│ (Axios)     │
 *   └────────────┘     └──────────────┘     └─────────────┘
 *
 * 📌 State structure:
 *   - chapterId, currentPageId, pages[]          — Chapter & Page
 *   - regions[], layers[]                        — Dữ liệu page hiện tại
 *   - comments[], annotations[]                  — Tạm giữ mock (backend chưa có API)
 *   - zoom, mode, selected*Id, activeTab         — UI state
 *   - isLoading, isLoadingPage, mergeResult      — Loading/result states
 */

import { create } from 'zustand';
import pageService from '../../services/pageService';
import layerService from '../../services/layerService';
import regionService from '../../services/regionService';

/** ID đặc biệt cho virtual base layer (không tồn tại trong DB) */
const VIRTUAL_BASE_ID = 'virtual-base';

export const useWorkspaceStore = create((set, get) => ({

  // ═══════════════════════════════════════════
  //  STATE
  // ═══════════════════════════════════════════

  seriesId: null,
  chapterId: null,
  currentPageId: null,
  pages: [],
  regions: [],
  hiddenRegionIds: [],
  layers: [],
  comments: [],
  annotations: [],
  zoom: 1,
  mode: 'select',
  selectedRegionId: null,
  selectedLayerId: null,
  selectedCommentId: null,
  selectedAnnotationId: null,
  activeTab: 'regions',

  /** Loading chapter list (loadChapter đang chạy) */
  isLoading: false,
  /** Loading page data (loadPage đang chạy) */
  isLoadingPage: false,
  /** Kết quả merge layers (finalImageUrl từ POST /pages/{id}/merge) */
  mergeResult: null,

  // ═══════════════════════════════════════════
  //  CHAPTER & PAGE — ASYNC ACTIONS
  // ═══════════════════════════════════════════

  /**
   * Load chapter: lấy danh sách pages từ API.
   * Chỉ load pages, KHÔNG load regions/layers ngay (sẽ load khi chọn page).
   *
   * Endpoint: GET /api/v1/chapters/{chapterId}/pages
   *
   * @param {number} chapterId - ID của chapter
   */
  loadChapter: async (chapterId, targetPageId) => {
    set({ isLoading: true, chapterId });
    try {
      const pages = await pageService.getByChapter(chapterId);
      const firstPageId = pages?.[0]?.id || null;
      const pageExists = targetPageId && pages?.some((p) => p.id === targetPageId);
      const selectedPageId = pageExists ? targetPageId : firstPageId;
      set({
        pages: pages || [],
        currentPageId: selectedPageId,
        regions: [],
        layers: [],
        comments: [],
        annotations: [],
        selectedRegionId: null,
        selectedLayerId: null,
        isLoading: false,
      });
      // Nếu có page, tự động load regions + layers
      if (selectedPageId) {
        get().loadPage(selectedPageId);
      }
    } catch (err) {
      console.error('[workspaceStore] loadChapter failed:', err);
      set({ isLoading: false });
    }
  },

  /**
   * Load page: lấy regions + layers của page được chọn.
   * Gọi song song 2 API để tối ưu thời gian.
   *
   * Endpoints:
   *   GET /api/v1/pages/{pageId}/regions
   *   GET /api/v1/pages/{pageId}/layers
   *
   * @param {number} pageId - ID của page
   */
  loadPage: async (pageId) => {
    set({ isLoadingPage: true, currentPageId: pageId });
    try {
      // Gọi song song regions + layers
      const [regions, layers] = await Promise.all([
        regionService.getByPage(pageId),
        layerService.getByPage(pageId),
      ]);
      // Nếu page có ảnh gốc, inject virtual base layer ở sortOrder 0
      const { pages } = get();
      const currentPage = pages.find(p => p.id === pageId);
      let finalLayers = layers || [];
      if (currentPage?.originalImageUrl) {
        finalLayers = [
          {
            id: VIRTUAL_BASE_ID,
            pageId,
            label: 'Base Page',
            fileUrl: currentPage.originalImageUrl,
            sortOrder: 0,
            visible: true,
            opacity: 1,
            locked: true,
            virtual: true,
          },
          ...finalLayers.map((l, i) => ({ ...l, sortOrder: i + 1 })),
        ];
      }
      set({
        regions: regions || [],
        hiddenRegionIds: [],
        layers: finalLayers,
        selectedRegionId: null,
        selectedLayerId: null,
        isLoadingPage: false,
      });
    } catch (err) {
      console.error('[workspaceStore] loadPage failed:', err);
      set({ isLoadingPage: false });
    }
  },

  // ═══════════════════════════════════════════
  //  UI STATE — PURE (không gọi API)
  // ═══════════════════════════════════════════

  setSeriesId: (seriesId) => set({ seriesId }),
  setMode: (mode) => set({ mode }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),

  selectRegion: (regionId) => set({
    selectedRegionId: regionId,
    selectedLayerId: null,
  }),
  hideRegion: (regionId) => set((s) => ({
    hiddenRegionIds: s.hiddenRegionIds.includes(regionId)
      ? s.hiddenRegionIds
      : [...s.hiddenRegionIds, regionId],
  })),
  resetHiddenRegions: () => set({ hiddenRegionIds: [] }),
  selectLayer: (layerId) => set({
    selectedLayerId: layerId,
    selectedRegionId: null,
  }),
  selectComment: (commentId) => set({ selectedCommentId: commentId }),
  selectAnnotation: (annotationId) => set({ selectedAnnotationId: annotationId }),
  setActiveTab: (activeTab) => set({ activeTab }),

  // ═══════════════════════════════════════════
  //  REGIONS — ASYNC ACTIONS
  // ═══════════════════════════════════════════

  /**
   * Tạo region mới trên page hiện tại.
   * Endpoint: POST /api/v1/pages/{pageId}/regions
   *
   * @param {Object} regionData - { regionType, label, x, y, width, height, color }
   */
  addRegion: async (regionData) => {
    const { currentPageId } = get();
    if (!currentPageId) return;
    try {
      const created = await regionService.create(currentPageId, regionData);
      set((s) => ({ regions: [...s.regions, created] }));
    } catch (err) {
      console.error('[workspaceStore] addRegion failed:', err);
    }
  },

  /**
   * Cập nhật region (label, type, toạ độ).
   * Endpoint: PUT /api/v1/regions/{id}
   *
   * @param {number} regionId - ID của region
   * @param {Object} patch - Các field cần update
   */
  updateRegion: async (regionId, patch) => {
    try {
      const updated = await regionService.update(regionId, patch);
      set((s) => ({
        regions: s.regions.map((r) => (r.id === regionId ? updated : r)),
      }));
      return updated;
    } catch (err) {
      console.error('[workspaceStore] updateRegion failed:', err);
      throw err;
    }
  },

  /**
   * Xoá region.
   * Endpoint: DELETE /api/v1/regions/{id}
   *
   * @param {number} regionId - ID của region
   */
  deleteRegion: async (regionId) => {
    try {
      await regionService.delete(regionId);
      set((s) => ({
        regions: s.regions.filter((r) => r.id !== regionId),
        selectedRegionId:
          s.selectedRegionId === regionId ? null : s.selectedRegionId,
      }));
    } catch (err) {
      console.error('[workspaceStore] deleteRegion failed:', err);
    }
  },

  /**
   * Sắp xếp lại thứ tự regions (kéo thả).
   * Endpoint: PUT /api/v1/pages/{pageId}/regions/reorder
   *
   * @param {number} pageId - ID của page
   * @param {number[]} regionIds - Mảng region IDs theo thứ tự mới
   */
  reorderRegions: async (pageId, regionIds) => {
    try {
      const reordered = await regionService.reorder(pageId, regionIds);
      set({ regions: reordered || [] });
    } catch (err) {
      console.error('[workspaceStore] reorderRegions failed:', err);
    }
  },

  // ═══════════════════════════════════════════
  //  LAYERS — ASYNC ACTIONS
  // ═══════════════════════════════════════════

  /**
   * Tạo layer mới (upload file ảnh kèm metadata).
   * LayerPanel gọi action này sau khi tạo FormData từ file input.
   *
   * Endpoint: POST /api/v1/pages/{pageId}/layers (multipart)
   *
   * @param {number} pageId - ID của page
   * @param {FormData} formData - FormData chứa file + label + opacity + sortOrder
   */
  addLayer: async (pageId, formData) => {
    try {
      const created = await layerService.create(pageId, formData);
      set((s) => ({ layers: [...s.layers, created] }));
    } catch (err) {
      console.error('[workspaceStore] addLayer failed:', err);
    }
  },

  /**
   * Cập nhật layer properties (visible, opacity, locked, label, ...).
   * Endpoint: PUT /api/v1/layers/{id}
   *
   * @param {number} layerId - ID của layer
   * @param {Object} patch - Các field cần update
   */
  updateLayer: async (layerId, patch) => {
    // Virtual layer chỉ update local, không gọi API
    if (layerId === VIRTUAL_BASE_ID) {
      set((s) => ({
        layers: s.layers.map((l) =>
          l.id === layerId ? { ...l, ...patch } : l,
        ),
      }));
      return;
    }
    try {
      const updated = await layerService.update(layerId, patch);
      set((s) => ({
        layers: s.layers.map((l) => (l.id === layerId ? updated : l)),
      }));
    } catch (err) {
      console.error('[workspaceStore] updateLayer failed:', err);
    }
  },

  /**
   * Xoá layer.
   * Endpoint: DELETE /api/v1/layers/{id}
   *
   * @param {number} layerId - ID của layer
   */
  deleteLayer: async (layerId) => {
    // Virtual layer chỉ xoá local, không gọi API
    if (layerId === VIRTUAL_BASE_ID) {
      set((s) => ({
        layers: s.layers.filter((l) => l.id !== layerId),
        selectedLayerId:
          s.selectedLayerId === layerId ? null : s.selectedLayerId,
      }));
      return;
    }
    try {
      await layerService.delete(layerId);
      set((s) => ({
        layers: s.layers.filter((l) => l.id !== layerId),
        selectedLayerId:
          s.selectedLayerId === layerId ? null : s.selectedLayerId,
      }));
    } catch (err) {
      console.error('[workspaceStore] deleteLayer failed:', err);
    }
  },

  /**
   * Sắp xếp lại thứ tự layers (kéo thả trong LayerPanel).
   * Gọi API reorder cho mỗi layer bị thay đổi thứ tự.
   * Optimistic update: cập nhật UI ngay, gọi API sau.
   *
   * Endpoint: PUT /api/v1/layers/{id}/reorder (gọi cho từng layer)
   *
   * @param {number[]} orderedIds - Mảng layer IDs theo thứ tự mới (từ dưới lên)
   */
  reorderLayers: async (orderedIds) => {
    const { layers } = get();
    // Giữ virtual base layer luôn ở sortOrder 0
    const virtualLayer = layers.find((l) => l.id === VIRTUAL_BASE_ID);
    const realIds = orderedIds.filter((id) => id !== VIRTUAL_BASE_ID);

    // Optimistic update: sắp xếp local ngay lập tức
    const reordered = [
      ...(virtualLayer ? [{ ...virtualLayer, sortOrder: 0 }] : []),
      ...realIds.map((id, i) => {
        const layer = layers.find((l) => l.id === id);
        return layer ? { ...layer, sortOrder: i + 1 } : null;
      }).filter(Boolean),
    ];
    set({ layers: reordered });

    // Chỉ gọi API reorder cho real layers
    try {
      await Promise.all(
        realIds.map((id, i) => layerService.reorder(id, i)),
      );
    } catch (err) {
      console.error('[workspaceStore] reorderLayers failed:', err);
      // Rollback: reload layers từ API nếu thất bại
      const { currentPageId } = get();
      if (currentPageId) {
        const freshLayers = await layerService.getByPage(currentPageId);
        set({ layers: freshLayers || [] });
      }
    }
  },

  // ═══════════════════════════════════════════
  //  PAGES — ASYNC ACTIONS
  // ═══════════════════════════════════════════

  /**
   * Upload page mới (batch upload 1 file).
   * Endpoint: POST /api/v1/chapters/{chapterId}/pages/batch
   *
   * @param {string} imageDataUrl - Data URL của ảnh (từ NewPageDialog)
   * @param {Object} createdBy - { id, displayName }
   */
  addPage: async (imageDataUrl, createdBy) => {
    const { chapterId } = get();
    if (!chapterId || !imageDataUrl) return;

    try {
      // Chuyển data URL → Blob → FormData
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], `page-${Date.now()}.png`, {
        type: 'image/png',
      });
      const formData = new FormData();
      formData.append('files', file);

      await pageService.uploadBatch(chapterId, formData);
      // Reload pages từ API để có dữ liệu mới nhất
      const pages = await pageService.getByChapter(chapterId);
      const newPageId = pages?.[pages.length - 1]?.id || null;
      set({ pages: pages || [] });
      if (newPageId) {
        get().loadPage(newPageId);
      }
    } catch (err) {
      console.error('[workspaceStore] addPage failed:', err);
    }
  },

  /**
   * Sắp xếp lại pages (kéo thả trong PageThumbnailList).
   * Endpoint: PUT /api/v1/chapters/{chapterId}/pages/reorder
   *
   * @param {number[]} pageIds - Mảng page IDs theo thứ tự mới
   */
  reorderPages: async (pageIds) => {
    const { chapterId } = get();
    if (!chapterId) return;

    // Optimistic update
    set((s) => {
      const reordered = pageIds
        .map((id, i) => {
          const page = s.pages.find((p) => p.id === id);
          return page ? { ...page, pageNumber: i + 1 } : null;
        })
        .filter(Boolean);
      return { pages: reordered };
    });

    try {
      await pageService.reorder(chapterId, pageIds);
    } catch (err) {
      console.error('[workspaceStore] reorderPages failed:', err);
      // Rollback
      const pages = await pageService.getByChapter(chapterId);
      set({ pages: pages || [] });
    }
  },

  // ═══════════════════════════════════════════
  //  MERGE & FLATTEN — ASYNC ACTIONS
  // ═══════════════════════════════════════════

  /**
   * Merge tất cả visible layers thành 1 ảnh cuối cùng.
   * Endpoint: POST /api/v1/pages/{id}/merge
   *
   * @param {number} pageId - ID của page
   * @returns {Promise<string|null>} finalImageUrl hoặc null nếu lỗi
   */
  mergePage: async (pageId) => {
    try {
      const result = await pageService.merge(pageId);
      const finalImageUrl = result?.finalImageUrl || result?.imageUrl || '';
      set({ mergeResult: finalImageUrl });
      return finalImageUrl;
    } catch (err) {
      console.error('[workspaceStore] mergePage failed:', err);
      set({ mergeResult: null });
      return null;
    }
  },

  /**
   * Xoá kết quả merge (đóng dialog preview).
   */
  clearMergeResult: () => set({ mergeResult: null }),

  /**
   * Flatten page: merge layers vào ảnh nền, ghi đè originalImageUrl, xoá toàn bộ layers.
   * Endpoint: POST /api/v1/pages/{id}/flatten
   *
   * Sau flatten, reload page để layers mới (empty → virtual base layer với merged image).
   *
   * @param {number} pageId - ID của page
   * @returns {Promise<boolean>} true nếu thành công, false nếu lỗi
   */
  flattenPage: async (pageId) => {
    try {
      const result = await pageService.flatten(pageId);
      // Cập nhật pages array với originalImageUrl mới
      set((s) => ({
        pages: s.pages.map((p) => (p.id === pageId ? { ...p, ...result } : p)),
      }));
      // Reload page → layers empty → virtual base layer với merged image
      await get().loadPage(pageId);
      return true;
    } catch (err) {
      console.error('[workspaceStore] flattenPage failed:', err);
      return false;
    }
  },

  // ═══════════════════════════════════════════
  //  COMMENTS & ANNOTATIONS — TẠM GIỮ MOCK
  //  (backend chưa có API, sẽ rewrite sau)
  // ═══════════════════════════════════════════

  updateComment: (commentId, patch) =>
    set((s) => ({
      comments: s.comments.map((c) =>
        c.id === commentId ? { ...c, ...patch } : c,
      ),
    })),

  addComment: (comment) =>
    set((s) => ({
      comments: [...s.comments, comment],
    })),

  addAnnotation: (annotation) =>
    set((s) => ({
      annotations: [...s.annotations, annotation],
    })),

  deleteAnnotation: (annotationId) =>
    set((s) => ({
      annotations: s.annotations.filter((a) => a.id !== annotationId),
      selectedAnnotationId:
        s.selectedAnnotationId === annotationId
          ? null
          : s.selectedAnnotationId,
    })),

  clearAnnotations: () =>
    set({ annotations: [], selectedAnnotationId: null }),

  // ═══════════════════════════════════════════
  //  RESET — Cleanup khi unmount
  // ═══════════════════════════════════════════

  reset: () =>
    set({
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
      selectedLayerId: null,
      selectedCommentId: null,
      selectedAnnotationId: null,
      activeTab: 'regions',
      isLoading: false,
      isLoadingPage: false,
      mergeResult: null,
    }),
}));
