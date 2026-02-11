'use client'

import {
  Building2, MapPin, Phone, Globe, Linkedin, Instagram, Twitter,
  Plus, Trash2, Save,
} from 'lucide-react'
import type { BusinessFormData, PhoneNumber } from './types'
import { US_STATES } from './types'

// ===========================================
// Business Tab — Dark Fintech Theme
// ===========================================

// Shared input classes for consistency
const inputClass =
  'w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors'

const selectClass =
  'w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors'

interface BusinessTabProps {
  businessForm: BusinessFormData
  setBusinessForm: React.Dispatch<React.SetStateAction<BusinessFormData>>
  isSaving: boolean
  onSave: () => void
  onAddPhone: () => void
  onRemovePhone: (index: number) => void
  onUpdatePhone: (index: number, field: keyof PhoneNumber, value: string | boolean) => void
}

export function BusinessTab({
  businessForm,
  setBusinessForm,
  isSaving,
  onSave,
  onAddPhone,
  onRemovePhone,
  onUpdatePhone,
}: BusinessTabProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-sky-400" />
        Business Profile
      </h3>
      <p className="text-sm text-slate-400">
        This information will be used for LOIs, contracts, and professional networking.
      </p>

      {/* ── Business Info ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Business Name
          </label>
          <input
            type="text"
            value={businessForm.business_name}
            onChange={(e) => setBusinessForm(prev => ({ ...prev, business_name: e.target.value }))}
            className={inputClass}
            placeholder="e.g., ABC Investments LLC"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Business Type
          </label>
          <select
            value={businessForm.business_type}
            onChange={(e) => setBusinessForm(prev => ({ ...prev, business_type: e.target.value }))}
            className={selectClass}
            style={{ colorScheme: 'dark' }}
          >
            <option value="">Select type...</option>
            <option value="llc">LLC</option>
            <option value="corporation">Corporation</option>
            <option value="sole_proprietor">Sole Proprietor</option>
            <option value="partnership">Partnership</option>
            <option value="trust">Trust</option>
          </select>
        </div>
      </div>

      {/* ── Business Address ────────────────────── */}
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400" />
          Business Address
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              value={businessForm.business_address_street}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, business_address_street: e.target.value }))}
              className={inputClass}
              placeholder="Street Address"
            />
          </div>
          <input
            type="text"
            value={businessForm.business_address_city}
            onChange={(e) => setBusinessForm(prev => ({ ...prev, business_address_city: e.target.value }))}
            className={inputClass}
            placeholder="City"
          />
          <div className="grid grid-cols-2 gap-4">
            <select
              value={businessForm.business_address_state}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, business_address_state: e.target.value }))}
              className={selectClass}
              style={{ colorScheme: 'dark' }}
            >
              <option value="">State</option>
              {US_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            <input
              type="text"
              value={businessForm.business_address_zip}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, business_address_zip: e.target.value }))}
              className={inputClass}
              placeholder="ZIP"
            />
          </div>
        </div>
      </div>

      {/* ── Phone Numbers ───────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400" />
            Phone Numbers
          </h4>
          <button
            onClick={onAddPhone}
            className="text-sky-400 hover:text-sky-300 text-sm font-semibold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Phone
          </button>
        </div>
        <div className="space-y-3">
          {businessForm.phone_numbers.map((phone, index) => (
            <div key={index} className="flex items-center gap-3">
              <select
                value={phone.type}
                onChange={(e) => onUpdatePhone(index, 'type', e.target.value)}
                className="w-28 px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/30 transition-colors"
                style={{ colorScheme: 'dark' }}
              >
                <option value="mobile">Mobile</option>
                <option value="work">Work</option>
                <option value="home">Home</option>
                <option value="fax">Fax</option>
              </select>
              <input
                type="tel"
                value={phone.number}
                onChange={(e) => onUpdatePhone(index, 'number', e.target.value)}
                className="flex-1 px-4 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors"
                placeholder="(555) 555-5555"
              />
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={phone.primary}
                  onChange={(e) => onUpdatePhone(index, 'primary', e.target.checked)}
                  className="rounded border-white/[0.15] bg-white/[0.04] text-sky-500 focus:ring-sky-400/30 focus:ring-offset-0"
                />
                Primary
              </label>
              <button
                onClick={() => onRemovePhone(index)}
                className="p-2 text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {businessForm.phone_numbers.length === 0 && (
            <p className="text-sm text-slate-500 italic">No phone numbers added</p>
          )}
        </div>
      </div>

      {/* ── Social Links ────────────────────────── */}
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-slate-400" />
          Social & Marketing Links
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <input
              type="url"
              value={businessForm.social_links.website || ''}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, social_links: { ...prev.social_links, website: e.target.value } }))}
              className="flex-1 px-4 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors"
              placeholder="https://yourwebsite.com"
            />
          </div>
          <div className="flex items-center gap-2">
            <Linkedin className="w-5 h-5 text-sky-400 flex-shrink-0" />
            <input
              type="url"
              value={businessForm.social_links.linkedin || ''}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, social_links: { ...prev.social_links, linkedin: e.target.value } }))}
              className="flex-1 px-4 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors"
              placeholder="LinkedIn URL"
            />
          </div>
          <div className="flex items-center gap-2">
            <Instagram className="w-5 h-5 text-[#e4405f] flex-shrink-0" />
            <input
              type="url"
              value={businessForm.social_links.instagram || ''}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, social_links: { ...prev.social_links, instagram: e.target.value } }))}
              className="flex-1 px-4 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors"
              placeholder="Instagram URL"
            />
          </div>
          <div className="flex items-center gap-2">
            <Twitter className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              type="url"
              value={businessForm.social_links.twitter || ''}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, social_links: { ...prev.social_links, twitter: e.target.value } }))}
              className="flex-1 px-4 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors"
              placeholder="Twitter/X URL"
            />
          </div>
        </div>
      </div>

      {/* ── License Info ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Real Estate License # <span className="text-slate-500">(optional)</span>
          </label>
          <input
            type="text"
            value={businessForm.license_number}
            onChange={(e) => setBusinessForm(prev => ({ ...prev, license_number: e.target.value }))}
            className={inputClass}
            placeholder="License number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            License State
          </label>
          <select
            value={businessForm.license_state}
            onChange={(e) => setBusinessForm(prev => ({ ...prev, license_state: e.target.value }))}
            className={selectClass}
            style={{ colorScheme: 'dark' }}
          >
            <option value="">Select state...</option>
            {US_STATES.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Bio ─────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Professional Bio
        </label>
        <textarea
          value={businessForm.bio}
          onChange={(e) => setBusinessForm(prev => ({ ...prev, bio: e.target.value }))}
          rows={4}
          className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors resize-none"
          placeholder="Tell others about your investment experience and expertise..."
        />
      </div>

      {/* ── Save ────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:bg-sky-500 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]"
        >
          {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save Business Profile
        </button>
      </div>
    </div>
  )
}
