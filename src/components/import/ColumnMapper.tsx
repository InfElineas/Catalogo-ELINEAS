import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, ArrowRight, RefreshCw, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SystemField {
  key: string;
  label: string;
  required: boolean;
  description?: string;
}

export interface ColumnMapping {
  systemField: string;
  excelColumn: string | null;
}

interface ColumnMapperProps {
  excelColumns: string[];
  systemFields: SystemField[];
  initialMappings?: ColumnMapping[];
  previewData?: Record<string, string>[];
  onMappingsChange?: (mappings: ColumnMapping[]) => void;
  onValidate: (mappings: ColumnMapping[]) => void;
  onBack: () => void;
}

// Función para normalizar strings para comparación
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .replace(/[^a-z0-9]/g, ""); // Solo letras y números
};

// Auto-mapeo basado en similitud de nombres
const autoMapColumns = (
  systemFields: SystemField[],
  excelColumns: string[]
): ColumnMapping[] => {
  const mappings: ColumnMapping[] = [];
  const usedExcelColumns = new Set<string>();

  for (const field of systemFields) {
    const normalizedFieldLabel = normalizeString(field.label);
    const normalizedFieldKey = normalizeString(field.key);

    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const excelCol of excelColumns) {
      if (usedExcelColumns.has(excelCol)) continue;

      const normalizedExcelCol = normalizeString(excelCol);

      // Coincidencia exacta
      if (normalizedExcelCol === normalizedFieldLabel || normalizedExcelCol === normalizedFieldKey) {
        bestMatch = excelCol;
        bestScore = 100;
        break;
      }

      // Coincidencia parcial
      if (normalizedExcelCol.includes(normalizedFieldLabel) || normalizedFieldLabel.includes(normalizedExcelCol)) {
        const score = Math.min(normalizedExcelCol.length, normalizedFieldLabel.length) / 
                     Math.max(normalizedExcelCol.length, normalizedFieldLabel.length) * 80;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = excelCol;
        }
      }
    }

    if (bestMatch && bestScore >= 50) {
      usedExcelColumns.add(bestMatch);
      mappings.push({ systemField: field.key, excelColumn: bestMatch });
    } else {
      mappings.push({ systemField: field.key, excelColumn: null });
    }
  }

  return mappings;
};

export function ColumnMapper({
  excelColumns,
  systemFields,
  initialMappings,
  previewData = [],
  onMappingsChange,
  onValidate,
  onBack,
}: ColumnMapperProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>(() => {
    if (initialMappings && initialMappings.length > 0) {
      return initialMappings;
    }
    return autoMapColumns(systemFields, excelColumns);
  });

  const handleMappingChange = (systemFieldKey: string, excelColumn: string | null) => {
    const newMappings = mappings.map((m) =>
      m.systemField === systemFieldKey
        ? { ...m, excelColumn: excelColumn === "none" ? null : excelColumn }
        : m
    );
    setMappings(newMappings);
    onMappingsChange?.(newMappings);
  };

  const handleAutoMap = () => {
    const newMappings = autoMapColumns(systemFields, excelColumns);
    setMappings(newMappings);
    onMappingsChange?.(newMappings);
  };

  const handleClearMappings = () => {
    const clearedMappings = systemFields.map((f) => ({
      systemField: f.key,
      excelColumn: null,
    }));
    setMappings(clearedMappings);
    onMappingsChange?.(clearedMappings);
  };

  // Estadísticas de mapeo
  const stats = useMemo(() => {
    const requiredFields = systemFields.filter((f) => f.required);
    const mappedRequired = requiredFields.filter((f) =>
      mappings.find((m) => m.systemField === f.key && m.excelColumn !== null)
    );
    const totalMapped = mappings.filter((m) => m.excelColumn !== null).length;
    const unmappedExcel = excelColumns.filter(
      (col) => !mappings.some((m) => m.excelColumn === col)
    );

    return {
      requiredTotal: requiredFields.length,
      requiredMapped: mappedRequired.length,
      allRequiredMapped: mappedRequired.length === requiredFields.length,
      totalMapped,
      unmappedExcelColumns: unmappedExcel,
    };
  }, [mappings, systemFields, excelColumns]);

  // Obtener el mapeo actual para una columna del sistema
  const getMapping = (systemFieldKey: string): string | null => {
    return mappings.find((m) => m.systemField === systemFieldKey)?.excelColumn || null;
  };

  // Obtener columnas ya usadas (para evitar duplicados)
  const usedColumns = useMemo(() => {
    return new Set(mappings.filter((m) => m.excelColumn).map((m) => m.excelColumn));
  }, [mappings]);

  // Generar preview basado en mappings actuales
  const mappedPreviewData = useMemo(() => {
    if (!previewData.length) return [];
    
    return previewData.slice(0, 5).map((row) => {
      const mappedRow: Record<string, string> = {};
      for (const mapping of mappings) {
        if (mapping.excelColumn && row[mapping.excelColumn] !== undefined) {
          mappedRow[mapping.systemField] = row[mapping.excelColumn];
        } else {
          mappedRow[mapping.systemField] = "";
        }
      }
      return mappedRow;
    });
  }, [mappings, previewData]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Mapeo de columnas</CardTitle>
            <CardDescription>
              Asigna cada columna del Excel a su campo correspondiente en el sistema
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClearMappings}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
            <Button variant="outline" size="sm" onClick={handleAutoMap}>
              <Wand2 className="h-4 w-4 mr-2" />
              Auto-mapear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Summary */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div
            className={cn(
              "p-4 rounded-lg border",
              stats.allRequiredMapped
                ? "bg-success/10 border-success/20"
                : "bg-warning/10 border-warning/20"
            )}
          >
            <div className="flex items-center gap-2">
              {stats.allRequiredMapped ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-warning" />
              )}
              <span className="font-medium">
                {stats.requiredMapped} de {stats.requiredTotal} campos requeridos mapeados
              </span>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted border">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {stats.totalMapped} de {systemFields.length} campos totales mapeados
              </span>
            </div>
            {stats.unmappedExcelColumns.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {stats.unmappedExcelColumns.length} columnas del Excel sin asignar
              </p>
            )}
          </div>
        </div>

        {/* Columnas del Excel detectadas */}
        <div className="p-4 rounded-lg bg-accent/50 border">
          <p className="text-sm font-medium mb-2">
            Columnas detectadas en el Excel ({excelColumns.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {excelColumns.map((col) => {
              const isUsed = usedColumns.has(col);
              return (
                <Badge
                  key={col}
                  variant={isUsed ? "default" : "outline"}
                  className={cn(!isUsed && "opacity-60")}
                >
                  {col}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Mapping Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-1/3">Campo del sistema</TableHead>
                <TableHead className="w-1/3">Columna del Excel</TableHead>
                <TableHead className="w-24 text-center">Requerido</TableHead>
                <TableHead className="w-1/4">Vista previa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {systemFields.map((field) => {
                const currentMapping = getMapping(field.key);
                const isMapped = currentMapping !== null;
                const previewValue = mappedPreviewData[0]?.[field.key] || "";

                return (
                  <TableRow
                    key={field.key}
                    className={cn(
                      field.required && !isMapped && "bg-destructive/5"
                    )}
                  >
                    <TableCell>
                      <div>
                        <span className="font-medium">{field.label}</span>
                        {field.description && (
                          <p className="text-xs text-muted-foreground">
                            {field.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentMapping || "none"}
                        onValueChange={(value) =>
                          handleMappingChange(field.key, value)
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "w-full",
                            !isMapped && field.required && "border-destructive"
                          )}
                        >
                          <SelectValue placeholder="Seleccionar columna..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">
                              -- No mapear --
                            </span>
                          </SelectItem>
                          {excelColumns.map((excelCol) => {
                            const isUsedByOther =
                              usedColumns.has(excelCol) &&
                              currentMapping !== excelCol;
                            return (
                              <SelectItem
                                key={excelCol}
                                value={excelCol}
                                disabled={isUsedByOther}
                              >
                                {excelCol}
                                {isUsedByOther && " (ya asignada)"}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      {field.required ? (
                        <Badge variant="destructive" className="text-xs">
                          Sí
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isMapped && previewValue ? (
                        <span className="text-sm font-mono truncate block max-w-32">
                          {previewValue}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Preview completo si hay datos */}
        {mappedPreviewData.length > 0 && (
          <div>
            <h3 className="font-medium mb-3">Vista previa de datos mapeados</h3>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {systemFields
                      .filter((f) => getMapping(f.key) !== null)
                      .slice(0, 6)
                      .map((field) => (
                        <TableHead key={field.key}>{field.label}</TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedPreviewData.map((row, i) => (
                    <TableRow key={i}>
                      {systemFields
                        .filter((f) => getMapping(f.key) !== null)
                        .slice(0, 6)
                        .map((field) => (
                          <TableCell key={field.key} className="text-sm">
                            {row[field.key] || "—"}
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Mostrando primeras 5 filas con las primeras 6 columnas mapeadas
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Atrás
          </Button>
          <Button
            onClick={() => onValidate(mappings)}
            disabled={!stats.allRequiredMapped}
          >
            {!stats.allRequiredMapped
              ? "Mapea todos los campos requeridos"
              : "Validar datos"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
