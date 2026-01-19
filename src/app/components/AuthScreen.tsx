"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const roleRedirectMap: Record<string, string> = {
  admin: '/dashboard',
  pm: '/dashboard',
  contractor: '/dashboard',
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
          await supabase.auth.updateUser({
            data: { name }
          });
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
        const user = result.data?.user;
        if (user) {
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0
    }
  };

  const logoVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0
    }
  };

  const formVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0
    },
    exit: {
      opacity: 0,
      x: 50
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-brand-navy-50 via-background to-brand-navy-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Animated background shapes */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 bg-brand-navy-200 rounded-full mix-blend-multiply filter blur-xl opacity-30"
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full mix-blend-multiply filter blur-xl opacity-20"
        animate={{
          x: [0, -100, 0],
          y: [0, 100, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute -top-10 right-1/3 w-80 h-80 bg-brand-navy-300 rounded-full mix-blend-multiply filter blur-xl opacity-20"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <motion.div
        className="max-w-md w-full space-y-8 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className="text-center" variants={itemVariants}>
          <motion.div
            className="mx-auto h-24 w-24 bg-white border-4 border-brand-navy rounded-2xl flex items-center justify-center mb-6 shadow-2xl"
            variants={logoVariants}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="h-12 w-12 text-brand-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </motion.div>

          <motion.div variants={itemVariants}>
            <motion.h2
              className="text-4xl font-bold text-brand-navy mb-3"
              animate={{ opacity: [0.9, 1, 0.9] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {showReset ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
            </motion.h2>
            <p className="text-muted-foreground text-lg">
              {showReset
                ? 'Enter your email to receive a password reset link'
                : isSignUp
                ? 'Join Stanton Construction Operations'
                : 'Sign in to Stanton Construction Management'
              }
            </p>
          </motion.div>
        </motion.div>

        {/* Form */}
        <AnimatePresence mode="wait">
          <motion.div
            key={showReset ? 'reset' : isSignUp ? 'signup' : 'signin'}
            className="bg-card/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 space-y-6 border border-brand-navy-200"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <form onSubmit={showReset ? handleReset : handleSubmit} className="space-y-6">
              {/* Name field for sign up */}
              <AnimatePresence>
                {isSignUp && !showReset && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label htmlFor="name" className="block text-sm font-semibold text-brand-navy mb-2">
                      Full Name
                    </label>
                    <motion.div
                      className="relative"
                      whileFocus={{ scale: 1.01 }}
                    >
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-brand-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        id="name"
                        type="text"
                        className="block w-full pl-12 pr-4 py-4 border-2 border-brand-navy-200 rounded-xl focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-foreground placeholder-muted-foreground transition-all duration-300 bg-white/50"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        autoComplete="name"
                      />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email field */}
              <motion.div variants={itemVariants}>
                <label htmlFor="email" className="block text-sm font-semibold text-brand-navy mb-2">
                  Email Address
                </label>
                <motion.div
                  className="relative"
                  whileFocus={{ scale: 1.01 }}
                >
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-brand-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    className="block w-full pl-12 pr-4 py-4 border-2 border-brand-navy-200 rounded-xl focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-foreground placeholder-muted-foreground transition-all duration-300 bg-white/50"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </motion.div>
              </motion.div>

              {/* Password field */}
              {!showReset && (
                <motion.div variants={itemVariants}>
                  <label htmlFor="password" className="block text-sm font-semibold text-brand-navy mb-2">
                    Password
                  </label>
                  <motion.div
                    className="relative"
                    whileFocus={{ scale: 1.01 }}
                  >
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-brand-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="block w-full pl-12 pr-14 py-4 border-2 border-brand-navy-200 rounded-xl focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-foreground placeholder-muted-foreground transition-all duration-300 bg-white/50"
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    />
                    <motion.button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5 text-brand-navy-400 hover:text-brand-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-brand-navy-400 hover:text-brand-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </motion.button>
                  </motion.div>
                  {isSignUp && (
                    <motion.div
                      className="mt-2 text-xs text-brand-navy-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      Password should be at least 8 characters long
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Error Messages */}
              <AnimatePresence>
                {error && !showReset && (
                  <motion.div
                    className="bg-destructive/10 border-2 border-destructive/50 rounded-xl p-4"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-destructive mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <p className="text-sm font-medium text-destructive">{error}</p>
                    </div>
                  </motion.div>
                )}

                {resetError && showReset && (
                  <motion.div
                    className="bg-destructive/10 border-2 border-destructive/50 rounded-xl p-4"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-destructive mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <p className="text-sm font-medium text-destructive">{resetError}</p>
                    </div>
                  </motion.div>
                )}

                {resetSent && showReset && (
                  <motion.div
                    className="bg-green-50 border-2 border-green-500/50 rounded-xl p-4"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-medium text-green-800">Password reset email sent! Check your inbox.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading || resetLoading}
                className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-brand-navy to-brand-navy-light hover:from-brand-navy-600 hover:to-brand-navy focus:outline-none focus:ring-4 focus:ring-brand-navy/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                whileHover={{ scale: 1.02, boxShadow: "0 10px 40px rgba(43, 51, 102, 0.3)" }}
                whileTap={{ scale: 0.98 }}
              >
                {(loading || resetLoading) && (
                  <motion.svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </motion.svg>
                )}
                {showReset
                  ? resetLoading
                    ? 'Sending Reset Email...'
                    : 'Send Reset Email'
                  : loading
                  ? (isSignUp ? 'Creating Account...' : 'Signing In...')
                  : (isSignUp ? 'Create Account' : 'Sign In')}
              </motion.button>
            </form>

            {/* Footer Links */}
            <div className="pt-6 border-t border-brand-navy-200">
              <div className="text-center space-y-3">
                {!showReset && (
                  <motion.button
                    type="button"
                    className="text-brand-navy hover:text-brand-navy-600 text-sm font-semibold transition-colors"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                    }}
                    disabled={loading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                  </motion.button>
                )}

                {!showReset && (
                  <div>
                    <motion.button
                      type="button"
                      className="text-muted-foreground hover:text-brand-navy text-sm transition-colors"
                      onClick={() => {
                        setShowReset(true);
                        setError(null);
                      }}
                      disabled={loading}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Forgot your password?
                    </motion.button>
                  </div>
                )}

                {showReset && (
                  <motion.button
                    type="button"
                    className="text-brand-navy hover:text-brand-navy-600 text-sm font-semibold transition-colors flex items-center justify-center mx-auto"
                    onClick={() => {
                      setShowReset(false);
                      setResetError(null);
                      setResetSent(false);
                    }}
                    disabled={resetLoading}
                    whileHover={{ scale: 1.05, x: -5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to sign in
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Security Notice */}
        <motion.div
          className="text-center"
          variants={itemVariants}
        >
          <motion.p
            className="text-sm text-brand-navy-400 flex items-center justify-center"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Protected by enterprise-grade security
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuthScreen;
