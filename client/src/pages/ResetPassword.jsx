import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { verifyResetToken, submitNewPassword } from "../api.js";
import {
  LockIcon,
  CheckIcon,
  AlertIcon,
  EyeIcon,
  EyeOffIcon,
} from "../components/Icons.jsx";

/**
 * Reset password page, opened from the link in the email.
 *
 * On load it verifies the token against the backend so it can immediately show
 * an "expired/invalid link" alert (as required) instead of a dead form. If the
 * token is valid, it renders the new-password form with a strength meter.
 */
export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  // checking | valid | invalid | done
  const [status, setStatus] = useState("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Verify the link as soon as the page loads.
  useEffect(() => {
    let active = true;
    verifyResetToken(token)
      .then(() => active && setStatus("valid"))
      .catch(() => active && setStatus("invalid"));
    return () => {
      active = false;
    };
  }, [token]);

  // Simple 0-4 strength score used for the meter + label.
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

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await submitNewPassword(token, password);
      setStatus("done");
      // Send the user back to the start after a short pause.
      setTimeout(() => navigate("/"), 3500);
    } catch (err) {
      // Covers expired-mid-session or already-used links.
      setError(err.message);
      if (/expired|invalid/i.test(err.message)) {
        setStatus("invalid");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // --- Loading state while verifying the token ---
  if (status === "checking") {
    return (
      <>
        <div className="auth-card text-center">
          <div
            className="spinner-border text-primary"
            style={{ width: "2.6rem", height: "2.6rem" }}
            role="status"
          />
          <p className="auth-subtitle mt-4 mb-0">
            Verifying your reset link...
          </p>
        </div>
        <p className="brand-footer">Secured password recovery</p>
      </>
    );
  }

  // --- Invalid / expired link alert ---
  if (status === "invalid") {
    return (
      <>
        <div className="auth-card text-center">
          <div
            className="success-circle"
            style={{
              background: "linear-gradient(135deg, #fee2e2, #fecaca)",
              color: "#dc2626",
            }}
          >
            <AlertIcon />
          </div>
          <h3 className="auth-title">Link expired or invalid</h3>
          <p className="auth-subtitle mb-4">
            This password reset link is no longer valid. Reset links expire for
            your security. Please request a new one.
          </p>
          <Link to="/" className="btn-brand d-block text-decoration-none">
            Request a new link
          </Link>
        </div>
        <p className="brand-footer">Secured password recovery</p>
      </>
    );
  }

  // --- Success state ---
  if (status === "done") {
    return (
      <>
        <div className="auth-card text-center">
          <div className="success-circle">
            <CheckIcon />
          </div>
          <h3 className="auth-title">Password reset!</h3>
          <p className="auth-subtitle mb-4">
            Your password has been changed successfully. Redirecting you now...
          </p>
          <Link to="/" className="link-muted">
            Go back now
          </Link>
        </div>
        <p className="brand-footer">Secured password recovery</p>
      </>
    );
  }

  // --- Valid token: show the reset form ---
  return (
    <>
      <div className="auth-card">
        <div className="icon-badge">
          <LockIcon />
        </div>
        <h3 className="auth-title">Set a new password</h3>
        <p className="auth-subtitle">
          Choose a strong password you haven&apos;t used before.
        </p>

        {error && (
          <div className="alert alert-danger" role="alert">
            <AlertIcon />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              New password
            </label>
            <div className="d-flex">
              <input
                id="password"
                type={showPwd ? "text" : "password"}
                className="form-control"
                style={{ borderRadius: "14px 0 0 14px" }}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
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

          <div className="mb-3">
            <label htmlFor="confirm" className="form-label">
              Confirm password
            </label>
            <input
              id="confirm"
              type={showPwd ? "text" : "password"}
              className="form-control"
              placeholder="Re-enter new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            {confirm && confirm !== password && (
              <small className="text-danger">Passwords do not match.</small>
            )}
          </div>

          <button type="submit" className="btn-brand" disabled={submitting}>
            {submitting ? (
              <>
                <span
                  className="spinner-border btn-spinner me-2"
                  role="status"
                  aria-hidden="true"
                />
                Resetting...
              </>
            ) : (
              "Reset password"
            )}
          </button>
        </form>
      </div>
      <p className="brand-footer">Secured password recovery</p>
    </>
  );
}
