import { create } from 'zustand'
import meetingService from '../../services/meetingService'

/**
 * ─────────────────────────────────────────────────────────────────
 *  editorialStore.js — State management cho Editorial Board Meetings
 * ─────────────────────────────────────────────────────────────────
 *
 * 🎯 Mục đích:
 *   - Quản lý danh sách meetings + criteria từ backend API
 *   - Cung cấp actions: fetch, create, vote, finalize
 *   - Tính toán vote summary local (derived state)
 *
 * 🔄 State machine của Meeting (backend-driven):
 *
 *   PENDING  ──►  (EB vote đủ)  ──►  COMPLETED  ──►  (Chief quyết định)
 *     │                                                        │
 *     │                                              APPROVED / REJECTED
 *     └─── (Chief Editor tạo) ────────────────────────┘
 *
 *   - PENDING:    Vừa tạo, EB có thể vote (không cần End Meeting)
 *   - COMPLETED:  Tất cả EB đã vote (auto-complete backend)
 *   - decision:   Chief Editor ra quyết định cuối (không làm thay đổi status)
 *
 * 🔑 Phân quyền:
 *   - CHIEF_EDITOR:  Tạo meeting, ra quyết định cuối
 *   - EDITORIAL_BOARD: Bỏ phiếu
 */

/**
 * ID của Chief Editor (fallback cho user có id=7 mà role chưa được set CHIEF_EDITOR trên DB).
 */
export const CHIEF_EDITOR_ID = 7

/**
 * Kiểm tra user có phải Chief Editor không.
 * Ưu tiên check role string, fallback sang hardcode ID cũ.
 * @param {Object|null} user
 * @returns {boolean}
 */
export const isChiefEditor = (user) =>
  user?.role === 'CHIEF_EDITOR' || (!user?.role && user?.id === CHIEF_EDITOR_ID)

/**
 * Kiểm tra user có phải Tantou Editor không.
 * @param {Object|null} user
 * @returns {boolean}
 */
export const isTantouEditor = (user) => user?.role === 'TANTOU_EDITOR'

export const useEditorialStore = create((set, get) => ({
  /** Danh sách meetings load từ API */
  meetings: [],

  /** Danh sách tiêu chí chấm điểm (cho form vote) */
  criteria: [],

  /** Loading state */
  loading: false,

  /** Error state */
  error: null,

  // ─────────────────────────────────────────────────────────
  //  FETCH: Lấy danh sách meetings của user hiện tại
  // ─────────────────────────────────────────────────────────
  /**
   * Gọi GET /api/meetings/user để lấy tất cả meetings của user.
   * Gọi khi mount EditorialBoardPage.
   */
  fetchMeetings: async () => {
    set({ loading: true, error: null })
    try {
      const data = await meetingService.getForUser()
      set({ meetings: data, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  // ─────────────────────────────────────────────────────────
  //  FETCH BY ID: Lấy chi tiết 1 meeting (update vào store)
  // ─────────────────────────────────────────────────────────
  /**
   * Gọi GET /api/meetings/{id} và cập nhật meeting tương ứng trong store.
   * Dùng khi vào trang vote / results để có dữ liệu mới nhất.
   *
   * @param {number} meetingId
   */
  fetchMeetingById: async (meetingId) => {
    try {
      const data = await meetingService.getById(meetingId)
      set((s) => {
        // Kiểm tra meeting đã có trong store chưa
        const exists = s.meetings.some((m) => m.id === meetingId)
        if (exists) {
          // Đã có → update
          return {
            meetings: s.meetings.map((m) =>
              m.id === meetingId ? data : m,
            ),
          }
        } else {
          // Chưa có → thêm vào (trường hợp refresh page trực tiếp ở vote/results)
          return { meetings: [...s.meetings, data] }
        }
      })
    } catch (err) {
      set({ error: err.message })
    }
  },

  // ─────────────────────────────────────────────────────────
  //  FETCH CRITERIA: Lấy danh sách tiêu chí chấm điểm
  // ─────────────────────────────────────────────────────────
  /**
   * Gọi GET /api/criteria để lấy danh sách tiêu chí active.
   * Gọi khi mount VotingPage.
   */
  fetchCriteria: async () => {
    try {
      const data = await meetingService.getCriteria()
      set({ criteria: data })
    } catch (err) {
      set({ error: err.message })
    }
  },

  // ─────────────────────────────────────────────────────────
  //  CREATE: Chief Editor tạo meeting mới
  // ─────────────────────────────────────────────────────────
  /**
   * Gọi POST /api/meetings để tạo meeting mới trên backend.
   * Sau khi tạo thành công, thêm vào đầu danh sách store.
   *
   * @param {Object} meetingData - { seriesId, title, description, meetingLink, startedAt, participantIds }
   * @returns {Promise<Object>} MeetingResponse từ backend
   */
  addMeeting: async (meetingData) => {
    try {
      const newMeeting = await meetingService.create(meetingData)
      set((s) => ({ meetings: [newMeeting, ...s.meetings] }))
      return newMeeting
    } catch (err) {
      throw err
    }
  },

  // ─────────────────────────────────────────────────────────
  //  SUBMIT VOTE: EB bỏ phiếu
  // ─────────────────────────────────────────────────────────
  /**
   * Gọi POST /api/meetings/{id}/vote.
   * Backend tự upsert + auto-complete khi đủ EB vote.
   * Sau vote, fetch lại meeting để cập nhật status + vote data.
   *
   * @param {number} meetingId
   * @param {number} userId    - ID của người bỏ phiếu
   * @param {Object} voteData  - { vote: 'YES'|'NO', comment: string, scores: [{ criterionId, score }] }
   */
  submitVote: async (meetingId, userId, voteData) => {
    try {
      await meetingService.castVote(meetingId, voteData)
      // Fetch lại meeting để lấy status + vote summary mới nhất
      await get().fetchMeetingById(meetingId)
    } catch (err) {
      throw err
    }
  },

  // ─────────────────────────────────────────────────────────
  //  FINALIZE DECISION: Chief Editor ra quyết định cuối
  // ─────────────────────────────────────────────────────────
  /**
   * Gọi POST /api/meetings/{id}/decision.
   * Backend sẽ update series status (ONGOING / DRAFT).
   * Sau đó fetch lại meeting để cập nhật decision + status.
   *
   * @param {number} meetingId
   * @param {'APPROVED'|'REJECTED'} decision
   */
  finalizeDecision: async (meetingId, decision) => {
    try {
      await meetingService.makeDecision(meetingId, { decision })
      // Fetch lại meeting để lấy decision + series status mới
      await get().fetchMeetingById(meetingId)
    } catch (err) {
      throw err
    }
  },

  // ─────────────────────────────────────────────────────────
  //  UPDATE FROM WS — Cập nhật meeting từ WebSocket realtime
  // ─────────────────────────────────────────────────────────
  /**
   * Được gọi từ authStore.handleWebSocketMessage khi nhận MEETING_UPDATED / MEETING_COMPLETED.
   * Update trực tiếp store, không gọi API, không loading.
   *
   * @param {Object} meetingData - MeetingResponse từ backend
   */
  updateMeeting: (meetingData) => set((s) => ({
    meetings: s.meetings.map((m) =>
      m && m.id === meetingData.id ? meetingData : m
    ),
  })),

  // ─────────────────────────────────────────────────────────
  //  HELPERS: Derived state (tính local, không gọi API)
  // ─────────────────────────────────────────────────────────

  /** Lấy một meeting theo ID từ store local (không gọi API) */
  getMeetingById: (meetingId) =>
    get().meetings.find((m) => m.id === Number(meetingId)),

  /** Tổng hợp kết quả vote của một meeting từ store local */
  getVoteSummary: (meetingId) => {
    const meeting = get().meetings.find((m) => m.id === Number(meetingId))
    if (!meeting || !meeting.voteSummary) {
      return { yes: 0, no: 0, total: 0, approval: 0 }
    }

    const { totalVotes, yesCount, noCount } = meeting.voteSummary
    const total = totalVotes || 0
    const yes = yesCount || 0
    const no = noCount || 0
    const approval = total > 0 ? Math.round((yes / total) * 100) : 0

    return { yes, no, total, approval }
  },
}))
