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
  { id: "all", name: "All Businesses", shortName: "Portfolio", href: "/", monetization: "Combined revenue, pipeline and priorities", nav: [{ name: "Portfolio dashboard", href: "/", description: "Combined performance" }, { name: "Money tasks", href: "/money-tasks", description: "Highest-impact actions" }, { name: "Revenue ledger", href: "/revenue", description: "Collected and forecast" }] },
  { id: "waas", name: "WAAS — Bennie Studio", shortName: "WAAS", href: "/leads", monetization: "Close website builds and retainers", nav: [{ name: "Sales & Clients", href: "/leads", description: "Capture and qualify demand" }, { name: "MRR / Pipeline", href: "/pipeline", description: "Move deals to paid" }, { name: "Proposals", href: "/proposals", description: "Send and close offers" }, { name: "Delivery", href: "/queue", description: "Protect retention" }] },
  { id: "amway", name: "Amway — Diamond Path", shortName: "Amway", href: "/diamond", monetization: "Develop prospects into repeat customers and team volume", nav: [{ name: "Prospects", href: "/diamond", description: "Build the relationship list" }, { name: "Follow-up", href: "/diamond", description: "Keep next actions moving" }, { name: "Pipeline", href: "/diamond", description: "Advance to customer" }, { name: "Customers", href: "/diamond", description: "Grow repeat volume" }] },
];

export const businessTopology = businessContexts.filter(context => context.id !== "all");

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
