import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api.js";
import {
  LockIcon,
  CheckIcon,
  AlertIcon,
  EyeIcon,
  EyeOffIcon,
} from "../components/Icons.jsx";

/**
 * Register page.
 *
 * Creates a new account so the user can then exercise the Forgot Password
 * flow. There is intentionally NO login page — per the task, only Register and
 * the password reset flow are implemented.
 */
export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // 0-4 strength score, mirrors the reset page meter.
  const getStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };
  const strength = getStrength(password);
  const strengthMeta = [
    { label: "", color: "#e5e7eb", width: "0%" },
    { label: "Weak", color: "#ef4444", width: "25%" },
    { label: "Fair", color: "#f59e0b", width: "50%" },
    { label: "Good", color: "#3b82f6", width: "75%" },
    { label: "Strong", color: "#10b981", width: "100%" },
  ][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      await registerUser(name.trim(), email.trim(), password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Success view: account created -> offer to go reset its password.
  if (done) {
    return (
      <>
        <div className="auth-card text-center">
          <div className="success-circle">
            <CheckIcon />
          </div>
          <h3 className="auth-title">Account created</h3>
          <p className="auth-subtitle mb-4">
            Your account for <strong>{email}</strong> is ready. You can now try
            the password reset flow.
          </p>
          <Link
            to="/forgot-password"
            className="btn-brand d-block text-decoration-none"
          >
            Go to Forgot Password
          </Link>
        </div>
        <p className="brand-footer">Secured password recovery</p>
      </>
    );
  }

  return (
    <>
      <div className="auth-card">
        <div className="icon-badge">
          <LockIcon />
        </div>
        <h3 className="auth-title">Create your account</h3>
        <p className="auth-subtitle">
          Register to get started, then you can test the password reset flow.
        </p>

        {error && (
          <div className="alert alert-danger" role="alert">
            <AlertIcon />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">
              Name
            </label>
            <input
              id="name"
              type="text"
              className="form-control"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              autoFocus
            />
          </div>

          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="d-flex">
              <input
                id="password"
                type={showPwd ? "text" : "password"}
                className="form-control"
                style={{ borderRadius: "14px 0 0 14px" }}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="toggle-eye"
                onClick={() => setShowPwd((s) => !s)}
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {password && (
              <>
                <div className="strength-track">
                  <div
                    className="strength-fill"
                    style={{
                      width: strengthMeta.width,
                      background: strengthMeta.color,
                    }}
                  />
                </div>
                <small
                  className="strength-label"
                  style={{ color: strengthMeta.color }}
                >
                  {strengthMeta.label}
                </small>
              </>
            )}
          </div>

          <button type="submit" className="btn-brand" disabled={loading}>
            {loading ? (
              <>
                <span
                  className="spinner-border btn-spinner me-2"
                  role="status"
                  aria-hidden="true"
                />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="text-center mt-4 mb-0" style={{ fontSize: "0.9rem" }}>
          <Link to="/forgot-password" className="link-muted">
            Forgot your password?
          </Link>
        </p>
      </div>
      <p className="brand-footer">Secured password recovery</p>
    </>
  );
}
