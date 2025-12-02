"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

const roleRedirectMap: Record<string, string> = {
  admin: '/',
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
  const [showPassword, setShowPassword] = useState(false);
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
          // Update user metadata with profile information
          await supabase.auth.updateUser({
            data: {
              name,
            }
          });

          // Insert role into user_role table
          await supabase
            .from('user_role')
            .insert([{
              user_id: result.data.user.id,
              role: 'staff'
            }]);
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
          // Get role from user_role table
          const { data: roleData } = await supabase
            .from('user_role')
            .select('role')
            .eq('user_id', user.id)
            .single();
          
          const role = roleData?.role || 'staff';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center mb-6 shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            {showReset ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-muted-foreground">
            {showReset 
              ? 'Enter your email to receive a password reset link' 
              : isSignUp 
              ? 'Sign up to get started with Construction Management' 
              : 'Sign in to your Construction Management account'
            }
          </p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-2xl shadow-xl p-8 space-y-6">
          <form onSubmit={showReset ? handleReset : handleSubmit} className="space-y-6">
            {/* Name field for sign up */}
            {isSignUp && !showReset && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="name"
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground placeholder-muted-foreground transition-colors"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  className="block w-full pl-10 pr-3 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground placeholder-muted-foreground transition-colors"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password field */}
            {!showReset && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-primary text-gray-900 placeholder-gray-500 transition-colors"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5 text-muted-foreground hover:text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-muted-foreground hover:text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {isSignUp && (
                  <div className="mt-2 text-xs text-gray-500">
                    Password should be at least 8 characters long
                  </div>
                )}
              </div>
            )}

            {/* Error Messages */}
            {error && !showReset && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {resetError && showReset && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{resetError}</p>
                  </div>
                </div>
              </div>
            )}

            {resetSent && showReset && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">Password reset email sent! Check your inbox.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || resetLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {(loading || resetLoading) && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {showReset
                ? resetLoading
                  ? 'Sending Reset Email...'
                  : 'Send Reset Email'
                : loading
                ? (isSignUp ? 'Creating Account...' : 'Signing In...')
                : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          {/* Footer Links */}
          <div className="pt-6 border-t border-gray-200">
            <div className="text-center space-y-2">
              {!showReset && (
                <button
                  type="button"
                  className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                  }}
                  disabled={loading}
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              )}
              
              {!showReset && (
                <div>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-gray-800 text-sm transition-colors"
                    onClick={() => {
                      setShowReset(true);
                      setError(null);
                    }}
                    disabled={loading}
                  >
                    Forgot your password?
                  </button>
                </div>
              )}
              
              {showReset && (
                <button
                  type="button"
                  className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                  onClick={() => {
                    setShowReset(false);
                    setResetError(null);
                    setResetSent(false);
                  }}
                  disabled={resetLoading}
                >
                  ← Back to sign in
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Protected by enterprise-grade security. Your data is encrypted and secure.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen; 