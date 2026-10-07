import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLANS = {
  '3_month': { quota: 10, days: 90 },
  'yearly': { quota: 40, days: 365 },
};

async function verifyPaystackSignature(body: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY')!;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === signature;
}

Deno.serve(async (req) => {
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  const isValid = await verifyPaystackSignature(rawBody, signature);
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event !== 'charge.success') {
    return new Response('Ignored', { status: 200 });
  }

  const reference = event.data.reference;

  // Re-verify directly with Paystack's API — never trust the webhook payload alone
  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}` },
  });
  const verifyData = await verifyRes.json();

  if (!verifyData.status || verifyData.data.status !== 'success') {
    return new Response('Verification failed', { status: 400 });
  }

  const userId = verifyData.data.metadata?.user_id;
  const plan = verifyData.data.metadata?.plan as keyof typeof PLANS;

  if (!userId || !plan || !PLANS[plan]) {
    return new Response('Missing or invalid metadata', { status: 400 });
  }

  const { quota, days } = PLANS[plan];
  const accessUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: existing } = await supabaseAdmin
    .from('user_limits')
    .select('batch_quota')
    .eq('user_id', userId)
    .single();

  const newQuota = (existing?.batch_quota ?? 1) + quota;

  const { error } = await supabaseAdmin
    .from('user_limits')
    .upsert({
      user_id: userId,
      plan,
      access_until: accessUntil,
      batch_quota: newQuota,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to update user_limits:', error);
    return new Response('Database error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
});