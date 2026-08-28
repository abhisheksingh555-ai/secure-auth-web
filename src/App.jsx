import { useEffect, useState } from "react";

const API_BASE = "/api/v1/auth";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Something went wrong");
  return body;
}

function App() {
  const [view, setView] = useState("login");
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem("accessToken")
  );
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      if (!accessToken) return;
      try {
        let response;
        try {
          response = await request("/profile", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        } catch {
          const refreshed = await request("/refresh", { method: "POST" });
          const newToken = refreshed.data.accessToken;
          localStorage.setItem("accessToken", newToken);
          setAccessToken(newToken);
          response = await request("/profile", {
            headers: { Authorization: `Bearer ${newToken}` },
          });
        }
        setUser(response.data);
      } catch {
        localStorage.removeItem("accessToken");
        setAccessToken(null);
      }
    };
    restoreSession();
  }, [accessToken]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setStatus({ type: "", message: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });
    try {
      const path = view === "login" ? "/login" : "/register";
      const payload = view === "login"
        ? { email: form.email, password: form.password }
        : form;
      const response = await request(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (view === "register") {
        setView("login");
        setForm({ username: "", email: form.email, password: "" });
        setStatus({ type: "success", message: "Account created. Sign in to continue." });
      } else {
        const token = response.data.accessToken;
        localStorage.setItem("accessToken", token);
        setAccessToken(token);
        setUser(response.data.user);
      }
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await request("/refresh/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("accessToken");
    setAccessToken(null);
    setUser(null);
    setForm({ username: "", email: "", password: "" });
  };

  if (user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <main className="auth-page">
      <section className="brand-panel">
        <h1>Private by design.</h1>
        <p className="brand-copy">A quiet place for your work, protected from the noise.</p>
        <div className="signal"><span /> End-to-end session security</div>
      </section>
      <section className="form-panel">
        <div className="form-wrap">
          <div className="form-heading">
            <p className="eyebrow">Welcome back</p>
            <h2>{view === "login" ? "Sign in to your space" : "Create your space"}</h2>
            <p>{view === "login" ? "Enter your details to continue." : "Start with a secure account in seconds."}</p>
          </div>
          <div className="mode-switch" role="tablist">
            <button className={view === "login" ? "active" : ""} onClick={() => { setView("login"); setStatus({ type: "", message: "" }); }}>Sign in</button>
            <button className={view === "register" ? "active" : ""} onClick={() => { setView("register"); setStatus({ type: "", message: "" }); }}>Register</button>
          </div>
          <form onSubmit={handleSubmit}>
            {view === "register" && <label>Username<input name="username" value={form.username} onChange={handleChange} placeholder="yourname" required autoComplete="username" /></label>}
            <label>Email address<input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required autoComplete="email" /></label>
            <label>Password<input name="password" type="password" value={form.password} onChange={handleChange} placeholder={view === "register" ? "At least 8 characters" : "Your password"} required autoComplete={view === "login" ? "current-password" : "new-password"} /></label>
            {status.message && <div className={`notice ${status.type}`}>{status.message}</div>}
            <button className="submit-button" disabled={loading}>{loading ? "Checking..." : view === "login" ? "Enter dashboard  →" : "Create account  →"}</button>
          </form>
          <p className="fine-print">Your session is protected with short-lived access tokens.</p>
        </div>
      </section>
    </main>
  );
}

function Dashboard({ user, onLogout }) {
  return <main className="dashboard-page">
    <nav className="topbar"><div className="brand-inline"><div className="brand-mark small">S</div><strong>secure<span>auth</span></strong></div><button className="logout-button" onClick={onLogout}>Sign out <span>↗</span></button></nav>
    <section className="dashboard-content">
      <p className="eyebrow">Personal dashboard / 01</p>
      <h1>Good to see you,<br /><em>{user.username}</em>.</h1>
      <div className="dashboard-grid">
        <article className="profile-card"><div className="avatar">{user.username?.slice(0, 1).toUpperCase()}</div><div><p className="card-label">Account identity</p><h2>{user.username}</h2><p>{user.email}</p></div><span className="verified">Verified</span></article>
        <article className="status-card"><p className="card-label">Session status</p><div className="status-line"><span /> Active and protected</div><p className="muted">Your access token is ready. Refresh is handled securely in the background.</p></article>
        <article className="date-card"><p className="card-label">Member since</p><h2>{new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</h2><p className="muted">Account created</p></article>
      </div>
    </section>
  </main>;
}

export default App
