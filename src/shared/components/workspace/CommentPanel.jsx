import { useState } from 'react'
import { Avatar } from '../ui/avatar'
import { formatRelativeTime, cn } from '../../utils'
import { CheckCircle, Circle, Send, MessageCircle } from 'lucide-react'
import { useWorkspaceStore } from '../../../app/stores/workspaceStore'
import { useAuthStore } from '../../../app/stores/authStore'
import { useUIStore } from '../../../app/stores/uiStore'

/*
 * ===== CommentPanel & CommentItem Components =====
 * Mục đích: Panel hiển thị danh sách comment của trang hiện tại.
 * CommentItem: hiển thị một comment với avatar, nội dung, trạng thái (OPEN/RESOLVED), và nút reply.
 * CommentPanel: danh sách comment top-level và ô nhập comment mới.
 * =================================================
 */

/**
 * Component con: hiển thị một comment item
 * Cho phép toggle trạng thái OPEN/RESOLVED và chọn để xem reply
 */
function CommentItem({ comment }) {
  const updateComment = useWorkspaceStore((s) => s.updateComment)
  const selectComment = useWorkspaceStore((s) => s.selectComment)

  /**
   * Chuyển đổi trạng thái comment giữa RESOLVED và OPEN
   */
  const handleToggle = () => {
    const next = comment.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED'
    updateComment(comment.id, { status: next })
  }

  return (
    <div className="px-3 py-2 border border-workspace-border/20 rounded">
      <div className="flex items-start gap-2">
        {/* Avatar người tạo comment */}
        <Avatar name={comment.editor.displayName} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Tên người dùng + thời gian */}
            <span className="text-xs font-medium text-workspace-text">{comment.editor.displayName}</span>
            <span className="text-[10px] text-workspace-text-secondary">{formatRelativeTime(comment.createdAt)}</span>
            {/* Nút toggle trạng thái resolved/open */}
            <button
              onClick={handleToggle}
              className={cn(
                'ml-auto flex-shrink-0',
                comment.status === 'RESOLVED' ? 'text-status-success' : 'text-workspace-text-secondary/50 hover:text-workspace-text-secondary',
              )}
            >
              {comment.status === 'RESOLVED' ? <CheckCircle size={12} /> : <Circle size={12} />}
            </button>
          </div>
          {/* Nội dung comment */}
          <p className="text-xs text-workspace-text-secondary mt-1 leading-relaxed">{comment.content}</p>
          {/* Nút xem/tạo reply */}
          <div className="flex items-center gap-3 mt-1.5">
            <button
              onClick={() => selectComment(comment.id)}
              className="flex items-center gap-1 text-[10px] text-workspace-text-secondary/60 hover:text-workspace-text transition-colors"
            >
              <MessageCircle size={10} />
              {comment.replyCount ? `${comment.replyCount} repl${comment.replyCount === 1 ? 'y' : 'ies'}` : 'Reply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Component chính: Panel comment bên phải workspace
 * Hiển thị danh sách comment top-level và form nhập comment mới
 */
export function CommentPanel() {
  const currentPageId = useWorkspaceStore((s) => s.currentPageId)
  const comments = useWorkspaceStore((s) => s.comments)
  const addComment = useWorkspaceStore((s) => s.addComment)
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)
  const [text, setText] = useState('')

  // Lọc chỉ lấy comment top-level (không có parentCommentId)
  const topComments = comments.filter(c => !c.parentCommentId)

  // Trạng thái rỗng: chưa chọn trang
  if (!currentPageId) {
    return <div className="py-8 text-center"><p className="text-xs text-workspace-text-secondary">Select a page</p></div>
  }

  /**
   * Gửi comment mới lên store
   */
  const handleSubmit = () => {
    if (!text.trim() || !user) return
    const comment = {
      id: Date.now(),
      pageId: currentPageId,
      content: text.trim(),
      status: 'OPEN',
      editor: { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl || '' },
      createdAt: new Date().toISOString(),
      replyCount: 0,
    }
    addComment(comment)
    addToast({ title: 'Comment added', description: text.trim().slice(0, 60) + (text.trim().length > 60 ? '...' : ''), variant: 'success' })
    setText('')
  }

  /**
   * Xử lý phím Enter để gửi comment (Shift+Enter để xuống dòng)
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col h-full px-2 pt-3">
      {/* Tiêu đề panel */}
      <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-workspace-text-secondary pb-2">
        Comments ({topComments.length})
      </div>

      {/* Danh sách comment với scroll */}
      <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
        {topComments.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-xs text-workspace-text-secondary">No comments yet — select Comment tool on canvas to add pinned comments</p>
          </div>
        )}
        {topComments.map((c) => (
          <CommentItem key={c.id} comment={c} />
        ))}
      </div>

      {/* Form nhập comment mới */}
      <div className="flex items-center gap-2 pt-2 px-1 border-t border-workspace-border/30 mt-2 pb-2">
        <Avatar name={user?.displayName || ''} size="sm" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment..."
          className="flex-1 bg-workspace-bg text-xs text-workspace-text placeholder:text-workspace-text-secondary/40 outline-none border border-workspace-border/30 rounded px-2 py-1.5 focus:border-workspace-accent transition-colors"
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="flex-shrink-0 disabled:opacity-30 p-1.5 bg-workspace-accent rounded text-white hover:bg-workspace-accent/80 transition-colors"
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  )
}
