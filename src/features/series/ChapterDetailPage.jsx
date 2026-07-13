import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuthStore } from "../../app/stores/authStore";
import { useUIStore } from "../../app/stores/uiStore";
import seriesService from "../../services/seriesService";
import chapterService from "../../services/chapterService";
import pageService from "../../services/pageService";
import { EmptyState } from "../../shared/components/shared/EmptyState";
import { Loader } from "lucide-react";
import { compressImages } from "../../shared/utils/imageCompression";
import {
  ChevronLeft, ChevronRight, BookOpen, FileText, CheckSquare,
  MessageSquare, Clock, Image, Edit,
  LayoutGrid, List, Plus, Upload, X, File, Trash2, GripVertical,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const pageStatusConfig = {
  UPLOADED:       { label: 'Uploaded', dot: 'bg-outline-variant' },
  REGIONS_DEFINED: { label: 'Sketch',  dot: 'bg-tertiary' },
  IN_PRODUCTION:  { label: 'Inking',   dot: 'bg-primary' },
  COMPLETED:      { label: 'Complete', dot: 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' },
}



export function ChapterDetailPage() {
  const { seriesId, chapterId } = useParams();
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const isMangaka = user?.role === "MANGAKA";
  const isEditor = user?.role === "TANTOU_EDITOR" || user?.role === "EDITORIAL_BOARD";

  const addToast = useUIStore((s) => s.addToast);

  const [series, setSeries] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    if (!seriesId || !chapterId) return;
    setLoading(true);
    Promise.all([
      seriesService.getById(Number(seriesId)),
      chapterService.getById(Number(chapterId)),
      pageService.getByChapter(Number(chapterId)),
    ])
      .then(([seriesData, chapterData, pagesData]) => {
        setSeries(seriesData);
        setChapter(chapterData);
        setPages(Array.isArray(pagesData) ? pagesData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [seriesId, chapterId]);

  const stats = useMemo(() => {
    if (!chapter || pages.length === 0) {
      return { completedPages: '0/0', ongoingTasks: 0, pendingReviews: 0, daysToDeadline: null }
    }
    const completed = pages.filter(p => p.status === 'COMPLETED').length
    const ongoing = pages.filter(p => p.status === 'IN_PRODUCTION').length
    const pending = pages.filter(p => p.status === 'REGIONS_DEFINED').length
    const total = pages.length
    let days = null
    if (chapter.deadline) {
      days = Math.ceil((new Date(chapter.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    }
    return { completedPages: `${completed}/${total}`, ongoingTasks: ongoing, pendingReviews: pending, daysToDeadline: days }
  }, [chapter, pages])

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const timeAgo = (dateStr) => {
    if (!dateStr) return null
    const diff = new Date() - new Date(dateStr)
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const handleAddPageClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e) => {
    const rawFiles = Array.from(e.target.files || [])
    if (rawFiles.length === 0) return
    setSelectedFiles(rawFiles)
    setShowUploadModal(true)
    setCompressing(true)
    e.target.value = ''
    const compressed = await compressImages(rawFiles)
    setSelectedFiles(compressed)
    setCompressing(false)
  }

  const handleUploadConfirm = async () => {
    if (selectedFiles.length === 0) return
    setUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    selectedFiles.forEach((file) => formData.append('files', file))

    try {
      const created = await pageService.uploadBatch(Number(chapterId), formData, setUploadProgress)
      addToast({ type: 'success', title: 'Uploaded', message: `${created.length} pages uploaded.` })
      const fresh = await pageService.getByChapter(Number(chapterId))
      setPages(Array.isArray(fresh) ? fresh : [])
      closeUploadModal()
    } catch {
      addToast({ type: 'error', title: 'Upload failed', message: 'Could not upload pages.' })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const closeUploadModal = () => {
    setShowUploadModal(false)
    setSelectedFiles([])
  }

  const handleDeletePage = async (page) => {
    if (!window.confirm(`Delete Page ${page.pageNumber}? This action cannot be undone.`)) return
    try {
      await pageService.delete(page.id)
      addToast({ type: 'success', title: 'Deleted', message: `Page ${page.pageNumber} has been deleted.` })
      setPages((prev) => prev.filter((p) => p.id !== page.id))
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to delete page.' })
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = pages.findIndex((p) => p.id === active.id)
    const newIdx = pages.findIndex((p) => p.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return

    const reordered = [...pages]
    reordered.splice(oldIdx, 1)
    reordered.splice(newIdx, 0, pages[oldIdx])
    setPages(reordered)

    pageService.reorder(Number(chapterId), reordered.map((p) => p.id))
      .catch(() => addToast({ type: 'error', title: 'Reorder failed', message: 'Could not reorder pages.' }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <Loader size={24} className="animate-spin text-on-surface-variant/40" />
      </div>
    );
  }

  if (!series || !chapter) {
    return (
      <EmptyState
        icon={<BookOpen size={40} />}
        title="Chapter not found"
        description="The chapter you are looking for does not exist."
        action={
          <button
            onClick={() => navigate(`/series/${seriesId}`)}
            className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Back to Series
          </button>
        }
      />
    );
  }

  return (
    <div className="px-container-padding pt-container-padding space-y-8 max-w-[1400px] mx-auto w-full pb-28">

      {/* ═══ Breadcrumb & Header ═══ */}
      <div className="space-y-4">
        <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="hover:text-primary cursor-pointer" onClick={() => navigate('/series')}>Series</span>
          <ChevronRight size={14} />
          <span className="hover:text-primary cursor-pointer" onClick={() => navigate(`/series/${seriesId}`)}>{series.title}</span>
          <ChevronRight size={14} />
          <span className="text-primary">Ch. {chapter.chapterNumber}: {chapter.title}</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-on-surface tracking-tight">{chapter.title}</h1>
              <span className={cn(
                'px-3 py-0.5 rounded text-xs font-medium tracking-wider uppercase',
                chapter.status === 'PUBLISHED' || chapter.status === 'APPROVED'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : chapter.status === 'DRAFT' || chapter.status === 'PLANNED'
                    ? 'bg-surface-container-highest text-on-surface-variant'
                    : chapter.status === 'IN_REVIEW' || chapter.status === 'SUBMITTED' || chapter.status === 'PENDING_BOARD_APPROVAL'
                      ? 'bg-purple-500/20 text-purple-400'
                      : chapter.status === 'REVISION_REQUIRED' || chapter.status === 'REJECTED'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-primary/20 text-primary',
              )}>
                {{DRAFT:'Draft',PLANNED:'Planned',IN_PROGRESS:'In Progress',IN_REVIEW:'In Review',SUBMITTED:'Submitted',PENDING_BOARD_APPROVAL:'Under Editorial Review',PENDING_BOARD_VOTE:'Pending Editorial Review',APPROVED:'Approved',REVISION_REQUIRED:'Revision Needed',REJECTED:'Rejected',PUBLISHED:'Published'}[chapter.status] || chapter.status?.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-on-surface-variant">Ch. {chapter.chapterNumber}</span>
              <div className="w-48 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary shadow-[0_0_8px_rgba(139,92,246,0.4)] rounded-full transition-all"
                  style={{ width: `${Math.min(chapter.progressPercent || 0, 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-primary">{chapter.progressPercent || 0}%</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-outline-variant rounded-xl text-sm text-on-surface hover:bg-surface-container-highest transition-colors flex items-center gap-2"
            >
              <ChevronLeft size={18} />
              Back
            </button>
            {isMangaka && (
              <Link
                to={`/series/${seriesId}/chapters/${chapterId}/edit`}
                className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2"
              >
                <Edit size={18} />
                Edit Chapter
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Main Layout Grid ═══ */}
      <div className="grid grid-cols-12 gap-panel-gap">

        {/* ─── Left Column (9 cols) ─── */}
        <div className="col-span-12 lg:col-span-9 space-y-panel-gap">

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-surface-container rounded-xl border border-outline-variant/30 hover:border-primary/50 transition-colors group">
              <p className="text-xs text-on-surface-variant mb-1">Completed Pages</p>
              <div className="flex items-end justify-between">
                <h3 className="text-xl font-semibold text-on-surface">{stats.completedPages}</h3>
                <FileText size={20} className="text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
            <div className="p-5 bg-surface-container rounded-xl border border-outline-variant/30 hover:border-primary/50 transition-colors group">
              <p className="text-xs text-on-surface-variant mb-1">Ongoing Tasks</p>
              <div className="flex items-end justify-between">
                <h3 className="text-xl font-semibold text-on-surface">{stats.ongoingTasks}</h3>
                <CheckSquare size={20} className="text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
            <div className="p-5 bg-surface-container rounded-xl border border-outline-variant/30 hover:border-primary/50 transition-colors group">
              <p className="text-xs text-on-surface-variant mb-1">Pending Reviews</p>
              <div className="flex items-end justify-between">
                <h3 className="text-xl font-semibold text-on-surface">{stats.pendingReviews}</h3>
                <MessageSquare size={20} className="text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
            <div className="p-5 bg-surface-container rounded-xl border border-outline-variant/30 hover:border-primary/50 transition-colors group">
              <p className="text-xs text-on-surface-variant mb-1">Days to Deadline</p>
              <div className="flex items-end justify-between">
                <h3 className={cn(
                  'text-xl font-semibold',
                  stats.daysToDeadline !== null && stats.daysToDeadline <= 3 ? 'text-error' : 'text-on-surface',
                )}>
                  {stats.daysToDeadline !== null ? stats.daysToDeadline : '—'}
                </h3>
                <Clock size={20} className={cn(
                  stats.daysToDeadline !== null && stats.daysToDeadline <= 3 ? 'text-error/40 group-hover:text-error' : 'text-on-surface-variant/40 group-hover:text-primary',
                  'transition-colors',
                )} />
              </div>
            </div>
          </div>

          {/* Manuscript Pages */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-on-surface">Manuscript Pages</h2>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant"><LayoutGrid size={18} /></button>
                <button className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant"><List size={18} /></button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
              <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {pages.map((page) => (
                    <SortablePageCard
                      key={page.id}
                      page={page}
                      chapterId={chapterId}
                      isMangaka={isMangaka}
                      onDelete={handleDeletePage}
                      onMarkDone={async () => {
                        const newStatus = page.status === 'COMPLETED' ? 'UPLOADED' : 'COMPLETED';
                        try {
                          await pageService.updateStatus(page.id, newStatus);
                          const [freshPages, freshChapter] = await Promise.all([
                            pageService.getByChapter(Number(chapterId)),
                            chapterService.getById(Number(chapterId)),
                          ]);
                          setPages(Array.isArray(freshPages) ? freshPages : []);
                          setChapter(freshChapter);
                          addToast({
                            type: 'success',
                            title: newStatus === 'COMPLETED' ? 'Page completed' : 'Page reopened',
                            message: `Page ${page.pageNumber} ${newStatus === 'COMPLETED' ? 'marked as done' : 'reopened'}.`
                          });
                        } catch {
                          addToast({ type: 'error', title: 'Error', message: 'Failed to update page status.' });
                        }
                      }}
                    />
                  ))}

                  {isMangaka && (
                    <div
                      onClick={handleAddPageClick}
                      className="bg-surface-container-low border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center p-6 hover:border-primary/50 cursor-pointer transition-colors group"
                    >
                      <Plus size={40} className="text-outline-variant mb-2 group-hover:text-primary" />
                      <span className="text-sm text-on-surface-variant">Add Page</span>
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </section>

          {/* Upload Modal */}
          {showUploadModal && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[10vh]">
              <div className="bg-surface-container border border-outline-variant rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-on-surface">Upload Pages</h3>
                  <button onClick={closeUploadModal} className="p-1 text-on-surface-variant hover:text-on-surface">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 bg-surface-container-low p-3 rounded-lg">
                      <File size={18} className="text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-on-surface truncate">{file.name}</p>
                        <p className="text-xs text-on-surface-variant">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {(uploading || compressing) && (
                  <div className="mb-3">
                    <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${uploading ? uploadProgress : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1 text-right">
                      {uploading ? `${uploadProgress}%` : 'Compressing...'}
                    </p>
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={closeUploadModal}
                    disabled={uploading || compressing}
                    className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadConfirm}
                    disabled={uploading || compressing}
                    className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-40"
                  >
                    {uploading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
                    {uploading ? `Uploading ${selectedFiles.length} pages...` : compressing ? 'Compressing...' : `Upload ${selectedFiles.length} Pages`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Right Column (3 cols) ─── */}
        <div className="col-span-12 lg:col-span-3 space-y-panel-gap">

          {/* Chapter Info Panel */}
          <div className="bg-[#1E1E20]/70 backdrop-blur-xl border border-outline-variant/30 rounded-xl p-6 space-y-6">
            <h3 className="text-xs font-medium text-primary uppercase tracking-widest border-b border-outline-variant/30 pb-3">
              Chapter Info
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-on-surface-variant">Series Title</p>
                <p className="text-sm text-on-surface font-semibold">{series.title}</p>
              </div>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-xs text-on-surface-variant">Deadline</p>
                  <p className={cn(
                    'text-sm',
                    stats.daysToDeadline !== null && stats.daysToDeadline <= 3 ? 'text-error' : 'text-on-surface',
                  )}>
                    {formatDate(chapter.deadline) || '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-on-surface-variant">Publish Date</p>
                  <p className="text-sm text-on-surface">{formatDate(chapter.publishDate) || '—'}</p>
                </div>
              </div>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-xs text-on-surface-variant">Total Pages</p>
                  <p className="text-sm text-on-surface">{pages.length || chapter.pageCount || 0} Pages</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-on-surface-variant">Last Updated</p>
                  <p className="text-sm text-on-surface-variant">{timeAgo(chapter.updatedAt) || '—'}</p>
                </div>
              </div>
            </div>
            <button className="w-full border border-primary/30 text-primary py-2.5 rounded-xl text-sm font-medium hover:bg-primary/5 transition-colors">
              Manage Permissions
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Helper: cn for conditional classes ──
function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

// ── SortablePageCard: page card có thể kéo thả ──
function SortablePageCard({ page, chapterId, isMangaka, onDelete, onMarkDone }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id })
  const navigate = useNavigate()
  const cfg = pageStatusConfig[page.status] || { label: page.status, dot: 'bg-outline-variant' }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => navigate(`/workspace/${chapterId}/${page.id}`)}
      className={`group bg-surface-container-low border border-outline-variant/50 rounded-xl overflow-hidden hover:shadow-[0_8px_30px_rgb(139,92,246,0.1)] transition-all cursor-pointer ${isDragging ? 'opacity-40 z-50' : ''}`}
    >
      <div className="aspect-[3/4] relative bg-surface-container-highest overflow-hidden">
        {/* Drag handle */}
        {isMangaka && (
          <div
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 bg-surface/80 backdrop-blur text-on-surface-variant hover:text-primary p-1 rounded-lg transition-all cursor-grab active:cursor-grabbing"
          >
            <GripVertical size={14} />
          </div>
        )}

        {/* Delete button */}
        {isMangaka && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(page) }}
            className="absolute top-10 left-2 opacity-0 group-hover:opacity-100 bg-red-500/80 text-white p-1.5 rounded-lg transition-all hover:bg-red-500 z-10"
          >
            <Trash2 size={14} />
          </button>
        )}

        {/* Thumbnail */}
        {(page.finalImageUrl || page.thumbnailUrl || page.originalImageUrl) ? (
          <img src={page.finalImageUrl || page.thumbnailUrl || page.originalImageUrl} alt={`Page ${page.pageNumber}`} className="w-full h-full object-cover grayscale opacity-80 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image size={32} className="text-on-surface-variant/20" />
          </div>
        )}

        {/* Mark Done / Undo button */}
        {isMangaka && page.status === 'COMPLETED' ? (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkDone?.() }}
            className="absolute top-2 left-2 bg-yellow-500/90 text-white text-[10px] px-2 py-0.5 rounded-full font-bold hover:bg-yellow-600 transition-colors z-20 opacity-0 group-hover:opacity-100"
          >
            Undo
          </button>
        ) : isMangaka && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkDone?.() }}
            className="absolute top-2 left-2 bg-emerald-500/90 text-white text-[10px] px-2 py-0.5 rounded-full font-bold hover:bg-emerald-600 transition-colors z-20 opacity-0 group-hover:opacity-100"
          >
            Mark Done
          </button>
        )}

        {/* Gradient overlay + Open Workspace */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 pointer-events-none">
          <span className="w-full bg-primary text-white py-2 rounded-lg text-xs font-medium text-center pointer-events-none">
            Open Workspace
          </span>
        </div>

        {/* Page number badge */}
        <div className="absolute top-2 right-2">
          <span className="bg-surface/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-on-surface border border-outline-variant">
            P. {String(page.pageNumber).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="p-3 flex items-center justify-between">
        <span className="text-xs text-on-surface-variant">{cfg.label}</span>
        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      </div>
    </div>
  )
}
