import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

const roleRedirectMap: Record<string, string> = {
  admin: '/admin',
  pm: '/',
  contractor: '/',
  viewer: '/viewer',
};

const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!email || !password || (isSignUp && !name)) {
      setError('All fields are required.');
      setLoading(false);
      return;
    }
    try {
      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({ email, password });
        if (result.data?.user) {
          // Insert into users table
          await supabase
            .from('users')
            .insert({
              uuid: result.data.user.id,
              email,
              name,
              role: 'contractor',
            });
        }
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }
      if (result.error) {
        setError(result.error.message);
      } else {
        // Fetch user role and redirect
        const user = result.data?.user;
        if (user) {
          const { data } = await supabase
            .from('users')
            .select('role')
            .eq('uuid', user.id)
            .single();
          const role = data?.role || 'contractor';
          router.push(roleRedirectMap[role] || '/');
        } else {
          window.location.reload();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    setResetSent(false);
    if (!email) {
      setResetError('Please enter your email.');
      setResetLoading(false);
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        setResetError(error.message);
      } else {
        setResetSent(true);
      }
    } catch (err: any) {
      setResetError(err.message || 'Failed to send reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <form onSubmit={showReset ? handleReset : handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
          {showReset ? 'Reset Password' : isSignUp ? 'Sign Up' : 'Sign In'}
        </h2>
        {isSignUp && !showReset && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-black mb-1">Name</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
        )}
        <div className="mb-4">
          <label className="block text-sm font-medium text-black mb-1">Email</label>
          <input
            type="email"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        {!showReset && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-black mb-1">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>
        )}
        {error && !showReset && <div className="mb-4 text-red-600 text-sm text-center">{error}</div>}
        {resetError && showReset && <div className="mb-4 text-red-600 text-sm text-center">{resetError}</div>}
        {resetSent && showReset && <div className="mb-4 text-green-600 text-sm text-center">Password reset email sent!</div>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          disabled={loading || resetLoading}
        >
          {showReset
            ? resetLoading
              ? 'Sending...'
              : 'Send Reset Email'
            : loading
            ? (isSignUp ? 'Signing Up...' : 'Signing In...')
            : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
        <div className="mt-4 text-center flex flex-col gap-2">
          {!showReset && (
            <button
              type="button"
              className="text-blue-600 hover:underline text-sm"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={loading}
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          )}
          {!showReset && (
            <button
              type="button"
              className="text-blue-600 hover:underline text-xs"
              onClick={() => setShowReset(true)}
              disabled={loading}
            >
              Forgot password?
            </button>
          )}
          {showReset && (
            <button
              type="button"
              className="text-blue-600 hover:underline text-xs"
              onClick={() => setShowReset(false)}
              disabled={resetLoading}
            >
              Back to sign in
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AuthScreen; 