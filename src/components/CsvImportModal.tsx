import React, { useState, useRef } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Table, 
  Sparkles, 
  FileText,
  ArrowRight,
  RefreshCw,
  FileCheck
} from "lucide-react";
import { parseCsv, downloadCsvTemplate, ParsedCsvResult } from "@/src/lib/csvUtils";

export interface TemplateField {
  key: string;
  label: string;
  required?: boolean;
  example: string;
  aliases?: string[]; // headers that might auto-match this key
}

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entityName: string;
  templateFields: TemplateField[];
  sampleCsvFilename: string;
  sampleData: string[][];
  onImport: (mappedRows: Record<string, any>[]) => void;
}

export function CsvImportModal({
  isOpen,
  onClose,
  title,
  entityName,
  templateFields,
  sampleCsvFilename,
  sampleData,
  onImport
}: CsvImportModalProps) {
  if (!isOpen) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeInputMethod, setActiveInputMethod] = useState<"file" | "paste">("file");
  const [pasteText, setPasteText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedCsvResult | null>(null);
  
  // Header mapping: fieldKey -> selectedCsvHeader
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [importing, setImporting] = useState(false);

  // Download Sample CSV template
  const handleDownloadTemplate = () => {
    const headers = templateFields.map(f => f.label);
    downloadCsvTemplate(sampleCsvFilename, headers, sampleData);
  };

  // Process raw text content from file or paste input
  const processRawContent = (content: string, name?: string) => {
    const res = parseCsv(content);
    setParsedResult(res);
    if (name) setFileName(name);

    // Auto-map headers
    const autoMap: Record<string, string> = {};
    templateFields.forEach(field => {
      const lowerKey = field.key.toLowerCase();
      const lowerLabel = field.label.toLowerCase();
      const aliases = (field.aliases || []).map(a => a.toLowerCase());

      // Find matching CSV header
      const match = res.headers.find(h => {
        const lh = h.toLowerCase().trim();
        return lh === lowerKey || lh === lowerLabel || aliases.includes(lh) || lh.includes(lowerKey);
      });

      if (match) {
        autoMap[field.key] = match;
      } else {
        autoMap[field.key] = ""; // unmapped
      }
    });

    setFieldMappings(autoMap);
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      processRawContent(content, file.name);
    };
    reader.readAsText(file);
  };

  // Drag & drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      processRawContent(content, file.name);
    };
    reader.readAsText(file);
  };

  // Handle paste input processing
  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    processRawContent(pasteText, "Pasted_Data.csv");
  };

  // Reset file/paste state
  const handleReset = () => {
    setParsedResult(null);
    setFileName(null);
    setPasteText("");
    setFieldMappings({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Execute import mapping
  const handleConfirmImport = () => {
    if (!parsedResult || parsedResult.rows.length === 0) return;

    setImporting(true);

    // Map rows according to fieldMappings
    const mappedRows: Record<string, any>[] = parsedResult.rows.map(row => {
      const item: Record<string, any> = {};
      templateFields.forEach(field => {
        const mappedHeader = fieldMappings[field.key];
        item[field.key] = mappedHeader ? (row[mappedHeader] || "") : "";
      });
      return item;
    });

    setTimeout(() => {
      onImport(mappedRows);
      setImporting(false);
      onClose();
    }, 400);
  };

  // Validate required fields mapping
  const missingRequiredMappings = templateFields.filter(
    f => f.required && (!fieldMappings[f.key] || fieldMappings[f.key] === "")
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in-50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden my-auto">
        
        {/* HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {title}
              </h3>
              <p className="text-xs text-slate-500">
                Bulk import {entityName.toLowerCase()} records from Excel or CSV spreadsheet files.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* TOP ACTIONS: DOWNLOAD SAMPLE TEMPLATE */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-indigo-950">First time importing?</span>
                <p className="text-indigo-800/80 mt-0.5">
                  Download our ready-to-use CSV template pre-formatted with the right column headers.
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadTemplate}
              className="bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-700 text-xs font-semibold shrink-0 gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" /> Download CSV Template
            </Button>
          </div>

          {!parsedResult ? (
            /* STEP 1: UPLOAD / PASTE CSV SOURCE */
            <div className="space-y-4">
              <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
                <button
                  className={`pb-2 border-b-2 flex items-center gap-1.5 transition-all ${
                    activeInputMethod === "file" 
                      ? "border-emerald-600 text-emerald-700" 
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                  onClick={() => setActiveInputMethod("file")}
                >
                  <UploadCloud className="w-4 h-4" /> Upload File (.csv)
                </button>
                <button
                  className={`pb-2 border-b-2 flex items-center gap-1.5 transition-all ${
                    activeInputMethod === "paste" 
                      ? "border-emerald-600 text-emerald-700" 
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                  onClick={() => setActiveInputMethod("paste")}
                >
                  <FileText className="w-4 h-4" /> Copy & Paste CSV Text
                </button>
              </div>

              {activeInputMethod === "file" ? (
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    isDragOver 
                      ? "border-emerald-500 bg-emerald-50/50" 
                      : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50/60"
                  }`}
                >
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept=".csv, .txt, text/csv" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800">
                      Click to upload or drag & drop your CSV file here
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Supports .csv format up to 5,000 rows. Auto-detects headers and quotes.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={6}
                    placeholder={`Name, Email, Phone, Company, Notes\nJohn Doe, john@example.com, +1 555-0192, Acme Corp, Interested in web redesign\nJane Smith, jane@test.com, +1 555-0188, Apex Inc, Budget $10k`}
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    className="w-full font-mono text-xs p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={handlePasteSubmit}
                      disabled={!pasteText.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
                    >
                      Process CSV Data <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: FIELD MAPPING & DATA PREVIEW */
            <div className="space-y-6 animate-in fade-in-50">
              
              {/* FILE METRICS BAR */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800">{fileName || "CSV Source"}</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    {parsedResult.rows.length} rows detected
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-500 hover:text-slate-700 text-xs gap-1 h-7">
                  <RefreshCw className="w-3 h-3" /> Select Different File
                </Button>
              </div>

              {/* COLUMN MAPPING GRID */}
              <div className="space-y-3">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
                  <Table className="w-4 h-4 text-indigo-600" /> Match CSV Columns to {entityName} Fields
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/30">
                  {templateFields.map(field => {
                    const currentSelection = fieldMappings[field.key] || "";
                    const isMapped = !!currentSelection;

                    return (
                      <div key={field.key} className="space-y-1 bg-white p-3 rounded-lg border border-slate-200/80">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            {field.label}
                            {field.required && <span className="text-red-500 font-bold">*</span>}
                          </span>
                          {isMapped ? (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Mapped
                            </span>
                          ) : field.required ? (
                            <span className="text-[10px] text-red-500 font-semibold flex items-center gap-0.5">
                              <AlertCircle className="w-3 h-3" /> Required
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Optional</span>
                          )}
                        </div>

                        <select
                          value={currentSelection}
                          onChange={e => setFieldMappings(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="w-full text-xs h-8 rounded-md border border-slate-200 bg-white px-2 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="">-- Do not import --</option>
                          {parsedResult.headers.map((header, hIdx) => (
                            <option key={hIdx} value={header}>
                              CSV: "{header}"
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DATA PREVIEW TABLE */}
              <div className="space-y-2">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
                  <Table className="w-4 h-4 text-slate-500" /> Sample Data Preview (First 5 Rows)
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                        <th className="p-2.5 border-r border-slate-200/60 w-10 text-center">#</th>
                        {templateFields.map(f => (
                          <th key={f.key} className="p-2.5 border-r border-slate-200/60 whitespace-nowrap">
                            {f.label}
                            <span className="block font-normal text-[10px] text-slate-400">
                              {fieldMappings[f.key] ? `(${fieldMappings[f.key]})` : "(Unmapped)"}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedResult.rows.slice(0, 5).map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-2.5 border-r border-slate-200/60 text-center font-bold text-slate-400 text-[10px]">
                            {rIdx + 1}
                          </td>
                          {templateFields.map(f => {
                            const mappedHeader = fieldMappings[f.key];
                            const val = mappedHeader ? row[mappedHeader] : "";
                            return (
                              <td key={f.key} className="p-2.5 border-r border-slate-200/60 text-slate-700 whitespace-nowrap max-w-[180px] truncate">
                                {val ? val : <span className="text-slate-300 italic">-</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* WARNING FOR MISSING REQUIRED FIELD MAPPINGS */}
              {missingRequiredMappings.length > 0 && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>
                    Please map required field(s): <strong className="font-bold">{missingRequiredMappings.map(m => m.label).join(", ")}</strong> to proceed.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} className="text-xs font-semibold text-slate-600">
            Cancel
          </Button>

          {parsedResult && (
            <Button
              onClick={handleConfirmImport}
              disabled={importing || missingRequiredMappings.length > 0 || parsedResult.rows.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 px-5 shadow-sm"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Importing Records...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Import {parsedResult.rows.length} {entityName} Records
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
