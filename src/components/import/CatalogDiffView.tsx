import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Minus, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DiffResult, DiffItem, FieldChange } from '@/lib/catalogDiff';
import { formatChangeValue } from '@/lib/catalogDiff';

interface CatalogDiffViewProps {
  diff: DiffResult;
  onApply: (options: ApplyOptions) => void;
  onBack: () => void;
  isApplying?: boolean;
}

export interface ApplyOptions {
  addNew: boolean;
  updateModified: boolean;
  deleteRemoved: boolean;
  selectedNewCodes: Set<string>;
  selectedModifiedCodes: Set<string>;
  selectedDeletedCodes: Set<string>;
}

export function CatalogDiffView({
  diff,
  onApply,
  onBack,
  isApplying,
}: CatalogDiffViewProps) {
  const [selectedNew, setSelectedNew] = useState<Set<string>>(() => 
    new Set(diff.newItems.map(item => item.code))
  );
  const [selectedModified, setSelectedModified] = useState<Set<string>>(() => 
    new Set(diff.modifiedItems.map(item => item.code))
  );
  const [selectedDeleted, setSelectedDeleted] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('summary');

  const toggleSelection = (set: Set<string>, code: string): Set<string> => {
    const newSet = new Set(set);
    if (newSet.has(code)) {
      newSet.delete(code);
    } else {
      newSet.add(code);
    }
    return newSet;
  };

  const selectAll = (items: DiffItem[], setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setter(new Set(items.map(item => item.code)));
  };

  const selectNone = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setter(new Set());
  };

  const handleApply = () => {
    onApply({
      addNew: selectedNew.size > 0,
      updateModified: selectedModified.size > 0,
      deleteRemoved: selectedDeleted.size > 0,
      selectedNewCodes: selectedNew,
      selectedModifiedCodes: selectedModified,
      selectedDeletedCodes: selectedDeleted,
    });
  };

  const totalChanges = selectedNew.size + selectedModified.size + selectedDeleted.size;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Vista de diferencias</span>
          <div className="flex items-center gap-2 text-sm font-normal">
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              <Plus className="h-3 w-3 mr-1" />
              {diff.summary.new} nuevos
            </Badge>
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
              <Pencil className="h-3 w-3 mr-1" />
              {diff.summary.modified} modificados
            </Badge>
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
              <Trash2 className="h-3 w-3 mr-1" />
              {diff.summary.deleted} eliminados
            </Badge>
            <Badge variant="secondary">
              <Minus className="h-3 w-3 mr-1" />
              {diff.summary.unchanged} sin cambios
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Selecciona qué cambios deseas aplicar al catálogo existente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="summary">Resumen</TabsTrigger>
            <TabsTrigger value="new" className="gap-2">
              Nuevos
              {diff.newItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {selectedNew.size}/{diff.newItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="modified" className="gap-2">
              Modificados
              {diff.modifiedItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {selectedModified.size}/{diff.modifiedItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="deleted" className="gap-2">
              Eliminados
              {diff.deletedItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {selectedDeleted.size}/{diff.deletedItems.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-success/30 bg-success/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                      <Plus className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-success">{diff.summary.new}</p>
                      <p className="text-sm text-muted-foreground">Productos nuevos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
                      <Pencil className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-warning">{diff.summary.modified}</p>
                      <p className="text-sm text-muted-foreground">Modificados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-destructive">{diff.summary.deleted}</p>
                      <p className="text-sm text-muted-foreground">Eliminados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{diff.summary.unchanged}</p>
                      <p className="text-sm text-muted-foreground">Sin cambios</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {diff.summary.new === 0 && diff.summary.modified === 0 && diff.summary.deleted === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No se detectaron cambios entre el archivo y el catálogo existente.</p>
              </div>
            )}
          </TabsContent>

          {/* New Items Tab */}
          <TabsContent value="new">
            {diff.newItems.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No hay productos nuevos
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {selectedNew.size} de {diff.newItems.length} seleccionados para agregar
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => selectAll(diff.newItems, setSelectedNew)}>
                      Seleccionar todos
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => selectNone(setSelectedNew)}>
                      Ninguno
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead>Categoría</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diff.newItems.map((item) => (
                        <TableRow key={item.code} className={cn(
                          !selectedNew.has(item.code) && "opacity-50"
                        )}>
                          <TableCell>
                            <Checkbox
                              checked={selectedNew.has(item.code)}
                              onCheckedChange={() => setSelectedNew(s => toggleSelection(s, item.code))}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">{item.code}</TableCell>
                          <TableCell>{item.newItem?.name as string}</TableCell>
                          <TableCell className="text-right">
                            ${Number(item.newItem?.price_usd || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {item.newItem?.category && (
                              <Badge variant="secondary">{item.newItem.category as string}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          {/* Modified Items Tab */}
          <TabsContent value="modified">
            {diff.modifiedItems.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No hay productos modificados
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {selectedModified.size} de {diff.modifiedItems.length} seleccionados para actualizar
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => selectAll(diff.modifiedItems, setSelectedModified)}>
                      Seleccionar todos
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => selectNone(setSelectedModified)}>
                      Ninguno
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-80">
                  <Accordion type="multiple" className="w-full">
                    {diff.modifiedItems.map((item) => (
                      <AccordionItem key={item.code} value={item.code}>
                        <div className="flex items-center gap-3 pr-4">
                          <Checkbox
                            checked={selectedModified.has(item.code)}
                            onCheckedChange={() => setSelectedModified(s => toggleSelection(s, item.code))}
                            className="ml-4"
                          />
                          <AccordionTrigger className={cn(
                            "flex-1",
                            !selectedModified.has(item.code) && "opacity-50"
                          )}>
                            <div className="flex items-center gap-4 text-left">
                              <span className="font-mono text-sm">{item.code}</span>
                              <span className="font-medium">{item.existingItem?.name}</span>
                              <Badge variant="outline" className="ml-auto">
                                {item.changes?.length} cambios
                              </Badge>
                            </div>
                          </AccordionTrigger>
                        </div>
                        <AccordionContent>
                          <div className="pl-12 pr-4 pb-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Campo</TableHead>
                                  <TableHead>Valor actual</TableHead>
                                  <TableHead className="w-8"></TableHead>
                                  <TableHead>Nuevo valor</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {item.changes?.map((change) => (
                                  <TableRow key={change.field}>
                                    <TableCell className="font-medium">{change.label}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {formatChangeValue(change.oldValue)}
                                    </TableCell>
                                    <TableCell>
                                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    </TableCell>
                                    <TableCell className="font-medium text-warning">
                                      {formatChangeValue(change.newValue)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          {/* Deleted Items Tab */}
          <TabsContent value="deleted">
            {diff.deletedItems.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No hay productos eliminados
              </p>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive">Atención</p>
                      <p className="text-sm text-muted-foreground">
                        Estos productos existen en el catálogo pero no están en el archivo importado.
                        Selecciona los que deseas eliminar del catálogo.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {selectedDeleted.size} de {diff.deletedItems.length} seleccionados para eliminar
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => selectAll(diff.deletedItems, setSelectedDeleted)}>
                      Seleccionar todos
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => selectNone(setSelectedDeleted)}>
                      Ninguno
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead>Categoría</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diff.deletedItems.map((item) => (
                        <TableRow key={item.code} className={cn(
                          selectedDeleted.has(item.code) && "bg-destructive/5"
                        )}>
                          <TableCell>
                            <Checkbox
                              checked={selectedDeleted.has(item.code)}
                              onCheckedChange={() => setSelectedDeleted(s => toggleSelection(s, item.code))}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">{item.code}</TableCell>
                          <TableCell>{item.existingItem?.name}</TableCell>
                          <TableCell className="text-right">
                            ${Number(item.existingItem?.price_usd || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {item.existingItem?.category && (
                              <Badge variant="secondary">{item.existingItem.category}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack} disabled={isApplying}>
            Atrás
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={totalChanges === 0 || isApplying}
          >
            {isApplying ? (
              <>Aplicando cambios...</>
            ) : totalChanges === 0 ? (
              'Selecciona cambios a aplicar'
            ) : (
              <>
                Aplicar {totalChanges} cambios
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
