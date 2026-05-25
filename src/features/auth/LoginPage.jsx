import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { PenTool, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../../app/stores/authStore";
import { Button } from "../../shared/components/ui/button";
import { Input } from "../../shared/components/ui/input";
import { Label } from "../../shared/components/ui/label";
import { APP_NAME, APP_TAGLINE } from "../../shared/constants";

// ── Trang Login ──
// Route: /login (public, không cần xác thực)
// Quyền: tất cả (kể cả chưa đăng nhập)
//
// Quy trình đăng nhập hiện tại:
// 1. User nhập email + password → click Sign In
// 2. Gọi handleSubmit() → validate form → gọi authStore.login()
// 3. authStore.login() tìm user trong mockUsers theo email
// 4. Nếu thành công → set isAuthenticated = true → navigate /dashboard
// 5. ProtectedRoute trong app/router.jsx kiểm tra isAuthenticated → cho phép vào
//
// TODO: Khi chuyển sang backend thật:
// - Xoá giá trị mock trong useState email/password (cho về '')
// - Xoá các nút quickLogin (chỉ dùng cho dev)
// - Gọi authService.login() thay vì authStore.login() mock
// - Backend trả về AuthResponse gồm accessToken + user
// - Lưu accessToken vào localStorage để duy trì phiên
// - Thêm kiểm tra token hết hạn, redirect về /login nếu hết hạn
export function LoginPage() {
  // ── State form ──
  // TODO: Khi có backend, đặt giá trị mặc định là ''
  const [email, setEmail] = useState("ichikawa@manga.com");
  const [password, setPassword] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  // ── Xử lý submit form login ──
  // Bước 1: Validate email/password không được để trống
  // Bước 2: Gọi authStore.login() (hiện là mock, sau này gọi API thật)
  // Bước 3: Nếu thành công → chuyển đến /dashboard
  // Bước 4: Nếu thất bại → hiển thị lỗi
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!password.trim()) {
      setError("Password is required");
      return;
    }
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      setError("Invalid credentials. Please try again.");
    }
  };

  // ── Quick Login (chỉ dùng cho phát triển / demo) ──
  // Cho phép đăng nhập nhanh với 4 vai trò khác nhau:
  // - Ichikawa (Mangaka)
  // - Sato (Tantou Editor)
  // - Tanaka (Assistant)
  // - Kimura (Editorial Board)
  // TODO: Xoá nút này khi chuyển sang production với backend thật
  const quickLogin = (email) => {
    setEmail(email);
    setPassword("password");
    login(email, "password").then(() => navigate("/dashboard"));
  };

  return (
    <div className="min-h-screen bg-[#fdf8f8] flex">
      {/* ── Panel trái: Branding / Hero ── */}
      {/* Hiển thị logo, tên app và mô tả. Ẩn trên mobile. */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center bg-primary">
        <div className="relative z-10 text-center px-12">
          <div className="w-20 h-20 mx-auto mb-6 bg-white flex items-center justify-center">
            <PenTool size={36} className="text-primary" />
          </div>
          <h1 className="font-display text-display-lg text-white mb-3">
            {APP_NAME}
          </h1>
          <p className="text-xl text-white/80">{APP_TAGLINE}</p>
          <p className="text-sm text-white/60 mt-4 max-w-md mx-auto leading-relaxed">
            Professional manga production workflow management platform.
            Collaborate with your team from concept to publication.
          </p>
        </div>
      </div>

      {/* ── Panel phải: Form đăng nhập ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo + tên app (chỉ hiển thị trên mobile) */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-primary flex items-center justify-center">
              <PenTool size={20} className="text-white" />
            </div>
            <span className="font-display text-xl text-on-surface">
              {APP_NAME}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-on-surface mb-1">
            Welcome back
          </h2>
          <p className="text-sm text-on-surface-variant mb-8">
            Sign in to your account to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ── Hiển thị lỗi ── */}
            {error && (
              <div className="p-3 border border-status-danger bg-status-danger/5 text-sm text-status-danger">
                {error}
              </div>
            )}

            {/* ── Input Email ── */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="you@example.com"
                required
              />
            </div>

            {/* ── Input Password với nút show/hide ── */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* ── Nút Submit ── */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            {/* ── Quick Login (demo dev) ── */}
            {/* TODO: Xoá section này khi deploy production với backend thật */}
            <div className="pt-2">
              <p className="text-center text-xs text-on-surface-variant mb-2">
                Quick login as:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => quickLogin("ichikawa@manga.com")}
                  className="text-xs px-2 py-1 border border-primary text-on-surface-variant hover:text-on-surface hover:bg-black/[0.02]"
                >
                  Ichikawa (Mangaka)
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin("sato@editor.com")}
                  className="text-xs px-2 py-1 border border-primary text-on-surface-variant hover:text-on-surface hover:bg-black/[0.02]"
                >
                  Sato (Editor)
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin("tanaka@manga.com")}
                  className="text-xs px-2 py-1 border border-primary text-on-surface-variant hover:text-on-surface hover:bg-black/[0.02]"
                >
                  Tanaka (Assistant)
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin("kimura@board.com")}
                  className="text-xs px-2 py-1 border border-primary text-on-surface-variant hover:text-on-surface hover:bg-black/[0.02]"
                >
                  Kimura (Board)
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-on-surface-variant pt-4">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
