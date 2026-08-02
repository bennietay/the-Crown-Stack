import { useState, useEffect } from "react";
import { useAuthStore } from "@/src/store/authStore";
import { Button } from "@/src/components/ui/button";
import { Mail, Lock, AlertCircle, CheckCircle2, ArrowRight, ExternalLink } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/src/firebase";

export function Login() {
  const loginUser = useAuthStore(state => state.loginUser);
  const loginWithGoogle = useAuthStore(state => state.loginWithGoogle);
  const authStoreError = useAuthStore(state => state.error);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await loginUser(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isInIframe) {
      setError("Google Sign-In may be blocked inside the preview editor. Please open the app in a new tab to use Google Sign-In, or use email/password instead.");
      // We still try it, but the user is warned
    }
    
    try {
      setLoading(true);
      setError(null);
      await loginWithGoogle();
    } catch (err: any) {
      let friendlyError = err.message;
      if (err.code === "auth/popup-closed-by-user") {
        friendlyError = "Sign-in popup was closed before completing.";
      } else if (err.code === "auth/unauthorized-domain") {
        friendlyError = "This domain is not authorized for Google Sign-In in Firebase. Please add it to your Firebase Auth settings.";
      } else if (err.code === "auth/popup-blocked") {
         friendlyError = "Sign-in popup was blocked by your browser. Please allow popups or open the app in a new tab.";
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    try {
      if (auth) {
        await sendPasswordResetEmail(auth, email);
        setMessage("Password reset email sent. Please check your inbox.");
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left side - Visual/Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-slate-900 z-0"></div>
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-white font-bold text-2xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-sm"></div>
            </div>
            Bennie Studio
          </div>
        </div>
        
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
            Manage your leads, proposals, and projects in one place.
          </h1>
          <p className="text-slate-400 text-lg">
            Streamline your agency workflow with powerful tools built specifically for modern creative studios.
          </p>
        </div>
        
        <div className="relative z-10 flex items-center gap-4 text-slate-400 text-sm">
          <span>&copy; {new Date().getFullYear()} Bennie Studio</span>
          <span>&bull;</span>
          {(import.meta as any).env.VITE_PRIVACY_URL && <a href={(import.meta as any).env.VITE_PRIVACY_URL} className="hover:text-white transition-colors">Privacy</a>}
          {(import.meta as any).env.VITE_PRIVACY_URL && (import.meta as any).env.VITE_TERMS_URL && <span>&bull;</span>}
          {(import.meta as any).env.VITE_TERMS_URL && <a href={(import.meta as any).env.VITE_TERMS_URL} className="hover:text-white transition-colors">Terms</a>}
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
              Welcome back
            </h2>
            <p className="text-slate-500">
              Enter your credentials to access your workspace
            </p>
          </div>

          {(error || authStoreError) && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex gap-3 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Authentication error</p>
                <p className="text-red-600 mt-1">{error || authStoreError}</p>
                {isInIframe && (error || authStoreError)?.includes('popup') && (
                  <div className="mt-2 text-red-700 font-medium flex items-center gap-1">
                    <ExternalLink className="w-4 h-4" />
                    Please open the app in a new tab to use Google Sign-In.
                  </div>
                )}
              </div>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex gap-3 text-emerald-800 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Success</p>
                <p className="text-emerald-600 mt-1">{message}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 p-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">Password</label>
                <button 
                  type="button" 
                  onClick={handleReset} 
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 p-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-medium h-12 rounded-xl shadow-sm transition-all"
            >
              {loading ? "Please wait..." : "Sign In"}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-slate-50 text-slate-500 font-medium">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Access is invitation-only. Contact your workspace administrator if you need an account.
          </p>
        </div>
      </div>
    </div>
  );
}
