import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CorpusProvider } from "@/contexts/CorpusContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BatchSeedingNotificationListener } from "@/components/BatchSeedingNotificationListener";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import SetPassword from "./pages/SetPassword";
import AppLayout from "./pages/AppLayout";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMetrics from "./pages/AdminMetrics";
import AdminPrototypeGallery from "./pages/AdminPrototypeGallery";
import { ProtectedRoute } from "./components/ProtectedRoute";
import DashboardMVP from "./pages/DashboardMVP";
import DashboardMVPDefinitivo from "./pages/DashboardMVPDefinitivo";
import DashboardAnalise from "./pages/DashboardAnalise";
import Onboarding from "./pages/Onboarding";
import AdvancedMode from "./pages/AdvancedMode";
import DevOpsMetrics from "./pages/DevOpsMetrics";
import DeveloperLogs from "./pages/DeveloperLogs";
import AdminLexiconSetupRefactored from "./pages/AdminLexiconSetupRefactored";
import AdminNavarroDictValidation from "./pages/AdminNavarroDictValidation";
import AdminGauchoValidation from "./pages/AdminGauchoValidation";
import AdminDictionaryValidation from "./pages/AdminDictionaryValidation";
import AdminDictionaryImport from "./pages/AdminDictionaryImport";
import AdminUsers from "./pages/AdminUsers";
import AdminQuizCuration from "./pages/AdminQuizCuration";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminAccessRequests from "./pages/AdminAccessRequests";
import AdminEdgeFunctions from "./pages/AdminEdgeFunctions";
import DeveloperHistory from "./pages/DeveloperHistory";
import AdminMetricsRealtime from "./pages/AdminMetricsRealtime";
import MusicEnrichment from "./pages/MusicEnrichment";
import MusicCatalog from "./pages/MusicCatalog";
import AdminSemanticTagsetValidation from "./pages/AdminSemanticTagsetValidation";
import AdminSemanticPipeline from "./pages/AdminSemanticPipeline";
import ApiUsage from "./pages/ApiUsage";
import DashboardExpandido from "./pages/DashboardExpandido";
import AnalysisToolsPage from "./pages/AnalysisToolsPage";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import { lazy, Suspense } from "react";

// Lazy load archived prototypes
const ArchivedDashboard = lazy(() => import("./pages/_archived/Dashboard"));
const ArchivedDashboard2 = lazy(() => import("./pages/_archived/Dashboard2"));
const ArchivedDashboard3 = lazy(() => import("./pages/_archived/Dashboard3"));
const ArchivedDashboard4 = lazy(() => import("./pages/_archived/Dashboard4"));
const ArchivedDashboard5 = lazy(() => import("./pages/_archived/Dashboard5"));
const ArchivedDashboard7 = lazy(() => import("./pages/_archived/Dashboard7"));
const ArchivedDashboard8 = lazy(() => import("./pages/_archived/Dashboard8"));

const queryClient = new QueryClient();

const RouterContent = () => {
  return (
    <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/set-password" element={<SetPassword />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<AppLayout />}>
            {/* Archived dashboards - removed from public access */}
            <Route 
              path="/advanced-mode" 
              element={
                <ProtectedRoute>
                  <AdvancedMode />
                </ProtectedRoute>
              } 
            />
          </Route>

        {/* Rota independente para DashboardMVPDefinitivo (sem AppLayout para evitar duplo header) */}
        <Route path="/dashboard-mvp-definitivo" element={<DashboardMVPDefinitivo />} />
        <Route path="/dashboard-expandido" element={<DashboardExpandido />} />
        <Route 
          path="/analysis-tools" 
          element={
            <ProtectedRoute>
              <AnalysisToolsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard-analise" 
          element={
            <ProtectedRoute>
              <DashboardAnalise />
            </ProtectedRoute>
          } 
        />
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* Admin Routes with AdminLayout for consistent navigation */}
        <Route element={<AdminLayout />}>
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
          {/* FASE 2: Redirect antigo para nova interface refatorada */}
          <Route 
            path="/admin/lexicon-setup" 
            element={<Navigate to="/admin/lexicon-setup-refactored" replace />}
          />
          <Route 
            path="/admin/lexicon-setup-refactored" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLexiconSetupRefactored />
              </ProtectedRoute>
            } 
          /> 
          <Route 
            path="/admin/navarro-validation" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminNavarroDictValidation />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/gaucho-validation" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminGauchoValidation />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/dictionary-validation/:tipo" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDictionaryValidation />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/dictionary-import" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDictionaryImport />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/semantic-tagset-validation" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminSemanticTagsetValidation />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/semantic-pipeline" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminSemanticPipeline />
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
            path="/admin/quiz" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminQuizCuration />
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
          <Route 
            path="/admin/edge-functions" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminEdgeFunctions />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/prototypes"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPrototypeGallery />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/developer-history" 
            element={
              <ProtectedRoute requiredRole="admin">
                <DeveloperHistory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/devops-metrics" 
            element={
              <ProtectedRoute requiredRole="admin">
                <DevOpsMetrics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/developer-logs" 
            element={
              <ProtectedRoute requiredRole="admin">
                <DeveloperLogs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/metrics-realtime" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminMetricsRealtime />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/music-enrichment" 
            element={
              <ProtectedRoute requiredRole="admin">
                <MusicEnrichment />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/music-catalog" 
            element={
              <ProtectedRoute requiredRole="admin">
                <MusicCatalog />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/api-usage" 
            element={
              <ProtectedRoute requiredRole="admin">
                <ApiUsage />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected routes for archived prototypes - admin only */}
          <Route 
            path="/prototypes/dashboard" 
            element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                        <p className="text-muted-foreground">Carregando protótipo...</p>
                      </div>
                    </div>
                  }>
                    <ArchivedDashboard />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/prototypes/dashboard2" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                        <p className="text-muted-foreground">Carregando protótipo...</p>
                      </div>
                    </div>
                  }>
                    <ArchivedDashboard2 />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/prototypes/dashboard3" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                        <p className="text-muted-foreground">Carregando protótipo...</p>
                      </div>
                    </div>
                  }>
                    <ArchivedDashboard3 />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/prototypes/dashboard4" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                        <p className="text-muted-foreground">Carregando protótipo...</p>
                      </div>
                    </div>
                  }>
                    <ArchivedDashboard4 />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/prototypes/dashboard5" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                        <p className="text-muted-foreground">Carregando protótipo...</p>
                      </div>
                    </div>
                  }>
                    <ArchivedDashboard5 />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/prototypes/dashboard7" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                        <p className="text-muted-foreground">Carregando protótipo...</p>
                      </div>
                    </div>
                  }>
                    <ArchivedDashboard7 />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/prototypes/dashboard8" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                        <p className="text-muted-foreground">Carregando protótipo...</p>
                      </div>
                    </div>
                  }>
                    <ArchivedDashboard8 />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/prototypes/dashboard-mvp" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <DashboardMVP />
                </ProtectedRoute>
              } 
            />
        </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const AppContent = () => {
  return (
    <>
      <Toaster />
      <Sonner />
      <BatchSeedingNotificationListener />
      <BrowserRouter>
        <RouterContent />
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <CorpusProvider>
            <TooltipProvider>
              <AppContent />
            </TooltipProvider>
          </CorpusProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
