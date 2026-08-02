/**
 * Utility functions for parsing and exporting CSV data.
 */

export interface ParsedCsvResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
}

/**
 * Parses a raw CSV string into headers and array of row objects.
 * Handles quoted fields, escaped quotes, and flexible delimiters (comma, semicolon, tab).
 */
export function parseCsv(text: string): ParsedCsvResult {
  const errors: string[] = [];
  if (!text || !text.trim()) {
    return { headers: [], rows: [], errors: ["File is empty."] };
  }

  // Detect delimiter (comma or semicolon or tab)
  const firstLine = text.split(/\r\n|\n/)[0] || "";
  let delimiter = ",";
  if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
    delimiter = ";";
  } else if ((firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length) {
    delimiter = "\t";
  }

  // Tokenize CSV character by character to correctly handle quotes & newlines inside fields
  const matrix: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote ("") inside quoted field
        currentField += '"';
        i++; // skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      // End of field
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      // End of row
      if (char === "\r" && nextChar === "\n") {
        i++; // handle CRLF
      }
      currentRow.push(currentField.trim());
      // Ignore completely empty lines at end or between rows
      if (currentRow.some(f => f.length > 0)) {
        matrix.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  // Handle last field if text didn't end with newline
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f.length > 0)) {
      matrix.push(currentRow);
    }
  }

  if (matrix.length === 0) {
    return { headers: [], rows: [], errors: ["No valid rows found in CSV."] };
  }

  // Header row
  const rawHeaders = matrix[0].map(h => h.replace(/^["']|["']$/g, '').trim());
  const headers = rawHeaders.map(h => h || "unnamed");

  const rows: Record<string, string>[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const rowValues = matrix[r];
    const rowObj: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      let val = rowValues[index] !== undefined ? rowValues[index] : "";
      // Strip outer quotes if still present
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1).replace(/""/g, '"');
      }
      rowObj[header] = val;
    });

    rows.push(rowObj);
  }

  return { headers, rows, errors };
}

/**
 * Downloads a sample CSV template in the browser.
 */
export function downloadCsvTemplate(filename: string, headers: string[], sampleRows: string[][]) {
  const csvContent = [
    headers.map(h => `"${h}"`).join(","),
    ...sampleRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
