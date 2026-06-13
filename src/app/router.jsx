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
import { ProfilePage } from "../features/profile/ProfilePage";
import { SchedulePage } from "../features/schedule/SchedulePage";
import { InvitationsPage } from "../features/invitations/InvitationsPage";
import { TantouInvitationsPage } from "../features/invitations/TantouInvitationsPage";
import { NotFoundPage } from "../features/not-found/NotFoundPage";
import { EditorialBoardPage } from "../features/editorial/pages/EditorialBoardPage";
import { VotingPage } from "../features/editorial/pages/VotingPage";
import { VotingResultsPage } from "../features/editorial/pages/VotingResultsPage";
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
          path="/workspace/:chapterId/:pageId?"
          element={
            <ProtectedRoute>
              <RoleGuard
                allowedRoles={["MANGAKA", "ASSISTANT", "TANTOU_EDITOR"]}
              >
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
          {/* Invitations — lời mời vào series cho ASSISTANT */}
          <Route
            path="/invitations"
            element={
              <RoleGuard allowedRoles={["ASSISTANT"]}>
                <InvitationsPage />
              </RoleGuard>
            }
          />

          {/* Tantou Invitations — lời mời tantou editor */}
          <Route
            path="/tantou-invitations"
            element={
              <RoleGuard allowedRoles={["TANTOU_EDITOR"]}>
                <TantouInvitationsPage />
              </RoleGuard>
            }
          />

          {/* ─── Editorial Board Meetings ─── */}
          {/* Danh sách cuộc họp — EDITORIAL_BOARD + CHIEF_EDITOR (Chief tạo + kết thúc) */}
          <Route
            path="/editorial"
            element={
              <RoleGuard allowedRoles={["EDITORIAL_BOARD", "CHIEF_EDITOR"]}>
                <EditorialBoardPage />
              </RoleGuard>
            }
          />
          {/* Trang bỏ phiếu — EDITORIAL_BOARD (chỉ EB mới vote) */}
          <Route
            path="/editorial/:meetingId/vote"
            element={
              <RoleGuard allowedRoles={["EDITORIAL_BOARD"]}>
                <VotingPage />
              </RoleGuard>
            }
          />
          {/* Trang kết quả vote — EDITORIAL_BOARD + CHIEF_EDITOR (Chief mới được Finalize) */}
          <Route
            path="/editorial/:meetingId/results"
            element={
              <RoleGuard allowedRoles={["EDITORIAL_BOARD", "CHIEF_EDITOR"]}>
                <VotingResultsPage />
              </RoleGuard>
            }
          />

          {/* Schedule — lịch xuất bản (chỉ EDITORIAL_BOARD + CHIEF_EDITOR) */}
          <Route
            path="/schedule"
            element={
              <RoleGuard allowedRoles={["EDITORIAL_BOARD", "CHIEF_EDITOR"]}>
                <SchedulePage />
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
