import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileSpreadsheet, 
  Upload, 
  Users, 
  TrendingUp,
  Plus,
  ArrowRight,
  FileText
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardStats, useRecentCatalogs } from "@/hooks/useDashboardStats";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentCatalogs, isLoading: catalogsLoading } = useRecentCatalogs(5);

  const statItems = [
    { label: "Catálogos Activos", value: stats?.activeCatalogs || 0, icon: FileSpreadsheet },
    { label: "Items Totales", value: stats?.totalItems || 0, icon: FileText },
    { label: "Clientes Activos", value: stats?.totalClients || 0, icon: Users },
    { label: "Versiones Publicadas", value: stats?.publishedVersions || 0, icon: TrendingUp },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Gestiona tus catálogos de precios
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to="/catalogos/importar">
                <Upload className="h-4 w-4 mr-2" />
                Importar Excel
              </Link>
            </Button>
            <Button asChild>
              <Link to="/catalogos?nuevo=true">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Catálogo
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statItems.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Catalogs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Catálogos Recientes</CardTitle>
              <CardDescription>Últimas actualizaciones de tus catálogos</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/catalogos">
                Ver todos
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {catalogsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : recentCatalogs && recentCatalogs.length > 0 ? (
              <div className="space-y-4">
                {recentCatalogs.map((catalog) => (
                  <div 
                    key={catalog.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{catalog.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {catalog.item_count} items • {catalog.client_count} clientes • {formatDistanceToNow(new Date(catalog.updated_at), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={catalog.status} />
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/catalogos/${catalog.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay catálogos aún</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link to="/catalogos?nuevo=true">Crear primer catálogo</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-dashed border-2 hover:border-primary/50 hover:bg-accent/30 transition-colors cursor-pointer">
            <Link to="/catalogos/importar" className="block p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Importar Excel</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sube un archivo .xlsx para crear un nuevo catálogo
                  </p>
                </div>
              </div>
            </Link>
          </Card>

          <Card className="border-dashed border-2 hover:border-primary/50 hover:bg-accent/30 transition-colors cursor-pointer">
            <Link to="/clientes" className="block p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Gestionar Clientes</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Administra accesos y asignaciones de catálogos
                  </p>
                </div>
              </div>
            </Link>
          </Card>

          <Card className="border-dashed border-2 hover:border-primary/50 hover:bg-accent/30 transition-colors cursor-pointer">
            <Link to="/catalogos" className="block p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Ver Catálogos</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Administra y edita tus catálogos de precios
                  </p>
                </div>
              </div>
            </Link>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
