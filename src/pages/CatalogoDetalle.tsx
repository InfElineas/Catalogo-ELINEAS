import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  Search, 
  FileDown,
  MoreVertical,
  Edit,
  Trash2,
  History,
  Users,
  CheckCircle2,
  Clock,
  Star,
  ImageOff,
  Send,
  UserPlus,
  UserMinus,
  RefreshCw
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useCatalog, useUpdateCatalog } from "@/hooks/useCatalogs";
import { useCatalogVersions, useCatalogItems, useUpdateCatalogItem, useDeleteCatalogItem, usePublishVersion } from "@/hooks/useCatalogItems";
import { useClients, useAssignCatalogToClient, useUnassignCatalogFromClient } from "@/hooks/useClients";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exportCatalogToExcel, exportCatalogToCSV } from "@/lib/excelExporter";

export default function CatalogoDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [assignClientOpen, setAssignClientOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const { data: catalog, isLoading: catalogLoading } = useCatalog(id || '');
  const { data: versions, isLoading: versionsLoading } = useCatalogVersions(id || '');
  const currentVersion = versions?.find(v => v.status === 'published') || versions?.[0];
  const { data: items, isLoading: itemsLoading } = useCatalogItems(currentVersion?.id || '');
  const { data: allClients } = useClients();
  
  const updateCatalog = useUpdateCatalog();
  const updateItem = useUpdateCatalogItem();
  const deleteItem = useDeleteCatalogItem();
  const publishVersion = usePublishVersion();
  const assignClient = useAssignCatalogToClient();
  const unassignClient = useUnassignCatalogFromClient();

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
  });

  const filteredItems = (items || []).filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesSelected = selectedFilter === "all" || 
      (selectedFilter === "selected" && item.is_selected) ||
      (selectedFilter === "not-selected" && !item.is_selected);
    return matchesSearch && matchesCategory && matchesSelected;
  });

  const categories = [...new Set((items || []).map(item => item.category).filter(Boolean))] as string[];

  // Get assigned clients
  const assignedClients = catalog?.assigned_clients || [];
  const unassignedClients = (allClients || []).filter(
    c => !assignedClients.some((ac: { id: string }) => ac.id === c.id) && c.status === 'active'
  );

  const handleEditCatalog = () => {
    if (!catalog) return;
    setEditForm({
      name: catalog.name,
      description: catalog.description || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    await updateCatalog.mutateAsync({
      id,
      name: editForm.name,
      description: editForm.description,
    });
    setEditDialogOpen(false);
  };

  const handleToggleItemActive = async (itemId: string, currentActive: boolean) => {
    await updateItem.mutateAsync({
      id: itemId,
      is_active: !currentActive,
    });
  };

  const handleToggleItemSelected = async (itemId: string, currentSelected: boolean) => {
    await updateItem.mutateAsync({
      id: itemId,
      is_selected: !currentSelected,
    });
  };

  const handleDeleteItem = async () => {
    if (!deleteItemId || !currentVersion) return;
    await deleteItem.mutateAsync({ id: deleteItemId, versionId: currentVersion.id });
    setDeleteItemId(null);
  };

  const handlePublish = async () => {
    if (!currentVersion || !id || currentVersion.status === 'published') return;
    await publishVersion.mutateAsync({ versionId: currentVersion.id, catalogId: id });
    toast.success('Catálogo publicado exitosamente');
  };

  const handleAssignClient = async () => {
    if (!id || !selectedClientId) return;
    await assignClient.mutateAsync({ catalogId: id, clientId: selectedClientId });
    setAssignClientOpen(false);
    setSelectedClientId('');
  };

  const handleUnassignClient = async (clientId: string) => {
    if (!id) return;
    await unassignClient.mutateAsync({ catalogId: id, clientId });
  };

  if (catalogLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!catalog) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground mb-4">Catálogo no encontrado</p>
          <Button asChild>
            <Link to="/catalogos">Volver a catálogos</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/catalogos">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight">{catalog.name}</h1>
                <StatusBadge status={catalog.status} />
              </div>
              <p className="text-muted-foreground max-w-2xl">
                {catalog.description || 'Sin descripción'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={`/catalogos/importar?catalogId=${catalog.id}`}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => {
                    try {
                      exportCatalogToExcel(items || [], { catalogName: catalog.name, includeInactive: true });
                      toast.success('Excel exportado correctamente');
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Error al exportar');
                    }
                  }}
                >
                  Excel Completo
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    try {
                      exportCatalogToExcel(items || [], { catalogName: catalog.name, onlySelected: true });
                      toast.success('Excel exportado correctamente');
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Error al exportar');
                    }
                  }}
                >
                  Excel Solo Selectos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => {
                    try {
                      exportCatalogToCSV(items || [], { catalogName: catalog.name, includeInactive: true });
                      toast.success('CSV exportado correctamente');
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Error al exportar');
                    }
                  }}
                >
                  CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {catalog.status === 'draft' && (
              <Button onClick={handlePublish} disabled={publishVersion.isPending}>
                <Send className="h-4 w-4 mr-2" />
                Publicar
              </Button>
            )}
            <Button variant="outline" onClick={handleEditCatalog}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{catalog.item_count || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Versión</p>
                  <p className="text-2xl font-bold">{catalog.current_version || 1}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <History className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clientes</p>
                  <p className="text-2xl font-bold">{catalog.client_count || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Última actualización</p>
                  <p className="text-lg font-bold">
                    {formatDistanceToNow(new Date(catalog.updated_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">Items ({items?.length || 0})</TabsTrigger>
            <TabsTrigger value="versions">Versiones ({versions?.length || 0})</TabsTrigger>
            <TabsTrigger value="clients">Clientes ({assignedClients.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código o nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Selecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="selected">Solo Selectos</SelectItem>
                  <SelectItem value="not-selected">No Selectos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Items Table */}
            <Card>
              <CardContent className="p-0">
                {itemsLoading ? (
                  <div className="p-8">
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No hay items en este catálogo
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-16">Imagen</TableHead>
                          <TableHead className="w-28">Código</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Precio USD</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead>Tienda</TableHead>
                          <TableHead className="text-center">Selecto</TableHead>
                          <TableHead className="text-center">Activo</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item) => (
                          <TableRow key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
                            <TableCell>
                              {item.image_url ? (
                                <img 
                                  src={item.image_url} 
                                  alt={item.name}
                                  className="h-10 w-10 rounded object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                  <ImageOff className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{item.code}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-right font-semibold">
                              ${Number(item.price_usd).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {item.category && <Badge variant="secondary">{item.category}</Badge>}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{item.store_name || '-'}</TableCell>
                            <TableCell className="text-center">
                              <button 
                                onClick={() => handleToggleItemSelected(item.id, item.is_selected)}
                                className="focus:outline-none"
                              >
                                {item.is_selected ? (
                                  <Star className="h-4 w-4 text-warning mx-auto fill-warning" />
                                ) : (
                                  <Star className="h-4 w-4 text-muted-foreground/30 mx-auto hover:text-warning/50" />
                                )}
                              </button>
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={item.is_active}
                                onCheckedChange={() => handleToggleItemActive(item.id, item.is_active)}
                              />
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleToggleItemSelected(item.id, item.is_selected)}>
                                    <Star className="h-4 w-4 mr-2" />
                                    {item.is_selected ? 'Quitar selecto' : 'Marcar selecto'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleItemActive(item.id, item.is_active)}>
                                    {item.is_active ? 'Desactivar' : 'Activar'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => setDeleteItemId(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            <p className="text-sm text-muted-foreground">
              Mostrando {filteredItems.length} de {items?.length || 0} items
            </p>
          </TabsContent>

          <TabsContent value="versions" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {versionsLoading ? (
                  <div className="p-8">
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-24">Versión</TableHead>
                          <TableHead>Nota</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="w-32"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(versions || []).map((version) => (
                          <TableRow key={version.id}>
                            <TableCell className="font-mono font-semibold">
                              v{version.version_number}
                            </TableCell>
                            <TableCell>{version.notes || 'Sin notas'}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDistanceToNow(new Date(version.created_at), { addSuffix: true, locale: es })}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={version.status} />
                            </TableCell>
                            <TableCell>
                              {version.status === "draft" && id && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => publishVersion.mutateAsync({ versionId: version.id, catalogId: id })}
                                  disabled={publishVersion.isPending}
                                >
                                  Publicar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Clientes con acceso</CardTitle>
                  <Button size="sm" onClick={() => setAssignClientOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Asignar cliente
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {assignedClients.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay clientes asignados a este catálogo
                  </p>
                ) : (
                  <div className="space-y-3">
                    {assignedClients.map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {client.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleUnassignClient(client.id)}
                        >
                          <UserMinus className="h-4 w-4 mr-1" />
                          Quitar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Catalog Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Catálogo</DialogTitle>
            <DialogDescription>
              Modifica los datos del catálogo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateCatalog.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirmation */}
      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar item?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El item será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Client Dialog */}
      <Dialog open={assignClientOpen} onOpenChange={setAssignClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Cliente</DialogTitle>
            <DialogDescription>
              Selecciona un cliente para darle acceso a este catálogo
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {unassignedClients.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No hay clientes disponibles para asignar
              </p>
            ) : (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignClientOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssignClient} 
              disabled={!selectedClientId || assignClient.isPending}
            >
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
