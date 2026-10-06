import { useState } from "react";
import "../styles/login.css";
import "../styles/auth.css";

interface RegisterProps {
  onBack: () => void;
  onLogin: () => void;
}

function Register({ onBack, onLogin }: RegisterProps) {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("");
  const [qualification, setQualification] = useState("");

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          firstName,
          lastName,
          email,
          password,
          confirmPassword,
          dob,
          address,
          phoneNumber,
          gender,
          qualification,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Registration successful! You can now sign in.");
        setSuccess(true);

        setUsername("");
        setFirstName("");
        setLastName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setDob("");
        setAddress("");
        setPhoneNumber("");
        setGender("");
        setQualification("");
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
    <div className="login-page register-page">
      <aside className="login-aside">
        <h2>Create an account and start learning.</h2>
        <p>
          Subscribe to a course, watch at your own pace, and your progress is
          saved automatically.
        </p>
      </aside>

      <main className="login-main">
        <div className="login-box register-box">
          <button type="button" className="login-back" onClick={onBack}>
            ← Back
          </button>

          <h1 className="login-title">Create your account</h1>
          <p className="login-subtitle">It only takes a minute.</p>

          <form onSubmit={handleRegister}>
            <div className="auth-grid">
              <div className="login-field">
                <label htmlFor="reg-first">First name</label>
                <input
                  id="reg-first"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="reg-last">Last name</label>
                <input
                  id="reg-last"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="reg-username">Username</label>
                <input
                  id="reg-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="reg-email">Email</label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="reg-password">Password</label>
                <input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="reg-confirm">Confirm password</label>
                <input
                  id="reg-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat the password"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="reg-dob">Date of birth</label>
                <input
                  id="reg-dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  autoComplete="bday"
                />
              </div>

              <div className="login-field">
                <label htmlFor="reg-phone">Phone number</label>
                <input
                  id="reg-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  autoComplete="tel"
                />
              </div>

              <div className="login-field">
                <label htmlFor="reg-gender">Gender</label>
                <select
                  id="reg-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div className="login-field">
                <label htmlFor="reg-qualification">Qualification</label>
                <select
                  id="reg-qualification"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                >
                  <option value="">Select qualification</option>
                  <option value="10th">10th</option>
                  <option value="12th">12th</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Bachelor's">Bachelor's</option>
                  <option value="Master's">Master's</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="login-field auth-full">
                <label htmlFor="reg-address">Address</label>
                <textarea
                  id="reg-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  autoComplete="street-address"
                />
              </div>
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
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <button type="button" className="login-forgot" onClick={onLogin}>
            Already have an account? Sign in
          </button>
        </div>
      </main>
    </div>
  );
}

export default Register;