import { useState, useRef } from 'react'
import { Avatar } from '../ui/avatar'
import { formatRelativeTime, cn } from '../../utils'
import { CheckCircle, Circle, Send, MessageCircle, Trash2 } from 'lucide-react'
import { useWorkspaceStore } from '../../../app/stores/workspaceStore'
import { useAuthStore } from '../../../app/stores/authStore'
import { useUIStore } from '../../../app/stores/uiStore'

function CommentItem({ comment, onReply }) {
  const updateComment = useWorkspaceStore((s) => s.updateComment)
  const deleteComment = useWorkspaceStore((s) => s.deleteComment)
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)

  const handleToggle = () => {
    const isResolved = comment.status === 'RESOLVED'
    const next = isResolved ? 'ACTIVE' : 'RESOLVED'
    updateComment(comment.id, { status: next })
  }

  const handleDelete = async () => {
    await deleteComment(comment.id)
    addToast({ title: 'Comment deleted', variant: 'info' })
  }

  const isAuthor = comment.authorId === user?.id
  const displayName = comment.authorName || 'Unknown'
  const avatarUrl = comment.authorAvatar || ''
  const isResolved = comment.status === 'RESOLVED'

  return (
    <div className="px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-xl group">
      <div className="flex items-start gap-3">
        <Avatar name={displayName} src={avatarUrl || undefined} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-on-surface truncate">{displayName}</span>
            <span className="text-xs text-on-surface-variant/60 flex-shrink-0">{formatRelativeTime(comment.createdAt)}</span>
            <button
              onClick={handleToggle}
              className={cn(
                'ml-auto flex-shrink-0 transition-colors',
                isResolved ? 'text-status-success' : 'text-on-surface-variant/40 hover:text-on-surface-variant',
              )}
            >
              {isResolved ? <CheckCircle size={16} /> : <Circle size={16} />}
            </button>
            {isAuthor && (
              <button
                onClick={handleDelete}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-on-surface-variant/40 hover:text-red-400 transition-all"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">{comment.content}</p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => onReply?.(comment.id)}
              className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant/60 hover:text-primary transition-colors"
            >
              <MessageCircle size={14} />
              {comment.replyCount ? `${comment.replyCount} repl${comment.replyCount === 1 ? 'y' : 'ies'}` : 'Reply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CommentPanel() {
  const currentPageId = useWorkspaceStore((s) => s.currentPageId)
  const comments = useWorkspaceStore((s) => s.comments)
  const selectedCommentId = useWorkspaceStore((s) => s.selectedCommentId)
  const selectComment = useWorkspaceStore((s) => s.selectComment)
  const addComment = useWorkspaceStore((s) => s.addComment)
  const replyComment = useWorkspaceStore((s) => s.replyComment)
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)
  const [text, setText] = useState('')
  const inputRef = useRef(null)

  const selected = selectedCommentId ? comments.find(c => c.id === selectedCommentId) : null
  const replies = selectedCommentId ? comments.filter(c => c.parentId === selectedCommentId) : []
  const topComments = selectedCommentId ? [] : comments.filter(c => !c.parentId)

  if (!currentPageId) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-on-surface-variant/60">Select a page</p>
      </div>
    )
  }

  const handleSubmit = async () => {
    if (!text.trim() || !user) return

    if (selectedCommentId) {
      const parent = comments.find(c => c.id === selectedCommentId)
      if (parent) {
        await replyComment(selectedCommentId, text.trim())
        addToast({ title: 'Reply added', variant: 'success' })
      }
    } else {
      const created = await addComment({ content: text.trim(), posX: 0, posY: 0 })
      if (created) {
        addToast({
          title: 'Comment added',
          description: text.trim().slice(0, 80) + (text.trim().length > 80 ? '...' : ''),
          variant: 'success',
        })
      }
    }
    setText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col h-full px-3 pt-4">
      <div className="px-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70 pb-3">
        {selected ? 'Comment' : `Comments (${topComments.length})`}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto min-h-0 px-0.5">
        {selected ? (
          <>
            <CommentItem comment={selected} onReply={() => inputRef.current?.focus()} />
            {replies.map(r => (
              <div key={r.id} className="ml-6">
                <CommentItem comment={r} onReply={() => inputRef.current?.focus()} />
              </div>
            ))}
            <button
              onClick={() => selectComment(null)}
              className="text-xs text-on-surface-variant/50 hover:text-primary transition-colors ml-1"
            >
              &larr; Back to all comments
            </button>
          </>
        ) : topComments.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-on-surface-variant/60">No comments yet</p>
            <p className="text-xs text-on-surface-variant/40 mt-1">Select the Comment tool on canvas to add pinned comments</p>
          </div>
        ) : (
          topComments.map((c) => (
            <CommentItem key={c.id} comment={c} onReply={(id) => selectComment(id)} />
          ))
        )}
      </div>

      <div className="flex items-center gap-3 pt-3 px-1 border-t border-outline-variant/20 mt-3 pb-3">
        <Avatar name={user?.displayName || ''} size="sm" />
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selected ? 'Write a reply...' : 'Add a comment...'}
          className="flex-1 bg-surface-container-high text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none border border-outline-variant/20 rounded-xl px-3 py-2 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="flex-shrink-0 disabled:opacity-30 p-2.5 bg-primary rounded-xl text-on-primary hover:brightness-110 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
