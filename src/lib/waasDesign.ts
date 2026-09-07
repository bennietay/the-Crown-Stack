export const WAAS_STYLES = ["modern", "bold", "premium", "minimal", "elegant", "vibrant"] as const;
export type WaasStyle = (typeof WAAS_STYLES)[number];

export const WAAS_NICHES = ["Home Services", "Professional Services", "Beauty & Wellness", "Healthcare", "F&B", "Automotive", "Education", "B2B / Industrial"] as const;

const hex = /^#[0-9a-f]{6}$/i;
const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
function parse(value: string) { return hex.test(value) ? [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16)] : [79, 70, 229]; }
function rgb(values: number[]) { return `#${values.map(v => clamp(v).toString(16).padStart(2, "0")).join("")}`; }
function mix(a: number[], b: number[], ratio: number) { return rgb(a.map((value, index) => value * (1 - ratio) + b[index] * ratio)); }
export function normalizeHex(value: unknown, fallback = "#4f46e5") { const candidate = String(value || "").trim(); return hex.test(candidate) ? candidate.toUpperCase() : fallback; }
export function relativeLuminance(value: string) { const channels = parse(value).map(channel => channel / 255).map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4); return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]; }
export function contrastRatio(first: string, second: string) { const a = relativeLuminance(first); const b = relativeLuminance(second); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }
export function deriveBrandTokens(primaryInput: unknown, secondaryInput?: unknown) {
  const primary = normalizeHex(primaryInput); const secondary = normalizeHex(secondaryInput, "#f59e0b"); const p = parse(primary); const s = parse(secondary); const textOnPrimary = contrastRatio(primary, "#ffffff") >= 4.5 ? "#ffffff" : "#0f172a"; const textOnSecondary = contrastRatio(secondary, "#0f172a") >= 4.5 ? "#0f172a" : "#ffffff";
  return { primary, secondary, primaryHover: mix(p, [0, 0, 0], 0.14), primaryLight: mix(p, [255, 255, 255], 0.86), accent: secondary, backgroundTint: mix(p, [255, 255, 255], 0.94), border: mix(p, [255, 255, 255], 0.72), textOnPrimary, textOnSecondary };
}

export const STYLE_PROFILES: Record<WaasStyle, { density: string; radius: string; shadow: string; animation: string }> = {
  modern: { density: "balanced", radius: "12px", shadow: "0 16px 36px #0f172a12", animation: "soft" }, bold: { density: "high", radius: "8px", shadow: "0 18px 42px #0f172a24", animation: "energetic" }, premium: { density: "spacious", radius: "4px", shadow: "0 18px 48px #0f172a18", animation: "refined" }, minimal: { density: "airy", radius: "2px", shadow: "0 8px 20px #0f172a0d", animation: "minimal" }, elegant: { density: "spacious", radius: "14px", shadow: "0 14px 32px #0f172a14", animation: "graceful" }, vibrant: { density: "high", radius: "18px", shadow: "0 20px 44px #0f172a20", animation: "lively" },
};
