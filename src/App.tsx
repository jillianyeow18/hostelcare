import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { SessionTimeoutProvider } from "@/components/session/SessionTimeoutProvider";
import { ProtectedRoute } from "@/components/session/ProtectedRoute";
import { SessionExpiryWarning } from "@/components/session/SessionExpiryWarning";
import { SessionTracker } from "@/components/session/SessionTracker";
import { sessionMiddleware } from "@/components/session/session-tracking-middleware";
import Index from "./pages/Index";
import Auth from "./pages/auth/Auth";
import StudentDashboard from "./pages/student/Dashboard";
import StaffDashboard from "./pages/staff/Dashboard";
import ChannelChat from "./components/staff/Channelchat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  // Handle session end on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionMiddleware.endSession();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <>
      <SessionTracker />
      <SessionExpiryWarning />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={["staff", "admin"]}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/channel/:channelId"
          element={
            <ProtectedRoute allowedRoles={["staff", "admin"]}>
              <ChannelChat />
            </ProtectedRoute>
          }
        />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionTimeoutProvider
          timeout={15 * 60 * 1000}
          warningTime={2 * 60 * 1000}
        >
          <AppContent />
        </SessionTimeoutProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
