# Kế hoạch FE1 — Tantou Invitation + Review UI

> **Mục tiêu:** Xây dựng UI cho luồng Mời Tantou → Tantou Review (giai đoạn 1 & 2 của Series Approval Workflow).
> **Backend đã hoàn thành** ở branch `feature/series-approval-workflow` của `manga-studio-backend`.

---

## Mục lục

1. [Tổng quan flow](#1-tổng-quan-flow)
2. [File thay đổi](#2-file-thay-đổi)
3. [Task 1: API Service](#3-task-1-api-service)
4. [Task 2: WebSocket + AuthStore](#4-task-2-websocket--authstore)
5. [Task 3: SeriesDetailPage — Invite Tantou Modal](#5-task-3-seriesdetailpage--invite-tantou)
6. [Task 4: SeriesDetailPage — Tantou Review Buttons](#6-task-4-seriesdetailpage--tantou-review)
7. [Task 5: InvitationsPage — Tantou Tab](#7-task-5-invitationspage--tantou-tab)
8. [Task 6: Status Colors + Filter](#8-task-6-status-colors--filter)
9. [Timeline](#9-timeline)

---

## 1. Tổng quan flow

```
┌─ MANGAKA ──────────────────────────────────────┐
│  1. DRAFT (chưa có tantou) → Click "Mời Tantou" │
│     → Modal search TANTOU_EDITOR → Invite       │
│  2. DRAFT (đã có tantou)  → Click "Submit"      │
│     → PENDING_TANTOU                            │
│  3. PENDING_TANTOU        → Chờ tantou duyệt    │
│  4. Nhận WS tantou accept/reject → realtime     │
└─────────────────────────────────────────────────┘

┌─ TANTOU_EDITOR ─────────────────────────────────┐
│  1. Nhận WS TANTOU_INVITATION_SENT              │
│  2. Vào /invitations → Accept / Reject          │
│  3. Nhận WS TANTOU_REVIEW_REQUIRED              │
│  4. Vào series detail → Approve / Reject        │
└─────────────────────────────────────────────────┘
```

### Series status check

| Status | Ý nghĩa | Ai thấy |
|--------|---------|---------|
| `DRAFT` | Bản nháp, chưa submit | Mangaka + Tantou (nếu được gán) |
| `PENDING_TANTOU` | Đang chờ tantou review | Mangaka + Tantou |
| `PENDING_BOARD_VOTE` | Đã qua tantou, chờ EB vote (BE2/FE2 lo) | Tất cả |
| (các status khác: ONGOING, HIATUS...) | Giữ nguyên | Tất cả |

---

## 2. File thay đổi

| # | File | Loại | Mô tả |
|---|------|------|-------|
| 1 | `src/services/seriesService.js` | Sửa | Thêm 8 API methods |
| 2 | `src/app/stores/authStore.js` | Sửa | Thêm WebSocket events + `tantouTrigger` |
| 3 | `src/features/series/SeriesDetailPage.jsx` | Sửa | Thêm invite modal + tantou review buttons |
| 4 | `src/features/invitations/InvitationsPage.jsx` | Sửa | Thêm section tantou invitations |
| 5 | `src/shared/utils/index.js` | Sửa | Thêm `PENDING_TANTOU` color |
| 6 | `src/features/series/SeriesListPage.jsx` | Sửa | Thêm filter option |

---

## 3. Task 1: API Service

**File:** `src/services/seriesService.js`

### Code cần thêm

```javascript
// ──────────────────────────────────────────────
//  TANTOU INVITATION — Mời / Xem / Xoá / Phản hồi
// ──────────────────────────────────────────────

/**
 * MANGAKA mời TANTOU_EDITOR vào series.
 * POST /api/series/{seriesId}/tantou/invite
 * Body: { tantouId }
 */
inviteTantou: async (seriesId, tantouId) => {
    return api.post(`/series/${seriesId}/tantou/invite`, { tantouId });
},

/**
 * Xem danh sách lời mời tantou của series.
 * GET /api/series/{seriesId}/tantou/invitations
 */
getTantouInvitations: async (seriesId) => {
    return api.get(`/series/${seriesId}/tantou/invitations`);
},

/**
 * MANGAKA / EB xoá lời mời tantou khỏi series.
 * DELETE /api/series/{seriesId}/tantou/{tantouId}
 */
removeTantouInvitation: async (seriesId, tantouId) => {
    return api.delete(`/series/${seriesId}/tantou/${tantouId}`);
},

/**
 * TANTOU_EDITOR xem danh sách lời mời PENDING của mình.
 * GET /api/tantou/invitations
 */
getMyTantouInvitations: async () => {
    return api.get('/tantou/invitations');
},

/**
 * TANTOU_EDITOR phản hồi lời mời (ACCEPTED / REJECTED).
 * PATCH /api/tantou/invitations/{invitationId}
 * Body: { status: "ACCEPTED" | "REJECTED" }
 */
respondTantouInvitation: async (invitationId, status) => {
    return api.patch(`/tantou/invitations/${invitationId}`, { status });
},

// ──────────────────────────────────────────────
//  SERIES WORKFLOW — Submit / Approve / Reject
// ──────────────────────────────────────────────

/**
 * MANGAKA submit series cho tantou review.
 * DRAFT → PENDING_TANTOU
 * POST /api/series/{seriesId}/submit
 */
submitTantou: async (seriesId) => {
    return api.post(`/series/${seriesId}/submit`);
},

/**
 * TANTOU_EDITOR duyệt series.
 * PENDING_TANTOU → PENDING_BOARD_VOTE
 * POST /api/series/{seriesId}/tantou/approve
 */
tantouApprove: async (seriesId) => {
    return api.post(`/series/${seriesId}/tantou/approve`);
},

/**
 * TANTOU_EDITOR từ chối series.
 * PENDING_TANTOU → DRAFT
 * POST /api/series/{seriesId}/tantou/reject
 * Body: { reason: "..." } (optional)
 */
tantouReject: async (seriesId, reason) => {
    return api.post(`/series/${seriesId}/tantou/reject`, { reason });
},
```

> **Pattern:** Copy y hệt `assistantService.js`. Mỗi method là 1 async function, trả về `api.{method}(endpoint, body/params)`.

---

## 4. Task 2: WebSocket + AuthStore

**File:** `src/app/stores/authStore.js`

### 4.1 Thêm state `tantouTrigger`

```javascript
// Trong state object của useAuthStore, thêm dòng mới sau invitationTrigger:
tantouTrigger: 0,
```

### 4.2 Thêm setter

```javascript
// Sau incrementInvitationTrigger, thêm method mới:
incrementTantouTrigger: () => {
    set((state) => ({ tantouTrigger: state.tantouTrigger + 1 }))
},
```

### 4.3 Thêm WebSocket event handlers

Sửa hàm `handleWebSocketMessage` (nằm ngoài store, trước `export const useAuthStore`):

```javascript
const handleWebSocketMessage = (type, data) => {
  console.log(`[WS Event] ${type}:`, data)

  switch (type) {
    // ── Assistant events (đã có) ──
    case 'INVITATION_SENT':
      useAuthStore.getState().incrementInvitationTrigger()
      break
    case 'INVITATION_ACCEPTED':
    case 'INVITATION_REJECTED':
      useAuthStore.getState().incrementAssistantTrigger()
      break

    // ── Tantou events (thêm mới) ──
    case 'TANTOU_INVITATION_SENT':
      // TANTOU_EDITOR: có lời mời làm tantou mới
      useAuthStore.getState().incrementInvitationTrigger()
      break

    case 'TANTOU_INVITATION_ACCEPTED':
    case 'TANTOU_INVITATION_REJECTED':
    case 'TANTOU_REVIEW_REQUIRED':
    case 'TANTOU_APPROVED':
    case 'TANTOU_REJECTED':
      // MANGAKA / TANTOU: series có thay đổi → refetch
      useAuthStore.getState().incrementTantouTrigger()
      break

    default:
      break
  }
}
```

### 4.4 Export selector cho component

Không cần export gì thêm — component dùng `useAuthStore((s) => s.tantouTrigger)` như bình thường.

---

## 5. Task 3: SeriesDetailPage — Invite Tantou

**File:** `src/features/series/SeriesDetailPage.jsx`

### 5.1 Thêm imports

```javascript
// Thêm 2 dòng vào đầu file (cùng chỗ import assistantService):
import seriesService from '../../services/seriesService'
import assistantService from '../../services/assistantService'
// seriesService đã có sẵn, chỉ cần thêm nếu thiếu
```

### 5.2 Thêm state cho tantou (cạnh assistant state)

```javascript
// ── Tantou state (thêm sau assistant state, ~dòng 96) ──
const tantou = series?.tantouEditor
const isAssignedTantou = isTantou && tantou?.id === user?.id
const [showTantouInviteDialog, setShowTantouInviteDialog] = useState(false)
const [tantouSearchQuery, setTantouSearchQuery] = useState('')
const [tantouSearchResults, setTantouSearchResults] = useState([])
const [tantouSearching, setTantouSearching] = useState(false)
const [invitingTantouId, setInvitingTantouId] = useState(null)
const tantouSearchTimeoutRef = useRef(null)
const tantouTrigger = useAuthStore((s) => s.tantouTrigger)

// ── Tantou review state ──
const [showRejectModal, setShowRejectModal] = useState(false)
const [rejectReason, setRejectReason] = useState('')
const [rejecting, setRejecting] = useState(false)
```

> **Lưu ý:** Dòng `const tantou = series.tantouEditor` đã có sẵn ở ~dòng 213 (`const tantou = series.tantouEditor`). Dùng lại.

### 5.3 Thêm debounced search tantou

```javascript
// ── Debounced search TANTOU_EDITOR (thêm sau useEffect của assistant) ──
const handleTantouSearchChange = useCallback((value) => {
    setTantouSearchQuery(value)
    if (tantouSearchTimeoutRef.current) clearTimeout(tantouSearchTimeoutRef.current)
    if (!value.trim()) {
        setTantouSearchResults([])
        setTantouSearching(false)
        return
    }
    setTantouSearching(true)
    tantouSearchTimeoutRef.current = setTimeout(async () => {
        try {
            // Cần BE có GET /api/users/tantou-editors?search=...
            // Nếu chưa có, có thể dùng GET /api/users?role=TANTOU_EDITOR&search=...
            // Tạm thời search user có role tantou (hỏi BE)
            const res = await api.get('/users/tantou-editors', { params: { search: value } })
            setTantouSearchResults(res)
        } catch {
            setTantouSearchResults([])
        } finally {
            setTantouSearching(false)
        }
    }, 300)
}, [])

useEffect(() => {
    return () => {
        if (tantouSearchTimeoutRef.current) clearTimeout(tantouSearchTimeoutRef.current)
    }
}, [])
```

> **Cần confirm với BE:** Chưa có endpoint `GET /api/users/tantou-editors`. Nếu chưa, FE có thể tạm search user thường, hoặc BE thêm endpoint này. **(update: cần hỏi lại BE)**

### 5.4 Thêm handler invite + submit

```javascript
// ── Invite tantou handler (thêm sau handleInvite) ──
const handleInviteTantou = async (tantouId, displayName) => {
    setInvitingTantouId(tantouId)
    try {
        await seriesService.inviteTantou(id, tantouId)
        addToast({ type: 'success', title: 'Invitation sent', message: `Tantou invitation sent to ${displayName}.` })
        setShowTantouInviteDialog(false)
        setTantouSearchQuery('')
        setTantouSearchResults([])
    } catch (err) {
        addToast({ type: 'error', title: 'Failed', message: err.response?.data?.message || err.message })
    } finally {
        setInvitingTantouId(null)
    }
}

// ── Submit cho tantou handler ──
const handleSubmitTantou = async () => {
    if (!window.confirm(`Submit "${series.title}" to your tantou editor for review?`)) return
    try {
        await seriesService.submitTantou(id)
        addToast({ type: 'success', title: 'Submitted', message: 'Series has been submitted for tantou review.' })
        fetchById(id)
    } catch (err) {
        addToast({ type: 'error', title: 'Failed', message: err.response?.data?.message || err.message })
    }
}

// ── Tantou approve handler ──
const handleTantouApprove = async () => {
    if (!window.confirm(`Approve "${series.title}" and send to Editorial Board vote?`)) return
    try {
        await seriesService.tantouApprove(id)
        addToast({ type: 'success', title: 'Approved', message: 'Series has been sent to Editorial Board for voting.' })
        fetchById(id)
    } catch (err) {
        addToast({ type: 'error', title: 'Failed', message: err.response?.data?.message || err.message })
    }
}

// ── Tantou reject handler ──
const handleTantouReject = async () => {
    setRejecting(true)
    try {
        await seriesService.tantouReject(id, rejectReason)
        addToast({ type: 'success', title: 'Rejected', message: 'Series has been returned to draft.' })
        setShowRejectModal(false)
        setRejectReason('')
        fetchById(id)
    } catch (err) {
        addToast({ type: 'error', title: 'Failed', message: err.response?.data?.message || err.message })
    } finally {
        setRejecting(false)
    }
}
```

### 5.5 UI: Mangaka — "Mời Tantou" button + "Submit" button

**Vị trí:** Trong phần sidebar bên phải, gần section "Assistants" (có thể là card riêng hoặc thêm vào section đó).

Ví dụ: thêm 1 card "Tantou Editor" trong phần sidebar (cùng cấp với card "Series Assistants"):

```jsx
{/* ── Tantou Editor Card ── */}
<div className="bg-surface-container rounded-xl p-6 shadow-[0px_4px_20px_rgba(139,92,246,0.05)] border border-outline-variant/30">
    <h4 className="text-xl font-semibold text-on-surface mb-4 flex items-center gap-2">
        Tantou Editor
    </h4>

    {!tantou ? (
        <div className="flex flex-col items-center py-6 text-on-surface-variant/50">
            <Users size={28} className="mb-2 opacity-40" />
            <p className="text-sm">No tantou editor assigned.</p>
            {isOwner && series?.status === 'DRAFT' && (
                <>
                    <p className="text-xs mt-1">Assign a tantou editor to review your series.</p>
                    <button
                        onClick={() => setShowTantouInviteDialog(true)}
                        className="mt-3 flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-all"
                    >
                        <UserPlus size={14} />
                        Mời Tantou
                    </button>
                </>
            )}
        </div>
    ) : (
        <div className="space-y-3">
            <div className="flex items-center justify-between bg-surface-container-low rounded-lg px-4 py-2.5 border border-outline-variant/20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {tantou.displayName?.[0] || 'T'}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-on-surface">{tantou.displayName || 'Tantou'}</p>
                        <p className="text-xs text-emerald-400 font-medium">
                            {series.status === 'PENDING_TANTOU' ? 'Đang review' : 'Đã duyệt'}
                        </p>
                    </div>
                </div>
            </div>

            {/* MANGAKA: Submit button */}
            {isOwner && series?.status === 'DRAFT' && (
                <button
                    onClick={handleSubmitTantou}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-on-primary bg-primary rounded-lg hover:brightness-110 transition-all"
                >
                    <Send size={14} />
                    Submit cho Tantou
                </button>
            )}

            {/* MANGAKA: Trạng thái chờ */}
            {isOwner && series?.status === 'PENDING_TANTOU' && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-purple-400 font-medium">
                    <Loader size={14} className="animate-spin" />
                    ⏳ Chờ Tantou duyệt
                </div>
            )}
        </div>
    )}
</div>
```

### 5.6 UI: Tantou — Approve/Reject buttons

Thêm card riêng cho TANTOU_EDITOR (chỉ hiện khi `isAssignedTantou === true`):

```jsx
{/* ── TANTOU: Review Actions ── */}
{isAssignedTantou && series?.status === 'PENDING_TANTOU' && (
    <div className="bg-surface-container rounded-xl p-6 shadow-[0px_4px_20px_rgba(139,92,246,0.05)] border border-outline-variant/30">
        <h4 className="text-xl font-semibold text-on-surface mb-2">Tantou Review</h4>
        <p className="text-sm text-on-surface-variant mb-4">
            This series is pending your review. You can approve it to send to Editorial Board vote, or reject it back to draft.
        </p>
        <div className="flex gap-3">
            <button
                onClick={() => setShowRejectModal(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-on-surface-variant border border-outline-variant/40 rounded-lg hover:border-error/40 hover:text-error hover:bg-error/5 transition-all"
            >
                <X size={14} />
                Từ chối
            </button>
            <button
                onClick={handleTantouApprove}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-on-primary bg-primary rounded-lg hover:brightness-110 transition-all"
            >
                <Check size={14} />
                Duyệt
            </button>
        </div>
    </div>
)}

{/* ── TANTOU: Reject Reason Modal ── */}
<Dialog
    open={showRejectModal}
    onClose={() => { setShowRejectModal(false); setRejectReason('') }}
    title="Từ chối Series"
    description="Provide feedback to the mangaka (optional)."
    size="sm"
>
    <div className="space-y-4">
        <textarea
            autoFocus
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Lý do từ chối (không bắt buộc)..."
            rows={4}
            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary transition-colors resize-none"
        />
        <div className="flex justify-end gap-3">
            <button
                onClick={() => { setShowRejectModal(false); setRejectReason('') }}
                className="px-4 py-2 text-sm font-medium text-on-surface-variant border border-outline-variant/40 rounded-lg hover:bg-surface-container-higher transition-all"
            >
                Cancel
            </button>
            <button
                onClick={handleTantouReject}
                disabled={rejecting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-on-primary bg-error rounded-lg hover:brightness-110 disabled:opacity-40 transition-all"
            >
                {rejecting ? <Loader size={14} className="animate-spin" /> : <X size={14} />}
                Xác nhận từ chối
            </button>
        </div>
    </div>
</Dialog>
```

### 5.7 Invite Tantou Dialog (copy pattern từ Invite Assistant Dialog ~dòng 738-821)

```jsx
{/* ── Invite Tantou Dialog ── */}
<Dialog
    open={showTantouInviteDialog}
    onClose={() => { setShowTantouInviteDialog(false); setTantouSearchQuery(''); setTantouSearchResults([]) }}
    title="Mời Tantou Editor"
    description="Search for a tantou editor to review this series."
    size="md"
>
    <div className="space-y-4">
        <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
            <input
                autoFocus
                value={tantouSearchQuery}
                onChange={(e) => handleTantouSearchChange(e.target.value)}
                placeholder="Type name to search..."
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg pl-10 pr-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary transition-colors"
            />
            {tantouSearching && (
                <Loader size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin" />
            )}
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1">
            {/* Copy pattern từ assistant: searching/empty/result states */}
            {!tantouSearchQuery.trim() ? (
                <p className="text-center py-8 text-sm text-on-surface-variant/40">Type to search for tantou editors.</p>
            ) : tantouSearching ? (
                <div className="flex items-center justify-center py-8">
                    <Loader size={20} className="text-primary animate-spin" />
                </div>
            ) : tantouSearchResults.length === 0 ? (
                <p className="text-center py-8 text-sm text-on-surface-variant/40">No tantou editors found.</p>
            ) : (
                tantouSearchResults.map((t) => {
                    const name = t.displayName || t.username || 'Unknown'
                    const initial = name[0]
                    return (
                        <div
                            key={t.id}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-surface-container-high/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                    {initial}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-on-surface">{name}</p>
                                    {t.email && (
                                        <p className="text-xs text-on-surface-variant/50 flex items-center gap-1">
                                            <Mail size={10} />
                                            {t.email}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleInviteTantou(t.id, name)}
                                disabled={invitingTantouId === t.id}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 disabled:opacity-40 transition-all"
                            >
                                {invitingTantouId === t.id ? (
                                    <Loader size={12} className="animate-spin" />
                                ) : (
                                    <UserPlus size={12} />
                                )}
                                Mời
                            </button>
                        </div>
                    )
                })
            )}
        </div>
    </div>
</Dialog>
```

---

## 6. Task 4: SeriesDetailPage — Tantou Review Buttons

Đã bao gồm trong phần **5.6** ở trên. Tóm tắt logic hiển thị:

| Điều kiện | UI hiển thị |
|-----------|-------------|
| `isOwner && !tantou && status === DRAFT` | Button "Mời Tantou" |
| `isOwner && tantou && status === DRAFT` | Button "Submit cho Tantou" |
| `isOwner && status === PENDING_TANTOU` | Badge "⏳ Chờ Tantou duyệt" |
| `isAssignedTantou && status === PENDING_TANTOU` | 2 buttons "✅ Duyệt" + "❌ Từ chối" |
| `showRejectModal` | Modal textarea lý do + confirm |

---

## 7. Task 5: InvitationsPage — Tantou Tab

**File:** `src/features/invitations/InvitationsPage.jsx`

### 7.1 Thêm imports

```javascript
import seriesService from '../../services/seriesService'
```

### 7.2 Thêm state + fetch

Giống pattern assistant, thêm state cho tantou invitations:

```javascript
// ── Tantou invitations ──
const [tantouInvitations, setTantouInvitations] = useState([])
const [tantouLoading, setTantouLoading] = useState(true)
const [tantouActionId, setTantouActionId] = useState(null)

const fetchTantouInvitations = async () => {
    setTantouLoading(true)
    try {
        const data = await seriesService.getMyTantouInvitations()
        setTantouInvitations(Array.isArray(data) ? data : data.content || [])
    } catch {
        setTantouInvitations([])
    } finally {
        setTantouLoading(false)
    }
}

useEffect(() => {
    fetchTantouInvitations()
}, [invitationTrigger])
```

### 7.3 Thêm handler respond

```javascript
const handleTantouRespond = async (invitationId, status) => {
    setTantouActionId(invitationId)
    try {
        await seriesService.respondTantouInvitation(invitationId, status)
        addToast({
            type: 'success',
            title: status === 'ACCEPTED' ? 'Invitation accepted' : 'Invitation declined',
            message: status === 'ACCEPTED'
                ? 'You are now the tantou editor for this series.'
                : 'The invitation has been declined.',
        })
        fetchTantouInvitations()
    } catch (err) {
        addToast({ type: 'error', title: 'Failed', message: err.response?.data?.message || err.message })
    } finally {
        setTantouActionId(null)
    }
}
```

### 7.4 Thêm UI section

Trong JSX, thêm section "Tantou Editor Invitations" phía trên hoặc phía dưới section assistant (tuỳ design). Pattern copy từ phần assistant có sẵn:

```jsx
{/* ── Tantou Invitations Section ── */}
{tantouInvitations.length > 0 && (
    <div className="mt-10">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Tantou Invitations</h2>
        <div className="space-y-3">
            {tantouInvitations.map((inv) => {
                const status = inv.status || 'PENDING'
                const cfg = statusConfig[status] || statusConfig.PENDING
                const seriesTitle = inv.series?.title || 'Unknown Series'
                const mangakaName = inv.invitedBy?.displayName || 'Unknown'
                const invId = inv.id

                return (
                    <div key={invId} className={`bg-surface-container border rounded-xl p-5 shadow-sm transition-all ${cfg.bg}`}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Users size={20} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-on-surface">{seriesTitle}</h3>
                                    <p className="text-sm text-on-surface-variant mt-1">
                                        Invited by <span className="font-medium text-on-surface">{mangakaName}</span>
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                        <span className="text-xs font-medium text-on-surface-variant">{cfg.label}</span>
                                    </div>
                                </div>
                            </div>
                            {status === 'PENDING' && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => handleTantouRespond(invId, 'REJECTED')}
                                        disabled={tantouActionId === invId}
                                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-on-surface-variant border border-outline-variant/40 rounded-lg hover:border-error/40 hover:text-error hover:bg-error/5 disabled:opacity-40 transition-all"
                                    >
                                        {tantouActionId === invId ? <Loader size={14} className="animate-spin" /> : <X size={14} />}
                                        Decline
                                    </button>
                                    <button
                                        onClick={() => handleTantouRespond(invId, 'ACCEPTED')}
                                        disabled={tantouActionId === invId}
                                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-on-primary bg-primary rounded-lg hover:brightness-110 disabled:opacity-40 transition-all"
                                    >
                                        {tantouActionId === invId ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                                        Accept
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
)}
```

---

## 8. Task 6: Status Colors + Filter

### 8.1 utils/index.js — Thêm status color

```javascript
export function getStatusColor(status) {
  const map = {
    // ... existing entries ...
    PENDING_TANTOU: '#9333EA',    // purple-600
    PENDING_BOARD_VOTE: '#EA580C', // orange-600 (cho BE2 sau này)
    // ...
  }
  return map[status] || '#6b7280'
}
```

### 8.2 SeriesListPage.jsx — Thêm filter option

```javascript
// Trong statuses array (~dòng 44-45)
const statuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ONGOING', 'HIATUS', 'CANCELLED', 'COMPLETED', 'AT_RISK', 'PENDING_TANTOU']

// Trong statusLabels object (~dòng 48-58)
const statusLabels = {
  // ... existing ...
  PENDING_TANTOU: 'Pending Tantou',
}
```

Đồng thời thêm màu cho status badge trong `statusColorMap` (~dòng 61-71):

```javascript
const statusColorMap = {
  // ... existing ...
  PENDING_TANTOU: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}
```

---

## 9. Timeline & gợi ý thứ tự làm

```
Task 1: seriesService.js          ⏱ 15p — API methods
Task 2: authStore.js              ⏱ 10p — WebSocket events
Task 3: SeriesDetailPage (invite) ⏱ 45p — Invite modal + submit button
Task 4: SeriesDetailPage (review) ⏱ 30p — Approve/Reject buttons
Task 5: InvitationsPage           ⏱ 30p — Tantou section
Task 6: Utils + Filter            ⏱ 10p — Colors + filter option
                                 ─────
        Tổng cộng:               ~2h20p
```

### Lưu ý khi implement

1. **Pattern mẫu:** Luôn copy từ `assistantService.js` / assistant invitation UI trong `SeriesDetailPage.jsx` — code style đã có sẵn.
2. **User search endpoint:** Hiện tại chưa có `GET /api/users/tantou-editors`. **Cần hỏi BE** để thêm. Nếu BE chưa làm, có thể tạm dùng `GET /api/users/assistants` (cùng pattern) hoặc search users theo role.
3. **Series detail refetch:** Sau mỗi action (submit, approve, reject), gọi `fetchById(id)` để cập nhật UI.
4. **WebSocket trigger:** `tantouTrigger` dùng để SeriesDetailPage biết khi nào cần refetch (tantou accept/reject, submit, approve, reject).
5. **invitationTrigger:** Dùng chung cho cả assistant và tantou invitations — vì InvitationsPage cần refetch cả 2 khi có bất kỳ lời mời nào.
