/**
 * Supabase Edge Function: b2-upload
 *
 * Receives a file from an authenticated client and uploads it to Backblaze B2.
 * B2 credentials are stored as Supabase secrets and NEVER sent to the browser.
 *
 * Deploy:
 *   supabase functions deploy b2-upload
 *
 * Set secrets:
 *   supabase secrets set B2_KEY_ID=<your_key_id>
 *   supabase secrets set B2_APP_KEY=<your_app_key>
 *   supabase secrets set B2_BUCKET_NAME=IOTHINCBACKUP
 *   supabase secrets set B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
 */

import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner'
import { createClient } from 'npm:@supabase/supabase-js'

// Validate that required secrets are configured
const requiredSecrets = ['B2_KEY_ID', 'B2_APP_KEY', 'B2_BUCKET_NAME', 'B2_ENDPOINT']
for (const secret of requiredSecrets) {
  if (!Deno.env.get(secret)) {
    console.error(`Missing required secret: ${secret}`)
  }
}

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
  // CORS headers for preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Verify JWT — only authenticated users can upload to B2
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized', detail: authError?.message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const key = formData.get('key') || `uploads/${user.id}/${Date.now()}`
    const bucket = formData.get('bucket') || Deno.env.get('B2_BUCKET_NAME')
    const contentType = formData.get('contentType') || 'application/octet-stream'

    // Security: sanitize key to prevent path traversal
    const safeKey = key.replace(/\.\.\//g, '').replace(/^\/+/, '')

    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Size limit: 5GB
    const maxSize = 5 * 1024 * 1024 * 1024
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: 'File too large (max 5GB)' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const buffer = await file.arrayBuffer()

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: safeKey,
      Body: new Uint8Array(buffer),
      ContentType: contentType,
      Metadata: {
        uploadedBy: user.id,
        uploadedAt: new Date().toISOString(),
      },
    })

    await b2.send(command)

    // Return a 1-hour signed download URL
    const getCommand = new (await import('npm:@aws-sdk/client-s3')).GetObjectCommand({
      Bucket: bucket,
      Key: safeKey,
    })
    const signedUrl = await getSignedUrl(b2, getCommand, { expiresIn: 3600 })

    return new Response(
      JSON.stringify({ key: safeKey, bucket, url: signedUrl, signed: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (err) {
    console.error('B2 upload error:', err)
    return new Response(
      JSON.stringify({ error: 'Upload failed', detail: err.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
