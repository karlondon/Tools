'use client';
import { useState, useEffect } from 'react';
import { paymentAPI } from '@/lib/api';
import BitcoinPayment from '@/components/BitcoinPayment';

export default function UpgradePage() {
  const [plans, setPlans] = useState<any[]>([]);
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const status = params?.get('status');

  useEffect(() => {
    paymentAPI.getPlans().then(r => setPlans(r.data));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      {status === 'success' && (
        <div className="bg-green-900 border border-green-500 text-green-300 rounded-lg p-4 mb-8 text-center">
          ✓ Payment confirmed! Your membership has been upgraded.
        </div>
      )}
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl font-bold text-white mb-3">Upgrade Your <span className="text-gold-400">Membership</span></h1>
        <p className="text-gray-400 text-lg">Unlock the full Gilded experience. Pay privately with Bitcoin.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan: any) => <BitcoinPayment key={plan.tier} plan={plan} />)}
      </div>
      <div className="mt-12 card-dark text-center">
        <h3 className="text-gold-400 font-semibold mb-2">₿ Why Bitcoin?</h3>
        <p className="text-gray-400 text-sm max-w-2xl mx-auto">We accept Bitcoin via BTCPay Server for complete privacy. No credit card statements, no third-party trackers. Your financial privacy matters as much as your personal privacy.</p>
      </div>
    </div>
  );
}