import { useState, useCallback, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  X,
  ArrowRight,
  Download,
  RefreshCw,
  Loader2,
  Edit
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ColumnMapper, ColumnMapping, SystemField } from "@/components/import/ColumnMapper";
import { ValidationEditor } from "@/components/import/ValidationEditor";
import { parseExcelFile, getPreviewRows, type ParsedExcelData } from "@/lib/excelParser";
import { validateData, type ValidationResult, type ValidationError } from "@/lib/dataValidator";
import { useImportCatalog } from "@/hooks/useImportCatalog";
import { useUpdateCatalogImport } from "@/hooks/useUpdateCatalogImport";
import { useCatalog } from "@/hooks/useCatalogs";
import { useCatalogItems, useCatalogVersions } from "@/hooks/useCatalogItems";
import { CatalogDiffView, type ApplyOptions } from "@/components/import/CatalogDiffView";
import { createCatalogDiff, type CatalogItemData, type DiffResult } from "@/lib/catalogDiff";
import { transformRowToCatalogItem } from "@/lib/dataValidator";
import { toast } from "sonner";

type ImportStep = "upload" | "mapping" | "validation" | "diff" | "importing" | "complete";

const expectedColumns: SystemField[] = [
  { key: "codigo", label: "Codigo", required: true, description: "Código único del producto (SKU)" },
  { key: "producto", label: "Producto", required: true, description: "Nombre del producto" },
  { key: "precio", label: "Precio", required: true, description: "Precio en USD" },
  { key: "imagen", label: "Imagen", required: false, description: "URL de la imagen" },
  { key: "suministrador", label: "Suministrador", required: false },
  { key: "almacen", label: "Almacen", required: false },
  { key: "categoria", label: "Categoria", required: false },
  { key: "precio_p", label: "Precio P", required: false, description: "Precio alternativo P" },
  { key: "precio_m", label: "Precio M.", required: false, description: "Precio alternativo M" },
  { key: "filtro_imagenes", label: "Filtro para Imagenes", required: false },
  { key: "ef_tkc", label: "EF TKC", required: false },
  { key: "id_tienda", label: "ID Tienda", required: false },
  { key: "estado_anuncio", label: "Estado Anuncio", required: false },
  { key: "estado_tienda", label: "Estado en Tienda", required: false },
  { key: "tienda", label: "Tienda", required: false },
  { key: "selecto", label: "Selecto", required: false, description: "Producto seleccionado" },
  { key: "cat_f1", label: "Cat.F1", required: false, description: "Categoría nivel 1" },
  { key: "cat_f2", label: "Cat.F2", required: false, description: "Categoría nivel 2" },
  { key: "cat_f3", label: "Cat.F3", required: false, description: "Categoría nivel 3" },
];

export default function ImportarExcel() {
  const [searchParams] = useSearchParams();
  const catalogId = searchParams.get('catalogId') || '';
  const isUpdateMode = Boolean(catalogId);
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [catalogName, setCatalogName] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Excel data state
  const [excelData, setExcelData] = useState<ParsedExcelData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  
  // Validation state
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [errorFilter, setErrorFilter] = useState<'all' | 'errors' | 'warnings'>('all');
  const [isEditingErrors, setIsEditingErrors] = useState(false);
  
  // Import result
  const [importResult, setImportResult] = useState<{ catalogId: string; itemsImported: number } | null>(null);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  
  const importCatalog = useImportCatalog();
  const updateCatalog = useUpdateCatalogImport();
  const { data: catalog } = useCatalog(catalogId);
  const { data: versions } = useCatalogVersions(catalogId);
  const currentVersion = versions?.[0];
  const { data: currentItems } = useCatalogItems(currentVersion?.id);

  useEffect(() => {
    if (catalog && isUpdateMode) {
      setCatalogName(catalog.name);
    }
  }, [catalog, isUpdateMode]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
      setCatalogName(droppedFile.name.replace(/\.(xlsx|xls)$/, ''));
    } else {
      toast.error('Por favor, selecciona un archivo Excel (.xlsx o .xls)');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls'))) {
      setFile(selectedFile);
      setCatalogName(selectedFile.name.replace(/\.(xlsx|xls)$/, ''));
    } else {
      toast.error('Por favor, selecciona un archivo Excel (.xlsx o .xls)');
    }
  };

  const processExcelFile = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('Leyendo archivo...');
    
    try {
      setProgress(30);
      setProgressMessage('Procesando datos...');
      
      const data = await parseExcelFile(file);
      
      setProgress(80);
      setProgressMessage('Preparando vista previa...');
      
      setExcelData(data);
      
      setProgress(100);
      setProgressMessage('¡Listo!');
      
      setTimeout(() => {
        setIsProcessing(false);
        setStep("mapping");
      }, 500);
      
    } catch (error) {
      console.error('Error processing Excel:', error);
      setIsProcessing(false);
      toast.error(error instanceof Error ? error.message : 'Error al procesar el archivo');
    }
  };

  const handleContinueToMapping = () => {
    if (file && catalogName) {
      processExcelFile();
    }
  };

  const handleContinueToValidation = (mappings: ColumnMapping[]) => {
    if (!excelData) return;
    
    setColumnMappings(mappings);
    setIsProcessing(true);
    setProgressMessage('Validando datos...');
    
    // Run validation
    const result = validateData(excelData.rows, mappings, expectedColumns);
    setValidationResult(result);
    setIsProcessing(false);
    setStep("validation");
  };

  const handleRevalidate = () => {
    if (!excelData || columnMappings.length === 0) return;
    
    setIsProcessing(true);
    setProgressMessage('Revalidando...');
    
    setTimeout(() => {
      const result = validateData(excelData.rows, columnMappings, expectedColumns);
      setValidationResult(result);
      setIsProcessing(false);
    }, 300);
  };

  const handleEditErrors = () => {
    setIsEditingErrors(true);
  };

  const handleSaveEditedData = (updatedRows: Record<string, string | number | null>[]) => {
    // Update the excel data with edited rows
    setExcelData(prev => prev ? { ...prev, rows: updatedRows } : null);
    setIsEditingErrors(false);
    
    // Revalidate with updated data
    const result = validateData(updatedRows, columnMappings, expectedColumns);
    setValidationResult(result);
    toast.success('Correcciones aplicadas. Datos revalidados.');
  };

  const handleConfirmImport = async () => {
    if (!excelData || columnMappings.length === 0) return;
    
    if (isUpdateMode) {
      handleBuildDiff();
      return;
    }

    setStep("importing");
    
    try {
      const result = await importCatalog.mutateAsync({
        catalogName,
        rows: excelData.rows,
        mappings: columnMappings,
        onProgress: (prog, msg) => {
          setProgress(prog);
          setProgressMessage(msg);
        },
      });
      
      setImportResult({
        catalogId: result.catalogId,
        itemsImported: result.itemsImported,
      });
      setStep("complete");
    } catch (error) {
      console.error('Import failed:', error);
      setStep("validation");
    }
  };

  const getTransformedItems = (): CatalogItemData[] => {
    if (!excelData) return [];

    return excelData.rows.map((row) => {
      const transformed = transformRowToCatalogItem(row, columnMappings);
      return {
        code: transformed.code as string,
        name: transformed.name as string,
        price_usd: transformed.price_usd as number,
        category: transformed.category as string | null,
        category_f1: transformed.category_f1 as string | null,
        category_f2: transformed.category_f2 as string | null,
        category_f3: transformed.category_f3 as string | null,
        supplier: transformed.supplier as string | null,
        warehouse: transformed.warehouse as string | null,
        store_id: transformed.store_id as string | null,
        store_name: transformed.store_name as string | null,
        image_url: transformed.image_url as string | null,
        image_filter: transformed.image_filter as string | null,
        states: transformed.states as Record<string, string>,
        extra_prices: transformed.extra_prices as Record<string, number>,
        flags: transformed.flags as Record<string, boolean>,
        is_selected: transformed.is_selected as boolean,
        is_active: transformed.is_active as boolean,
      };
    });
  };

  const getExistingItems = (): CatalogItemData[] => {
    return (currentItems || []).map((item) => ({
      code: item.code,
      name: item.name,
      price_usd: item.price_usd,
      category: item.category,
      category_f1: (item as unknown as { category_f1: string | null }).category_f1 ?? null,
      category_f2: (item as unknown as { category_f2: string | null }).category_f2 ?? null,
      category_f3: (item as unknown as { category_f3: string | null }).category_f3 ?? null,
      supplier: (item as unknown as { supplier: string | null }).supplier ?? null,
      warehouse: (item as unknown as { warehouse: string | null }).warehouse ?? null,
      store_id: (item as unknown as { store_id: string | null }).store_id ?? null,
      store_name: (item as unknown as { store_name: string | null }).store_name ?? null,
      image_url: (item as unknown as { image_url: string | null }).image_url ?? null,
      image_filter: (item as unknown as { image_filter: string | null }).image_filter ?? null,
      states: (item as unknown as { states: Record<string, string> | null }).states ?? {},
      extra_prices: (item as unknown as { extra_prices: Record<string, number> | null }).extra_prices ?? {},
      flags: (item as unknown as { flags: Record<string, boolean> | null }).flags ?? {},
      is_selected: item.is_selected,
      is_active: item.is_active,
    }));
  };

  const handleBuildDiff = () => {
    if (!currentVersion) {
      toast.error('No se encontró una versión base del catálogo.');
      return;
    }

    const diff = createCatalogDiff(getExistingItems(), getTransformedItems());
    setDiffResult(diff);
    setStep("diff");
  };

  const handleApplyUpdate = async (options: ApplyOptions) => {
    if (!catalogId || !currentVersion || !diffResult) return;

    setStep("importing");

    const newItemsByCode = new Map(diffResult.newItems.map((item) => [item.code, item.newItem]));
    const modifiedItemsByCode = new Map(diffResult.modifiedItems.map((item) => [item.code, item.newItem]));
    const existingItemsByCode = new Map(getExistingItems().map((item) => [item.code, item]));

    const mergedItems = new Map<string, CatalogItemData>();

    existingItemsByCode.forEach((item, code) => {
      mergedItems.set(code, item);
    });

    options.selectedModifiedCodes.forEach((code) => {
      const updated = modifiedItemsByCode.get(code);
      if (updated) {
        mergedItems.set(code, updated as CatalogItemData);
      }
    });

    options.selectedNewCodes.forEach((code) => {
      const created = newItemsByCode.get(code);
      if (created) {
        mergedItems.set(code, created as CatalogItemData);
      }
    });

    options.selectedDeletedCodes.forEach((code) => {
      mergedItems.delete(code);
    });

    try {
      const result = await updateCatalog.mutateAsync({
        catalogId,
        baseVersionNumber: currentVersion.version_number,
        items: Array.from(mergedItems.values()),
        onProgress: (prog, msg) => {
          setProgress(prog);
          setProgressMessage(msg);
        },
      });

      setImportResult({
        catalogId: result.catalogId,
        itemsImported: result.itemsImported,
      });
      setStep("complete");
    } catch (error) {
      console.error('Update failed:', error);
      setStep("diff");
    }
  };

  const handleExportErrors = () => {
    if (!validationResult) return;
    
    const csv = [
      ['Fila', 'Columna', 'Campo', 'Error', 'Valor', 'Severidad'].join(','),
      ...validationResult.errors.map(e => 
        [e.row, e.column, e.field, `"${e.error}"`, `"${e.value || ''}"`, e.severity].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `errores_${catalogName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Filtered errors based on severity
  const filteredErrors = useMemo(() => {
    if (!validationResult) return [];
    
    switch (errorFilter) {
      case 'errors':
        return validationResult.errors.filter(e => e.severity === 'error');
      case 'warnings':
        return validationResult.errors.filter(e => e.severity === 'warning');
      default:
        return validationResult.errors;
    }
  }, [validationResult, errorFilter]);

  // Preview data for mapping step
  const previewData = useMemo(() => {
    if (!excelData) return [];
    return getPreviewRows(excelData.rows, 5);
  }, [excelData]);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isUpdateMode ? "Actualizar catálogo" : "Importar Excel"}
          </h1>
          <p className="text-muted-foreground">
            {isUpdateMode
              ? "Sube un archivo .xlsx para comparar y actualizar productos."
              : "Sube un archivo .xlsx para crear o actualizar un catálogo"}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {[
            { key: "upload", label: "Subir archivo" },
            { key: "mapping", label: "Mapeo de columnas" },
            { key: "validation", label: "Validación" },
            ...(isUpdateMode ? [{ key: "diff", label: "Cambios" }] : []),
            { key: "complete", label: "Completado" },
          ].map((s, index) => {
            const stepKeys = isUpdateMode
              ? ["upload", "mapping", "validation", "diff", "complete"]
              : ["upload", "mapping", "validation", "complete"];
            const currentIndex = stepKeys.indexOf(step === "importing" ? "validation" : step);
            const isActive = s.key === step || (s.key === "validation" && step === "importing");
            const isCompleted = stepKeys.indexOf(s.key) < currentIndex;

            return (
              <div key={s.key} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium border-2",
                    isCompleted ? "bg-primary border-primary text-primary-foreground" :
                    isActive ? "border-primary text-primary" :
                    "border-muted-foreground/30 text-muted-foreground"
                  )}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                  </div>
                  <span className={cn(
                    "text-sm font-medium hidden sm:inline",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {s.label}
                  </span>
                </div>
                {index < stepKeys.length - 1 && (
                  <div className={cn(
                    "w-12 h-0.5 mx-2",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle>Subir archivo Excel</CardTitle>
              <CardDescription>
                Arrastra o selecciona un archivo .xlsx con tu catálogo de productos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30",
                  file ? "bg-muted/50" : "hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                      <FileSpreadsheet className="h-8 w-8 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setFile(null)}>
                      <X className="h-4 w-4 mr-2" />
                      Cambiar archivo
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Arrastra tu archivo aquí</p>
                      <p className="text-sm text-muted-foreground">
                        o haz clic para seleccionar
                      </p>
                    </div>
                    <Label htmlFor="file-upload">
                      <Button variant="outline" asChild>
                        <span>
                          Seleccionar archivo
                          <input
                            id="file-upload"
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={handleFileSelect}
                          />
                        </span>
                      </Button>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Solo archivos .xlsx o .xls • Máximo 10,000+ filas soportadas
                    </p>
                  </div>
                )}
              </div>

              {/* Catalog Name */}
              {file && (
                <div className="space-y-2">
                  <Label htmlFor="catalog-name">Nombre del catálogo</Label>
                  <Input
                    id="catalog-name"
                    value={catalogName}
                    onChange={(e) => setCatalogName(e.target.value)}
                    placeholder="Ej: Lista de Precios Q1 2024"
                    disabled={isUpdateMode}
                  />
                </div>
              )}

              {/* Processing Progress */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{progressMessage}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" asChild>
                  <Link to="/catalogos">Cancelar</Link>
                </Button>
                <Button 
                  onClick={handleContinueToMapping}
                  disabled={!file || !catalogName || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "mapping" && excelData && (
          <ColumnMapper
            excelColumns={excelData.columns}
            systemFields={expectedColumns}
            previewData={previewData}
            onMappingsChange={setColumnMappings}
            onValidate={handleContinueToValidation}
            onBack={() => setStep("upload")}
          />
        )}

        {step === "validation" && validationResult && (
          <Card>
            <CardHeader>
              <CardTitle>Validación de datos</CardTitle>
              <CardDescription>
                Revisa los resultados de validación antes de importar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="font-medium">{validationResult.validRows.toLocaleString()} filas válidas</span>
                  </div>
                </div>
                <div className={cn(
                  "p-4 rounded-lg border",
                  validationResult.errorCount > 0 
                    ? "bg-destructive/10 border-destructive/20" 
                    : "bg-muted"
                )}>
                  <div className="flex items-center gap-2">
                    <AlertCircle className={cn(
                      "h-5 w-5",
                      validationResult.errorCount > 0 ? "text-destructive" : "text-muted-foreground"
                    )} />
                    <span className="font-medium">{validationResult.errorCount} errores</span>
                  </div>
                </div>
                <div className={cn(
                  "p-4 rounded-lg border",
                  validationResult.warningCount > 0 
                    ? "bg-warning/10 border-warning/20" 
                    : "bg-muted"
                )}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={cn(
                      "h-5 w-5",
                      validationResult.warningCount > 0 ? "text-warning" : "text-muted-foreground"
                    )} />
                    <span className="font-medium">{validationResult.warningCount} advertencias</span>
                  </div>
                </div>
              </div>

              {/* Total rows info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                <span>{validationResult.totalRows.toLocaleString()} filas totales en el archivo</span>
              </div>

              {/* Duplicates info */}
              {validationResult.duplicates.size > 0 && (
                <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <span className="font-medium">Códigos duplicados detectados: {validationResult.duplicates.size}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(validationResult.duplicates.keys()).slice(0, 10).map(code => (
                      <Badge key={code} variant="destructive" className="text-xs">
                        {code}
                      </Badge>
                    ))}
                    {validationResult.duplicates.size > 10 && (
                      <Badge variant="outline" className="text-xs">
                        +{validationResult.duplicates.size - 10} más
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Errors Table */}
              {validationResult.errors.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">Problemas detectados</h3>
                      <div className="flex gap-1">
                        <Button
                          variant={errorFilter === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setErrorFilter('all')}
                        >
                          Todos ({validationResult.errors.length})
                        </Button>
                        <Button
                          variant={errorFilter === 'errors' ? 'destructive' : 'outline'}
                          size="sm"
                          onClick={() => setErrorFilter('errors')}
                        >
                          Errores ({validationResult.errorCount})
                        </Button>
                        <Button
                          variant={errorFilter === 'warnings' ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => setErrorFilter('warnings')}
                        >
                          Advertencias ({validationResult.warningCount})
                        </Button>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExportErrors}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar CSV
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleEditErrors}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar errores
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow className="bg-table-header">
                          <TableHead className="w-20">Fila</TableHead>
                          <TableHead>Columna</TableHead>
                          <TableHead>Error</TableHead>
                          <TableHead className="w-24">Severidad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredErrors.slice(0, 100).map((error, i) => (
                          <TableRow key={`${error.row}-${error.field}-${i}`}>
                            <TableCell className="font-mono">{error.row}</TableCell>
                            <TableCell className="font-medium">{error.column}</TableCell>
                            <TableCell className={cn(
                              error.severity === 'error' ? "text-destructive" : "text-warning"
                            )}>
                              {error.error}
                            </TableCell>
                            <TableCell>
                              <Badge variant={error.severity === 'error' ? 'destructive' : 'secondary'}>
                                {error.severity === 'error' ? 'Error' : 'Advertencia'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredErrors.length > 100 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Mostrando primeros 100 de {filteredErrors.length} problemas. 
                      Exporta el CSV para ver todos.
                    </p>
                  )}
                </div>
              )}

              {/* Success message when no errors */}
              {validationResult.errorCount === 0 && validationResult.warningCount === 0 && (
                <div className="p-6 rounded-lg bg-success/10 border border-success/20 text-center">
                  <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-1">¡Validación exitosa!</h3>
                  <p className="text-muted-foreground">
                    Todos los datos están correctos y listos para importar.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("mapping")}>
                  Atrás
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleRevalidate} disabled={isProcessing}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", isProcessing && "animate-spin")} />
                    Revalidar
                  </Button>
                  <Button 
                    onClick={handleConfirmImport}
                    disabled={validationResult.errorCount > 0}
                  >
                    {validationResult.errorCount > 0 ? (
                      'Corrige los errores primero'
                    ) : (
                      <>
                        {isUpdateMode ? "Comparar cambios" : "Confirmar importación"}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "diff" && diffResult && (
          <CatalogDiffView
            diff={diffResult}
            onApply={handleApplyUpdate}
            onBack={() => setStep("validation")}
            isApplying={updateCatalog.isPending}
          />
        )}

        {step === "validation" && isEditingErrors && excelData && validationResult && (
          <ValidationEditor
            rows={excelData.rows}
            errors={validationResult.errors}
            mappings={columnMappings}
            systemFields={expectedColumns}
            onSave={handleSaveEditedData}
            onCancel={() => setIsEditingErrors(false)}
          />
        )}

        {step === "importing" && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center text-center">
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
                <h2 className="text-2xl font-bold mb-2">
                  {isUpdateMode ? "Aplicando cambios..." : "Importando catálogo..."}
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  {progressMessage}
                </p>
                <div className="w-full max-w-md space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground">{progress}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "complete" && importResult && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  {isUpdateMode ? "¡Actualización completada!" : "¡Importación completada!"}
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  {isUpdateMode
                    ? `Se han actualizado ${importResult.itemsImported.toLocaleString()} productos en el catálogo "${catalogName}".`
                    : `Se han importado exitosamente ${importResult.itemsImported.toLocaleString()} productos al catálogo "${catalogName}".`}
                  El catálogo está en estado borrador.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" asChild>
                    <Link to="/catalogos">Ver catálogos</Link>
                  </Button>
                  <Button asChild>
                    <Link to={`/catalogos/${importResult.catalogId}`}>
                      Ir al catálogo
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
