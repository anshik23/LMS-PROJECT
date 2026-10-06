import "../styles/welcome.css";
interface WelcomeProps {
  onLogin: () => void;
  onRegister: () => void;
}

function Welcome({
  onLogin,
  onRegister,
}: WelcomeProps) {
  return (
    <div className="welcome-page">

      {/* Left Side */}
      <div className="welcome-left">
        <h1>WELCOME TO THE WEBSITE</h1>

        <p>
          Your learning journey starts here.
        </p>
      </div>

      {/* Right Side */}
      <div className="welcome-card">
        <h2>Welcome</h2>

        <p>
          Login or create an account to continue.
        </p>

        <div className="welcome-buttons">
          <button onClick={onLogin}>
            Login
          </button>

          <button
            className="secondary-button"
            onClick={onRegister}
          >
            Register
          </button>
        </div>
      </div>

    </div>
  );
}

export default Welcome;

