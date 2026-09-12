export const runtime = 'edge'

export async function GET(req: Request) {
  const h = req.headers
  const city = h.get('x-vercel-ip-city')
  const region = h.get('x-vercel-ip-country-region')
  const lat = h.get('x-vercel-ip-latitude')
  const lng = h.get('x-vercel-ip-longitude')
  return Response.json(
    {
      city: city ? decodeURIComponent(city) : null,
      region,
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
    },
    { headers: { 'cache-control': 'private, no-store' } },
  )
}
