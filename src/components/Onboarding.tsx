/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Settings, InterestType } from "../types";
import { localDb } from "../db/localDb";
import { ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle, MessageSquare, Target } from "lucide-react";

interface OnboardingProps {
  onComplete: (settings: Settings) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("60");
  const [email, setEmail] = useState("");
  const [brandName, setBrandName] = useState("");
  const [mainFocus, setMainFocus] = useState<"All" | InterestType>("All");
  const [dailyLeadTarget, setDailyLeadTarget] = useState(3);
  const [dailyFollowUpTarget, setDailyFollowUpTarget] = useState(5);
  const [stripeLink, setStripeLink] = useState("");
  const [rulesChecked, setRulesChecked] = useState(false);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Compile final settings
      const settings = localDb.getSettings();
      const updatedSettings: Settings = {
        ...settings,
        name: name || settings.name,
        whatsapp_phone: whatsapp.startsWith("60") ? whatsapp : `60${whatsapp.replace(/\D/g, "")}`,
        email: email || settings.email,
        brand_name: brandName || `${name || "My"} Solo Growth`,
        daily_lead_target: dailyLeadTarget,
        daily_follow_up_target: dailyFollowUpTarget,
        stripe_payment_link: stripeLink,
        compliance_accepted: true
      };
      localDb.saveSettings(updatedSettings);
      onComplete(updatedSettings);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* Progress header */}
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between text-slate-900">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              P
            </div>
            <span className="text-slate-900 font-bold text-base tracking-tight">ProspectFlow MY Solo</span>
          </div>
          <span className="text-slate-500 text-xs font-mono">Step {step} of 4</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-1">
          <div
            className="bg-emerald-600 h-1 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Content area */}
        <div className="p-6 flex-1 flex flex-col justify-between min-h-[380px]">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-950 tracking-tight">Tell us about yourself</h2>
                <p className="text-xs text-slate-500">Configure your prospecting system workspace</p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name</label>
                  <input
                    id="onboard-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tay Han Hau"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-20 text-sm bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Business Phone (e.g. 60123456789)</label>
                  <input
                    id="onboard-whatsapp"
                    type="text"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="e.g. 60123456789"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-20 text-sm bg-slate-50 focus:bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Starting with 60 (Malaysia prefix) is required for wa.me redirect links.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    id="onboard-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-20 text-sm bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-950 tracking-tight">Your Business Focus</h2>
                <p className="text-xs text-slate-500">Select your primary marketing alignment</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                {[
                  { value: "All", label: "Full Portfolio (All)", desc: "Wellness, Beauty, Home, and Business" },
                  { value: InterestType.Wellness, label: "Nutrilite Wellness", desc: "Organic supplements & dietary routines" },
                  { value: InterestType.Beauty, label: "Artistry Beauty", desc: "Premium skin science & cosmetics" },
                  { value: InterestType.HomeCare, label: "Amway Home Care", desc: "Biodegradable, eco-friendly concentraters" },
                  { value: InterestType.SideIncome, label: "Side Income Journey", desc: "Flexible e-commerce business model" }
                ].map((item) => (
                  <button
                    id={`onboard-focus-${item.value}`}
                    key={item.value}
                    type="button"
                    onClick={() => setMainFocus(item.value as any)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      mainFocus === item.value
                        ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500"
                        : "border-slate-200 hover:border-slate-300 bg-slate-50 focus:outline-none"
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-800">{item.label}</span>
                    <span className="text-[10px] text-slate-500 mt-1 leading-tight">{item.desc}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Brand/Team Name (Optional)</label>
                <input
                  id="onboard-brand"
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Bright Future Network"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-20 text-sm bg-slate-50"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-950 tracking-tight">Set Daily Action Targets</h2>
                <p className="text-xs text-slate-500">Consistent daily habits drive compounding growth</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-start space-x-2">
                  <Target className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-emerald-800">
                    Your daily dashboard score dynamically updates based on whether you meet these targets. Start simple, then increase targets later.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Daily New Leads Goal</span>
                    <span className="text-emerald-600 font-bold">{dailyLeadTarget} leads</span>
                  </div>
                  <input
                    id="onboard-target-leads"
                    type="range"
                    min="1"
                    max="10"
                    value={dailyLeadTarget}
                    onChange={(e) => setDailyLeadTarget(parseInt(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Daily Reminders/Follow-ups Goal</span>
                    <span className="text-emerald-600 font-bold">{dailyFollowUpTarget} contacts</span>
                  </div>
                  <input
                    id="onboard-target-followups"
                    type="range"
                    min="1"
                    max="15"
                    value={dailyFollowUpTarget}
                    onChange={(e) => setDailyFollowUpTarget(parseInt(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stripe Payment Link (Optional)</label>
                  <input
                    id="onboard-stripe"
                    type="url"
                    value={stripeLink}
                    onChange={(e) => setStripeLink(e.target.value)}
                    placeholder="https://buy.stripe.com/..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-20 text-sm bg-slate-50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">For collecting workshop or consulting payments in Launch mode.</p>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-950 tracking-tight">Compliance & Eligibility</h2>
                <p className="text-xs text-slate-500">Adhere to Amway Malaysia rules of conduct before contacting real prospects</p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-[20px] space-y-2">
                  <div className="flex items-center space-x-1.5 text-rose-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Compliance Mandate</span>
                  </div>
                  <p className="text-[10px] text-rose-800 leading-relaxed">
                    ProspectFlow MY Solo provides transparent training CMS systems. You are strictly forbidden from making income guarantees, medical/disease cure claims, spamming cold users, or hiding the Amway opportunity background.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-start space-x-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      id="onboard-rule-check-1"
                      type="checkbox"
                      checked={rulesChecked}
                      onChange={(e) => setRulesChecked(e.target.checked)}
                      className="mt-1 accent-emerald-600 rounded"
                    />
                    <div className="text-[11px] text-slate-600 leading-tight">
                      I agree NOT to post income guarantees, medical cure statements, or spammy outreach messages using this app.
                    </div>
                  </label>

                  <label className="flex items-start space-x-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      id="onboard-rule-check-2"
                      type="checkbox"
                      checked={eligibilityChecked}
                      onChange={(e) => setEligibilityChecked(e.target.checked)}
                      className="mt-1 accent-emerald-600 rounded"
                    />
                    <div className="text-[11px] text-slate-600 leading-tight">
                      I confirm I will check active Amway Malaysia registration eligibility rules and sponsorship rules of conduct.
                    </div>
                  </label>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl flex items-center space-x-2 border border-slate-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-[10px] text-slate-500">Your workspace is protected by Supabase Auth and row-level security.</span>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center space-x-3 pt-6 border-t border-slate-100">
            {step > 1 && (
              <button
                id="onboard-back-btn"
                type="button"
                onClick={handleBack}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              id="onboard-next-btn"
              type="button"
              disabled={
                (step === 1 && (!name || !whatsapp)) ||
                (step === 4 && (!rulesChecked || !eligibilityChecked))
              }
              onClick={handleNext}
              className={`flex-1 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 text-white text-sm font-semibold transition-all ${
                ((step === 1 && (!name || !whatsapp)) || (step === 4 && (!rulesChecked || !eligibilityChecked)))
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-sm"
              }`}
            >
              <span>{step === 4 ? "Complete Setup" : "Continue"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
