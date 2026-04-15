'use client';
import { useState } from 'react';
import { paymentAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface Plan { tier: string; label: string; priceUsd: number; durationDays: number; features: string[]; }

export default function BitcoinPayment({ plan, onSuccess }: { plan: Plan; onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await paymentAPI.createInvoice(plan.tier);
      const { checkoutUrl } = res.data;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch {
      toast.error('Failed to create payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-dark text-center">
      <div className="text-4xl mb-3">₿</div>
      <h3 className="text-gold-400 font-serif text-xl font-bold mb-1">{plan.label}</h3>
      <p className="text-3xl font-bold text-white mb-1">${plan.priceUsd}<span className="text-gray-400 text-base font-normal">/mo</span></p>
      <p className="text-gray-400 text-sm mb-4">Paid securely in Bitcoin</p>
      <ul className="text-left space-y-2 mb-6">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
            <span className="text-gold-500">✓</span>{f}
          </li>
        ))}
      </ul>
      <button onClick={handlePay} disabled={loading} className="btn-gold w-full disabled:opacity-50">
        {loading ? 'Creating Invoice…' : `Pay with Bitcoin`}
      </button>
      <p className="text-gray-500 text-xs mt-3">Powered by BTCPay Server · Private & secure</p>
    </div>
  );
}