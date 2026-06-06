import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../api.js";
import { MailIcon, CheckIcon, AlertIcon } from "../components/Icons.jsx";

/**
 * Forgot password page.
 * User enters their email; on submit we call the backend which (if the user
 * exists) emails a reset link. Shows a success state or an inline error.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  // Basic email format check before hitting the server.
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Success view shown after the email is sent.
  if (sent) {
    return (
      <>
        <div className="auth-card text-center">
          <div className="success-circle">
            <CheckIcon />
          </div>
          <h3 className="auth-title">Check your inbox</h3>
          <p className="auth-subtitle mb-4">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a
            password reset link. The link expires shortly, so use it soon.
          </p>
          <button
            className="btn-brand"
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
          >
            Send to a different email
          </button>
        </div>
        <p className="brand-footer">Secured password recovery</p>
      </>
    );
  }

  return (
    <>
      <div className="auth-card">
        <div className="icon-badge">
          <MailIcon />
        </div>
        <h3 className="auth-title">Forgot password?</h3>
        <p className="auth-subtitle">
          Enter the email linked to your account and we&apos;ll send you a reset
          link.
        </p>

        {error && (
          <div className="alert alert-danger" role="alert">
            <AlertIcon />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
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
              autoFocus
            />
          </div>

          <button type="submit" className="btn-brand" disabled={loading}>
            {loading ? (
              <>
                <span
                  className="spinner-border btn-spinner me-2"
                  role="status"
                  aria-hidden="true"
                />
                Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </button>
        </form>

        <p className="text-center mt-4 mb-0" style={{ fontSize: "0.9rem" }}>
          Don&apos;t have an account?{" "}
          <Link to="/register" className="link-muted">
            Register
          </Link>
        </p>
      </div>
      <p className="brand-footer">Secured password recovery</p>
    </>
  );
}
