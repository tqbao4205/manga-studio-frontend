import { useState } from 'react'
import { useWorkspaceStore } from '../../../app/stores/workspaceStore'
import { useAuthStore } from '../../../app/stores/authStore'
import { useTaskStore } from '../../../app/stores/taskStore'
import { useTasks } from '../../hooks/useMockData'
import { useUIStore } from '../../../app/stores/uiStore'
import { Button } from '../ui/button'
import { StatusBadge } from '../shared/StatusBadge'
import { Dialog } from '../ui/dialog'
import { SubmitDialog } from './SubmitDialog'
import { ComparisonSlider } from './ComparisonSlider'
import {
  Plus, Upload, Check, RotateCcw, AlertCircle, Clock, Eye,
  Flag, Download,
} from 'lucide-react'
import { mockUsers } from '../../constants/mock-data'
import { getPriorityColor } from '../../utils'

/*
 * ===== TaskPanel Component =====
 * Mục đích: Panel quản lý task cho các region trên trang hiện tại.
 * Luồng xử lý chính:
 *   1. MANAGA (chủ truyện) gán task cho ASSISTANT qua dialog Assign
 *   2. ASSISTANT nhận task, làm việc, và submit ảnh kết quả
 *   3. MANAGA xem trước, so sánh (ComparisonSlider), approve hoặc yêu cầu revision
 *   4. Khi approve, ảnh được thêm vào layer của trang
 * =================================
 */

// Danh sách mức độ ưu tiên
const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

/**
 * Component chính: quản lý danh sách task, assign, submit, approve, revision
 * Sử dụng các sub-dialogs: Assign, SubmitDialog, Revision dialog, ComparisonSlider
 */
export function TaskPanel() {
  // --- Store selectors ---
  const currentPageId = useWorkspaceStore((s) => s.currentPageId)
  const regions = useWorkspaceStore((s) => s.regions)
  const pages = useWorkspaceStore((s) => s.pages)
  const updateRegion = useWorkspaceStore((s) => s.updateRegion)
  const addPendingSubmission = useWorkspaceStore((s) => s.addPendingSubmission)
  const approveSubmission = useWorkspaceStore((s) => s.approveSubmission)
  const addTask = useTaskStore((s) => s.addTask)
  const user = useAuthStore((s) => s.user)
  const { data: allTasks } = useTasks()
  const addToast = useUIStore((s) => s.addToast)

  // --- Local state cho các dialog ---
  const [assignOpen, setAssignOpen] = useState(false)       // Dialog assign task
  const [selectedRegion, setSelectedRegion] = useState('')  // Region được chọn để assign
  const [selectedAssistant, setSelectedAssistant] = useState('') // Assistant được assign
  const [taskTitle, setTaskTitle] = useState('')            // Tiêu đề task
  const [taskDescription, setTaskDescription] = useState('') // Mô tả task
  const [taskNotes, setTaskNotes] = useState('')            // Ghi chú cho assistant
  const [taskPriority, setTaskPriority] = useState('MEDIUM') // Độ ưu tiên
  const [taskDeadline, setTaskDeadline] = useState('')      // Hạn chót

  const [submitTarget, setSubmitTarget] = useState(null)    // Task đang submit
  const [revisionTarget, setRevisionTarget] = useState(null) // Task yêu cầu revision
  const [revisionNote, setRevisionNote] = useState('')      // Ghi chú revision
  const [compareTarget, setCompareTarget] = useState(null)  // Task đang so sánh

  // --- Tính toán dữ liệu ---
  const pageRegionIds = regions.map(r => r.id)
  const pageTasks = (allTasks || []).filter(t => pageRegionIds.includes(t.regionId))

  // Kiểm tra chọn trang
  if (!currentPageId) {
    return <div className="py-8 text-center"><p className="text-xs text-workspace-text-secondary">Select a page</p></div>
  }

  const assignedRegionIds = new Set(pageTasks.map(t => t.regionId))
  const unassignedRegions = regions.filter(r => !assignedRegionIds.has(r.id))

  const canSubmit = (status) => status === 'PENDING' || status === 'IN_PROGRESS'
  const assistants = mockUsers.filter(u => u.role === 'ASSISTANT')

  /**
   * Reset form assign về giá trị mặc định
   */
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
   * Xử lý assign task: tạo task mới trong taskStore,
   * cập nhật region với thông tin task
   */
  const handleAssign = () => {
    if (!selectedRegion || !selectedAssistant) return
    const region = regions.find(r => r.id === Number(selectedRegion))
    const assistant = assistants.find(a => a.id === Number(selectedAssistant))
    if (!region || !assistant) return

    const currentPage = pages.find(p => p.id === currentPageId)
    const defaultDeadline = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
    const newTask = {
      regionId: region.id,
      regionType: region.regionType || 'OTHER',
      title: taskTitle.trim() || `${region.regionType || 'Work'} — Page ?`,
      description: taskDescription.trim() || '',
      notes: taskNotes.trim() || '',
      priority: taskPriority,
      deadline: taskDeadline || defaultDeadline,
      assistant: { id: assistant.id, displayName: assistant.displayName, avatarUrl: '' },
      assignedBy: { id: user?.id || 1, displayName: user?.displayName || 'Unknown' },
      status: 'PENDING',
      attachments: [],
      pageImageUrl: currentPage?.webImageUrl || currentPage?.originalImageUrl || '',
      createdAt: new Date().toISOString(),
    }

    addTask(newTask)

    // Cập nhật region với task info
    updateRegion(region.id, {
      task: {
        id: newTask.id,
        assistantName: assistant.displayName,
        status: 'PENDING',
        deadline: taskDeadline || defaultDeadline,
      },
    })

    addToast({
      title: 'Task assigned',
      description: `"${newTask.title}" → ${assistant.displayName}`,
      variant: 'success',
    })

    setAssignOpen(false)
    resetAssignForm()
  }

  /**
   * Xử lý submit bài làm: lưu ảnh vào pending submission,
   * cập nhật trạng thái region thành SUBMITTED
   */
  const handleSubmit = (imageDataUrl) => {
    if (!submitTarget || !currentPageId || !user) return
    addPendingSubmission(submitTarget.taskId, {
      imageDataUrl,
      label: submitTarget.label,
      pageId: currentPageId,
      createdBy: { id: user.id, displayName: user.displayName },
    })
    updateRegion(submitTarget.regionId, {
      task: {
        id: submitTarget.taskId,
        assistantName: '',
        status: 'SUBMITTED',
        deadline: '',
      },
    })
    addToast({ title: 'Submitted', description: `${submitTarget.label} submitted for review`, variant: 'success' })
    setSubmitTarget(null)
  }

  /**
   * Xử lý approve: cập nhật trạng thái region thành APPROVED,
   * ảnh submission sẽ được thêm vào layer
   */
  const handleApprove = (regionId, taskId, label) => {
    updateRegion(regionId, {
      task: { id: taskId, assistantName: '', status: 'APPROVED', deadline: '' },
    })
    approveSubmission(taskId)
    addToast({ title: 'Approved', description: `${label} approved — layer added`, variant: 'success' })
  }

  /**
   * Xử lý yêu cầu revision: cập nhật trạng thái region thành REVISION_REQUIRED
   */
  const handleRequestRevision = () => {
    if (!revisionTarget) return
    updateRegion(revisionTarget.regionId, {
      task: { id: Date.now(), assistantName: '', status: 'REVISION_REQUIRED', deadline: '' },
    })
    addToast({ title: 'Revision requested', description: `${revisionTarget.label} needs revision: ${revisionNote}`, variant: 'info' })
    setRevisionTarget(null)
    setRevisionNote('')
  }

  /**
   * Icon hiển thị trạng thái task
   */
  const statusIcon = (status) => {
    switch (status) {
      case 'APPROVED': return <Check size={10} className="text-status-success" />
      case 'IN_PROGRESS': return <Clock size={10} className="text-status-info" />
      default: return <AlertCircle size={10} className="text-status-warning" />
    }
  }

  // Trạng thái rỗng: không task và không region nào chưa gán
  if (pageTasks.length === 0 && unassignedRegions.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs text-workspace-text-secondary">No tasks for this page</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header: tiêu đề + nút Assign (chỉ MANAGA) */}
      <div className="flex items-center justify-between px-3 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-workspace-text-secondary">
          Tasks ({pageTasks.length})
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

      {pageTasks.length === 0 && unassignedRegions.length > 0 ? (
        /* Trạng thái: có region chưa gán nhưng chưa có task nào */
        <div className="px-3 py-4 text-center">
          <p className="text-xs text-workspace-text-secondary">Assign regions to assistants</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {unassignedRegions.slice(0, 5).map(r => (
              <span key={r.id} className="text-[9px] px-1.5 py-0.5 bg-workspace-bg border border-workspace-border/30 text-workspace-text-secondary">
                {r.label || `Region #${r.id}`}
              </span>
            ))}
          </div>
        </div>
      ) : (
        /* Danh sách task */
        <div className="space-y-1 px-2">
          {pageTasks.map((t) => {
            const region = regions.find(r => r.id === t.regionId)
            const regionTask = region?.task
            const taskStatus = regionTask?.status || t.status

            return (
              <div key={t.id} className="px-3 py-2 bg-workspace-bg/40 border border-workspace-border/20 rounded">
                {/* Dòng 1: icon trạng thái + tiêu đề + StatusBadge */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      {statusIcon(taskStatus)}
                      <span className="text-xs font-medium text-workspace-text truncate">
                        {t.title || region?.label || `Region #${t.regionId}`}
                      </span>
                    </div>
                    {/* Tên assistant + priority */}
                    <div className="flex items-center gap-1.5 text-[10px] text-workspace-text-secondary">
                      <span className="truncate">{t.assistant.displayName}</span>
                      {t.priority && (
                        <span className="flex items-center gap-0.5 flex-shrink-0" style={{ color: getPriorityColor(t.priority) }}>
                          <Flag size={8} /> {t.priority}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={taskStatus} size="sm" className="flex-shrink-0 mt-0.5" />
                </div>

                {/* Mô tả task */}
                {t.description && (
                  <p className="text-[10px] text-workspace-text-secondary/70 mt-1 leading-relaxed line-clamp-2">
                    {t.description}
                  </p>
                )}

                {/* Hạn chót */}
                {t.deadline && (
                  <p className="text-[10px] text-workspace-text-secondary/60 mt-1">Due {t.deadline}</p>
                )}

                {/* Nút Download Page (chỉ ASSISTANT được gán) */}
                {t.pageImageUrl && user?.role === 'ASSISTANT' && t.assistant.id === user.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const a = document.createElement('a')
                      a.href = t.pageImageUrl
                      a.download = `page-${t.regionId || 'reference'}.png`
                      a.click()
                    }}
                    className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-workspace-accent hover:text-workspace-accent/80 transition-colors"
                  >
                    <Download size={10} /> Download Page
                  </button>
                )}

                {/* Nút Submit (chỉ ASSISTANT, khi task PENDING/IN_PROGRESS) */}
                {canSubmit(taskStatus) && (
                  <button
                    onClick={() => setSubmitTarget({ taskId: t.id, regionId: t.regionId, label: region?.label || `Region #${t.regionId}` })}
                    className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-workspace-accent hover:text-workspace-accent/80 transition-colors"
                  >
                    <Upload size={10} /> Submit
                  </button>
                )}

                {/* Nút Compare + Approve + Revise (chỉ MANAGA, khi SUBMITTED) */}
                {user?.role === 'MANGAKA' && taskStatus === 'SUBMITTED' && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      onClick={() => setCompareTarget({ region: region?.label || `Region #${t.regionId}`, originalLabel: 'Original Page', submissionLabel: `${t.assistant.displayName}'s Submission` })}
                      className="flex items-center gap-0.5 text-[10px] font-medium text-workspace-accent hover:text-workspace-accent/80 transition-colors"
                    >
                      <Eye size={10} /> Compare
                    </button>
                    <button
                      onClick={() => handleApprove(t.regionId, t.id, region?.label || `Region #${t.regionId}`)}
                      className="flex items-center gap-0.5 text-[10px] font-medium text-status-success hover:text-status-success/80 transition-colors"
                    >
                      <Check size={10} /> Approve
                    </button>
                    <button
                      onClick={() => setRevisionTarget({ regionId: t.regionId, label: region?.label || `Region #${t.regionId}` })}
                      className="flex items-center gap-0.5 text-[10px] font-medium text-status-warning hover:text-status-warning/80 transition-colors"
                    >
                      <RotateCcw size={10} /> Revise
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ===== Dialog Assign Task ===== */}
      <Dialog
        open={assignOpen}
        onClose={() => { setAssignOpen(false); resetAssignForm() }}
        title="Assign Task"
        size="md"
      >
        <div className="space-y-3">
          {/* Chọn Region (chỉ hiển thị region chưa được gán) */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-workspace-text-secondary block mb-1">Region *</label>
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value)
                const region = regions.find(r => r.id === Number(e.target.value))
                if (region && !taskTitle) {
                  setTaskTitle(`${region.regionType || 'Work'} — Page ?`)
                }
              }}
              className="w-full h-8 px-2 text-xs bg-workspace-bg border border-workspace-border outline-none focus:border-workspace-accent text-workspace-text rounded"
            >
              <option value="">Select region...</option>
              {unassignedRegions.map(r => (
                <option key={r.id} value={r.id}>{r.label || `Region #${r.id}`} ({r.regionType})</option>
              ))}
            </select>
          </div>

          {/* Tiêu đề task */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-workspace-text-secondary block mb-1">Task Title *</label>
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Castle Background — Page 3"
              className="w-full h-8 px-2 text-xs bg-workspace-bg border border-workspace-border outline-none focus:border-workspace-accent text-workspace-text rounded placeholder:text-workspace-text-secondary/40"
            />
          </div>

          {/* Chọn Assistant */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-workspace-text-secondary block mb-1">Assistant *</label>
            <select
              value={selectedAssistant}
              onChange={(e) => setSelectedAssistant(e.target.value)}
              className="w-full h-8 px-2 text-xs bg-workspace-bg border border-workspace-border outline-none focus:border-workspace-accent text-workspace-text rounded"
            >
              <option value="">Select assistant...</option>
              {assistants.map(a => (
                <option key={a.id} value={a.id}>{a.displayName}</option>
              ))}
            </select>
          </div>

          {/* Độ ưu tiên */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-workspace-text-secondary block mb-1">Priority</label>
            <div className="flex flex-wrap gap-1.5">
              {priorityOptions.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setTaskPriority(p.value)}
                  className={`text-[10px] px-2.5 py-1 border transition-colors ${
                    taskPriority === p.value
                      ? 'border-workspace-accent text-workspace-accent font-semibold'
                      : 'border-workspace-border text-workspace-text-secondary hover:text-workspace-text'
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

          {/* Hạn chót */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-workspace-text-secondary block mb-1">Deadline</label>
            <input
              type="date"
              value={taskDeadline}
              onChange={(e) => setTaskDeadline(e.target.value)}
              className="w-full h-8 px-2 text-xs bg-workspace-bg border border-workspace-border outline-none focus:border-workspace-accent text-workspace-text rounded"
            />
          </div>

          {/* Mô tả chi tiết */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-workspace-text-secondary block mb-1">Description</label>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="What needs to be done? Be specific about style, colors, details..."
              rows={3}
              className="w-full px-2 py-1.5 text-xs bg-workspace-bg border border-workspace-border outline-none focus:border-workspace-accent text-workspace-text rounded placeholder:text-workspace-text-secondary/40 resize-none"
            />
          </div>

          {/* Ghi chú / hướng dẫn */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-workspace-text-secondary block mb-1">Notes / Instructions</label>
            <textarea
              value={taskNotes}
              onChange={(e) => setTaskNotes(e.target.value)}
              placeholder="Reference sheets, color palettes, style notes for the assistant..."
              rows={2}
              className="w-full px-2 py-1.5 text-xs bg-workspace-bg border border-workspace-border outline-none focus:border-workspace-accent text-workspace-text rounded placeholder:text-workspace-text-secondary/40 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-workspace-border">
            <Button variant="ghost" size="sm" onClick={() => { setAssignOpen(false); resetAssignForm() }}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAssign} disabled={!selectedRegion || !selectedAssistant || !taskTitle.trim()}>
              <Plus size={14} /> Assign Task
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog Submit (SubmitDialog) */}
      {submitTarget && (
        <SubmitDialog
          open={!!submitTarget}
          onClose={() => setSubmitTarget(null)}
          regionLabel={submitTarget.label}
          onConfirm={handleSubmit}
        />
      )}

      {/* Dialog Request Revision */}
      {revisionTarget && (
        <Dialog open={!!revisionTarget} onClose={() => { setRevisionTarget(null); setRevisionNote('') }} title="Request Revision" description={`Revision notes for ${revisionTarget.label}`} size="sm">
          <div className="space-y-3">
            <textarea
              autoFocus
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              placeholder="Describe what needs to be revised..."
              rows={4}
              className="w-full bg-workspace-bg text-xs text-workspace-text placeholder:text-workspace-text-secondary/40 outline-none resize-none border border-workspace-border p-2 focus:border-workspace-accent transition-colors rounded"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-workspace-border">
              <Button variant="ghost" size="sm" onClick={() => { setRevisionTarget(null); setRevisionNote('') }}>Cancel</Button>
              <Button size="sm" onClick={handleRequestRevision} disabled={!revisionNote.trim()}>Request Revision</Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Dialog so sánh ảnh gốc và ảnh submit (ComparisonSlider) */}
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
