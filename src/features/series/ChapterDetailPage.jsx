/**
 * ─────────────────────────────────────────────
 *  ChapterDetailPage — Trang chi ti?t chapter
 *  Route: /series/:seriesId/chapters/:chapterId
 * ─────────────────────────────────────────────
 *
 * M?c dích:
 *   - Xem thông tin chi ti?t c?a m?t chapter
 *   - Hi?n th? thông tin nhanh: chapter number, pages, deadline, progress
 *   - Danh sách pages (có phân trang)
 *   - Liên k?t d?n Workspace (v? trang) ho?c Review (duy?t chapter)
 *
 * Lu?ng d? li?u (so v?i b?n cũ dùng mock):
 *   - B?n cũ: dùng useChapterDetail(id) + usePagesByChapter(id) t? useMockData
 *   - B?n m?i: useEffect g?i d?ng th?i 3 API:
 *       - seriesService.getById(seriesId)   -> thông tin series (cho breadcrumb)
 *       - seriesService.getChapterById(id)  -> chi ti?t chapter
 *       - seriesService.getPagesByChapter(id) -> danh sách pages
 *
 * API g?i:
 *   - GET /api/series/{id}
 *   - GET /api/chapters/{id}
 *   - GET /api/v1/chapters/{chapterId}/pages
 *
 * Quy?n truy c?p:
 *   - MANGAKA: Edit chapter, Open Workspace
 *   - TANTOU_EDITOR / EDITORIAL_BOARD: Open in Review
 */

import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuthStore } from "../../app/stores/authStore";
import seriesService from "../../services/seriesService";
import { Button } from "../../shared/components/ui/button";
import { Card, CardContent } from "../../shared/components/ui/card";
import { StatusBadge } from "../../shared/components/shared/StatusBadge";
import { EmptyState } from "../../shared/components/shared/EmptyState";
import { Pagination } from "../../shared/components/shared/Pagination";
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
  // Lay tham so tu URL: /series/:seriesId/chapters/:chapterId
  const { seriesId, chapterId } = useParams();
  const navigate = useNavigate();
  const [pageNum, setPageNum] = useState(0);   // Trang pages hien tai
  const perPage = 10;                            // So pages moi trang

  const user = useAuthStore((s) => s.user);
  const isMangaka = user?.role === "MANGAKA";
  const isEditor =
    user?.role === "TANTOU_EDITOR" || user?.role === "EDITORIAL_BOARD";

  // State local (không dùng store vì dây là trang con, không c?n state toàn c?c)
  const [series, setSeries] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Goi dong thoi 3 API khi component mount
  useEffect(() => {
    if (!seriesId || !chapterId) return;
    setLoading(true);

    // Promise.all de goi ca 3 API cùng lúc (nhanh hon goi tu?n t?)
    Promise.all([
      seriesService.getById(Number(seriesId)),           // Lay thông tin series
      seriesService.getChapterById(Number(chapterId)),  // Lay chi ti?t chapter
      seriesService.getPagesByChapter(Number(chapterId)), // Lay danh sách pages
    ])
      .then(([seriesData, chapterData, pagesData]) => {
        setSeries(seriesData);
        setChapter(chapterData);
        // Pages tu API là array (List<PageResponse>)
        setPages(Array.isArray(pagesData) ? pagesData : []);
      })
      .catch(() => {})  // L?i s? du?c EmptyState xu? lý
      .finally(() => setLoading(false));
  }, [seriesId, chapterId]);

  // Trang thái dang load
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <Loader size={24} className="animate-spin text-on-surface-variant/40" />
      </div>
    );
  }

  // Không tìm th?y series ho?c chapter
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

  // Tính toán phân trang
  const totalPages = Math.max(1, Math.ceil(pages.length / perPage));
  const paginatedPages = pages.slice(pageNum * perPage, (pageNum + 1) * perPage);
  const reviewHref = `/review/${chapterId}`;

  // Format ngày tháng t? ISO string (VD: "2026-05-30T10:00:00" -> "5/30/2026")
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb: Nut back ve trang chi ti?t series */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/series/${seriesId}`)}
          className="flex items-center gap-1 text-xs text-on-surface-variant/60 hover:text-on-surface transition-colors"
        >
          <ChevronLeft size={14} />
          {series.title}
        </button>
      </div>

      {/* Header: tên chapter + status + action buttons */}
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
          {/* Badge tr?ng thái chapter (backend ChapterStatus enum) */}
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

      {/* 4 card thông tin nhanh: Chapter number, Pages, Deadline, Progress */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Hash size={16} className="text-on-surface-variant/40" />
            <div>
              <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider">Chapter</p>
              <p className="text-sm font-medium text-on-surface">{chapter.chapterNumber}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Image size={16} className="text-on-surface-variant/40" />
            <div>
              <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider">Pages</p>
              <p className="text-sm font-medium text-on-surface">{chapter.pageCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar size={16} className="text-on-surface-variant/40" />
            <div>
              <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider">
                {chapter.deadline ? "Deadline" : chapter.publishDate ? "Published" : "Created"}
              </p>
              {/*
                deadline/publishDate/createdAt là LocalDateTime t? backend
                C?n format d? hi?n th? ngày bình th??ng (không ph?i ISO string)
              */}
              <p className="text-sm font-medium text-on-surface">
                {formatDate(chapter.deadline) || formatDate(chapter.publishDate) || formatDate(chapter.createdAt)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <BarChart3 size={16} className="text-on-surface-variant/40" />
            <div>
              <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider">Progress</p>
              <p className="text-sm font-medium text-on-surface">{chapter.progressPercent}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danh sách pages (ch? hi?n n?u có pages) */}
      {pages.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-on-surface mb-3">Pages ({pages.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {paginatedPages.map((page) => (
              <Link
                key={page.id}
                to={`/workspace/${chapterId}`}
                className="group block"
              >
                <div className="aspect-[7/10] border border-border-light/40 flex flex-col items-center justify-center bg-black/[0.015] group-hover:border-primary/30 transition-colors">
                  <Image size={24} className="text-on-surface-variant/20 group-hover:text-primary/30 transition-colors" />
                  <span className="text-xs text-on-surface-variant/40 mt-1">Page {page.pageNumber}</span>
                </div>
                <p className="text-[10px] text-on-surface-variant/60 mt-1">{page.width}×{page.height}</p>
              </Link>
            ))}
          </div>
          {/* Phân trang cho pages */}
          <div className="mt-4">
            <Pagination page={pageNum} totalPages={totalPages} onPageChange={setPageNum} />
          </div>
        </div>
      )}
    </div>
  );
}
