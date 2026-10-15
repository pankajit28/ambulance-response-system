import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const HOME = { patient: "/patient", driver: "/driver", dispatcher: "/dispatch" };

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "patient",
    vehicleNumber: "",
    hospitalName: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={HOME[user.role] || "/"} replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = { ...form };
      if (payload.role !== "driver") {
        delete payload.vehicleNumber;
        delete payload.hospitalName;
      }
      const next = await register(payload);
      navigate(HOME[next.role] || "/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card auth-card">
      <h1>Create account</h1>
      <form onSubmit={onSubmit} className="stack">
        <label>
          Full name
          <input required value={form.name} onChange={set("name")} />
        </label>
        <label>
          Email
          <input type="email" required value={form.email} onChange={set("email")} />
        </label>
        <label>
          Password
          <input
            type="password"
            minLength={6}
            required
            value={form.password}
            onChange={set("password")}
          />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={set("phone")} />
        </label>
        <label>
          Role
          <select value={form.role} onChange={set("role")}>
            <option value="patient">Patient</option>
            <option value="driver">Ambulance driver</option>
            <option value="dispatcher">Dispatcher / hospital</option>
          </select>
        </label>
        {form.role === "driver" && (
          <>
            <label>
              Vehicle number
              <input required value={form.vehicleNumber} onChange={set("vehicleNumber")} />
            </label>
            <label>
              Hospital
              <input value={form.hospitalName} onChange={set("hospitalName")} />
            </label>
          </>
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy} type="submit">
          {busy ? "Creating…" : "Register"}
        </button>
      </form>
      <p className="muted">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </section>
  );
}
