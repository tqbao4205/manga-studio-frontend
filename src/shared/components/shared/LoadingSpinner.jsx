/**
 * ── LoadingSpinner (shared/components) ──
 *
 * Props:
 *   - size      : Kích thước spinner ('sm' | 'md' | 'lg'), mặc định 'md'
 *   - className : Class CSS bổ sung
 *
 * Kích thước:
 *   - sm: 16px   (w-4 h-4)
 *   - md: 32px   (w-8 h-8)
 *   - lg: 48px   (w-12 h-12)
 */

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizes[size]} border-2 border-primary/20 border-t-primary animate-spin`} />
    </div>
  )
}

/**
 * ── PageLoading: Spinner toàn trang (dùng cho lazy loading) ──
 *
 * Hiển thị spinner kích thước lg ở giữa trang với chiều cao tối thiểu 60vh.
 * Thường dùng kết hợp với React.lazy và Suspense.
 */

export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" />
    </div>
  )
}
