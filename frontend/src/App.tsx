import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ServerDetailPage from "./pages/ServerDetailPage";
import SchedulerPage from "./pages/SchedulerPage";
import ActivityPage from "./pages/ActivityPage";
import UsersPage from "./pages/UsersPage";
import PlayersPage from "./pages/PlayersPage";
import PlayerProfilePage from "./pages/PlayerProfilePage";
import DiscordPage from "./pages/DiscordPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="server/:id" element={<ServerDetailPage />} />
              <Route path="players" element={<PlayersPage />} />
              <Route path="players/:playerId" element={<PlayerProfilePage />} />
              <Route path="scheduler" element={<SchedulerPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="discord" element={<DiscordPage />} />
              <Route path="users" element={<UsersPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
