import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, Loader2, LockKeyhole, MessageCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";

type FormState = {
  name: string; company: string; email: string; phone: string; country: string;
  website: string; service: string; budget: string; timing: string; message: string;
  consent: boolean; _honey: string;
};

const EMPTY_FORM: FormState = {
  name: "", company: "", email: "", phone: "", country: "Malaysia", website: "",
  service: "", budget: "", timing: "", message: "", consent: false, _honey: "",
};

const inputClass = "mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

export function LeadCapture() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<any>(null);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);

  const workspaceId = useMemo(() => new URLSearchParams(window.location.search).get("workspace") || "ws-bennie", []);

  useEffect(() => {
    fetch(`/api/settings/${encodeURIComponent(workspaceId)}/public`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setSettings)
      .catch(() => setLoadError("The enquiry form is temporarily unavailable. Please try again later."));
  }, [workspaceId]);

  const required = settings?.leadCapture || {};
  const update = (key: keyof FormState, value: string | boolean) => {
    setFormData((previous) => ({ ...previous, [key]: value }));
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (formData.name.trim().length < 2) errors.name = "Enter your name.";
    if (required.requireCompany && formData.company.trim().length < 2) errors.company = "Enter your company name.";
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) errors.email = "Enter a valid email address.";
    if (required.requirePhone !== false && formData.phone.replace(/\D/g, "").length < 8) errors.phone = "Enter a valid WhatsApp or phone number.";
    if (required.requireCountry && !formData.country.trim()) errors.country = "Enter your country.";
    if (formData.website && !/^https?:\/\//i.test(formData.website)) errors.website = "Include https:// in the website address.";
    if (!formData.service) errors.service = "Choose a service.";
    if (!formData.budget) errors.budget = "Choose an estimated budget.";
    if (!formData.timing) errors.timing = "Choose your preferred timing.";
    if (!formData.consent) errors.consent = "Consent is required so we can respond.";
    setFieldErrors(errors);
    setFormError(Object.keys(errors).length ? "Please check the highlighted fields." : "");
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setFormError("");
    try {
      const params = new URLSearchParams(window.location.search);
      const response = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          source: document.referrer || "direct",
          utm_source: params.get("utm_source") || "",
          utm_medium: params.get("utm_medium") || "",
          utm_campaign: params.get("utm_campaign") || "",
          utm_term: params.get("utm_term") || "",
          utm_content: params.get("utm_content") || "",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.status !== 201 || !body.success || !body.id) {
        if (Array.isArray(body.details)) {
          const serverErrors: Record<string, string> = {};
          for (const issue of body.details) serverErrors[String(issue.path?.[0] || "form")] = issue.message;
          setFieldErrors(serverErrors);
        }
        throw new Error(body.error || "We could not save your request. Please try again.");
      }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We could not save your request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loadError) return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center text-red-700">{loadError}</main>;
  if (!settings) return <main className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" aria-label="Loading enquiry form" /></main>;

  const capture = settings.leadCapture;
  const whatsappUrl = capture.whatsappUrl || "";
  const bookingUrl = capture.bookingUrl || "";

  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-12 flex items-center justify-center">
        <Card className="w-full max-w-xl border-0 shadow-2xl">
          <CardContent className="space-y-6 px-6 py-10 text-center sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-8 w-8" /></div>
            <div><h1 className="text-3xl font-bold text-slate-950">You’re on the list.</h1><p className="mt-3 leading-7 text-slate-600">{capture.successMessage}</p></div>
            {(whatsappUrl || bookingUrl) && <div className="grid gap-3 border-t border-slate-100 pt-6">
              {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#148A4B] px-4 font-semibold text-white hover:bg-[#10723e]"><MessageCircle className="h-4 w-4" /> Continue on WhatsApp</a>}
              {bookingUrl && <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 font-semibold text-white hover:bg-slate-800"><CalendarDays className="h-4 w-4" /> Book a 15-minute call</a>}
            </div>}
          </CardContent>
        </Card>
      </main>
    );
  }

  const FieldError = ({ name }: { name: string }) => fieldErrors[name] ? <p id={`${name}-error`} className="mt-1.5 text-xs font-medium text-red-700" role="alert">{fieldErrors[name]}</p> : null;
  const describedBy = (name: string) => fieldErrors[name] ? `${name}-error` : undefined;
  const benefits = capture.benefitBullets || [];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:grid lg:min-h-screen lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 lg:py-16">
        <section className="pb-10 lg:pb-0">
          <div className="mb-10 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 font-black">B</div><div><p className="font-bold">Bennie Studio</p><p className="text-xs text-slate-400">Web strategy · design · care</p></div></div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-300">{capture.eyebrow}</p>
          <h1 className="mt-4 max-w-xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">{capture.headline}</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">{capture.subheadline}</p>
          <ul className="mt-8 space-y-3">{benefits.map((benefit: string) => <li key={benefit} className="flex items-start gap-3 text-slate-200"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><Check className="h-4 w-4" /></span><span>{benefit}</span></li>)}</ul>
          <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-300"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-indigo-300" />{capture.responsePromise}</span><span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-indigo-300" />No spam. No pressure.</span></div>
        </section>

        <Card className="border-0 bg-white text-slate-950 shadow-2xl shadow-indigo-950/30">
          <CardContent className="px-5 py-7 sm:px-8 sm:py-9">
            <div className="mb-7"><h2 className="text-2xl font-bold">{capture.offerTitle || "Request your project review"}</h2><p className="mt-2 text-sm leading-6 text-slate-600">Share the basics below. You’ll get a useful recommendation—not a generic sales pitch.</p></div>
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {formError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert"><strong>Please check the form.</strong><p className="mt-1">{formError}</p></div>}
              <input type="text" name="_honey" className="hidden" value={formData._honey} onChange={(e) => update("_honey", e.target.value)} tabIndex={-1} autoComplete="off" />
              <div className="grid gap-5 sm:grid-cols-2">
                <div><label htmlFor="name" className="text-sm font-semibold text-slate-800">Name *</label><input id="name" name="name" autoComplete="name" className={inputClass} value={formData.name} onChange={(e) => update("name", e.target.value)} aria-invalid={!!fieldErrors.name} aria-describedby={describedBy("name")} /><FieldError name="name" /></div>
                <div><label htmlFor="company" className="text-sm font-semibold text-slate-800">Company <span className="font-normal text-slate-500">{required.requireCompany ? "*" : "(optional)"}</span></label><input id="company" name="company" autoComplete="organization" className={inputClass} value={formData.company} onChange={(e) => update("company", e.target.value)} aria-invalid={!!fieldErrors.company} aria-describedby={describedBy("company")} /><FieldError name="company" /></div>
                <div><label htmlFor="email" className="text-sm font-semibold text-slate-800">Email *</label><input id="email" name="email" type="email" autoComplete="email" className={inputClass} value={formData.email} onChange={(e) => update("email", e.target.value)} aria-invalid={!!fieldErrors.email} aria-describedby={describedBy("email")} /><FieldError name="email" /></div>
                <div><label htmlFor="phone" className="text-sm font-semibold text-slate-800">WhatsApp / phone *</label><input id="phone" name="phone" type="tel" autoComplete="tel" className={inputClass} placeholder="+60 12-345 6789" value={formData.phone} onChange={(e) => update("phone", e.target.value)} aria-invalid={!!fieldErrors.phone} aria-describedby={describedBy("phone")} /><FieldError name="phone" /></div>
                {required.requireCountry && <div><label htmlFor="country" className="text-sm font-semibold text-slate-800">Country *</label><input id="country" name="country" autoComplete="country-name" className={inputClass} value={formData.country} onChange={(e) => update("country", e.target.value)} aria-invalid={!!fieldErrors.country} aria-describedby={describedBy("country")} /><FieldError name="country" /></div>}
                <div className={required.requireCountry ? "" : "sm:col-span-2"}><label htmlFor="website" className="text-sm font-semibold text-slate-800">Current website <span className="font-normal text-slate-500">(optional)</span></label><input id="website" name="website" type="url" className={inputClass} placeholder="https://" value={formData.website} onChange={(e) => update("website", e.target.value)} aria-invalid={!!fieldErrors.website} aria-describedby={describedBy("website")} /><FieldError name="website" /></div>
                <div><label htmlFor="service" className="text-sm font-semibold text-slate-800">What do you need? *</label><select id="service" name="service" className={inputClass} value={formData.service} onChange={(e) => update("service", e.target.value)} aria-invalid={!!fieldErrors.service} aria-describedby={describedBy("service")}><option value="">Choose a service…</option>{capture.serviceOptions.map((option: string) => <option key={option} value={option}>{option}</option>)}</select><FieldError name="service" /></div>
                <div><label htmlFor="budget" className="text-sm font-semibold text-slate-800">Estimated budget *</label><select id="budget" name="budget" className={inputClass} value={formData.budget} onChange={(e) => update("budget", e.target.value)} aria-invalid={!!fieldErrors.budget} aria-describedby={describedBy("budget")}><option value="">Select a budget…</option>{capture.budgetRanges.map((option: string) => <option key={option} value={option}>{option}</option>)}</select><FieldError name="budget" /></div>
                <div className="sm:col-span-2"><label htmlFor="timing" className="text-sm font-semibold text-slate-800">Preferred timing *</label><select id="timing" name="timing" className={inputClass} value={formData.timing} onChange={(e) => update("timing", e.target.value)} aria-invalid={!!fieldErrors.timing} aria-describedby={describedBy("timing")}><option value="">Choose timing…</option>{capture.timingOptions.map((option: string) => <option key={option} value={option}>{option}</option>)}</select><FieldError name="timing" /></div>
                <div className="sm:col-span-2"><label htmlFor="message" className="text-sm font-semibold text-slate-800">What result do you want? <span className="font-normal text-slate-500">(optional)</span></label><textarea id="message" name="message" rows={3} className={inputClass} placeholder="A few sentences are enough." value={formData.message} onChange={(e) => update("message", e.target.value)} /></div>
              </div>
              <div><label className="flex items-start gap-3 text-sm leading-6 text-slate-700"><input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600" checked={formData.consent} onChange={(e) => update("consent", e.target.checked)} aria-invalid={!!fieldErrors.consent} aria-describedby={describedBy("consent")} /><span>I agree that {settings.business?.name || "Bennie Studio"} may use these details to respond to my enquiry. *</span></label><FieldError name="consent" /></div>
              <Button type="submit" className="h-12 w-full rounded-xl bg-indigo-600 text-base font-bold text-white hover:bg-indigo-700" disabled={loading}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving securely…</> : <>{capture.ctaLabel || "Get my project review"}<ArrowRight className="ml-2 h-4 w-4" /></>}</Button>
              <p className="text-center text-xs leading-5 text-slate-500">{capture.trustNote}{(capture.privacyUrl || capture.termsUrl) && <> {capture.privacyUrl && <a className="underline" href={capture.privacyUrl}>Privacy</a>}{capture.privacyUrl && capture.termsUrl && " · "}{capture.termsUrl && <a className="underline" href={capture.termsUrl}>Terms</a>}</>}</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
