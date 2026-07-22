import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await register(username, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg flex items-center justify-center min-h-screen px-4">
      <div className="scanlines" aria-hidden />
      <div className="w-full max-w-[420px] animate-fade-in">
        <div
          className="overflow-hidden"
          style={{
            border: "1px solid var(--border-accent)",
            borderRadius: 10,
            background: "var(--bg-card)",
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "var(--bg-elevated)",
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: "#d96b5c" }} />
            <span className="w-2 h-2 rounded-full" style={{ background: "#e3b454" }} />
            <span className="w-2 h-2 rounded-full" style={{ background: "#9de26b" }} />
            <span className="font-mono text-[11px] ml-2" style={{ color: "var(--text-muted)" }}>
              garrison — register
            </span>
          </div>

          <div className="p-8">
            <p
              className="font-mono font-semibold text-xl tracking-[0.18em]"
              style={{ color: "var(--accent)", textShadow: "0 0 14px rgba(255,178,36,0.35)" }}
            >
              GARRISON<span style={{ color: "var(--text-dim)" }}>_OPS</span>
            </p>
            <p className="font-mono text-[11px] mt-1.5 mb-7" style={{ color: "var(--text-muted)" }}>
              create operator credentials
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
              <div>
                <label className="label-caps block mb-2">Operator</label>
                <div
                  className="flex items-center gap-2 px-3.5 py-2.5"
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 6,
                    background: "var(--bg-deepest)",
                  }}
                >
                  <span className="font-mono text-[13px]" style={{ color: "var(--accent)" }}>
                    $
                  </span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                    placeholder="username"
                    className="flex-1 min-w-0 bg-transparent border-none p-0 text-[13px]"
                    style={{ boxShadow: "none", border: "none" }}
                  />
                </div>
              </div>

              <div>
                <label className="label-caps block mb-2">Passphrase</label>
                <div
                  className="flex items-center gap-2 px-3.5 py-2.5"
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 6,
                    background: "var(--bg-deepest)",
                  }}
                >
                  <span className="font-mono text-[13px]" style={{ color: "var(--accent)" }}>
                    *
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="min 6 chars"
                    className="flex-1 min-w-0 bg-transparent border-none p-0 text-[13px]"
                    style={{ boxShadow: "none", border: "none" }}
                  />
                </div>
              </div>

              <div>
                <label className="label-caps block mb-2">Confirm</label>
                <div
                  className="flex items-center gap-2 px-3.5 py-2.5"
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 6,
                    background: "var(--bg-deepest)",
                  }}
                >
                  <span className="font-mono text-[13px]" style={{ color: "var(--accent)" }}>
                    *
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="repeat passphrase"
                    className="flex-1 min-w-0 bg-transparent border-none p-0 text-[13px]"
                    style={{ boxShadow: "none", border: "none" }}
                  />
                </div>
              </div>

              {error && (
                <p
                  className="font-mono text-xs px-3 py-2.5 rounded"
                  style={{ color: "var(--danger)", background: "rgba(217,107,92,0.1)" }}
                >
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "CREATING…" : "CREATE OPERATOR →"}
              </button>

              <p className="font-mono text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
                already registered?{" "}
                <Link to="/login" style={{ color: "var(--accent)" }}>
                  authenticate
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
