/*
  ==========================================================
  PAGE: ReviewsPage
  ROUTE: /review
  MỤC ĐÍCH: Dashboard tổng hợp các chapters đang chờ review
  dành cho TANTOU_EDITOR và EDITORIAL_BOARD.
  Nhóm theo series, hiển thị số lượng chapters pending.
  QUYỀN TRUY CẬP:
    - TANTOU_EDITOR: chapters ở trạng thái IN_REVIEW / SUBMITTED
    - EDITORIAL_BOARD: chapters ở trạng thái PENDING_BOARD_APPROVAL
  ==========================================================
*/

import { useNavigate } from 'react-router-dom'
import { MessageSquare, Calendar } from 'lucide-react'
import { useAuthStore } from '../../app/stores/authStore'
import { useSeriesStore } from '../../app/stores/seriesStore'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/card'
import { Button } from '../../shared/components/ui/button'
import { StatusBadge } from '../../shared/components/shared/StatusBadge'
import { EmptyState } from '../../shared/components/shared/EmptyState'

export function ReviewsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const seriesList = useSeriesStore((s) => s.seriesList)
  const chapters = useSeriesStore((s) => s.chapters)

  const isTantou = user?.role === 'TANTOU_EDITOR'
  const isEb = user?.role === 'EDITORIAL_BOARD'

  /*
    Nếu là TANTOU_EDITOR, chỉ xem series được assigned.
    Nếu là EDITORIAL_BOARD, xem tất cả.
  */
  const assignedSeries = seriesList.filter(s =>
    isTantou ? s.tantouEditor?.displayName === user?.displayName : true
  )

  const allChapters = Object.values(chapters).flat()

  /*
    Nhóm chapters pending review theo series.
    Mỗi role filter khác nhau dựa vào trạng thái chapter.
  */
  const pendingBySeries = assignedSeries
    .map(s => {
      const list = allChapters.filter(c =>
        c.seriesId === s.id && (
          isTantou ? (c.status === 'IN_REVIEW' || c.status === 'SUBMITTED') :
          isEb ? c.status === 'PENDING_BOARD_APPROVAL' : false
        )
      )
      return { series: s, chapters: list }
    })
    .filter(g => g.chapters.length > 0)

  const totalPending = pendingBySeries.reduce((sum, g) => sum + g.chapters.length, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Reviews</h1>
        <p className="text-sm text-on-surface-variant/70 mt-1">
          {totalPending > 0
            ? `${totalPending} chapter${totalPending > 1 ? 's' : ''} pending your review`
            : 'No chapters pending review'}
        </p>
      </div>

      {pendingBySeries.length === 0 && (
        <EmptyState
          icon={<MessageSquare size={40} />}
          title="All caught up!"
          description="No chapters are waiting for your review at this time."
        />
      )}

      <div className="space-y-6">
        {pendingBySeries.map(({ series: s, chapters: chs }) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-10 flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: s.coverColor }}>
                  {s.title.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{s.title}</p>
                  <p className="text-xs text-on-surface-variant/60">{s.mangaka.displayName} · {chs.length} pending</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {chs.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 border border-border-light/30 hover:bg-black/[0.02] transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-on-surface truncate">
                        Ch.{c.chapterNumber} — {c.title || `Chapter ${c.chapterNumber}`}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <StatusBadge status={c.status} size="sm" />
                        {c.deadline && (
                          <span className="flex items-center gap-1 text-xs text-on-surface-variant/50">
                            <Calendar size={10} /> {c.deadline}
                          </span>
                        )}
                        <span className="text-xs text-on-surface-variant/50">{c.progressPercent}%</span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/review/${c.id}`)}>
                    <MessageSquare size={14} /> Review
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
