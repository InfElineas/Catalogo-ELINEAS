import type { ColumnMapping } from '@/components/import/ColumnMapper';
import { normalizeImageUrl } from '@/lib/imageUrl';

export interface ValidationError {
  row: number;
  column: string;
  field: string;
  error: string;
  value: string | null;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  errorCount: number;
  warningCount: number;
  errors: ValidationError[];
  duplicates: Map<string, number[]>;
}

interface FieldValidator {
  field: string;
  required: boolean;
  type?: 'text' | 'number' | 'url' | 'boolean';
  maxLength?: number;
}

// Default validators for system fields
const fieldValidators: Record<string, FieldValidator> = {
  codigo: { field: 'codigo', required: true, type: 'text', maxLength: 100 },
  producto: { field: 'producto', required: true, type: 'text', maxLength: 500 },
  precio: { field: 'precio', required: true, type: 'number' },
  imagen: { field: 'imagen', required: false, type: 'url' },
  suministrador: { field: 'suministrador', required: false, type: 'text', maxLength: 200 },
  almacen: { field: 'almacen', required: false, type: 'text', maxLength: 200 },
  categoria: { field: 'categoria', required: false, type: 'text', maxLength: 200 },
  precio_p: { field: 'precio_p', required: false, type: 'number' },
  precio_m: { field: 'precio_m', required: false, type: 'number' },
  filtro_imagenes: { field: 'filtro_imagenes', required: false, type: 'text' },
  ef_tkc: { field: 'ef_tkc', required: false, type: 'text' },
  id_tienda: { field: 'id_tienda', required: false, type: 'text', maxLength: 100 },
  estado_anuncio: { field: 'estado_anuncio', required: false, type: 'text' },
  estado_tienda: { field: 'estado_tienda', required: false, type: 'text' },
  tienda: { field: 'tienda', required: false, type: 'text', maxLength: 200 },
  selecto: { field: 'selecto', required: false, type: 'boolean' },
  cat_f1: { field: 'cat_f1', required: false, type: 'text', maxLength: 200 },
  cat_f2: { field: 'cat_f2', required: false, type: 'text', maxLength: 200 },
  cat_f3: { field: 'cat_f3', required: false, type: 'text', maxLength: 200 },
};

/**
 * Parse a price string to a number, handling various formats
 */
export function parsePrice(value: string | number | null): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  if (typeof value === 'number') return value;
  
  // Remove currency symbols and whitespace
  let cleaned = value
    .replace(/[$€£¥]/g, '')
    .replace(/\s/g, '')
    .trim();
  
  // Handle comma as decimal separator (European format)
  // If there's a comma and no period, or comma comes after period, use comma as decimal
  const hasComma = cleaned.includes(',');
  const hasPeriod = cleaned.includes('.');
  
  if (hasComma && !hasPeriod) {
    // 1234,56 -> 1234.56
    cleaned = cleaned.replace(',', '.');
  } else if (hasComma && hasPeriod) {
    const commaIndex = cleaned.lastIndexOf(',');
    const periodIndex = cleaned.lastIndexOf('.');
    
    if (commaIndex > periodIndex) {
      // 1.234,56 -> 1234.56 (European)
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 -> 1234.56 (US)
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse a boolean value from various string representations
 */
function parseBoolean(value: string | number | null): boolean | null {
  if (value === null || value === undefined || value === '') return null;
  
  const strValue = String(value).toLowerCase().trim();
  
  if (['true', '1', 'yes', 'sí', 'si', 'verdadero', 'activo', 'x'].includes(strValue)) {
    return true;
  }
  if (['false', '0', 'no', 'falso', 'inactivo', ''].includes(strValue)) {
    return false;
  }
  
  return null;
}

/**
 * Validate a URL string
 */
function isValidUrl(value: string): boolean {
  if (!value || value.trim() === '') return true; // Empty is valid for non-required
  
  // Accept relative URLs or full URLs
  if (value.startsWith('/') || value.startsWith('./')) return true;
  
  try {
    new URL(value);
    return true;
  } catch {
    // Check if it looks like a URL without protocol
    return /^[\w-]+(\.[\w-]+)+/.test(value);
  }
}

/**
 * Validate data based on column mappings
 */
export function validateData(
  rows: Record<string, string | number | null>[],
  mappings: ColumnMapping[],
  systemFields: { key: string; label: string; required: boolean }[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const codeValues = new Map<string, number[]>(); // Track duplicate codes
  let validRowCount = 0;

  // Create a mapping from system field to excel column
  const fieldToColumn = new Map<string, string>();
  for (const mapping of mappings) {
    if (mapping.excelColumn) {
      fieldToColumn.set(mapping.systemField, mapping.excelColumn);
    }
  }

  // Get the code column for duplicate checking
  const codeColumn = fieldToColumn.get('codigo');

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // Account for header row (1-indexed)
    let rowHasError = false;

    // Check required fields and validate types
    for (const field of systemFields) {
      const excelColumn = fieldToColumn.get(field.key);
      const validator = fieldValidators[field.key];
      
      if (!excelColumn) {
        // Field not mapped - only error if required
        if (field.required) {
          errors.push({
            row: rowNumber,
            column: field.label,
            field: field.key,
            error: `Campo requerido no mapeado`,
            value: null,
            severity: 'error',
          });
          rowHasError = true;
        }
        continue;
      }

      const rawValue = row[excelColumn];
      const value = rawValue !== null ? String(rawValue).trim() : null;

      // Check required fields
      if (field.required && (!value || value === '')) {
        errors.push({
          row: rowNumber,
          column: excelColumn,
          field: field.key,
          error: `Valor vacío en campo requerido`,
          value: value,
          severity: 'error',
        });
        rowHasError = true;
        continue;
      }

      // Skip further validation if empty and not required
      if (!value || value === '') continue;

      // Type validation
      if (validator?.type === 'number') {
        const parsed = parsePrice(value);
        if (parsed === null) {
          errors.push({
            row: rowNumber,
            column: excelColumn,
            field: field.key,
            error: `Valor no numérico: '${value}'`,
            value: value,
            severity: 'error',
          });
          rowHasError = true;
        } else if (parsed < 0 && field.key.includes('precio')) {
          errors.push({
            row: rowNumber,
            column: excelColumn,
            field: field.key,
            error: `Precio negativo: ${parsed}`,
            value: value,
            severity: 'warning',
          });
        }
      }

      if (validator?.type === 'url' && value) {
        if (!isValidUrl(value)) {
          errors.push({
            row: rowNumber,
            column: excelColumn,
            field: field.key,
            error: `URL inválida: '${value}'`,
            value: value,
            severity: 'warning',
          });
        }
      }

      if (validator?.type === 'boolean' && value) {
        if (parseBoolean(value) === null) {
          errors.push({
            row: rowNumber,
            column: excelColumn,
            field: field.key,
            error: `Valor booleano no reconocido: '${value}'`,
            value: value,
            severity: 'warning',
          });
        }
      }

      // Max length validation
      if (validator?.maxLength && value.length > validator.maxLength) {
        errors.push({
          row: rowNumber,
          column: excelColumn,
          field: field.key,
          error: `Texto demasiado largo (${value.length}/${validator.maxLength})`,
          value: value.substring(0, 50) + '...',
          severity: 'warning',
        });
      }
    }

    // Track code for duplicate detection
    if (codeColumn) {
      const code = row[codeColumn];
      if (code !== null && code !== '') {
        const codeStr = String(code).trim();
        if (!codeValues.has(codeStr)) {
          codeValues.set(codeStr, []);
        }
        codeValues.get(codeStr)!.push(rowNumber);
      }
    }

    if (!rowHasError) {
      validRowCount++;
    }
  });

  // Find duplicates
  const duplicates = new Map<string, number[]>();
  for (const [code, rowNumbers] of codeValues) {
    if (rowNumbers.length > 1) {
      duplicates.set(code, rowNumbers);
      // Add error for each duplicate
      for (const rowNum of rowNumbers.slice(1)) {
        errors.push({
          row: rowNum,
          column: codeColumn || 'Codigo',
          field: 'codigo',
          error: `Código duplicado: '${code}' (también en filas: ${rowNumbers.filter(r => r !== rowNum).join(', ')})`,
          value: code,
          severity: 'error',
        });
        validRowCount = Math.max(0, validRowCount - 1);
      }
    }
  }

  // Sort errors by row number
  errors.sort((a, b) => a.row - b.row);

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  return {
    isValid: errorCount === 0,
    totalRows: rows.length,
    validRows: validRowCount,
    errorCount,
    warningCount,
    errors,
    duplicates,
  };
}

/**
 * Transform raw row data to catalog item format based on mappings
 */
export function transformRowToCatalogItem(
  row: Record<string, string | number | null>,
  mappings: ColumnMapping[]
): Record<string, unknown> {
  const fieldToColumn = new Map<string, string>();
  for (const mapping of mappings) {
    if (mapping.excelColumn) {
      fieldToColumn.set(mapping.systemField, mapping.excelColumn);
    }
  }

  const getValue = (field: string): string | null => {
    const column = fieldToColumn.get(field);
    if (!column) return null;
    const value = row[column];
    return value !== null ? String(value).trim() : null;
  };

  const getNumericValue = (field: string): number | null => {
    const value = getValue(field);
    return value ? parsePrice(value) : null;
  };

  const getBooleanValue = (field: string): boolean => {
    const value = getValue(field);
    return parseBoolean(value) ?? false;
  };

  // Build states object
  const states: Record<string, string> = {};
  const estadoAnuncio = getValue('estado_anuncio');
  const estadoTienda = getValue('estado_tienda');
  if (estadoAnuncio) states.estado_anuncio = estadoAnuncio;
  if (estadoTienda) states.estado_tienda = estadoTienda;

  // Build extra_prices object
  const extraPrices: Record<string, number> = {};
  const precioP = getNumericValue('precio_p');
  const precioM = getNumericValue('precio_m');
  if (precioP !== null) extraPrices.precio_p = precioP;
  if (precioM !== null) extraPrices.precio_m = precioM;

  // Build flags object
  const flags: Record<string, boolean> = {};
  const selecto = getBooleanValue('selecto');
  const efTkc = getValue('ef_tkc');
  flags.selecto = selecto;
  if (efTkc) flags.ef_tkc = parseBoolean(efTkc) ?? false;

  return {
    code: getValue('codigo') || '',
    name: getValue('producto') || '',
    price_usd: getNumericValue('precio') || 0,
    category: getValue('categoria'),
    category_f1: getValue('cat_f1'),
    category_f2: getValue('cat_f2'),
    category_f3: getValue('cat_f3'),
    supplier: getValue('suministrador'),
    warehouse: getValue('almacen'),
    store_id: getValue('id_tienda'),
    store_name: getValue('tienda'),
    image_url: normalizeImageUrl(getValue('imagen')),
    image_filter: getValue('filtro_imagenes'),
    states: Object.keys(states).length > 0 ? states : {},
    extra_prices: Object.keys(extraPrices).length > 0 ? extraPrices : {},
    flags: Object.keys(flags).length > 0 ? flags : {},
    is_selected: selecto,
    is_active: true,
  };
}
