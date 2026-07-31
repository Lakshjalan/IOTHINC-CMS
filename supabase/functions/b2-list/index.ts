/**
 * Supabase Edge Function: b2-list
 * Lists objects in a B2 bucket, optionally with a prefix.
 * Returns total byte count for storage monitoring.
 *
 * Deploy: supabase functions deploy b2-list
 */

import { S3Client, ListObjectsV2Command } from 'npm:@aws-sdk/client-s3'
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
    const { bucket, prefix = '' } = await req.json()

    const command = new ListObjectsV2Command({
      Bucket: bucket || Deno.env.get('B2_BUCKET_NAME'),
      Prefix: prefix,
      MaxKeys: 1000,
    })

    const response = await b2.send(command)
    const items = response.Contents || []
    const totalBytes = items.reduce((sum, obj) => sum + (obj.Size || 0), 0)

    // Return minimal metadata (no signed URLs) for listing
    const sanitizedItems = items.map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
    }))

    return new Response(
      JSON.stringify({ items: sanitizedItems, count: items.length, totalBytes }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
