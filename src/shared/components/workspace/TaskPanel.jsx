/**
 * ── TaskPanel.jsx — Quản lý Task (kết nối API thật) ──
 *
 * 🎯 Mục đích:
 *   - Hiển thị danh sách tasks của page hiện tại (từ tasksByRegion của taskStore)
 *   - Assign task mới (MANGAKA → ASSISTANT)
 *   - Submit bài (ASSISTANT upload file)
 *   - Review + Approve/Revise (MANGAKA)
 *
 * 📌 Luồng dữ liệu:
 *   1. Region được chọn → loadTasks(regionId) → tasks lưu vào tasksByRegion
 *   2. TaskPanel gom tasks từ tất cả regions của page hiện tại
 *   3. Submit: SubmitDialog → { file, note } → submitTask(taskId, formData)
 *   4. Review: ReviewDialog → { submissionId, status, note } → reviewSubmission(...)
 *   5. Approve + "Add as layer": gọi addLayer(pageId, formData) từ workspaceStore
 *
 * 📌 API calls:
 *   - loadTasks(regionId)       → GET /api/regions/{regionId}/tasks
 *   - createTask(regionId, data) → POST /api/regions/{regionId}/tasks
 *   - submitTask(taskId, fd)     → POST /api/tasks/{taskId}/submissions
 *   - reviewSubmission(id, s, n) → PATCH /api/submissions/{id}/status
 *   - addLayer(pageId, fd)      → POST /api/v1/pages/{pageId}/layers
 */

import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '../../../app/stores/workspaceStore'
import { useAuthStore } from '../../../app/stores/authStore'
import { useTaskStore } from '../../../app/stores/taskStore'
import { useUIStore } from '../../../app/stores/uiStore'
import { Button } from '../ui/button'
import { StatusBadge } from '../shared/StatusBadge'
import { Dialog } from '../ui/dialog'
import { SubmitDialog } from './SubmitDialog'
import { ReviewDialog } from './ReviewDialog'
import {
  Plus, Upload, Check, RotateCcw, AlertCircle, Clock, Eye,
  Flag, Download, Loader2, ChevronDown, CalendarDays,
} from 'lucide-react'
import assistantService from '../../../services/assistantService'
import { getPriorityColor } from '../../utils'

/** Danh sách mức độ ưu tiên (giữ nguyên) */
const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

export function TaskPanel() {
  // ─── Stores ───
  const currentPageId = useWorkspaceStore((s) => s.currentPageId)
  const regions = useWorkspaceStore((s) => s.regions)
  const pages = useWorkspaceStore((s) => s.pages)
  const selectedRegionId = useWorkspaceStore((s) => s.selectedRegionId)
  const seriesId = useWorkspaceStore((s) => s.seriesId)
  const addLayer = useWorkspaceStore((s) => s.addLayer)
  const loadPage = useWorkspaceStore((s) => s.loadPage)
  const selectRegion = useWorkspaceStore((s) => s.selectRegion)
  const hideRegion = useWorkspaceStore((s) => s.hideRegion)

  const tasksByRegion = useTaskStore((s) => s.tasksByRegion)
  const isLoading = useTaskStore((s) => s.isLoading)
  const isSubmitting = useTaskStore((s) => s.isSubmitting)
  const loadTasks = useTaskStore((s) => s.loadTasks)
  const createTask = useTaskStore((s) => s.createTask)
  const submitTask = useTaskStore((s) => s.submitTask)
  const reviewSubmission = useTaskStore((s) => s.reviewSubmission)
  const selectTask = useTaskStore((s) => s.selectTask)

  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)

  const currentPage = pages.find((p) => p.id === currentPageId)

  // ─── Local state ───
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedAssistant, setSelectedAssistant] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  const [taskPriority, setTaskPriority] = useState('MEDIUM')
  const [taskDeadline, setTaskDeadline] = useState('')

  const [realAssistants, setRealAssistants] = useState([])
  const [loadingAssistants, setLoadingAssistants] = useState(false)
  const [posting, setPosting] = useState(false)

  const [submitTarget, setSubmitTarget] = useState(null)
  const [reviewTarget, setReviewTarget] = useState(null)

  // ─── Fetch assistants đã ACCEPTED trong series ───
  useEffect(() => {
    if (!seriesId) return
    setLoadingAssistants(true)
    assistantService.getBySeries(seriesId)
      .then((data) => setRealAssistants(data.filter((a) => a.status === 'ACCEPTED')))
      .catch(() => setRealAssistants([]))
      .finally(() => setLoadingAssistants(false))
  }, [seriesId])

  // ─── Auto-select assistant đầu tiên khi dialog Assign mở ───
  useEffect(() => {
    if (assignOpen && realAssistants.length > 0) {
      setSelectedAssistant(String(realAssistants[0].assistant.id))
    }
  }, [assignOpen, realAssistants])

  // ─── Load tasks cho tất cả regions của page ───
  // Khi regions thay đổi, load tasks cho những region chưa có trong tasksByRegion.
  useEffect(() => {
    if (!regions.length) return
    regions.forEach((r) => {
      if (!tasksByRegion[r.id]) {
        loadTasks(r.id)
      }
    })
  }, [regions.length])

  // ─── Gom tasks từ tất cả regions ───
  const allPageTasks = regions
    .flatMap((r) => tasksByRegion[r.id] || [])
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  // ─── Auto-hide regions khi task DONE ───
  useEffect(() => {
    allPageTasks.forEach((t) => {
      if (t.status === 'DONE') hideRegion(t.regionId)
    })
  }, [allPageTasks])

  // Kiểm tra chọn trang
  if (!currentPageId) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs text-on-surface-variant/60">Select a page</p>
      </div>
    )
  }

  const assignedRegionIds = new Set(allPageTasks.map((t) => t.regionId))
  const unassignedRegions = regions.filter((r) => !assignedRegionIds.has(r.id))

  const canSubmit = (status) => status === 'TODO' || status === 'IN_PROGRESS' || status === 'REJECTED'

  // ─── Handlers ───

  const resetAssignForm = () => {
    setSelectedRegion('')
    setSelectedAssistant('')
    setTaskTitle('')
    setTaskDescription('')
    setTaskNotes('')
    setTaskPriority('MEDIUM')
    setTaskDeadline('')
  }

  /**
   * Assign task: gọi createTask (POST /api/regions/{regionId}/tasks).
   */
  const handleAssign = async () => {
    if (!selectedRegion || !selectedAssistant) return
    const region = regions.find((r) => r.id === Number(selectedRegion))
    const assistant = realAssistants.find((a) => a.assistant.id === Number(selectedAssistant))
    if (!region || !assistant) return

    const defaultDeadline = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)

    setPosting(true)
    try {
      await createTask(region.id, {
        regionType: region.regionType || 'OTHER',
        title: taskTitle.trim() || `${region.regionType || 'Work'} — Page ?`,
        description: taskDescription.trim() || '',
        notes: taskNotes.trim() || '',
        priority: taskPriority,
        dueDate: (taskDeadline || defaultDeadline) + 'T00:00:00',
        assistantId: assistant.assistant.id,
        referenceImageUrl: '',
      })

      addToast({
        title: 'Task assigned',
        description: `"${taskTitle}" → ${assistant.assistant.displayName}`,
        variant: 'success',
      })
      setAssignOpen(false)
      resetAssignForm()
    } catch {
      addToast({ title: 'Failed to assign task', variant: 'error' })
    } finally {
      setPosting(false)
    }
  }

  /**
   * Submit bài: nhận { file, note } từ SubmitDialog → tạo FormData → gọi submitTask.
   * Endpoint: POST /api/tasks/{taskId}/submissions (multipart)
   */
  const handleSubmit = async ({ file, note }) => {
    if (!submitTarget || !file) return

    const formData = new FormData()
    formData.append('resultImage', file)
    if (note) formData.append('note', note)

    try {
      await submitTask(submitTarget.taskId, formData)
      await loadTasks(submitTarget.regionId)
      selectRegion(null)
      addToast({
        title: 'Submitted',
        description: `${submitTarget.label} submitted for review`,
        variant: 'success',
      })
      setSubmitTarget(null)
    } catch {
      addToast({ title: 'Submit failed', variant: 'error' })
    }
  }

  /**
   * Review submission: gọi reviewSubmission → nếu APPROVED + addAsLayer, tạo layer mới.
   * Endpoint: PATCH /api/submissions/{id}/status
   */
  const handleReview = async (submissionId, status, note, addAsLayer) => {
      if (status === 'APPROVED') {
        selectRegion(null)
        if (reviewTarget?.regionId) hideRegion(reviewTarget.regionId)
        loadPage(currentPageId)
      }
    try {
      const result = await reviewSubmission(submissionId, status, note)
      if (!result) {
        addToast({
          title: 'Review failed',
          variant: 'error',
        })
        return
      }
      // Update local task data ngay lập tức
      const regionId = reviewTarget?.regionId
      if (regionId) {
        useTaskStore.setState((s) => {
          const tasks = (s.tasksByRegion[regionId] || []).map((t) => {
            if (t.id !== reviewTarget?.taskId) return t
            return {
              ...t,
              status: status === 'APPROVED' ? 'DONE' : 'REJECTED',
              submissions: t.submissions?.map((sub) =>
                sub.id === submissionId ? { ...sub, status } : sub
              ) || [],
            }
          })
          return { tasksByRegion: { ...s.tasksByRegion, [regionId]: tasks } }
        })
      }
      addToast({
        title: status === 'APPROVED' ? 'Approved' : 'Revision requested',
        variant: status === 'APPROVED' ? 'success' : 'info',
      })
      if (status === 'APPROVED') {
        loadPage(currentPageId)
      }
      if (regionId) {
        loadTasks(regionId)
      }
    } catch {
      addToast({
        title: 'Review failed',
        variant: 'error',
      })
    }
  }

  /**
   * Icon trạng thái task
   */
  const statusIcon = (status) => {
    switch (status) {
      case 'APPROVED': return <Check size={10} className="text-status-success" />
      case 'IN_PROGRESS': return <Clock size={10} className="text-status-info" />
      case 'DONE': return <Check size={10} className="text-primary" />
      default: return <AlertCircle size={10} className="text-status-warning" />
    }
  }

  // ─── Render ───

  if (allPageTasks.length === 0 && unassignedRegions.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs text-on-surface-variant/60">No tasks for this page</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
          Tasks ({allPageTasks.length})
        </span>
        {user?.role === 'MANGAKA' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] gap-1"
            onClick={() => setAssignOpen(true)}
            disabled={unassignedRegions.length === 0}
          >
            <Plus size={12} /> Assign
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-primary" />
        </div>
      )}

      {/* No tasks + unassigned regions */}
      {allPageTasks.length === 0 && unassignedRegions.length > 0 && !isLoading && (
        <div className="px-3 py-4 text-center">
          <p className="text-xs text-on-surface-variant/60">Assign regions to assistants</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {unassignedRegions.slice(0, 5).map((r) => (
              <span
                key={r.id}
                className="text-[9px] px-1.5 py-0.5 bg-surface-container-low border border-outline-variant/30 text-on-surface-variant rounded"
              >
                {r.label || `Region #${r.id}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Task list */}
      {allPageTasks.length > 0 && (
        <div className="space-y-1 px-2">
          {allPageTasks.map((t) => {
            const region = regions.find((r) => r.id === t.regionId)
            const taskStatus = t.status
            const latestSubmission = t.submissions?.length
              ? t.submissions.reduce((a, b) =>
                  (a.version || 0) > (b.version || 0) ? a : b
                )
              : null

            return (
              <div
                key={t.id}
                className="px-3 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg"
              >
                {/* Dòng 1: icon + title + badge */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      {statusIcon(taskStatus)}
                      <span className="text-xs font-medium text-on-surface truncate">
                        {t.title || region?.label || `Region #${t.regionId}`}
                      </span>
                    </div>
                    {/* Assistant name + priority */}
                    <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
                      <span className="truncate">
                        {t.assistant?.displayName || 'Unknown'}
                      </span>
                      {t.priority && (
                        <span
                          className="flex items-center gap-0.5 flex-shrink-0"
                          style={{ color: getPriorityColor(t.priority) }}
                        >
                          <Flag size={8} /> {t.priority}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={taskStatus} size="sm" className="flex-shrink-0 mt-0.5" />
                </div>

                {/* Description */}
                {t.description && (
                  <p className="text-[10px] text-on-surface-variant/70 mt-1 leading-relaxed line-clamp-2">
                    {t.description}
                  </p>
                )}

                {/* Due date */}
                {t.dueDate && (
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">Due {t.dueDate}</p>
                )}

                {/* Download Page (ASSISTANT only) */}
                {t.pageImageUrl && user?.role === 'ASSISTANT' && t.assistant?.id === user.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const a = document.createElement('a')
                      a.href = t.pageImageUrl
                      a.download = `page-${t.regionId || 'reference'}.png`
                      a.click()
                    }}
                    className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <Download size={10} /> Download Page
                  </button>
                )}

                {/* Submit button (chỉ ASSISTANT được gán task, chưa có submission chờ duyệt) */}
                {user?.role === 'ASSISTANT' && t.assistant?.id === user.id && canSubmit(taskStatus) && !t.submissions?.some(s => s.status === 'SUBMITTED') && (
                  <button
                    onClick={() =>
                      setSubmitTarget({
                        taskId: t.id,
                        regionId: t.regionId,
                        label: region?.label || `Region #${t.regionId}`,
                      })
                    }
                    className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <Upload size={10} /> Submit
                  </button>
                )}

                {/* Pending Review (đã submit, chờ MANGAKA duyệt) */}
                {user?.role === 'ASSISTANT' && t.assistant?.id === user.id && t.submissions?.some(s => s.status === 'SUBMITTED') && (
                  <span className="mt-1.5 flex items-center gap-1 text-[10px] text-status-warning">
                    <Clock size={10} /> Pending Review
                  </span>
                )}

                {/* Review buttons (MANGAKA, có submission chờ review) */}
                {user?.role === 'MANGAKA' && t.submissions?.some(s => s.status === 'SUBMITTED') && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setReviewTarget({
                          taskId: t.id,
                          regionId: t.regionId,
                          submissionId: latestSubmission?.id || null,
                          label: region?.label || `Region #${t.regionId}`,
                          resultImageUrl: latestSubmission?.resultImageUrl || '',
                          submissionNote: latestSubmission?.note || '',
                          originalUrl: currentPage?.webImageUrl || currentPage?.originalImageUrl || '',
                        })
                      }}
                      className="flex items-center gap-0.5 text-[10px] font-medium text-status-success hover:text-status-success/80 transition-colors"
                    >
                      <Check size={10} /> Review
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Dialog Assign Task ─── */}
      <Dialog open={assignOpen} onClose={() => { setAssignOpen(false); resetAssignForm() }} title="Assign Task" description="Assign a region to an assistant" size="md">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Region <span className="text-error">*</span></label>
            <div className="relative">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full h-9 px-3 pr-8 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface appearance-none cursor-pointer transition-all"
              >
                <option value="">Select region...</option>
                {unassignedRegions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label || `Region #${r.id}`} ({r.regionType})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Assistant <span className="text-error">*</span></label>
            <div className="relative">
              <select
                value={selectedAssistant}
                onChange={(e) => setSelectedAssistant(e.target.value)}
                className="w-full h-9 px-3 pr-8 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface appearance-none cursor-pointer transition-all"
                disabled={loadingAssistants || realAssistants.length === 0}
              >
                {loadingAssistants ? (
                  <option value="" className="bg-surface-container-high text-on-surface">Loading...</option>
                ) : realAssistants.length === 0 ? (
                  <option value="" className="bg-surface-container-high text-on-surface">No assistants available</option>
                ) : (
                  realAssistants.map((a) => (
                    <option key={a.assistant.id} value={a.assistant.id} className="bg-surface-container-high text-on-surface">{a.assistant.displayName}</option>
                  ))
                )}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Task Title <span className="text-error">*</span></label>
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Castle Background — Page 3"
              className="w-full h-9 px-3 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Priority</label>
              <div className="relative">
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className={`w-full h-9 px-3 pr-8 text-sm border rounded-lg outline-none appearance-none cursor-pointer transition-all ${
                    taskPriority === 'LOW' ? 'bg-status-success/15 text-status-success border-status-success/30' :
                    taskPriority === 'MEDIUM' ? 'bg-status-warning/15 text-status-warning border-status-warning/30' :
                    taskPriority === 'HIGH' ? 'bg-status-danger/15 text-status-danger border-status-danger/30' :
                    'bg-error/20 text-error border-error/40'
                  }`}
                >
                  {priorityOptions.map((p) => (
                    <option key={p.value} value={p.value} className="bg-surface-container-high text-on-surface">{p.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Deadline</label>
              <div className="relative">
                <CalendarDays size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                <input
                  type="date"
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Description</label>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="What needs to be done?"
              rows={3}
              className="w-full resize-none px-3 py-2 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Notes / Instructions</label>
            <textarea
              value={taskNotes}
              onChange={(e) => setTaskNotes(e.target.value)}
              placeholder="Reference sheets, color palettes, style notes..."
              rows={2}
              className="w-full resize-none px-3 py-2 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface transition-all"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant/20">
            <button onClick={() => { setAssignOpen(false); resetAssignForm() }} className="h-9 px-4 rounded-lg text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={(() => { const d = !selectedRegion || !selectedAssistant || !taskTitle.trim() || posting; return d; })()}
              className="h-9 px-5 rounded-lg bg-primary text-sm font-semibold text-on-primary hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-2"
            >
              {posting && <Loader2 size={14} className="animate-spin" />}
              {posting ? 'Assigning...' : 'Assign Task'}
            </button>
          </div>
        </div>
      </Dialog>

      {/* ─── SubmitDialog ─── */}
      {submitTarget && (
        <SubmitDialog
          open={!!submitTarget}
          onClose={() => setSubmitTarget(null)}
          regionLabel={submitTarget.label}
          onConfirm={handleSubmit}
        />
      )}

      {/* ─── ReviewDialog ─── */}
      {reviewTarget && (
          <ReviewDialog
            open={!!reviewTarget}
            onClose={() => setReviewTarget(null)}
            submission={reviewTarget.submissionId ? {
              id: reviewTarget.submissionId,
              resultImageUrl: reviewTarget.resultImageUrl,
              note: reviewTarget.submissionNote,
            } : null}
            originalUrl={reviewTarget.originalUrl}
            taskLabel={reviewTarget.label}
            onReview={handleReview}
            isReviewing={isSubmitting}
          />
      )}

    </div>
  )
}
