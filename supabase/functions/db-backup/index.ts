/**
 * Supabase Edge Function: db-backup
 *
 * Triggers a full database backup server-side and stores it in Backblaze B2.
 * Runs with service role key — bypasses RLS to read all tables.
 *
 * Deploy: supabase functions deploy db-backup
 *
 * For automatic scheduling, add to Supabase cron (pg_cron):
 *   SELECT cron.schedule('weekly-backup', '0 2 * * 0',
 *     $$SELECT net.http_post(
 *       url:='https://<project>.supabase.co/functions/v1/db-backup',
 *       headers:='{"Authorization": "Bearer <service_role_key>"}'::jsonb,
 *       body:='{"type":"full"}'::jsonb
 *     )$$
 *   );
 */

import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3'
import { createClient } from 'npm:@supabase/supabase-js'
import { withCompression } from '../_shared/compression.ts'

const b2 = new S3Client({
  region: 'ca-east-006',
  endpoint: Deno.env.get('B2_ENDPOINT'),
  credentials: {
    accessKeyId: Deno.env.get('B2_KEY_ID'),
    secretAccessKey: Deno.env.get('B2_APP_KEY'),
  },
})

// Service role key — only available server-side
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
)

const TABLES = [
  'profiles', 'teams', 'team_members', 'events', 'registrations',
  'projects', 'contributions', 'contribution_comments', 'tasks',
  'notifications', 'competitions', 'competition_submissions',
  'learning_resources', 'meetings', 'meeting_attendees',
  'meeting_agenda_items', 'meeting_action_items', 'meeting_decisions',
  'team_join_requests', 'event_teams', 'event_team_members',
  'event_tasks', 'member_schedules', 'messages'
]

Deno.serve(async (req) => {
  const handleRequest = async () => {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, content-type',
        },
      })
    }

    // Auth check — accept both service role JWT (for pg_cron) and user JWT (for dashboard)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Decode JWT payload to check role without full verification
    // (Supabase Edge Functions already verified the signature at the gateway for verify_jwt:true,
    //  but we have verify_jwt:false so we do our own check via the admin client)
    let callerRole = null
    let callerUserId = null

    try {
      // Try as a user JWT first
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
      if (!authError && user) {
        callerUserId = user.id
        callerRole = 'user'
      }
    } catch (_) { /* not a user token */ }

    // If not a user JWT, check if it's the service role key by inspecting JWT claims
    if (!callerRole) {
      try {
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]))
          if (payload.role === 'service_role') {
            callerRole = 'service_role'
          }
        }
      } catch (_) { /* invalid JWT */ }
    }

    if (!callerRole) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }


    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `backup-${timestamp}.json`

      // Export all tables using service role (bypasses RLS)
      const exportData = {
        exportedAt: new Date().toISOString(),
        source: 'edge-function-backup',
        triggeredBy: callerUserId || callerRole || 'scheduled',
        tables: {}
      }

      let totalRows = 0
      for (const table of TABLES) {
        try {
          const { data, error } = await supabaseAdmin.from(table).select('*')
          if (!error && data) {
            exportData.tables[table] = { count: data.length, data }
            totalRows += data.length
          } else {
            exportData.tables[table] = { error: error?.message || 'Unknown error' }
          }
        } catch (e) {
          exportData.tables[table] = { error: e.message }
        }
      }

      const jsonContent = JSON.stringify(exportData)
      const bucket = Deno.env.get('B2_BUCKET_NAME')

      // Store timestamped backup
      await b2.send(new PutObjectCommand({
        Bucket: bucket,
        Key: `database/${filename}`,
        Body: new TextEncoder().encode(jsonContent),
        ContentType: 'application/json',
        Metadata: {
          rows: String(totalRows),
          tables: String(TABLES.length),
          uploadedBy: callerUserId || callerRole || 'scheduled',
        },
      }))

      // Also overwrite the 'latest' pointer
      await b2.send(new PutObjectCommand({
        Bucket: bucket,
        Key: 'database/latest-backup.json',
        Body: new TextEncoder().encode(jsonContent),
        ContentType: 'application/json',
      }))

      return new Response(
        JSON.stringify({
          success: true,
          key: `database/${filename}`,
          bucket,
          rows: totalRows,
          tables: TABLES.length,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    } catch (err) {
      console.error('Backup failed:', err)
      return new Response(
        JSON.stringify({ error: 'Backup failed', detail: err.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }

  const response = await handleRequest()
  return withCompression(req, response)
})
