import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 1. Authenticate user from JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized: missing authorization token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized: invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const { room_id, limit = 50, receiver_id = null, team_id = null } = body

    if (!room_id) {
      return new Response(JSON.stringify({ error: 'Missing room_id in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Security & Rate Limiting Enforcement (Strict 2 requests per user per day)
    const today = new Date().toISOString().split('T')[0]
    const { data: usage } = await supabaseAdmin
      .from('summary_usage')
      .select('usage_count')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .single()

    const currentCount = usage?.usage_count || 0
    if (currentCount >= 2) {
      return new Response(
        JSON.stringify({
          error: 'Daily limit reached: You can only summarize conversations 2 times per day.'
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 3. Query latest 50 messages for room_id
    let msgQuery = supabaseAdmin
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        sender_id,
        sender:profiles!messages_sender_id_fkey(full_name)
      `)

    if (team_id) {
      msgQuery = msgQuery.eq('team_id', team_id).is('receiver_id', null)
    } else if (receiver_id) {
      msgQuery = msgQuery
        .is('team_id', null)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${user.id})`)
    } else {
      // Global lobby or default
      msgQuery = msgQuery.is('receiver_id', null).is('team_id', null)
    }

    // Fetch ONLY the latest unread/recent 50 messages (ordered newest first)
    const { data: rawMessages, error: msgError } = await msgQuery
      .order('created_at', { ascending: false })
      .limit(50)

    if (msgError) {
      throw new Error(`Database error fetching messages: ${msgError.message}`)
    }

    if (!rawMessages || rawMessages.length === 0) {
      return new Response(
        JSON.stringify({ summary: 'No messages found in this conversation to summarize.' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Order oldest to newest for prompt formatting
    const messages = [...rawMessages].reverse()
    const formattedTranscript = messages
      .map(m => {
        const senderName = m.sender?.full_name || 'Unknown'
        return `${senderName}: ${m.content}`
      })
      .join('\n')

    // 4. Check Cache: summaries table
    const { data: cachedSummary } = await supabaseAdmin
      .from('summaries')
      .select('*')
      .eq('room_id', room_id)
      .single()

    if (cachedSummary && cachedSummary.message_count === rawMessages.length) {
      return new Response(
        JSON.stringify({ summary: cachedSummary.summary_text, cached: true, remaining: 2 - currentCount }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 5. Call Gemini API securely from Edge Function using GEMINI_API_KEY
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: GEMINI_API_KEY is not set.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Query available models from Gemini API directly using key
    let modelsFromApi: string[] = []
    let listError = ''

    try {
      const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      const listRes = await fetch(listModelsUrl)
      if (listRes.ok) {
        const listData = await listRes.json()
        const rawModels = listData.models || []
        // Filter models that support generateContent
        modelsFromApi = rawModels
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.replace('models/', ''))
      } else {
        listError = await listRes.text()
      }
    } catch (e: any) {
      listError = e.message
    }

    const fallbackList = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-pro'
    ]

    // Priority: API-discovered models first, then fallbacks (unique items)
    const modelsToTry = Array.from(new Set([...modelsFromApi, ...fallbackList]))

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are an AI assistant. Summarize the following chat room conversation in 3 to 6 concise sentences highlighting key decisions, questions, and action items:\n\n${formattedTranscript}`
            }
          ]
        }
      ]
    }

    let geminiRes: Response | null = null
    let lastErrText = ''
    let successfulModel = ''

    for (const modelName of modelsToTry) {
      // Try v1beta endpoint first, then v1 endpoint
      for (const apiVer of ['v1beta', 'v1']) {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/${apiVer}/models/${modelName}:generateContent?key=${apiKey}`
        
        try {
          geminiRes = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })

          if (geminiRes.status === 429) {
            await new Promise(res => setTimeout(res, 2000))
            geminiRes = await fetch(geminiEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
          }

          if (geminiRes.ok) {
            successfulModel = `${modelName} (${apiVer})`
            break
          }

          lastErrText = await geminiRes.text()
        } catch (err: any) {
          lastErrText = err.message
        }
      }

      if (geminiRes && geminiRes.ok) {
        break
      }
    }

    if (!geminiRes || !geminiRes.ok) {
      return new Response(
        JSON.stringify({ 
          error: `Gemini API Error: ${lastErrText || 'No working Gemini model found.'} (ListModels error: ${listError || 'none'})` 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const geminiData = await geminiRes.json()
    const summaryText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!summaryText) {
      return new Response(
        JSON.stringify({ error: 'Failed to extract summary text from Gemini response.' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 6. Update cache & Increment User Limit
    await supabaseAdmin
      .from('summaries')
      .upsert({
        room_id: room_id,
        summary_text: summaryText,
        message_count: rawMessages.length,
        updated_at: new Date().toISOString()
      }, { onConflict: 'room_id' })

    if (usage) {
      await supabaseAdmin
        .from('summary_usage')
        .update({
          usage_count: currentCount + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('usage_date', today)
    } else {
      await supabaseAdmin
        .from('summary_usage')
        .insert({
          user_id: user.id,
          usage_date: today,
          usage_count: 1
        })
    }

    const remainingUses = Math.max(0, 2 - (currentCount + 1))

    return new Response(
      JSON.stringify({ summary: summaryText, remaining: remainingUses }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (err: any) {
    console.error('summarize-chat error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
