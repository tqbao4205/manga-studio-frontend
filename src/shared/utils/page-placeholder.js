/**
 * ── shared/utils/page-placeholder.js ──
 * Tạo ảnh placeholder cho trang manga và layer trong workspace.
 *
 * 🎯 Mục đích:
 *   - Tạo hình ảnh mô phỏng (canvas) cho trang manga khi chưa có ảnh thật
 *   - Tạo hình ảnh mô phỏng cho từng layer (background, character, text)
 *   - Cache kết quả để tránh tính toán lại nhiều lần
 *
 * 🔄 Luồng xử lý:
 *   1. getPagePlaceholder(): vẽ layout panel + scribble nhân vật + bóng thoại + hiệu ứng
 *   2. getLayerPlaceholder(): vẽ layer với màu nền + pattern cross-hatch + đường sketch
 */

// ─── Layouts: bố cục panel (khung tranh) trên trang manga ───

/**
 * layouts — Mảng các bố cục panel mẫu.
 *
 * Mỗi layout là một mảng các panel, mỗi panel là:
 *   { x: tỉ lệ trái, y: tỉ lệ trên, w: tỉ lệ rộng, h: tỉ lệ cao }
 *
 * Các giá trị là tỉ lệ (0-1) so với kích thước trang.
 * Dùng pageId % layouts.length để chọn layout.
 *
 * Các kiểu bố cục:
 *   0. 2 panel: trên-dưới
 *   1. 3 panel: trái hẹp + phải chia 2
 *   2. 3 panel: trên rộng + dưới chia 2
 *   3. 4 panel: 2x2
 *   4. 3 panel: lớn trái + 2 nhỏ phải
 *   5. 2 panel dọc
 */
const layouts = [
  // 2 panels: top 45%, bottom 55%
  [
    { x: 0.02, y: 0.02, w: 0.96, h: 0.43 },
    { x: 0.02, y: 0.47, w: 0.96, h: 0.51 },
  ],
  // 3 panels: left narrow, right split
  [
    { x: 0.02, y: 0.02, w: 0.35, h: 0.96 },
    { x: 0.39, y: 0.02, w: 0.59, h: 0.46 },
    { x: 0.39, y: 0.50, w: 0.59, h: 0.48 },
  ],
  // 3 panels: top wide, bottom split
  [
    { x: 0.02, y: 0.02, w: 0.96, h: 0.38 },
    { x: 0.02, y: 0.42, w: 0.47, h: 0.56 },
    { x: 0.51, y: 0.42, w: 0.47, h: 0.56 },
  ],
  // 4 panels: 2x2
  [
    { x: 0.02, y: 0.02, w: 0.47, h: 0.47 },
    { x: 0.51, y: 0.02, w: 0.47, h: 0.47 },
    { x: 0.02, y: 0.51, w: 0.47, h: 0.47 },
    { x: 0.51, y: 0.51, w: 0.47, h: 0.47 },
  ],
  // Large panel + 2 small right
  [
    { x: 0.02, y: 0.02, w: 0.62, h: 0.96 },
    { x: 0.66, y: 0.02, w: 0.32, h: 0.46 },
    { x: 0.66, y: 0.50, w: 0.32, h: 0.48 },
  ],
  // 2 vertical strips
  [
    { x: 0.02, y: 0.02, w: 0.46, h: 0.96 },
    { x: 0.50, y: 0.02, w: 0.48, h: 0.96 },
  ],
]

// ──────────────────────────────────────────────
//  Hàm vẽ hỗ trợ
// ──────────────────────────────────────────────

/**
 * drawScribble — Vẽ một hình người đơn giản (stick figure) dạng nguệch ngoạc.
 *
 * @param {CanvasRenderingContext2D} ctx    - Context canvas để vẽ
 * @param {number}                   x      - Toạ độ X (góc trên trái)
 * @param {number}                   y      - Toạ độ Y (góc trên trái)
 * @param {number}                   scale  - Tỉ lệ thu nhỏ/phóng to
 *
 * Vẽ: đầu (hình tròn), thân (đường dọc), 2 tay, 2 chân.
 * Dùng để mô phỏng nhân vật trong khung tranh.
 */
function drawScribble(ctx, x, y, scale) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.strokeStyle = '#1c1b1b'
  ctx.lineWidth = 2
  // Đầu
  ctx.beginPath()
  ctx.arc(30, 20, 12, 0, Math.PI * 2)
  ctx.stroke()
  // Thân
  ctx.beginPath()
  ctx.moveTo(30, 32)
  ctx.lineTo(30, 65)
  ctx.stroke()
  // Tay
  ctx.beginPath()
  ctx.moveTo(30, 42)
  ctx.lineTo(12, 55)
  ctx.moveTo(30, 42)
  ctx.lineTo(48, 55)
  ctx.stroke()
  // Chân
  ctx.beginPath()
  ctx.moveTo(30, 65)
  ctx.lineTo(18, 85)
  ctx.moveTo(30, 65)
  ctx.lineTo(42, 85)
  ctx.stroke()
  ctx.restore()
}

/**
 * drawTextLines — Vẽ các đường nguệch ngoạc mô phỏng chữ trong bóng thoại.
 *
 * @param {CanvasRenderingContext2D} ctx   - Context canvas
 * @param {number}                   x     - Toạ độ X
 * @param {number}                   y     - Toạ độ Y
 * @param {number}                   lines - Số dòng chữ
 *
 * Mỗi dòng là một đường zigzag ngẫu nhiên (dùng Math.random và Math.sin)
 * để tạo cảm giác chữ viết tay.
 */
function drawTextLines(ctx, x, y, lines) {
  ctx.strokeStyle = '#1c1b1b'
  ctx.lineWidth = 1.5
  for (let i = 0; i < lines; i++) {
    const lx = x + (i % 2) * 15
    const ly = y + i * 12
    ctx.beginPath()
    for (let j = 0; j < 8; j++) {
      const nx = lx + j * 12 + Math.random() * 4
      const ny = ly + Math.sin(j * 0.8) * 4 + Math.random() * 3
      j === 0 ? ctx.moveTo(nx, ny) : ctx.lineTo(nx, ny)
    }
    ctx.stroke()
  }
}

// ──────────────────────────────────────────────
//  Layer Placeholder (ảnh placeholder cho layer)
// ──────────────────────────────────────────────

/** LAYER_COLORS — Ánh xạ tên layer → màu chủ đạo */
const LAYER_COLORS = {
  Background: '#4a90d9',
  Characters: '#d94a4a',
  'Text & FX': '#4ad94a',
}

/**
 * layerCache — Bộ nhớ đệm cho layer placeholder.
 * Key = `${label}-${opacity}`, tránh tạo lại canvas khi giống nhau.
 */
const layerCache = new Map()

/**
 * getLayerPlaceholder — Tạo ảnh placeholder cho một layer.
 *
 * @param {string} label   - Tên layer (Background, Characters, Text & FX, ...)
 * @param {number} width   - Chiều rộng ảnh
 * @param {number} height  - Chiều cao ảnh
 * @param {number} opacity - Độ trong suốt (0-1)
 * @returns {Image}        - Đối tượng Image với ảnh đã render
 *
 * Giải thích logic:
 *   1. Kiểm tra cache → nếu có thì trả về ngay
 *   2. Tạo canvas với kích thước width x height
 *   3. Xoá nền (trong suốt)
 *   4. Tô màu nền với độ trong suốt dựa trên opacity
 *   5. Vẽ pattern cross-hatch (các đường chéo chồng lên nhau) để mô phỏng nét vẽ
 *   6. Vẽ các đường sketch ngẫu nhiên (dùng hash từ label để tạo độc đáo)
 *   7. Tạo Image từ canvas data URL và lưu vào cache
 */
export function getLayerPlaceholder(
  label,
  width,
  height,
  opacity,
) {
  const key = `${label}-${opacity}`
  const cached = layerCache.get(key)
  if (cached) return cached

  const color = LAYER_COLORS[label] || '#888888'

  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const ctx = c.getContext('2d')

  // Nền trong suốt
  ctx.clearRect(0, 0, width, height)

  // Lớp màu mờ — opacity càng cao, màu càng đậm
  ctx.fillStyle = color + Math.round(opacity * 40).toString(16).padStart(2, '0')
  ctx.fillRect(0, 0, width, height)

  // Pattern cross-hatch — các đường chéo tạo cảm giác nét vẽ manga
  ctx.strokeStyle = color + '30'
  ctx.lineWidth = 2
  const spacing = 30
  for (let i = 0; i < Math.max(width, height); i += spacing) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i - height, height)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + height, height)
    ctx.stroke()
  }

  // Đường sketch ngẫu nhiên — dùng hash từ độ dài label để tạo vị trí khác nhau
  const hash = label.length
  ctx.strokeStyle = color + '50'
  ctx.lineWidth = 1.5
  for (let i = 0; i < 6; i++) {
    const sx = ((i * 137 + hash * 53) % width)
    const sy = ((i * 251 + hash * 89) % height)
    ctx.beginPath()
    for (let j = 0; j < 12; j++) {
      const nx = sx + j * 25 + Math.sin(j * 0.7 + hash) * 10
      const ny = sy + Math.cos(j * 0.5 + hash * 1.3) * 15 + Math.sin(j * 1.1) * 8
      j === 0 ? ctx.moveTo(nx, ny) : ctx.lineTo(nx, ny)
    }
    ctx.stroke()
  }

  const img = new window.Image()
  img.src = c.toDataURL()
  img.width = width
  img.height = height
  layerCache.set(key, img)
  return img
}

// ──────────────────────────────────────────────
//  Page Placeholder (ảnh placeholder cho cả trang)
// ──────────────────────────────────────────────

/**
 * cache — Bộ nhớ đệm cho page placeholder.
 * Key = pageId (số nguyên), tránh render lại canvas.
 */
const cache = new Map()

/**
 * getPagePlaceholder — Tạo ảnh placeholder cho một trang manga hoàn chỉnh.
 *
 * @param {number} pageId - ID của trang (dùng để chọn layout và tạo nội dung)
 * @param {number} width  - Chiều rộng ảnh (px)
 * @param {number} height - Chiều cao ảnh (px)
 * @returns {Image}       - Đối tượng Image với ảnh đã render
 *
 * Giải thích logic phức tạp:
 *   1. Chọn layout dựa trên pageId % layouts.length
 *   2. Với mỗi panel trong layout:
 *      a. Vẽ nền trắng + viền đen (khung panel)
 *      b. Vẽ viền xám bên trong (gutter)
 *      c. Panel đầu tiên → vẽ scribble nhân vật (góc trái)
 *      d. Panel cuối cùng → vẽ scribble nhân vật (góc phải)
 *      e. Panel chẵn → vẽ bóng thoại + chữ nguệch ngoạc
 *      f. Panel thứ 2 → vẽ chữ hiệu ứng SFX (tiếng Nhật: ドガンバッ!)
 *      g. Panel thứ 3 hoặc 4 → vẽ screen tone dots (chấm tone)
 *   3. Cache kết quả bằng pageId
 */
export function getPagePlaceholder(pageId, width, height) {
  const key = pageId
  const cached = cache.get(key)
  if (cached) return cached

  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const ctx = c.getContext('2d')

  // Nền trang — màu giấy cũ (beige nhạt)
  ctx.fillStyle = '#f5f0ee'
  ctx.fillRect(0, 0, width, height)

  const panels = layouts[pageId % layouts.length]
  const s = Math.min(width, height) / 200

  for (let i = 0; i < panels.length; i++) {
    const p = panels[i]
    const px = p.x * width
    const py = p.y * height
    const pw = p.w * width
    const ph = p.h * height

    // Nền panel (trắng)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2)

    // Khung panel (viền đen)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.strokeRect(px, py, pw, ph)

    // Viền xám bên trong (tạo hiệu ứng cách lề)
    ctx.strokeStyle = '#d0d0d0'
    ctx.lineWidth = 0.5
    ctx.strokeRect(px + 4, py + 4, pw - 8, ph - 8)

    // Vẽ nhân vật (stick figure) ở panel đầu và cuối
    if (i === 0) {
      drawScribble(ctx, px + pw * 0.3, py + ph * 0.15, s)
    }
    if (i === panels.length - 1) {
      drawScribble(ctx, px + pw * 0.4, py + ph * 0.2, s)
    }

    // Vẽ bóng thoại ở panel chẵn (i % 2 === 0)
    if (i % 2 === 0) {
      const bx = px + pw * 0.15
      const by = py + ph * 0.05
      const bw = pw * 0.4
      const bh = ph * 0.15
      // Khung bóng thoại
      ctx.strokeStyle = '#1c1b1b'
      ctx.lineWidth = 1.5
      ctx.strokeRect(bx, by, bw, bh)
      // Đuôi bóng thoại (tam giác)
      ctx.beginPath()
      ctx.moveTo(bx + bw * 0.5, by + bh)
      ctx.lineTo(bx + bw * 0.5 - 6, by + bh + 10)
      ctx.lineTo(bx + bw * 0.5 + 6, by + bh + 10)
      ctx.closePath()
      ctx.stroke()
      // Chữ nguệch ngoạc bên trong bóng thoại
      drawTextLines(ctx, bx + 8, by + 10, 3)
    }

    // Vẽ chữ hiệu ứng SFX (âm thanh) ở panel thứ 2
    if (i === 1) {
      const sx = px + pw * 0.6
      const sy = py + ph * 0.1
      ctx.font = `${Math.round(28 * s)}px sans-serif`
      ctx.fillStyle = '#1c1b1b'
      ctx.textBaseline = 'top'
      // Chọn ngẫu nhiên một ký tự tiếng Nhật từ mảng
      const chars = ['ド','ガ','ン','バ','ッ','!']
      const char = chars[(pageId * 7 + i * 3) % chars.length]
      ctx.fillText(char, sx, sy)
    }

    // Vẽ screen tone dots (chấm tone) ở panel thứ 3 hoặc 4
    if (i === 2 || i === 3) {
      const spacing = 4 * s
      for (let dx = px + 10; dx < px + pw - 10; dx += spacing) {
        for (let dy = py + 10; dy < py + ph - 10; dy += spacing) {
          // Offset hàng chẵn/lẻ để tạo pattern so le (giống tone thật)
          const offset = ((dx - px) / spacing % 2) * spacing / 2
          ctx.fillStyle = '#c0c0c0'
          ctx.beginPath()
          ctx.arc(dx, dy + offset, 0.6, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }

  const img = new window.Image()
  img.src = c.toDataURL()
  img.width = width
  img.height = height
  cache.set(key, img)
  return img
}
