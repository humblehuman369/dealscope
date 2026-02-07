'use client'

import {
  Building2, MapPin, Phone, Globe, Linkedin, Instagram, Twitter,
  Plus, Trash2, Save,
} from 'lucide-react'
import type { BusinessFormData, PhoneNumber } from './types'
import { US_STATES } from './types'

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
      <h3 className="text-lg font-semibold text-navy-900 dark:text-white flex items-center gap-2">
        <Building2 className="w-5 h-5 text-brand-500" />
        Business Profile
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        This information will be used for LOIs, contracts, and professional networking.
      </p>

      {/* Business Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Business Name
          </label>
          <input
            type="text"
            value={businessForm.business_name}
            onChange={(e) => setBusinessForm(prev => ({ ...prev, business_name: e.target.value }))}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g., ABC Investments LLC"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Business Type
          </label>
          <select
            value={businessForm.business_type}
            onChange={(e) => setBusinessForm(prev => ({ ...prev, business_type: e.target.value }))}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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

      {/* Business Address */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Business Address
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              value={businessForm.business_address_street}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, business_address_street: e.target.value }))}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Street Address"
            />
          </div>
          <input
            type="text"
            value={businessForm.business_address_city}
            onChange={(e) => setBusinessForm(prev => ({ ...prev, business_address_city: e.target.value }))}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="City"
          />
          <div className="grid grid-cols-2 gap-4">
            <select
              value={businessForm.business_address_state}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, business_address_state: e.target.value }))}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="ZIP"
            />
          </div>
        </div>
      </div>

      {/* Phone Numbers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone Numbers
          </h4>
          <button
            onClick={onAddPhone}
            className="text-brand-500 hover:text-brand-600 text-sm font-medium flex items-center gap-1"
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
                className="w-28 px-3 py-2 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm text-navy-900 dark:text-white"
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
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="(555) 555-5555"
              />
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={phone.primary}
                  onChange={(e) => onUpdatePhone(index, 'primary', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-brand-500 focus:ring-brand-500"
                />
                Primary
              </label>
              <button
                onClick={() => onRemovePhone(index)}
                className="p-2 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {businessForm.phone_numbers.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">No phone numbers added</p>
          )}
        </div>
      </div>

      {/* Social Links */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Social & Marketing Links
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-400" />
            <input
              type="url"
              value={businessForm.social_links.website || ''}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, social_links: { ...prev.social_links, website: e.target.value } }))}
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="https://yourwebsite.com"
            />
          </div>
          <div className="flex items-center gap-2">
            <Linkedin className="w-5 h-5 text-[#0077b5]" />
            <input
              type="url"
              value={businessForm.social_links.linkedin || ''}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, social_links: { ...prev.social_links, linkedin: e.target.value } }))}
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="LinkedIn URL"
            />
          </div>
          <div className="flex items-center gap-2">
            <Instagram className="w-5 h-5 text-[#e4405f]" />
            <input
              type="url"
              value={businessForm.social_links.instagram || ''}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, social_links: { ...prev.social_links, instagram: e.target.value } }))}
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Instagram URL"
            />
          </div>
          <div className="flex items-center gap-2">
            <Twitter className="w-5 h-5 text-[#1da1f2]" />
            <input
              type="url"
              value={businessForm.social_links.twitter || ''}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, social_links: { ...prev.social_links, twitter: e.target.value } }))}
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Twitter/X URL"
            />
          </div>
        </div>
      </div>

      {/* License Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Real Estate License # (optional)
          </label>
          <input
            type="text"
            value={businessForm.license_number}
            onChange={(e) => setBusinessForm(prev => ({ ...prev, license_number: e.target.value }))}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="License number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            License State
          </label>
          <select
            value={businessForm.license_state}
            onChange={(e) => setBusinessForm(prev => ({ ...prev, license_state: e.target.value }))}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Select state...</option>
            {US_STATES.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Professional Bio
        </label>
        <textarea
          value={businessForm.bio}
          onChange={(e) => setBusinessForm(prev => ({ ...prev, bio: e.target.value }))}
          rows={4}
          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          placeholder="Tell others about your investment experience and expertise..."
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save Business Profile
        </button>
      </div>
    </div>
  )
}
