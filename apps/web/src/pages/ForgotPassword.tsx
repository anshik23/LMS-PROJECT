import { useState } from "react";
import "../styles/login.css";
import "../styles/auth.css";

interface ForgotPasswordProps {
  onBack: () => void;
  onReset: (token: string) => void;
}

function ForgotPassword({ onBack, onReset }: ForgotPasswordProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.resetToken) {
          onReset(data.resetToken);
        } else {
          setMessage(data.message);
          setSuccess(true);
        }
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <aside className="login-aside">
        <h2>Locked out? It happens.</h2>
        <p>
          Enter the email you registered with and we'll take you through
          choosing a new password.
        </p>
      </aside>

      <main className="login-main">
        <div className="login-box">
          <button type="button" className="login-back" onClick={onBack}>
            ← Back to sign in
          </button>

          <h1 className="login-title">Forgot password</h1>
          <p className="login-subtitle">
            Enter your registered email to continue.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="forgot-email">Registered email</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                autoComplete="email"
                required
              />
            </div>

            {message && (
              <p
                className={success ? "login-success" : "login-error"}
                role={success ? "status" : "alert"}
              >
                {message}
              </p>
            )}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Checking…" : "Continue"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default ForgotPassword;