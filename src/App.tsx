
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import VendorDashboardPage from "./pages/VendorDashboardPage";
import VendorOnboardingPage from "./pages/VendorOnboardingPage";
import AdminDashboard from "./pages/AdminDashboard";
import CreateJob from "./pages/CreateJob";
import CandidateSubmission from "./pages/CandidateSubmission";
import ScheduleInterview from "./pages/ScheduleInterview";
import InvoiceUpload from "./pages/InvoiceUpload";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/vendor-onboarding" element={<VendorOnboardingPage />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/vendor-dashboard" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['vendor_admin', 'vendor_recruiter']}>
                  <VendorDashboardPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['elika_admin', 'delivery_head', 'finance_team']}>
                  <AdminDashboard />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/create-job" element={
              <ProtectedRoute>
                <CreateJob />
              </ProtectedRoute>
            } />
            
            <Route path="/candidate-submission" element={
              <ProtectedRoute>
                <CandidateSubmission />
              </ProtectedRoute>
            } />
            
            <Route path="/schedule-interview" element={
              <ProtectedRoute>
                <ScheduleInterview />
              </ProtectedRoute>
            } />
            
            <Route path="/invoice-upload" element={
              <ProtectedRoute>
                <InvoiceUpload />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
