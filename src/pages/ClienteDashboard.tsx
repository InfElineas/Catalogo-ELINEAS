import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  FileDown,
  Star,
  Grid3X3,
  List,
  Package,
  FileSpreadsheet
} from "lucide-react";
import { useState } from "react";
import { useClientCatalogs, useClientCatalogItems } from "@/hooks/useClientCatalogs";
import { useGestors } from "@/hooks/useGestors";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { exportCatalogToCSV, exportCatalogToExcel } from "@/lib/excelExporter";
import { normalizeImageUrl } from "@/lib/imageUrl";
import { toast } from "sonner";

export default function ClienteDashboard() {
  const { data: catalogs, isLoading: catalogsLoading } = useClientCatalogs();
  const { data: gestores, isLoading: gestoresLoading } = useGestors();
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Set first catalog as selected if none selected
  const currentCatalogId = selectedCatalog || (catalogs && catalogs.length > 0 ? catalogs[0].id : null);
  
  const { data: items, isLoading: itemsLoading } = useClientCatalogItems(currentCatalogId);

  const categories = [...new Set((items || []).map(item => item.category).filter(Boolean))] as string[];

  const filteredItems = (items || []).filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const currentCatalog = catalogs?.find(c => c.id === currentCatalogId);

  if (catalogsLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-6 sm:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!catalogs || catalogs.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileSpreadsheet className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No tienes catálogos asignados</h2>
          <p className="text-muted-foreground max-w-md">
            Contacta a tu gestor para que te asigne acceso a los catálogos disponibles.
          </p>
          <div className="mt-6 w-full max-w-md space-y-3">
            {gestoresLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-12 w-full" />
                ))}
              </div>
            ) : gestores && gestores.length > 0 ? (
              gestores.map((gestor) => (
                <Card key={gestor.id}>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-4">
                    <div className="text-left">
                      <p className="font-medium">
                        {gestor.full_name || gestor.email.split('@')[0]}
                      </p>
                      <p className="text-sm text-muted-foreground">{gestor.email}</p>
                      {gestor.sales_description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {gestor.sales_description}
                        </p>
                      )}
                    </div>
                    <Button asChild variant="outline" className="justify-center">
                      <a href={`mailto:${gestor.email}`}>Escribir</a>
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay gestores disponibles para contacto.
              </p>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Catálogo de Productos</h1>
            <p className="text-muted-foreground mt-1">
              Explora nuestra selección de productos disponibles
            </p>
          </div>
          {currentCatalog && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="lg" className="gap-2">
                  <FileDown className="h-5 w-5" />
                  Descargar catálogo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    try {
                      exportCatalogToExcel(items || [], {
                        catalogName: currentCatalog.name,
                        includeInactive: true,
                      });
                      toast.success('Catálogo exportado en Excel');
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Error al exportar el catálogo');
                    }
                  }}
                >
                  Descargar en Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    try {
                      exportCatalogToCSV(items || [], {
                        catalogName: currentCatalog.name,
                        includeInactive: true,
                      });
                      toast.success('Catálogo exportado en CSV');
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Error al exportar el catálogo');
                    }
                  }}
                >
                  Descargar en CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Catalog Selector Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {catalogs.map((catalog) => (
            <Card 
              key={catalog.id} 
              className={`group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl ${
                currentCatalogId === catalog.id 
                  ? 'ring-2 ring-primary shadow-xl' 
                  : 'hover:-translate-y-1'
              }`}
              onClick={() => setSelectedCatalog(catalog.id)}
            >
              <div className="relative h-32 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileSpreadsheet className="h-16 w-16 text-primary/30" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="font-semibold text-foreground text-lg">{catalog.name}</h3>
                  <p className="text-muted-foreground text-sm">{catalog.item_count} productos</p>
                </div>
              </div>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Actualizado: {formatDistanceToNow(new Date(catalog.updated_at), { addSuffix: true, locale: es })}
                  </span>
                  <Button size="sm" variant="ghost" className="text-primary hover:text-primary">
                    <FileDown className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Selected Catalog Products */}
        {currentCatalog && (
          <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-muted/30 p-4 rounded-xl">
              <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar productos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-background">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-background rounded-lg p-1 border">
                <Button 
                  size="sm" 
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  onClick={() => setViewMode("grid")}
                  className="h-8 px-3"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant={viewMode === "list" ? "default" : "ghost"}
                  onClick={() => setViewMode("list")}
                  className="h-8 px-3"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Results Count */}
            <p className="text-sm text-muted-foreground">
              {filteredItems.length} productos encontrados
            </p>

            {/* Loading State */}
            {itemsLoading ? (
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-80" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron productos</p>
              </div>
            ) : (
              <>
                {/* Grid View */}
                {viewMode === "grid" && (
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredItems.map((item) => {
                      const imageUrl = normalizeImageUrl(item.image_url);
                      return (
                      <Card 
                        key={item.id} 
                        className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                      >
                        {/* Image Container */}
                        <div className="relative aspect-square overflow-hidden bg-muted">
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                              <Package className="h-16 w-16 text-muted-foreground/30" />
                            </div>
                          )}
                          
                          {/* Selected Badge */}
                          {item.is_selected && (
                            <div className="absolute top-3 right-3">
                              <div className="bg-warning text-warning-foreground rounded-full p-1.5 shadow-lg">
                                <Star className="h-4 w-4 fill-current" />
                              </div>
                            </div>
                          )}
                          
                          {/* Category Badge */}
                          {item.category && (
                            <div className="absolute top-3 left-3">
                              <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                                {item.category}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <CardContent className="p-4 space-y-3">
                          {/* Code */}
                          <span className="text-xs font-mono text-muted-foreground">
                            {item.code}
                          </span>
                          
                          {/* Name */}
                          <h3 className="font-medium leading-tight line-clamp-2 min-h-[2.5rem]">
                            {item.name}
                          </h3>
                          
                          {/* Supplier & Store */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{item.supplier || 'Sin proveedor'}</span>
                            <span className="text-primary/70">{item.store_name || 'Sin tienda'}</span>
                          </div>
                          
                          {/* Price */}
                          <div className="pt-2 border-t">
                            <div className="flex items-baseline justify-between">
                              <span className="text-2xl font-bold text-primary">
                                ${item.price_usd.toFixed(2)}
                              </span>
                              <span className="text-xs text-muted-foreground">USD</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )})}
                  </div>
                )}

                {/* List View */}
                {viewMode === "list" && (
                  <div className="space-y-3">
                    {filteredItems.map((item) => {
                      const imageUrl = normalizeImageUrl(item.image_url);
                      return (
                      <Card 
                        key={item.id} 
                        className="group overflow-hidden transition-all duration-200 hover:shadow-lg"
                      >
                        <div className="flex items-center gap-4 p-4">
                          {/* Image */}
                          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                            {imageUrl ? (
                              <img 
                                src={imageUrl} 
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-8 w-8 text-muted-foreground/30" />
                              </div>
                            )}
                            {item.is_selected && (
                              <div className="absolute -top-1 -right-1">
                                <div className="bg-warning text-warning-foreground rounded-full p-1 shadow-lg">
                                  <Star className="h-3 w-3 fill-current" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-mono text-muted-foreground">
                                    {item.code}
                                  </span>
                                  {item.category && (
                                    <Badge variant="secondary" className="text-xs">
                                      {item.category}
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="font-medium truncate">{item.name}</h3>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span>{item.supplier || 'Sin proveedor'}</span>
                                  <span>•</span>
                                  <span>{item.store_name || 'Sin tienda'}</span>
                                </div>
                              </div>
                              
                              {/* Price */}
                              <div className="text-right flex-shrink-0">
                                <div className="text-2xl font-bold text-primary">
                                  ${item.price_usd.toFixed(2)}
                                </div>
                                <span className="text-xs text-muted-foreground">USD</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )})}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
