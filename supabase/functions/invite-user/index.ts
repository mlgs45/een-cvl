// Aucune dépendance externe — appels directs aux services Docker internes

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Services Docker internes (sans passer par Kong)
  const AUTH_URL    = 'http://auth:9999'
  const REST_URL    = 'http://rest:3000'
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    // 1. Vérifier le token de l'appelant
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non autorisé' }, 401)

    const token = authHeader.replace('Bearer ', '')

    const userRes = await fetch(`${AUTH_URL}/user`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (!userRes.ok) return json({ error: 'Token invalide' }, 401)
    const caller = await userRes.json()

    // 2. Vérifier le rôle admin dans public.users (PostgREST direct)
    const profileRes = await fetch(
      `${REST_URL}/users?id=eq.${caller.id}&select=role&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Accept': 'application/json',
        },
      }
    )

    const profiles = await profileRes.json()
    if (!profiles?.[0] || profiles[0].role !== 'admin') {
      return json({ error: 'Accès refusé : rôle admin requis' }, 403)
    }

    // 3. Lire les données du nouvel utilisateur
    const body = await req.json()
    const { email, password, full_name, organisation, role } = body

    if (!email || !password || !full_name) {
      return json({ error: 'Champs obligatoires manquants (email, password, full_name)' }, 400)
    }

    if (password.length < 8) {
      return json({ error: 'Le mot de passe doit faire au moins 8 caractères' }, 400)
    }

    // 4. Créer l'utilisateur via l'API admin Auth (direct)
    const createRes = await fetch(`${AUTH_URL}/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          organisation: organisation ?? 'CCIR Centre',
          must_change_password: true,
        },
      }),
    })

    const newUser = await createRes.json()

    if (!createRes.ok) {
      return json({ error: newUser.message ?? newUser.msg ?? 'Erreur création utilisateur' }, 400)
    }

    // 5. Upsert du profil dans public.users (PostgREST direct)
    if (newUser.id) {
      await fetch(`${REST_URL}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          id:           newUser.id,
          full_name:    full_name,
          organisation: organisation ?? 'CCIR Centre',
          role:         role ?? 'advisor',
        }),
      })
    }

    return json({ success: true, user_id: newUser.id })

  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
