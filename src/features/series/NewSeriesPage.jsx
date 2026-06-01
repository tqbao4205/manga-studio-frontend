import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Upload, X, Info, Image, Users, User } from 'lucide-react'
import { useAuthStore } from '../../app/stores/authStore'
import { useUIStore } from '../../app/stores/uiStore'
import seriesService from '../../services/seriesService'

const GENRES = ['ACTION', 'FANTASY', 'ROMANCE', 'COMEDY', 'DRAMA']
const DEMOGRAPHICS = ['SHONEN', 'SHOJO', 'SEINEN', 'JOSEI']
const FREQUENCIES = ['WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'HIATUS']

export function NewSeriesPage() {
  const navigate = useNavigate()
  const { seriesId } = useParams()
  const location = useLocation()
  const isEdit = location.pathname.endsWith('/edit')
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)

  const [title, setTitle] = useState('')
  const [titleJp, setTitleJp] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [genre, setGenre] = useState('')
  const [demographic, setDemographic] = useState('')
  const [frequency, setFrequency] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [newCoverFile, setNewCoverFile] = useState(null)
  const [newCoverPreview, setNewCoverPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [seriesInfo, setSeriesInfo] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!isEdit || !seriesId) return
    seriesService.getById(Number(seriesId)).then((series) => {
      setTitle(series.title)
      setTitleJp(series.titleJp || '')
      setSynopsis(series.synopsis)
      setGenre(series.genre)
      setDemographic(series.targetDemographic)
      setCoverImageUrl(series.coverImageUrl || '')
      setSeriesInfo(series)
    }).catch(() => {})
  }, [isEdit, seriesId])

  const canSubmit = title.trim() && genre && demographic && !submitting

  const buildFormData = () => {
    const formData = new FormData()
    formData.append('series', new Blob([JSON.stringify({
      title: title.trim(),
      titleJp: titleJp || null,
      synopsis: synopsis || null,
      genre,
      targetDemographic: demographic,
      coverImageUrl: coverImageUrl || null,
    })], { type: 'application/json' }), 'series.json')
    if (newCoverFile) {
      formData.append('file', newCoverFile)
    }
    return formData
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      if (isEdit && seriesId) {
        await seriesService.update(Number(seriesId), buildFormData())
        addToast({ type: 'success', title: 'Series updated', message: `"${title}" has been updated.` })
        navigate(`/series/${seriesId}`)
      } else {
        const created = await seriesService.create(buildFormData())
        addToast({ type: 'success', title: 'Series created', message: `"${title}" has been created.` })
        navigate(`/series/${created.id}`)
      }
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to save series.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNewCoverFile(file)
    setCoverImageUrl('')
    const reader = new FileReader()
    reader.onload = () => setNewCoverPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const clearNewCover = () => {
    setNewCoverFile(null)
    setNewCoverPreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const showExistingCover = isEdit && coverImageUrl && !newCoverPreview

  return (
    <div className="max-w-3xl mx-auto space-y-panel-gap pb-12 pt-container-padding">
      {/* Header */}
      <div className="mb-10">
        <button
          onClick={() => navigate(isEdit && seriesId ? `/series/${seriesId}` : '/series')}
          className="flex items-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high/30 px-3 py-1.5 -ml-3 rounded-lg transition-all group mb-4"
        >
          <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-medium uppercase tracking-wider">
            {isEdit ? 'Back to Series Detail' : 'Back'}
          </span>
        </button>
        <h1 className="text-headline-lg font-semibold text-on-surface mb-2">
          {isEdit ? 'Edit Series' : 'Create New Series'}
        </h1>
        <p className="text-base text-on-surface-variant">
          {isEdit
            ? 'Update your series details and manage production settings.'
            : 'Launch your next masterpiece into the production pipeline.'}
        </p>
      </div>

      {/* Form */}
      <form className="space-y-panel-gap" onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
        {/* Section 1: Basic Information */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-8">
            <Info size={20} className="text-primary" />
            <h2 className="text-xl font-semibold text-on-surface">Basic Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-on-surface-variant mb-2">Series Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Neon Horizon: Resonance"
                className="w-full bg-surface-container-low border-0 border-b border-outline-variant focus:border-primary focus:ring-0 focus:shadow-[0_4px_12px_-2px_rgba(139,92,246,0.2)] text-on-surface py-3 transition-all placeholder:text-on-surface-variant/30"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-on-surface-variant mb-2">Japanese Title (Optional)</label>
              <input
                value={titleJp}
                onChange={(e) => setTitleJp(e.target.value)}
                placeholder="e.g. ネオン・ホライゾン：共鳴"
                className="w-full bg-surface-container-low border-0 border-b border-outline-variant focus:border-primary focus:ring-0 focus:shadow-[0_4px_12px_-2px_rgba(139,92,246,0.2)] text-on-surface py-3 transition-all placeholder:text-on-surface-variant/30"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-on-surface-variant mb-2">Synopsis</label>
              <textarea
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                placeholder="Briefly describe the world, characters, and core conflict..."
                rows={4}
                className="w-full bg-surface-container-low border-0 border-b border-outline-variant focus:border-primary focus:ring-0 focus:shadow-[0_4px_12px_-2px_rgba(139,92,246,0.2)] text-on-surface py-3 transition-all resize-none placeholder:text-on-surface-variant/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">Genre</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-surface-container-low border-0 border-b border-outline-variant focus:border-primary focus:ring-0 focus:shadow-[0_4px_12px_-2px_rgba(139,92,246,0.2)] text-on-surface py-3 transition-all appearance-none"
              >
                <option value="">Select Genre...</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">Target Demographic</label>
              <select
                value={demographic}
                onChange={(e) => setDemographic(e.target.value)}
                className="w-full bg-surface-container-low border-0 border-b border-outline-variant focus:border-primary focus:ring-0 focus:shadow-[0_4px_12px_-2px_rgba(139,92,246,0.2)] text-on-surface py-3 transition-all appearance-none"
              >
                <option value="">Select Demographic...</option>
                {DEMOGRAPHICS.map((d) => (
                  <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-on-surface-variant mb-2">Publish Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full bg-surface-container-low border-0 border-b border-outline-variant focus:border-primary focus:ring-0 focus:shadow-[0_4px_12px_-2px_rgba(139,92,246,0.2)] text-on-surface py-3 transition-all appearance-none"
              >
                <option value="">Select frequency...</option>
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{f.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Cover Artwork */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-8">
            <Image size={20} className="text-primary" />
            <h2 className="text-xl font-semibold text-on-surface">Cover Artwork</h2>
          </div>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Cover preview / upload area */}
            {newCoverPreview ? (
              <div className="w-full md:w-48 aspect-[3/4] bg-surface-container-lowest rounded-lg overflow-hidden relative group border border-outline-variant/30">
                <img src={newCoverPreview} alt="New cover preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={clearNewCover}
                  className="absolute top-2 right-2 w-6 h-6 bg-surface/80 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container-highest transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : showExistingCover ? (
              <div className="w-full md:w-48 aspect-[3/4] bg-surface-container-lowest rounded-lg overflow-hidden relative group border border-outline-variant/30">
                <img src={coverImageUrl} alt="Current cover" className="w-full h-full object-cover" />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload size={24} className="text-white mb-1" />
                  <span className="text-xs text-white font-medium">Replace Cover</span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full md:w-48 aspect-[3/4] bg-surface-container-lowest border-2 border-dashed border-outline-variant rounded-lg flex flex-col items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary cursor-pointer transition-all group overflow-hidden relative"
              >
                <Upload size={36} className="mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium">Upload Cover</span>
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

            {/* Requirements */}
            <div className="flex-1 space-y-4">
              <div className="bg-surface-container-high/30 p-4 rounded-lg border border-outline-variant/20">
                {showExistingCover ? (
                  <>
                    <h3 className="text-sm font-medium text-primary mb-1">Current Cover</h3>
                    <ul className="text-xs space-y-1 text-on-surface-variant">
                      <li>• Click the preview or drag a new image to replace</li>
                      <li>• Recommended Size: 1600 x 2400 px</li>
                      <li>• Formats: JPG, PNG, WEBP</li>
                      <li>• Max File Size: 10MB</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-medium text-primary mb-1">Requirements</h3>
                    <ul className="text-xs space-y-1 text-on-surface-variant">
                      <li>• Recommended Size: 1600 x 2400 px</li>
                      <li>• Formats: JPG, PNG, WEBP</li>
                      <li>• Aspect Ratio: 2:3</li>
                      <li>• Max File Size: 10MB</li>
                    </ul>
                  </>
                )}
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {isEdit
                  ? 'Replacing the cover will immediately update the primary visual across the dashboard and external catalogs.'
                  : 'This artwork will be the primary visual for the series across the dashboard and external catalogs. High resolution is preferred for marketing materials.'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 3 (Edit only): Series Information */}
        {isEdit && seriesInfo && (
          <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-8 shadow-sm">
            <div className="flex items-center space-x-3 mb-8">
              <Info size={20} className="text-primary" />
              <h2 className="text-xl font-semibold text-on-surface">Series Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">Status</label>
                <p className="text-base text-on-surface">{seriesInfo.status || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">Created</label>
                <p className="text-base text-on-surface">
                  {seriesInfo.createdAt
                    ? new Date(seriesInfo.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">Total Chapters</label>
                <p className="text-base text-on-surface">{seriesInfo.chapterCount || 0}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">Global Rank</label>
                <p className="text-base text-on-surface">{seriesInfo.currentRank ? `#${seriesInfo.currentRank}` : '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">Mangaka</label>
                <p className="text-base text-on-surface">{seriesInfo.mangaka?.displayName || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">Tantou Editor</label>
                <p className="text-base text-on-surface">{seriesInfo.tantouEditor?.displayName || 'Unassigned'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Section: Team Assignment */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-8">
            <Users size={20} className="text-primary" />
            <h2 className="text-xl font-semibold text-on-surface">Team Assignment</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">Assign Mangaka</label>
              <div className="relative">
                <select
                  disabled
                  className="w-full bg-surface-container-low border-0 border-b border-outline-variant text-on-surface py-3 transition-all appearance-none opacity-70"
                >
                  <option>{seriesInfo?.mangaka?.displayName || user?.displayName || 'Auto-assigned'}</option>
                </select>
                <User size={16} className="absolute right-2 top-3 text-on-surface-variant pointer-events-none" />
              </div>
              <p className="text-xs text-on-surface-variant mt-2">Mangaka is assigned automatically during series creation.</p>
            </div>
          </div>
        </div>

        {/* Section: Publishing Info */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-8 shadow-sm">
        </div>

        {/* Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 gap-6">
          <div />
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => navigate(isEdit && seriesId ? `/series/${seriesId}` : '/series')}
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
            >
              Cancel
            </button>
            {isEdit && (
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-6 py-2.5 rounded-lg border border-outline-variant hover:border-primary hover:text-primary text-sm font-medium transition-all disabled:opacity-40"
              >
                {submitting ? 'Saving...' : 'Save as Draft'}
              </button>
            )}
            <button
              type="submit"
              disabled={!canSubmit}
              className="bg-primary text-on-primary px-8 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Submit for Review'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
