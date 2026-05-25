/**
 * ── mock-data.js ──
 * Dữ liệu giả lập (mock data) cho giai đoạn phát triển frontend.
 *
 * 🎯 Mục đích:
 *   - Cung cấp dữ liệu mẫu để các component và trang có thể hoạt động
 *     mà không cần backend thật
 *   - Mô phỏng cấu trúc dữ liệu thật (users, series, chapters, pages, regions,
 *     tasks, layers, comments, notifications, rankings, schedules, dashboard stats)
 *
 * 🔄 Luồng sử dụng:
 *   - Các useMockData hooks (src/shared/hooks/useMockData.js) gọi các mảng này
 *     kèm delay(ms) để mô phỏng API call
 *   - Khi backend hoàn thiện, thay thế bằng service layer gọi API thật
 *
 * ⚠️ TODO (khi chuyển sang backend thật):
 *   1. Xoá toàn bộ mock data hoặc giữ lại để test
 *   2. Tạo service layer gọi API: src/services/
 *   3. Backend xác thực qua database, không dùng danh sách cứng
 *   4. API endpoints dự kiến:
 *      POST /api/v1/auth/login  → AuthResponse { accessToken, refreshToken, user }
 *      POST /api/v1/auth/register → AuthResponse
 *      POST /api/v1/auth/refresh  → { accessToken }
 */

// ──────────────────────────────────────────────
//  Hàm nội bộ: tạo ảnh placeholder dạng SVG
// ──────────────────────────────────────────────

/**
 * pagePlaceholder — Tạo ảnh SVG placeholder cho một trang manga.
 *
 * @param {number} pageNum - Số thứ tự trang
 * @returns {string}       - Data URI của ảnh SVG
 *
 * Giải thích:
 *   - Tạo SVG với nền màu nhạt (luân phiên theo pageNum)
 *   - Có khung viền và chữ "Page N" ở giữa
 *   - Dùng để đặt vào originalImageUrl / webImageUrl trong mock pages
 */
function pagePlaceholder(pageNum) {
  const colors = ['#e8f4f8', '#f8e8e8', '#f0f8e8', '#f8f0e8', '#e8e8f8']
  const bg = colors[pageNum % colors.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="600" viewBox="0 0 420 600">
    <rect width="420" height="600" fill="${bg}"/>
    <rect x="20" y="20" width="380" height="560" fill="none" stroke="#ccc" stroke-width="2"/>
    <text x="210" y="290" text-anchor="middle" font-family="sans-serif" font-size="48" fill="#bbb" font-weight="bold">Page ${pageNum}</text>
    <text x="210" y="330" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#ccc">Manga Page</text>
  </svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

// ──────────────────────────────────────────────
//  Users — Người dùng
// ──────────────────────────────────────────────

/**
 * mockUsers — Danh sách người dùng giả lập.
 *
 * Mỗi user đại diện cho một vai trò:
 *   - Ichikawa (MANGAKA) — tác giả chính
 *   - Tanaka, Suzuki, Yamamoto (ASSISTANT) — trợ lý
 *   - Sato, Taniguchi (TANTOU_EDITOR) — biên tập viên
 *   - Kimura, Nishida (EDITORIAL_BOARD) — ban biên tập
 *   - Fujimoto, Ito (MANGAKA) — tác giả phụ
 *
 * @type {Array<{id: number, email: string, username: string, displayName: string, role: string, avatarUrl: string}>}
 */
export const mockUsers = [
  { id: 1, email: 'ichikawa@manga.com', username: 'ichikawa', displayName: 'Ichikawa', role: 'MANGAKA', avatarUrl: '' },
  { id: 2, email: 'tanaka@manga.com', username: 'tanaka', displayName: 'Tanaka', role: 'ASSISTANT', avatarUrl: '' },
  { id: 3, email: 'suzuki@manga.com', username: 'suzuki', displayName: 'Suzuki', role: 'ASSISTANT', avatarUrl: '' },
  { id: 4, email: 'yamamoto@manga.com', username: 'yamamoto', displayName: 'Yamamoto', role: 'ASSISTANT', avatarUrl: '' },
  { id: 5, email: 'sato@editor.com', username: 'sato_editor', displayName: 'Sato', role: 'TANTOU_EDITOR', avatarUrl: '' },
  { id: 6, email: 'taniguchi@editor.com', username: 'taniguchi', displayName: 'Taniguchi', role: 'TANTOU_EDITOR', avatarUrl: '' },
  { id: 7, email: 'kimura@board.com', username: 'kimura', displayName: 'Kimura', role: 'EDITORIAL_BOARD', avatarUrl: '' },
  { id: 8, email: 'nishida@board.com', username: 'nishida', displayName: 'Nishida', role: 'EDITORIAL_BOARD', avatarUrl: '' },
  { id: 9, email: 'fujimoto@manga.com', username: 'fujimoto', displayName: 'Fujimoto', role: 'MANGAKA', avatarUrl: '' },
  { id: 10, email: 'ito@manga.com', username: 'ito', displayName: 'Ito', role: 'MANGAKA', avatarUrl: '' },
]

// ──────────────────────────────────────────────
//  Series — Bộ truyện
// ──────────────────────────────────────────────

/**
 * mockSeries — Danh sách bộ truyện giả lập.
 *
 * @type {Array<{
 *   id: number, title: string, titleJp: string, synopsis: string,
 *   genre: string, targetDemographic: string, status: string,
 *   coverColor: string, mangaka: {id, displayName},
 *   tantouEditor: {id, displayName}, chapterCount: number,
 *   currentRank: number, currentTier: string, createdAt: string
 * }>}
 *
 * Giải thích các trường:
 *   - title / titleJp     → tên tiếng Anh / tên tiếng Nhật
 *   - synopsis            → tóm tắt nội dung
 *   - genre               → thể loại (ACTION, FANTASY, ROMANCE, COMEDY)
 *   - targetDemographic   → đối tượng (SHONEN, SHOJO, SEINEN)
 *   - status              → ONGOING (đang ra), HIATUS (tạm ngưng), DRAFT (bản nháp)
 *   - coverColor          → màu nền bìa truyện
 *   - mangaka             → tác giả chính
 *   - tantouEditor        → biên tập viên phụ trách
 *   - chapterCount        → số chapter đã có
 *   - currentRank / currentTier → thứ hạng hiện tại (undefined nếu chưa xếp hạng)
 */
export const mockSeries = [
  {
    id: 1, title: 'Blade of the Demon Moon', titleJp: '魔月の刃',
    synopsis: 'In an era where demons roam the land, a young swordsman named Kenji embarks on a journey to master the legendary Moon Blade and defeat the Demon King who slaughtered his clan.',
    genre: 'ACTION', targetDemographic: 'SHONEN', status: 'ONGOING',
    coverColor: '#e63946', mangaka: { id: 1, displayName: 'Ichikawa' },
    tantouEditor: { id: 5, displayName: 'Sato' },
    chapterCount: 24, currentRank: 3, currentTier: 'A',
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 2, title: 'Shadow Monarch', titleJp: '影の君主',
    synopsis: 'A college student discovers he can command shadows. As he rises through the ranks of hunters, he uncovers a conspiracy that threatens the balance between worlds.',
    genre: 'FANTASY', targetDemographic: 'SHONEN', status: 'ONGOING',
    coverColor: '#7c4dff', mangaka: { id: 1, displayName: 'Ichikawa' },
    tantouEditor: { id: 5, displayName: 'Sato' },
    chapterCount: 52, currentRank: 1, currentTier: 'S',
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 3, title: 'Cherry Blossoms After Winter', titleJp: '冬の桜',
    synopsis: 'Two childhood friends navigate the complexities of love and ambition as they pursue their dreams in Tokyo\'s competitive art scene.',
    genre: 'ROMANCE', targetDemographic: 'SHOJO', status: 'HIATUS',
    coverColor: '#f472b6', mangaka: { id: 9, displayName: 'Fujimoto' },
    tantouEditor: { id: 6, displayName: 'Taniguchi' },
    chapterCount: 12, currentRank: 18, currentTier: 'C',
    createdAt: '2025-03-10T10:00:00Z',
  },
  {
    id: 4, title: 'Iron Chef Reborn', titleJp: '鉄の料理人',
    synopsis: 'A former Michelin-star chef loses everything and must fight his way back to the top through underground cooking battles.',
    genre: 'COMEDY', targetDemographic: 'SEINEN', status: 'ONGOING',
    coverColor: '#f4a261', mangaka: { id: 10, displayName: 'Ito' },
    tantouEditor: { id: 6, displayName: 'Taniguchi' },
    chapterCount: 8, currentRank: 7, currentTier: 'B',
    createdAt: '2025-06-01T10:00:00Z',
  },
  {
    id: 5, title: 'Neon Reaper', titleJp: 'ネオン死神',
    synopsis: 'In a cyberpunk Tokyo, a bounty hunter with a mysterious past takes on the most dangerous contracts while searching for her lost sister.',
    genre: 'ACTION', targetDemographic: 'SEINEN', status: 'ONGOING',
    coverColor: '#4fc3f7', mangaka: { id: 9, displayName: 'Fujimoto' },
    tantouEditor: { id: 5, displayName: 'Sato' },
    chapterCount: 18, currentRank: 5, currentTier: 'A',
    createdAt: '2025-02-15T10:00:00Z',
  },
  {
    id: 6, title: 'The Last Summoner', titleJp: '最後の召喚士',
    synopsis: 'The last surviving summoner must rebuild the ancient order while evading those who seek to eliminate all magic from the world.',
    genre: 'FANTASY', targetDemographic: 'SHONEN', status: 'DRAFT',
    coverColor: '#2a9d8f', mangaka: { id: 10, displayName: 'Ito' },
    chapterCount: 0, currentRank: undefined, currentTier: undefined,
    createdAt: '2026-05-10T10:00:00Z',
  },
  {
    id: 7, title: 'Echoes of Eternity', titleJp: '永遠のこだま',
    synopsis: 'A time-traveling historian discovers that history is not what it seems. Each era holds a secret that could unravel the fabric of reality itself.',
    genre: 'FANTASY', targetDemographic: 'SEINEN', status: 'DRAFT',
    coverColor: '#264653', mangaka: { id: 1, displayName: 'Ichikawa' },
    chapterCount: 0, currentRank: undefined, currentTier: undefined,
    createdAt: '2026-05-18T10:00:00Z',
  },
]

// ──────────────────────────────────────────────
//  Chapters — Các chapter (chương) của series
// ──────────────────────────────────────────────

/**
 * mockChapters — Chapter được phân nhóm theo seriesId.
 *
 * @type {Object<number, Array<{
 *   id: number, seriesId: number, chapterNumber: number, title: string,
 *   pageCount: number, status: string, deadline: string,
 *   progressPercent: number, createdAt: string
 * }>>}
 *
 * Key là seriesId, value là mảng các chapter thuộc series đó.
 *
 * Các trạng thái chapter:
 *   PUBLISHED            → đã xuất bản
 *   APPROVED             → đã phê duyệt
 *   PENDING_BOARD_APPROVAL → chờ ban biên tập duyệt
 *   IN_REVIEW            → đang được review
 *   IN_PROGRESS          → đang thực hiện
 *   PLANNED              → đã lên kế hoạch
 */
export const mockChapters = {
  1: [
    { id: 1, seriesId: 1, chapterNumber: 23, title: 'Crimson Resolve', pageCount: 20, status: 'IN_REVIEW', deadline: '2026-05-25', progressPercent: 85, createdAt: '2026-04-01' },
    { id: 2, seriesId: 1, chapterNumber: 24, title: 'Moonlight Pursuit', pageCount: 22, status: 'IN_PROGRESS', deadline: '2026-06-10', progressPercent: 45, createdAt: '2026-04-20' },
    { id: 3, seriesId: 1, chapterNumber: 25, title: 'The Final Confrontation', pageCount: 24, status: 'PLANNED', deadline: '2026-06-30', progressPercent: 0, createdAt: '2026-05-01' },
  ],
  2: [
    { id: 4, seriesId: 2, chapterNumber: 51, title: 'Shadow Army', pageCount: 20, status: 'PUBLISHED', publishedAt: '2026-05-15', progressPercent: 100, createdAt: '2026-03-01' },
    { id: 5, seriesId: 2, chapterNumber: 52, title: 'The Awakening', pageCount: 20, status: 'APPROVED', progressPercent: 100, createdAt: '2026-04-01' },
    { id: 6, seriesId: 2, chapterNumber: 53, title: 'New World Order', pageCount: 22, status: 'IN_PROGRESS', deadline: '2026-06-05', progressPercent: 30, createdAt: '2026-05-01' },
  ],
  4: [
    { id: 7, seriesId: 4, chapterNumber: 7, title: 'The Ultimate Ingredient', pageCount: 18, status: 'PENDING_BOARD_APPROVAL', deadline: '2026-05-28', progressPercent: 90, createdAt: '2026-04-15' },
    { id: 8, seriesId: 4, chapterNumber: 8, title: 'Judge\'s Verdict', pageCount: 20, status: 'IN_PROGRESS', deadline: '2026-06-15', progressPercent: 25, createdAt: '2026-05-05' },
  ],
}

// ──────────────────────────────────────────────
//  Pages — Các trang trong chapter
// ──────────────────────────────────────────────

/**
 * mockPages — Danh sách trang (pages) phân nhóm theo chapterId.
 *
 * @type {Object<number, Array<{
 *   id: number, chapterId: number, pageNumber: number,
 *   originalImageUrl: string, webImageUrl: string,
 *   width: number, height: number, status: string,
 *   regionCount: number, createdAt: string
 * }>>}
 *
 * Mỗi trang có:
 *   - originalImageUrl → ảnh gốc (dùng SVG placeholder)
 *   - webImageUrl      → ảnh web (giảm dung lượng)
 *   - status           → trạng thái sản xuất trên trang
 *   - regionCount      → số vùng (region) trên trang
 */
export const mockPages = {
  1: Array.from({ length: 20 }, (_, i) => ({
    id: 100 + i, chapterId: 1, pageNumber: i + 1,
    originalImageUrl: pagePlaceholder(i + 1), webImageUrl: pagePlaceholder(i + 1),
    width: 4200, height: 6000, status: i < 17 ? 'IN_PRODUCTION' : 'COMPLETED',
    regionCount: Math.floor(Math.random() * 5) + 1, createdAt: '2026-04-10',
  })),
  2: Array.from({ length: 22 }, (_, i) => ({
    id: 200 + i, chapterId: 2, pageNumber: i + 1,
    originalImageUrl: pagePlaceholder(i + 1), webImageUrl: pagePlaceholder(i + 1),
    width: 4200, height: 6000, status: i < 10 ? 'UPLOADED' : (i < 18 ? 'REGIONS_DEFINED' : 'IN_PRODUCTION'),
    regionCount: i < 10 ? 0 : Math.floor(Math.random() * 3) + 1, createdAt: '2026-04-25',
  })),
  6: Array.from({ length: 20 }, (_, i) => ({
    id: 600 + i, chapterId: 6, pageNumber: i + 1,
    originalImageUrl: pagePlaceholder(i + 1), webImageUrl: pagePlaceholder(i + 1),
    width: 4200, height: 6000, status: 'IN_PRODUCTION',
    regionCount: Math.floor(Math.random() * 3) + 1, createdAt: '2026-05-10',
  })),
  7: Array.from({ length: 16 }, (_, i) => ({
    id: 700 + i, chapterId: 7, pageNumber: i + 1,
    originalImageUrl: pagePlaceholder(i + 1), webImageUrl: pagePlaceholder(i + 1),
    width: 4200, height: 6000, status: 'COMPLETED',
    regionCount: Math.floor(Math.random() * 4) + 1, createdAt: '2026-04-20',
  })),
  8: Array.from({ length: 18 }, (_, i) => ({
    id: 800 + i, chapterId: 8, pageNumber: i + 1,
    originalImageUrl: pagePlaceholder(i + 1), webImageUrl: pagePlaceholder(i + 1),
    width: 4200, height: 6000, status: i < 12 ? 'IN_PRODUCTION' : 'REGIONS_DEFINED',
    regionCount: i < 12 ? Math.floor(Math.random() * 3) + 1 : 0, createdAt: '2026-05-10',
  })),
}

// ──────────────────────────────────────────────
//  Regions — Vùng trên trang (background, character, text, effect...)
// ──────────────────────────────────────────────

/**
 * mockRegions — Định nghĩa các vùng (region) trên mỗi trang.
 *
 * @type {Object<number, Array<{
 *   id: number, pageId: number, regionType: string, label: string,
 *   x: number, y: number, width: number, height: number, color: string,
 *   status: string, sortOrder: number, task: Object, createdAt: string
 * }>>}
 *
 * Một region đại diện cho một phần tử trên trang:
 *   - regionType → loại vùng (BACKGROUND, CHARACTER, TEXT, EFFECT)
 *   - x, y, width, height → toạ độ và kích thước vùng (pixel)
 *   - sortOrder → thứ tự render (lớp nào trước, lớp nào sau)
 *   - task → công việc được gán cho trợ lý (nếu có)
 *
 * Trạng thái region: PENDING → IN_PROGRESS → SUBMITTED → APPROVED/COMPLETED
 */
export const mockRegions = {
  100: [
    { id: 500, pageId: 100, regionType: 'BACKGROUND', label: 'Castle background', x: 0, y: 0, width: 4200, height: 3000, color: '#4ECDC4', status: 'APPROVED', sortOrder: 1, task: { id: 600, assistantName: 'Tanaka', status: 'APPROVED', deadline: '2026-05-10' }, createdAt: '2026-04-12' },
    { id: 501, pageId: 100, regionType: 'CHARACTER', label: 'Protagonist', x: 500, y: 800, width: 800, height: 1200, color: '#FF6B6B', status: 'APPROVED', sortOrder: 2, task: { id: 601, assistantName: 'Suzuki', status: 'APPROVED', deadline: '2026-05-12' }, createdAt: '2026-04-12' },
    { id: 502, pageId: 100, regionType: 'TEXT', label: 'Speech bubble top', x: 100, y: 100, width: 600, height: 200, color: '#FFE66D', status: 'IN_PROGRESS', sortOrder: 3, task: { id: 602, assistantName: 'Yamamoto', status: 'IN_PROGRESS', deadline: '2026-05-20' }, createdAt: '2026-04-12' },
    { id: 503, pageId: 100, regionType: 'EFFECT', label: 'Speed lines', x: 1800, y: 2500, width: 1200, height: 800, color: '#A78BFA', status: 'PENDING', sortOrder: 4, createdAt: '2026-04-12' },
  ],
  101: [
    { id: 510, pageId: 101, regionType: 'BACKGROUND', label: 'Forest background', x: 0, y: 0, width: 4200, height: 6000, color: '#4ECDC4', status: 'COMPLETED', sortOrder: 1, task: { id: 610, assistantName: 'Tanaka', status: 'SUBMITTED', deadline: '2026-05-15' }, createdAt: '2026-04-13' },
  ],
  200: [
    { id: 700, pageId: 200, regionType: 'BACKGROUND', label: 'Moonlit lake', x: 0, y: 0, width: 4200, height: 3000, color: '#4ECDC4', status: 'IN_PROGRESS', sortOrder: 1, task: { id: 700, assistantName: 'Tanaka', status: 'IN_PROGRESS', deadline: '2026-05-30' }, createdAt: '2026-04-28' },
    { id: 701, pageId: 200, regionType: 'CHARACTER', label: 'Protagonist running', x: 500, y: 1500, width: 800, height: 1200, color: '#FF6B6B', status: 'PENDING', sortOrder: 2, createdAt: '2026-04-28' },
  ],
  600: [
    { id: 800, pageId: 600, regionType: 'BACKGROUND', label: 'Shadow throne room', x: 0, y: 0, width: 4200, height: 6000, color: '#7c4dff', status: 'IN_PROGRESS', sortOrder: 1, task: { id: 800, assistantName: 'Tanaka', status: 'IN_PROGRESS', deadline: '2026-06-10' }, createdAt: '2026-05-12' },
    { id: 801, pageId: 600, regionType: 'CHARACTER', label: 'Shadow Monarch', x: 500, y: 1000, width: 1000, height: 1500, color: '#FF6B6B', status: 'PENDING', sortOrder: 2, createdAt: '2026-05-12' },
  ],
  700: [
    { id: 900, pageId: 700, regionType: 'BACKGROUND', label: 'Kitchen arena', x: 0, y: 0, width: 4200, height: 6000, color: '#f4a261', status: 'APPROVED', sortOrder: 1, task: { id: 900, assistantName: 'Suzuki', status: 'APPROVED', deadline: '2026-05-25' }, createdAt: '2026-04-22' },
    { id: 901, pageId: 700, regionType: 'CHARACTER', label: 'Chef protagonist', x: 600, y: 800, width: 700, height: 1400, color: '#FF6B6B', status: 'COMPLETED', sortOrder: 2, task: { id: 901, assistantName: 'Yamamoto', status: 'APPROVED', deadline: '2026-05-22' }, createdAt: '2026-04-22' },
  ],
  800: [
    { id: 1000, pageId: 800, regionType: 'BACKGROUND', label: 'Judge table', x: 0, y: 0, width: 4200, height: 3000, color: '#f4a261', status: 'PENDING', sortOrder: 1, createdAt: '2026-05-12' },
    { id: 1001, pageId: 800, regionType: 'CHARACTER', label: 'Head judge', x: 300, y: 1200, width: 600, height: 1000, color: '#FF6B6B', status: 'PENDING', sortOrder: 2, createdAt: '2026-05-12' },
  ],
}

// ──────────────────────────────────────────────
//  Tasks — Công việc gán cho trợ lý
// ──────────────────────────────────────────────

/**
 * mockTasks — Danh sách công việc (task) được gán cho trợ lý.
 *
 * @type {Array<{
 *   id: number, regionId: number, title: string, regionType: string,
 *   assistant: {id, displayName, avatarUrl}, assignedBy: {id, displayName},
 *   status: string, priority: string, deadline: string,
 *   description: string, notes: string, referenceImage: string,
 *   attachments: Array, pageImageUrl: string,
 *   latestSubmission: Object, createdAt: string
 * }>}
 *
 * Luồng xử lý task:
 *   1. MANGAKA tạo region → gán task cho ASSISTANT
 *   2. ASSISTANT nhận → làm → SUBMIT
 *   3. MANGAKA review → APPROVED hoặc REVISION_REQUIRED
 *
 * latestSubmission (tuỳ chọn): thông tin lần nộp gần nhất
 */
export const mockTasks = [
  {
    id: 600, regionId: 500,
    title: 'Castle Background — Page 1',
    regionType: 'BACKGROUND',
    assistant: { id: 2, displayName: 'Tanaka', avatarUrl: '' },
    assignedBy: { id: 1, displayName: 'Ichikawa' },
    status: 'APPROVED',
    priority: 'HIGH',
    deadline: '2026-05-10',
    description: 'Draw the castle background for Page 1 — include towers, moat, and mountain backdrop. Use warm sunset lighting.',
    notes: 'Keep the castle style consistent with Chapter 20. Refer to design doc page 4 for color palette.',
    referenceImage: '',
    attachments: [],
    pageImageUrl: pagePlaceholder(1),
    createdAt: '2026-04-12',
  },
  {
    id: 601, regionId: 501,
    title: 'Protagonist Inking — Page 1',
    regionType: 'CHARACTER',
    assistant: { id: 3, displayName: 'Suzuki', avatarUrl: '' },
    assignedBy: { id: 1, displayName: 'Ichikawa' },
    status: 'APPROVED',
    priority: 'HIGH',
    deadline: '2026-05-12',
    description: 'Ink the main protagonist character on Page 1 — action pose with sword drawn, dynamic angle.',
    notes: 'Focus on face expression — determined look. Check reference sheet for armor details.',
    referenceImage: '',
    attachments: [],
    pageImageUrl: pagePlaceholder(1),
    createdAt: '2026-04-12',
  },
  {
    id: 602, regionId: 502,
    title: 'Speech Bubble — Top Panel',
    regionType: 'TEXT',
    assistant: { id: 4, displayName: 'Yamamoto', avatarUrl: '' },
    assignedBy: { id: 1, displayName: 'Ichikawa' },
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    deadline: '2026-05-20',
    description: 'Add speech bubbles and text for dialogue in the top panel — protagonist inner monologue about the demon moon.',
    notes: 'Use standard shonen bubble style. Japanese text with English translation underneath.',
    referenceImage: '',
    attachments: [],
    createdAt: '2026-04-12',
  },
  {
    id: 610, regionId: 510,
    title: 'Forest Background — Page 2',
    regionType: 'BACKGROUND',
    assistant: { id: 2, displayName: 'Tanaka', avatarUrl: '' },
    assignedBy: { id: 1, displayName: 'Ichikawa' },
    status: 'SUBMITTED',
    priority: 'URGENT',
    deadline: '2026-05-15',
    description: 'Paint the forest background with trees and sunlight filtering through leaves. Misty morning atmosphere.',
    notes: 'Add depth with 3 layers: background trees (blur), mid trees (detail), foreground leaves (sharp).',
    referenceImage: '',
    attachments: [],
    pageImageUrl: pagePlaceholder(2),
    latestSubmission: { id: 700, fileUrl: '', version: 1, status: 'SUBMITTED', createdAt: '2026-05-14' },
    createdAt: '2026-04-13',
  },
  {
    id: 700, regionId: 700,
    title: 'Moonlit Lake — Page 1 Ch.24',
    regionType: 'BACKGROUND',
    assistant: { id: 2, displayName: 'Tanaka', avatarUrl: '' },
    assignedBy: { id: 1, displayName: 'Ichikawa' },
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    deadline: '2026-05-30',
    description: 'Draw the moonlit lake background with reflection and misty mountains in the distance.',
    notes: 'Use cool blue tones. The moon should be 3/4 full and reflected on the water surface.',
    referenceImage: '',
    attachments: [],
    pageImageUrl: pagePlaceholder(1),
    createdAt: '2026-04-28',
  },
  // ── Series 2: Shadow Monarch (Ichikawa) ──
  {
    id: 800, regionId: 800,
    title: 'Shadow Throne Room — Page 1 Ch.53',
    regionType: 'BACKGROUND',
    assistant: { id: 2, displayName: 'Tanaka', avatarUrl: '' },
    assignedBy: { id: 1, displayName: 'Ichikawa' },
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    deadline: '2026-06-10',
    description: 'Draw the shadow throne room with dark pillars and a throne made of shadows. Purple/black color scheme.',
    notes: 'Refer to chapter 50 for throne design. Add floating shadow particles.',
    referenceImage: '',
    attachments: [],
    pageImageUrl: pagePlaceholder(1),
    createdAt: '2026-05-12',
  },
  {
    id: 801, regionId: 801,
    title: 'Shadow Monarch Character — Page 1 Ch.53',
    regionType: 'CHARACTER',
    assistant: { id: 4, displayName: 'Yamamoto', avatarUrl: '' },
    assignedBy: { id: 1, displayName: 'Ichikawa' },
    status: 'PENDING',
    priority: 'MEDIUM',
    deadline: '2026-06-15',
    description: 'Draw the Shadow Monarch standing in front of his throne. Full armor with flowing cape.',
    notes: 'Use reference sheet for armor details. Crown should have 7 spikes.',
    referenceImage: '',
    attachments: [],
    pageImageUrl: pagePlaceholder(1),
    createdAt: '2026-05-12',
  },
  // ── Series 4: Iron Chef Reborn (Ito) — Chapter 7 ──
  {
    id: 900, regionId: 900,
    title: 'Kitchen Arena — Page 1 Ch.7',
    regionType: 'BACKGROUND',
    assistant: { id: 3, displayName: 'Suzuki', avatarUrl: '' },
    assignedBy: { id: 10, displayName: 'Ito' },
    status: 'APPROVED',
    priority: 'HIGH',
    deadline: '2026-05-25',
    description: 'Draw the kitchen arena with cooking stations, audience seating, and dramatic overhead lighting.',
    notes: 'Use warm orange/yellow tones. Add steam and spark effects for drama.',
    referenceImage: '',
    attachments: [],
    pageImageUrl: pagePlaceholder(1),
    latestSubmission: { id: 901, fileUrl: '', version: 2, status: 'APPROVED', createdAt: '2026-05-23' },
    createdAt: '2026-04-22',
  },
  {
    id: 901, regionId: 901,
    title: 'Chef Protagonist — Page 1 Ch.7',
    regionType: 'CHARACTER',
    assistant: { id: 4, displayName: 'Yamamoto', avatarUrl: '' },
    assignedBy: { id: 10, displayName: 'Ito' },
    status: 'APPROVED',
    priority: 'MEDIUM',
    deadline: '2026-05-22',
    description: 'Draw the chef protagonist in action pose, holding a knife with dramatic flair. White chef coat, red headband.',
    notes: 'Emphasize the determined expression. Add motion lines around the knife.',
    referenceImage: '',
    attachments: [],
    pageImageUrl: pagePlaceholder(1),
    latestSubmission: { id: 902, fileUrl: '', version: 1, status: 'APPROVED', createdAt: '2026-05-20' },
    createdAt: '2026-04-22',
  },
  // ── Series 4: Iron Chef Reborn (Ito) — Chapter 8 ──
  {
    id: 1000, regionId: 1000,
    title: 'Judge Table — Page 1 Ch.8',
    regionType: 'BACKGROUND',
    assistant: { id: 2, displayName: 'Tanaka', avatarUrl: '' },
    assignedBy: { id: 10, displayName: 'Ito' },
    status: 'PENDING',
    priority: 'LOW',
    deadline: '2026-06-20',
    description: 'Draw the judges table with three judges sitting behind it. Elegant setting with white tablecloth.',
    notes: 'Each judge should have a distinct appearance. Refer to character sheet.',
    referenceImage: '',
    attachments: [],
    pageImageUrl: pagePlaceholder(1),
    createdAt: '2026-05-12',
  },
  {
    id: 1001, regionId: 1001,
    title: 'Head Judge — Page 1 Ch.8',
    regionType: 'CHARACTER',
    assistant: { id: 3, displayName: 'Suzuki', avatarUrl: '' },
    assignedBy: { id: 10, displayName: 'Ito' },
    status: 'PENDING',
    priority: 'MEDIUM',
    deadline: '2026-06-22',
    description: 'Draw the head judge with a stern expression, holding a tasting spoon. Grey suit, glasses.',
    notes: 'Make him look authoritative. Grey hair, trimmed beard.',
    referenceImage: '',
    attachments: [],
    pageImageUrl: pagePlaceholder(1),
    createdAt: '2026-05-12',
  },
]

// ──────────────────────────────────────────────
//  Layers — Các lớp (layer) trong trang
// ──────────────────────────────────────────────

/**
 * mockLayers — Danh sách layer của từng trang (dùng trong workspace).
 *
 * @type {Object<number, Array<{
 *   id: number, pageId: number, label: string, fileUrl: string,
 *   thumbnailUrl: string, sortOrder: number, opacity: number,
 *   visible: boolean, blendMode: string, locked: boolean,
 *   createdBy: {id, displayName}, createdAt: string
 * }>>}
 *
 * Layer tương tự như layer trong Photoshop:
 *   - sortOrder → thứ tự hiển thị (0 = nền, lớn hơn = trên)
 *   - opacity   → độ trong suốt (0-1)
 *   - blendMode → chế độ hoà trộn (normal, multiply, screen,...)
 *   - locked    → khoá không cho chỉnh sửa
 */
export const mockLayers = {
  100: [
    { id: 1000, pageId: 100, label: 'Base Page', fileUrl: '', thumbnailUrl: '', sortOrder: 0, opacity: 1, visible: true, blendMode: 'normal', locked: false, createdBy: { id: 1, displayName: 'Ichikawa' }, createdAt: '2026-04-10' },
    { id: 1001, pageId: 100, label: 'Background - Tanaka', fileUrl: '', thumbnailUrl: '', sortOrder: 1, opacity: 1, visible: true, blendMode: 'normal', locked: false, createdBy: { id: 2, displayName: 'Tanaka' }, createdAt: '2026-05-11' },
    { id: 1002, pageId: 100, label: 'Character - Suzuki', fileUrl: '', thumbnailUrl: '', sortOrder: 2, opacity: 0.85, visible: true, blendMode: 'multiply', locked: false, createdBy: { id: 3, displayName: 'Suzuki' }, createdAt: '2026-05-13' },
  ],
  200: [
    { id: 2000, pageId: 200, label: 'Base Page', fileUrl: '', thumbnailUrl: '', sortOrder: 0, opacity: 1, visible: true, blendMode: 'normal', locked: false, createdBy: { id: 1, displayName: 'Ichikawa' }, createdAt: '2026-04-25' },
    { id: 2001, pageId: 200, label: 'Pencils', fileUrl: '', thumbnailUrl: '', sortOrder: 1, opacity: 0.7, visible: true, blendMode: 'multiply', locked: false, createdBy: { id: 1, displayName: 'Ichikawa' }, createdAt: '2026-04-28' },
  ],
}

// ──────────────────────────────────────────────
//  Comments — Bình luận / phản hồi trên trang
// ──────────────────────────────────────────────

/**
 * mockComments — Bình luận của biên tập viên trên từng trang.
 *
 * @type {Object<number, Array<{
 *   id: number, pageId: number, regionId: number,
 *   editor: {id, displayName, avatarUrl}, content: string,
 *   positionX: number, positionY: number, status: string,
 *   replyCount: number, createdAt: string
 * }>>}
 *
 *   - positionX, positionY → toạ độ comment trên trang (pixel)
 *   - status → OPEN (đang mở), RESOLVED (đã giải quyết)
 *   - replyCount → số phản hồi cho comment này
 */
export const mockComments = {
  100: [
    { id: 2000, pageId: 100, regionId: 500, editor: { id: 5, displayName: 'Sato', avatarUrl: '' }, content: 'The castle perspective is slightly off. Please adjust the right tower.', positionX: 2500, positionY: 500, status: 'RESOLVED', replyCount: 2, createdAt: '2026-04-15' },
    { id: 2001, pageId: 100, regionId: 501, editor: { id: 5, displayName: 'Sato', avatarUrl: '' }, content: 'Great expression work! Just make the eyes slightly larger for more impact.', positionX: 800, positionY: 1200, status: 'OPEN', replyCount: 0, createdAt: '2026-04-16' },
  ],
  200: [
    { id: 3000, pageId: 200, editor: { id: 5, displayName: 'Sato', avatarUrl: '' }, content: 'The moonlight reflection on the water needs more contrast.', positionX: 1500, positionY: 800, status: 'OPEN', replyCount: 1, createdAt: '2026-05-01' },
    { id: 3001, pageId: 200, editor: { id: 5, displayName: 'Sato', avatarUrl: '' }, content: 'Great dynamic pose on the protagonist!', positionX: 2000, positionY: 2500, status: 'OPEN', replyCount: 0, createdAt: '2026-05-02' },
  ],
}

// ──────────────────────────────────────────────
//  Notifications — Thông báo
// ──────────────────────────────────────────────

/**
 * mockNotifications — Thông báo cho từng người dùng.
 *
 * @type {Array<{
 *   id: number, userId: number, type: string, title: string,
 *   message: string, referenceType: string, referenceId: number,
 *   isRead: boolean, createdAt: string
 * }>}
 *
 *   - type → loại thông báo (TASK_SUBMITTED, CHAPTER_SUBMITTED, RANKING_CHANGED, TASK_APPROVED)
 *   - referenceType → loại đối tượng liên quan (TASK, CHAPTER, SERIES)
 *   - referenceId   → ID của đối tượng liên quan
 *   - isRead → true nếu đã đọc
 */
export const mockNotifications = [
  { id: 1, userId: 1, type: 'TASK_SUBMITTED', title: 'New submission from Tanaka', message: 'Tanaka has submitted work for Background on Page 1.', referenceType: 'TASK', referenceId: 610, isRead: false, createdAt: '2026-05-14T10:30:00Z' },
  { id: 2, userId: 1, type: 'CHAPTER_SUBMITTED', title: 'Chapter 23 is in review', message: 'Chapter 23 "Crimson Resolve" has been submitted for editorial review.', referenceType: 'CHAPTER', referenceId: 1, isRead: false, createdAt: '2026-05-13T09:00:00Z' },
  { id: 3, userId: 1, type: 'RANKING_CHANGED', title: 'Blade of the Demon Moon has risen to #3', message: 'Your series has moved from #5 to #3 this period!', referenceType: 'SERIES', referenceId: 1, isRead: true, createdAt: '2026-05-12T15:00:00Z' },
  { id: 4, userId: 5, type: 'CHAPTER_SUBMITTED', title: 'Chapter 23 ready for review', message: 'Ichikawa has submitted Ch.23 "Crimson Resolve" for editorial review.', referenceType: 'CHAPTER', referenceId: 1, isRead: false, createdAt: '2026-05-13T09:01:00Z' },
  { id: 5, userId: 2, type: 'TASK_APPROVED', title: 'Your work was approved!', message: 'Ichikawa has approved your Background work on Page 1.', referenceType: 'TASK', referenceId: 600, isRead: true, createdAt: '2026-05-11T14:00:00Z' },
]

// ──────────────────────────────────────────────
//  Activities — Lịch sử hoạt động
// ──────────────────────────────────────────────

/**
 * mockActivities — Danh sách hoạt động gần đây (activity feed).
 *
 * @type {Array<{
 *   id: number, type: string, message: string,
 *   userId: number, userName: string, createdAt: string
 * }>}
 *
 * Dùng cho feed "Hoạt động gần đây" trên Dashboard.
 */
export const mockActivities = [
  { id: 1, type: 'TASK_APPROVED', message: 'Approved Background work by Tanaka on Page 1', userId: 1, userName: 'Ichikawa', createdAt: '2026-05-14T11:00:00Z' },
  { id: 2, type: 'SUBMISSION_RECEIVED', message: 'Received submission from Tanaka for Background region', userId: 1, userName: 'Ichikawa', createdAt: '2026-05-14T10:30:00Z' },
  { id: 3, type: 'CHAPTER_SUBMITTED', message: 'Submitted Ch.23 for editorial review', userId: 1, userName: 'Ichikawa', createdAt: '2026-05-13T09:00:00Z' },
  { id: 4, type: 'COMMENT_RESOLVED', message: 'Resolved comment on Castle perspective', userId: 5, userName: 'Sato', createdAt: '2026-05-12T16:30:00Z' },
  { id: 5, type: 'RANKING_CHANGED', message: 'Shadow Monarch ranked #1 this period!', userId: 1, userName: 'Ichikawa', createdAt: '2026-05-12T15:00:00Z' },
  { id: 6, type: 'TASK_COMPLETED', message: 'Completed Character inking for Suzuki', userId: 3, userName: 'Suzuki', createdAt: '2026-05-11T17:00:00Z' },
]

// ──────────────────────────────────────────────
//  Rankings — Xếp hạng
// ──────────────────────────────────────────────

/**
 * mockRankings — Bảng xếp hạng tuần của các series.
 *
 * @type {Array<{
 *   id: number, seriesId: number, seriesTitle: string,
 *   periodLabel: string, rank: number, tier: string,
 *   totalVotes: number, previousRank: number, trend: string,
 *   calculatedAt: string
 * }>}
 *
 *   - periodLabel → nhãn tuần (vd: "2026-W20" - ISO 8601 week)
 *   - rank        → thứ hạng hiện tại
 *   - tier        → hạng S/A/B/C/D
 *   - trend       → xu hướng: UP (tăng), DOWN (giảm), NEW (mới)
 *   - previousRank → thứ hạng kỳ trước
 */
export const mockRankings = [
  { id: 1, seriesId: 2, seriesTitle: 'Shadow Monarch', periodLabel: '2026-W20', rank: 1, tier: 'S', totalVotes: 15230, previousRank: 2, trend: 'UP', calculatedAt: '2026-05-18' },
  { id: 2, seriesId: 5, seriesTitle: 'Neon Reaper', periodLabel: '2026-W20', rank: 2, tier: 'S', totalVotes: 12450, previousRank: 3, trend: 'UP', calculatedAt: '2026-05-18' },
  { id: 3, seriesId: 1, seriesTitle: 'Blade of the Demon Moon', periodLabel: '2026-W20', rank: 3, tier: 'A', totalVotes: 10200, previousRank: 5, trend: 'UP', calculatedAt: '2026-05-18' },
  { id: 4, seriesId: 4, seriesTitle: 'Iron Chef Reborn', periodLabel: '2026-W20', rank: 7, tier: 'B', totalVotes: 6800, previousRank: 6, trend: 'DOWN', calculatedAt: '2026-05-18' },
  { id: 5, seriesId: 3, seriesTitle: 'Cherry Blossoms After Winter', periodLabel: '2026-W20', rank: 18, tier: 'C', totalVotes: 1200, previousRank: 15, trend: 'DOWN', calculatedAt: '2026-05-18' },
  { id: 6, seriesId: 6, seriesTitle: 'The Last Summoner', periodLabel: '2026-W20', rank: 25, tier: 'D', totalVotes: 450, previousRank: undefined, trend: 'NEW', calculatedAt: '2026-05-18' },
]

// ──────────────────────────────────────────────
//  Schedules — Lịch xuất bản
// ──────────────────────────────────────────────

/**
 * mockSchedules — Lịch xuất bản các chapter.
 *
 * @type {Array<{
 *   id: number, seriesId: number, seriesTitle: string,
 *   chapterId: number, chapterNumber: number,
 *   scheduledDate: string, periodLabel: string,
 *   status: string, createdAt: string
 * }>}
 *
 *   - scheduledDate → ngày dự kiến xuất bản
 *   - status        → PUBLISHED (đã xuất bản), IN_PRESS (đang in), SCHEDULED (đã lên lịch)
 */
export const mockSchedules = [
  { id: 1, seriesId: 2, seriesTitle: 'Shadow Monarch', chapterId: 4, chapterNumber: 51, scheduledDate: '2026-05-15', periodLabel: '2026-W20', status: 'PUBLISHED', createdAt: '2026-04-20' },
  { id: 2, seriesId: 2, seriesTitle: 'Shadow Monarch', chapterId: 5, chapterNumber: 52, scheduledDate: '2026-05-22', periodLabel: '2026-W21', status: 'IN_PRESS', createdAt: '2026-04-27' },
  { id: 3, seriesId: 1, seriesTitle: 'Blade of the Demon Moon', chapterId: 1, chapterNumber: 23, scheduledDate: '2026-05-29', periodLabel: '2026-W22', status: 'SCHEDULED', createdAt: '2026-05-01' },
  { id: 4, seriesId: 5, seriesTitle: 'Neon Reaper', chapterId: undefined, chapterNumber: 19, scheduledDate: '2026-06-05', periodLabel: '2026-W23', status: 'SCHEDULED', createdAt: '2026-05-10' },
]

// ──────────────────────────────────────────────
//  Dashboard Stats — Thống kê dashboard
// ──────────────────────────────────────────────

/**
 * mockDashboardStats — Thống kê dashboard theo từng userId.
 *
 * @type {Object<number, Object>}
 *
 * Mỗi role có cấu trúc stats khác nhau:
 *   - MANGAKA: activeSeries, ongoingChapters, pendingTasks, submissionsToReview, upcomingDeadlines, currentRank, rankTrend
 *   - TANTOU_EDITOR: assignedSeries, chaptersInReview, pendingComments
 *   - EDITORIAL_BOARD: totalSeries, pendingApprovals, upcomingSchedules, atRiskSeries, lastPeriodVotes
 *
 * Note: Kimura (id=7) và Nishida (id=8) có cùng dữ liệu vì cùng role EDITORIAL_BOARD.
 */
export const mockDashboardStats = {
  // MANGAKA (Ichikawa) — thống kê cho tác giả
  1: {
    activeSeries: 2,
    ongoingChapters: 3,
    pendingTasks: 8,
    submissionsToReview: 5,
    upcomingDeadlines: [
      { chapterId: 1, title: 'Ch.23 - Crimson Resolve', deadline: '2026-05-25', daysLeft: 7 },
      { chapterId: 2, title: 'Ch.24 - Moonlight Pursuit', deadline: '2026-06-10', daysLeft: 23 },
      { chapterId: 6, title: 'Ch.53 - Shadow Monarch', deadline: '2026-06-05', daysLeft: 18 },
    ],
    currentRank: 3,
    rankTrend: 'UP',
  },
  // TANTOU_EDITOR (Sato) — thống kê cho biên tập viên
  5: {
    assignedSeries: 3,
    chaptersInReview: 2,
    pendingComments: 12,
  },
  // EDITORIAL_BOARD (Kimura) — thống kê cho ban biên tập
  7: {
    totalSeries: 6,
    pendingApprovals: 1,
    upcomingSchedules: 3,
    atRiskSeries: 2,
    lastPeriodVotes: 45200,
  },
  // EDITORIAL_BOARD (Nishida) — role giống Kimura, cùng dữ liệu
  8: {
    totalSeries: 6,
    pendingApprovals: 1,
    upcomingSchedules: 3,
    atRiskSeries: 2,
    lastPeriodVotes: 45200,
  },
}

// ──────────────────────────────────────────────
//  Helper — Hàm tiện ích
// ──────────────────────────────────────────────

/**
 * getMockUser — Tìm người dùng theo ID.
 *
 * @param {number} id - ID của người dùng
 * @returns {Object|undefined} - Thông tin user hoặc undefined nếu không tìm thấy
 */
export function getMockUser(id) {
  return mockUsers.find(u => u.id === id)
}
