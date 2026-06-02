import { useState, useCallback, useRef } from 'react'
import { useWorkspaceStore } from '../../../app/stores/workspaceStore'
import { useAuthStore } from '../../../app/stores/authStore'
import { useUIStore } from '../../../app/stores/uiStore'
import {
  Eye, EyeOff, Lock, Unlock, Trash2,
  Pencil, Plus, Upload, SunMoon,
} from 'lucide-react'
import { cn } from '../../utils'
import { Button } from '../ui/button'

export function LayerPanel() {
  const currentPageId = useWorkspaceStore((s) => s.currentPageId)
  const layers = useWorkspaceStore((s) => s.layers)
  const updateLayer = useWorkspaceStore((s) => s.updateLayer)
  const reorderLayers = useWorkspaceStore((s) => s.reorderLayers)
  const deleteLayer = useWorkspaceStore((s) => s.deleteLayer)
  const addLayer = useWorkspaceStore((s) => s.addLayer)
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)

  const [dragId, setDragId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const savedVis = useRef({})
  const [compareMode, setCompareMode] = useState(false)
  const [soloLayerId, setSoloLayerId] = useState(null)

  const sorted = [...layers].sort((a, b) => a.sortOrder - b.sortOrder)

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

  const enterCompare = useCallback(() => {
    savedVis.current = {}
    layers.forEach(l => {
      savedVis.current[l.id] = l.visible
      updateLayer(l.id, { visible: false })
    })
    setSoloLayerId(null)
    setCompareMode(true)
  }, [layers, updateLayer])

  const enterSolo = useCallback((layerId) => {
    savedVis.current = {}
    layers.forEach(l => {
      savedVis.current[l.id] = l.visible
      updateLayer(l.id, { visible: l.id === layerId })
    })
    setCompareMode(false)
    setSoloLayerId(layerId)
  }, [layers, updateLayer])

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

  const handleDelete = (layer) => {
    deleteLayer(layer.id)
  }

  const startRename = (layer) => {
    setEditingId(layer.id)
    setEditLabel(layer.label || '')
  }

  const commitRename = () => {
    if (editingId !== null) {
      updateLayer(editingId, { label: editLabel.trim() || undefined })
    }
    setEditingId(null)
    setEditLabel('')
  }

  const handleAddLayer = () => {
    if (!currentPageId || !user) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const formData = new FormData()
      formData.append('file', file)
      formData.append('request', JSON.stringify({
        label: `Layer ${layers.filter(l => !l.virtual).length + 1}`,
        opacity: 1,
      }))
      try {
        await addLayer(currentPageId, formData)
        addToast({ title: 'Layer added', description: file.name, variant: 'success' })
      } catch {
        addToast({ title: 'Upload failed', variant: 'error' })
      }
    }
    input.click()
  }

  const handleOpacityChange = (layer, opacity) => {
    updateLayer(layer.id, { opacity: parseFloat(opacity) })
  }

  if (layers.length === 0) {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="w-10 h-10 mx-auto rounded-xl bg-surface-variant/30 flex items-center justify-center">
          <Upload size={16} className="text-on-surface-variant/40" />
        </div>
        <p className="text-xs text-on-surface-variant/60">No layers yet</p>
        <button
          onClick={handleAddLayer}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Plus size={14} /> Add Layer
        </button>
      </div>
    )
  }

  return (
      <div className="space-y-0.5">
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-outline-variant/20">
        <Button variant="ghost" size="sm" onClick={handleAddLayer} className="gap-1.5">
          <Plus size={14} />
          Add Layer
        </Button>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className={cn('w-8 h-8', compareMode && 'bg-primary/10 text-primary border border-primary/20')}
            onClick={() => compareMode ? exitSpecialMode() : enterCompare()}
            title={compareMode ? 'Show layers (exit compare)' : 'Hide all layers (compare mode)'}
          >
            <SunMoon size={14} />
          </Button>
        </div>
      </div>

      {/* Layer list */}
      {sorted.map((layer) => {
        const isVirtual = layer.virtual
        return (
        <div
          key={layer.id}
          draggable={!isVirtual}
          onDragStart={() => !isVirtual && handleDragStart(layer.id)}
          onDragOver={(e) => !isVirtual && handleDragOver(e, layer.id)}
          onDragLeave={!isVirtual && handleDragLeave}
          onDrop={(e) => !isVirtual && handleDrop(e, layer.id)}
          className={cn(
            'px-3 py-2.5 text-xs transition-colors',
            dropTarget === layer.id ? 'bg-primary/5' : 'hover:bg-surface-container-low',
            dragId === layer.id ? 'opacity-40' : '',
            isVirtual && 'opacity-60',
          )}
        >
          {/* Row 1: eye | thumbnail | name | lock | delete */}
          <div className="flex items-center gap-2">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => toggleVisible(e, layer)}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-lg transition-colors relative flex-shrink-0',
                soloLayerId === layer.id
                  ? 'text-yellow-400 hover:bg-yellow-400/10'
                  : layer.visible
                    ? 'text-on-surface-variant hover:bg-surface-container-high'
                    : 'text-on-surface-variant/30 hover:bg-surface-container-high',
              )}
              title={soloLayerId === layer.id ? 'Unsolo (click)' : 'Toggle visibility — Alt+click to solo'}
            >
              {soloLayerId === layer.id ? <Eye size={15} /> : layer.visible ? <Eye size={15} /> : <EyeOff size={15} />}
              {soloLayerId === layer.id && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-yellow-400 rounded-full" />}
            </button>
            <div className="w-10 h-10 flex-shrink-0 bg-surface-container-high rounded-lg border border-outline-variant/20 overflow-hidden">
              {layer.fileUrl ? (
                <img src={layer.fileUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-on-surface-variant/30">
                  <Upload size={12} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {editingId === layer.id ? (
                <input
                  autoFocus
                  value={editLabel}
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null) }}
                  className="w-full bg-surface-container-high text-xs text-on-surface outline-none border border-primary/50 rounded px-1.5 py-1"
                />
              ) : (
                <p
                  className={cn(
                    'text-xs font-medium truncate leading-tight',
                    layer.visible ? 'text-on-surface' : 'text-on-surface-variant/50',
                  )}
                >
                  {layer.label || `Layer ${layer.sortOrder}`}
                  {isVirtual && <span className="ml-1.5 text-[9px] text-on-surface-variant/40 font-normal">Base</span>}
                </p>
              )}
            </div>
            {!isVirtual && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => toggleLocked(layer)}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-lg transition-colors flex-shrink-0',
                layer.locked ? 'text-status-warning hover:bg-status-warning/10' : 'text-on-surface-variant/30 hover:bg-surface-container-high',
              )}
            >
              {layer.locked ? <Lock size={15} /> : <Unlock size={15} />}
            </button>
            )}
            {!isVirtual && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => handleDelete(layer)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant/30 hover:text-status-danger hover:bg-status-danger/10 transition-colors flex-shrink-0"
            >
              <Trash2 size={15} />
            </button>
            )}
          </div>

          {/* Row 2: opacity + rename */}
          {!isVirtual && (
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] text-on-surface-variant/50 w-7 text-right tabular-nums font-medium flex-shrink-0">
              {Math.round(layer.opacity * 100)}%
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={layer.opacity}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => handleOpacityChange(layer, e.target.value)}
              disabled={layer.locked}
              className="flex-1 h-1 accent-primary rounded-full appearance-none cursor-pointer disabled:opacity-30 bg-surface-variant/50"
              title={`Opacity: ${Math.round(layer.opacity * 100)}%`}
            />
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => startRename(layer)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-high transition-colors flex-shrink-0"
              title="Rename layer"
            >
              <Pencil size={13} />
            </button>
          </div>
          )}
        </div>
        )
      })}
    </div>
  )
}
