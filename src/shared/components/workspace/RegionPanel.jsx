import { useState, useCallback } from 'react'
import { cn } from '../../utils'
import { useWorkspaceStore } from '../../../app/stores/workspaceStore'
import { useUIStore } from '../../../app/stores/uiStore'
import { Check, Clock, AlertCircle } from 'lucide-react'
import { REGION_COLORS } from '../../constants'

/*
 * ===== RegionPanel Component =====
 * Mục đích: Panel hiển thị danh sách các region (vùng đánh dấu) trên trang.
 * Mỗi region có: nhãn, loại (BACKGROUND, CHARACTER, TEXT, EFFECT, TONE, OTHER),
 * trạng thái (PENDING, IN_PROGRESS, COMPLETED, APPROVED).
 * Khi chọn một region, hiển thị form chỉnh sửa label và type.
 * =================================
 */

// Map icon theo trạng thái region
const statusIcons = {
  APPROVED: Check,
  COMPLETED: Check,
  IN_PROGRESS: Clock,
  PENDING: AlertCircle,
}

// Nhãn hiển thị cho từng trạng thái
const statusLabels = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  APPROVED: 'Approved',
}

// Danh sách loại region
const REGION_TYPES = ['BACKGROUND', 'CHARACTER', 'TEXT', 'EFFECT', 'TONE', 'OTHER']

/**
 * Component chính: danh sách region với expand form chỉnh sửa
 * Luồng xử lý:
 *   - Click region: chọn/bỏ chọn, hiển thị form edit
 *   - Edit label: nhập và blur/Enter để lưu
 *   - Edit type: click vào type chip để thay đổi
 */
export function RegionPanel() {
  const regions = useWorkspaceStore((s) => s.regions)
  const selectedRegionId = useWorkspaceStore((s) => s.selectedRegionId)
  const selectRegion = useWorkspaceStore((s) => s.selectRegion)
  const updateRegion = useWorkspaceStore((s) => s.updateRegion)
  const addToast = useUIStore((s) => s.addToast)
  const [editLabel, setEditLabel] = useState('')

  const selectedRegion = regions.find(r => r.id === selectedRegionId)

  /**
   * Lưu label mới khi blur khỏi input
   */
  const handleLabelSave = useCallback((region) => {
    if (editLabel.trim() && editLabel !== region.label) {
      updateRegion(region.id, { label: editLabel.trim() })
      addToast({ title: 'Region label updated', variant: 'info' })
    }
  }, [editLabel, updateRegion, addToast])

  /**
   * Thay đổi loại region và thông báo
   */
  const handleTypeChange = useCallback((region, type) => {
    updateRegion(region.id, { regionType: type })
    addToast({ title: `Type changed to ${type}`, variant: 'info' })
  }, [updateRegion, addToast])

  // Trạng thái rỗng
  if (regions.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs text-workspace-text-secondary">No regions defined — select Draw tool on canvas to create regions</p>
      </div>
    )
  }

  return (
    <div className="space-y-1 px-2 pt-3">
      {/* Tiêu đề panel */}
      <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-workspace-text-secondary pb-1">
        Regions ({regions.length})
      </div>

      {regions.map((r) => {
        const color = REGION_COLORS[r.regionType] || '#6b7280'
        const StatusIcon = statusIcons[r.status] || AlertCircle
        const isSelected = selectedRegionId === r.id
        return (
          <div key={r.id}>
            {/* Nút region: hiển thị tên, trạng thái, task */}
            <button
              onClick={() => {
                selectRegion(isSelected ? null : r.id)
                if (!isSelected) setEditLabel(r.label || '')
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-xs border-l-[3px] transition-colors rounded hover:bg-workspace-bg/50',
                isSelected ? 'bg-workspace-bg/70' : 'border-transparent',
              )}
              style={{ borderLeftColor: isSelected ? color : 'transparent' }}
            >
              <div className="flex items-center gap-2">
                {/* Màu của region type */}
                <span className="w-2 h-2 flex-shrink-0 rounded-sm" style={{ background: color }} />
                {/* Tên region */}
                <span className="flex-1 font-medium text-workspace-text truncate text-[11px]">{r.label || r.regionType}</span>
                {/* Icon + label trạng thái */}
                <span className={cn(
                  'flex items-center gap-0.5 text-[10px]',
                  r.status === 'APPROVED' ? 'text-status-success' : 'text-workspace-text-secondary',
                )}>
                  <StatusIcon size={10} />
                  {statusLabels[r.status] || r.status}
                </span>
              </div>
              {/* Thông tin task (nếu có) */}
              {r.task && (
                <div className="flex items-center gap-2 mt-1 ml-4">
                  <span className="text-[10px] text-workspace-text-secondary">→ {r.task.assistantName}</span>
                  {r.task.deadline && (
                    <span className="text-[10px] text-workspace-text-secondary/40">{r.task.deadline}</span>
                  )}
                </div>
              )}
            </button>

            {/* Form chỉnh sửa (chỉ hiển thị khi region được chọn) */}
            {isSelected && (
              <div className="px-3 pb-2 space-y-2">
                {/* Edit label */}
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wider text-workspace-text-secondary block mb-0.5">Label</label>
                  <div className="flex gap-1">
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onBlur={() => handleLabelSave(r)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur() } }}
                      className="flex-1 h-6 px-1.5 text-[11px] bg-workspace-bg border border-workspace-border outline-none focus:border-workspace-accent text-workspace-text rounded"
                    />
                  </div>
                </div>

                {/* Edit type: các chip chọn loại region */}
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wider text-workspace-text-secondary block mb-0.5">Type</label>
                  <div className="flex flex-wrap gap-1">
                    {REGION_TYPES.map((t) => {
                      const tc = REGION_COLORS[t]
                      return (
                        <button
                          key={t}
                          onClick={() => handleTypeChange(r, t)}
                          className={cn(
                            'text-[10px] px-2 py-0.5 border rounded transition-colors',
                            r.regionType === t
                              ? 'border-workspace-text font-semibold text-workspace-text'
                              : 'border-transparent text-workspace-text-secondary hover:text-workspace-text',
                          )}
                          style={r.regionType === t ? { borderColor: tc } : undefined}
                        >
                          <span className="inline-block w-1.5 h-1.5 mr-1 align-middle rounded-sm" style={{ background: tc }} />
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
