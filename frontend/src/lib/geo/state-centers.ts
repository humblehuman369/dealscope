/**
 * Geographic centre and a Google Maps zoom that frames each state, used to
 * open /map-search on the right viewport from the /markets landing pages.
 *
 * Passing lat/lng/zoom matters: when /map-search only receives a label it has
 * to geocode after mount, and the map initialises over Kansas first (see the
 * note in components/SearchPropertyModal.tsx). Zoom is tuned per state so the
 * whole state fits a typical laptop viewport; large states sit one level out.
 */

export interface StateCenter {
  lat: number
  lng: number
  zoom: number
}

export const STATE_CENTERS: Record<string, StateCenter> = {
  AL: { lat: 32.806671, lng: -86.79113, zoom: 7 },
  AK: { lat: 63.588753, lng: -154.493062, zoom: 4 },
  AZ: { lat: 34.048928, lng: -111.093731, zoom: 6 },
  AR: { lat: 34.969704, lng: -92.373123, zoom: 7 },
  CA: { lat: 37.181, lng: -119.449444, zoom: 6 },
  CO: { lat: 39.059811, lng: -105.311104, zoom: 7 },
  CT: { lat: 41.597782, lng: -72.755371, zoom: 9 },
  DE: { lat: 39.145251, lng: -75.418921, zoom: 9 },
  DC: { lat: 38.897438, lng: -77.026817, zoom: 12 },
  FL: { lat: 28.1, lng: -82.4, zoom: 7 },
  GA: { lat: 32.678125, lng: -83.222976, zoom: 7 },
  HI: { lat: 20.7, lng: -157.3, zoom: 7 },
  ID: { lat: 44.240459, lng: -114.478828, zoom: 6 },
  IL: { lat: 40.0, lng: -89.198, zoom: 7 },
  IN: { lat: 39.849426, lng: -86.258278, zoom: 7 },
  IA: { lat: 42.011539, lng: -93.210526, zoom: 7 },
  KS: { lat: 38.5266, lng: -98.38, zoom: 7 },
  KY: { lat: 37.66814, lng: -85.6, zoom: 7 },
  LA: { lat: 31.169546, lng: -91.867805, zoom: 7 },
  ME: { lat: 45.253783, lng: -69.1, zoom: 7 },
  MD: { lat: 39.0, lng: -76.8, zoom: 8 },
  MA: { lat: 42.230171, lng: -71.530106, zoom: 8 },
  MI: { lat: 44.3, lng: -85.2, zoom: 6 },
  MN: { lat: 46.3, lng: -94.3, zoom: 6 },
  MS: { lat: 32.741646, lng: -89.678696, zoom: 7 },
  MO: { lat: 38.456085, lng: -92.288368, zoom: 7 },
  MT: { lat: 46.921925, lng: -110.454353, zoom: 6 },
  NE: { lat: 41.3, lng: -99.6, zoom: 7 },
  NV: { lat: 38.9, lng: -116.9, zoom: 6 },
  NH: { lat: 43.7, lng: -71.6, zoom: 8 },
  NJ: { lat: 40.1, lng: -74.5, zoom: 8 },
  NM: { lat: 34.4, lng: -106.1, zoom: 6 },
  NY: { lat: 42.9, lng: -75.5, zoom: 7 },
  NC: { lat: 35.5, lng: -79.4, zoom: 7 },
  ND: { lat: 47.5, lng: -100.4, zoom: 7 },
  OH: { lat: 40.4, lng: -82.8, zoom: 7 },
  OK: { lat: 35.6, lng: -97.5, zoom: 7 },
  OR: { lat: 44.0, lng: -120.6, zoom: 7 },
  PA: { lat: 40.9, lng: -77.8, zoom: 7 },
  RI: { lat: 41.68, lng: -71.51, zoom: 9 },
  SC: { lat: 33.9, lng: -80.9, zoom: 7 },
  SD: { lat: 44.4, lng: -100.2, zoom: 7 },
  TN: { lat: 35.86, lng: -86.35, zoom: 7 },
  TX: { lat: 31.3, lng: -99.3, zoom: 6 },
  UT: { lat: 39.3, lng: -111.7, zoom: 6 },
  VT: { lat: 44.0, lng: -72.7, zoom: 8 },
  VA: { lat: 37.8, lng: -78.9, zoom: 7 },
  WA: { lat: 47.4, lng: -120.5, zoom: 7 },
  WV: { lat: 38.6, lng: -80.6, zoom: 7 },
  WI: { lat: 44.6, lng: -89.9, zoom: 7 },
  WY: { lat: 43.0, lng: -107.5, zoom: 7 },
}
