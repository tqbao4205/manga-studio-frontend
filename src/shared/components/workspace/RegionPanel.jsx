import { useState, useCallback, useRef } from 'react'
import { cn } from '../../utils'
import { useWorkspaceStore } from '../../../app/stores/workspaceStore'
import { useTaskStore } from '../../../app/stores/taskStore'
import { useUIStore } from '../../../app/stores/uiStore'
import {
  User, Image, Type, Zap, Palette, Square,
  MoreVertical,
} from 'lucide-react'
import { REGION_COLORS } from '../../constants'

const REGION_TYPES = ['BACKGROUND', 'CHARACTER', 'TEXT', 'EFFECT', 'TONE', 'OTHER']

const typeLabels = {
  BACKGROUND: 'Bg',
  CHARACTER: 'Char',
  TEXT: 'Text',
  EFFECT: 'FX',
  TONE: 'Tone',
  OTHER: 'Other',
}

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
  const selectedRegionIds = useWorkspaceStore((s) => s.selectedRegionIds)
  const selectRegion = useWorkspaceStore((s) => s.selectRegion)
  const updateRegion = useWorkspaceStore((s) => s.updateRegion)
  const hiddenRegionIds = useWorkspaceStore((s) => s.hiddenRegionIds)

  const visibleRegions = regions.filter((r) => !hiddenRegionIds.includes(r.id))
  const loadTasks = useTaskStore((s) => s.loadTasks)
  const addToast = useUIStore((s) => s.addToast)

  const [openMenuRegionId, setOpenMenuRegionId] = useState(null)
  const [labelValue, setLabelValue] = useState('')
  const labelValueRef = useRef('')

  const handleSelectRegion = (regionId) => {
    const wasSelected = selectedRegionIds.includes(regionId)
    selectRegion(regionId)
    if (!wasSelected) {
      loadTasks(regionId)
    }
    if (openMenuRegionId) setOpenMenuRegionId(null)
  }

  const handleToggleMenu = (e, regionId) => {
    e.stopPropagation()
    setOpenMenuRegionId(prev => {
      if (prev !== regionId) {
        const region = regions.find(r => r.id === regionId)
        const val = region?.label || ''
        setLabelValue(val)
        labelValueRef.current = val
      }
      return prev === regionId ? null : regionId
    })
  }

  const handleLabelSave = useCallback(async (region) => {
    const trimmed = labelValueRef.current.trim()
    try {
      await updateRegion(region.id, { label: trimmed })
      addToast({ title: 'Region label updated', variant: 'info' })
    } catch {
      addToast({ title: 'Failed to update label', variant: 'error' })
    }
  }, [updateRegion, addToast])

  const handleTypeChange = useCallback(async (region, type) => {
    try {
      await updateRegion(region.id, { regionType: type })
      addToast({ title: `Type changed to ${type}`, variant: 'info' })
    } catch {
      addToast({ title: 'Failed to change type', variant: 'error' })
    }
  }, [updateRegion, addToast])

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
          {visibleRegions.map((r) => {
            const TypeIcon = typeIcons[r.regionType] || Square
            const color = REGION_COLORS[r.regionType] || '#6b7280'
            const isSelected = selectedRegionIds.includes(r.id)

            return (
              <div key={r.id}>
                <div
                  onClick={() => handleSelectRegion(r.id)}
                  className={cn(
                    'group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border',
                    isSelected
                      ? 'bg-surface-container border-primary/50'
                      : 'bg-surface-container-lowest border-outline-variant/30 hover:border-primary/50',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
                        isSelected
                          ? 'bg-primary border-primary'
                          : 'border-outline-variant/50',
                      )}>
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center border"
                      style={{
                        backgroundColor: `${color}1a`,
                        borderColor: `${color}33`,
                      }}
                    >
                      <TypeIcon size={20} style={{ color }} />
                    </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-on-surface">
                        {r.label || r.regionType}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-tighter">
                        <span style={{ color }}>{r.regionType}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleToggleMenu(e, r.id)}
                    className="p-1 rounded-lg hover:bg-surface-container-high transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical size={16} className="text-on-surface-variant" />
                  </button>
                </div>

                {openMenuRegionId === r.id && (
                  <div className="px-4 pb-4 pt-3 space-y-3 bg-surface-container-lowest border-x border-b border-outline-variant/30 rounded-b-xl -mt-0.5">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/50 block mb-1.5">
                        Label
                      </label>
                      <input
                        value={labelValue}
                        onChange={(e) => { setLabelValue(e.target.value); labelValueRef.current = e.target.value }}
                        onBlur={() => handleLabelSave(r)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
                        className="w-full h-9 px-3 text-sm bg-surface-container border border-outline-variant/20 outline-none focus:border-primary/60 text-on-surface rounded-lg placeholder:text-on-surface-variant/30 transition-colors"
                        placeholder="Enter region label…"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/50 block mb-1.5">
                        Type
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {REGION_TYPES.map((t) => {
                          const tc = REGION_COLORS[t]
                          const isActive = r.regionType === t
                          const Icon = typeIcons[t]
                          return (
                            <button
                              key={t}
                              onClick={() => handleTypeChange(r, t)}
                              className={cn(
                                'flex items-center gap-1.5 text-[11px] px-2 py-1.5 rounded-lg border transition-all font-medium leading-none',
                                isActive
                                  ? 'border-primary/50 text-on-surface bg-primary/5 shadow-sm'
                                  : 'border-outline-variant/20 text-on-surface-variant/60 hover:text-on-surface hover:border-outline-variant/40 hover:bg-surface-container',
                              )}
                            >
                              <Icon size={13} style={{ color: tc }} className="shrink-0" />
                              <span className="truncate">{typeLabels[t]}</span>
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
      </div>
    </div>
  )
}
