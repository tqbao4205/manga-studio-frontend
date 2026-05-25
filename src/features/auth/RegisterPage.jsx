import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { PenTool, Eye, EyeOff } from "lucide-react";
import { useUIStore } from "../../app/stores/uiStore";
import { Button } from "../../shared/components/ui/button";
import { Input } from "../../shared/components/ui/input";
import { Label } from "../../shared/components/ui/label";
import { APP_NAME, APP_TAGLINE } from "../../shared/constants";

// ── Trang Register ──
// Route: /register (public, không cần xác thực)
// Quyền: tất cả (kể cả chưa đăng nhập)
//
// Form đăng ký tài khoản mới:
// - Email, Username, Password, Confirm Password
// - Validate: email/username/password không trống, password phải khớp
// - Hiện tại chỉ mock (delay 800ms rồi redirect /login)
// - TODO: Khi có backend, gọi API register thật, xoá mock timeout
export function RegisterPage() {
  // ── State form ──
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();

  // ── Xử lý submit ──
  // Validate các trường, mock delay 800ms, hiển thị toast thành công, redirect /login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    if (!password.trim()) {
      setError("Password is required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsLoading(true);
    // TODO: Thay bằng gọi API register thật
    await new Promise((r) => setTimeout(r, 800));
    addToast({
      type: "success",
      title: "Account created",
      message: "You can now sign in.",
    });
    navigate("/login");
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
        </div>
      </div>

      {/* ── Panel phải: Form đăng ký ── */}
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
            Create account
          </h2>
          <p className="text-sm text-on-surface-variant mb-8">
            Join the manga production platform
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
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
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

            {/* ── Input Username ── */}
            <div className="space-y-2">
              <Label htmlFor="reg-username">Username</Label>
              <Input
                id="reg-username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="your-username"
                required
              />
            </div>

            {/* ── Input Password với nút show/hide ── */}
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <div className="relative">
                <Input
                  id="reg-password"
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

            {/* ── Input Confirm Password ── */}
            <div className="space-y-2">
              <Label htmlFor="reg-confirm">Confirm Password</Label>
              <Input
                id="reg-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Confirm your password"
                required
              />
            </div>

            {/* ── Nút Submit ── */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>

            <p className="text-center text-xs text-on-surface-variant">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
