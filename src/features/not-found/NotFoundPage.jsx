import { useNavigate } from "react-router-dom";
import { Button } from "../../shared/components/ui/button";

// ── Trang 404 - Not Found ──
// Route: * (fallback, khi không match route nào)
// Quyền: public (không cần xác thực)
// Hiển thị thông báo "Page not found" và nút quay về Dashboard
export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        {/* Khung số 404 */}
        <div className="w-20 h-20 mx-auto mb-6 border border-primary/20 bg-primary/[0.02] flex items-center justify-center">
          <span className="font-display text-3xl text-primary/40">404</span>
        </div>
        <h1 className="text-2xl font-bold text-on-surface mb-2">
          Page not found
        </h1>
        <p className="text-sm text-on-surface-variant/70 mb-6">
          The page you're looking for doesn't exist.
        </p>
        <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </div>
    </div>
  );
}
