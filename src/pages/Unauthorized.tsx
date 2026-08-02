import React from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useNavigate } from "@/src/lib/router";
import { useAuthStore } from "../store/authStore";
import { ROLE_DISPLAY_NAMES } from "../types";

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const workspace = useAuthStore(state => state.workspace);
  const workspaceRoles = useAuthStore(state => state.workspaceRoles);

  const activeRole = workspace ? workspaceRoles[workspace.id] || user?.role || "customer" : "customer";
  const displayRoleName = ROLE_DISPLAY_NAMES[activeRole] || activeRole;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Access Restricted</h1>
          <p className="text-sm text-slate-600">
            You do not have permission to access this page or module.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-left space-y-1 text-slate-600">
          <div><span className="font-semibold text-slate-700">Account Email:</span> {user?.email || "N/A"}</div>
          <div><span className="font-semibold text-slate-700">Active Workspace:</span> {workspace?.name || "N/A"}</div>
          <div><span className="font-semibold text-slate-700">Assigned Role:</span> <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-800 uppercase tracking-wider">{displayRoleName}</span></div>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => navigate("/")}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
