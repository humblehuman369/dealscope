'use client'

/**
 * Offers panel — the offer history for a deal. Each row is one offer:
 * amount, status, dates, seller counter, and notes. Gives the pipeline's
 * Negotiating / Under Contract stages a tracked record behind them.
 */

import { useState } from 'react'
import { BadgeDollarSign, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCreateOffer, useDeleteOffer, useOffers, useUpdateOffer } from '@/hooks/useOffers'
import type { OfferStatus, PropertyOffer } from '@/types/offer'

const STATUS_ORDER: OfferStatus[] = [
  'draft',
  'submitted',
  'countered',
  'accepted',
  'rejected',
  'withdrawn',
  'expired',
]

const STATUS_LABELS: Record<OfferStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  countered: 'Countered',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
}

const STATUS_CHIP: Record<OfferStatus, string> = {
  draft: 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] ring-[var(--border-default)]',
  submitted: 'bg-[var(--color-sky-dim)] text-[var(--accent-sky)] ring-[var(--accent-sky)]/30',
  countered: 'bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300',
  accepted: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
  rejected: 'bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300',
  withdrawn: 'bg-[var(--surface-elevated)] text-[var(--text-label)] ring-[var(--border-default)]',
  expired: 'bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300',
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toNumber(v: string | number | null): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

export function OffersPanel({ propertyId }: { propertyId: string }) {
  const offers = useOffers(propertyId)
  const create = useCreateOffer(propertyId)
  const update = useUpdateOffer(propertyId)
  const del = useDeleteOffer(propertyId)

  const [showForm, setShowForm] = useState(false)

  const items = offers.data ?? []

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {offers.isLoading ? (
          <p className="text-sm text-[var(--text-label)] text-center py-6">Loading…</p>
        ) : offers.isError ? (
          <p className="text-sm text-[var(--status-negative)] text-center py-6">
            Couldn&apos;t load offers.{' '}
            <button onClick={() => offers.refetch()} className="underline">
              Retry
            </button>
          </p>
        ) : items.length === 0 && !showForm ? (
          <div className="flex flex-col items-center text-center py-8 px-4 gap-3">
            <BadgeDollarSign className="w-8 h-8 text-[var(--text-label)]" aria-hidden />
            <p className="text-sm text-[var(--text-label)]">
              No offers logged yet — track what you offered, when, and how the seller responded.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-default)] text-[var(--text-body)] hover:bg-[var(--hover-overlay)] hover:border-[var(--border-focus)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Log an offer
            </button>
          </div>
        ) : (
          items.map((o) => (
            <OfferRow
              key={o.id}
              offer={o}
              onDelete={() => del.mutate(o.id)}
              onEdit={(body) => update.mutate({ offerId: o.id, body })}
            />
          ))
        )}
      </div>

      {showForm ? (
        <OfferForm
          isPending={create.isPending}
          onCancel={() => setShowForm(false)}
          onSubmit={(body) => create.mutate(body, { onSuccess: () => setShowForm(false) })}
        />
      ) : items.length > 0 ? (
        <div className="border-t border-[var(--border-default)] px-3 py-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-default)] text-[var(--text-body)] hover:bg-[var(--hover-overlay)] hover:border-[var(--border-focus)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Log another offer
          </button>
        </div>
      ) : null}
    </div>
  )
}

// ───────────────────────────────────────────────────────
// Add form

function OfferForm({
  onSubmit,
  onCancel,
  isPending,
}: {
  onSubmit: (body: {
    amount: number
    status: OfferStatus
    offer_date: string | null
    expires_at: string | null
    notes: string | null
  }) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<OfferStatus>('submitted')
  const [offerDate, setOfferDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [expiresAt, setExpiresAt] = useState('')
  const [notes, setNotes] = useState('')

  const amountNum = parseFloat(amount)
  const valid = Number.isFinite(amountNum) && amountNum > 0

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    onSubmit({
      amount: amountNum,
      status,
      offer_date: offerDate || null,
      expires_at: expiresAt || null,
      notes: notes.trim() || null,
    })
  }

  return (
    <form
      onSubmit={submit}
      className="border-t border-[var(--border-default)] px-3 py-3 space-y-2 shrink-0"
    >
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          min="1"
          step="1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Offer amount ($)"
          required
          autoFocus
          className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-label)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sky-dim)] focus:border-[var(--border-focus)]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OfferStatus)}
          aria-label="Offer status"
          className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-2 text-sm text-[var(--text-heading)]"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <label className="flex-1 text-[11px] text-[var(--text-label)]">
          Offer date
          <input
            type="date"
            value={offerDate}
            onChange={(e) => setOfferDate(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-heading)]"
          />
        </label>
        <label className="flex-1 text-[11px] text-[var(--text-label)]">
          Expires (optional)
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-heading)]"
          />
        </label>
      </div>
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes — terms, contingencies, agent feedback (optional)"
        className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-label)]"
      />
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-semibold text-[var(--text-label)] hover:text-[var(--text-body)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!valid || isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-sky)] text-[var(--text-inverse)] hover:bg-[var(--accent-sky-light)] disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Save offer
        </button>
      </div>
    </form>
  )
}

// ───────────────────────────────────────────────────────
// Row

function OfferRow({
  offer,
  onDelete,
  onEdit,
}: {
  offer: PropertyOffer
  onDelete: () => void
  onEdit: (body: {
    amount?: number
    status?: OfferStatus
    counter_amount?: number | null
    notes?: string | null
  }) => void
}) {
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<OfferStatus>(offer.status)
  const [counter, setCounter] = useState('')
  const [notes, setNotes] = useState('')

  const amountNum = toNumber(offer.amount)
  const counterNum = toNumber(offer.counter_amount)

  function startEdit() {
    setAmount(amountNum != null ? String(amountNum) : '')
    setStatus(offer.status)
    setCounter(counterNum != null ? String(counterNum) : '')
    setNotes(offer.notes ?? '')
    setEditing(true)
  }

  function saveEdit() {
    const body: {
      amount?: number
      status?: OfferStatus
      counter_amount?: number | null
      notes?: string | null
    } = {}
    const newAmount = parseFloat(amount)
    if (Number.isFinite(newAmount) && newAmount > 0 && newAmount !== amountNum) {
      body.amount = newAmount
    }
    if (status !== offer.status) body.status = status
    const newCounter = counter.trim() === '' ? null : parseFloat(counter)
    if (newCounter !== counterNum && (newCounter === null || Number.isFinite(newCounter))) {
      body.counter_amount = newCounter
    }
    const newNotes = notes.trim() || null
    if (newNotes !== offer.notes) body.notes = newNotes
    if (Object.keys(body).length > 0) onEdit(body)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="rounded-lg p-2.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] space-y-2">
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Offer amount"
            autoFocus
            className="flex-1 rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OfferStatus)}
            aria-label="Offer status"
            className="rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <input
          type="number"
          inputMode="decimal"
          min="1"
          value={counter}
          onChange={(e) => setCounter(e.target.value)}
          placeholder="Seller counter ($, optional)"
          className="w-full rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          className="w-full rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
        />
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-2 py-1 text-xs font-semibold text-[var(--text-label)] hover:text-[var(--text-body)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveEdit}
            className="px-3 py-1 rounded text-xs font-semibold bg-[var(--accent-sky)] text-[var(--text-inverse)] hover:bg-[var(--accent-sky-light)]"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group rounded-lg p-2.5 hover:bg-[var(--hover-overlay)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold tabular-nums text-[var(--text-heading)]">
              {amountNum != null ? fmtCurrency(amountNum) : '—'}
            </p>
            <span
              className={`inline-flex text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${STATUS_CHIP[offer.status]}`}
            >
              {STATUS_LABELS[offer.status]}
            </span>
            {counterNum != null && (
              <span className="text-[11px] text-[var(--text-label)] tabular-nums">
                Counter: {fmtCurrency(counterNum)}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-label)]">
            {fmtDate(offer.offer_date) && <span>Offered {fmtDate(offer.offer_date)}</span>}
            {fmtDate(offer.expires_at) && <span>Expires {fmtDate(offer.expires_at)}</span>}
          </div>
          {offer.notes && (
            <p className="mt-1 text-[11px] text-[var(--text-label)] whitespace-pre-wrap">
              {offer.notes}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={startEdit}
            aria-label="Edit offer"
            className="p-1 rounded text-[var(--text-label)] hover:text-[var(--accent-sky)]"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete offer"
            className="p-1 rounded text-[var(--text-label)] hover:text-[var(--status-negative)]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
