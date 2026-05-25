import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check, RotateCcw, ListTodo, FileText, Clock,
  User, CalendarDays, MessageSquare, Paperclip, Flag,
  Download, Image as ImageIcon,
} from 'lucide-react'
import { useTasks } from '../../shared/hooks/useMockData'
import { useAuthStore } from '../../app/stores/authStore'
import { useUIStore } from '../../app/stores/uiStore'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/card'
import { Button } from '../../shared/components/ui/button'
import { Badge } from '../../shared/components/ui/badge'
import { StatusBadge } from '../../shared/components/shared/StatusBadge'
import { EmptyState } from '../../shared/components/shared/EmptyState'
import { PageLoading } from '../../shared/components/shared/LoadingSpinner'
import { FilterBar } from '../../shared/components/shared/FilterBar'
import { Dialog } from '../../shared/components/ui/dialog'
import { mockUsers, mockRegions, mockPages, mockSeries, mockChapters } from '../../shared/constants/mock-data'
import { cn, getPriorityColor, getRegionTypeColor, formatDate } from '../../shared/utils'

// ── Tra ngược: regionId → series/chapter info ──
// Dùng để hiển thị đường dẫn "Open in Workspace"
function getTaskSeriesInfo(regionId) {
  for (const [pageIdStr, regions] of Object.entries(mockRegions)) {
    if (regions.some(r => r.id === regionId)) {
      const pageId = Number(pageIdStr)
      for (const [chIdStr, pages] of Object.entries(mockPages)) {
        if (pages.some(p => p.id === pageId)) {
          const chapterId = Number(chIdStr)
          const chData = Object.values(mockChapters).flat().find(c => c.id === chapterId)
          if (chData) {
            const series = mockSeries.find(s => s.id === chData.seriesId)
            return { seriesId: chData.seriesId, series, chapterId, chapterNumber: chData.chapterNumber }
          }
        }
      }
    }
  }
  return null
}

// ── Tra ngược: regionId → page number ──
function getPageNumberForRegion(regionId) {
  for (const [pageIdStr, regions] of Object.entries(mockRegions)) {
    if (regions.some(r => r.id === regionId)) {
      return Number(pageIdStr)
    }
  }
  return null
}

// ── Tra ngược: regionId → series name ──
function getSeriesNameForRegion(regionId) {
  const info = getTaskSeriesInfo(regionId)
  return info?.series?.title || ''
}

// ── Tuỳ chọn filter ──
const statusOptions = ['ALL', 'DONE', 'IN_PROGRESS', 'TODO', 'REJECTED']
const priorityOptions = ['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW']

// ── Dialog chi tiết task ──
// Hiển thị đầy đủ thông tin: region type, priority, assigned user, deadline, attachments, v.v.
function TaskDetailDialog({ task, onClose }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const info = getTaskSeriesInfo(task.regionId)
  const pageNum = getPageNumberForRegion(task.regionId)
  const seriesName = getSeriesNameForRegion(task.regionId)

  return (
    <Dialog open={true} onClose={onClose} title={task.title} description={task.description} size="lg">
      <div className="space-y-5">
        {/* Grid thông tin cơ bản: loại vùng, ưu tiên, người được gán, người giao, deadline, status */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Region Type</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: getRegionTypeColor(task.regionType) }} />
              <span className="text-on-surface">{task.regionType}</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Priority</span>
            <div className="flex items-center gap-1.5">
              <Flag size={12} style={{ color: getPriorityColor(task.priority) }} />
              <span className="text-on-surface" style={{ color: getPriorityColor(task.priority) }}>
                {task.priority}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Assigned to</span>
            <div className="flex items-center gap-1.5">
              <User size={12} className="text-on-surface-variant/40" />
              <span className="text-on-surface">{mockUsers.find(u => u.id === task.assistantId)?.displayName || 'Unknown'}</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Assigned by</span>
            <div className="flex items-center gap-1.5">
              <User size={12} className="text-on-surface-variant/40" />
              <span className="text-on-surface">{mockUsers.find(u => u.id === task.assignedBy)?.displayName || 'Unknown'}</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Deadline</span>
            <div className="flex items-center gap-1.5">
              <CalendarDays size={12} className="text-on-surface-variant/40" />
              <span className={cn(
                'text-on-surface',
                task.dueDate && new Date(task.dueDate) < new Date() ? 'text-status-danger' : '',
              )}>
                {task.dueDate || 'No deadline'}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Status</span>
            <StatusBadge status={task.status} size="sm" />
          </div>
        </div>

        <hr className="border-primary/10" />

        {/* Vị trí: series → page → region, kèm nút mở trong Workspace */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Location</span>
          <p className="text-sm text-on-surface">
            {seriesName && <>{seriesName} — </>}
            Page {pageNum || '?'} · Region #{task.regionId}
            {info && (
              <button
                onClick={() => { onClose(); navigate(`/workspace/${info.chapterId}`) }}
                className="ml-2 text-xs underline text-on-surface-variant/60 hover:text-on-surface"
              >
                Open in Workspace
              </button>
            )}
          </p>
        </div>

        {/* Mô tả công việc */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Description</span>
          <p className="text-sm text-on-surface-variant/80 leading-relaxed bg-black/[0.015] p-3 border border-primary/10">
            {task.description}
          </p>
        </div>

        {/* Ghi chú / hướng dẫn (nếu có) */}
        {task.notes && (
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Notes / Instructions</span>
            <div className="flex items-start gap-2 text-sm text-on-surface-variant/80 bg-status-info/5 border border-status-info/20 p-3">
              <MessageSquare size={14} className="text-status-info mt-0.5 flex-shrink-0" />
              <p className="leading-relaxed">{task.notes}</p>
            </div>
          </div>
        )}

        {/* File đính kèm (nếu có) */}
        {task.attachments && task.attachments.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Attachments</span>
            <div className="flex flex-wrap gap-2">
              {task.attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs border border-primary/20 px-2 py-1">
                  <Paperclip size={12} className="text-on-surface-variant/40" />
                  <span className="text-on-surface-variant">{att.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hình ảnh page tham chiếu (nếu có) */}
        {task.pageImageUrl && (
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Reference Page</span>
            <div className="flex items-center justify-between border border-primary/10 px-3 py-2">
              <span className="text-xs text-on-surface-variant truncate">page-{task.regionId || 'reference'}.png</span>
              <button
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = task.pageImageUrl
                  a.download = `page-${task.regionId || 'reference'}.png`
                  a.click()
                }}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Download size={12} /> Download
              </button>
            </div>
          </div>
        )}

        {/* Submission gần nhất (nếu có) */}
        {task.latestSubmission && (
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Latest Submission</span>
            <div className="flex items-center gap-2 text-sm border border-status-success/20 bg-status-success/5 p-3">
              <Check size={14} className="text-status-success" />
              <span className="text-on-surface-variant">
                Version {task.latestSubmission.version} submitted on {formatDate(task.latestSubmission.createdAt)}
              </span>
            </div>
          </div>
        )}

        <p className="text-[10px] text-on-surface-variant/40">Created {formatDate(task.createdAt)}</p>

        <hr className="border-primary/10" />

        {/* Nút hành động: Approve (Mangaka) + Open in Workspace */}
        <div className="flex items-center justify-end gap-2">
          {user?.role === 'MANGAKA' && task.status !== 'APPROVED' && task.status !== 'PENDING' && (
            <Button variant="ghost" size="sm" className="text-status-success border-status-success/30 bg-transparent hover:bg-status-success/5">
              <Check size={14} /> Approve
            </Button>
          )}
          {info && (
            <Button size="sm" onClick={() => { onClose(); navigate(`/workspace/${info.chapterId}`) }}>
              <FileText size={14} /> Open in Workspace
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  )
}

const priorityLabels = { URGENT: 'Urgent', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }

// ── Trang Task Management ──
// Route: /tasks
// Quyền:
//   - ASSISTANT: chỉ thấy task của mình
//   - MANGAKA / EDITOR / BOARD: thấy tất cả task
// Chức năng: lọc, xem chi tiết, approve/revision
export function TasksPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)
  const { data: tasks, isLoading } = useTasks()
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [selectedTask, setSelectedTask] = useState(null)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [revisionNote, setRevisionNote] = useState('')

  // Nếu là ASSISTANT → chỉ lấy task của họ
  const tasksList = useMemo(() => {
    const all = tasks || []
    if (user?.role !== 'ASSISTANT') return all
    return all.filter(t => t.assistantId === user.id)
  }, [tasks, user])

  // Lọc theo status + priority
  const filteredTasks = useMemo(() => {
    return tasksList.filter(t => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false
      return true
    })
  }, [tasksList, statusFilter, priorityFilter])

  // Nhóm task theo series
  const tasksBySeries = useMemo(() => {
    const groups = {}
    filteredTasks.forEach(t => {
      const info = getTaskSeriesInfo(t.regionId)
      const seriesId = info?.seriesId || 0
      if (!groups[seriesId]) {
        groups[seriesId] = {
          series: info?.series || null,
          tasks: [],
        }
      }
      groups[seriesId].tasks.push(t)
    })
    return Object.values(groups).sort((a, b) => {
      if (!a.series) return 1
      if (!b.series) return -1
      return a.series.title.localeCompare(b.series.title)
    })
  }, [filteredTasks])

  // Đếm số lượng theo status (cho FilterBar)
  const countByStatus = useMemo(() => {
    const counts = {}
    statusOptions.forEach(s => { counts[s] = tasksList.filter(t => s === 'ALL' || t.status === s).length })
    return counts
  }, [tasksList])

  // Đếm số lượng theo priority (cho FilterBar)
  const countByPriority = useMemo(() => {
    const counts = {}
    priorityOptions.forEach(p => { counts[p] = tasksList.filter(t => p === 'ALL' || t.priority === p).length })
    return counts
  }, [tasksList])

  // Cấu hình filter groups cho FilterBar
  const filterGroups = [
    {
      id: 'status', label: 'Status', value: statusFilter,
      options: statusOptions.map(s => ({
        value: s, label: s === 'ALL' ? 'All Status' : s.replace(/_/g, ' '),
        count: countByStatus[s] || 0,
      })),
      onChange: setStatusFilter,
    },
    {
      id: 'priority', label: 'Priority', value: priorityFilter,
      options: priorityOptions.map(p => ({
        value: p, label: p === 'ALL' ? 'All Priority' : (priorityLabels[p] || p),
        count: countByPriority[p] || 0,
      })),
      onChange: setPriorityFilter,
    },
  ]

  // Active filters để hiển thị chip
  const activeFilters = []
  if (statusFilter !== 'ALL') {
    activeFilters.push({
      groupId: 'status', groupLabel: 'Status', value: statusFilter,
      label: statusFilter.replace(/_/g, ' '),
      onRemove: () => setStatusFilter('ALL'),
    })
  }
  if (priorityFilter !== 'ALL') {
    activeFilters.push({
      groupId: 'priority', groupLabel: 'Priority', value: priorityFilter,
      label: priorityLabels[priorityFilter] || priorityFilter,
      onRemove: () => setPriorityFilter('ALL'),
    })
  }

  // ── Xử lý Approve (hiện chỉ hiển thị toast, chưa cập nhật store) ──
  const handleApprove = () => {
    if (!reviewTarget || reviewTarget.action !== 'approve') return
    addToast({ title: 'Approved', description: `"${reviewTarget.task.title}" approved`, variant: 'success' })
    setReviewTarget(null)
  }

  // ── Xử lý Request Revision ──
  const handleRevise = () => {
    if (!reviewTarget || !revisionNote.trim()) return
    addToast({ title: 'Revision requested', description: `"${reviewTarget.task.title}": ${revisionNote}`, variant: 'info' })
    setReviewTarget(null)
    setRevisionNote('')
  }

  // Đang loading → PageLoading
  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      {/* Dialog chi tiết task */}
      {selectedTask && (
        <TaskDetailDialog task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Task Management</h1>
          <p className="text-sm text-on-surface-variant/70 mt-1">
            {user?.role === 'ASSISTANT' ? `My tasks (${tasksList.length})` : 'Overview of all tasks across series'}
          </p>
        </div>
      </div>

      {/* Thanh filter */}
      <FilterBar
        groups={filterGroups}
        activeFilters={activeFilters}
        resultCount={filteredTasks.length}
        totalCount={tasksList.length}
        onClearAll={statusFilter !== 'ALL' || priorityFilter !== 'ALL' ? () => { setStatusFilter('ALL'); setPriorityFilter('ALL') } : undefined}
      />

      {/* Danh sách task (theo series) hoặc EmptyState */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<ListTodo size={40} />}
          title="No tasks found"
          description={statusFilter !== 'ALL' || priorityFilter !== 'ALL' ? 'No tasks match the selected filters.' : user?.role === 'ASSISTANT' ? 'You have no assigned tasks.' : 'No tasks have been created yet.'}
          action={statusFilter !== 'ALL' || priorityFilter !== 'ALL' ? <Button variant="ghost" onClick={() => { setStatusFilter('ALL'); setPriorityFilter('ALL') }}>Clear Filters</Button> : undefined}
        />
      ) : (
        <div className="space-y-6">
          {tasksBySeries.map(({ series: s, tasks: seriesTasks }) => (
            <Card key={s?.id || 0}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {/* Avatar series */}
                  <div
                    className="w-8 h-10 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: s?.coverColor || '#888' }}
                  >
                    {s ? s.title.split(' ').map(w => w[0]).join('').slice(0, 2) : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{s?.title || 'Unknown Series'}</p>
                    <p className="text-xs text-on-surface-variant/60">{s?.mangaka?.displayName || ''} · {seriesTasks.length} task{seriesTasks.length > 1 ? 's' : ''}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {seriesTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border border-border-light/30 hover:bg-black/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedTask(task)}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Thanh màu ưu tiên */}
                      <div
                        className="w-2 h-8 rounded-full flex-shrink-0"
                        style={{ background: getPriorityColor(task.priority) }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-on-surface truncate">{task.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-on-surface-variant/60">{mockUsers.find(u => u.id === task.assistantId)?.displayName || 'Unknown'}</span>
                          <span className="text-on-surface-variant/20">•</span>
                          <span className="text-xs text-on-surface-variant/60">Due {task.dueDate || '—'}</span>
                          {task.description && (
                            <>
                              <span className="text-on-surface-variant/20">•</span>
                              <span className="text-xs text-on-surface-variant/50 truncate max-w-[120px]">{task.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <Badge variant={task.priority === 'URGENT' ? 'danger' : task.priority === 'HIGH' ? 'warning' : 'info'} size="sm">
                        <Flag size={10} />
                        {priorityLabels[task.priority]}
                      </Badge>
                      <StatusBadge status={task.status} size="sm" />
                      {/* Nút Approve / Revise (chỉ Mangaka, khi task đã SUBMITTED) */}
                      {user?.role === 'MANGAKA' && task.status === 'SUBMITTED' && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setReviewTarget({ task, action: 'approve' }) }}
                            className="w-7 h-7 flex items-center justify-center border border-green-700/30 text-green-700 hover:bg-green-50 transition-colors"
                            title="Approve"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setReviewTarget({ task, action: 'revise' }) }}
                            className="w-7 h-7 flex items-center justify-center border border-orange-700/30 text-orange-700 hover:bg-orange-50 transition-colors"
                            title="Request Revision"
                          >
                            <RotateCcw size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog xác nhận Approve */}
      {reviewTarget?.action === 'approve' && (
        <Dialog open={true} onClose={() => setReviewTarget(null)} title="Approve Task" description={`Approve "${reviewTarget.task.title}" by ${mockUsers.find(u => u.id === reviewTarget.task.assistantId)?.displayName || 'Unknown'}?`} size="sm">
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setReviewTarget(null)}>Cancel</Button>
            <Button size="sm" onClick={handleApprove}>Confirm Approve</Button>
          </div>
        </Dialog>
      )}

      {/* Dialog nhập ghi chú Revision */}
      {reviewTarget?.action === 'revise' && (
        <Dialog open={true} onClose={() => { setReviewTarget(null); setRevisionNote('') }} title="Request Revision" description={`Notes for ${mockUsers.find(u => u.id === reviewTarget.task.assistantId)?.displayName || 'Unknown'}`} size="sm">
          <div className="space-y-3">
            <textarea
              autoFocus
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              placeholder="Describe what needs to be revised..."
              rows={4}
              className="w-full bg-transparent text-xs text-on-surface placeholder:text-on-surface-variant/40 outline-none resize-none border border-primary/20 p-2 focus:border-on-surface transition-colors"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-primary/20">
              <Button variant="ghost" size="sm" onClick={() => { setReviewTarget(null); setRevisionNote('') }}>Cancel</Button>
              <Button size="sm" onClick={handleRevise} disabled={!revisionNote.trim()}>Request Revision</Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
