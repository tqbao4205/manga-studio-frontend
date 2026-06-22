import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronRight, Users, Search, X, UserPlus, Trash2,
  AlertTriangle, RefreshCw, Clock, CheckCircle, Plus, Mail, Check, Loader,
} from "lucide-react"
import { useAuthStore } from "../../app/stores/authStore"
import { useUIStore } from "../../app/stores/uiStore"
import { Dialog } from "../../shared/components/ui/dialog"
import { Button } from "../../shared/components/ui/button"
import { EmptyState } from "../../shared/components/shared/EmptyState"
import { LoadingSpinner } from "../../shared/components/shared/LoadingSpinner"
import { cn } from "../../shared/utils"
import teamService from "../../services/teamService"
import assistantService from "../../services/assistantService"
import seriesService from "../../services/seriesService"

export function TeamManagementPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)
  const invitationTrigger = useAuthStore((s) => s.invitationTrigger)
  const isOwner = user?.role === "MANGAKA"

  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [selectedSeriesId, setSelectedSeriesId] = useState("all")
  const [showPending, setShowPending] = useState(true)

  const [inviteDialog, setInviteDialog] = useState({ open: false, seriesId: null, role: null })
  const [userSearch, setUserSearch] = useState("")
  const [userResults, setUserResults] = useState([])
  const [searching, setSearching] = useState(false)

  const [invitations, setInvitations] = useState([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)
  const [actionId, setActionId] = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await teamService.getOverview(search || undefined)
      setData(Array.isArray(res) ? res : (res?.series || []))
    } catch (err) {
      setError(err.message || "Failed to load team data")
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchInvitations = useCallback(async () => {
    if (isOwner) return
    setInvitationsLoading(true)
    try {
      if (user?.role === "ASSISTANT") {
        const data = await assistantService.getMyInvitations()
        setInvitations(Array.isArray(data) ? data : data.content || [])
      } else if (user?.role === "TANTOU_EDITOR") {
        const data = await seriesService.getMyTantouInvitations()
        setInvitations(Array.isArray(data) ? data : data.content || [])
      }
    } catch {
      setInvitations([])
    } finally {
      setInvitationsLoading(false)
    }
  }, [isOwner, user?.role])

  useEffect(() => { fetchInvitations() }, [fetchInvitations, invitationTrigger])

  const handleRespond = async (invitationId, status) => {
    setActionId(invitationId)
    try {
      if (user?.role === "ASSISTANT") {
        await assistantService.respondToInvitation(invitationId, status)
      } else {
        await seriesService.respondTantouInvitation(invitationId, status)
      }
      addToast({
        type: "success",
        title: status === "ACCEPTED" ? "Invitation accepted" : "Invitation declined",
        message: status === "ACCEPTED"
          ? (user?.role === "ASSISTANT" ? "You have joined the series team." : "You are now the lead editor for this series.")
          : "The invitation has been declined.",
      })
      fetchInvitations()
      fetchData()
    } catch (err) {
      addToast({ type: "error", title: "Failed", message: err.response?.data?.message || err.message })
    } finally {
      setActionId(null)
    }
  }

  const pendingInvitations = invitations.filter((inv) => (inv.status || "PENDING") === "PENDING")

  const seriesOptions = useMemo(() => {
    return [
      { id: "all", title: "All Series" },
      ...data.map((s) => ({ id: s.seriesId, title: s.seriesTitle })),
    ]
  }, [data])

  const filteredData = useMemo(() => {
    let list = data
    if (selectedSeriesId !== "all") {
      list = list.filter((s) => s.seriesId === selectedSeriesId)
    }
    if (!showPending) {
      list = list.map((s) => ({ ...s, pendingInvites: [] }))
    }
    return list
  }, [data, selectedSeriesId, showPending])

  const handleRemoveAssistant = async (seriesId, member) => {
    try {
      await assistantService.remove(seriesId, member.id)
      addToast({ type: "success", title: "Removed", message: `${member.displayName} removed from series.` })
      fetchData()
    } catch (err) {
      addToast({ type: "error", title: "Failed", message: err.message })
    }
  }

  const handleRemoveTantou = async (seriesId, member) => {
    try {
      await seriesService.removeTantouInvitation(seriesId, member.id)
      addToast({ type: "success", title: "Removed", message: `${member.displayName} removed as lead editor.` })
      fetchData()
    } catch (err) {
      addToast({ type: "error", title: "Failed", message: err.message })
    }
  }

  const openInviteDialog = (seriesId, role) => {
    setInviteDialog({ open: true, seriesId, role })
    setUserSearch("")
    setUserResults([])
  }

  const handleUserSearch = async (value) => {
    setUserSearch(value)
    if (!value) { setUserResults([]); return }
    setSearching(true)
    try {
      const res = inviteDialog.role === "ASSISTANT"
        ? await assistantService.getAssistants(value)
        : await seriesService.getTantouEditors(value)
      setUserResults(Array.isArray(res) ? res : (res?.content || []))
    } catch { setUserResults([]) }
    finally { setSearching(false) }
  }

  const handleInvite = async (targetId) => {
    const { seriesId, role } = inviteDialog
    try {
      if (role === "ASSISTANT") {
        await assistantService.invite(seriesId, targetId)
      } else {
        await seriesService.inviteTantou(seriesId, targetId)
      }
      addToast({ type: "success", title: "Invited", message: "Invitation sent successfully." })
      setInviteDialog({ open: false, seriesId: null, role: null })
      fetchData()
    } catch (err) {
      addToast({ type: "error", title: "Invite failed", message: err.message })
    }
  }

  const countTeam = (entry) => {
    let count = 0
    if (entry.mangaka) count++
    if (entry.tantouEditor) count++
    count += entry.assistants?.length || 0
    count += entry.pendingInvites?.length || 0
    return count
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-2">
            <span>Studio</span>
            <ChevronRight size={14} />
            <span className="text-primary">Team</span>
          </nav>
          <h1 className="text-[32px] font-bold text-on-surface tracking-tight leading-tight">
            Team Management
          </h1>
          <p className="text-sm text-on-surface-variant/70 mt-1">
            View and manage your team members across all series.
          </p>
        </div>
      </div>

      {/* Pending Invitations — chỉ cho ASSISTANT / TANTOU_EDITOR */}
      {!isOwner && pendingInvitations.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(27, 27, 29, 0.7)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(73, 69, 79, 0.3)",
          }}
        >
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Mail size={16} className="text-yellow-400" />
              <span className="text-sm font-semibold text-on-surface">
                Pending Invitations ({pendingInvitations.length})
              </span>
            </div>
            <div className="space-y-3">
              {pendingInvitations.map((inv) => {
                const invId = inv.id
                const seriesTitle = inv.seriesTitle || "Unknown Series"
                const inviterName = inv.mangaka?.displayName || inv.invitedBy?.displayName || inv.createdBy?.displayName || "Unknown"
                return (
                  <div
                    key={invId}
                    className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-yellow-500/5 border border-yellow-500/15"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-on-surface truncate">{seriesTitle}</p>
                      <p className="text-xs text-on-surface-variant/60 mt-0.5">
                        Invited by <span className="font-medium text-on-surface">{inviterName}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRespond(invId, "REJECTED")}
                        disabled={actionId === invId}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-surface-variant border border-outline-variant/40 rounded-lg hover:border-error/40 hover:text-error hover:bg-error/5 disabled:opacity-40 transition-all"
                      >
                        {actionId === invId ? <Loader size={13} className="animate-spin" /> : <X size={13} />}
                        Decline
                      </button>
                      <button
                        onClick={() => handleRespond(invId, "ACCEPTED")}
                        disabled={actionId === invId}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-on-primary bg-primary rounded-lg hover:brightness-110 disabled:opacity-40 transition-all"
                      >
                        {actionId === invId ? <Loader size={13} className="animate-spin" /> : <Check size={13} />}
                        Accept
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div
        className="rounded-2xl p-4"
        style={{
          background: "rgba(27, 27, 29, 0.7)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(73, 69, 79, 0.3)",
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedSeriesId}
            onChange={(e) => setSelectedSeriesId(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="bg-surface-container-high text-on-surface border border-outline-variant/30 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary/50"
          >
            {seriesOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.title}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full bg-surface-container-high text-on-surface border border-outline-variant/30 pl-9 pr-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary/50"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface">
                <X size={16} />
              </button>
            )}
          </div>

          {isOwner && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPending}
                onChange={(e) => setShowPending(e.target.checked)}
                className="w-4 h-4 rounded border-outline-variant/30 accent-primary"
              />
              <span className="text-sm text-on-surface-variant">Show Pending</span>
            </label>
          )}

          <span className="text-xs text-on-surface-variant/60 ml-auto">
            {filteredData.length} series · {filteredData.reduce((a, s) => a + countTeam(s), 0)} members
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(27, 27, 29, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(73, 69, 79, 0.3)" }}>
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(27, 27, 29, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(73, 69, 79, 0.3)" }}>
          <EmptyState
            icon={<AlertTriangle size={32} />}
            title="Failed to load"
            description={error}
            action={<Button onClick={fetchData}><RefreshCw className="mr-2" size={16} />Retry</Button>}
          />
        </div>
      ) : filteredData.length === 0 ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(27, 27, 29, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(73, 69, 79, 0.3)" }}>
          <EmptyState
            icon={<Users size={32} />}
            title="No team data"
            description={search ? "No results match your search." : "You don't have any series yet."}
          />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredData.map((entry) => (
            <div
              key={entry.seriesId}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(27, 27, 29, 0.7)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(73, 69, 79, 0.3)",
              }}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  {entry.coverImageUrl ? (
                    <img src={entry.coverImageUrl} alt="" className="w-10 h-14 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div
                      className="w-10 h-14 rounded-lg shrink-0"
                      style={{ backgroundColor: entry.coverColor || "#6B21A8" }}
                    />
                  )}
                  <h3
                    className="text-lg font-semibold text-on-surface cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/series/${entry.seriesId}`)}
                  >
                    {entry.seriesTitle}
                  </h3>
                  <span className="text-xs text-on-surface-variant/50 ml-auto">
                    {countTeam(entry)} members
                  </span>
                </div>

                {/* Tantou Editor */}
                <div className="mt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-on-surface-variant/60">
                      Lead Editor ({entry.tantouEditor ? 1 : 0})
                    </span>
                    {isOwner && !entry.tantouEditor && (
                      <button
                        onClick={() => openInviteDialog(entry.seriesId, "TANTOU_EDITOR")}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <UserPlus size={14} /> Invite
                      </button>
                    )}
                  </div>
                  {entry.tantouEditor ? (
                    <MemberRow
                      member={entry.tantouEditor}
                      label="Lead Editor"
                      onRemove={isOwner ? () => handleRemoveTantou(entry.seriesId, entry.tantouEditor) : undefined}
                    />
                  ) : (
                    <div className="text-xs text-on-surface-variant/50 py-2 px-4">
                      No lead editor assigned.
                    </div>
                  )}
                </div>

                {/* Assistants */}
                <div className="mt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-on-surface-variant/60">
                      Assistants ({(entry.assistants || []).length})
                    </span>
                    {isOwner && (
                      <button
                        onClick={() => openInviteDialog(entry.seriesId, "ASSISTANT")}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <UserPlus size={14} /> Invite
                      </button>
                    )}
                  </div>
                  {(entry.assistants || []).length === 0 ? (
                    <div className="text-xs text-on-surface-variant/50 py-2 px-4">
                      No assistants assigned.
                    </div>
                  ) : (
                    (entry.assistants || []).map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        label="Assistant"
                        onRemove={isOwner ? () => handleRemoveAssistant(entry.seriesId, member) : undefined}
                      />
                    ))
                  )}
                </div>

                {/* Pending Invites */}
                {(entry.pendingInvites || []).length > 0 && showPending && isOwner && (
                  <div className="mt-3 pt-3 border-t border-outline-variant/10">
                    <span className="text-xs text-yellow-400/80 flex items-center gap-1 mb-2">
                      <Clock size={12} /> Pending Invitations
                    </span>
                    {(entry.pendingInvites || []).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between py-2 px-4 rounded-xl bg-yellow-500/5 mb-1"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-sm">⏳</span>
                          <div className="min-w-0">
                            <p className="text-sm text-on-surface truncate">{member.displayName}</p>
                            <p className="text-xs text-on-surface-variant/60 truncate">{member.email}</p>
                          </div>
                          <span className="text-[11px] text-yellow-400/70 font-medium bg-yellow-400/10 px-2 py-0.5 rounded-md">
                            PENDING
                          </span>
                        </div>
                        <span className="text-xs text-on-surface-variant/50">{member.role}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* View Series link */}
                <div className="mt-3 pt-3 border-t border-outline-variant/10">
                  <button
                    onClick={() => navigate(`/series/${entry.seriesId}`)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View Series Details <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog
        open={inviteDialog.open}
        onClose={() => setInviteDialog({ open: false, seriesId: null, role: null })}
        title={`Invite ${inviteDialog.role === "ASSISTANT" ? "Assistant" : "Lead Editor"}`}
        description={`Search and invite a ${inviteDialog.role === "ASSISTANT" ? "assistant" : "lead editor"} to join your team.`}
        size="md"
      >
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
          <input
            value={userSearch}
            onChange={(e) => handleUserSearch(e.target.value)}
            placeholder={`Search ${inviteDialog.role === "ASSISTANT" ? "assistants" : "lead editors"}...`}
            className="w-full bg-surface-container-high text-on-surface border border-outline-variant/30 pl-9 pr-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary/50"
          />
        </div>

        {searching ? (
          <div className="text-center py-4 text-sm text-on-surface-variant/60">Searching...</div>
        ) : userResults.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {userResults.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface-container-high/50 hover:bg-surface-container-high transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{u.displayName}</p>
                  <p className="text-xs text-on-surface-variant/60 truncate">{u.email}</p>
                </div>
                <button
                  onClick={() => handleInvite(u.id)}
                  className="text-xs bg-primary/15 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/25 transition-colors font-medium"
                >
                  Invite
                </button>
              </div>
            ))}
          </div>
        ) : userSearch ? (
          <p className="text-center py-4 text-sm text-on-surface-variant/60">No users found.</p>
        ) : (
          <p className="text-center py-4 text-sm text-on-surface-variant/60">Type a name to search.</p>
        )}

        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={() => setInviteDialog({ open: false, seriesId: null, role: null })}
            className="flex-1 py-3 rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container transition-all text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </Dialog>
    </div>
  )
}

function MemberRow({ member, label, onRemove }) {
  const initials = member.displayName?.charAt(0).toUpperCase() || "?"
  return (
    <div className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-surface-container-high/50 mb-1.5 hover:bg-surface-container-high transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-on-surface truncate">{member.displayName}</p>
          <p className="text-xs text-on-surface-variant/60 truncate">{member.email}</p>
        </div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-on-surface-variant/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
          title={`Remove ${member.displayName}`}
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}
