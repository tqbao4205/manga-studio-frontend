import { create } from 'zustand'
import { mockRankings, mockNotifications, mockSeries } from '../../shared/constants/mock-data'

// ── Mapping: seriesId → seriesTitle (tra cứu nhanh khi nhập votes) ──
const seriesMap = {}
mockSeries.forEach((s) => { seriesMap[s.id] = s.title })

// ── Biến đếm ID cho notification (tự tăng, dùng trong mock) ──
let notifyId = Math.max(0, ...mockNotifications.map(n => n.id)) + 1

/**
 * Thêm một notification mới vào đầu mảng mockNotifications.
 * Dùng trong quá trình mock để mô phỏng thông báo real-time
 * khi series vào/ra khỏi danger zone hoặc thay đổi thứ hạng.
 */
function pushNotification(type, userId, title, message, refType, refId) {
  mockNotifications.unshift({
    id: notifyId++,
    userId,
    type,
    title,
    message,
    referenceType: refType,
    referenceId: refId,
    isRead: false,
    createdAt: new Date().toISOString(),
  })
}

// ── Danger zone tracker (theo dõi cảnh báo theo từng series) ──
// Cấu trúc: { seriesId -> { consecutiveDangerPeriods, warningLevel, lastWarningDate } }
const dangerTracker = {}

/** Khởi tạo tracker cho một series nếu chưa có */
function initTracker(seriesId) {
  if (!dangerTracker[seriesId]) {
    dangerTracker[seriesId] = { consecutiveDangerPeriods: 0, warningLevel: 0, lastWarningDate: null }
  }
}

/** Các tier được coi là "danger zone" (C, D) */
const DANGER_TIERS = ['C', 'D']

/**
 * Kiểm tra danh sách xếp hạng, phát hiện series nào đang trong danger zone
 * và gửi notification cảnh báo tương ứng cho mangaka và editorial board.
 *
 * Logic cảnh báo:
 *   1. Nếu series ở tier C/D → tăng consecutiveDangerPeriods
 *   2. 1 kỳ liên tiếp → Warning 1 (cảnh báo lần đầu)
 *   3. 2 kỳ liên tiếp → Warning 2 (cảnh báo lần cuối)
 *   4. ≥3 kỳ liên tiếp → Warning 3 (họp hội đồng cân nhắc huỷ series)
 *   5. Nếu series thoát danger zone → reset counter, thông báo
 *   6. Luôn thông báo cho mangaka khi thứ hạng tăng/giảm
 */
function checkDangerZones(rankings) {
  const mangakaIds = [1, 9, 10] // Ichikawa, Fujimoto, Ito
  const ebIds = [7, 8]          // Kimura, Nishida (editorial board)

  rankings.forEach((r) => {
    initTracker(r.seriesId)
    const tracker = dangerTracker[r.seriesId]

    const inDanger = DANGER_TIERS.includes(r.tier)

    if (inDanger) {
      tracker.consecutiveDangerPeriods++

      if (tracker.consecutiveDangerPeriods === 1 && tracker.warningLevel < 1) {
        tracker.warningLevel = 1
        tracker.lastWarningDate = new Date().toISOString()
        // Cảnh báo lần 1 cho mangaka
        mangakaIds.forEach(uid => {
          pushNotification(
            'WARNING_ISSUED', uid,
            `⚠️ Warning 1: ${r.seriesTitle} dropped to Tier ${r.tier}`,
            `Your series "${r.seriesTitle}" has entered the danger zone (Tier ${r.tier}). Please review production quality and reader engagement.`,
            'SERIES', r.seriesId,
          )
        })
        // Cảnh báo lần 1 cho biên tập viên
        ebIds.forEach(uid => {
          pushNotification(
            'WARNING_ISSUED', uid,
            `⚠️ Warning 1 issued: ${r.seriesTitle} — Tier ${r.tier}`,
            `"${r.seriesTitle}" has been in Tier ${r.tier} for 1 period. First warning issued.`,
            'SERIES', r.seriesId,
          )
        })
      } else if (tracker.consecutiveDangerPeriods === 2 && tracker.warningLevel < 2) {
        tracker.warningLevel = 2
        tracker.lastWarningDate = new Date().toISOString()
        // Cảnh báo lần 2 (final warning) cho mangaka
        mangakaIds.forEach(uid => {
          pushNotification(
            'WARNING_ISSUED', uid,
            `🚨 Warning 2: ${r.seriesTitle} — Final Warning`,
            `This is your FINAL WARNING for "${r.seriesTitle}". The series has been in the danger zone for ${tracker.consecutiveDangerPeriods} consecutive periods. Immediate improvement required.`,
            'SERIES', r.seriesId,
          )
        })
        // Cảnh báo lần 2 cho biên tập viên
        ebIds.forEach(uid => {
          pushNotification(
            'WARNING_ISSUED', uid,
            `🚨 Warning 2 issued: ${r.seriesTitle} — Final Warning`,
            `"${r.seriesTitle}" has been in the danger zone for 2 consecutive periods. Final warning issued. Next period will trigger cancellation review.`,
            'SERIES', r.seriesId,
          )
        })
      } else if (tracker.consecutiveDangerPeriods >= 3 && tracker.warningLevel < 3) {
        tracker.warningLevel = 3
        tracker.lastWarningDate = new Date().toISOString()
        // Cảnh báo lần 3 (họp huỷ series) cho mangaka
        mangakaIds.forEach(uid => {
          pushNotification(
            'WARNING_ISSUED', uid,
            `💀 Warning 3: ${r.seriesTitle} — Cancellation Review`,
            `Your series "${r.seriesTitle}" has been in the danger zone for ${tracker.consecutiveDangerPeriods} periods. The Editorial Board will convene to decide: Continue, Cancel, or Change Magazine.`,
            'SERIES', r.seriesId,
          )
        })
        // Cảnh báo lần 3 cho biên tập viên
        ebIds.forEach(uid => {
          pushNotification(
            'WARNING_ISSUED', uid,
            `💀 Cancellation Review: ${r.seriesTitle}`,
            `"${r.seriesTitle}" has triggered a cancellation review (${tracker.consecutiveDangerPeriods} periods in danger zone). Board meeting required to determine series fate.`,
            'SERIES', r.seriesId,
          )
        })
      }
    } else {
      // Series đã thoát khỏi danger zone → reset bộ đếm và thông báo
      if (tracker.consecutiveDangerPeriods > 0) {
        pushNotification(
          'RANKING_CHANGED', 1,
          `✅ ${r.seriesTitle} has escaped the danger zone!`,
          `Your series "${r.seriesTitle}" has climbed to Tier ${r.tier}. Great work!`,
          'SERIES', r.seriesId,
        )
      }
      tracker.consecutiveDangerPeriods = 0
      tracker.warningLevel = 0
    }

    if (r.trend === 'UP' || r.trend === 'DOWN') {
      const trendWord = r.trend === 'UP' ? 'risen' : 'fallen'
      mangakaIds.forEach(uid => {
        pushNotification(
          'RANKING_CHANGED', uid,
          `${r.seriesTitle} has ${trendWord} to #${r.rank} (Tier ${r.tier})`,
          `Your series is now ranked #${r.rank} in Tier ${r.tier}.${r.previousRank ? ` Previous: #${r.previousRank}` : ''}`,
          'SERIES', r.seriesId,
        )
      })
    }
  })
}

// ── Dữ liệu lịch sử xếp hạng (mock) ─────────────────────
const mockHistoryPeriods = [
  {
    periodLabel: 'Late Apr 2026',
    entries: [
      { seriesId: 1, seriesTitle: 'Blade of the Demon Moon', rank: 5, totalVotes: 890 },
      { seriesId: 2, seriesTitle: 'Stardust Chronicles', rank: 2, totalVotes: 1230 },
      { seriesId: 3, seriesTitle: 'Neon Horizon', rank: 4, totalVotes: 920 },
      { seriesId: 4, seriesTitle: 'Echoes of Eternity', rank: 1, totalVotes: 1340 },
      { seriesId: 5, seriesTitle: 'Phantom Thief Reinya', rank: 3, totalVotes: 1100 },
    ],
  },
  {
    periodLabel: 'Early May 2026',
    entries: [
      { seriesId: 1, seriesTitle: 'Blade of the Demon Moon', rank: 4, totalVotes: 1050 },
      { seriesId: 2, seriesTitle: 'Stardust Chronicles', rank: 1, totalVotes: 1420 },
      { seriesId: 3, seriesTitle: 'Neon Horizon', rank: 3, totalVotes: 1100 },
      { seriesId: 4, seriesTitle: 'Echoes of Eternity', rank: 2, totalVotes: 1380 },
      { seriesId: 5, seriesTitle: 'Phantom Thief Reinya', rank: 5, totalVotes: 980 },
    ],
  },
  {
    periodLabel: 'Mid May 2026',
    entries: [
      { seriesId: 1, seriesTitle: 'Blade of the Demon Moon', rank: 2, totalVotes: 1350 },
      { seriesId: 2, seriesTitle: 'Stardust Chronicles', rank: 1, totalVotes: 1560 },
      { seriesId: 3, seriesTitle: 'Neon Horizon', rank: 4, totalVotes: 1050 },
      { seriesId: 4, seriesTitle: 'Echoes of Eternity', rank: 3, totalVotes: 1220 },
      { seriesId: 5, seriesTitle: 'Phantom Thief Reinya', rank: 6, totalVotes: 850 },
    ],
  },
]

/** Tính tier chữ (S/A/B/C/D) dựa trên thứ hạng số */
function calcTier(rank) {
  if (rank <= 2) return 'S'
  if (rank <= 5) return 'A'
  if (rank <= 10) return 'B'
  if (rank <= 20) return 'C'
  return 'D'
}

/** Tính xu hướng (tăng/giảm/giữ nguyên/mới) dựa trên rank hiện tại so với kỳ trước */
function calcTrend(currentRank, previousRank) {
  if (previousRank === undefined || previousRank === null) return 'NEW'
  if (currentRank < previousRank) return 'UP'
  if (currentRank > previousRank) return 'DOWN'
  return 'SAME'
}

/** Đồng bộ dữ liệu từ dangerTracker (module-level) lên state để trigger React re-render */
function syncDangerState() {
  const warningLevels = {}
  const dangerPeriods = {}
  Object.entries(dangerTracker).forEach(([sid, t]) => {
    warningLevels[sid] = t.warningLevel
    dangerPeriods[sid] = t.consecutiveDangerPeriods
  })
  return { warningLevels, dangerPeriods }
}

// ── Store ──────────────────────────────────────────────

/**
 * 📦 rankingStore — Quản lý bảng xếp hạng series, cảnh báo danger zone,
 *                  và lịch sử xếp hạng qua các kỳ bình chọn.
 *
 * State flow:
 *   rankings[]    → Bảng xếp hạng hiện tại (có tier, trend)
 *   history[]     → Lịch sử các kỳ trước (dùng cho biểu đồ)
 *   warningLevels → Map {seriesId → mức cảnh báo 0-3}
 *   dangerPeriods → Map {seriesId → số kỳ liên tiếp trong danger zone}
 *
 * Danger tracker hoạt động ở module-level (dangerTracker) và được đồng bộ
 * lên state qua syncDangerState() để đảm bảo reactivity của React.
 */
export const useRankingStore = create((set) => ({
  /** Danh sách xếp hạng hiện tại (đã tính tier & trend) */
  rankings: mockRankings,

  /** Lịch sử xếp hạng qua các kỳ (dùng cho biểu đồ xu hướng) */
  history: mockHistoryPeriods,

  /** Mức cảnh báo hiện tại của từng series (0 = không cảnh báo, 1-3) */
  warningLevels: {},

  /** Số kỳ liên tiếp trong danger zone của từng series */
  dangerPeriods: {},

  /** Lấy mức cảnh báo của một series (đọc từ tracker module-level) */
  getWarningLevel: (seriesId) => {
    const t = dangerTracker[seriesId]
    return t ? t.warningLevel : 0
  },

  /** Lấy số kỳ liên tiếp trong danger zone của một series */
  getConsecutiveDangerPeriods: (seriesId) => {
    const t = dangerTracker[seriesId]
    return t ? t.consecutiveDangerPeriods : 0
  },

  /** Kiểm tra danger zone ngay lập tức và cập nhật state để re-render */
  checkDangerZonesNow: () => {
    checkDangerZones(mockRankings)
    set(syncDangerState())
  },

  /**
   * Nhập votes cho kỳ hiện tại và tính toán lại bảng xếp hạng.
   *
   * Quy trình:
   *   1. Map votes → cấu trúc ranking (rank = 0 tạm thời)
   *   2. Sắp xếp theo totalVotes giảm dần
   *   3. Tính rank, tier, trend cho từng series
   *   4. Tạo snapshot lịch sử từ rankings cũ
   *   5. Kiểm tra danger zone với rankings mới
   *   6. Trả về state mới (rankings, history, warningLevels, dangerPeriods)
   */
  enterVotes: (votes, periodLabel) =>
    set((state) => {
      // Tạo rankings tạm từ votes (chưa có rank, tier, trend)
      const newRankings = votes.map((v) => {
        const existing = state.rankings.find((r) => r.seriesId === v.seriesId)
        return {
          id: existing?.id || Date.now() + v.seriesId,
          seriesId: v.seriesId,
          seriesTitle: seriesMap[v.seriesId] || v.seriesTitle || 'Unknown',
          periodLabel,
          rank: 0,
          tier: 'D',
          totalVotes: v.votes,
          previousRank: existing?.rank || undefined,
          trend: 'NEW',
          calculatedAt: new Date().toISOString().split('T')[0],
        }
      })

      // Sắp xếp theo votes giảm dần và tính rank, tier, trend
      const sorted = [...newRankings].sort((a, b) => b.totalVotes - a.totalVotes)
      const finalRankings = sorted.map((r, i) => ({
        ...r,
        rank: i + 1,
        tier: calcTier(i + 1),
        trend: calcTrend(i + 1, r.previousRank),
      }))

      // Snapshot rankings cũ để thêm vào lịch sử
      const snapshot = {
        periodLabel: state.rankings[0]?.periodLabel || '',
        entries: state.rankings.map((r) => ({
          seriesId: r.seriesId,
          seriesTitle: r.seriesTitle,
          rank: r.rank,
          totalVotes: r.totalVotes,
        })),
      }

      // Kiểm tra danger zone với bảng xếp hạng mới
      checkDangerZones(finalRankings)

      return {
        rankings: finalRankings,
        history: [...state.history, snapshot],
        ...syncDangerState(),
      }
    }),
}))
