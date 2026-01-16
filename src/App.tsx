import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ClienteDashboard from "./pages/ClienteDashboard";
import Catalogos from "./pages/Catalogos";
import CatalogoDetalle from "./pages/CatalogoDetalle";
import ImportarExcel from "./pages/ImportarExcel";
import Clientes from "./pages/Clientes";
import Configuracion from "./pages/Configuracion";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Login />} />
              
              {/* Gestor Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={['gestor']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/catalogos" element={
                <ProtectedRoute allowedRoles={['gestor']}>
                  <Catalogos />
                </ProtectedRoute>
              } />
              <Route path="/catalogos/:id" element={
                <ProtectedRoute allowedRoles={['gestor']}>
                  <CatalogoDetalle />
                </ProtectedRoute>
              } />
              <Route path="/catalogos/:id/editar" element={
                <ProtectedRoute allowedRoles={['gestor']}>
                  <CatalogoDetalle />
                </ProtectedRoute>
              } />
              <Route path="/catalogos/importar" element={
                <ProtectedRoute allowedRoles={['gestor']}>
                  <ImportarExcel />
                </ProtectedRoute>
              } />
              <Route path="/catalogos/nuevo" element={
                <ProtectedRoute allowedRoles={['gestor']}>
                  <Catalogos />
                </ProtectedRoute>
              } />
              <Route path="/clientes" element={
                <ProtectedRoute allowedRoles={['gestor']}>
                  <Clientes />
                </ProtectedRoute>
              } />
              <Route path="/configuracion" element={
                <ProtectedRoute allowedRoles={['gestor', 'cliente']}>
                  <Configuracion />
                </ProtectedRoute>
              } />
              
              {/* Cliente Routes */}
              <Route path="/cliente" element={
                <ProtectedRoute allowedRoles={['cliente']}>
                  <ClienteDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
