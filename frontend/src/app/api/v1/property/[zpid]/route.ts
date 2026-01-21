import { NextRequest, NextResponse } from 'next/server'

/**
 * Property Details API Route
 * 
 * Fetches comprehensive property data from AXESSO Zillow API using ZPID.
 * 
 * GET /api/v1/property/[zpid]
 */

const AXESSO_API_KEY = process.env.AXESSO_API_KEY || ''
const AXESSO_BASE_URL = process.env.AXESSO_URL || 'https://api.axesso.de/zil'

interface RouteContext {
  params: Promise<{ zpid: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { zpid } = await context.params

  if (!zpid) {
    return NextResponse.json(
      { success: false, error: 'ZPID is required' },
      { status: 400 }
    )
  }

  if (!AXESSO_API_KEY) {
    console.error('AXESSO_API_KEY not configured')
    return NextResponse.json(
      { success: false, error: 'API configuration error' },
      { status: 500 }
    )
  }

  const headers = {
    'axesso-api-key': AXESSO_API_KEY,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }

  try {
    // Fetch property details, price/tax history, and schools in parallel
    const [propertyRes, historyRes, schoolsRes, photosRes] = await Promise.allSettled([
      fetch(`${AXESSO_BASE_URL}/property-v2?zpid=${zpid}`, { headers, next: { revalidate: 3600 } }),
      fetch(`${AXESSO_BASE_URL}/price-tax-history?zpid=${zpid}`, { headers, next: { revalidate: 3600 } }),
      fetch(`${AXESSO_BASE_URL}/schools?zpid=${zpid}`, { headers, next: { revalidate: 86400 } }),
      fetch(`${AXESSO_BASE_URL}/photos?zpid=${zpid}`, { headers, next: { revalidate: 86400 } }),
    ])

    // Process property details
    let propertyData: Record<string, unknown> | null = null
    if (propertyRes.status === 'fulfilled' && propertyRes.value.ok) {
      propertyData = await propertyRes.value.json()
    }

    if (!propertyData) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      )
    }

    // Process price/tax history
    let historyData: Record<string, unknown> | null = null
    if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
      historyData = await historyRes.value.json()
    }

    // Process schools
    let schoolsData: Record<string, unknown> | null = null
    if (schoolsRes.status === 'fulfilled' && schoolsRes.value.ok) {
      schoolsData = await schoolsRes.value.json()
    }

    // Process photos
    let photosData: Record<string, unknown> | null = null
    if (photosRes.status === 'fulfilled' && photosRes.value.ok) {
      photosData = await photosRes.value.json()
    }

    // Normalize and combine data
    const normalizedProperty = normalizePropertyData(propertyData, historyData, schoolsData, photosData)

    return NextResponse.json({
      success: true,
      data: normalizedProperty
    })

  } catch (error) {
    console.error('Error fetching property:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch property data' },
      { status: 500 }
    )
  }
}

/**
 * Normalize AXESSO API responses into our PropertyData format
 */
function normalizePropertyData(
  property: Record<string, unknown>,
  history: Record<string, unknown> | null,
  schools: Record<string, unknown> | null,
  photos: Record<string, unknown> | null
) {
  // Extract photos from various possible formats
  let images: string[] = []
  if (photos && Array.isArray((photos as { photos?: unknown[] }).photos)) {
    images = (photos as { photos: { url?: string; mixedSources?: { jpeg?: { url?: string }[] } }[] }).photos
      .map(p => p.url || (p.mixedSources?.jpeg?.[0]?.url))
      .filter((url): url is string => !!url)
  } else if (property && Array.isArray((property as { photos?: unknown[] }).photos)) {
    images = ((property as { photos: { url?: string }[] }).photos)
      .map(p => p.url)
      .filter((url): url is string => !!url)
  } else if (property && Array.isArray((property as { responsivePhotos?: unknown[] }).responsivePhotos)) {
    images = ((property as { responsivePhotos: { mixedSources?: { jpeg?: { url?: string }[] } }[] }).responsivePhotos)
      .map(p => p.mixedSources?.jpeg?.[0]?.url)
      .filter((url): url is string => !!url)
  }

  // Extract price history
  let priceHistory: { date: string; event: string; price: number; source: string; priceChangeRate?: number }[] = []
  if (history && Array.isArray((history as { priceHistory?: unknown[] }).priceHistory)) {
    priceHistory = ((history as { priceHistory: { date?: string; event?: string; price?: number; source?: string; priceChangeRate?: number }[] }).priceHistory)
      .filter(item => item.date && item.price)
      .map(item => ({
        date: item.date || '',
        event: item.event || 'Price event',
        price: item.price || 0,
        source: item.source || 'Public Record',
        priceChangeRate: item.priceChangeRate || 0
      }))
  }

  // Extract tax history
  let taxHistory: { year: number; taxPaid: number; assessedValue: number; landValue?: number; improvementValue?: number }[] = []
  if (history && Array.isArray((history as { taxHistory?: unknown[] }).taxHistory)) {
    taxHistory = ((history as { taxHistory: { time?: number; taxPaid?: number; value?: number; taxIncreaseRate?: number }[] }).taxHistory)
      .filter(item => item.time && item.taxPaid)
      .map(item => ({
        year: new Date(item.time || 0).getFullYear(),
        taxPaid: item.taxPaid || 0,
        assessedValue: item.value || 0
      }))
  }

  // Extract schools
  let schoolsArray: { name: string; level: string; grades: string; rating: number; distance: number; type: string; link?: string }[] = []
  if (schools && Array.isArray((schools as { schools?: unknown[] }).schools)) {
    schoolsArray = ((schools as { schools: { name?: string; level?: string; grades?: string; rating?: number; distance?: string; type?: string; link?: string }[] }).schools)
      .map(school => ({
        name: school.name || '',
        level: school.level || 'Unknown',
        grades: school.grades || '',
        rating: school.rating || 0,
        distance: parseFloat(school.distance || '0'),
        type: school.type || 'Public',
        link: school.link
      }))
  }

  // Cast to typed object for easier access
  const p = property as {
    zpid?: number | string
    streetAddress?: string
    address?: { streetAddress?: string; city?: string; state?: string; zipcode?: string }
    city?: string
    state?: string
    zipcode?: string
    neighborhood?: string
    county?: string
    price?: number
    homeStatus?: string
    daysOnZillow?: number
    views?: number
    saveCount?: number
    bedrooms?: number
    bathrooms?: number
    livingArea?: number
    lotAreaValue?: number
    lotAreaUnit?: string
    yearBuilt?: number
    homeType?: string
    stories?: number
    zestimate?: number
    rentZestimate?: number
    taxAssessedValue?: number
    propertyTaxRate?: number
    annualHomeownersInsurance?: number
    monthlyHoaFee?: number
    hoaFee?: number
    heating?: string[]
    cooling?: string[]
    parking?: { parkingFeatures?: string[] }
    parkingSpaces?: number
    flooring?: string[]
    appliances?: string[]
    interiorFeatures?: string[]
    exteriorFeatures?: string[]
    constructionMaterials?: string[]
    roof?: string
    foundation?: string
    isWaterfront?: boolean
    waterfrontFeatures?: string[]
    latitude?: number
    longitude?: number
    description?: string
    photoCount?: number
    listingAgent?: { name?: string; phone?: string; brokerage?: string }
    mlsId?: string
    datePosted?: string
  }

  const streetAddress = p.streetAddress || p.address?.streetAddress || ''
  const city = p.city || p.address?.city || ''
  const state = p.state || p.address?.state || ''
  const zipcode = p.zipcode || p.address?.zipcode || ''
  const price = p.price || p.zestimate || 0
  const livingArea = p.livingArea || 0
  const lotSize = p.lotAreaValue || 0

  return {
    zpid: p.zpid || '',
    address: {
      streetAddress,
      city,
      state,
      zipcode,
      neighborhood: p.neighborhood,
      county: p.county
    },
    price,
    listingStatus: p.homeStatus || 'FOR_SALE',
    daysOnZillow: p.daysOnZillow,
    views: p.views,
    saves: p.saveCount,
    bedrooms: p.bedrooms || 0,
    bathrooms: p.bathrooms || 0,
    livingArea,
    lotSize,
    lotSizeAcres: lotSize ? Math.round(lotSize / 43560 * 100) / 100 : undefined,
    yearBuilt: p.yearBuilt || 0,
    propertyType: p.homeType || 'SINGLE_FAMILY',
    stories: p.stories,
    zestimate: p.zestimate,
    rentZestimate: p.rentZestimate,
    pricePerSqft: livingArea ? Math.round(price / livingArea) : undefined,
    annualTax: p.taxAssessedValue && p.propertyTaxRate 
      ? Math.round(p.taxAssessedValue * p.propertyTaxRate / 100) 
      : taxHistory[0]?.taxPaid,
    taxAssessedValue: p.taxAssessedValue,
    taxYear: taxHistory[0]?.year || new Date().getFullYear(),
    hoaFee: p.monthlyHoaFee || p.hoaFee,
    hoaFrequency: p.monthlyHoaFee ? 'monthly' : 'mo',
    heating: p.heating || [],
    cooling: p.cooling || [],
    parking: p.parking?.parkingFeatures || [],
    parkingSpaces: p.parkingSpaces,
    flooring: p.flooring || [],
    appliances: p.appliances || [],
    interiorFeatures: p.interiorFeatures || [],
    exteriorFeatures: p.exteriorFeatures || [],
    construction: p.constructionMaterials || [],
    roof: p.roof,
    foundation: p.foundation,
    isWaterfront: p.isWaterfront,
    waterfrontFeatures: p.waterfrontFeatures,
    latitude: p.latitude,
    longitude: p.longitude,
    description: p.description || '',
    images: images.length > 0 ? images : getPlaceholderImages(),
    totalPhotos: p.photoCount || images.length,
    listingAgent: p.listingAgent,
    mlsId: p.mlsId,
    listDate: p.datePosted,
    priceHistory,
    taxHistory,
    schools: schoolsArray
  }
}

function getPlaceholderImages(): string[] {
  return [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&h=600&fit=crop',
  ]
}
