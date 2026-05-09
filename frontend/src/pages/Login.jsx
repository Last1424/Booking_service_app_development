import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { navigate } from "../lib/router";
import Navbar from "../components/Navbar";
import Alert from "../components/Alert";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await api("/auth/login", { method: "POST", body: { email, password } });
      login(data.token, data.user);
      navigate(data.user.role === "admin" ? "/admin" : "/booking");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Navbar active="login" />
      <div className="auth-wrap">
        <div className="card auth-card">
          <h2>Sign in</h2>
          <p className="muted">Welcome back. Book your court in seconds.</p>
          <Alert message={error} />
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email" id="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password" id="password" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Sign in</button>
          </form>
          <p className="center muted" style={{ marginTop: 14, fontSize: 13 }}>
            Don't have an account? <a href="#/signup">Sign up</a>
          </p>
        </div>
      </div>
    </>
  );
}
