import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import Layout from "@/components/Layout";
import AdminGuard from "@/components/AdminGuard";
import SuperAdminGuard from "@/components/SuperAdminGuard";
import { lazyWithRetry } from "@/lib/moduleLoadRecovery";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Lazy-load secondary public pages
const EventBracket = lazyWithRetry(() => import("./pages/EventBracket"));
const Matches = lazyWithRetry(() => import("./pages/Matches"));
const Predictions = lazyWithRetry(() => import("./pages/Predictions"));
const Fixtures = lazyWithRetry(() => import("./pages/Fixtures"));
const Gallery = lazyWithRetry(() => import("./pages/Gallery"));
const TeamProfile = lazyWithRetry(() => import("./pages/TeamProfile"));
const Leaderboard = lazyWithRetry(() => import("./pages/Leaderboard"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const About = lazyWithRetry(() => import("./pages/About"));
const Events = lazyWithRetry(() => import("./pages/Events"));
const OrgDashboard = lazyWithRetry(() => import("./pages/org/OrgDashboard"));

// Lazy-load admin entirely
const AdminEvents = lazyWithRetry(() => import("./pages/admin/AdminEvents"));
const AdminLayout = lazyWithRetry(() =>
  import("./pages/admin/AdminEvents").then((m) => ({ default: m.AdminLayout })),
);
const AdminTeams = lazyWithRetry(() => import("./pages/admin/AdminTeams"));
const AdminFixtures = lazyWithRetry(() => import("./pages/admin/AdminFixtures"));
const AdminSettings = lazyWithRetry(() => import("./pages/admin/AdminSettings"));
const AdminUsers = lazyWithRetry(() => import("./pages/admin/AdminUsers"));
const AdminOrganizations = lazyWithRetry(() => import("./pages/admin/AdminOrganizations"));
const AdminNotifications = lazyWithRetry(() => import("./pages/admin/AdminNotifications"));

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
                  <Route path="/events/:id/leaderboard" element={<EventBracket defaultTab="leaderboard" />} />
                  <Route path="/events/:id/predictions" element={<EventBracket defaultTab="predictions" />} />
                  <Route path="/teams/:id" element={<TeamProfile />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/org" element={<OrgDashboard />} />
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
                  <Route path="organizations" element={<SuperAdminGuard><AdminOrganizations /></SuperAdminGuard>} />
                  <Route path="users" element={<SuperAdminGuard><AdminUsers /></SuperAdminGuard>} />
                  <Route path="notifications" element={<AdminNotifications />} />
                  <Route path="settings" element={<SuperAdminGuard><AdminSettings /></SuperAdminGuard>} />
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
