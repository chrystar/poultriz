import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLANS = {
  '3_month': { amountKobo: 500000, quota: 10 },
  'yearly': { amountKobo: 2000000, quota: 40 },
};

Deno.serve(async (req) => {
  try {
    const { plan } = await req.json();

    if (plan !== '3_month' && plan !== 'yearly') {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), { status: 400 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    const { amountKobo } = PLANS[plan as keyof typeof PLANS];

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountKobo,
        metadata: { user_id: user.id, plan },
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      return new Response(JSON.stringify({ error: paystackData.message }), { status: 400 });
    }

    return new Response(
      JSON.stringify({ authorization_url: paystackData.data.authorization_url }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});