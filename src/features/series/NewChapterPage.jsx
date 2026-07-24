import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Info, Calendar } from 'lucide-react'
import { RichEditor } from '../../shared/components/editor/RichEditor'
import { useUIStore } from '../../app/stores/uiStore'
import chapterService from '../../services/chapterService'

export function NewChapterPage() {
  const navigate = useNavigate()
  const { seriesId, chapterId } = useParams()
  const addToast = useUIStore((s) => s.addToast)
  const collapsed = useUIStore((s) => s.sidebarCollapsed)

  const [chapterNumber, setChapterNumber] = useState('')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [pageCount, setPageCount] = useState('20')
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isChapterEdit = !!chapterId

  useEffect(() => {
    if (!isChapterEdit) return
    chapterService.getById(Number(chapterId)).then((ch) => {
      setChapterNumber(String(ch.chapterNumber))
      setTitle(ch.title || '')
      setPageCount(String(ch.pageCount || 20))
      setDeadline(ch.deadline ? ch.deadline.slice(0, 10) : '')
    }).catch(() => {})
  }, [isChapterEdit, chapterId])

  const canSubmit = chapterNumber.trim() && Number(chapterNumber) > 0 && !submitting

  const submit = async (navigateAway) => {
    if (!canSubmit) return
    setSubmitting(true)
    const id = Number(seriesId)
    const chNumber = Number(chapterNumber)

    try {
      if (isChapterEdit) {
        await chapterService.update(Number(chapterId), {
          chapterNumber: chNumber,
          title: title.trim() || `Chapter ${chNumber}`,
          deadline: deadline || null,
        })
        addToast({ type: 'success', title: 'Saved', message: `Ch.${chNumber} has been updated.` })
        if (navigateAway) navigate(`/series/${seriesId}/chapters/${chapterId}`)
      } else {
        await chapterService.create(id, {
          chapterNumber: chNumber,
          title: title.trim() || `Chapter ${chNumber}`,
          deadline: deadline || null,
        })
        addToast({ type: 'success', title: 'Created', message: `Ch.${chNumber} has been created.` })
        if (navigateAway) navigate(`/series/${seriesId}`)
      }
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to save chapter.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (isChapterEdit) {
      navigate(`/series/${seriesId}/chapters/${chapterId}`)
    } else {
      navigate(`/series/${seriesId}`)
    }
  }

  return (
    <div className="pb-28 px-container-padding pt-container-padding">

      {/* ── Nút back — quay lại chapter detail (edit) hoặc series detail (create) ── */}
      <button
        onClick={() => {
          if (isChapterEdit) {
            navigate(`/series/${seriesId}/chapters/${chapterId}`)
          } else {
            navigate(`/series/${seriesId}`)
          }
        }}
        className="inline-flex items-center text-sm text-primary hover:underline mb-4 group"
      >
        <ArrowLeft size={18} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
        {isChapterEdit ? 'Back to Chapter Detail' : 'Back to Series Detail'}
      </button>

      {/* ── Header: tiêu đề + mô tả ────────────────────────────────────── */}
      <h1 className="text-3xl font-bold text-on-surface mb-2">
        {isChapterEdit ? 'Edit Chapter' : 'Create Chapter'}
      </h1>
      <p className="text-base text-on-surface-variant mb-10">
        {isChapterEdit ? 'Update chapter details and manage the production workflow.' : 'Set up a new chapter and initiate the production workflow.'}
      </p>

      {/* ═══════════════════════════════════════════════════════════════
          FORM: Chapter Information + Production Planning
      ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-panel-gap">

        {/* ── Section: Chapter Information ─────────────────────────────── */}
        <section className="bg-[#1E1E20] border border-[#3F3F46] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-3">
            <Info size={22} className="text-primary" />
            <h2 className="text-xl font-semibold text-on-surface">Chapter Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Chapter Number — bắt buộc, phải là số > 0 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-on-surface-variant">
                Chapter Number <span className="text-error">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={chapterNumber}
                onChange={(e) => setChapterNumber(e.target.value)}
                placeholder="e.g. 142"
                className="p-2 bg-[#151518] text-on-surface text-sm border-0 border-b border-[#3F3F46] outline-none focus:border-primary focus:shadow-[0_4px_12px_-2px_rgba(139,92,246,0.2)] transition-all placeholder:text-on-surface-variant/30"
              />
            </div>

            {/* Input Chapter Title — bắt buộc */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium text-on-surface-variant">
                Chapter Title <span className="text-error">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The Awakening of Ancient Spirits"
                className="p-2 bg-[#151518] text-on-surface text-sm border-0 border-b border-[#3F3F46] outline-none focus:border-primary focus:shadow-[0_4px_12px_-2px_rgba(139,92,246,0.2)] transition-all placeholder:text-on-surface-variant/30"
              />
            </div>

            {/* Rich Editor Chapter Summary — không bắt buộc */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium text-on-surface-variant">
                Chapter Summary
              </label>
              <RichEditor
                value={summary}
                onChange={setSummary}
                placeholder="Briefly describe the key events in this chapter..."
                minHeight="120px"
              />
            </div>
          </div>
        </section>

        {/* ── Section: Production Planning ─────────────────────────────── */}
        <section className="bg-[#1E1E20] border border-[#3F3F46] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-3">
            <Calendar size={22} className="text-primary" />
            <h2 className="text-xl font-semibold text-on-surface">Production Planning</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Estimated Page Count — số trang dự kiến */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-on-surface-variant">
                Estimated Page Count
              </label>
              <input
                type="number"
                min={1}
                max={40}
                value={pageCount}
                onChange={(e) => setPageCount(e.target.value)}
                placeholder="e.g. 24"
                className="p-2 bg-[#151518] text-on-surface text-sm border-0 border-b border-[#3F3F46] outline-none focus:border-primary focus:shadow-[0_4px_12px_-2px_rgba(139,92,246,0.2)] transition-all placeholder:text-on-surface-variant/30"
              />
            </div>

            {/* Input Deadline Date — hạn chót (date picker) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-on-surface-variant">
                Deadline Date
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="p-2 bg-[#151518] text-on-surface text-sm border-0 border-b border-[#3F3F46] outline-none focus:border-primary focus:shadow-[0_4px_12px_-2px_rgba(139,92,246,0.2)] transition-all [color-scheme:dark]"
              />
            </div>
          </div>
        </section>

      </div>

      {/* ── Sticky Footer: Cancel + Submit buttons ─────────────────────── */}
      {/* Fixed ở bottom, chỉnh left dựa vào sidebar collapsed */}
      <div
        className={`fixed bottom-0 right-0 z-40 bg-surface-container-lowest/80 backdrop-blur-xl border-t border-outline-variant p-6 ${collapsed ? 'left-0' : 'left-[280px]'}`}
      >
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-end items-center gap-4">
          {/* Nút Cancel — quay lại mà không lưu */}
          <button
            type="button"
            onClick={handleCancel}
            className="w-full md:w-auto px-6 py-2.5 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            Cancel
          </button>
          {/* Nút Create Chapter / Save Changes — submit form */}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => submit(true)}
            className="w-full md:w-auto px-10 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:brightness-110 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : isChapterEdit ? 'Save Changes' : 'Create Chapter'}
          </button>
        </div>
      </div>
    </div>
  )
}
