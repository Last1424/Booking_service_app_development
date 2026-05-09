import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { navigate } from "../lib/router";
import Navbar from "../components/Navbar";
import Alert from "../components/Alert";

export default function Signup() {
  const { login } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await api("/auth/signup", { method: "POST", body: form });
      login(data.token, data.user);
      navigate("/booking");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Navbar active="signup" />
      <div className="auth-wrap">
        <div className="card auth-card">
          <h2>Create account</h2>
          <Alert message={error} />
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full name</label>
              <input required value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" required autoComplete="email"
                value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Phone (optional)</label>
              <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Password (min 6 chars)</label>
              <input type="password" required minLength={6} autoComplete="new-password"
                value={form.password} onChange={(e) => update("password", e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Create account</button>
          </form>
          <p className="center muted" style={{ marginTop: 14, fontSize: 13 }}>
            Already have one? <a href="#/login">Sign in</a>
          </p>
        </div>
      </div>
    </>
  );
}
