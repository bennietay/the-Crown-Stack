import { create } from "zustand";

export type BusinessContext = "all" | "waas" | "amway";

export interface BusinessNavItem {
  name: string;
  href: string;
  description: string;
}

export interface BusinessDefinition {
  id: BusinessContext;
  name: string;
  shortName: string;
  href: string;
  monetization: string;
  nav: BusinessNavItem[];
}

export const businessContexts: BusinessDefinition[] = [
  { id: "all", name: "All Businesses", shortName: "Portfolio", href: "/", monetization: "Combined revenue, pipeline and priorities", nav: [{ name: "Portfolio dashboard", href: "/", description: "Combined performance" }] },
  { id: "waas", name: "WAAS — Bennie Studio", shortName: "WAAS", href: "/waas", monetization: "Close website builds and retainers", nav: [
    { name: "Operations", href: "/waas", description: "Orders, websites and deployments" },
    { name: "Sales & Clients", href: "/leads", description: "Capture and qualify WAAS demand" },
    { name: "MRR / Pipeline", href: "/pipeline", description: "Move WAAS deals to paid" },
    { name: "Proposals", href: "/proposals", description: "Send and close WAAS offers" },
    { name: "Products & Pricing", href: "/products", description: "Manage WAAS plans and offers" },
    { name: "Customers", href: "/customers", description: "Manage WAAS customers" },
    { name: "Support", href: "/tickets", description: "Resolve WAAS customer issues" },
  ] },
  { id: "amway", name: "Amway — Diamond Path", shortName: "Amway", href: "/diamond", monetization: "Develop prospects into repeat customers and team volume", nav: [{ name: "Prospects", href: "/diamond", description: "Build the relationship list" }, { name: "Follow-up", href: "/diamond", description: "Keep next actions moving" }, { name: "Pipeline", href: "/diamond", description: "Advance to customer" }, { name: "Customers", href: "/diamond", description: "Grow repeat volume" }] },
]; 

export const businessTopology = businessContexts.filter(context => context.id !== "all");

/** Routes that are valid while a business workspace is active. Portfolio is intentionally summary-only. */
export const businessRouteMap: Record<BusinessContext, string[]> = {
  all: ["/"],
  waas: ["/waas", "/leads", "/pipeline", "/proposals", "/products", "/customers", "/tickets"],
  amway: ["/diamond"],
};

export function businessOwnsRoute(business: BusinessContext, pathname: string) {
  return businessRouteMap[business].includes(pathname);
}

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
