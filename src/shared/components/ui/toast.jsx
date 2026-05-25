import {
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
} from "lucide-react";
import { useUIStore } from "../../../app/stores/uiStore";
import { cn } from "../../utils";

/*
 * ── ToastContainer ────────────────────────────────────────────────────
 *  Component hiển thị danh sách toast notification (thông báo popup)
 *  ở góc dưới bên phải màn hình.
 *  Lấy dữ liệu từ useUIStore (Zustand store) và tự động loại bỏ toast
 *  khi người dùng nhấn nút X.
 * ─────────────────────────────────────────────────────────────────────
 *
 *  4 loại toast (variant):
 *    - success : Icon CheckCircle2, màu xanh lá (status-success).
 *    - error   : Icon AlertCircle, màu đỏ (status-danger).
 *    - info    : Icon Info, màu xanh dương (accent-blue).
 *    - warning : Icon AlertTriangle, màu vàng/cam (status-warning).
 *
 *  Props (từ store):
 *    - toasts : Array<{
 *        id: string | number,
 *        variant: 'success' | 'error' | 'info' | 'warning',
 *        title: string,
 *        description?: string
 *      }>
 *    - removeToast : (id) => void — Hàm xoá toast khỏi store.
 *
 *  Logic conditional rendering:
 *    - Nếu toasts.length === 0 → return null (không render gì).
 *    - Fixed bottom-right, z-[9999] để luôn ở trên cùng.
 *    - Mỗi toast có:
 *      - Icon trái (tuỳ variant).
 *      - Title (bold) + Description (nhỏ, tuỳ chọn) ở giữa.
 *      - Nút X bên phải để đóng toast.
 *    - Màu viền (border) và text (text) được xác định bằng colors[variant].
 *    - Style nền: bg-[#fdf8f8], border, shadow (ink shadow) + hiệu ứng
 *      animate-in slide-in-from-right (nếu có cấu hình animation).
 *
 *  Không sử dụng React.forwardRef vì đây là component thuần (function),
 *  không cần nhận ref từ cha.
 */

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: "border-status-success text-status-success",
  error: "border-status-danger text-status-danger",
  info: "border-accent-blue text-accent-blue",
  warning: "border-status-warning text-status-warning",
};

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        /*
         * Lấy icon tương ứng với variant, mặc định là 'info'
         * nếu variant undefined/null.
         */
        const Icon = icons[t.variant || "info"];
        return (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 px-4 py-3 bg-[#fdf8f8] border border-primary/20",
              "shadow-[2px_2px_0px_#000] animate-in slide-in-from-right",
              /*
               * colors[t.variant || 'info'] gán border-color + text-color
               * tương ứng với loại toast (success = xanh, error = đỏ...).
               */
              colors[t.variant || "info"],
            )}
          >
            {/*
             * Icon trái: kích thước 16px, flex-shrink-0 để không bị co.
             * Màu icon được kế thừa từ colors (text-status-* / text-accent-*).
             */}
            <Icon size={16} className="mt-0.5 flex-shrink-0" />

            {/*
             * Nội dung chính: title (bold, 12px) + description (11px, tuỳ chọn).
             * flex-1 min-w-0 để text wrap đúng khi dài.
             */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-on-surface">{t.title}</p>
              {t.description && (
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  {t.description}
                </p>
              )}
            </div>

            {/*
             * Nút X đóng toast: gọi removeToast(t.id).
             * Màu mờ (opacity-50) khi hover → đậm hơn.
             */}
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 mt-0.5 text-on-surface-variant/50 hover:text-on-surface"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
