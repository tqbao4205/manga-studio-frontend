import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Check, X, Loader, Users, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../../app/stores/authStore'
import { useUIStore } from '../../app/stores/uiStore'
import seriesService from '../../services/seriesService'
import { EmptyState } from '../../shared/components/shared/EmptyState'
import { PageLoading } from '../../shared/components/shared/LoadingSpinner'

const statusConfig = {
  PENDING: {
    label: 'Pending',
    dot: 'bg-yellow-400',
    bg: 'bg-yellow-500/5 border-yellow-500/20',
  },
  ACCEPTED: {
    label: 'Accepted',
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-500/5 border-emerald-500/20',
  },
  REJECTED: {
    label: 'Rejected',
    dot: 'bg-red-400',
    bg: 'bg-red-500/5 border-red-500/20',
  },
}

export function TantouInvitationsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const invitationTrigger = useAuthStore((s) => s.invitationTrigger)
  const addToast = useUIStore((s) => s.addToast)

  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)

  const fetchInvitations = async () => {
    setLoading(true)
    try {
      const data = await seriesService.getMyTantouInvitations()
      setInvitations(Array.isArray(data) ? data : data.content || [])
    } catch {
      setInvitations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvitations()
  }, [invitationTrigger])

  const handleRespond = async (invitationId, status) => {
    setActionId(invitationId)
    try {
      await seriesService.respondTantouInvitation(invitationId, status)
      addToast({
        type: 'success',
        title: status === 'ACCEPTED' ? 'Invitation accepted' : 'Invitation declined',
        message: status === 'ACCEPTED'
          ? 'You are now the lead editor for this series.'
          : 'The invitation has been declined.',
      })
      fetchInvitations()
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err.response?.data?.message || err.message })
    } finally {
      setActionId(null)
    }
  }

  if (loading) return <PageLoading />

  return (
    <div className="max-w-3xl mx-auto space-y-panel-gap pb-12 pt-container-padding">
      <div className="mb-10">
        <h1 className="text-headline-lg font-semibold text-on-surface mb-2">Lead Editor Invitations</h1>
        <p className="text-base text-on-surface-variant">
          Review and respond to lead editor invitations.
        </p>
      </div>

      {invitations.length === 0 ? (
        <EmptyState
          icon={<Mail size={32} />}
          title="No lead editor invitations"
          description="You don't have any pending lead editor invitations at the moment."
          action={
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-bold hover:brightness-110 transition-all"
            >
              Back to Dashboard
              <ArrowRight size={16} />
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {invitations.map((inv) => {
            const status = inv.status || 'PENDING'
            const cfg = statusConfig[status] || statusConfig.PENDING
            const seriesTitle = inv.series?.title || 'Unknown Series'
            const mangakaName = inv.invitedBy?.displayName || 'Unknown'
            const invId = inv.id

            return (
              <div
                key={invId}
                className={`bg-surface-container border rounded-xl p-5 shadow-sm transition-all ${cfg.bg}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Users size={20} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-on-surface truncate">
                        {seriesTitle}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          {mangakaName[0]}
                        </div>
                        <p className="text-sm text-on-surface-variant truncate">
                          Invited by <span className="font-medium text-on-surface">{mangakaName}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        <span className="text-xs font-medium text-on-surface-variant">{cfg.label}</span>
                      </div>
                    </div>
                  </div>

                  {status === 'PENDING' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRespond(invId, 'REJECTED')}
                        disabled={actionId === invId}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-on-surface-variant border border-outline-variant/40 rounded-lg hover:border-error/40 hover:text-error hover:bg-error/5 disabled:opacity-40 transition-all"
                      >
                        {actionId === invId ? <Loader size={14} className="animate-spin" /> : <X size={14} />}
                        Decline
                      </button>
                      <button
                        onClick={() => handleRespond(invId, 'ACCEPTED')}
                        disabled={actionId === invId}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-on-primary bg-primary rounded-lg hover:brightness-110 disabled:opacity-40 transition-all"
                      >
                        {actionId === invId ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                        Accept
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
