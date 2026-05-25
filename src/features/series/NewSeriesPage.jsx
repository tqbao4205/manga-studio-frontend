/*
  ==========================================================
  PAGE: NewSeriesPage (dùng chung cho Create & Edit)
  ROUTE: /series/new (tạo mới), /series/:seriesId/edit (sửa)
  MỤC ĐÍCH: Form tạo mới hoặc chỉnh sửa thông tin series.
  Khi tạo mới, tự động tạo Chapter 1 (Pilot) và chuyển đến Workspace.
  QUYỀN TRUY CẬP: Chỉ MANGAKA (owner của series đó)
  ==========================================================
*/

import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Upload, X } from 'lucide-react'
import { Button } from '../../shared/components/ui/button'
import { useSeriesStore } from '../../app/stores/seriesStore'
import { useAuthStore } from '../../app/stores/authStore'
import { useUIStore } from '../../app/stores/uiStore'

const GENRES = ['ACTION', 'FANTASY', 'ROMANCE', 'COMEDY', 'DRAMA']
const DEMOGRAPHICS = ['SHONEN', 'SHOJO', 'SEINEN', 'JOSEI']
const FREQUENCIES = ['WEEKLY', 'BIWEEKLY', 'MONTHLY']
const COLORS = ['#e63946', '#7c4dff', '#f472b6', '#f4a261', '#4fc3f7', '#2a9d8f', '#e76f51', '#264653']

export function NewSeriesPage() {
  const navigate = useNavigate()
  const { seriesId } = useParams()
  const location = useLocation()
  const isEdit = location.pathname.endsWith('/edit')
  const user = useAuthStore((s) => s.user)
  const seriesList = useSeriesStore((s) => s.seriesList)
  const addSeries = useSeriesStore((s) => s.addSeries)
  const updateSeries = useSeriesStore((s) => s.updateSeries)
  const addChapter = useSeriesStore((s) => s.addChapter)
  const getNextChapterId = useSeriesStore((s) => s.getNextChapterId)
  const addToast = useUIStore((s) => s.addToast)

  const [title, setTitle] = useState('')
  const [titleJp, setTitleJp] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [genre, setGenre] = useState('')
  const [demographic, setDemographic] = useState('')
  const [publishFrequency, setPublishFrequency] = useState('')
  const [coverColor, setCoverColor] = useState(COLORS[0])
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!isEdit || !seriesId) return
    const series = seriesList.find(s => s.id === Number(seriesId))
    if (!series) return
    setTitle(series.title)
    setTitleJp(series.titleJp || '')
    setSynopsis(series.synopsis)
    setGenre(series.genre)
    setDemographic(series.targetDemographic)
    setPublishFrequency(series.publishFrequency || '')
    setCoverColor(series.coverColor || COLORS[0])
    setCoverImageUrl(series.coverImageUrl || '')
  }, [isEdit, seriesId, seriesList])

  const canSubmit = title.trim() && genre && demographic

  const handleSubmit = () => {
    if (!canSubmit) return

    if (isEdit && seriesId) {
      updateSeries(Number(seriesId), {
        title: title.trim(),
        titleJp,
        synopsis,
        genre,
        targetDemographic: demographic,
        publishFrequency: publishFrequency || null,
        coverColor,
        coverImageUrl: coverImageUrl || '',
      })
      addToast({ type: 'success', title: 'Series updated', message: `"${title}" has been updated.` })
      navigate(`/series/${seriesId}`)
    } else {
      const newId = seriesList.length > 0 ? Math.max(...seriesList.map(s => s.id)) + 1 : 1
      addSeries({
        title: title.trim(),
        titleJp,
        synopsis,
        genre,
        targetDemographic: demographic,
        publishFrequency: publishFrequency || null,
        coverColor,
        coverImageUrl: coverImageUrl || '',
        status: 'DRAFT',
        mangakaId: user?.id || 1,
        tantouEditorId: null,
        chapterCount: 0,
        createdAt: new Date().toISOString(),
      })
      const chId = getNextChapterId()
      addChapter(newId, {
        seriesId: newId,
        chapterNumber: 1,
        title: 'Pilot',
        pageCount: 20,
        status: 'DRAFT',
        deadline: null,
        publishDate: null,
        progressPercent: 0,
        createdAt: new Date().toISOString(),
      })
      addToast({ type: 'success', title: 'Series created', message: `"${title}" has been created. Start working on Chapter 1 in the workspace.` })
      navigate(`/workspace/${chId}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(isEdit && seriesId ? `/series/${seriesId}` : '/series')}>
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{isEdit ? 'Edit Series' : 'New Series'}</h1>
          <p className="text-sm text-on-surface-variant mt-1">{isEdit ? 'Update your manga series' : 'Create a new manga series with Chapter 1'}</p>
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-5 border border-primary/20 p-5">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Blade of the Demon Moon" className="w-full h-9 px-3 text-sm bg-transparent border border-primary/20 outline-none focus:border-on-surface placeholder:text-on-surface-variant/30" />
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Japanese Title</label>
          <input value={titleJp} onChange={(e) => setTitleJp(e.target.value)} placeholder="e.g. 魔月の刃" className="w-full h-9 px-3 text-sm bg-transparent border border-primary/20 outline-none focus:border-on-surface placeholder:text-on-surface-variant/30" />
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Synopsis</label>
          <textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} placeholder="Describe your series..." rows={4} className="w-full px-3 py-2 text-sm bg-transparent border border-primary/20 outline-none focus:border-on-surface placeholder:text-on-surface-variant/30 resize-none" />
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Genre *</label>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <button key={g} onClick={() => setGenre(g)} className={`text-xs px-3 py-1.5 border transition-colors ${genre === g ? 'border-on-surface text-on-surface font-semibold' : 'border-primary/20 text-on-surface-variant hover:text-on-surface'}`}>
                {g.charAt(0) + g.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Target Demographic *</label>
          <div className="flex flex-wrap gap-2">
            {DEMOGRAPHICS.map((d) => (
              <button key={d} onClick={() => setDemographic(d)} className={`text-xs px-3 py-1.5 border transition-colors ${demographic === d ? 'border-on-surface text-on-surface font-semibold' : 'border-primary/20 text-on-surface-variant hover:text-on-surface'}`}>
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Publish Frequency</label>
          <div className="flex flex-wrap gap-2">
            {FREQUENCIES.map((f) => (
              <button key={f} onClick={() => setPublishFrequency(f === publishFrequency ? '' : f)} className={`text-xs px-3 py-1.5 border transition-colors ${publishFrequency === f ? 'border-on-surface text-on-surface font-semibold' : 'border-primary/20 text-on-surface-variant hover:text-on-surface'}`}>
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Cover Image URL</label>
          <input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://..." className="w-full h-9 px-3 text-sm bg-transparent border border-primary/20 outline-none focus:border-on-surface placeholder:text-on-surface-variant/30" />
        </div>

        {/* Upload ảnh bìa */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Cover Image</label>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = () => setThumbnailDataUrl(reader.result)
            reader.readAsDataURL(file)
          }} />
          {thumbnailDataUrl ? (
            <div className="relative w-32 h-44 border border-primary/20 overflow-hidden group">
              <img src={thumbnailDataUrl} alt="Preview" className="w-full h-full object-cover" />
              <button onClick={() => { setThumbnailDataUrl(''); if (fileInputRef.current) fileInputRef.current.value = '' }} className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-[#fdf8f8] border border-primary/20 opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={12} />
              </button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} className="w-32 h-44 border border-dashed border-primary/20 flex flex-col items-center justify-center gap-1 hover:bg-black/[0.02] transition-colors">
              <Upload size={20} className="text-on-surface-variant/40" />
              <span className="text-[10px] text-on-surface-variant/40">Upload</span>
            </button>
          )}
        </div>

        {/* Chọn màu cover (nếu chưa upload ảnh) */}
        {!thumbnailDataUrl && (
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Cover Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setCoverColor(c)} className={`w-7 h-7 border transition-colors ${coverColor === c ? 'border-on-surface' : 'border-transparent'}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nút submit */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(isEdit && seriesId ? `/series/${seriesId}` : '/series')}>Cancel</Button>
        <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
          {isEdit ? 'Save Changes' : 'Create Series'}
        </Button>
      </div>
    </div>
  )
}
