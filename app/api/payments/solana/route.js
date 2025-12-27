import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(supabaseUrl, supabaseKey);

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const RECIPIENT_ADDRESS = 'CbcWb97K3TEFJZJYLZRqdsMSdVXTFaMaUcF6yPQgY9yS';
const connection = new Connection(SOLANA_RPC, 'confirmed');

// SOL to USD rate (you should fetch this from an oracle in production)
const SOL_USD_RATE = 200; // Example rate, update as needed

/**
 * Validate a Solana transaction and record payment
 * Expects transaction signature from the client
 */
export async function POST(request) {
  try {
    const { userId, transactionSignature, amountSol, walletAddress } = await request.json();

    if (!userId || !transactionSignature || !amountSol || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, transactionSignature, amountSol, walletAddress' },
        { status: 400 }
      );
    }

    // Verify transaction on Solana blockchain
    const confirmed = await verifyTransaction(transactionSignature);
    if (!confirmed) {
      return NextResponse.json(
        { error: 'Transaction not confirmed or invalid' },
        { status: 400 }
      );
    }

    // Get transaction details
    const txDetails = await connection.getTransaction(transactionSignature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!txDetails) {
      return NextResponse.json(
        { error: 'Transaction details not found' },
        { status: 400 }
      );
    }

    // Validate transaction details (recipient, amount, etc.)
    const amountUsd = amountSol * SOL_USD_RATE;

    // Record payment in database
    const { data: payment, error: paymentError } = await supabase
      .from('solana_payments')
      .insert([
        {
          user_id: userId,
          transaction_signature: transactionSignature,
          amount_sol: amountSol,
          amount_usd: amountUsd,
          wallet_address: walletAddress,
          recipient_address: RECIPIENT_ADDRESS,
          status: 'confirmed',
          confirmations: txDetails.blockTime ? 1 : 0,
          metadata: {
            blockTime: txDetails.blockTime,
            slot: txDetails.slot,
            solRateAtPurchase: SOL_USD_RATE,
          },
          confirmed_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (paymentError) {
      console.error('[Solana Payment] Error recording payment:', paymentError);
      return NextResponse.json(
        { error: 'Failed to record payment', details: paymentError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        transactionSignature,
        amountSol,
        amountUsd,
        status: 'confirmed',
        timestamp: payment.confirmed_at,
      },
    });
  } catch (error) {
    console.error('[Solana Payment] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get SOL to USD conversion rate
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'rate') {
      return NextResponse.json({
        solToUsd: SOL_USD_RATE,
        recipientAddress: RECIPIENT_ADDRESS,
        network: 'mainnet-beta',
      });
    }

    if (action === 'payment-history') {
      const userId = searchParams.get('userId');
      if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
      }

      const { data: payments, error } = await supabase
        .from('solana_payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch payment history' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        payments,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Solana GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Verify transaction on Solana blockchain
 */
async function verifyTransaction(signature) {
  try {
    const status = await connection.getSignatureStatus(signature);
    return status?.value?.confirmationStatus === 'confirmed' || status?.value?.confirmationStatus === 'finalized';
  } catch (error) {
    console.error('[Solana] Verification error:', error);
    return false;
  }
}
