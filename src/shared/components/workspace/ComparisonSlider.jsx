import { useState, useRef, useCallback } from 'react'
import { Dialog } from '../ui/dialog'
import { ImageOff, MoveHorizontal } from 'lucide-react'

/*
 * ===== ComparisonSlider Component (workspace) =====
 * Mục đích: Dialog so sánh ảnh gốc (original) và ảnh nộp bài (submission)
 * bằng thanh trượt dọc (slider). Người dùng kéo thanh để thấy phần ảnh bên trái/phải.
 * ======================================
 */

/**
 * Component con: hiển thị placeholder khi không có ảnh
 */
function PlaceholderImage({ label }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black/[0.02] border border-dashed border-black/[0.08] text-on-surface-variant/30">
      <ImageOff size={32} />
      <span className="text-xs mt-2">{label}</span>
    </div>
  )
}

/**
 * Component con: thanh trượt so sánh hai ảnh
 * Sử dụng clipPath để cắt ảnh gốc theo vị trí slider.
 * Luồng xử lý:
 *   - MouseDown: bắt đầu kéo
 *   - MouseMove: cập nhật vị trí slider theo tọa độ chuột
 *   - MouseUp/MouseLeave: kết thúc kéo
 *   - Ảnh submission hiển thị đầy đủ, ảnh gốc bị clip từ trái sang phải
 */
function Slider({ originalUrl, submissionUrl, originalLabel, submissionLabel }) {
  const containerRef = useRef(null)
  const [sliderPos, setSliderPos] = useState(50)   // Vị trí slider (0-100%)
  const [dragging, setDragging] = useState(false)   // Trạng thái đang kéo

  /**
   * Tính vị trí slider dựa trên tọa độ chuột
   */
  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setSliderPos((x / rect.width) * 100)
  }, [])

  const onMouseDown = (e) => {
    setDragging(true)
    handleMove(e.clientX)
  }

  const onMouseMove = (e) => {
    if (!dragging) return
    handleMove(e.clientX)
  }

  const onMouseUp = () => setDragging(false)

  // Kiểm tra có ít nhất một ảnh để hiển thị
  const hasImages = !!(originalUrl || submissionUrl)

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-2xl mx-auto select-none overflow-hidden"
      style={{ aspectRatio: '4/3', background: '#f0f0f0' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {!hasImages ? (
        // Không có ảnh nào: hiển thị placeholder
        <div className="relative w-full h-full">
          <PlaceholderImage label={submissionLabel} />
        </div>
      ) : (
        <>
          {/* Lớp dưới: ảnh submission (luôn hiển thị đầy đủ) */}
          <div className="absolute inset-0">
            {submissionUrl ? (
              <img src={submissionUrl} alt={submissionLabel} className="w-full h-full object-cover" />
            ) : (
              <PlaceholderImage label={submissionLabel} />
            )}
          </div>

          {/* Lớp trên: ảnh gốc bị clip theo sliderPos (chỉ hiện phần bên trái) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            {originalUrl ? (
              <img src={originalUrl} alt={originalLabel} className="w-full h-full object-cover" />
            ) : (
              <PlaceholderImage label={originalLabel} />
            )}
          </div>

          {/* Thanh trượt dọc (slider handle) */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white cursor-col-resize z-10 shadow-sm"
            style={{ left: `${sliderPos}%` }}
          >
            {/* Nút tròn giữa thanh */}
            <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center">
              <MoveHorizontal size={14} className="text-on-surface" />
            </div>
          </div>

          {/* Nhãn: Original (góc trên trái) */}
          <div className="absolute top-2 left-2 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded pointer-events-none">
            {originalLabel || 'Original'}
          </div>
          {/* Nhãn: Submission (góc trên phải) */}
          <div className="absolute top-2 right-2 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded pointer-events-none">
            {submissionLabel || 'Submission'}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Component chính: Dialog so sánh ảnh gốc và ảnh nộp bài
 * Props:
 *   - open, onClose: điều khiển dialog
 *   - originalUrl, submissionUrl: URL ảnh
 *   - originalLabel, submissionLabel: nhãn ảnh
 *   - label: tiêu đề chung
 */
export function ComparisonSlider({ open, onClose, originalUrl, submissionUrl, originalLabel, submissionLabel, label }) {
  return (
    <Dialog open={open} onClose={onClose} title={label ? `Compare: ${label}` : 'Compare Submission'} description="Drag the slider to compare original vs submission" size="lg">
      <Slider
        originalUrl={originalUrl}
        submissionUrl={submissionUrl}
        originalLabel={originalLabel}
        submissionLabel={submissionLabel}
      />
      {/* Chú thích màu sắc */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-on-surface-variant/60">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500/40" /> Original: {originalLabel}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500/40" /> Submission: {submissionLabel}</span>
      </div>
    </Dialog>
  )
}
