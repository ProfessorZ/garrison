import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid credentials"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-[0.2em] uppercase gradient-text">
            Garrison
          </h1>
          <p className="text-sm text-[#64748b] mt-2 font-medium">
            Server Command Center
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl p-8" style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <h2 className="text-lg font-bold text-[#e2e8f0] mb-6">
            Sign in
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold text-[#94a3b8] mb-2 uppercase tracking-wider">
                Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="w-full px-0 py-2.5 text-sm text-[#e2e8f0] bg-transparent rounded-none"
                style={{
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  outline: "none",
                  boxShadow: "none",
                }}
                onFocus={(e) => {
                  e.target.style.borderBottomColor = "#00d4aa";
                  e.target.style.boxShadow = "0 1px 0 0 #00d4aa";
                }}
                onBlur={(e) => {
                  e.target.style.borderBottomColor = "rgba(255,255,255,0.1)";
                  e.target.style.boxShadow = "none";
                }}
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#94a3b8] mb-2 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-0 py-2.5 text-sm text-[#e2e8f0] bg-transparent rounded-none"
                style={{
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  outline: "none",
                  boxShadow: "none",
                }}
                onFocus={(e) => {
                  e.target.style.borderBottomColor = "#00d4aa";
                  e.target.style.boxShadow = "0 1px 0 0 #00d4aa";
                }}
                onBlur={(e) => {
                  e.target.style.borderBottomColor = "rgba(255,255,255,0.1)";
                  e.target.style.boxShadow = "none";
                }}
                placeholder="Enter password"
              />
            </div>

            {error && (
              <p className="text-sm text-[#ff4757] rounded-lg px-3 py-2.5 animate-fade-in"
                style={{ background: "rgba(255,71,87,0.08)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-[#0a0e1a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 hover:shadow-[0_0_24px_rgba(0,212,170,0.25)]"
              style={{ background: "#00d4aa" }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#64748b]">
            No account yet?{" "}
            <Link
              to="/register"
              className="text-[#00d4aa] hover:text-[#00b894] font-semibold"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
