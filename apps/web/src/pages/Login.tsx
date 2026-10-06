import { useState } from "react";
import "../styles/login.css";

interface LoginProps {
  onLoginSuccess: (data: any) => void;
  onForgotPassword: () => void;
  onBack: () => void;
}

function generateCaptcha() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function Login({ onLoginSuccess, onForgotPassword, onBack }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");

    // CAPTCHA check
    if (captchaInput !== captcha) {
      setMessage("The CAPTCHA doesn't match. Try again.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Sends activityId + user information to App.tsx
        onLoginSuccess(data);
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

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
  };

  return (
    <div className="login-page">
      <aside className="login-aside">
        <h2>Pick up your courses right where you left off.</h2>
        <p>
          Sign in to continue your videos from the exact minute you stopped and
          see everything you've completed.
        </p>
      </aside>

      <main className="login-main">
        <div className="login-box">
          <button type="button" className="login-back" onClick={onBack}>
            ← Back
          </button>

          <h1 className="login-title">Sign in</h1>
          <p className="login-subtitle">Enter your details to continue.</p>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-password">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-toggle"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-captcha">Type the characters shown</label>
              <div className="login-captcha">
                <span className="login-captcha-code" aria-label="CAPTCHA code">
                  {captcha}
                </span>
                <button
                  type="button"
                  className="login-refresh"
                  onClick={refreshCaptcha}
                  title="Get a new code"
                  aria-label="Get a new CAPTCHA code"
                >
                  ↻
                </button>
              </div>
              <input
                id="login-captcha"
                type="text"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                placeholder="Enter the code"
                autoComplete="off"
                required
              />
            </div>

            {message && (
              <p className="login-error" role="alert">
                {message}
              </p>
            )}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <button
            type="button"
            className="login-forgot"
            onClick={onForgotPassword}
          >
            Forgot your password?
          </button>
        </div>
      </main>
    </div>
  );
}

export default Login;