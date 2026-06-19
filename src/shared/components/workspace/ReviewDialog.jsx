import { useState } from 'react'
import { Check, RotateCcw, FileImage, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { Dialog } from '../ui/dialog'
import { cn } from '../../utils'

export function ReviewDialog({ open, onClose, submission, taskLabel, onReview, isReviewing, originalUrl }) {
  const [comment, setComment] = useState('')
  const [revising, setRevising] = useState(false)
  const [showLayer, setShowLayer] = useState(true)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirmRevise, setConfirmRevise] = useState(false)

  const handleClose = () => {
    setComment('')
    setRevising(false)
    setConfirmApprove(false)
    setConfirmRevise(false)
    onClose()
  }

  const handleApproveConfirm = async () => {
    if (!submission) return
    await onReview(submission.id, 'APPROVED', '')
    handleClose()
  }

  const handleReviseConfirm = async () => {
    if (!submission || !comment.trim()) return
    await onReview(submission.id, 'REVISION_REQUIRED', comment.trim())
    handleClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={`Review — ${taskLabel || 'Task'}`}
      description="Approve or request revision for this submission"
      size="lg"
      className="max-w-5xl"
    >
      <div className="flex gap-6">
        {/* ═══ LEFT: Image Viewer ═══ */}
        <div className="w-4/5 flex flex-col gap-2">
          {submission?.resultImageUrl ? (
            <>
              <div className="relative w-full bg-surface-container-high rounded-lg overflow-hidden border border-outline-variant/20 max-h-[70vh]" style={{ minHeight: 300 }}>
                <img
                  src={originalUrl || submission.resultImageUrl}
                  alt="Review"
                  className="w-full h-full object-contain"
                />
                {originalUrl && (
                  <img
                    src={submission.resultImageUrl}
                    alt="Submission preview"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ opacity: showLayer ? 0.8 : 0 }}
                  />
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowLayer(!showLayer)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    showLayer
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'border-outline-variant/30 text-on-surface-variant hover:border-primary/30'
                  )}
                >
                  {showLayer ? <Eye size={14} /> : <EyeOff size={14} />}
                  {showLayer ? 'Hide Layer' : 'Show Layer'}
                </button>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center border border-dashed border-outline-variant/40 rounded-lg">
              <FileImage size={32} className="text-on-surface-variant/40" />
            </div>
          )}
        </div>

        {/* ═══ RIGHT: Controls ═══ */}
        <div className="w-1/5 flex flex-col gap-3 overflow-y-auto max-h-[560px]">
          {submission?.note && (
            <div className="text-xs text-on-surface-variant/70 bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant/20">
              <span className="font-semibold text-on-surface-variant">Note from assistant: </span>
              {submission.note}
            </div>
          )}

          {/* Revise comment input — chỉ hiện khi bấm Revise */}
          {revising && (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">
                Reason for revision *
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe what needs to be changed..."
                rows={3}
                className="w-full px-2.5 py-1.5 text-sm bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary text-on-surface rounded-lg placeholder:text-on-surface-variant/40 resize-none"
              />
            </div>
          )}

          {/* ═══ Approve confirmation ═══ */}
          {confirmApprove ? (
            <div className="flex flex-col gap-2 pt-3 border-t border-outline-variant mt-auto">
              <div className="flex items-center gap-1.5 text-xs font-medium text-status-success bg-status-success/10 rounded-lg px-2.5 py-2">
                <AlertTriangle size={14} />
                Approve this task?
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmApprove(false)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-outline-variant/30 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveConfirm}
                  disabled={isReviewing}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-40 border-status-success bg-status-success/10 text-status-success hover:bg-status-success/20"
                >
                  {isReviewing ? (
                    <><Loader2 size={14} className="animate-spin" /> Yes</>
                  ) : (
                    <><Check size={14} /> Yes, Approve</>
                  )}
                </button>
              </div>
            </div>
          ) : confirmRevise ? (
            /* ═══ Revise confirmation ═══ */
            <div className="flex flex-col gap-2 pt-3 border-t border-outline-variant mt-auto">
              <div className="flex items-center gap-1.5 text-xs font-medium text-status-warning bg-status-warning/10 rounded-lg px-2.5 py-2">
                <AlertTriangle size={14} />
                Send this revision?
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmRevise(false)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-outline-variant/30 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReviseConfirm}
                  disabled={isReviewing}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-40 border-status-warning bg-status-warning/10 text-status-warning hover:bg-status-warning/20"
                >
                  {isReviewing ? (
                    <><Loader2 size={14} className="animate-spin" /> Yes</>
                  ) : (
                    <><RotateCcw size={14} /> Yes, Revise</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ═══ Normal buttons ═══ */
            <div className="flex flex-col gap-1.5 pt-3 border-t border-outline-variant mt-auto">
              <button
                onClick={() => { setConfirmApprove(true); setRevising(false); setConfirmRevise(false) }}
                disabled={isReviewing}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-40 border-status-success bg-status-success/10 text-status-success hover:bg-status-success/20"
              >
                {isReviewing ? (
                  <><Loader2 size={14} className="animate-spin" /> Approving...</>
                ) : (
                  <><Check size={14} /> Approve</>
                )}
              </button>

              <button
                onClick={() => {
                  if (!revising) {
                    setRevising(true)
                    setConfirmApprove(false)
                    setConfirmRevise(false)
                  } else {
                    setConfirmRevise(true)
                  }
                }}
                disabled={isReviewing || (revising && !comment.trim())}
                className={cn(
                  'w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-40',
                  revising
                    ? 'border-status-warning bg-status-warning/10 text-status-warning hover:bg-status-warning/20'
                    : 'border-outline-variant/30 text-on-surface-variant hover:border-status-warning/50'
                )}
              >
                {isReviewing ? (
                  <><Loader2 size={14} className="animate-spin" /> Sending...</>
                ) : revising ? (
                  <><RotateCcw size={14} /> Send Revision</>
                ) : (
                  <><RotateCcw size={14} /> Revise</>
                )}
              </button>

              <button
                onClick={handleClose}
                className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}
