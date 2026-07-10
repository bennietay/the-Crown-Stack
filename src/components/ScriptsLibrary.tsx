/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Script, Settings } from "../types";
import { localDb } from "../db/localDb";
import { 
  FileText, 
  Search, 
  Plus, 
  Edit3, 
  Trash, 
  AlertTriangle, 
  CheckCircle, 
  Copy, 
  ChevronRight,
  ShieldCheck,
  Code
} from "lucide-react";

interface ScriptsLibraryProps {
  settings: Settings;
}

const CATEGORIES = [
  "First Message", "Wellness", "Beauty", "Home Care", "Side Income", 
  "Amway Disclosure", "Webinar Invite", "Webinar Reminder", "Replay Follow-Up", 
  "Appointment Invite", "Referral Ask", "Not Interested Reply", "Payment Follow-Up"
];

const RISKY_TERMS_GUIDANCE: Record<string, string> = {
  "guaranteed income": "Instead use: 'opportunity to earn based on sales commission and personal effort.'",
  "easy money": "Instead use: 'flexible side project requiring consistent professional work.'",
  "cure": "Instead use: 'helps support general health, nutrition, or skin hydration.' (Amway rules strictly prohibit medical cure statements).",
  "treat disease": "Instead use: 'supports daily vitality or wellness routines.'",
  "no effort": "Instead use: 'requires retail customer building and consistency.'",
  "secret opportunity": "Instead use: 'an established digital social commerce model.'",
  "get rich quick": "Instead use: 'long-term sustainable business asset.'",
  "guaranteed results": "Instead use: 'outcomes depend on commitment and active retail customer building.'",
  "limited territory": "Instead use: 'global and country-wide distribution options.'",
  "no selling required": "Instead use: 'product recommendation and retail customer relationship building is key.'"
};

export default function ScriptsLibrary({ settings }: ScriptsLibraryProps) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit fields
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = () => {
    setScripts(localDb.getScripts());
  };

  const handleStartEdit = (s: Script) => {
    setEditingScript(s);
    setEditTitle(s.title);
    setEditCategory(s.category);
    setEditContent(s.content);
  };

  const handleStartAdd = () => {
    const newScript: Script = {
      id: "",
      title: "New Follow-Up Script",
      category: "First Message",
      content: "Hi {{name}}, ...",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    handleStartEdit(newScript);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle || !editContent) {
      alert("Title and Content are required.");
      return;
    }

    const scriptToSave: Script = {
      id: editingScript?.id || `s_${Date.now()}`,
      title: editTitle,
      category: editCategory || "First Message",
      content: editContent,
      created_at: editingScript?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    localDb.saveScript(scriptToSave);
    setEditingScript(null);
    loadScripts();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this script template?")) {
      localDb.deleteScript(id);
      loadScripts();
    }
  };

  const handleCopy = (s: Script) => {
    // Variable Interpolation Preview
    let text = s.content;
    text = text.replace(/\{\{name\}\}/g, "Prospect")
               .replace(/\{\{webinar_title\}\}/g, "Malaysian Side Income Accelerator Masterclass")
               .replace(/\{\{webinar_date\}\}/g, "Sunday")
               .replace(/\{\{webinar_time\}\}/g, "8:00 PM")
               .replace(/\{\{replay_link\}\}/g, `${window.location.origin}/webinar/side-income-accelerator/replay`)
               .replace(/\{\{whatsapp_link\}\}/g, `${window.location.origin}/webinar/side-income-accelerator/register`)
               .replace(/\{\{first_name\}\}/g, settings.name);

    navigator.clipboard.writeText(text);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Compliance checker logic
  const checkCompliance = (text: string) => {
    const findings: string[] = [];
    Object.keys(RISKY_TERMS_GUIDANCE).forEach(term => {
      if (text.toLowerCase().includes(term)) {
        findings.push(term);
      }
    });
    return findings;
  };

  const filteredScripts = scripts.filter(s => {
    const matchesCategory = activeCategory === "All" || s.category === activeCategory;
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4 pb-20 w-full font-sans text-gray-900">
      {/* Sub-Header block */}
      <div className="bg-white p-5 rounded-[24px] border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800">Outreach Script Library</h2>
          <p className="text-[10px] text-gray-400">Compliant outreach templates for Amway Malaysia sponsors</p>
        </div>
        <button
          id="scripts-add-btn"
          onClick={handleStartAdd}
          className="bg-blue-600 hover:bg-blue-700 font-bold text-xs py-1.5 px-3 rounded-xl text-white flex items-center space-x-1 transition-colors"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Add Script</span>
        </button>
      </div>

      {/* Editor view or Library list */}
      {editingScript ? (
        <form onSubmit={handleSave} className="bg-white p-5 rounded-[24px] border border-gray-200 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              {editingScript.id ? "Edit outreach Template" : "Create outreach Template"}
            </h3>
            <button
              id="script-edit-cancel"
              type="button"
              onClick={() => setEditingScript(null)}
              className="text-xs text-gray-400 hover:text-gray-600 font-bold"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Template Title Name</label>
              <input
                id="script-edit-title"
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Nutrilite Wellness Routine Check"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Category Class</label>
              <select
                id="script-edit-category"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full bg-slate-50 border rounded-xl text-xs p-2 focus:outline-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Variable list helpers */}
            <div className="bg-slate-50 p-3 border border-gray-200 rounded-xl space-y-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center space-x-1">
                <Code className="w-3.5 h-3.5 text-blue-600" />
                <span>Interpolation Variables Allowed:</span>
              </span>
              <div className="flex flex-wrap gap-1 text-[8px] font-mono text-slate-500">
                <span>{"{{name}}"}</span>
                <span>{"{{webinar_title}}"}</span>
                <span>{"{{webinar_date}}"}</span>
                <span>{"{{webinar_time}}"}</span>
                <span>{"{{replay_link}}"}</span>
                <span>{"{{whatsapp_link}}"}</span>
                <span>{"{{first_name}}"}</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Script Content Copy</label>
              <textarea
                id="script-edit-content"
                required
                rows={5}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20 font-sans"
              />
            </div>

            {/* LIVE COMPLIANCE CHECK REPORT */}
            {(() => {
              const matches = checkCompliance(editContent);
              if (matches.length > 0) {
                return (
                  <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl space-y-2">
                    <div className="flex items-center space-x-1.5 text-rose-800 font-bold text-[10px] uppercase">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Compliance Warning: Risky Terms Detected</span>
                    </div>
                    <div className="space-y-1.5 text-[10px] text-rose-900 leading-tight">
                      {matches.map(term => (
                        <div key={term} className="border-b border-rose-100/50 pb-1 last:border-0 last:pb-0">
                          <p className="font-bold">Term flagged: "{term}"</p>
                          <p className="text-slate-500 mt-0.5">{RISKY_TERMS_GUIDANCE[term]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl flex items-center space-x-2 text-[10px] text-blue-900">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>No risky terms found by this scanner. Review the message before sending.</span>
                </div>
              );
            })()}

            <button
              id="script-edit-submit"
              type="submit"
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md hover:bg-slate-800 active:scale-95 transition-all"
            >
              Save Script Template
            </button>
          </div>
        </form>
      ) : (
        /* Standard Script Library view list */
        <div className="space-y-3">
          {/* Categories slider */}
          <div className="overflow-x-auto pb-1 flex space-x-1.5 -mx-4 px-4 scrollbar-none">
            {["All", ...CATEGORIES].map(cat => (
              <button
                id={`script-cat-tab-${cat}`}
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`py-1.5 px-3 rounded-lg text-[10px] font-bold shrink-0 transition-colors ${
                  activeCategory === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white hover:bg-gray-50 text-slate-500 border border-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search scripts */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="scripts-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scripts by keywords..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
            />
          </div>

          {/* Scripts list stack */}
          {filteredScripts.length === 0 ? (
            <div className="p-8 bg-white border border-gray-100 rounded-[24px] text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-gray-800">No script templates found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredScripts.map(script => (
                <div key={script.id} className="bg-white p-5 rounded-[24px] border border-gray-200 shadow-xs space-y-3 relative group hover:border-blue-300 transition-all">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div>
                      <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                        {script.category}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 mt-1">{script.title}</h4>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        id={`copy-script-${script.id}`}
                        onClick={() => handleCopy(script)}
                        className="text-[10px] font-bold py-1 px-2.5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center space-x-1 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>{copiedId === script.id ? "Copied!" : "Copy"}</span>
                      </button>
                      <button
                        id={`edit-script-trigger-${script.id}`}
                        onClick={() => handleStartEdit(script)}
                        className="p-1.5 border border-gray-200 rounded-xl hover:bg-gray-100 text-slate-500 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {script.id !== "s1" && (
                        <button
                          id={`delete-script-trigger-${script.id}`}
                          onClick={() => handleDelete(script.id)}
                          className="p-1.5 border border-rose-200 rounded-xl hover:bg-rose-50 text-rose-500 transition-colors"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 italic leading-relaxed whitespace-pre-wrap">
                    “{script.content}”
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
