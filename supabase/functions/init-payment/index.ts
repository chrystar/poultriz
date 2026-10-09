import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLANS = {
  '3_month': { amountKobo: 500000 },
  yearly: { amountKobo: 2000000 },
};

function jsonResponse(body: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  try {
    const { plan } = await req.json();
    if (plan !== '3_month' && plan !== 'yearly') {
      return jsonResponse({ error: 'Invalid plan' }, 400);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Not authenticated' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return jsonResponse({ error: 'Not authenticated' }, 401);

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) {
      console.error('PAYSTACK_SECRET_KEY is not configured');
      return jsonResponse({ error: 'Payment service is not configured' }, 500);
    }

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + paystackSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: PLANS[plan as keyof typeof PLANS].amountKobo,
        metadata: { user_id: user.id, plan },
      }),
    });
    const paystackData = await paystackRes.json();
    if (!paystackData.status) {
      return jsonResponse({ error: paystackData.message ?? 'Payment initialization failed' }, 400);
    }

    return jsonResponse({ authorization_url: paystackData.data.authorization_url });
  } catch (err) {
    console.error('Payment initialization failed:', err);
    return jsonResponse({ error: 'Payment initialization failed' }, 500);
  }
});
