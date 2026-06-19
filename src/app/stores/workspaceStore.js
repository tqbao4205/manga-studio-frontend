/**
 * ── workspaceStore.js — State quản lý Workspace (kết nối API thật) ──
 *
 * 🎯 Mục đích:
 *   - Quản lý toàn bộ state cho trang Workspace: pages, layers, regions, comments, annotations
 *   - Các async actions gọi API qua service files (pageService, layerService, regionService, commentService)
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
 *   - regions[], layers[], comments[]            — Dữ liệu page hiện tại (API)
 *   - annotations[]                              — Local canvas drawings (pen, highlight, text)
 *   - zoom, mode, selected*Id, activeTab         — UI state
 *   - isLoading, isLoadingPage, mergeResult      — Loading/result states
 */

import { create } from 'zustand';
import pageService from '../../services/pageService';
import layerService from '../../services/layerService';
import regionService from '../../services/regionService';
import commentService from '../../services/commentService';

/** ID đặc biệt cho virtual base layer (không tồn tại trong DB) */
const VIRTUAL_BASE_ID = 'virtual-base';

/**
 * Chuyển cây comments từ backend (dạng lồng nhau) thành mảng flat.
 *
 * Backend trả về:
 *   [ { id:1, parentId:null, replies: [ { id:2, parentId:1 }, { id:3, parentId:1 } ] },
 *     { id:4, parentId:null, replies: [] } ]
 *
 * → Flatten thành:
 *   [ { id:1, parentId:null, replyCount:2 }, { id:2, parentId:1 }, { id:3, parentId:1 }, { id:4, parentId:null, replyCount:0 } ]
 *
 * Giữ nguyên field names từ backend (posX, posY, authorId, authorName, ...)
 * để components tự map sang frontend convention.
 *
 * @param {Array} comments - Mảng CommentResponse từ API (dạng cây)
 * @returns {Array} Mảng flat, mỗi item không có field "replies"
 */
function flattenComments(comments) {
  if (!comments || !Array.isArray(comments)) return [];
  const flat = [];
  for (const root of comments) {
    // Tách replies ra khỏi comment gốc, đếm số lượng
    const { replies, ...rest } = root;
    flat.push({ ...rest, replyCount: replies?.length || 0 });
    // Đẩy từng reply vào mảng flat (reply không có replies con — chỉ 1 cấp)
    if (replies?.length) {
      for (const reply of replies) {
        flat.push({ ...reply, replies: undefined, replyCount: 0 });
      }
    }
  }
  return flat;
}

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
  selectedRegionIds: [],
  selectedLayerId: null,
  selectedCommentId: null,
  selectedAnnotationId: null,
  activeTab: 'regions',

  /** Loading chapter list (loadChapter đang chạy) */
  isLoading: false,
  /** Loading page data (loadPage đang chạy) */
  isLoadingPage: false,
  /** Upload layer đang diễn ra */
  isLayerUploading: false,
  /** Kết quả merge layers (finalImageUrl từ POST /pages/{id}/merge) */
  mergeResult: null,
  /** Đánh dấu merge thất bại (để canvas fallback về ảnh gốc) */
  mergeError: false,

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
        selectedRegionIds: [],
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
   * Load page: lấy regions + layers + comments của page được chọn.
   * Gọi song song 3 API để tối ưu thời gian.
   *
   * Endpoints:
   *   GET /api/v1/pages/{pageId}/regions
   *   GET /api/v1/pages/{pageId}/layers
   *   GET /api/v1/pages/{pageId}/comments
   *
   * 📌 Comments từ backend trả về dạng cây (gốc + replies lồng nhau).
   *    Hàm flattenComments() sẽ làm phẳng thành mảng 1 cấp để phù hợp
   *    với cấu trúc CommentPanel hiện tại.
   *
   * @param {number} pageId - ID của page
   */
  loadPage: async (pageId) => {
    set({ isLoadingPage: true, currentPageId: pageId });
    try {
      // Gọi song song regions + layers + comments + done region IDs
      const [regions, layers, apiComments, doneRegionIds] = await Promise.all([
        regionService.getByPage(pageId),
        layerService.getByPage(pageId),
        commentService.getByPage(pageId),
        regionService.getDoneRegionIds(pageId),
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

      // Flatten comments từ dạng cây → mảng flat
      const flatComments = flattenComments(apiComments);

      set({
        regions: regions || [],
        hiddenRegionIds: doneRegionIds || [],
        layers: finalLayers,
        comments: flatComments,
        selectedRegionIds: [],
        selectedLayerId: null,
        selectedCommentId: null,
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

  selectRegion: (regionId) => set((s) => ({
    selectedRegionIds: s.selectedRegionIds.includes(regionId)
      ? s.selectedRegionIds.filter(id => id !== regionId)
      : [...s.selectedRegionIds, regionId],
    selectedLayerId: null,
  })),
  hideRegion: (regionId) => set((s) => ({
    hiddenRegionIds: s.hiddenRegionIds.includes(regionId)
      ? s.hiddenRegionIds
      : [...s.hiddenRegionIds, regionId],
  })),
  resetHiddenRegions: () => set({ hiddenRegionIds: [] }),
  setSelectedRegions: (regionIds) => set({
    selectedRegionIds: regionIds,
    selectedLayerId: null,
  }),
  selectLayer: (layerId) => set({
    selectedLayerId: layerId,
    selectedRegionIds: [],
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
        selectedRegionIds: s.selectedRegionIds.filter(id => id !== regionId),
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
    set({ isLayerUploading: true });
    try {
      const created = await layerService.create(pageId, formData);
      set((s) => ({ layers: [...s.layers, created], isLayerUploading: false }));
      return created;
    } catch (err) {
      set({ isLayerUploading: false });
      console.error('[workspaceStore] addLayer failed:', err);
      throw err;
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
   * Cập nhật trạng thái page (VD: đánh dấu COMPLETED).
   * Endpoint: PUT /api/v1/pages/{id}/status
   *
   * @param {number} pageId - ID của page
   * @param {string} status - Trạng thái mới (VD: 'COMPLETED')
   */
  setPageStatus: async (pageId, status) => {
    const { chapterId } = get();
    try {
      await pageService.updateStatus(pageId, status);
      // Reload pages để cập nhật progressPercent
      if (chapterId) {
        const pages = await pageService.getByChapter(chapterId);
        set({ pages: pages || [] });
      }
    } catch (err) {
      console.error('[workspaceStore] setPageStatus failed:', err);
    }
  },

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
      const finalImageUrl = result?.finalImageUrl || result?.imageUrl;
      if (!finalImageUrl) {
        console.error('[workspaceStore] mergePage: no finalImageUrl in response');
        set({ mergeResult: null, mergeError: true });
        return null;
      }
      set((s) => ({
        pages: s.pages.map((p) =>
          p.id === pageId ? { ...p, finalImageUrl } : p
        ),
        mergeResult: finalImageUrl,
        mergeError: false,
      }));
      return finalImageUrl;
    } catch (err) {
      console.error('[workspaceStore] mergePage failed:', err);
      set({ mergeResult: null, mergeError: true });
      return null;
    }
  },

  /**
   * Xoá kết quả merge (đóng dialog preview).
   */
  clearMergeResult: () => set({ mergeResult: null, mergeError: false }),

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
  //  COMMENTS — ASYNC ACTIONS (kết nối API)
  //  ANNOTATIONS — local canvas drawings (pen, highlight, text)
  // ═══════════════════════════════════════════

  /**
   * Cập nhật comment.
   *
   * 📌 Async action — tuỳ theo patch field mà gọi API khác nhau:
   *   - patch.status  → gọi PATCH  /comments/{id}/status (resolve/reopen)
   *   - patch.content → gọi PUT    /comments/{id} (sửa nội dung)
   *   - replyCount    → update local (không có API cho field này)
   *   - Các field khác → update local
   *
   * 📌 Status mapping:
   *   Frontend dùng 'OPEN'/'RESOLVED'
   *   Backend  dùng 'ACTIVE'/'RESOLVED'
   *   → Tự động map 'OPEN' → 'ACTIVE' khi gọi API
   *
   * @param {number} commentId - ID của comment
   * @param {Object} patch - Các field cần update
   */
  updateComment: async (commentId, patch) => {
    const currentComment = get().comments.find((c) => c.id === commentId);
    if (!currentComment) return;

    try {
      let updated = null;

      // TH1: Đổi status → gọi API updateStatus
      if (patch.status) {
        // Map 'OPEN' → 'ACTIVE' (frontend convention → backend enum)
        const backendStatus = patch.status === 'OPEN' ? 'ACTIVE' : patch.status;
        updated = await commentService.updateStatus(commentId, backendStatus);
      }
      // TH2: Sửa content → gọi API update
      else if (patch.content) {
        updated = await commentService.update(commentId, { content: patch.content });
      }

      // Nếu có response từ API → dùng response để update store
      if (updated) {
        set((s) => ({
          comments: s.comments.map((c) =>
            c.id === commentId ? { ...c, ...updated, ...patch } : c,
          ),
        }));
        return;
      }
    } catch (err) {
      console.error('[workspaceStore] updateComment API failed:', err);
      // Không return — fallback xuống local update bên dưới
    }

    // Fallback: update local cho các field không có API (replyCount, ...)
    set((s) => ({
      comments: s.comments.map((c) =>
        c.id === commentId ? { ...c, ...patch } : c,
      ),
    }));
  },

  /**
   * Tạo comment mới trên page hiện tại.
   * Gọi API POST /api/v1/pages/{pageId}/comments.
   *
   * Nhận vào object comment với các field:
   *   - content (string, required)
   *   - posX, posY (number, optional) — toạ độ annotation
   *   - positionX, positionY (alias cho posX/posY — tương thích ngược)
   *   - parentId / parentCommentId (number, optional) — nếu là reply
   *
   * Backend trả về CommentResponse đã có id thật, authorName, authorAvatar, ...
   * → Append response vào store.
   *
   * @param {Object} comment - Thông tin comment cần tạo
   */
  addComment: async (comment) => {
    const { currentPageId } = get();
    if (!currentPageId || !comment?.content?.trim()) return;
    try {
      // Map field names từ frontend → backend convention
      const created = await commentService.create(currentPageId, {
        content: comment.content,
        posX: comment.posX ?? comment.positionX,
        posY: comment.posY ?? comment.positionY,
        parentId: comment.parentId ?? comment.parentCommentId,
      });
      set((s) => ({ comments: [...s.comments, created] }));
      return created;
    } catch (err) {
      console.error('[workspaceStore] addComment failed:', err);
    }
  },

  /**
   * Reply vào 1 comment có sẵn.
   * Gọi API POST /api/v1/comments/{parentId}/replies.
   *
   * 📌 Khác với addComment():
   *    - parentId lấy từ tham số, không từ object
   *    - pageId tự động lấy từ comment cha (backend xử lý)
   *    - Không cần toạ độ (reply không phải annotation)
   *
   * 📌 Luồng:
   *    1. Gọi API tạo reply → nhận CommentResponse từ backend
   *    2. Append reply vào store.comments[]
   *    3. Cập nhật replyCount của comment cha (để UI hiển thị đúng số lượng)
   *
   * @param {number} parentId - ID của comment cha
   * @param {string} content - Nội dung reply
   * @returns {Promise<Object|undefined>} CommentResponse hoặc undefined nếu lỗi
   */
  replyComment: async (parentId, content) => {
    if (!parentId || !content?.trim()) return;
    try {
      const created = await commentService.reply(parentId, { content });
      set((s) => ({
        comments: [
          ...s.comments,
          created,
          // Cập nhật replyCount của comment cha
        ].map((c) =>
          c.id === parentId
            ? { ...c, replyCount: (c.replyCount || 0) + 1 }
            : c,
        ),
      }));
      return created;
    } catch (err) {
      console.error('[workspaceStore] replyComment failed:', err);
    }
  },

  /**
   * Xoá 1 comment (chỉ AUTHOR mới xoá được).
   * Gọi API DELETE /api/v1/comments/{id}.
   *
   * 📌 Backend tự động xoá replies nếu xoá comment gốc.
   *    Store cũng xoá toàn bộ replies trong mảng flat.
   *
   * 📌 Nếu comment đang được chọn → clear selection.
   *
   * @param {number} commentId - ID của comment cần xoá
   */
  deleteComment: async (commentId) => {
    if (!commentId) return;
    try {
      await commentService.delete(commentId);
      set((s) => ({
        comments: s.comments.filter((c) =>
          c.id !== commentId && c.parentId !== commentId
        ),
        selectedCommentId:
          s.selectedCommentId === commentId ? null : s.selectedCommentId,
      }));
    } catch (err) {
      console.error('[workspaceStore] deleteComment failed:', err);
    }
  },

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
      selectedRegionIds: [],
      selectedLayerId: null,
      selectedCommentId: null,
      selectedAnnotationId: null,
      activeTab: 'regions',
      isLoading: false,
      isLoadingPage: false,
      mergeResult: null,
    }),
}));
