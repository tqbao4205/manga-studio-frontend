import { Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";

/**
 * ProtectedRoute
 * Component bảo vệ route — kiểm tra trạng thái xác thực người dùng.
 *
 * @param {Object} props
 * @param {ReactNode} props.children - Component con cần được bảo vệ
 *
 * State sử dụng:
 *   - isAuthenticated (từ useAuthStore): true nếu user đã đăng nhập
 *
 * Luồng:
 *   isAuthenticated === false → Navigate đến /login (thay thế lịch sử)
 *   isAuthenticated === true  → render children
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/**
 * ── RoleGuard: Bảo vệ route dựa trên vai trò người dùng ──
 *
 * Component này kiểm tra quyền truy cập của user trước khi render children.
 * Nếu chưa đăng nhập → redirect /login.
 * Nếu không có role phù hợp → redirect fallbackPath (mặc định /dashboard).
 *
 * Props:
 *   - children        : Component con cần được bảo vệ
 *   - allowedRoles    : Mảng các role được phép truy cập (ví dụ: ['MANGAKA', 'EDITORIAL_BOARD'])
 *   - fallbackPath    : Đường dẫn chuyển hướng khi không có quyền (mặc định '/dashboard')
 *
 * Quy trình kiểm tra:
 *   1. Lấy thông tin user từ authStore (Zustand)
 *   2. user == null → chưa đăng nhập → redirect /login
 *   3. allowedRoles được chỉ định và role không nằm trong đó → redirect fallbackPath
 *   4. Pass cả 2 → render children
 */
export function RoleGuard({
  children,
  allowedRoles,
  fallbackPath = "/dashboard",
}) {
  const user = useAuthStore((s) => s.user);

  // Chưa đăng nhập → đẩy về trang login
  if (!user) return <Navigate to="/login" replace />;

  // Đã đăng nhập nhưng role không được phép → về trang mặc định
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Hợp lệ → render nội dung
  return <>{children}</>;
}
