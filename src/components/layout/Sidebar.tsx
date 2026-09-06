import { Link, useLocation, useNavigate } from "@/src/lib/router";
import { cn } from "@/src/lib/utils";
import { useAuthStore } from "@/src/store/authStore";
import { businessContexts, BusinessContext, useBusinessStore } from "@/src/store/businessStore";
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  LineChart, 
  FileText, 
  PackageSearch,
  Users2,
  LifeBuoy,
  Settings,
  LogOut,
  Coins,
  Target,
  Bell,
  Bot,
  ScrollText,
  BarChart3,
  Sparkles,
} from "lucide-react";

const bennieNavigation = [
  { section: "Command Center", items: [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Money Tasks", href: "/money-tasks", icon: CheckSquare },
    { name: "Revenue Ledger", href: "/revenue", icon: Coins },
    { name: "Goals", href: "/goals", icon: Target },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Daily CEO Brief", href: "/brief", icon: Sparkles },
  ]},
  { section: "Sales", items: [
    { name: "Leads", href: "/leads", icon: Users },
    { name: "Sales Pipeline", href: "/pipeline", icon: LineChart },
    { name: "Proposals", href: "/proposals", icon: FileText },
    { name: "Products & Pricing", href: "/products", icon: PackageSearch },
  ]},
  { section: "Customers", items: [
    { name: "Customers", href: "/customers", icon: Users2 },
    { name: "Support Tickets", href: "/tickets", icon: LifeBuoy },
  ]},
  { section: "Operations", items: [
    { name: "Work Queue", href: "/queue", icon: CheckSquare },
    { name: "Automations", href: "/automations", icon: Bot },
    { name: "Notifications", href: "/notifications", icon: Bell },
  ]},
  { section: "System", items: [
    { name: "Activity", href: "/activity", icon: ScrollText },
    { name: "Settings", href: "/settings", icon: Settings },
  ]}
];

interface SidebarProps {
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ onClose, className }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, workspace, workspaceRoles } = useAuthStore();
  const { activeBusiness, setActiveBusiness } = useBusinessStore();

  const navigationGroups = bennieNavigation;
  const visibleNavigationGroups = activeBusiness === "all"
    ? navigationGroups
    : navigationGroups.filter(group => ["Operations", "System"].includes(group.section));

  const activeRole = workspace ? workspaceRoles[workspace.id] || user?.role || "customer" : user?.role || "customer";
  const activeBusinessDefinition = businessContexts.find(context => context.id === activeBusiness) || businessContexts[0];

  const switchBusiness = (business: BusinessContext) => {
    const context = businessContexts.find(item => item.id === business);
    if (!context) return;
    setActiveBusiness(business);
    navigate(context.href);
    onClose?.();
  };

  const isAllowedForRole = (href: string): boolean => {
    if (user?.role === "super_admin" || activeRole === "super_admin" || activeRole === "workspace_admin") {
      return true;
    }
    if (activeRole === "sales") {
      return ["/", "/queue", "/money-tasks", "/revenue", "/goals", "/analytics", "/brief", "/leads", "/pipeline", "/proposals", "/products", "/customers", "/diamond", "/waas", "/notifications"].includes(href);
    }
    if (activeRole === "operations") {
      return ["/", "/queue", "/money-tasks", "/revenue", "/goals", "/analytics", "/brief", "/products", "/customers", "/tickets", "/diamond", "/waas", "/notifications"].includes(href);
    }
    if (activeRole === "support") {
      return ["/", "/customers", "/tickets", "/diamond", "/waas", "/notifications"].includes(href);
    }
    if (activeRole === "customer") {
      return false;
    }
    return false;
  };

  return (
    <aside className={cn("flex h-full w-64 flex-col border-r border-slate-200 bg-white shadow-sm", className)}>
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0",
            "bg-indigo-600"
          )}>
            B
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-tight text-slate-900 block leading-none">
              Bennie Business OS
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Sales & customer operations
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <LogOut className="h-5 w-5 rotate-180" />
          </button>
        )}
      </div>
      
      <div className="px-3 py-4 flex-1 overflow-y-auto space-y-5">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">Active Workspace</label>
          <select 
            aria-label="Active business workspace"
            className="mt-1.5 flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            value={activeBusiness}
            onChange={(e) => switchBusiness(e.target.value as BusinessContext)}
          >
            {businessContexts.map(context => (
              <option key={context.id} value={context.id}>{context.name}</option>
            ))}
          </select>
          <p className="mt-1.5 px-2 text-[10px] leading-4 text-slate-400">Dashboard always combines every business.</p>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5">
          <div className="px-1 pb-2"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">{activeBusinessDefinition.shortName} operating area</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{activeBusinessDefinition.monetization}</p></div>
          <div className="space-y-0.5">{activeBusinessDefinition.nav.map(item => <Link key={`${activeBusiness}-${item.name}`} to={item.href} onClick={onClose} title={item.description} className={cn("flex items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-semibold", location.pathname === item.href ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:bg-white/80 hover:text-indigo-700")}><span>{item.name}</span><span className="text-[9px] text-slate-400">→</span></Link>)}</div>
        </div>

        <nav className="space-y-4">
          {visibleNavigationGroups.map((group) => {
            const filteredItems = group.items.filter(item => isAllowedForRole(item.href));
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.section} className="space-y-1">
                <h3 className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.section}
                </h3>
                <div className="space-y-0.5">
                  {filteredItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all active:scale-[0.98]",
                          isActive
                            ? "bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-200/60"
                            : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive 
                              ? "text-indigo-600"
                              : "text-slate-400"
                          )}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-slate-100 p-3 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
            {user?.name.charAt(0) || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-xs font-bold text-slate-800">{user?.name}</p>
            <p className="truncate text-[10px] text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button 
          onClick={() => {
            if (onClose) onClose();
            useAuthStore.getState().logout();
          }}
          className="mt-2.5 w-full rounded-lg text-xs text-rose-600 hover:bg-rose-50 p-2 font-semibold text-left flex items-center gap-2 transition-colors active:scale-[0.98]"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
