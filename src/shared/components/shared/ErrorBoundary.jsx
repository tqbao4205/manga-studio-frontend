import { Component } from 'react'

/**
 * ── ErrorBoundary (shared/components): Component bắt lỗi React (class component) ──
 *
 * Bao bọc các component con để bắt JavaScript error trong quá trình render.
 * Khi có lỗi, hiển thị UI thân thiện thay vì để màn hình trắng.
 *
 * Props:
 *   - children: Component con được bảo vệ
 *
 * State:
 *   - hasError: true nếu có lỗi xảy ra
 *   - error   : Đối tượng lỗi (chứa message)
 *
 * Các trạng thái:
 *   - Bình thường → render children
 *   - Có lỗi      → hiển thị màn hình lỗi với nút Reload Page
 */

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  // Được React gọi khi có lỗi trong quá trình render
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    // Trạng thái có lỗi: hiển thị UI thông báo lỗi
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            {/* Icon cảnh báo */}
            <div className="w-16 h-16 mx-auto mb-4 bg-status-danger/10 flex items-center justify-center">
              <span className="text-2xl text-status-danger">!</span>
            </div>
            <h1 className="text-xl font-bold text-on-surface mb-2">Something went wrong</h1>
            {/* Hiển thị message lỗi nếu có */}
            <p className="text-sm text-on-surface-variant mb-6">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            {/* Nút reload lại trang */}
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white text-sm hover:bg-primary/90 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    // Không có lỗi → render children bình thường
    return this.props.children
  }
}
