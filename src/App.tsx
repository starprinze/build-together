import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import Layout from "@/components/Layout";
import AdminGuard from "@/components/AdminGuard";
import Index from "./pages/Index";
import Login from "./pages/Login";
import EventBracket from "./pages/EventBracket";
import Matches from "./pages/Matches";
import Predictions from "./pages/Predictions";
import Fixtures from "./pages/Fixtures";
import Gallery from "./pages/Gallery";
import TeamProfile from "./pages/TeamProfile";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import About from "./pages/About";
import AdminEvents, { AdminLayout } from "./pages/admin/AdminEvents";
import AdminTeams from "./pages/admin/AdminTeams";
import AdminFixtures from "./pages/admin/AdminFixtures";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminNotifications from "./pages/admin/AdminNotifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/admin/login" element={<Login />} />

              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<About />} />
                <Route path="/matches" element={<Matches />} />
                <Route path="/predictions" element={<Predictions />} />
                <Route path="/fixtures" element={<Fixtures />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/events/:id" element={<EventBracket />} />
                <Route path="/teams/:id" element={<TeamProfile />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              <Route
                path="/admin"
                element={
                  <AdminGuard>
                    <AdminLayout />
                  </AdminGuard>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminEvents />} />
                <Route path="events" element={<AdminEvents />} />
                <Route path="teams" element={<AdminTeams />} />
                <Route path="matches" element={<AdminFixtures />} />
                <Route path="fixtures" element={<AdminFixtures />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
