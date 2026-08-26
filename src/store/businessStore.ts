import { create } from "zustand";

export type BusinessContext = "all" | "waas" | "etsy" | "affiliate" | "amway";

export const businessContexts: Array<{ id: BusinessContext; name: string; href: string }> = [
  { id: "all", name: "All Businesses", href: "/" },
  { id: "waas", name: "WAAS — Bennie Studio", href: "/leads" },
  { id: "etsy", name: "Etsy — The Named Nest", href: "/etsy" },
  { id: "affiliate", name: "Affiliate Business", href: "/businesses" },
  { id: "amway", name: "Amway — Diamond Path", href: "/diamond" },
];

interface BusinessState {
  activeBusiness: BusinessContext;
  setActiveBusiness: (business: BusinessContext) => void;
}

const storedBusiness = typeof window === "undefined" ? null : window.localStorage.getItem("bennie.activeBusiness") as BusinessContext | null;
const validStoredBusiness = businessContexts.some(context => context.id === storedBusiness) ? storedBusiness : "all";

export const useBusinessStore = create<BusinessState>(set => ({
  activeBusiness: validStoredBusiness || "all",
  setActiveBusiness: activeBusiness => {
    if (typeof window !== "undefined") window.localStorage.setItem("bennie.activeBusiness", activeBusiness);
    set({ activeBusiness });
  },
}));
