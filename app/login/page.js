"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/');
      }
    };
    checkUser();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        // Sign Up Flow
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });

        if (signUpError) throw signUpError;

        // If auto-confirm is enabled or disabled
        if (data.session) {
          setMessage('Account created successfully! Redirecting...');
          setTimeout(() => {
            router.replace('/');
          }, 1000);
        } else {
          setMessage('Registration successful! Please check your email for a confirmation link.');
          setLoading(false);
        }
      } else {
        // Sign In Flow
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (signInError) throw signInError;

        if (data.session) {
          setMessage('Sign in successful! Redirecting...');
          setTimeout(() => {
            router.replace('/');
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err.message || 'An error occurred during authentication.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e1e38] to-[#0b0f19] p-4 font-sans select-none">
      {/* Decorative background glow circles */}
      <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-sky-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-[100px] pointer-events-none" />

      {/* Main Glass Login Card */}
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all">

        {/* Glowing top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />

        {/* Card Header & Brand Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20 mb-4">
            <svg
              className="h-6 w-6 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            CodeDiary
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Secure developer notebook & notes portal
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 mb-6">
            <svg className="h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400 mb-6">
            <svg className="h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{message}</span>
          </div>
        )}

        {/* Login/Signup Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                id="email"
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-3 pl-4 pr-4 text-slate-100 placeholder-slate-500 outline-none transition duration-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:shadow-[0_0_15px_rgba(56,189,248,0.08)]"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                id="password"
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-3 pl-4 pr-4 text-slate-100 placeholder-slate-500 outline-none transition duration-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:shadow-[0_0_15px_rgba(56,189,248,0.08)]"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 py-3 font-semibold text-white transition duration-200 active:scale-[0.98] shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing...</span>
              </>
            ) : (
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            )}
          </button>
        </form>

        {/* Toggle Form Mode */}
        <div className="mt-6 text-center text-sm text-slate-400">
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                className="text-sky-400 hover:text-sky-300 font-semibold underline bg-transparent border-none cursor-pointer"
                onClick={() => {
                  setIsSignUp(false);
                  setError('');
                  setMessage('');
                }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                className="text-sky-400 hover:text-sky-300 font-semibold underline bg-transparent border-none cursor-pointer"
                onClick={() => {
                  setIsSignUp(true);
                  setError('');
                  setMessage('');
                }}
              >
                Sign Up
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
};

export default Login;
