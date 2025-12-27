'use client';

import { useEffect, useState } from 'react';
import { X, Loader, AlertCircle, TrendingUp, Zap, DollarSign, Gift, Wallet, ExternalLink } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useBilling } from './BillingProvider';
import { CryptoPaymentWidget } from './CryptoPaymentWidget';

export function UsageInsightsModal() {
  const { session } = useAuth();
  const { billingModalOpen, closeBillingModal, balance, handlePaymentSuccess } = useBilling();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPayment, setShowPayment] = useState(false);
  const [customAmount, setCustomAmount] = useState('25.00');

  useEffect(() => {
    if (billingModalOpen && session?.user?.id) {
      fetchUsageData();
    }
  }, [billingModalOpen, session?.user?.id]);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/usage/track?userId=${session?.user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch usage data');
      
      const fetchedData = await response.json();
      setData(fetchedData);
      setError(null);
    } catch (err) {
      console.error('[UsageInsightsModal] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!billingModalOpen) return null;

  const billingData = data || {};
  const currentBalance = balance?.balance || billingData.balance?.current || 0;
  const isZeroBalance = currentBalance === 0;

  const FREE_TIER_LIMIT = 25.00;
  const freeProgress = (billingData.balance?.freeUsed || 0) / FREE_TIER_LIMIT;
  const paidProgress = billingData.balance?.totalPaid ? (billingData.balance?.paidUsed || 0) / billingData.balance?.totalPaid : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-auto flex flex-col">
        {/* Header */}
        <div className={`sticky top-0 ${isZeroBalance ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'} text-white p-6 flex items-center justify-between`}>
          <div>
            <h2 className="text-2xl font-bold">Usage & Billing</h2>
            <p className="text-white text-opacity-90 text-sm mt-1">
              {isZeroBalance ? '⚠️ Balance is zero - Please add funds' : 'Track your API usage and costs'}
            </p>
            {!isZeroBalance && (
              <p className="text-white text-opacity-75 text-xs mt-2">
                We accept: Solana • Ethereum • BNB Smart Chain • Bitcoin
              </p>
            )}
          </div>
          <button
            onClick={closeBillingModal}
            className={`p-2 rounded-lg transition-colors ${
              isZeroBalance
                ? 'hover:bg-red-500'
                : 'hover:bg-blue-500'
            }`}
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Zero Balance Alert */}
              {isZeroBalance && (
                <div className="mb-6 p-6 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="flex gap-4 items-start">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-red-900 mb-2">Your balance has reached zero</h3>
                      <p className="text-red-800 text-sm mb-4">
                        To continue using API services, you need to add funds to your account.
                        We accept multiple cryptocurrencies: Solana, Ethereum, BNB Smart Chain, and Bitcoin.
                      </p>
                      <button
                        onClick={() => setShowPayment(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                      >
                        Add Funds Now →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              {!isZeroBalance && (
                <div className="flex gap-2 mb-6 border-b border-gray-200">
                  {['overview', 'operations', 'history'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-3 font-medium text-sm transition-colors ${
                        activeTab === tab
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              )}

              {/* Overview Tab */}
              {(isZeroBalance || activeTab === 'overview') && (
                <div className="space-y-6">
                  {/* Current Balance */}
                  <div className={`rounded-lg p-6 border ${isZeroBalance ? 'bg-red-50 border-red-200' : 'bg-gradient-to-br from-green-50 to-green-100 border border-green-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-semibold ${isZeroBalance ? 'text-red-900' : 'text-green-900'}`}>Current Balance</h3>
                      <Wallet className={`w-6 h-6 ${isZeroBalance ? 'text-red-600' : 'text-green-600'}`} />
                    </div>
                    <div className={`text-4xl font-bold ${isZeroBalance ? 'text-red-700' : 'text-green-700'}`}>
                      ${currentBalance.toFixed(2)}
                    </div>
                    <p className={`text-sm mt-2 ${isZeroBalance ? 'text-red-600' : 'text-green-600'}`}>
                      {isZeroBalance ? 'Please add funds to continue' : 'Ready to use for API calls'}
                    </p>
                  </div>

                  {/* Free Tier Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">Free Tier (${FREE_TIER_LIMIT})</span>
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        ${billingData.balance?.freeUsed?.toFixed(2) || '0.00'} / ${FREE_TIER_LIMIT}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(freeProgress * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      ${Math.max(0, FREE_TIER_LIMIT - (billingData.balance?.freeUsed || 0)).toFixed(2)} remaining (one-time use)
                    </p>
                  </div>

                  {/* Paid Credits */}
                  {billingData.balance?.totalPaid > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-purple-600" />
                          <span className="font-semibold text-gray-900">Paid Credits</span>
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          ${billingData.balance?.paidUsed?.toFixed(2) || '0.00'} / ${billingData.balance?.totalPaid?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-400 to-purple-600 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(paidProgress * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stats Grid */}
                  {!isZeroBalance && (
                    <div className="grid grid-cols-3 gap-4 pt-4">
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <Zap className="w-5 h-5 text-yellow-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900">{billingData.usage?.apiCalls || 0}</p>
                        <p className="text-xs text-gray-600 mt-1">API Calls</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <TrendingUp className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900">{billingData.usage?.tokensConsumed || 0}</p>
                        <p className="text-xs text-gray-600 mt-1">Tokens Used</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900">${billingData.balance?.totalSpent?.toFixed(2) || '0.00'}</p>
                        <p className="text-xs text-gray-600 mt-1">Total Spent</p>
                      </div>
                    </div>
                  )}

                  {/* Add Balance Section */}
                  <div className={`rounded-lg p-6 border-2 ${isZeroBalance ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-300'}`}>
                    <h3 className={`font-semibold mb-4 ${isZeroBalance ? 'text-red-900' : 'text-blue-900'}`}>
                      {isZeroBalance ? '⚠️ Add Balance to Continue' : 'Add Balance to Your Account'}
                    </h3>

                    {/* Quick Amount Presets */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {['10.00', '25.00', '50.00', '100.00'].map(amount => (
                        <button
                          key={amount}
                          onClick={() => setCustomAmount(amount)}
                          className={`py-2 px-3 rounded-lg font-medium text-sm transition-colors border ${
                            customAmount === amount
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
                          }`}
                        >
                          ${amount}
                        </button>
                      ))}
                    </div>

                    {/* Custom Amount Input */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Amount (USD)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(parseFloat(e.target.value).toFixed(2))}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          placeholder="Enter amount in USD"
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-2">Minimum: $1.00</p>
                    </div>

                    {/* Top Up Button */}
                    <button
                      onClick={() => setShowPayment(true)}
                      className={`w-full py-3 rounded-lg font-medium transition-colors text-white ${
                        isZeroBalance
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      Top Up with ${parseFloat(customAmount).toFixed(2)} →
                    </button>
                  </div>
                </div>
              )}

              {/* Operations Tab */}
              {activeTab === 'operations' && !isZeroBalance && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">API Usage by Operation</h3>
                  {Object.entries(billingData.insights?.operationBreakdown || {}).length > 0 ? (
                    Object.entries(billingData.insights.operationBreakdown).map(([operation, stats]) => (
                      <div key={operation} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{operation}</span>
                          <span className="text-sm font-semibold text-blue-600">${stats.totalCost.toFixed(4)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>Calls: <span className="font-semibold text-gray-900">{stats.count}</span></div>
                          <div>Tokens: <span className="font-semibold text-gray-900">{stats.totalTokens}</span></div>
                          <div>Avg: <span className="font-semibold text-gray-900">${(stats.totalCost / stats.count).toFixed(4)}</span></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 text-center py-8">No API calls yet</p>
                  )}
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && !isZeroBalance && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 sticky top-0 bg-white py-2">Recent API Calls</h3>
                  {billingData.insights?.recentCalls?.length > 0 ? (
                    billingData.insights.recentCalls.map(call => (
                      <div key={call.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{call.operation}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(call.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">${call.cost?.toFixed(4)}</p>
                            <p className="text-xs text-gray-500">{call.tokens_used} tokens</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 text-center py-8">No API calls yet</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Payment Widget */}
        {showPayment && (
          <CryptoPaymentWidget
            userId={session?.user?.id}
            initialAmount={customAmount}
            onSuccess={() => {
              setShowPayment(false);
              handlePaymentSuccess();
            }}
            onClose={() => setShowPayment(false)}
          />
        )}
      </div>
    </div>
  );
}

export default UsageInsightsModal;
