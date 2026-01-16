export interface CatalogItemData {
  code: string;
  name: string;
  price_usd: number;
  category: string | null;
  category_f1: string | null;
  category_f2: string | null;
  category_f3: string | null;
  supplier: string | null;
  warehouse: string | null;
  store_id: string | null;
  store_name: string | null;
  image_url: string | null;
  image_filter: string | null;
  states: Record<string, string>;
  extra_prices: Record<string, number>;
  flags: Record<string, boolean>;
  is_selected: boolean;
  is_active: boolean;
}

export interface FieldChange {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface DiffItem {
  code: string;
  existingItem?: CatalogItemData;
  newItem?: CatalogItemData;
  changes?: FieldChange[];
}

export interface DiffResult {
  summary: {
    new: number;
    modified: number;
    deleted: number;
    unchanged: number;
  };
  newItems: DiffItem[];
  modifiedItems: DiffItem[];
  deletedItems: DiffItem[];
  unchangedItems: DiffItem[];
}

const fieldLabels: Array<{ key: keyof CatalogItemData; label: string }> = [
  { key: 'name', label: 'Producto' },
  { key: 'price_usd', label: 'Precio' },
  { key: 'category', label: 'Categoría' },
  { key: 'category_f1', label: 'Categoría F1' },
  { key: 'category_f2', label: 'Categoría F2' },
  { key: 'category_f3', label: 'Categoría F3' },
  { key: 'supplier', label: 'Suministrador' },
  { key: 'warehouse', label: 'Almacén' },
  { key: 'store_id', label: 'ID Tienda' },
  { key: 'store_name', label: 'Tienda' },
  { key: 'image_url', label: 'Imagen' },
  { key: 'image_filter', label: 'Filtro Imagen' },
  { key: 'states', label: 'Estados' },
  { key: 'extra_prices', label: 'Precios extra' },
  { key: 'flags', label: 'Flags' },
  { key: 'is_selected', label: 'Selecto' },
  { key: 'is_active', label: 'Activo' },
];

const normalizeObject = (value: Record<string, unknown>) => {
  const sortedKeys = Object.keys(value).sort();
  return sortedKeys.reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = value[key];
    return acc;
  }, {});
};

const isEqual = (left: unknown, right: unknown): boolean => {
  if (left === right) return true;
  if (typeof left !== typeof right) return false;
  if (left && right && typeof left === 'object') {
    return JSON.stringify(normalizeObject(left as Record<string, unknown>))
      === JSON.stringify(normalizeObject(right as Record<string, unknown>));
  }
  return false;
};

export const createCatalogDiff = (
  existingItems: CatalogItemData[],
  newItems: CatalogItemData[]
): DiffResult => {
  const existingMap = new Map(existingItems.map((item) => [item.code, item]));
  const newMap = new Map(newItems.map((item) => [item.code, item]));

  const newList: DiffItem[] = [];
  const modifiedList: DiffItem[] = [];
  const deletedList: DiffItem[] = [];
  const unchangedList: DiffItem[] = [];

  newItems.forEach((item) => {
    const existing = existingMap.get(item.code);
    if (!existing) {
      newList.push({ code: item.code, newItem: item });
      return;
    }

    const changes: FieldChange[] = [];
    fieldLabels.forEach(({ key, label }) => {
      if (!isEqual(existing[key], item[key])) {
        changes.push({
          field: key,
          label,
          oldValue: existing[key],
          newValue: item[key],
        });
      }
    });

    if (changes.length > 0) {
      modifiedList.push({
        code: item.code,
        existingItem: existing,
        newItem: item,
        changes,
      });
    } else {
      unchangedList.push({
        code: item.code,
        existingItem: existing,
        newItem: item,
        changes: [],
      });
    }
  });

  existingItems.forEach((item) => {
    if (!newMap.has(item.code)) {
      deletedList.push({ code: item.code, existingItem: item });
    }
  });

  return {
    summary: {
      new: newList.length,
      modified: modifiedList.length,
      deleted: deletedList.length,
      unchanged: unchangedList.length,
    },
    newItems: newList,
    modifiedItems: modifiedList,
    deletedItems: deletedList,
    unchangedItems: unchangedList,
  };
};

export const formatChangeValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};
