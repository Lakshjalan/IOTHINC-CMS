// src/api/log-client-error.js
// Simple endpoint to receive client error logs.
// Adjust according to your backend (Vite dev server, Express, etc.).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }
  try {
    const payload = await req.json()
    // Server‑side logging. Replace with your logging service if desired.
    console.error('Client error logged:', payload)
    // e.g., store in Supabase table here.
    return res.status(200).json({ status: 'ok' })
  } catch (e) {
    console.error('Failed to process client error log', e)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
