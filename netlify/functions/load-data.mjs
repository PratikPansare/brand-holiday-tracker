import { getStore } from '@netlify/blobs'

export default async (req) => {
  const url = new URL(req.url)
  const key = url.searchParams.get('key')
  if (!key) return new Response('Missing key', { status: 400 })

  try {
    const store = getStore('brand-tracker')
    const data = await store.get(key, { type: 'json' })

    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (err) {
    // Key not found is fine — return null
    return new Response(JSON.stringify({ ok: true, data: null }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
}

export const config = { path: '/api/load-data' }
