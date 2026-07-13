/**
 * ── SubmitDialog.jsx — Dialog nộp bài cho task ──
 *
 * 🎯 Mục đích:
 *   - ASSISTANT upload ảnh kết quả + ghi chú khi submit task
 *   - Preview ảnh trước khi xác nhận
 *   - onConfirm trả về { file, note } thay vì DataURL (để tạo FormData gọi API)
 *
 * 📌 API calls (qua taskStore):
 *   - submitTask(taskId, formData) → POST /api/tasks/{taskId}/submissions (multipart)
 */

import { useRef, useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { compressImage } from '../../utils/imageCompression'

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {string} props.regionLabel - Tên region (hiển thị title)
 * @param {boolean} props.isSubmitting - Đang submit (disable nút + spinner)
 * @param {Function} props.onConfirm - Callback: ({ file, note }) => void
 */
export function SubmitDialog({ open, onClose, regionLabel, isSubmitting = false, onConfirm }) {
  const fileInputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [note, setNote] = useState('')

  /**
   * Xử lý chọn file: lưu File object + tạo preview URL.
   */
  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
    const compressed = await compressImage(file)
    setSelectedFile(compressed)
  }

  /**
   * Xác nhận nộp: gửi { file, note } lên parent để tạo FormData gọi API.
   */
  const handleConfirm = () => {
    if (!selectedFile) return
    onConfirm({ file: selectedFile, note: note.trim() })
  }

  /**
   * Đóng dialog + reset state.
   */
  const handleClose = () => {
    setPreview(null)
    setSelectedFile(null)
    setNote('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={`Submit — ${regionLabel}`}
      description="Upload your completed work for this region."
      size="sm"
    >
      <div className="space-y-4">
        {/* Input file ẩn */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        {preview ? (
          /* Preview ảnh + note */
          <div className="space-y-3">
            <div className="relative border border-outline-variant overflow-hidden group rounded-lg">
              <img
                src={preview}
                alt="Submission preview"
                className="w-full h-auto max-h-[300px] object-contain"
              />
              <button
                onClick={() => { setPreview(null); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-surface border border-outline-variant opacity-0 group-hover:opacity-100 transition-opacity rounded"
              >
                <X size={14} />
              </button>
            </div>
            {/* Note cho MANAGA */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">
                Note for reviewer
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe what you did, any challenges, or notes for the mangaka..."
                rows={2}
                className="w-full px-2.5 py-1.5 text-sm bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary text-on-surface rounded-lg placeholder:text-on-surface-variant/40 resize-none"
              />
            </div>
          </div>
        ) : (
          /* Drop zone upload */
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-40 border border-dashed border-outline-variant/40 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low transition-colors rounded-lg"
          >
            <Upload size={24} className="text-on-surface-variant/40" />
            <span className="text-xs text-on-surface-variant/40">Upload your work</span>
          </button>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button size="sm" onClick={handleConfirm} disabled={!selectedFile || isSubmitting}>
            {isSubmitting ? (
              <><Loader2 size={14} className="animate-spin" /> Submitting...</>
            ) : (
              'Submit'
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
