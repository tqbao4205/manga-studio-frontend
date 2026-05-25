import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'

/*
 * ===== SubmitDialog Component (workspace) =====
 * Mục đích: Dialog nộp bài (submission) cho một region cụ thể.
 * Người dùng upload ảnh kết quả làm việc, xem trước, và xác nhận nộp.
 * Ảnh được đọc dưới dạng DataURL và truyền lên component cha qua onConfirm.
 * ==================================
 */

/**
 * Component: Dialog nộp bài cho region
 * Props:
 *   - open: hiển thị dialog
 *   - onClose: đóng dialog
 *   - regionLabel: nhãn region (hiển thị trên title)
 *   - onConfirm: callback nhận imageData (DataURL)
 */
export function SubmitDialog({ open, onClose, regionLabel, onConfirm }) {
  const fileInputRef = useRef(null)         // Ref cho input file ẩn
  const [preview, setPreview] = useState(null) // URL xem trước ảnh nộp

  /**
   * Xử lý khi người dùng chọn file
   */
  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result)
    reader.readAsDataURL(file)
  }

  /**
   * Xác nhận nộp bài: gửi imageData lên parent
   */
  const handleConfirm = () => {
    if (!preview) return
    onConfirm(preview)
    setPreview(null)
  }

  /**
   * Đóng dialog và reset state
   */
  const handleClose = () => {
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} title={`Submit — ${regionLabel}`} description="Upload your completed work for this region." size="sm">
      <div className="space-y-4">
        {/* Input file ẩn */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        {preview ? (
          /* Preview ảnh sau khi chọn file */
          <div className="relative border border-workspace-border overflow-hidden group rounded">
            <img src={preview} alt="Submission preview" className="w-full h-auto max-h-[300px] object-contain" />
            {/* Nút xóa preview */}
            <button
              onClick={() => { setPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-workspace-surface border border-workspace-border opacity-0 group-hover:opacity-100 transition-opacity rounded"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          /* Drop zone upload */
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-40 border border-dashed border-workspace-border/40 flex flex-col items-center justify-center gap-2 hover:bg-workspace-bg/30 transition-colors rounded"
          >
            <Upload size={24} className="text-workspace-text-secondary/40" />
            <span className="text-xs text-workspace-text-secondary/40">Upload your work</span>
          </button>
        )}

        {/* Footer: Cancel / Submit */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-workspace-border">
          <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
          <Button size="sm" onClick={handleConfirm} disabled={!preview}>Submit</Button>
        </div>
      </div>
    </Dialog>
  )
}
