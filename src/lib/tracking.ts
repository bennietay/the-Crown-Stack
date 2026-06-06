import type { TrackingSettings } from "../types/tenant";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export type DupliosAnalyticsEvent =
  | "start_trial_click"
  | "preview_dashboard_click"
  | "pricing_plan_click"
  | "lead_created"
  | "follow_up_created"
  | "whatsapp_script_copied"
  | "event_created"
  | "no_show_recovery_action"
  | "team_member_invited";

const appendScript = (id: string, src: string) => {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
};

export function applyTracking(settings: TrackingSettings) {
  if (!settings.enabled) return;

  if (settings.googleAnalyticsId) {
    appendScript("ga4-loader", `https://www.googletagmanager.com/gtag/js?id=${settings.googleAnalyticsId}`);
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", settings.googleAnalyticsId, {
      anonymize_ip: true,
      send_page_view: true
    });
  }

  if (settings.metaPixelId && !window.fbq) {
    const fbq = (...args: unknown[]) => {
      (fbq as unknown as { queue?: unknown[] }).queue?.push(args);
    };
    (fbq as unknown as { queue: unknown[]; loaded: boolean; version: string }).queue = [];
    (fbq as unknown as { queue: unknown[]; loaded: boolean; version: string }).loaded = true;
    (fbq as unknown as { queue: unknown[]; loaded: boolean; version: string }).version = "2.0";
    window.fbq = fbq;
    window._fbq = fbq;
    appendScript("meta-pixel-loader", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", settings.metaPixelId);
    window.fbq("track", "PageView");
  }
}

export function trackDupliosEvent(event: DupliosAnalyticsEvent, detail: Record<string, unknown> = {}) {
  window.dataLayer?.push({ event, ...detail });
  window.gtag?.("event", event, detail);
  window.fbq?.("trackCustom", event, detail);
  window.dispatchEvent(new CustomEvent("duplios:analytics", { detail: { event, ...detail } }));
}
