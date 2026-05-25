/**
 * ── router.jsx ──
 * Component gốc của ứng dụng MangaFlow.
 *
 * 🎯 Mục đích:
 *   - Định nghĩa toàn bộ cấu hình Router (React Router v6+)
 *   - Phân luồng route theo vai trò (role) người dùng
 *   - Quyết định layout nào được dùng (AppShell có sidebar vs fullscreen)
 *
 * 🔄 Luồng xử lý:
 *   1. App() render → BrowserRouter bọc toàn bộ
 *   2. ToastContainer hiển thị thông báo toàn cục
 *   3. Routes phân tích URL → render component tương ứng
 *   4. ProtectedRoute kiểm tra đăng nhập → nếu chưa thì redirect /login
 *   5. RoleGuard kiểm tra vai trò → nếu không đủ quyền thì chặn lại
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "../shared/components/layout/AppShell";
import { ToastContainer } from "../shared/components/ui/toast";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { DashboardPage } from "../features/home/DashboardPage";
import { SeriesListPage } from "../features/series/SeriesListPage";
import { SeriesDetailPage } from "../features/series/SeriesDetailPage";
import { NewSeriesPage } from "../features/series/NewSeriesPage";
import { NewChapterPage } from "../features/series/NewChapterPage";
import { WorkspacePage } from "../features/workspace/WorkspacePage";
import { TasksPage } from "../features/tasks/TasksPage";
import { ChapterDetailPage } from "../features/series/ChapterDetailPage";
import { RankingsPage } from "../features/rankings/RankingsPage";
import { ReviewsPage } from "../features/reviews/ReviewsPage";
import { PublishingPage } from "../features/publishing/PublishingPage";
import { VoteEntryPage } from "../features/publishing/VoteEntryPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { NotFoundPage } from "../features/not-found/NotFoundPage";
import { ProtectedRoute, RoleGuard } from "./guards";

export default function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      {/* ToastContainer: hiển thị thông báo toast toàn cục, đặt ngoài Routes để luôn có sẵn */}
      <ToastContainer />
      <Routes>
        {/* ═══ Public routes (không cần đăng nhập) ═══ */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ═══ Fullscreen routes — không dùng AppShell (không sidebar/padding/max-width) ═══ */}
        {/* Workspace vẽ manga → chỉ dành cho MANGAKA và ASSISTANT */}
        <Route
          path="/workspace/:chapterId"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={["MANGAKA", "ASSISTANT"]}>
                <WorkspacePage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
        {/* Review chapter → dành cho biên tập và tác giả */}
        <Route
          path="/review/:chapterId"
          element={
            <ProtectedRoute>
              <RoleGuard
                allowedRoles={["TANTOU_EDITOR", "EDITORIAL_BOARD", "MANGAKA"]}
              >
                <WorkspacePage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
        {/* Redirect workspace mặc định về chapter 1 */}
        <Route
          path="/workspace"
          element={<Navigate to="/workspace/1" replace />}
        />

        {/* ═══ AppShell routes — có sidebar + topbar ═══ */}
        {/* ProtectedRoute bọc AppShell để tất cả route con đều yêu cầu đăng nhập */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          {/* Dashboard — trang chính sau đăng nhập */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Profile — thông tin cá nhân */}
          <Route path="/profile" element={<ProfilePage />} />

          {/* Series — danh sách bộ truyện */}
          <Route path="/series" element={<SeriesListPage />} />
          {/* Tạo series mới — chỉ MANGAKA */}
          <Route
            path="/series/new"
            element={
              <RoleGuard allowedRoles={["MANGAKA"]}>
                <NewSeriesPage />
              </RoleGuard>
            }
          />
          {/* Tạo chapter mới trong series — chỉ MANGAKA */}
          <Route
            path="/series/:seriesId/chapters/new"
            element={
              <RoleGuard allowedRoles={["MANGAKA"]}>
                <NewChapterPage />
              </RoleGuard>
            }
          />
          {/* Chỉnh sửa series — chỉ MANGAKA, dùng chung component NewSeriesPage */}
          <Route
            path="/series/:seriesId/edit"
            element={
              <RoleGuard allowedRoles={["MANGAKA"]}>
                <NewSeriesPage />
              </RoleGuard>
            }
          />
          {/* Chi tiết series */}
          <Route path="/series/:seriesId" element={<SeriesDetailPage />} />
          {/* Chỉnh sửa chapter — mở cho nhiều role hơn */}
          <Route
            path="/series/:seriesId/chapters/:chapterId/edit"
            element={<NewChapterPage />}
          />
          {/* Chi tiết chapter */}
          <Route
            path="/series/:seriesId/chapters/:chapterId"
            element={<ChapterDetailPage />}
          />

          {/* Tasks — quản lý công việc cho tác giả và trợ lý */}
          <Route
            path="/tasks"
            element={
              <RoleGuard allowedRoles={["MANGAKA", "ASSISTANT"]}>
                <TasksPage />
              </RoleGuard>
            }
          />
          {/* Reviews — phê duyệt chapter cho biên tập viên */}
          <Route
            path="/reviews"
            element={
              <RoleGuard allowedRoles={["TANTOU_EDITOR", "EDITORIAL_BOARD"]}>
                <ReviewsPage />
              </RoleGuard>
            }
          />

          {/* Rankings — bảng xếp hạng tuần (mọi role đều xem được) */}
          <Route path="/rankings" element={<RankingsPage />} />

          {/* Publishing — lịch xuất bản, chỉ EDITORIAL_BOARD */}
          <Route
            path="/publishing"
            element={
              <RoleGuard allowedRoles={["EDITORIAL_BOARD"]}>
                <PublishingPage />
              </RoleGuard>
            }
          />
          {/* Vote Entry — nhập phiếu bầu xếp hạng, chỉ EDITORIAL_BOARD */}
          <Route
            path="/publishing/votes"
            element={
              <RoleGuard allowedRoles={["EDITORIAL_BOARD"]}>
                <VoteEntryPage />
              </RoleGuard>
            }
          />

          {/* Route mặc định: / → redirect đến /dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* ═══ 404 — tất cả route không khớp ═══ */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
