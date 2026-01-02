'use client'

/**
 * Generate Letter of Intent (LOI) Modal
 * 
 * This is InvestIQ's competitive edge: Analysis → Action in one click.
 * Allows users to generate professional LOIs directly from wholesale analysis.
 */

import { useState, useEffect } from 'react'
import { X, FileText, Download, Copy, Check, ChevronDown, ChevronUp, Mail, AlertCircle, Loader2, Building2, User, Calendar, DollarSign, Shield, Sparkles } from 'lucide-react'
import { api, GenerateLOIRequest, LOIDocument, LOIPropertyInfo, LOIBuyerInfo, LOITerms } from '@/lib/api'

interface PropertyData {
  address: string
  city: string
  state: string
  zip_code: string
  county?: string
  parcel_id?: string
  property_type?: string
  bedrooms?: number
  bathrooms?: number
  square_footage?: number
  year_built?: number
}

interface WholesaleCalcData {
  mao: number
  arv: number
  rehabCost: number
  spreadFromPurchase?: number
  isPurchaseBelowMAO: boolean
}

interface GenerateLOIModalProps {
  isOpen: boolean
  onClose: () => void
  propertyData: PropertyData
  wholesaleCalc: WholesaleCalcData
  purchasePrice?: number
}

const CONTINGENCY_OPTIONS = [
  { id: 'inspection', label: 'Property Inspection', description: 'Buyer can inspect and back out if unsatisfied' },
  { id: 'title', label: 'Clear Title', description: 'Seller must provide marketable title' },
  { id: 'financing', label: 'Financing', description: 'Subject to obtaining financing' },
  { id: 'appraisal', label: 'Appraisal', description: 'Property must appraise at purchase price' },
  { id: 'partner_approval', label: 'Partner Approval', description: 'Subject to partner/investor approval' },
  { id: 'attorney_review', label: 'Attorney Review', description: '3-day attorney review period' },
]

export function GenerateLOIModal({ isOpen, onClose, propertyData, wholesaleCalc, purchasePrice }: GenerateLOIModalProps) {
  // Buyer info state
  const [buyerName, setBuyerName] = useState('')
  const [buyerCompany, setBuyerCompany] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  
  // Terms state
  const [offerPrice, setOfferPrice] = useState(wholesaleCalc.mao)
  const [earnestMoney, setEarnestMoney] = useState(1000)
  const [inspectionDays, setInspectionDays] = useState(14)
  const [closingDays, setClosingDays] = useState(30)
  const [expirationDays, setExpirationDays] = useState(3)
  const [includeAssignment, setIncludeAssignment] = useState(true)
  const [contingencies, setContingencies] = useState<string[]>(['inspection', 'title'])
  const [additionalTerms, setAdditionalTerms] = useState('')
  
  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedLOI, setGeneratedLOI] = useState<LOIDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  // Load saved preferences on mount
  useEffect(() => {
    const savedBuyer = localStorage.getItem('investiq_loi_buyer')
    if (savedBuyer) {
      try {
        const buyer = JSON.parse(savedBuyer)
        setBuyerName(buyer.name || '')
        setBuyerCompany(buyer.company || '')
        setBuyerEmail(buyer.email || '')
        setBuyerPhone(buyer.phone || '')
      } catch {
        // Ignore parsing errors
      }
    }
  }, [])
  
  // Update offer price when MAO changes
  useEffect(() => {
    setOfferPrice(wholesaleCalc.mao)
  }, [wholesaleCalc.mao])
  
  const toggleContingency = (id: string) => {
    setContingencies(prev => 
      prev.includes(id) 
        ? prev.filter(c => c !== id)
        : [...prev, id]
    )
  }
  
  const handleGenerate = async () => {
    if (!buyerName.trim()) {
      setError('Please enter your name')
      return
    }
    
    if (offerPrice <= 0) {
      setError('Please enter a valid offer price')
      return
    }
    
    setError(null)
    setIsGenerating(true)
    
    // Save buyer info for future use
    localStorage.setItem('investiq_loi_buyer', JSON.stringify({
      name: buyerName,
      company: buyerCompany,
      email: buyerEmail,
      phone: buyerPhone,
    }))
    
    try {
      const request: GenerateLOIRequest = {
        buyer: {
          name: buyerName,
          company: buyerCompany || undefined,
          email: buyerEmail || undefined,
          phone: buyerPhone || undefined,
        },
        property_info: {
          address: propertyData.address,
          city: propertyData.city,
          state: propertyData.state || 'FL',
          zip_code: propertyData.zip_code,
          county: propertyData.county,
          parcel_id: propertyData.parcel_id,
          property_type: propertyData.property_type,
          bedrooms: propertyData.bedrooms,
          bathrooms: propertyData.bathrooms,
          square_footage: propertyData.square_footage,
          year_built: propertyData.year_built,
        },
        terms: {
          offer_price: offerPrice,
          earnest_money: earnestMoney,
          earnest_money_holder: 'Title Company',
          inspection_period_days: inspectionDays,
          closing_period_days: closingDays,
          offer_expiration_days: expirationDays,
          allow_assignment: includeAssignment,
          contingencies: contingencies,
          is_cash_offer: true,
          seller_concessions: 0,
          additional_terms: additionalTerms || undefined,
        },
        analysis: {
          arv: wholesaleCalc.arv,
          estimated_rehab: wholesaleCalc.rehabCost,
          max_allowable_offer: wholesaleCalc.mao,
          include_in_loi: false,
        },
        format: 'pdf',
        include_cover_letter: true,
        professional_letterhead: true,
        include_signature_lines: true,
      }
      
      const result = await api.loi.generate(request)
      setGeneratedLOI(result)
      
    } catch (err) {
      console.error('LOI generation failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate LOI')
    } finally {
      setIsGenerating(false)
    }
  }
  
  const handleDownloadPDF = () => {
    if (!generatedLOI?.pdf_base64) return
    
    // Convert base64 to blob and download
    const byteCharacters = atob(generatedLOI.pdf_base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'application/pdf' })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `LOI_${propertyData.address.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}_${generatedLOI.id}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  const handleCopyText = async () => {
    if (!generatedLOI?.content_text) return
    
    try {
      await navigator.clipboard.writeText(generatedLOI.content_text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = generatedLOI.content_text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Generate Letter of Intent</h2>
              <p className="text-sm text-cyan-100">Professional LOI for wholesale deal</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Property Summary */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-slate-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{propertyData.address}</h3>
                <p className="text-sm text-slate-600">{propertyData.city}, {propertyData.state} {propertyData.zip_code}</p>
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  {propertyData.bedrooms && <span>{propertyData.bedrooms} bed</span>}
                  {propertyData.bathrooms && <span>{propertyData.bathrooms} bath</span>}
                  {propertyData.square_footage && <span>{propertyData.square_footage.toLocaleString()} sqft</span>}
                  {propertyData.year_built && <span>Built {propertyData.year_built}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">70% Rule MAO</div>
                <div className="text-lg font-bold text-cyan-600">{formatCurrency(wholesaleCalc.mao)}</div>
              </div>
            </div>
          </div>
          
          {!generatedLOI ? (
            <>
              {/* Buyer Information */}
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <User className="w-4 h-4" />
                  Buyer Information
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Your Name *</label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="John Smith"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Company / LLC</label>
                    <input
                      type="text"
                      value={buyerCompany}
                      onChange={(e) => setBuyerCompany(e.target.value)}
                      placeholder="Smith Investments LLC"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                    />
                  </div>
                </div>
              </div>
              
              {/* Offer Terms */}
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <DollarSign className="w-4 h-4" />
                  Offer Terms
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Offer Price *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Pre-filled from 70% rule MAO</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Earnest Money</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        value={earnestMoney}
                        onChange={(e) => setEarnestMoney(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Inspection Period</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={inspectionDays}
                        onChange={(e) => setInspectionDays(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">days</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Closing Period</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={closingDays}
                        onChange={(e) => setClosingDays(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">days</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Assignment Clause - Highlighted for Wholesale */}
              <div className={`rounded-xl p-4 border-2 transition-colors ${includeAssignment ? 'bg-cyan-50 border-cyan-300' : 'bg-slate-50 border-slate-200'}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAssignment}
                    onChange={(e) => setIncludeAssignment(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">Include Assignment Clause</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-cyan-600 text-white rounded-full font-medium">RECOMMENDED</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      "Buyer and/or assigns" - Essential for wholesale deals. Allows you to assign the contract to an end buyer.
                    </p>
                  </div>
                </label>
              </div>
              
              {/* Advanced Options */}
              <div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Advanced Options
                </button>
                
                {showAdvanced && (
                  <div className="mt-4 space-y-4">
                    {/* Contingencies */}
                    <div>
                      <h5 className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
                        <Shield className="w-3.5 h-3.5" />
                        Contingencies
                      </h5>
                      <div className="grid grid-cols-2 gap-2">
                        {CONTINGENCY_OPTIONS.map(option => (
                          <label 
                            key={option.id}
                            className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                              contingencies.includes(option.id) 
                                ? 'bg-cyan-50 border-cyan-300' 
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={contingencies.includes(option.id)}
                              onChange={() => toggleContingency(option.id)}
                              className="mt-0.5 w-3.5 h-3.5 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
                            />
                            <div>
                              <div className="text-xs font-medium text-slate-700">{option.label}</div>
                              <div className="text-[10px] text-slate-500">{option.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    {/* Offer Expiration */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Offer Valid For</label>
                      <div className="relative w-32">
                        <input
                          type="number"
                          value={expirationDays}
                          onChange={(e) => setExpirationDays(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">days</span>
                      </div>
                    </div>
                    
                    {/* Additional Terms */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Additional Terms (optional)</label>
                      <textarea
                        value={additionalTerms}
                        onChange={(e) => setAdditionalTerms(e.target.value)}
                        placeholder="Any special conditions or terms..."
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </>
          ) : (
            /* Success State - LOI Generated */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-emerald-800">LOI Generated Successfully!</h4>
                  <p className="text-sm text-emerald-600">Reference: {generatedLOI.id}</p>
                </div>
              </div>
              
              {/* Quick Summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Property</span>
                  <span className="font-medium text-slate-800">{generatedLOI.property_address}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Offer Price</span>
                  <span className="font-semibold text-cyan-600">{formatCurrency(generatedLOI.offer_price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Earnest Money</span>
                  <span className="font-medium text-slate-800">{formatCurrency(generatedLOI.earnest_money)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Inspection Period</span>
                  <span className="font-medium text-slate-800">{generatedLOI.inspection_days} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Offer Expires</span>
                  <span className="font-medium text-slate-800">{new Date(generatedLOI.expiration_date).toLocaleDateString()}</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 text-white rounded-xl font-semibold hover:bg-cyan-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={handleCopyText}
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Text
                    </>
                  )}
                </button>
              </div>
              
              {/* Preview Text */}
              <div>
                <h5 className="text-xs font-semibold text-slate-600 mb-2">Preview</h5>
                <div className="bg-white border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono">
                    {generatedLOI.content_text.slice(0, 1000)}
                    {generatedLOI.content_text.length > 1000 && '...'}
                  </pre>
                </div>
              </div>
              
              {/* Generate Another */}
              <button
                onClick={() => setGeneratedLOI(null)}
                className="w-full text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                ← Edit and regenerate
              </button>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {!generatedLOI && (
          <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate LOI
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default GenerateLOIModal

