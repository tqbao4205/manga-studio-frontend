/**
 * ── ReviewDialog.jsx — Dialog duyệt bài submission ──
 *
 * 🎯 Mục đích:
 *   - MANAGA mở dialog này khi click "Review" trên task đã submit
 *   - Hiển thị ảnh submission + cho phép APPROVED hoặc REVISION_REQUIRED
 *   - Khi APPROVED, có tuỳ chọn "Add as layer" để tự động tạo layer từ ảnh kết quả
 *
 * 📌 API calls (qua taskStore):
 *   - reviewSubmission(subId, status, note) → PATCH /api/submissions/{id}/status
 *   - addLayer(pageId, formData) → POST /api/v1/pages/{pageId}/layers (nếu "Add as layer")
 */

import { useState } from 'react'
import { Check, RotateCcw, X, FileImage, Loader2 } from 'lucide-react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { cn } from '../../utils'

/**
 * @param {Object} props
 * @param {boolean} props.open - Hiển thị dialog
 * @param {Function} props.onClose - Đóng dialog
 * @param {Object} props.submission - Submission data (id, resultImageUrl, note, ...)
 * @param {string} props.taskLabel - Tên task (hiển thị trên title)
 * @param {Function} props.onReview - Callback: (submissionId, status, note, addAsLayer) => Promise
 * @param {boolean} props.isReviewing - Đang xử lý (disable nút)
 */
export function ReviewDialog({ open, onClose, submission, taskLabel, onReview, isReviewing }) {
  const [status, setStatus] = useState(null) // 'APPROVED' | 'REVISION_REQUIRED'
  const [note, setNote] = useState('')
  const [addAsLayer, setAddAsLayer] = useState(true)

  /**
   * Reset state khi đóng dialog
   */
  const handleClose = () => {
    setStatus(null)
    setNote('')
    setAddAsLayer(true)
    onClose()
  }

  /**
   * Xác nhận review: gọi callback onReview.
   */
  const handleConfirm = async () => {
    if (!status || !submission) return
    await onReview(submission.id, status, note, addAsLayer)
    handleClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={`Review — ${taskLabel || 'Task'}`}
      description="Approve or request revision for this submission"
      size="md"
    >
      <div className="space-y-4">
        {/* Ảnh submission */}
        {submission?.resultImageUrl ? (
          <div className="border border-outline-variant rounded-lg overflow-hidden bg-surface-variant/20">
            <img
              src={submission.resultImageUrl}
              alt="Submission preview"
              className="w-full h-auto max-h-[300px] object-contain mx-auto"
            />
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center border border-dashed border-outline-variant/40 rounded-lg">
            <FileImage size={32} className="text-on-surface-variant/40" />
          </div>
        )}

        {/* Submission note từ ASSISTANT */}
        {submission?.note && (
          <div className="text-xs text-on-surface-variant/70 bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/20">
            <span className="font-semibold text-on-surface-variant">Note: </span>
            {submission.note}
          </div>
        )}

        {/* Chọn status: APPROVED hoặc REVISION_REQUIRED */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-2">
            Decision *
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setStatus('APPROVED')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                status === 'APPROVED'
                  ? 'border-status-success bg-status-success/10 text-status-success'
                  : 'border-outline-variant/30 text-on-surface-variant hover:border-status-success/50',
              )}
            >
              <Check size={16} /> Approved
            </button>
            <button
              onClick={() => setStatus('REVISION_REQUIRED')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                status === 'REVISION_REQUIRED'
                  ? 'border-status-warning bg-status-warning/10 text-status-warning'
                  : 'border-outline-variant/30 text-on-surface-variant hover:border-status-warning/50',
              )}
            >
              <RotateCcw size={16} /> Revise
            </button>
          </div>
        </div>

        {/* Note (bắt buộc nếu REVISION_REQUIRED) */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">
            {status === 'REVISION_REQUIRED' ? 'Revision Notes *' : 'Review Note (optional)'}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              status === 'REVISION_REQUIRED'
                ? 'Describe what needs to be changed...'
                : 'Optional feedback...'
            }
            rows={3}
            className="w-full px-2.5 py-1.5 text-sm bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary text-on-surface rounded-lg placeholder:text-on-surface-variant/40 resize-none"
          />
        </div>

        {/* Checkbox: Add as layer (chỉ khi APPROVED) */}
        {status === 'APPROVED' && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={addAsLayer}
              onChange={(e) => setAddAsLayer(e.target.checked)}
              className="w-4 h-4 accent-primary rounded"
            />
            <span className="text-xs text-on-surface-variant">
              Add result as a new layer on this page
            </span>
          </label>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!status || isReviewing || (status === 'REVISION_REQUIRED' && !note.trim())}
          >
            {isReviewing ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1" /> Processing...
              </>
            ) : status === 'APPROVED' ? (
              <>
                <Check size={14} className="mr-1" /> Approve
              </>
            ) : (
              <>
                <RotateCcw size={14} className="mr-1" /> Request Revision
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
