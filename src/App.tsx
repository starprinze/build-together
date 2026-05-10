import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import Layout from "@/components/Layout";
import AdminGuard from "@/components/AdminGuard";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Lazy-load secondary public pages
const EventBracket = lazy(() => import("./pages/EventBracket"));
const Matches = lazy(() => import("./pages/Matches"));
const Predictions = lazy(() => import("./pages/Predictions"));
const Fixtures = lazy(() => import("./pages/Fixtures"));
const Gallery = lazy(() => import("./pages/Gallery"));
const TeamProfile = lazy(() => import("./pages/TeamProfile"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Profile = lazy(() => import("./pages/Profile"));
const About = lazy(() => import("./pages/About"));

// Lazy-load admin entirely
const AdminEvents = lazy(() => import("./pages/admin/AdminEvents"));
const AdminLayout = lazy(() =>
  import("./pages/admin/AdminEvents").then((m) => ({ default: m.AdminLayout })),
);
const AdminTeams = lazy(() => import("./pages/admin/AdminTeams"));
const AdminFixtures = lazy(() => import("./pages/admin/AdminFixtures"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="container py-20 text-center text-muted-foreground text-sm">Loading…</div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageFallback />}>
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
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
