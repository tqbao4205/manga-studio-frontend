import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "../shared/components/shared/ErrorBoundary";
import { useAuthStore } from "./stores/authStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * ─────────────────────────────────────────────
 *  providers.jsx — Component bọc ứng dụng
 * ─────────────────────────────────────────────
 *
 * 🎯 Mục đích:
 *   - Chứa tất cả provider / context wrapper của ứng dụng
 *   - Gọi authStore.initialize() khi app mount để khôi phục session từ token cũ
 *
 * 📦 Các provider hiện tại:
 *   - ErrorBoundary: bắt lỗi render để app không bị crash trắng trang
 *   - AuthInitializer: kiểm tra token trong localStorage khi load app
 */

/**
 * AuthInitializer — Kiểm tra token cũ khi app khởi động.
 *
 * Khi app load:
 *   1. authStore.initializing = true (state khởi tạo)
 *   2. Gọi initialize() → kiểm tra localStorage
 *   3. Có token → gọi GET /api/auth/me → xác thực
 *   4. Không có token hoặc token hết hạn → user = null
 *   5. initializing = false → app render bình thường
 */
function AuthInitializer({ children }) {
  const initialize = useAuthStore((s) => s.initialize);
  const initializing = useAuthStore((s) => s.initializing);

  useEffect(() => {
    initialize();
  }, []); // Chạy 1 lần khi component mount

  // Khi đang kiểm tra token → hiển thị loading (tránh flash trang login)
  if (initializing) {
    return (
      <div className="min-h-screen bg-[#131315] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="animate-spin h-10 w-10 text-[#d0bcff]"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-[#958ea0] text-sm">Đang khởi tạo...</p>
        </div>
      </div>
    );
  }

  return children;
}

export function AppProviders({ children }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer>{children}</AuthInitializer>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
