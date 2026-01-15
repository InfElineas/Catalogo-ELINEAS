import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppConfig, useUpdateConfig } from "@/hooks/useAppConfig";
import { useAuth } from "@/contexts/AuthContext";
import { Settings, FileText, Upload, Building2, Save } from "lucide-react";

export default function Configuracion() {
  const { user } = useAuth();
  const { data: config, isLoading, error } = useAppConfig();
  const updateConfig = useUpdateConfig();

  // Local state for form fields
  const [generalForm, setGeneralForm] = useState({
    company_name: '',
    currency: 'USD',
    language: 'es',
  });
  const [pdfForm, setPdfForm] = useState({
    include_images: false,
    page_size: 'letter',
    orientation: 'portrait',
  });
  const [importForm, setImportForm] = useState({
    auto_detect_headers: true,
    skip_empty_rows: true,
  });
  const [initialized, setInitialized] = useState(false);

  // Initialize forms when config loads
  if (config && !initialized) {
    setGeneralForm(config.general);
    setPdfForm(config.pdf);
    setImportForm(config.import);
    setInitialized(true);
  }

  const handleSaveGeneral = async () => {
    await updateConfig.mutateAsync({ key: 'general', value: generalForm });
  };

  const handleSavePdf = async () => {
    await updateConfig.mutateAsync({ key: 'pdf', value: pdfForm });
  };

  const handleSaveImport = async () => {
    await updateConfig.mutateAsync({ key: 'import', value: importForm });
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
            <p className="text-muted-foreground">Configura las opciones del sistema</p>
          </div>
          <Card className="p-8 text-center">
            <p className="text-destructive">Error al cargar la configuración.</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">
            Configura las opciones del sistema
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-60" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList>
              <TabsTrigger value="general" className="gap-2">
                <Building2 className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="pdf" className="gap-2">
                <FileText className="h-4 w-4" />
                PDF
              </TabsTrigger>
              <TabsTrigger value="import" className="gap-2">
                <Upload className="h-4 w-4" />
                Importación
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración General</CardTitle>
                  <CardDescription>
                    Información básica de tu empresa
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Nombre de la empresa</Label>
                    <Input
                      id="company_name"
                      value={generalForm.company_name}
                      onChange={(e) => setGeneralForm(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="Mi Empresa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Moneda</Label>
                    <Select
                      value={generalForm.currency}
                      onValueChange={(value) => setGeneralForm(prev => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - Dólar estadounidense</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="MXN">MXN - Peso mexicano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Idioma</Label>
                    <Select
                      value={generalForm.language}
                      onValueChange={(value) => setGeneralForm(prev => ({ ...prev, language: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-4">
                    <Button onClick={handleSaveGeneral} disabled={updateConfig.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateConfig.isPending ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pdf">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de PDF</CardTitle>
                  <CardDescription>
                    Opciones para la generación de documentos PDF
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Incluir imágenes</Label>
                      <p className="text-sm text-muted-foreground">
                        Mostrar miniaturas de productos en el PDF
                      </p>
                    </div>
                    <Switch
                      checked={pdfForm.include_images}
                      onCheckedChange={(checked) => setPdfForm(prev => ({ ...prev, include_images: checked }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="page_size">Tamaño de página</Label>
                    <Select
                      value={pdfForm.page_size}
                      onValueChange={(value) => setPdfForm(prev => ({ ...prev, page_size: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="letter">Carta (8.5×11)</SelectItem>
                        <SelectItem value="a4">A4</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orientation">Orientación</Label>
                    <Select
                      value={pdfForm.orientation}
                      onValueChange={(value) => setPdfForm(prev => ({ ...prev, orientation: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Vertical</SelectItem>
                        <SelectItem value="landscape">Horizontal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-4">
                    <Button onClick={handleSavePdf} disabled={updateConfig.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateConfig.isPending ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="import">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Importación</CardTitle>
                  <CardDescription>
                    Opciones para la importación de archivos Excel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-detectar encabezados</Label>
                      <p className="text-sm text-muted-foreground">
                        Detectar automáticamente las columnas del Excel
                      </p>
                    </div>
                    <Switch
                      checked={importForm.auto_detect_headers}
                      onCheckedChange={(checked) => setImportForm(prev => ({ ...prev, auto_detect_headers: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Saltar filas vacías</Label>
                      <p className="text-sm text-muted-foreground">
                        Ignorar filas sin datos durante la importación
                      </p>
                    </div>
                    <Switch
                      checked={importForm.skip_empty_rows}
                      onCheckedChange={(checked) => setImportForm(prev => ({ ...prev, skip_empty_rows: checked }))}
                    />
                  </div>
                  <div className="pt-4">
                    <Button onClick={handleSaveImport} disabled={updateConfig.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateConfig.isPending ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
