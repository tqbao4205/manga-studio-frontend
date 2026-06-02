/**
 * ── RegionPanel.jsx — Quản lý Region (kết nối API thật) ──
 *
 * 🎯 Mục đích:
 *   - Hiển thị danh sách regions của page đang chọn
 *   - Click region → select + load tasks từ API
 *   - Inline edit label, change type, change status
 *
 * 📌 API calls:
 *   - updateRegion(id, patch)       → PUT /api/v1/regions/{id}
 *   - updateRegionStatus(id, status) → PATCH /api/v1/regions/{id}/status
 *   - loadTasks(regionId)           → GET /api/regions/{regionId}/tasks (taskStore)
 */

import { useState, useCallback } from 'react'
import { cn } from '../../utils'
import { useWorkspaceStore } from '../../../app/stores/workspaceStore'
import { useTaskStore } from '../../../app/stores/taskStore'
import { useUIStore } from '../../../app/stores/uiStore'
import {
  User, Image, Type, Zap, Palette, Square,
  MoreVertical, Check, Clock, AlertCircle,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { REGION_COLORS } from '../../constants'

const statusIcons = {
  APPROVED: Check,
  COMPLETED: Check,
  SUBMITTED: Check,
  IN_PROGRESS: Clock,
  PENDING: AlertCircle,
}

const statusLabels = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  APPROVED: 'Approved',
  SUBMITTED: 'Submitted',
}

/** Các trạng thái có thể chuyển đổi (không cho phép chuyển ngược) */
const STATUS_TRANSITIONS = ['PENDING', 'IN_PROGRESS', 'COMPLETED']

const REGION_TYPES = ['BACKGROUND', 'CHARACTER', 'TEXT', 'EFFECT', 'TONE', 'OTHER']

const typeIcons = {
  BACKGROUND: Image,
  CHARACTER: User,
  TEXT: Type,
  EFFECT: Zap,
  TONE: Palette,
  OTHER: Square,
}

export function RegionPanel() {
  const regions = useWorkspaceStore((s) => s.regions)
  const selectedRegionId = useWorkspaceStore((s) => s.selectedRegionId)
  const selectRegion = useWorkspaceStore((s) => s.selectRegion)
  const updateRegion = useWorkspaceStore((s) => s.updateRegion)
  const updateRegionStatus = useWorkspaceStore((s) => s.updateRegionStatus)
  const loadTasks = useTaskStore((s) => s.loadTasks)
  const addToast = useUIStore((s) => s.addToast)

  const [editLabel, setEditLabel] = useState('')
  const [expandedStatus, setExpandedStatus] = useState(false)

  const selectedRegion = regions.find(r => r.id === selectedRegionId)

  /**
   * Khi click region: select vào store + load tasks từ API.
   * Endpoint: GET /api/regions/{regionId}/tasks
   */
  const handleSelectRegion = (regionId, label) => {
    const isSelected = selectedRegionId === regionId
    selectRegion(isSelected ? null : regionId)
    if (!isSelected) {
      setEditLabel(label || '')
      // Load tasks của region vừa chọn
      loadTasks(regionId)
    }
  }

  /**
   * Lưu label region → updateRegion (PUT /api/v1/regions/{id}).
   */
  const handleLabelSave = useCallback((region) => {
    if (editLabel.trim() && editLabel !== region.label) {
      updateRegion(region.id, { label: editLabel.trim() })
      addToast({ title: 'Region label updated', variant: 'info' })
    }
  }, [editLabel, updateRegion, addToast])

  /**
   * Đổi type region → updateRegion (PUT /api/v1/regions/{id}).
   */
  const handleTypeChange = useCallback((region, type) => {
    updateRegion(region.id, { regionType: type })
    addToast({ title: `Type changed to ${type}`, variant: 'info' })
  }, [updateRegion, addToast])

  /**
   * Đổi status region → updateRegionStatus (PATCH /api/v1/regions/{id}/status).
   */
  const handleStatusChange = useCallback((region, newStatus) => {
    updateRegionStatus(region.id, newStatus)
    addToast({ title: `Status changed to ${statusLabels[newStatus] || newStatus}`, variant: 'info' })
    setExpandedStatus(false)
  }, [updateRegionStatus, addToast])

  if (regions.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs text-on-surface-variant/60">
          No regions defined — select Region tool on canvas to create regions
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-on-surface flex items-center justify-between">
          Regions
          <span className="text-on-surface-variant font-medium text-xs">
            {regions.length} Total
          </span>
        </h4>

        <div className="space-y-2">
          {regions.map((r) => {
            const TypeIcon = typeIcons[r.regionType] || Square
            const StatusIcon = statusIcons[r.status] || AlertCircle
            const color = REGION_COLORS[r.regionType] || '#6b7280'
            const isSelected = selectedRegionId === r.id

            const statusColorClass = {
              APPROVED: 'text-status-success',
              COMPLETED: 'text-status-success',
              SUBMITTED: 'text-primary',
              IN_PROGRESS: 'text-status-warning',
              PENDING: 'text-on-surface-variant',
            }[r.status] || 'text-on-surface-variant'

            return (
              <div key={r.id}>
                {/* Card chính: click → select region + load tasks */}
                <div
                  onClick={() => handleSelectRegion(r.id, r.label)}
                  className={cn(
                    'group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border',
                    isSelected
                      ? 'bg-surface-container border-primary/50'
                      : 'bg-surface-container-lowest border-outline-variant/30 hover:border-primary/50',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center border"
                      style={{
                        backgroundColor: `${color}1a`,
                        borderColor: `${color}33`,
                      }}
                    >
                      <TypeIcon size={20} style={{ color }} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-on-surface">
                        {r.label || r.regionType}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-tighter">
                        <span style={{ color }}>{r.regionType}</span>
                        <span className="text-on-surface-variant font-medium normal-case">·</span>
                        <span className={cn('flex items-center gap-1 font-medium normal-case', statusColorClass)}>
                          <StatusIcon size={11} />
                          {statusLabels[r.status] || r.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <MoreVertical size={16} className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Expanded section: label edit + type picker + status dropdown */}
                {isSelected && (
                  <div className="px-4 pb-3 pt-2 space-y-2 bg-surface-container-lowest border-x border-b border-outline-variant/30 rounded-b-xl -mt-1">
                    {/* Label */}
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">
                        Label
                      </label>
                      <input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onBlur={() => handleLabelSave(r)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
                        className="w-full h-8 px-2.5 text-sm bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary text-on-surface rounded-lg placeholder:text-on-surface-variant/40"
                      />
                    </div>

                    {/* Type */}
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">
                        Type
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {REGION_TYPES.map((t) => {
                          const tc = REGION_COLORS[t]
                          const isActive = r.regionType === t
                          return (
                            <button
                              key={t}
                              onClick={() => handleTypeChange(r, t)}
                              className={cn(
                                'text-xs px-2.5 py-1 rounded-lg border transition-all',
                                isActive
                                  ? 'border-primary text-on-surface font-semibold bg-primary/5'
                                  : 'border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-outline-variant',
                              )}
                            >
                              <span
                                className="inline-block w-2 h-2 mr-1.5 align-middle rounded-sm"
                                style={{ background: tc }}
                              />
                              {t}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Status — dropdown với các trạng thái có thể chuyển */}
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">
                        Status
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setExpandedStatus(!expandedStatus)}
                          className="w-full h-8 px-2.5 text-sm bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary text-on-surface rounded-lg flex items-center justify-between"
                        >
                          <span className="flex items-center gap-1.5">
                            <StatusIcon size={13} className={statusColorClass} />
                            {statusLabels[r.status] || r.status}
                          </span>
                          {expandedStatus ? (
                            <ChevronUp size={14} className="text-on-surface-variant" />
                          ) : (
                            <ChevronDown size={14} className="text-on-surface-variant" />
                          )}
                        </button>

                        {expandedStatus && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-surface-container border border-outline-variant/50 rounded-lg shadow-lg z-10 overflow-hidden">
                            {STATUS_TRANSITIONS.map((s) => {
                              const StIcon = statusIcons[s] || AlertCircle
                              const stColor = {
                                APPROVED: 'text-status-success',
                                COMPLETED: 'text-status-success',
                                IN_PROGRESS: 'text-status-warning',
                                PENDING: 'text-on-surface-variant',
                              }[s] || 'text-on-surface-variant'

                              return (
                                <button
                                  key={s}
                                  onClick={() => handleStatusChange(r, s)}
                                  disabled={s === r.status}
                                  className={cn(
                                    'w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors',
                                    s === r.status
                                      ? 'bg-primary/5 text-primary font-semibold cursor-default'
                                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
                                  )}
                                >
                                  <StIcon size={13} className={stColor} />
                                  {statusLabels[s] || s}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
