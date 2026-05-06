'use client'

/**
 * Contacts panel — name, role, phone, email, company per contact, with
 * tap-to-call/email and inline edit. Used in the slide-over (legacy) and
 * the deal workflow page.
 */

import { useState } from 'react'
import { Mail, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import {
  useContacts,
  useCreateContact,
  useDeleteContact,
  useUpdateContact,
} from '@/hooks/useContacts'
import {
  CONTACT_ROLES_ORDERED,
  CONTACT_ROLE_LABELS,
  type ContactRole,
  type PropertyContact,
} from '@/types/contact'

export function ContactsPanel({ propertyId }: { propertyId: string }) {
  const contacts = useContacts(propertyId)
  const create = useCreateContact(propertyId)
  const update = useUpdateContact(propertyId)
  const del = useDeleteContact(propertyId)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState<ContactRole>('listing_agent')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')

  const items = contacts.data ?? []

  function reset() {
    setName('')
    setRole('listing_agent')
    setPhone('')
    setEmail('')
    setCompany('')
    setShowForm(false)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    create.mutate(
      {
        name: name.trim(),
        role,
        phone: phone.trim() || null,
        email: email.trim() || null,
        company: company.trim() || null,
      },
      { onSuccess: reset },
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {contacts.isLoading ? (
          <p className="text-sm text-[var(--text-label)] text-center py-6">Loading…</p>
        ) : contacts.isError ? (
          <p className="text-sm text-[var(--status-negative)] text-center py-6">
            Couldn&apos;t load contacts.{' '}
            <button onClick={() => contacts.refetch()} className="underline">
              Retry
            </button>
          </p>
        ) : items.length === 0 && !showForm ? (
          <div className="flex flex-col items-center text-center py-8 px-4 gap-3">
            <p className="text-sm text-[var(--text-label)]">
              No contacts yet — add the seller, agent, or anyone else involved with this deal.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-default)] text-[var(--text-body)] hover:bg-[var(--hover-overlay)] hover:border-[var(--border-focus)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add a contact
            </button>
          </div>
        ) : (
          items.map((c) => (
            <ContactRow
              key={c.id}
              contact={c}
              onDelete={() => del.mutate(c.id)}
              onEdit={(body) => update.mutate({ contactId: c.id, body })}
            />
          ))
        )}
      </div>

      {showForm ? (
        <form
          onSubmit={submit}
          className="border-t border-[var(--border-default)] px-3 py-3 space-y-2 shrink-0"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              required
              className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-label)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sky-dim)] focus:border-[var(--border-focus)]"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ContactRole)}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-2 text-sm text-[var(--text-heading)]"
            >
              {CONTACT_ROLES_ORDERED.map((r) => (
                <option key={r} value={r}>
                  {CONTACT_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-label)]"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-label)]"
            />
          </div>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company (optional)"
            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-label)]"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={reset}
              className="px-3 py-1.5 text-xs font-semibold text-[var(--text-label)] hover:text-[var(--text-body)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || create.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-sky)] text-[var(--text-inverse)] hover:bg-[var(--accent-sky-light)] disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Save contact
            </button>
          </div>
        </form>
      ) : items.length > 0 ? (
        <div className="border-t border-[var(--border-default)] px-3 py-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-default)] text-[var(--text-body)] hover:bg-[var(--hover-overlay)] hover:border-[var(--border-focus)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add another contact
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ContactRow({
  contact,
  onDelete,
  onEdit,
}: {
  contact: PropertyContact
  onDelete: () => void
  onEdit: (body: {
    name?: string
    role?: ContactRole
    phone?: string | null
    email?: string | null
    company?: string | null
  }) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(contact.name)
  const [role, setRole] = useState<ContactRole>(contact.role)
  const [phone, setPhone] = useState(contact.phone ?? '')
  const [email, setEmail] = useState(contact.email ?? '')
  const [company, setCompany] = useState(contact.company ?? '')

  function startEdit() {
    setName(contact.name)
    setRole(contact.role)
    setPhone(contact.phone ?? '')
    setEmail(contact.email ?? '')
    setCompany(contact.company ?? '')
    setEditing(true)
  }

  function saveEdit() {
    if (!name.trim()) return
    const body: {
      name?: string
      role?: ContactRole
      phone?: string | null
      email?: string | null
      company?: string | null
    } = {}
    if (name.trim() !== contact.name) body.name = name.trim()
    if (role !== contact.role) body.role = role
    const newPhone = phone.trim() || null
    if (newPhone !== contact.phone) body.phone = newPhone
    const newEmail = email.trim() || null
    if (newEmail !== contact.email) body.email = newEmail
    const newCompany = company.trim() || null
    if (newCompany !== contact.company) body.company = newCompany
    if (Object.keys(body).length > 0) onEdit(body)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="rounded-lg p-2.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            autoFocus
            className="flex-1 rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ContactRole)}
            className="rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
          >
            {CONTACT_ROLES_ORDERED.map((r) => (
              <option key={r} value={r}>
                {CONTACT_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className="flex-1 rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="flex-1 rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
          />
        </div>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company"
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
            disabled={!name.trim()}
            className="px-3 py-1 rounded text-xs font-semibold bg-[var(--accent-sky)] text-[var(--text-inverse)] hover:bg-[var(--accent-sky-light)] disabled:opacity-50"
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
            <p className="text-sm font-semibold text-[var(--text-heading)] truncate">
              {contact.name}
            </p>
            <span className="inline-flex text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--color-sky-dim)] text-[var(--accent-sky)]">
              {CONTACT_ROLE_LABELS[contact.role]}
            </span>
          </div>
          {contact.company && (
            <p className="text-[11px] text-[var(--text-label)] truncate">{contact.company}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="inline-flex items-center gap-1 text-xs text-[var(--accent-sky)] hover:underline"
              >
                <Phone className="w-3 h-3" />
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-1 text-xs text-[var(--accent-sky)] hover:underline truncate max-w-[200px]"
              >
                <Mail className="w-3 h-3" />
                {contact.email}
              </a>
            )}
          </div>
          {contact.notes && (
            <p className="mt-1 text-[11px] text-[var(--text-label)] whitespace-pre-wrap">
              {contact.notes}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={startEdit}
            aria-label="Edit contact"
            className="p-1 rounded text-[var(--text-label)] hover:text-[var(--accent-sky)]"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete contact"
            className="p-1 rounded text-[var(--text-label)] hover:text-[var(--status-negative)]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
