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
import { ComparisonSlider } from './ComparisonSlider'
import {
  Plus, Upload, Check, RotateCcw, AlertCircle, Clock, Eye,
  Flag, Download, Loader2,
} from 'lucide-react'
import { mockUsers } from '../../constants/mock-data'
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
  const addLayer = useWorkspaceStore((s) => s.addLayer)

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

  // ─── Local state ───
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedAssistant, setSelectedAssistant] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  const [taskPriority, setTaskPriority] = useState('MEDIUM')
  const [taskDeadline, setTaskDeadline] = useState('')

  const [submitTarget, setSubmitTarget] = useState(null)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [compareTarget, setCompareTarget] = useState(null)

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

  const canSubmit = (status) => status === 'TODO' || status === 'IN_PROGRESS'
  const assistants = mockUsers.filter((u) => u.role === 'ASSISTANT')

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
    const assistant = assistants.find((a) => a.id === Number(selectedAssistant))
    if (!region || !assistant) return

    const currentPage = pages.find((p) => p.id === currentPageId)
    const defaultDeadline = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)

    try {
      await createTask(region.id, {
        regionType: region.regionType || 'OTHER',
        title: taskTitle.trim() || `${region.regionType || 'Work'} — Page ?`,
        description: taskDescription.trim() || '',
        notes: taskNotes.trim() || '',
        priority: taskPriority,
        dueDate: taskDeadline || defaultDeadline,
        assistantId: assistant.id,
        pageImageUrl: currentPage?.webImageUrl || currentPage?.originalImageUrl || '',
        referenceImageUrl: '',
      })

      addToast({
        title: 'Task assigned',
        description: `"${taskTitle}" → ${assistant.displayName}`,
        variant: 'success',
      })
      setAssignOpen(false)
      resetAssignForm()
    } catch {
      addToast({ title: 'Failed to assign task', variant: 'error' })
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
    try {
      const updated = await reviewSubmission(submissionId, status, note)
      addToast({
        title: status === 'APPROVED' ? 'Approved' : 'Revision requested',
        variant: status === 'APPROVED' ? 'success' : 'info',
      })

      // Nếu APPROVED + "Add as layer": tạo layer từ ảnh kết quả
      if (status === 'APPROVED' && addAsLayer && updated?.resultImageUrl) {
        try {
          // Fetch ảnh về → tạo FormData → gọi addLayer
          const resp = await fetch(updated.resultImageUrl)
          const blob = await resp.blob()
          const file = new File([blob], `submission-${submissionId}.png`, { type: 'image/png' })
          const fd = new FormData()
          fd.append('file', file)
          fd.append('label', reviewTarget?.label || `Submission ${submissionId}`)
          fd.append('opacity', '1')
          await addLayer(currentPageId, fd)
          addToast({ title: 'Layer added from submission', variant: 'success' })
        } catch {
          addToast({ title: 'Failed to add layer from submission', variant: 'warning' })
        }
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

            return (
              <div key={t.id} className="px-3 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg">
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
                        {mockUsers.find((u) => u.id === t.assistantId)?.displayName || 'Unknown'}
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
                {t.pageImageUrl && user?.role === 'ASSISTANT' && t.assistantId === user.id && (
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

                {/* Submit button (ASSISTANT, task TODO/IN_PROGRESS) */}
                {canSubmit(taskStatus) && (
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

                {/* Review buttons (MANGAKA, task DONE) */}
                {user?.role === 'MANGAKA' && taskStatus === 'DONE' && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCompareTarget({
                          region: region?.label || `Region #${t.regionId}`,
                          originalLabel: 'Original Page',
                          submissionLabel: `${
                            mockUsers.find((u) => u.id === t.assistantId)?.displayName || 'Unknown'
                          }'s Submission`,
                        })
                      }
                      className="flex items-center gap-0.5 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <Eye size={10} /> Compare
                    </button>
                    <button
                      onClick={() =>
                        setReviewTarget({
                          taskId: t.id,
                          submissionId: t.submissions?.[0]?.id || null,
                          label: region?.label || `Region #${t.regionId}`,
                          resultImageUrl: t.submissions?.[0]?.resultImageUrl || '',
                          submissionNote: t.submissions?.[0]?.note || '',
                        })
                      }
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
      <Dialog
        open={assignOpen}
        onClose={() => { setAssignOpen(false); resetAssignForm() }}
        title="Assign Task"
        size="md"
      >
        <div className="space-y-3">
          {/* Region */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Region *</label>
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value)
                const region = regions.find((r) => r.id === Number(e.target.value))
                if (region && !taskTitle) {
                  setTaskTitle(`${region.regionType || 'Work'} — Page ?`)
                }
              }}
              className="w-full h-8 px-2 text-xs bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary text-on-surface rounded"
            >
              <option value="">Select region...</option>
              {unassignedRegions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label || `Region #${r.id}`} ({r.regionType})
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Task Title *</label>
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Castle Background — Page 3"
              className="w-full h-8 px-2 text-xs bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary text-on-surface rounded placeholder:text-on-surface-variant/40"
            />
          </div>

          {/* Assistant */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Assistant *</label>
            <select
              value={selectedAssistant}
              onChange={(e) => setSelectedAssistant(e.target.value)}
              className="w-full h-8 px-2 text-xs bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary text-on-surface rounded"
            >
              <option value="">Select assistant...</option>
              {assistants.map((a) => (
                <option key={a.id} value={a.id}>{a.displayName}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Priority</label>
            <div className="flex flex-wrap gap-1.5">
              {priorityOptions.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setTaskPriority(p.value)}
                  className={`text-[10px] px-2.5 py-1 border transition-colors rounded ${
                    taskPriority === p.value
                      ? 'border-primary text-primary font-semibold bg-primary/5'
                      : 'border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Flag size={10} style={{ color: getPriorityColor(p.value) }} />
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Deadline</label>
            <input
              type="date"
              value={taskDeadline}
              onChange={(e) => setTaskDeadline(e.target.value)}
              className="w-full h-8 px-2 text-xs bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary text-on-surface rounded"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Description</label>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="What needs to be done?"
              rows={3}
              className="w-full px-2 py-1.5 text-xs bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary text-on-surface rounded placeholder:text-on-surface-variant/40 resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Notes / Instructions</label>
            <textarea
              value={taskNotes}
              onChange={(e) => setTaskNotes(e.target.value)}
              placeholder="Reference sheets, color palettes, style notes..."
              rows={2}
              className="w-full px-2 py-1.5 text-xs bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary text-on-surface rounded placeholder:text-on-surface-variant/40 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
            <Button variant="ghost" size="sm" onClick={() => { setAssignOpen(false); resetAssignForm() }}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAssign} disabled={!selectedRegion || !selectedAssistant || !taskTitle.trim()}>
              <Plus size={14} /> Assign Task
            </Button>
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
          taskLabel={reviewTarget.label}
          onReview={handleReview}
          isReviewing={isSubmitting}
        />
      )}

      {/* ─── ComparisonSlider ─── */}
      <ComparisonSlider
        open={!!compareTarget}
        onClose={() => setCompareTarget(null)}
        label={compareTarget?.region}
        originalLabel={compareTarget?.originalLabel}
        submissionLabel={compareTarget?.submissionLabel}
      />
    </div>
  )
}
