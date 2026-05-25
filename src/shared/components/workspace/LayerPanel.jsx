import { useState, useCallback, useRef } from 'react'
import { useWorkspaceStore } from '../../../app/stores/workspaceStore'
import { useAuthStore } from '../../../app/stores/authStore'
import { useUIStore } from '../../../app/stores/uiStore'
import { Eye, EyeOff, GripVertical, Lock, Unlock, Trash2, Pencil, Plus, Upload, SunMoon } from 'lucide-react'
import { cn } from '../../utils'

/*
 * ===== LayerPanel Component =====
 * Mục đích: Panel quản lý các layer (lớp) của trang hiện tại.
 * Cho phép: thêm, xóa, đổi tên, kéo-thả sắp xếp, toggle visibility,
 * upload ảnh, solo/compare mode, và khóa layer.
 * ================================
 */

/**
 * Component chính: quản lý danh sách layer
 * Các chế độ đặc biệt:
 *   - Solo: chỉ hiển thị một layer duy nhất (click Alt + Eye)
 *   - Compare: ẩn tất cả layer (click SunMoon)
 *   - Kéo-thả để sắp xếp thứ tự layer
 */
export function LayerPanel() {
  const currentPageId = useWorkspaceStore((s) => s.currentPageId)
  const layers = useWorkspaceStore((s) => s.layers)
  const updateLayer = useWorkspaceStore((s) => s.updateLayer)
  const reorderLayers = useWorkspaceStore((s) => s.reorderLayers)
  const deleteLayer = useWorkspaceStore((s) => s.deleteLayer)
  const addLayer = useWorkspaceStore((s) => s.addLayer)
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)

  // --- Local state ---
  const [dragId, setDragId] = useState(null)           // Layer đang được kéo
  const [dropTarget, setDropTarget] = useState(null)    // Layer đích khi kéo thả
  const [editingId, setEditingId] = useState(null)      // Layer đang đổi tên
  const [editLabel, setEditLabel] = useState('')        // Giá trị nhập khi đổi tên
  const fileInputRef = useRef(null)                      // Ref cho input upload file
  const [uploadTargetId, setUploadTargetId] = useState(null) // Layer đang upload ảnh
  const savedVis = useRef({})                            // Lưu trạng thái visible cũ (cho solo/compare)
  const [compareMode, setCompareMode] = useState(false)   // Chế độ so sánh (ẩn hết layer)
  const [soloLayerId, setSoloLayerId] = useState(null)    // Layer đang solo

  // Sắp xếp layer theo sortOrder
  const sorted = [...layers].sort((a, b) => a.sortOrder - b.sortOrder)

  /**
   * Thoát khỏi chế độ solo/compare: khôi phục trạng thái visible gốc
   */
  const exitSpecialMode = useCallback(() => {
    if (soloLayerId || compareMode) {
      layers.forEach(l => {
        if (savedVis.current[l.id] !== undefined) {
          updateLayer(l.id, { visible: savedVis.current[l.id] })
        }
      })
      savedVis.current = {}
      setSoloLayerId(null)
      setCompareMode(false)
    }
  }, [layers, soloLayerId, compareMode, updateLayer])

  /**
   * Vào chế độ compare: lưu trạng thái visible cũ, sau đó ẩn tất cả layer
   */
  const enterCompare = useCallback(() => {
    savedVis.current = {}
    layers.forEach(l => {
      savedVis.current[l.id] = l.visible
      updateLayer(l.id, { visible: false })
    })
    setSoloLayerId(null)
    setCompareMode(true)
  }, [layers, updateLayer])

  /**
   * Vào chế độ solo: chỉ hiển thị một layer duy nhất
   */
  const enterSolo = useCallback((layerId) => {
    savedVis.current = {}
    layers.forEach(l => {
      savedVis.current[l.id] = l.visible
      updateLayer(l.id, { visible: l.id === layerId })
    })
    setCompareMode(false)
    setSoloLayerId(layerId)
  }, [layers, updateLayer])

  // --- Drag & Drop handlers ---
  const handleDragStart = useCallback((id) => {
    setDragId(id)
  }, [])

  const handleDragOver = useCallback((e, id) => {
    e.preventDefault()
    if (id !== dragId) setDropTarget(id)
  }, [dragId])

  const handleDragLeave = useCallback(() => {
    setDropTarget(null)
  }, [])

  /**
   * Xử lý drop: tính lại thứ tự layer dựa trên vị trí kéo thả
   */
  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault()
    if (dragId === null || dragId === targetId) {
      setDragId(null)
      setDropTarget(null)
      return
    }
    const ids = sorted.map(l => l.id)
    const fromIdx = ids.indexOf(dragId)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) {
      setDragId(null)
      setDropTarget(null)
      return
    }
    ids.splice(fromIdx, 1)
    ids.splice(toIdx, 0, dragId)
    reorderLayers(ids)
    addToast({ title: 'Layer reordered', variant: 'info' })
    setDragId(null)
    setDropTarget(null)
  }, [dragId, sorted, reorderLayers, addToast])

  // --- Layer action handlers ---
  /**
   * Toggle visibility: click thường = ẩn/hiện, Alt+click = solo/unsolo
   */
  const toggleVisible = (e, layer) => {
    if (e.altKey) {
      if (soloLayerId === layer.id) {
        exitSpecialMode()
      } else {
        enterSolo(layer.id)
      }
    } else {
      exitSpecialMode()
      updateLayer(layer.id, { visible: !layer.visible })
    }
  }

  const toggleLocked = (layer) => {
    updateLayer(layer.id, { locked: !layer.locked })
  }

  /**
   * Xóa layer (chặn xóa layer cuối cùng)
   */
  const handleDelete = (layer) => {
    if (layers.length <= 1) {
      addToast({ title: 'Cannot delete last layer', variant: 'warning' })
      return
    }
    deleteLayer(layer.id)
  }

  const startRename = (layer) => {
    setEditingId(layer.id)
    setEditLabel(layer.label || '')
  }

  /**
   * Upload ảnh vào layer: mở file picker
   */
  const handleUploadImage = (layerId) => {
    setUploadTargetId(layerId)
    fileInputRef.current?.click()
  }

  /**
   * Xử lý file được chọn: đọc dưới dạng DataURL và cập nhật vào layer
   */
  const handleFileSelected = (e) => {
    const file = e.target.files?.[0]
    if (!file || uploadTargetId === null) return
    const reader = new FileReader()
    reader.onload = () => {
      updateLayer(uploadTargetId, { fileUrl: reader.result })
      addToast({ title: 'Image uploaded to layer', variant: 'success' })
    }
    reader.readAsDataURL(file)
    setUploadTargetId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /**
   * Lưu tên mới cho layer
   */
  const commitRename = () => {
    if (editingId !== null) {
      updateLayer(editingId, { label: editLabel.trim() || undefined })
    }
    setEditingId(null)
    setEditLabel('')
  }

  // Trạng thái rỗng
  if (layers.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-[10px] text-workspace-text-secondary">No layers yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {/* Header: nút Add Layer và nút Compare mode */}
      <div className="flex items-center justify-between px-2 pb-1">
        <button
          onClick={() => {
            if (!currentPageId || !user) return
            const maxSortOrder = layers.reduce((max, l) => Math.max(max, l.sortOrder), 0)
            addLayer({
              id: Date.now(),
              pageId: currentPageId,
              label: `Layer ${layers.length + 1}`,
              fileUrl: '',
              thumbnailUrl: '',
              sortOrder: maxSortOrder + 1,
              opacity: 1,
              visible: true,
              blendMode: 'normal',
              locked: false,
              createdBy: { id: user.id, displayName: user.displayName },
              createdAt: new Date().toISOString(),
            })
          }}
          className="flex items-center gap-1 text-xs text-workspace-text-secondary hover:text-workspace-text transition-colors"
          title="Add layer"
        >
          <Plus size={14} /> Add Layer
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => compareMode ? exitSpecialMode() : enterCompare()}
            className={cn(
              'p-1 rounded transition-colors',
              compareMode
                ? 'text-workspace-accent bg-workspace-accent/10'
                : 'text-workspace-text-secondary/40 hover:text-workspace-text-secondary',
            )}
            title={compareMode ? 'Show layers (exit compare)' : 'Hide all layers (compare mode)'}
          >
            <SunMoon size={12} />
          </button>
        </div>
      </div>

      {/* Danh sách layer (có thể kéo-thả) */}
      {sorted.map((layer) => (
        <div
          key={layer.id}
          draggable
          onDragStart={() => handleDragStart(layer.id)}
          onDragOver={(e) => handleDragOver(e, layer.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, layer.id)}
          className={cn(
            'px-2 py-1.5 text-xs border-b border-workspace-border/10 last:border-0 transition-colors rounded',
            dropTarget === layer.id ? 'bg-workspace-bg/60' : 'hover:bg-workspace-bg/30',
            dragId === layer.id ? 'opacity-40' : '',
          )}
        >
          {/* Dòng 1: icon kéo, thumbnail, tên, nút eye/lock */}
          <div className="flex items-center gap-1.5">
            {/* Nút kéo để sắp xếp */}
            <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-workspace-text-secondary/30 hover:text-workspace-text-secondary/60">
              <GripVertical size={14} />
            </div>
            {/* Thumbnail layer */}
            <div className="w-8 h-8 flex-shrink-0 bg-workspace-bg border border-workspace-border/20 overflow-hidden rounded">
              {layer.fileUrl ? (
                <img src={layer.fileUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-workspace-text-secondary/40">L</div>
              )}
            </div>
            {/* Tên layer (có thể inline edit) */}
            <div className="flex-1 min-w-0">
              {editingId === layer.id ? (
                <input
                  autoFocus
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null) }}
                  className="w-full bg-workspace-bg text-xs text-workspace-text outline-none border border-workspace-accent/50 rounded px-1 py-0.5"
                />
              ) : (
                <p className={cn('text-xs text-workspace-text truncate', !layer.visible && 'text-workspace-text-secondary/40')}>
                  {layer.label || `Layer ${layer.sortOrder}`}
                </p>
              )}
            </div>
            {/* Nút eye (visible) và lock */}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => toggleVisible(e, layer)}
                className={cn(
                  'w-5 h-5 flex items-center justify-center transition-colors relative',
                  soloLayerId === layer.id
                    ? 'text-yellow-400'
                    : layer.visible
                      ? 'text-workspace-text-secondary'
                      : 'text-workspace-text-secondary/30',
                )}
                title={soloLayerId === layer.id ? 'Unsolo (click) — Alt+click to unsolo' : 'Toggle visibility — Alt+click to solo'}
              >
                {soloLayerId === layer.id ? <Eye size={12} /> : layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                {soloLayerId === layer.id && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full" />}
              </button>
              <button onClick={() => toggleLocked(layer)} className={cn('w-5 h-5 flex items-center justify-center', layer.locked ? 'text-status-warning' : 'text-workspace-text-secondary/30')}>
                {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
            </div>
          </div>

          {/* Dòng 2: actions (upload, rename, delete) */}
          <div className="flex items-center gap-2 mt-1">
            {!layer.fileUrl && (
              <button onClick={() => handleUploadImage(layer.id)} className="flex items-center gap-1 text-[10px] text-workspace-text-secondary/50 hover:text-workspace-text-secondary transition-colors">
                <Upload size={11} /> Image
              </button>
            )}
            <button onClick={() => startRename(layer)} className="flex items-center gap-1 text-[10px] text-workspace-text-secondary/50 hover:text-workspace-text-secondary transition-colors">
              <Pencil size={11} /> Rename
            </button>
            <div className="flex items-center gap-1 ml-auto">
              <button onClick={() => handleDelete(layer)} className="flex items-center gap-0.5 text-[10px] text-workspace-text-secondary/50 hover:text-red-400 transition-colors">
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        </div>
      ))}
      {/* Input file ẩn dùng để upload ảnh vào layer */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
    </div>
  )
}
