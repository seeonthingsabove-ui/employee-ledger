import React, { useEffect, useRef, useState } from 'react';
import { AuthenticatedUser } from '../types';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, unknown>
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const decodeJwtPayload = (token: string) => {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to decode JWT', e);
    return null;
  }
};

const loadGoogleScript = () =>
  new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.getElementById('google-identity');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.id = 'google-identity';
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });

const GoogleLogin: React.FC<{
  onLogin: (user: AuthenticatedUser) => void;
}> = ({ onLogin }) => {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string>('');
  const [ready, setReady] = useState(false);
  const clientId = process.env.GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      setError('Missing GOOGLE_CLIENT_ID in environment.');
      return;
    }
    loadGoogleScript()
      .then(() => {
        if (!window.google?.accounts?.id) {
          setError('Google Identity Services failed to load.');
          return;
        }
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => {
            const payload = decodeJwtPayload(resp.credential);
            if (!payload?.email) {
              setError('Could not read email from Google login.');
              return;
            }
            onLogin({
              email: payload.email.toLowerCase(),
              name: payload.name,
              picture: payload.picture,
            });
          },
        });
        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            width: 300,
          });
        }
        setReady(true);
      })
      .catch(() => setError('Failed to load Google login.'));
  }, [clientId, onLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white shadow-lg rounded-xl p-8 border border-slate-200 w-[360px]">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Sign in</h1>
        <p className="text-sm text-slate-600 mb-6">
          Use your Google account to continue.
        </p>
        <div className="flex justify-center mb-3">
          <div ref={buttonRef}></div>
        </div>
        {!ready && !error && (
          <p className="text-xs text-slate-500 text-center">Loading Google...</p>
        )}
        {error && (
          <p className="text-sm text-red-600 text-center mt-2">{error}</p>
        )}
        <p className="text-[11px] text-slate-400 text-center mt-4">
          We only use your email to check your role from the employee sheet.
        </p>
      </div>
    </div>
  );
};

export default GoogleLogin;
