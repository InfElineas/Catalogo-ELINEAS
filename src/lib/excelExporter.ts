import * as XLSX from 'xlsx';
import type { CatalogItem } from '@/hooks/useCatalogItems';

export interface ExportOptions {
  catalogName: string;
  includeInactive?: boolean;
  onlySelected?: boolean;
  category?: string;
}

/**
 * Maps catalog item fields to Excel column headers
 */
const columnMappings: { key: keyof CatalogItem | string; header: string }[] = [
  { key: 'code', header: 'Codigo' },
  { key: 'name', header: 'Producto' },
  { key: 'price_usd', header: 'Precio' },
  { key: 'image_url', header: 'Imagen' },
  { key: 'supplier', header: 'Suministrador' },
  { key: 'warehouse', header: 'Almacen' },
  { key: 'category', header: 'Categoria' },
  { key: 'extra_prices.precio_p', header: 'Precio P' },
  { key: 'extra_prices.precio_m', header: 'Precio M.' },
  { key: 'image_filter', header: 'Filtro para Imagenes' },
  { key: 'flags.ef_tkc', header: 'EF TKC' },
  { key: 'store_id', header: 'ID Tienda' },
  { key: 'states.estado_anuncio', header: 'Estado Anuncio' },
  { key: 'states.estado_tienda', header: 'Estado en Tienda' },
  { key: 'store_name', header: 'Tienda' },
  { key: 'is_selected', header: 'Selecto' },
  { key: 'category_f1', header: 'Cat.F1' },
  { key: 'category_f2', header: 'Cat.F2' },
  { key: 'category_f3', header: 'Cat.F3' },
  { key: 'is_active', header: 'Activo' },
];

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj as unknown);
}

/**
 * Format a value for Excel export
 */
function formatValue(value: unknown, key: string): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  
  // Booleans
  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }
  
  // Numbers
  if (typeof value === 'number') {
    return value;
  }
  
  // Dates
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  
  // JSON objects
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}

/**
 * Transform catalog items to Excel rows
 */
export function itemsToExcelRows(
  items: CatalogItem[],
  options: ExportOptions
): Record<string, string | number | boolean | null>[] {
  let filteredItems = items;

  // Apply filters
  if (!options.includeInactive) {
    filteredItems = filteredItems.filter(item => item.is_active);
  }
  if (options.onlySelected) {
    filteredItems = filteredItems.filter(item => item.is_selected);
  }
  if (options.category) {
    filteredItems = filteredItems.filter(item => item.category === options.category);
  }

  return filteredItems.map(item => {
    const row: Record<string, string | number | boolean | null> = {};
    
    for (const mapping of columnMappings) {
      const value = getNestedValue(item as unknown as Record<string, unknown>, mapping.key);
      row[mapping.header] = formatValue(value, mapping.key);
    }
    
    return row;
  });
}

/**
 * Export catalog items to an Excel file and trigger download
 */
export function exportCatalogToExcel(
  items: CatalogItem[],
  options: ExportOptions
): void {
  const rows = itemsToExcelRows(items, options);
  
  if (rows.length === 0) {
    throw new Error('No hay items para exportar');
  }

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  const colWidths = columnMappings.map(m => ({ wch: Math.max(m.header.length, 15) }));
  worksheet['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Catalogo');

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  let filename = `${options.catalogName}_${date}`;
  if (options.onlySelected) filename += '_selectos';
  if (options.category) filename += `_${options.category}`;
  filename += '.xlsx';

  // Sanitize filename
  filename = filename.replace(/[^a-zA-Z0-9_\-\.áéíóúñÁÉÍÓÚÑ]/g, '_');

  // Trigger download
  XLSX.writeFile(workbook, filename);
}

/**
 * Export catalog items to CSV format
 */
export function exportCatalogToCSV(
  items: CatalogItem[],
  options: ExportOptions
): void {
  const rows = itemsToExcelRows(items, options);
  
  if (rows.length === 0) {
    throw new Error('No hay items para exportar');
  }

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Catalogo');

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  let filename = `${options.catalogName}_${date}`;
  if (options.onlySelected) filename += '_selectos';
  if (options.category) filename += `_${options.category}`;
  filename += '.csv';

  // Sanitize filename
  filename = filename.replace(/[^a-zA-Z0-9_\-\.áéíóúñÁÉÍÓÚÑ]/g, '_');

  // Trigger download
  XLSX.writeFile(workbook, filename, { bookType: 'csv' });
}
