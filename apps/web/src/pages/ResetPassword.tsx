import { useState } from "react";
import "../styles/login.css";
import "../styles/auth.css";

interface ResetPasswordProps {
  resetToken: string;
  onSuccess: () => void;
}

function ResetPassword({ resetToken, onSuccess }: ResetPasswordProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Password reset successfully!");
        setSuccess(true);

        setTimeout(() => {
          onSuccess();
        }, 1000);
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
        <h2>Choose a new password.</h2>
        <p>
          Pick something you haven't used before. You'll sign in with it right
          after.
        </p>
      </aside>

      <main className="login-main">
        <div className="login-box">
          <h1 className="login-title">Reset password</h1>
          <p className="login-subtitle">Enter and confirm your new password.</p>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="reset-new">New password</label>
              <input
                id="reset-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="reset-confirm">Confirm new password</label>
              <input
                id="reset-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
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

            <button
              type="submit"
              className="login-submit"
              disabled={loading || success}
            >
              {loading ? "Resetting…" : "Reset password"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default ResetPassword;