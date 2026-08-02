import Papa from "papaparse";
import z from "zod";

export interface ProspectCsvRow {
  businessName?: string;
  companyName?: string;
  name?: string;
  businessCategory?: string;
  email?: string;
  publicEmail?: string;
  phone?: string;
  publicPhone?: string;
  websiteUrl?: string;
  website?: string;
  country?: string;
  city?: string;
  notes?: string;
  [key: string]: any;
}

export interface NormalizedProspectRow {
  businessName: string;
  businessCategory: string;
  publicEmail: string;
  publicPhone: string;
  websiteUrl: string;
  normalizedDomain: string;
  country: string;
  city: string;
  notes?: string;
  rawRow: Record<string, any>;
  validationErrors: string[];
  isDuplicate: boolean;
  duplicateMatchReason?: string;
}

export interface ImportBatchResult {
  importBatchId: string;
  importSource: string;
  totalRowsProcessed: number;
  validRows: NormalizedProspectRow[];
  invalidRows: NormalizedProspectRow[];
  duplicateCount: number;
  importedCount: number;
  rejectedCount: number;
  timestamp: string;
}

// Normalizes domains: https://WWW.Example.com/path/ -> example.com
export function normalizeDomain(url?: string): string {
  if (!url || typeof url !== "string") return "";
  let cleaned = url.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//i, "");
  cleaned = cleaned.replace(/^www\./i, "");
  const slashIndex = cleaned.indexOf("/");
  if (slashIndex !== -1) {
    cleaned = cleaned.substring(0, slashIndex);
  }
  const queryIndex = cleaned.indexOf("?");
  if (queryIndex !== -1) {
    cleaned = cleaned.substring(0, queryIndex);
  }
  return cleaned.trim();
}

// Email normalizer and validator
export function normalizeEmail(email?: string): { email: string; valid: boolean } {
  if (!email || typeof email !== "string") return { email: "", valid: false };
  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    email: cleaned,
    valid: emailRegex.test(cleaned)
  };
}

// Phone normalizer
export function normalizePhone(phone?: string): string {
  if (!phone || typeof phone !== "string") return "";
  // Strip non-digit and non-plus characters
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned;
}

export function parseProspectCsv(
  csvContent: string,
  importSource: string = "CSV Upload",
  columnMapping?: Record<string, string>,
  existingRecords?: {
    emails?: Set<string>;
    domains?: Set<string>;
    phones?: Set<string>;
  }
): ImportBatchResult {
  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  });

  const importBatchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const validRows: NormalizedProspectRow[] = [];
  const invalidRows: NormalizedProspectRow[] = [];
  let duplicateCount = 0;

  const emailSet = existingRecords?.emails || new Set<string>();
  const domainSet = existingRecords?.domains || new Set<string>();
  const phoneSet = existingRecords?.phones || new Set<string>();

  parsed.data.forEach((row) => {
    // Apply column mapping if supplied
    const getValue = (targetField: string, fallbacks: string[]) => {
      if (columnMapping && columnMapping[targetField] && row[columnMapping[targetField]]) {
        return row[columnMapping[targetField]];
      }
      for (const f of fallbacks) {
        if (row[f]) return row[f];
      }
      return "";
    };

    const rawBusinessName = getValue("businessName", ["businessName", "Company", "company", "Company Name", "Business Name", "Name", "business_name"]);
    const rawCategory = getValue("businessCategory", ["businessCategory", "Category", "category", "Industry", "Niche", "business_category"]);
    const rawEmail = getValue("publicEmail", ["publicEmail", "Email", "email", "Public Email", "Contact Email", "email_address"]);
    const rawPhone = getValue("publicPhone", ["publicPhone", "Phone", "phone", "Public Phone", "Phone Number", "mobile"]);
    const rawWebsite = getValue("websiteUrl", ["websiteUrl", "Website", "website", "Website URL", "Url", "URL"]);
    const rawCountry = getValue("country", ["country", "Country", "Country Code"]);
    const rawCity = getValue("city", ["city", "City", "Location"]);
    const rawNotes = getValue("notes", ["notes", "Notes", "Description", "Remarks"]);

    const errors: string[] = [];

    const { email: cleanEmail, valid: emailValid } = normalizeEmail(rawEmail);
    const cleanPhone = normalizePhone(rawPhone);
    const cleanWebsite = rawWebsite.trim();
    const cleanDomain = normalizeDomain(cleanWebsite);
    const cleanBusinessName = rawBusinessName.trim() || cleanDomain || (cleanEmail ? cleanEmail.split("@")[0] : "Unnamed Prospect");

    if (rawEmail && !emailValid) {
      errors.push("Invalid email format");
    }

    let isDuplicate = false;
    let duplicateReason = "";

    if (cleanEmail && emailSet.has(cleanEmail)) {
      isDuplicate = true;
      duplicateReason = `Duplicate email (${cleanEmail})`;
    } else if (cleanDomain && domainSet.has(cleanDomain)) {
      isDuplicate = true;
      duplicateReason = `Duplicate domain (${cleanDomain})`;
    } else if (cleanPhone && cleanPhone.length >= 7 && phoneSet.has(cleanPhone)) {
      isDuplicate = true;
      duplicateReason = `Duplicate phone number (${cleanPhone})`;
    }

    if (isDuplicate) {
      duplicateCount++;
    }

    const normalizedRow: NormalizedProspectRow = {
      businessName: cleanBusinessName,
      businessCategory: rawCategory.trim() || "General",
      publicEmail: cleanEmail,
      publicPhone: cleanPhone,
      websiteUrl: cleanWebsite,
      normalizedDomain: cleanDomain,
      country: rawCountry.trim() || "US",
      city: rawCity.trim(),
      notes: rawNotes.trim(),
      rawRow: row,
      validationErrors: errors,
      isDuplicate,
      duplicateMatchReason: duplicateReason
    };

    if (errors.length > 0) {
      invalidRows.push(normalizedRow);
    } else {
      validRows.push(normalizedRow);
      if (cleanEmail) emailSet.add(cleanEmail);
      if (cleanDomain) domainSet.add(cleanDomain);
      if (cleanPhone && cleanPhone.length >= 7) phoneSet.add(cleanPhone);
    }
  });

  return {
    importBatchId,
    importSource,
    totalRowsProcessed: parsed.data.length,
    validRows,
    invalidRows,
    duplicateCount,
    importedCount: validRows.length,
    rejectedCount: invalidRows.length,
    timestamp: new Date().toISOString()
  };
}
