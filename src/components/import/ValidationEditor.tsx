import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Edit, 
  Save, 
  X, 
  Check, 
  AlertCircle, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ValidationError } from '@/lib/dataValidator';
import type { ColumnMapping, SystemField } from './ColumnMapper';

interface ValidationEditorProps {
  rows: Record<string, string | number | null>[];
  errors: ValidationError[];
  mappings: ColumnMapping[];
  systemFields: SystemField[];
  onSave: (updatedRows: Record<string, string | number | null>[]) => void;
  onCancel: () => void;
}

interface EditableError extends ValidationError {
  id: string;
  originalValue: string | null;
  newValue: string | null;
  isEditing: boolean;
  isFixed: boolean;
}

export function ValidationEditor({
  rows,
  errors,
  mappings,
  systemFields,
  onSave,
  onCancel,
}: ValidationEditorProps) {
  // Convert errors to editable format
  const [editableErrors, setEditableErrors] = useState<EditableError[]>(() => 
    errors.map((error, index) => ({
      ...error,
      id: `${error.row}-${error.field}-${index}`,
      originalValue: error.value,
      newValue: error.value,
      isEditing: false,
      isFixed: false,
    }))
  );

  const [editRowDialogOpen, setEditRowDialogOpen] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [editedRowData, setEditedRowData] = useState<Record<string, string>>({});

  const [currentPage, setCurrentPage] = useState(0);
  const errorsPerPage = 20;

  // Group errors by row for full row editing
  const errorsByRow = useMemo(() => {
    const grouped = new Map<number, EditableError[]>();
    for (const error of editableErrors) {
      if (!grouped.has(error.row)) {
        grouped.set(error.row, []);
      }
      grouped.get(error.row)!.push(error);
    }
    return grouped;
  }, [editableErrors]);

  // Updated rows with edits applied
  const updatedRows = useMemo(() => {
    const rowsCopy = rows.map(row => ({ ...row }));
    
    for (const error of editableErrors) {
      if (error.isFixed && error.newValue !== error.originalValue) {
        const rowIndex = error.row - 2; // Convert from 1-indexed with header
        if (rowIndex >= 0 && rowIndex < rowsCopy.length) {
          rowsCopy[rowIndex][error.column] = error.newValue;
        }
      }
    }
    
    return rowsCopy;
  }, [rows, editableErrors]);

  const fixedCount = editableErrors.filter(e => e.isFixed).length;
  const remainingErrors = editableErrors.filter(e => !e.isFixed && e.severity === 'error').length;

  // Paginated errors
  const paginatedErrors = useMemo(() => {
    const unfixed = editableErrors.filter(e => !e.isFixed);
    const start = currentPage * errorsPerPage;
    return unfixed.slice(start, start + errorsPerPage);
  }, [editableErrors, currentPage]);

  const totalPages = Math.ceil(editableErrors.filter(e => !e.isFixed).length / errorsPerPage);

  const handleStartEdit = (errorId: string) => {
    setEditableErrors(prev => prev.map(e => 
      e.id === errorId ? { ...e, isEditing: true } : e
    ));
  };

  const handleCancelEdit = (errorId: string) => {
    setEditableErrors(prev => prev.map(e => 
      e.id === errorId ? { ...e, isEditing: false, newValue: e.originalValue } : e
    ));
  };

  const handleSaveEdit = (errorId: string) => {
    setEditableErrors(prev => prev.map(e => 
      e.id === errorId ? { ...e, isEditing: false, isFixed: true } : e
    ));
  };

  const handleValueChange = (errorId: string, value: string) => {
    setEditableErrors(prev => prev.map(e => 
      e.id === errorId ? { ...e, newValue: value } : e
    ));
  };

  const handleEditFullRow = (rowNumber: number) => {
    const rowIndex = rowNumber - 2;
    if (rowIndex < 0 || rowIndex >= rows.length) return;

    setSelectedRowIndex(rowIndex);
    
    // Create editable copy of row data
    const rowData: Record<string, string> = {};
    for (const mapping of mappings) {
      if (mapping.excelColumn) {
        const value = rows[rowIndex][mapping.excelColumn];
        rowData[mapping.excelColumn] = value !== null ? String(value) : '';
      }
    }
    setEditedRowData(rowData);
    setEditRowDialogOpen(true);
  };

  const handleSaveFullRow = () => {
    if (selectedRowIndex === null) return;

    const rowNumber = selectedRowIndex + 2;
    
    // Update all errors for this row
    setEditableErrors(prev => prev.map(error => {
      if (error.row === rowNumber) {
        const newValue = editedRowData[error.column] ?? null;
        return {
          ...error,
          newValue,
          isFixed: true,
          isEditing: false,
        };
      }
      return error;
    }));

    setEditRowDialogOpen(false);
    setSelectedRowIndex(null);
    setEditedRowData({});
  };

  const handleSaveAll = () => {
    onSave(updatedRows);
  };

  const getFieldLabel = (fieldKey: string): string => {
    return systemFields.find(f => f.key === fieldKey)?.label || fieldKey;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Editar errores de validación</span>
          <div className="flex items-center gap-2 text-sm font-normal">
            {fixedCount > 0 && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                <Check className="h-3 w-3 mr-1" />
                {fixedCount} corregidos
              </Badge>
            )}
            {remainingErrors > 0 && (
              <Badge variant="destructive">
                {remainingErrors} errores pendientes
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Corrige los valores directamente antes de importar. Los cambios se aplicarán a los datos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Errors Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-20">Fila</TableHead>
                <TableHead className="w-32">Campo</TableHead>
                <TableHead>Problema</TableHead>
                <TableHead>Valor original</TableHead>
                <TableHead>Nuevo valor</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedErrors.map((error) => (
                <TableRow 
                  key={error.id}
                  className={cn(
                    error.isFixed && "bg-success/5",
                    error.isEditing && "bg-muted/50"
                  )}
                >
                  <TableCell>
                    <button
                      className="font-mono text-primary hover:underline"
                      onClick={() => handleEditFullRow(error.row)}
                      title="Editar fila completa"
                    >
                      {error.row}
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{getFieldLabel(error.field)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {error.severity === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                      )}
                      <span className={cn(
                        "text-sm",
                        error.severity === 'error' ? "text-destructive" : "text-warning"
                      )}>
                        {error.error}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {error.originalValue || '(vacío)'}
                    </code>
                  </TableCell>
                  <TableCell>
                    {error.isEditing ? (
                      <Input
                        value={error.newValue || ''}
                        onChange={(e) => handleValueChange(error.id, e.target.value)}
                        className="h-8"
                        autoFocus
                      />
                    ) : error.isFixed ? (
                      <code className="text-xs bg-success/20 text-success px-1 py-0.5 rounded">
                        {error.newValue || '(vacío)'}
                      </code>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {error.isEditing ? (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleSaveEdit(error.id)}
                        >
                          <Check className="h-4 w-4 text-success" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleCancelEdit(error.id)}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : error.isFixed ? (
                      <Badge variant="outline" className="bg-success/10 text-success text-xs">
                        Corregido
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={() => handleStartEdit(error.id)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Página {currentPage + 1} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSaveAll}>
            <Save className="h-4 w-4 mr-2" />
            Aplicar correcciones y revalidar
          </Button>
        </div>

        {/* Edit Full Row Dialog */}
        <Dialog open={editRowDialogOpen} onOpenChange={setEditRowDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar fila {selectedRowIndex !== null ? selectedRowIndex + 2 : ''}</DialogTitle>
              <DialogDescription>
                Edita todos los campos de esta fila. Los errores de esta fila se marcarán como corregidos.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {mappings.filter(m => m.excelColumn).map((mapping) => {
                const field = systemFields.find(f => f.key === mapping.systemField);
                const hasError = selectedRowIndex !== null && 
                  errorsByRow.get(selectedRowIndex + 2)?.some(e => e.column === mapping.excelColumn);
                
                return (
                  <div key={mapping.systemField} className="grid grid-cols-4 items-center gap-4">
                    <Label className={cn(
                      "text-right",
                      hasError && "text-destructive"
                    )}>
                      {field?.label || mapping.systemField}
                      {field?.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <div className="col-span-3">
                      <Input
                        value={editedRowData[mapping.excelColumn!] || ''}
                        onChange={(e) => setEditedRowData(prev => ({
                          ...prev,
                          [mapping.excelColumn!]: e.target.value
                        }))}
                        className={cn(hasError && "border-destructive")}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditRowDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveFullRow}>
                <Save className="h-4 w-4 mr-2" />
                Guardar cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
