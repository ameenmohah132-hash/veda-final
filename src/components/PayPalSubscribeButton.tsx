import { useEffect, useRef, useState } from 'react';
import { getAccessToken } from '../lib/supabase';
import { AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    paypal?: any;
  }
}

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;
// Single monthly plan — there is no annual option.
const MONTHLY_PLAN_ID = import.meta.env.VITE_PAYPAL_PLAN_ID_MONTHLY as string | undefined;

let sdkLoadPromise: Promise<void> | null = null;
function loadPayPalSdk(): Promise<void> {
  if (window.paypal) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      PAYPAL_CLIENT_ID || ''
    )}&vault=true&intent=subscription&currency=USD`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.body.appendChild(script);
  });

  return sdkLoadPromise;
}

interface PayPalSubscribeButtonProps {
  onSuccess: () => void;
  onError?: (message: string) => void;
}

export function PayPalSubscribeButton({ onSuccess, onError }: PayPalSubscribeButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'verifying' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!PAYPAL_CLIENT_ID || !MONTHLY_PLAN_ID) {
      setStatus('error');
      setErrorMsg(
        'PayPal is not configured yet (missing VITE_PAYPAL_CLIENT_ID / plan ID). Set these environment variables to enable real payments.'
      );
      return;
    }

    loadPayPalSdk()
      .then(() => {
        if (cancelled || !containerRef.current || !window.paypal) return;
        containerRef.current.innerHTML = '';

        window.paypal
          .Buttons({
            style: { shape: 'pill', color: 'black', layout: 'vertical', label: 'subscribe' },
            createSubscription: (_data: any, actions: any) =>
              actions.subscription.create({ plan_id: MONTHLY_PLAN_ID }),
            onApprove: async (data: any) => {
              setStatus('verifying');
              try {
                const token = await getAccessToken();
                if (!token) throw new Error('You must be signed in to subscribe.');

                const res = await fetch('/api/paypal/verify-subscription', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ subscriptionID: data.subscriptionID, billing: 'monthly' }),
                });

                if (!res.ok) {
                  const body = await res.json().catch(() => ({}));
                  throw new Error(body?.error || 'Could not verify your subscription with PayPal.');
                }

                onSuccess();
              } catch (err: any) {
                setStatus('error');
                const msg = err?.message || 'Subscription verification failed.';
                setErrorMsg(msg);
                onError?.(msg);
              }
            },
            onError: (err: any) => {
              setStatus('error');
              const msg = 'PayPal checkout failed. Please try again.';
              setErrorMsg(msg);
              onError?.(msg);
              console.error('PayPal Buttons error:', err);
            },
          })
          .render(containerRef.current);

        setStatus('ready');
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err.message || 'Failed to load PayPal.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'error') {
    return (
      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{errorMsg}</span>
      </div>
    );
  }

  return (
    <div>
      {status === 'verifying' && (
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          Confirming your subscription with PayPal...
        </p>
      )}
      <div ref={containerRef} />
    </div>
  );
}
