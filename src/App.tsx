import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AppLayout from "./pages/AppLayout";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMetrics from "./pages/AdminMetrics";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard2 from "./pages/Dashboard2";
import Dashboard3 from "./pages/Dashboard3";
import Dashboard4 from "./pages/Dashboard4";
import Dashboard5 from "./pages/Dashboard5";
import Dashboard7 from "./pages/Dashboard7";
import Dashboard8 from "./pages/Dashboard8";
import DashboardMVP from "./pages/DashboardMVP";
import Onboarding from "./pages/Onboarding";
import AdvancedMode from "./pages/AdvancedMode";
import DevOpsMetrics from "./pages/DevOpsMetrics";
import DeveloperLogs from "./pages/DeveloperLogs";
import AdminLexiconSetup from "./pages/AdminLexiconSetup";
import AdminUsers from "./pages/AdminUsers";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminAccessRequests from "./pages/AdminAccessRequests";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard2" element={<Dashboard2 />} />
          <Route path="/dashboard3" element={<Dashboard3 />} />
          <Route path="/dashboard4" element={<Dashboard4 />} />
          <Route path="/dashboard5" element={<Dashboard5 />} />
          <Route path="/dashboard7" element={<Dashboard7 />} />
          <Route path="/dashboard8" element={<Dashboard8 />} />
          <Route 
            path="/advanced-mode" 
            element={
              <ProtectedRoute>
                <AdvancedMode />
              </ProtectedRoute>
            } 
          />
        </Route>

        {/* Rota independente para DashboardMVP (sem AppLayout para evitar duplo header) */}
        <Route path="/dashboard-mvp" element={<DashboardMVP />} />
        <Route path="/onboarding" element={<Onboarding />} />
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/metrics" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminMetrics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/lexicon-setup" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLexiconSetup />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminUsers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/analytics" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminAnalytics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/access-requests" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminAccessRequests />
                </ProtectedRoute>
              } 
            />
            <Route path="/devops-metrics" element={<DevOpsMetrics />} />
            <Route path="/developer-logs" element={<DeveloperLogs />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
