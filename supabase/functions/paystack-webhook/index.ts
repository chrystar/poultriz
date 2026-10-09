import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLANS = {
  '3_month': { amountKobo: 500000, quota: 10, days: 90 },
  yearly: { amountKobo: 2000000, quota: 40, days: 365 },
};

async function verifyPaystackSignature(body: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret) {
    console.error('PAYSTACK_SECRET_KEY is not configured');
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const expected = Array.from(new Uint8Array(sig))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  if (expected.length !== signature.length) return false;

  let difference = 0;
  for (let index = 0; index < expected.length; index++) {
    difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return difference === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const rawBody = await req.text();
  if (!(await verifyPaystackSignature(rawBody, req.headers.get('x-paystack-signature')))) {
    return new Response('Invalid signature', { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  if (event.event !== 'charge.success') return new Response('Ignored', { status: 200 });

  const reference = event.data?.reference;
  const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!reference) return new Response('Missing reference', { status: 400 });
  if (!paystackSecret) {
    console.error('PAYSTACK_SECRET_KEY is not configured');
    return new Response('Payment service is not configured', { status: 500 });
  }

  const verifyRes = await fetch('https://api.paystack.co/transaction/verify/' + reference, {
    headers: { Authorization: 'Bearer ' + paystackSecret },
  });
  const verifyData = await verifyRes.json();
  const transaction = verifyData.data;
  if (!verifyData.status || transaction?.status !== 'success') {
    return new Response('Verification failed', { status: 400 });
  }

  const userId = transaction.metadata?.user_id;
  const plan = transaction.metadata?.plan as keyof typeof PLANS;
  if (!userId || !plan || !PLANS[plan]) {
    return new Response('Missing or invalid metadata', { status: 400 });
  }
  const { amountKobo, quota, days } = PLANS[plan];
  if (transaction.amount !== amountKobo || transaction.currency !== 'NGN') {
    return new Response('Invalid amount or currency', { status: 400 });
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    return new Response('Payment service is not configured', { status: 500 });
  }

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, serviceRoleKey);
  const { error: paymentInsertError } = await supabaseAdmin.from('payments').insert({
    reference,
    user_id: userId,
    plan,
    amount_kobo: amountKobo,
    status: 'processing',
  });
  if (paymentInsertError && paymentInsertError.code !== '23505') {
    console.error('Failed to record payment:', paymentInsertError);
    return new Response('Database error', { status: 500 });
  }

  const { data: payment, error: paymentLookupError } = await supabaseAdmin
    .from('payments')
    .select('status')
    .eq('reference', reference)
    .single();
  if (paymentLookupError || !payment) {
    console.error('Failed to load payment:', paymentLookupError);
    return new Response('Database error', { status: 500 });
  }
  if (payment.status === 'completed') return new Response('Already processed', { status: 200 });
  if (paymentInsertError?.code === '23505' && payment.status === 'processing') {
    return new Response('Already processing', { status: 409 });
  }

  const { data: existing, error: limitsError } = await supabaseAdmin
    .from('user_limits')
    .select('batch_quota, access_until')
    .eq('user_id', userId)
    .single();
  if (limitsError && limitsError.code !== 'PGRST116') {
    console.error('Failed to load user limits:', limitsError);
    return new Response('Database error', { status: 500 });
  }

  const accessStart = Math.max(
    Date.now(),
    existing?.access_until ? new Date(existing.access_until).getTime() : 0,
  );
  const accessUntil = new Date(accessStart + days * 24 * 60 * 60 * 1000).toISOString();
  const { error: limitsUpdateError } = await supabaseAdmin.from('user_limits').upsert({
    user_id: userId,
    plan,
    access_until: accessUntil,
    batch_quota: (existing?.batch_quota ?? 1) + quota,
    updated_at: new Date().toISOString(),
  });
  if (limitsUpdateError) {
    console.error('Failed to update user_limits:', limitsUpdateError);
    await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('reference', reference);
    return new Response('Database error', { status: 500 });
  }

  const { error: paymentUpdateError } = await supabaseAdmin
    .from('payments')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('reference', reference);
  if (paymentUpdateError) {
    console.error('Failed to mark payment completed:', paymentUpdateError);
    return new Response('Database error', { status: 500 });
  }
  return new Response('OK', { status: 200 });
});
