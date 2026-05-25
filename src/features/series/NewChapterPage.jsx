/*
  ==========================================================
  PAGE: NewChapterPage (dùng chung cho Create & Edit chapter)
  ROUTE: /series/:seriesId/chapters/new (tạo mới)
         /series/:seriesId/chapters/:chapterId/edit (sửa)
  MỤC ĐÍCH: Form tạo mới hoặc chỉnh sửa chapter.
  QUYỀN TRUY CẬP: Chỉ MANGAKA (owner của series)
  ==========================================================
*/

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../../shared/components/ui/button'
import { useSeriesStore } from '../../app/stores/seriesStore'
import { useUIStore } from '../../app/stores/uiStore'

export function NewChapterPage() {
  const navigate = useNavigate()
  const { seriesId, chapterId } = useParams()
  const chapters = useSeriesStore((s) => s.chapters)
  const addChapter = useSeriesStore((s) => s.addChapter)
  const updateChapter = useSeriesStore((s) => s.updateChapter)
  const addToast = useUIStore((s) => s.addToast)
  const [chapterNumber, setChapterNumber] = useState('')
  const [title, setTitle] = useState('')
  const [pageCount, setPageCount] = useState('20')
  const [deadline, setDeadline] = useState('')

  const isChapterEdit = !!chapterId

  /*
    Nếu là edit mode, load dữ liệu chapter hiện tại vào form.
    Duyệt qua tất cả chapters trong store (chapters là object
    keyed by seriesId) để tìm chapter phù hợp.
  */
  useEffect(() => {
    if (!isChapterEdit) return
    const allChs = Object.values(chapters).flat()
    const ch = allChs.find(c => c.id === Number(chapterId))
    if (!ch) return
    setChapterNumber(String(ch.chapterNumber))
    setTitle(ch.title || '')
    setPageCount(String(ch.pageCount || 20))
    setDeadline(ch.deadline || '')
  }, [isChapterEdit, chapterId, chapters])

  const canSubmit = chapterNumber.trim() && Number(chapterNumber) > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    const id = Number(seriesId)
    const chNumber = Number(chapterNumber)

    if (isChapterEdit) {
      updateChapter(Number(chapterId), {
        chapterNumber: chNumber,
        title: title.trim() || `Chapter ${chNumber}`,
        pageCount: Number(pageCount) || 20,
        deadline,
      })
      addToast({ type: 'success', title: 'Chapter updated', message: `Ch.${chNumber} has been updated.` })
      navigate(`/series/${seriesId}/chapters/${chapterId}`)
    } else {
      addChapter(id, {
        seriesId: id,
        chapterNumber: chNumber,
        title: title.trim() || `Chapter ${chNumber}`,
        pageCount: Number(pageCount) || 20,
        status: 'IN_PROGRESS',
        deadline,
        progressPercent: 0,
        createdAt: new Date().toISOString(),
      })
      addToast({ type: 'success', title: 'Chapter created', message: `Ch.${chNumber} has been created.` })
      navigate(`/series/${seriesId}`)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(isChapterEdit ? `/series/${seriesId}/chapters/${chapterId}` : `/series/${seriesId}`)}>
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{isChapterEdit ? 'Edit Chapter' : 'New Chapter'}</h1>
          <p className="text-sm text-on-surface-variant mt-1">{isChapterEdit ? 'Update chapter details' : 'Add a new chapter to this series'}</p>
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-5 border border-primary/20 p-5">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Chapter Number *</label>
          <input type="number" min={1} value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} placeholder="e.g. 26" className="w-full h-9 px-3 text-sm bg-transparent border border-primary/20 outline-none focus:border-on-surface placeholder:text-on-surface-variant/30" />
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Final Confrontation" className="w-full h-9 px-3 text-sm bg-transparent border border-primary/20 outline-none focus:border-on-surface placeholder:text-on-surface-variant/30" />
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Page Count</label>
          <input type="number" min={1} max={40} value={pageCount} onChange={(e) => setPageCount(e.target.value)} className="w-full h-9 px-3 text-sm bg-transparent border border-primary/20 outline-none focus:border-on-surface" />
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Deadline</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full h-9 px-3 text-sm bg-transparent border border-primary/20 outline-none focus:border-on-surface" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(isChapterEdit ? `/series/${seriesId}/chapters/${chapterId}` : `/series/${seriesId}`)}>Cancel</Button>
        <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
          {isChapterEdit ? 'Save Changes' : 'Create Chapter'}
        </Button>
      </div>
    </div>
  )
}
