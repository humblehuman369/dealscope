# Homepage hero (static)

The homepage hero is a static illustrated map card. It makes **no listing or Maps API calls**.

The CTA deep-links to Search & Discover:

- `/map-search?q={city}` — geocodes `q` once, centers the map (city zoom 13), and prefills the search bar
- `/map-search` with no query restores the previous session snapshot, same as before

Visitor city prefill comes from `GET /api/geo` (Edge, Vercel geo headers). The homepage itself does not read `headers()`, so `/` stays statically rendered.
