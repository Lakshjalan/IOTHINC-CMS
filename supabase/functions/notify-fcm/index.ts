import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js'
import { JWT } from 'npm:google-auth-library'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Ensure the environment has the Firebase Service Account JSON
// Format should be the stringified JSON from the Firebase Console
const getFirebaseCredentials = () => {
  const sa = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
  if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set in secrets.')
  try {
    return JSON.parse(sa)
  } catch (e) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON.')
  }
}

// Generate an OAuth2 access token for FCM
async function getAccessToken(credentials: any) {
  const jwtClient = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  
  const tokens = await jwtClient.authorize();
  return tokens.access_token;
}

// Send the FCM message via HTTP v1 API
async function sendFcmMessage(token: string, title: string, body: string, credentials: any, accessToken: string) {
  const url = `https://fcm.googleapis.com/v1/projects/${credentials.project_id}/messages:send`;
  
  const message = {
    message: {
      token: token,
      notification: {
        title: title,
        body: body,
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`FCM Error for token ${token}:`, errText);
    return false;
  }
  
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log("Received Webhook Payload:", JSON.stringify(payload, null, 2))

    // Determine the type of webhook event
    const table = payload.table;
    const type = payload.type;
    const record = payload.record;
    
    if (!record) {
      return new Response("Missing record in payload", { status: 400 })
    }

    // Initialize Supabase Admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Store notifications we need to send { token: string, title: string, body: string }
    const notificationsToSend: any[] = [];

    // --- LOGIC FOR TASKS ---
    if (table === 'tasks' && (type === 'INSERT' || type === 'UPDATE')) {
      const isNewTask = type === 'INSERT';
      // If it's an update, check if assigned_to changed (we don't want to spam if they just changed progress)
      const oldRecord = payload.old_record;
      const justAssigned = type === 'UPDATE' && oldRecord && oldRecord.assigned_to !== record.assigned_to;
      
      if ((isNewTask || justAssigned) && record.assigned_to) {
        // Fetch the user's FCM token
        const { data: profile } = await supabase
          .from('profiles')
          .select('fcm_token')
          .eq('id', record.assigned_to)
          .single();

        if (profile?.fcm_token) {
          notificationsToSend.push({
            token: profile.fcm_token,
            title: "New Task Assigned",
            body: `You have been assigned to: ${record.title}`
          });
        }
      }
    }

    // --- LOGIC FOR MEETINGS ---
    if (table === 'meetings' && type === 'UPDATE') {
      const oldRecord = payload.old_record;
      // Trigger when status changes to 'live'
      if (oldRecord && oldRecord.status !== 'live' && record.status === 'live') {
        // Notify everyone that the meeting is live
        // (Since no one is in meeting_attendees yet when it just started)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('fcm_token')
          .not('fcm_token', 'is', null);

        if (profiles && profiles.length > 0) {
          for (const profile of profiles) {
            notificationsToSend.push({
              token: profile.fcm_token,
              title: "Meeting is Live!",
              body: `The meeting '${record.title}' has started. Join now!`
            });
          }
        }
      }
    }

    // --- LOGIC FOR BROADCAST NOTIFICATIONS ---
    if (table === 'notifications' && type === 'INSERT') {
      const title = record.title || "New Announcement";
      const body = record.message || "You have a new notification in IOTHINC.";
      
      if (record.target_member_id) {
        // Direct notification to a specific member
        const { data: profile } = await supabase
          .from('profiles')
          .select('fcm_token')
          .eq('id', record.target_member_id)
          .single();

        if (profile?.fcm_token) {
          notificationsToSend.push({ token: profile.fcm_token, title, body });
        }
      } else if (record.target_role) {
        // Broadcast to a specific role or 'all'
        let query = supabase.from('profiles').select('fcm_token').not('fcm_token', 'is', null);
        if (record.target_role !== 'all') {
          query = query.eq('role', record.target_role);
        }
        
        const { data: profiles } = await query;
        if (profiles && profiles.length > 0) {
          for (const profile of profiles) {
            notificationsToSend.push({ token: profile.fcm_token, title, body });
          }
        }
      }
    }

    // Send the notifications if any exist
    if (notificationsToSend.length > 0) {
      const credentials = getFirebaseCredentials();
      const accessToken = await getAccessToken(credentials);
      
      console.log(`Sending ${notificationsToSend.length} push notifications...`);
      
      const promises = notificationsToSend.map(n => 
        sendFcmMessage(n.token, n.title, n.body, credentials, accessToken)
      );
      
      await Promise.all(promises);
    } else {
      console.log("No notifications to send for this event.");
    }

    return new Response(JSON.stringify({ success: true, count: notificationsToSend.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
    
  } catch (error: any) {
    console.error("Webhook Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
