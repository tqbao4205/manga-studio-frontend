/**
 * ─────────────────────────────────────────────
 *  NewSeriesPage — Form t?o / s?a series
 *  Route: /series/new (t?o m?i)
 *         /series/:seriesId/edit (s?a)
 * ─────────────────────────────────────────────
 *
 * M?c dích:
 *   - Form t?o m?i ho?c ch?nh s?a thông tin series
 *   - H? tr? upload ?nh bìa (multipart/form-data)
 *   - Ch?n genre, demographic, cover color
 *
 * Lu?ng d? li?u (so v?i b?n cũ dùng mock):
 *   - B?n cũ: dùng addSeries/updateSeries t? seriesStore (mutate mock data)
 *   - B?n m?i: g?i seriesService.create/update (multipart/form-data)
 *             API backend x? lý upload ?nh lên Cloudinary
 *
 * API g?i:
 *   - GET /api/series/{id} (khi edit mode — load d? li?u c?)
 *   - POST /api/series (khi t?o m?i)
 *   - PUT /api/series/{id} (khi c?p nh?t)
 *
 * L?u ý:
 *   - Backend yêu c?u multipart/form-data:
 *     - "series": JSON string c?a SeriesRequest
 *     - "file": File ?nh bìa (optional khi update)
 *   - Dùng FormData + Blob d? g?i JSON nh? 1 part trong multipart
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Upload, X } from 'lucide-react'
import { Button } from '../../shared/components/ui/button'
import { useAuthStore } from '../../app/stores/authStore'
import { useUIStore } from '../../app/stores/uiStore'
import seriesService from '../../services/seriesService'

// Các enum kh?p v?i backend Genre.java và TargetDemographic.java
const GENRES = ['ACTION', 'FANTASY', 'ROMANCE', 'COMEDY', 'DRAMA']
const DEMOGRAPHICS = ['SHONEN', 'SHOJO', 'SEINEN', 'JOSEI']
const COLORS = ['#e63946', '#7c4dff', '#f472b6', '#f4a261', '#4fc3f7', '#2a9d8f', '#e76f51', '#264653']

export function NewSeriesPage() {
  const navigate = useNavigate()
  const { seriesId } = useParams()
  const location = useLocation()
  // Ki?m tra n?u du?ng d?n k?t thúc b?ng /edit -> dang ? ch? d? s?a
  const isEdit = location.pathname.endsWith('/edit')
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)

  // State cho form fields
  const [title, setTitle] = useState('')
  const [titleJp, setTitleJp] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [genre, setGenre] = useState('')
  const [demographic, setDemographic] = useState('')
  const [coverColor, setCoverColor] = useState(COLORS[0])
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState('')  // Preview ?nh tru?c khi upload
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  // N?u là edit mode, load d? li?u series t? API
  useEffect(() => {
    if (!isEdit || !seriesId) return
    // Không c?n search trong mock n?a — g?i API th?t
    seriesService.getById(Number(seriesId)).then((series) => {
      setTitle(series.title)
      setTitleJp(series.titleJp || '')
      setSynopsis(series.synopsis)
      setGenre(series.genre)
      setDemographic(series.targetDemographic)
      setCoverColor(series.coverColor || COLORS[0])
      setCoverImageUrl(series.coverImageUrl || '')
    }).catch(() => {})
  }, [isEdit, seriesId])

  // Ch? cho submit khi có title + genre + demographic + không dang submit
  const canSubmit = title.trim() && genre && demographic && !submitting

  /**
   * buildFormData: Tao FormData multipart d? g?i lên backend
   *
   * Backend yêu c?u:
   *   @RequestPart("series") SeriesRequest request
   *   @RequestParam("file") MultipartFile file
   *
   * D? g?i JSON qua multipart:
   *   - Tao Blob t? JSON string
   *   - append vào FormData v?i tên "series"
   *   - File append v?i tên "file"
   */
  const buildFormData = () => {
    const formData = new FormData()

    // B??c 1: Tao JSON string c?a SeriesRequest
    const seriesJson = JSON.stringify({
      title: title.trim(),
      titleJp: titleJp || null,
      synopsis: synopsis || null,
      genre,
      targetDemographic: demographic,
      coverColor,
      coverImageUrl: coverImageUrl || null,
    })

    // B??c 2: Append JSON nh? 1 part multipart (c?n Blob + filename)
    // Backend dùng @RequestPart d? parse JSON này
    formData.append('series', new Blob([seriesJson], { type: 'application/json' }), 'series.json')

    // B??c 3: Append file ?nh (n?u có)
    // Backend dùng @RequestParam("file") MultipartFile d? nh?n
    const file = fileInputRef.current?.files?.[0]
    if (file) {
      formData.append('file', file)
    }

    return formData
  }

  /**
   * handleSubmit: X? lý submit form
   *
   * N?u edit:
   *   - G?i PUT /api/series/{id} v?i FormData
   *   - Backend null-safe update (field null = gi? nguyên)
   *
   * N?u create:
   *   - G?i POST /api/series v?i FormData
   *   - Backend t? d?ng set status = DRAFT, gán mangaka = user hi?n t?i
   *   - Upload ?nh lên Cloudinary r?i save URL vào DB
   */
  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      if (isEdit && seriesId) {
        const formData = buildFormData()
        await seriesService.update(Number(seriesId), formData)
        addToast({ type: 'success', title: 'Series updated', message: `"${title}" has been updated.` })
        navigate(`/series/${seriesId}`)
      } else {
        const formData = buildFormData()
        // API tr? v? SeriesResponse v?a t?o (có id + coverImageUrl t? Cloudinary)
        const created = await seriesService.create(formData)
        addToast({ type: 'success', title: 'Series created', message: `"${title}" has been created.` })
        // Chuy?n d?n trang chi ti?t series v?a t?o
        navigate(`/series/${created.id}`)
      }
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to save series.' })
    } finally {
      setSubmitting(false)
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
          <p className="text-sm text-on-surface-variant mt-1">{isEdit ? 'Update your manga series' : 'Create a new manga series'}</p>
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
          <input value={titleJp} onChange={(e) => setTitleJp(e.target.value)} placeholder="e.g. ???" className="w-full h-9 px-3 text-sm bg-transparent border border-primary/20 outline-none focus:border-on-surface placeholder:text-on-surface-variant/30" />
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
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Cover Image URL</label>
          <input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://..." className="w-full h-9 px-3 text-sm bg-transparent border border-primary/20 outline-none focus:border-on-surface placeholder:text-on-surface-variant/30" />
        </div>

        {/* Upload ?nh bìa (file input ?n) */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">Cover Image</label>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            // D?c file thành data URL d? preview
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

        {/* Ch?n màu cover (ch? khi ch?a upload ?nh) */}
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
          {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Series'}
        </Button>
      </div>
    </div>
  )
}
