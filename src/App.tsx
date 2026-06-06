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

// Role-specific layouts (independent navigation per experience)
const SuperAdminLayout = lazyWithRetry(() => import("./components/layouts/SuperAdminLayout"));
const OrganizerLayout = lazyWithRetry(() => import("./components/layouts/OrganizerLayout"));

// Super admin pages
const SuperAdminDashboard = lazyWithRetry(() => import("./pages/super-admin/SuperAdminDashboard"));
const SuperAdminAnalytics = lazyWithRetry(() => import("./pages/super-admin/SuperAdminAnalytics"));
const SuperAdminReports = lazyWithRetry(() => import("./pages/super-admin/SuperAdminReports"));
const RolesPermissions = lazyWithRetry(() => import("./pages/super-admin/RolesPermissions"));

// Organizer pages
const OrgDashboard = lazyWithRetry(() => import("./pages/org/OrgDashboard"));
const OrgSettings = lazyWithRetry(() => import("./pages/org/OrgSettings"));
const OrgGallery = lazyWithRetry(() => import("./pages/org/OrgGallery"));
const OrgPredictions = lazyWithRetry(() => import("./pages/org/OrgPredictions"));

// Shared management pages (org-scoped for organizers, global for super admins)
const AdminEvents = lazyWithRetry(() => import("./pages/admin/AdminEvents"));
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

                {/* ----- Viewer experience (public) ----- */}
                <Route element={<Layout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/matches" element={<Matches />} />
                  <Route path="/live" element={<Matches />} />
                  <Route path="/predictions" element={<Predictions />} />
                  <Route path="/fixtures" element={<Fixtures />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/events/:id" element={<EventBracket />} />
                  <Route path="/events/:id/leaderboard" element={<EventBracket defaultTab="leaderboard" />} />
                  <Route path="/events/:id/predictions" element={<EventBracket defaultTab="predictions" />} />
                  <Route path="/teams/:id" element={<TeamProfile />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<NotFound />} />
                </Route>

                {/* ----- Super Admin experience ----- */}
                <Route
                  path="/super-admin"
                  element={
                    <SuperAdminGuard>
                      <SuperAdminLayout />
                    </SuperAdminGuard>
                  }
                >
                  <Route index element={<SuperAdminDashboard />} />
                  <Route path="organizations" element={<AdminOrganizations />} />
                  <Route path="events" element={<AdminEvents />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="roles" element={<RolesPermissions />} />
                  <Route path="analytics" element={<SuperAdminAnalytics />} />
                  <Route path="reports" element={<SuperAdminReports />} />
                  <Route path="notifications" element={<AdminNotifications />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>

                {/* ----- Organizer experience ----- */}
                <Route
                  path="/organizer"
                  element={
                    <AdminGuard>
                      <OrganizerLayout />
                    </AdminGuard>
                  }
                >
                  <Route index element={<OrgDashboard />} />
                  <Route path="events" element={<AdminEvents />} />
                  <Route path="teams" element={<AdminTeams />} />
                  <Route path="matches" element={<AdminFixtures />} />
                  <Route path="predictions" element={<OrgPredictions />} />
                  <Route path="gallery" element={<OrgGallery />} />
                  <Route path="notifications" element={<AdminNotifications />} />
                  <Route path="settings" element={<OrgSettings />} />
                </Route>

                {/* ----- Backward-compatible redirects ----- */}
                <Route path="/admin" element={<Navigate to="/super-admin" replace />} />
                <Route path="/admin/dashboard" element={<Navigate to="/super-admin" replace />} />
                <Route path="/admin/events" element={<Navigate to="/super-admin/events" replace />} />
                <Route path="/admin/teams" element={<Navigate to="/organizer/teams" replace />} />
                <Route path="/admin/fixtures" element={<Navigate to="/organizer/matches" replace />} />
                <Route path="/admin/matches" element={<Navigate to="/organizer/matches" replace />} />
                <Route path="/admin/organizations" element={<Navigate to="/super-admin/organizations" replace />} />
                <Route path="/admin/users" element={<Navigate to="/super-admin/users" replace />} />
                <Route path="/admin/notifications" element={<Navigate to="/super-admin/notifications" replace />} />
                <Route path="/admin/settings" element={<Navigate to="/super-admin/settings" replace />} />
                <Route path="/org" element={<Navigate to="/organizer" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
