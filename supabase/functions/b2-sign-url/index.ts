/**
 * Supabase Edge Function: b2-sign-url
 * Generates a time-limited signed download URL for a B2 object.
 *
 * Deploy: supabase functions deploy b2-sign-url
 */

import { S3Client, GetObjectCommand } from 'npm:@aws-sdk/client-s3'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner'
import { createClient } from 'npm:@supabase/supabase-js'

const b2 = new S3Client({
  region: 'ca-east-006',
  endpoint: Deno.env.get('B2_ENDPOINT'),
  credentials: {
    accessKeyId: Deno.env.get('B2_KEY_ID'),
    secretAccessKey: Deno.env.get('B2_APP_KEY'),
  },
})

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  // Auth check
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    const { bucket, key, expiresIn = 3600 } = await req.json()

    // Cap expiry at 7 days
    const safeExpiry = Math.min(expiresIn, 7 * 24 * 3600)

    const command = new GetObjectCommand({ Bucket: bucket, Key: key })
    const url = await getSignedUrl(b2, command, { expiresIn: safeExpiry })

    return new Response(JSON.stringify({ url, expiresIn: safeExpiry }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
