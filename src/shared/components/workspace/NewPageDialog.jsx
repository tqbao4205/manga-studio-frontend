import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { compressImage } from '../../utils/imageCompression'

/*
 * ===== NewPageDialog Component (workspace) =====
 * Mục đích: Dialog import trang mới vào workspace.
 * Hỗ trợ hai chế độ:
 *   1. Upload Image: tải ảnh từ máy, xem trước trước khi xác nhận
 *   2. Blank Page: tạo trang trống không có ảnh nền
 * Dữ liệu ảnh được truyền lên component cha qua callback onConfirm.
 * ==================================
 */

/**
 * Component: Dialog thêm trang mới
 * Props:
 *   - open: hiển thị dialog
 *   - onClose: đóng dialog
 *   - onConfirm: callback nhận imageData (null nếu là blank page)
 */
export function NewPageDialog({ open, onClose, onConfirm }) {
  const fileInputRef = useRef(null)           // Ref cho input file ẩn
  const [mode, setMode] = useState('upload')  // 'upload' | 'blank'
  const [preview, setPreview] = useState(null) // URL xem trước ảnh
  const [imageData, setImageData] = useState(null) // Data URL ảnh gốc

  /**
   * Xử lý khi người dùng chọn file ảnh
   * Đọc file dưới dạng DataURL và lưu vào state preview + imageData
   */
  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    const compressed = await compressImage(file)
    const reader = new FileReader()
    reader.onload = () => setImageData(reader.result)
    reader.readAsDataURL(compressed)
  }

  /**
   * Xác nhận thêm trang: gửi imageData (hoặc null nếu blank) lên parent
   */
  const handleConfirm = () => {
    onConfirm(imageData)
    setPreview(null)
    setImageData(null)
  }

  /**
   * Đóng dialog và reset toàn bộ state
   */
  const handleClose = () => {
    setPreview(null)
    setImageData(null)
    setMode('upload')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Import Page" description="Upload an image or create a blank page." size="sm">
      <div className="space-y-4">
        {/* Tabs chọn chế độ: Upload Image / Blank Page */}
        <div className="flex border border-workspace-border overflow-hidden">
          <button onClick={() => setMode('upload')}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${mode === 'upload' ? 'bg-workspace-accent text-white' : 'text-workspace-text-secondary hover:text-workspace-text'}`}>
            Upload Image
          </button>
          <button onClick={() => { setMode('blank'); setPreview(null); setImageData(null) }}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${mode === 'blank' ? 'bg-workspace-accent text-white' : 'text-workspace-text-secondary hover:text-workspace-text'}`}>
            Blank Page
          </button>
        </div>

        {mode === 'upload' ? (
          /* Chế độ upload ảnh */
          <>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            {preview ? (
              /* Preview ảnh sau khi chọn file */
              <div className="relative border border-workspace-border overflow-hidden group rounded">
                <img src={preview} alt="Page preview" className="w-full h-auto max-h-[400px] object-contain" />
                {/* Nút xóa preview */}
                <button
                  onClick={() => { setPreview(null); setImageData(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-workspace-surface border border-workspace-border opacity-0 group-hover:opacity-100 transition-opacity rounded"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              /* Drop zone để chọn file */
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border border-dashed border-workspace-border/40 flex flex-col items-center justify-center gap-2 hover:bg-workspace-bg/30 transition-colors rounded"
              >
                <Upload size={28} className="text-workspace-text-secondary/40" />
                <span className="text-xs text-workspace-text-secondary/40">Click to upload page image</span>
                <span className="text-[10px] text-workspace-text-secondary/30">PNG, JPG, WEBP</span>
              </button>
            )}
          </>
        ) : (
          /* Chế độ blank page: hiển thị icon minh họa */
          <div className="flex flex-col items-center justify-center h-48 border border-dashed border-workspace-border/40 rounded">
            <div className="w-16 h-20 border-2 border-workspace-border/30 flex items-center justify-center">
              <span className="text-2xl font-bold text-workspace-text-secondary/20">1</span>
            </div>
            <p className="text-xs text-workspace-text-secondary/40 mt-3">Creates a blank page with no image</p>
          </div>
        )}

        {/* Footer: Cancel / Add Page */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-workspace-border">
          <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
          <Button size="sm" onClick={handleConfirm} disabled={mode === 'upload' && !preview}>Add Page</Button>
        </div>
      </div>
    </Dialog>
  )
}
