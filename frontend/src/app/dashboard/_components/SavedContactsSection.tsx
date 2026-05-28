'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Building2, Users, Phone, Mail, Trash2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useSavedContacts, SAVED_CONTACTS_KEYS } from '@/hooks/useSavedContacts'
import { useSubscription } from '@/hooks/useSubscription'
import type { DirectoryEntityType, SavedDirectoryContact } from '@/types/savedDirectoryContact'
import { snapshotCompany } from '@/types/savedDirectoryContact'

type Tab = DirectoryEntityType

function ContactRow({
  contact,
  onRemove,
  isRemoving,
}: {
  contact: SavedDirectoryContact
  onRemove: (id: string) => void
  isRemoving: boolean
}) {
  const snap = contact.snapshot
  const company = snapshotCompany(snap)
  const phone = snap.phone?.trim()
  const email = snap.email?.trim()

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)]">
      <div className="min-w-0">
        <div className="font-semibold text-[var(--text-heading)] truncate">{company}</div>
        <div className="text-xs text-[var(--text-secondary)] mt-0.5 capitalize">
          {contact.entity_type}
          {snap.state ? ` · ${snap.state}` : ''}
        </div>
        <div className="flex flex-wrap gap-3 mt-2 text-sm">
          {phone && (
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-1 text-[var(--accent-sky)] hover:underline"
            >
              <Phone className="w-3.5 h-3.5" />
              {phone}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1 text-[var(--accent-sky)] hover:underline truncate max-w-[220px]"
            >
              <Mail className="w-3.5 h-3.5 shrink-0" />
              {email}
            </a>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(contact.id)}
        disabled={isRemoving}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-heading)] hover:border-[var(--border-strong)] disabled:opacity-50 shrink-0"
        aria-label={`Remove ${company}`}
      >
        <Trash2 className="w-4 h-4" />
        Remove
      </button>
    </div>
  )
}

export function SavedContactsSection() {
  const [tab, setTab] = useState<Tab>('lender')
  const { isPaidPro, isLoading: subscriptionLoading } = useSubscription()
  const { data, isLoading, isError } = useSavedContacts()
  const queryClient = useQueryClient()
  const [removingId, setRemovingId] = useState<string | null>(null)

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/saved-contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_CONTACTS_KEYS.all })
    },
  })

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    try {
      await removeMutation.mutateAsync(id)
    } finally {
      setRemovingId(null)
    }
  }

  const items = (data?.items ?? []).filter((c) => c.entity_type === tab)
  const lenderCount = (data?.items ?? []).filter((c) => c.entity_type === 'lender').length
  const buyerCount = (data?.items ?? []).filter((c) => c.entity_type === 'buyer').length
  const totalSaved = data?.total ?? 0

  if (subscriptionLoading) return null

  return (
    <section id="saved-contacts" className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-heading)] flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[var(--accent-sky)]" />
            Saved Contacts
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Lenders and cash buyers you saved from the directories.
          </p>
        </div>
        {isPaidPro && totalSaved > 0 && (
          <div className="text-xs font-mono text-[var(--text-tertiary)]">
            {totalSaved} saved
          </div>
        )}
      </div>

      {!isPaidPro ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 text-center">
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            Save lenders and buyers from the directories with a paid Pro subscription.
          </p>
          <Link
            href="/lenders"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-sky)] hover:underline"
          >
            Browse directories
          </Link>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setTab('lender')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === 'lender'
                  ? 'bg-[var(--accent-sky)] text-[var(--text-inverse)]'
                  : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Lenders ({lenderCount})
            </button>
            <button
              type="button"
              onClick={() => setTab('buyer')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === 'buyer'
                  ? 'bg-[var(--accent-sky)] text-[var(--text-inverse)]'
                  : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
              }`}
            >
              <Users className="w-4 h-4" />
              Buyers ({buyerCount})
            </button>
          </div>

          {isLoading && (
            <div className="text-sm text-[var(--text-secondary)] py-8 text-center">Loading saved contacts…</div>
          )}

          {isError && (
            <div className="text-sm text-red-400 py-8 text-center">
              Could not load saved contacts. Refresh and try again.
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-center">
              <p className="text-[var(--text-secondary)] text-sm mb-4">
                No saved {tab === 'lender' ? 'lenders' : 'buyers'} yet.
              </p>
              <Link
                href={tab === 'lender' ? '/lenders' : '/directory'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-sky)] text-[var(--text-inverse)] text-sm font-semibold hover:opacity-90"
              >
                {tab === 'lender' ? 'Browse lenders' : 'Browse buyers'}
              </Link>
            </div>
          )}

          {!isLoading && !isError && items.length > 0 && (
            <div className="flex flex-col gap-3">
              {items.map((contact) => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  onRemove={handleRemove}
                  isRemoving={removingId === contact.id}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
