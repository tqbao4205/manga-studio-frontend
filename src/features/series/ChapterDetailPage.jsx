/*
  ==========================================================
  PAGE: ChapterDetailPage
  ROUTE: /series/:seriesId/chapters/:chapterId
  MỤC ĐÍCH: Xem chi tiết một chapter, bao gồm thông tin
  chapter number, pages, deadline, progress, và danh sách pages.
  QUYỀN TRUY CẬP:
    - MANGAKA: Edit chapter, Open Workspace
    - TANTOU_EDITOR / EDITORIAL_BOARD: Open in Review
  ==========================================================
*/

import { useParams, useNavigate, Link } from "react-router-dom";
import {
  useSeriesDetail,
  useChapterDetail,
  usePagesByChapter,
} from "../../shared/hooks/useMockData";
import { useAuthStore } from "../../app/stores/authStore";
import { Button } from "../../shared/components/ui/button";
import { Card, CardContent } from "../../shared/components/ui/card";
import { StatusBadge } from "../../shared/components/shared/StatusBadge";
import { EmptyState } from "../../shared/components/shared/EmptyState";
import { Pagination } from "../../shared/components/shared/Pagination";
import { useState, useMemo } from "react";
import {
  ChevronLeft,
  BookOpen,
  Image,
  Calendar,
  Hash,
  BarChart3,
  Loader,
  ExternalLink,
  MessageSquare,
  Edit,
} from "lucide-react";

export function ChapterDetailPage() {
  const { seriesId, chapterId } = useParams();
  const navigate = useNavigate();
  const [pageNum, setPageNum] = useState(0);
  const perPage = 10;

  const user = useAuthStore((s) => s.user);
  const isMangaka = user?.role === "MANGAKA";
  const isEditor =
    user?.role === "TANTOU_EDITOR" || user?.role === "EDITORIAL_BOARD";

  const { data: series, isLoading: seriesLoading } = useSeriesDetail(
    Number(seriesId),
  );
  const { data: chapter, isLoading: chapterLoading } = useChapterDetail(
    Number(chapterId),
  );
  const { data: pages, isLoading: pagesLoading } = usePagesByChapter(
    Number(chapterId),
  );

  const isLoading = seriesLoading || chapterLoading || pagesLoading;

  const totalPages = Math.max(1, Math.ceil((pages || []).length / perPage));
  const paginatedPages = (pages || []).slice(
    pageNum * perPage,
    (pageNum + 1) * perPage,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <Loader size={24} className="animate-spin text-on-surface-variant/40" />
      </div>
    );
  }

  if (!series || !chapter) {
    return (
      <EmptyState
        icon={<BookOpen size={40} />}
        title="Chapter not found"
        description="The chapter you are looking for does not exist."
        action={
          <Button
            variant="ghost"
            onClick={() => navigate(`/series/${seriesId}`)}
          >
            Back to Series
          </Button>
        }
      />
    );
  }

  const reviewHref = `/review/${chapterId}`;

  return (
    <div className="space-y-6">
      {/* Breadcrumb: Back to series */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/series/${seriesId}`)}
          className="flex items-center gap-1 text-xs text-on-surface-variant/60 hover:text-on-surface transition-colors"
        >
          <ChevronLeft size={14} />
          {series.title}
        </button>
      </div>

      {/* Header: title + status + actions */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Ch.{chapter.chapterNumber}: {chapter.title}
          </h1>
          <p className="text-sm text-on-surface-variant/70 mt-1">
            {series.title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={chapter.status} size="sm" />
          {isMangaka && (
            <>
              <Link to={`/series/${seriesId}/chapters/${chapterId}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit size={14} /> Edit
                </Button>
              </Link>
              <Link to={`/workspace/${chapterId}`}>
                <Button variant="primary" size="sm">
                  <ExternalLink size={14} /> Open Workspace
                </Button>
              </Link>
            </>
          )}
          {isEditor && (
            <Link to={reviewHref}>
              <Button variant="primary" size="sm">
                <MessageSquare size={14} /> Open in Review
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Thông tin nhanh: Chapter number, Page count, Deadline, Progress */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Hash size={16} className="text-on-surface-variant/40" />
            <div>
              <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider">
                Chapter
              </p>
              <p className="text-sm font-medium text-on-surface">
                {chapter.chapterNumber}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Image size={16} className="text-on-surface-variant/40" />
            <div>
              <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider">
                Pages
              </p>
              <p className="text-sm font-medium text-on-surface">
                {chapter.pageCount}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar size={16} className="text-on-surface-variant/40" />
            <div>
              <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider">
                {chapter.deadline
                  ? "Deadline"
                  : chapter.publishedAt
                    ? "Published"
                    : "Created"}
              </p>
              <p className="text-sm font-medium text-on-surface">
                {chapter.deadline || chapter.publishedAt || chapter.createdAt}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <BarChart3 size={16} className="text-on-surface-variant/40" />
            <div>
              <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider">
                Progress
              </p>
              <p className="text-sm font-medium text-on-surface">
                {chapter.progressPercent}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danh sách pages có phân trang */}
      {(pages || []).length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-on-surface mb-3">
            Pages ({pages.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {paginatedPages.map((page) => (
              <Link
                key={page.id}
                to={`/workspace/${chapterId}`}
                className="group block"
              >
                <div className="aspect-[7/10] border border-border-light/40 flex flex-col items-center justify-center bg-black/[0.015] group-hover:border-primary/30 transition-colors">
                  <Image
                    size={24}
                    className="text-on-surface-variant/20 group-hover:text-primary/30 transition-colors"
                  />
                  <span className="text-xs text-on-surface-variant/40 mt-1">
                    Page {page.pageNumber}
                  </span>
                </div>
                <p className="text-[10px] text-on-surface-variant/60 mt-1">
                  {page.width}×{page.height}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-4">
            <Pagination
              page={pageNum}
              totalPages={totalPages}
              onPageChange={setPageNum}
            />
          </div>
        </div>
      )}
    </div>
  );
}
