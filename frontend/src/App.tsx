import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ServerPage from "./pages/ServerPage";
import SchedulerPage from "./pages/SchedulerPage";

export default function App() {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
      </div>
    );
  }

  if (!auth.user) {
    return <LoginPage onLogin={auth.login} onRegister={auth.register} />;
  }

  return (
    <Layout user={auth.user} onLogout={auth.logout}>
      <Routes>
        <Route path="/" element={<DashboardPage token={auth.token} />} />
        <Route path="/server/:id" element={<ServerPage token={auth.token} />} />
        <Route path="/scheduler" element={<SchedulerPage token={auth.token} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}
