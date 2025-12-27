import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { logger } from '@/lib/errors';
import { createHmac } from 'crypto';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

async function handleCustomerSubscriptionUpdated(event) {
  const supabase = await createServerSupabaseClient();
  const subscription = event.data.object;

  if (!subscription.customer) return;

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (orgError || !org) {
    logger.warn('Organization not found for Stripe customer', {
      customerId: subscription.customer,
    });
    return;
  }

  const subscriptionStatus = subscription.status === 'active' ? 'active' : 'canceled';

  await supabase
    .from('organizations')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscriptionStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', org.id);

  logger.info('Organization subscription updated', {
    organizationId: org.id,
    status: subscriptionStatus,
  });
}

async function handleInvoicePaymentSucceeded(event) {
  const supabase = await createServerSupabaseClient();
  const invoice = event.data.object;

  if (!invoice.customer) return;

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (!org) return;

  await supabase.from('invoices').insert({
    organization_id: org.id,
    stripe_invoice_id: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency.toUpperCase(),
    status: 'paid',
    description: invoice.description,
    paid_at: new Date(invoice.paid_at * 1000).toISOString(),
  });

  logger.info('Invoice recorded', {
    organizationId: org.id,
    invoiceId: invoice.id,
  });
}

async function handleInvoicePaymentFailed(event) {
  const supabase = await createServerSupabaseClient();
  const invoice = event.data.object;

  if (!invoice.customer) return;

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (!org) return;

  await supabase.from('invoices').insert({
    organization_id: org.id,
    stripe_invoice_id: invoice.id,
    amount: invoice.amount_due,
    currency: invoice.currency.toUpperCase(),
    status: 'failed',
    description: invoice.description,
  });

  logger.warn('Invoice payment failed', {
    organizationId: org.id,
    invoiceId: invoice.id,
  });
}

export async function POST(request) {
  try {
    if (!STRIPE_WEBHOOK_SECRET) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    const hmac = createHmac('sha256', STRIPE_WEBHOOK_SECRET);
    hmac.update(body);
    const digest = hmac.digest('hex');

    const parts = signature.split(',');
    let timestamp = '';
    let expectedSignature = '';

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') expectedSignature = value;
    }

    if (!timestamp || !expectedSignature) {
      logger.warn('Invalid webhook signature format');
      return NextResponse.json(
        { error: 'Invalid signature format' },
        { status: 400 }
      );
    }

    const signedContent = `${timestamp}.${body}`;
    const expectedHmac = createHmac('sha256', STRIPE_WEBHOOK_SECRET);
    expectedHmac.update(signedContent);
    const expectedDigest = expectedHmac.digest('hex');

    if (expectedSignature !== expectedDigest) {
      logger.warn('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);

    logger.info('Stripe webhook received', { eventType: event.type });

    switch (event.type) {
      case 'customer.subscription.updated':
        await handleCustomerSubscriptionUpdated(event);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;
      default:
        logger.debug('Unhandled Stripe event', { eventType: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
