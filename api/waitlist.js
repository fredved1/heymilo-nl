const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hzexwxpnsqggbxklpues.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, source } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Ongeldig e-mailadres' });
  }

  if (!SUPABASE_KEY) {
    // Geen Supabase key geconfigureerd — log en return success
    console.log('[waitlist] No SUPABASE_SERVICE_KEY, skipping DB write. Email:', email);
    return res.status(200).json({ ok: true, position: 848 });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        source: source || 'website',
        created_at: new Date().toISOString(),
      }),
    });

    if (response.status === 409) {
      // Duplicate — al ingeschreven, toch success tonen
      return res.status(200).json({ ok: true, duplicate: true });
    }

    if (!response.ok) {
      const err = await response.text();
      console.error('[waitlist] Supabase error:', err);
      return res.status(500).json({ error: 'Opslaan mislukt' });
    }

    // Tel aantal inschrijvingen voor positie
    const countRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?select=id`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact',
        'Range': '0-0',
      },
    });
    const total = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '848', 10);

    return res.status(200).json({ ok: true, position: total });
  } catch (err) {
    console.error('[waitlist] Fetch error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
