import * as XLSX from 'xlsx';

export interface ParsedExcelData {
  columns: string[];
  rows: Record<string, string | number | null>[];
  totalRows: number;
}

export interface ExcelParseError {
  message: string;
  details?: string;
}

/**
 * Parse an Excel file and extract columns and data
 */
export async function parseExcelFile(file: File): Promise<ParsedExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject({ message: 'No se pudo leer el archivo' });
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          reject({ message: 'El archivo Excel está vacío' });
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number | null>>(worksheet, {
          header: undefined, // Use first row as headers
          defval: null,
          raw: false, // Convert everything to strings for consistent handling
        });

        if (jsonData.length === 0) {
          reject({ message: 'El archivo Excel no contiene datos' });
          return;
        }

        // Extract column names from first row keys
        const columns = Object.keys(jsonData[0] || {});
        
        resolve({
          columns,
          rows: jsonData,
          totalRows: jsonData.length,
        });
      } catch (error) {
        console.error('Error parsing Excel:', error);
        reject({ 
          message: 'Error al procesar el archivo Excel',
          details: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    };

    reader.onerror = () => {
      reject({ message: 'Error al leer el archivo' });
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Get a sample of rows for preview
 */
export function getPreviewRows(
  rows: Record<string, string | number | null>[], 
  count: number = 5
): Record<string, string>[] {
  return rows.slice(0, count).map(row => {
    const stringRow: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      stringRow[key] = value !== null ? String(value) : '';
    }
    return stringRow;
  });
}
