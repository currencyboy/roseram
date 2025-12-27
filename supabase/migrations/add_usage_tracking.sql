-- Create table for tracking X AI usage per user
CREATE TABLE IF NOT EXISTS user_ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Usage metrics
  api_calls INTEGER NOT NULL DEFAULT 0,
  tokens_consumed INTEGER NOT NULL DEFAULT 0,
  cost_amount DECIMAL(10, 4) NOT NULL DEFAULT 0.00,
  
  -- Tier info
  free_tier_used DECIMAL(10, 4) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(10, 4) NOT NULL DEFAULT 0.00,
  
  -- Timestamps
  period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, period_start)
);

-- Create table for detailed API call logs
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- API details
  api_endpoint VARCHAR(255) NOT NULL,
  model VARCHAR(100) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  
  -- Usage metrics
  tokens_used INTEGER NOT NULL DEFAULT 0,
  response_tokens INTEGER NOT NULL DEFAULT 0,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  cost DECIMAL(10, 6) NOT NULL DEFAULT 0.00,
  
  -- Metadata
  request_metadata JSONB,
  response_metadata JSONB,
  
  -- Status
  status VARCHAR(50) DEFAULT 'success',
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create table for Solana payments
CREATE TABLE IF NOT EXISTS solana_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Payment details
  transaction_signature VARCHAR(255) UNIQUE NOT NULL,
  amount_sol DECIMAL(20, 9) NOT NULL,
  amount_usd DECIMAL(10, 2) NOT NULL,
  
  -- Address info
  wallet_address VARCHAR(255) NOT NULL,
  recipient_address VARCHAR(255) NOT NULL DEFAULT 'CbcWb97K3TEFJZJYLZRqdsMSdVXTFaMaUcF6yPQgY9yS',
  
  -- Status
  status VARCHAR(50) DEFAULT 'confirmed',
  confirmations INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  INDEX(user_id),
  INDEX(status),
  INDEX(created_at)
);

-- Create function to update user balance on every API call
CREATE OR REPLACE FUNCTION update_user_usage_on_api_call()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_ai_usage (user_id, api_calls, tokens_consumed, cost_amount, period_start)
  VALUES (NEW.user_id, 1, NEW.tokens_used, NEW.cost, CURRENT_DATE::TIMESTAMP WITH TIME ZONE)
  ON CONFLICT (user_id, period_start) 
  DO UPDATE SET
    api_calls = user_ai_usage.api_calls + 1,
    tokens_consumed = user_ai_usage.tokens_consumed + NEW.tokens_used,
    cost_amount = user_ai_usage.cost_amount + NEW.cost,
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically track usage
CREATE TRIGGER trigger_update_usage_on_api_call
AFTER INSERT ON api_usage_logs
FOR EACH ROW
EXECUTE FUNCTION update_user_usage_on_api_call();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_ai_usage_user_id ON user_ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_usage_period ON user_ai_usage(user_id, period_start);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_solana_payments_user_id ON solana_payments(user_id);
