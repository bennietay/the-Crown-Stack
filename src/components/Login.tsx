/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../types";
import { 
  ShieldAlert, 
  LogIn, 
  Lock, 
  Mail, 
  CheckCircle, 
  User as UserIcon, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  Scale
} from "lucide-react";
import { getSupabaseUserName, supabase, supabaseConfigured } from "../db/supabase";
import { pullFromSupabase, pushLocalToSupabase } from "../db/supabaseSync";

interface LoginProps {
  userEmail: string;
  onLoginSuccess: (user: User) => void;
}

export default function Login({ userEmail, onLoginSuccess }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(userEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Compliance consents (Required)
  const [consentPdpa, setConsentPdpa] = useState(false);
  const [consentRules, setConsentRules] = useState(false);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSupabaseError = (err: any) => {
    console.error("Supabase Auth Error:", err);
    const code = err.code || err.status;
    const message = String(err.message || "");
    switch (code) {
      case "user_already_exists":
      case 422:
        if (!/already/i.test(message)) break;
        return "This email is already registered. Please sign in instead.";
      case "validation_failed":
        return "Please enter a valid email address.";
      case "invalid_credentials":
      case 400:
        if (!/password|credential|login/i.test(message)) break;
        return "Incorrect email or password. Please try again.";
      default:
        return err.message || "An authentication error occurred. Please try again.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (isRegister) {
      if (!name.trim()) {
        setError("Please enter your full name.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (!consentPdpa) {
        setError("You must consent to the PDPA statement to register.");
        return;
      }
      if (!consentRules) {
        setError("You must agree to the Amway Malaysia Rules of Conduct to register.");
        return;
      }
    }

    setLoading(true);

    try {
      if (!supabaseConfigured) {
        throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before using production authentication.");
      }
      if (!supabase) {
        throw new Error("Supabase Auth is unavailable. Verify the Supabase environment variables and rebuild the app.");
      }

      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name }
          }
        });
        if (signUpError) throw signUpError;

        if (!data.session || !data.user) {
          setSuccessMsg("Account created. Check your email to confirm the account, then sign in to open your workspace.");
          return;
        }

        setSuccessMsg("Account registered successfully. Backing up default workspace configurations to Supabase...");
        await pushLocalToSupabase();

        const loggedUser: User = {
          id: data.user.id,
          email: data.user.email || email,
          name: name
        };

        localStorage.setItem("pf_user", JSON.stringify(loggedUser));
        onLoginSuccess(loggedUser);
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (!data.user) throw new Error("No Supabase user returned after sign in.");

        setSuccessMsg("Authenticated successfully. Syncing your secure workspace database...");
        await pullFromSupabase();

        const loggedUser: User = {
          id: data.user.id,
          email: data.user.email || email,
          name: getSupabaseUserName(data.user)
        };

        localStorage.setItem("pf_user", JSON.stringify(loggedUser));
        onLoginSuccess(loggedUser);
      }
    } catch (err: any) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLocalDemoAccess = () => {
    const demoUser: User = {
      id: "local-demo",
      email: "demo@prospectflow.local",
      name: "Demo User"
    };
    localStorage.setItem("pf_user", JSON.stringify(demoUser));
    onLoginSuccess(demoUser);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center p-4 font-sans">
      <div className="w-full max-w-lg mx-auto bg-white rounded-[24px] shadow-md border border-slate-200 overflow-hidden flex flex-col">
        {/* Header Branding */}
        <div className="bg-slate-900 text-white px-6 py-8 text-center relative">
          <div className="mx-auto w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-3 shadow-md">
            <LogIn className="w-5 h-5 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">ProspectFlow MY</h1>
          <p className="text-slate-300 text-xs mt-1">Compliance-minded prospecting CRM for Amway Malaysia</p>
          <div className="absolute top-3 right-3 bg-emerald-500/20 border border-emerald-500 text-[10px] text-emerald-400 font-mono py-0.5 px-2 rounded-full font-bold">
            Setup Required
          </div>
        </div>

        {/* Toggle tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-3.5 text-center text-sm font-semibold transition-colors border-b-2 ${
              !isRegister
                ? "border-emerald-500 text-emerald-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-3.5 text-center text-sm font-semibold transition-colors border-b-2 ${
              isRegister
                ? "border-emerald-500 text-emerald-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Create Production Account
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 flex-1 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name (Sponsor / ABO Name)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    id="register-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tay Han Hau"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-20 text-sm bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ABO Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.name@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-20 text-sm bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Secure Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-20 text-sm bg-slate-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Secure Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="register-confirm-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-20 text-sm bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Production Legal & Compliance Consents (Required for Production Sign-up) */}
            {isRegister && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3.5">
                <div className="flex items-start space-x-2.5">
                  <input
                    id="pdpa-consent"
                    type="checkbox"
                    required
                    checked={consentPdpa}
                    onChange={(e) => setConsentPdpa(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <label htmlFor="pdpa-consent" className="text-[10px] text-slate-600 leading-relaxed select-none">
                    <strong className="text-slate-800 block">Personal Data Protection Act (PDPA) 2010 Consent</strong>
                    I consent to storing and processing lead names, phones, and interaction logs. I confirm that I will collect opt-in consent before contacting leads or sending webinar invitations.
                  </label>
                </div>

                <div className="flex items-start space-x-2.5">
                  <input
                    id="rules-consent"
                    type="checkbox"
                    required
                    checked={consentRules}
                    onChange={(e) => setConsentRules(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <label htmlFor="rules-consent" className="text-[10px] text-slate-600 leading-relaxed select-none">
                    <strong className="text-slate-800 block">Amway Malaysia rules & DSAM Compliance</strong>
                    I agree to run this CRM workspace strictly in accordance with Amway Malaysia Rules of Conduct and Direct Selling regulations. I will make no medical claims, no guaranteed income promises, and always represent product refund policies transparently.
                  </label>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center space-x-2 animate-fade-in">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-center space-x-2 animate-fade-in">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {!supabaseConfigured && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-2">
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Supabase is not configured here. Use local demo mode to review the workspace before connecting real authentication.
                </p>
                <button
                  id="local-demo-access"
                  type="button"
                  onClick={handleLocalDemoAccess}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  Preview Local Demo Workspace
                </button>
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center space-x-1 shadow-md disabled:opacity-50"
            >
              <span>{loading ? "Syncing Supabase..." : isRegister ? "Initialize Secure Workspace" : "Access Production Workspace"}</span>
            </button>
          </form>

          {/* Compliance Card Footer */}
          <div className="pt-4 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-2xl space-y-2 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-700 flex items-center space-x-1 uppercase tracking-wider">
                <Scale className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                <span>Regulatory Compliance Standards</span>
              </span>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Configure Supabase and review your own Amway Malaysia/PDPA obligations before using this with real prospects. Avoid income guarantees, medical claims, spam, and hidden Amway disclosures.
              </p>
              <div className="flex items-center space-x-1 text-[10px] text-emerald-600 font-semibold">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Review Compliance Before Real Outreach</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
