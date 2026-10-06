import { useState } from "react";

interface ConfirmSubscriptionProps {
  userId: string;
  courseId: string;
  planType: "monthly" | "yearly";
  onBack: () => void;
  onConfirm: () => void;
}

function ConfirmSubscription({
  userId,
  courseId,
  planType,
  onBack,
  onConfirm,
}: ConfirmSubscriptionProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const planName =
    planType === "monthly"
      ? "Monthly Plan"
      : "Yearly Plan";

  const price =
    planType === "monthly"
      ? "₹499 / month"
      : "₹4,999 / year";

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            courseId,
            planType,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to create subscription"
        );
        return;
      }

      alert(
        `${planName} activated successfully!`
      );

      onConfirm();
    } catch (error) {
      console.error(
        "Subscription error:",
        error
      );

      setError(
        "Unable to connect to the server"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "30px",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{
          padding: "10px 16px",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        ← Back to Plans
      </button>

      <div
        style={{
          marginTop: "30px",
          padding: "30px",
          border: "1px solid #e5e5e5",
          borderRadius: "16px",
          background: "#fff",
        }}
      >
        <h1>Confirm Subscription</h1>

        <p>You are subscribing to:</p>

        <h2>{planName}</h2>

        <h3>{price}</h3>

        <p>
          ✓ Full access to all course videos
        </p>

        <p>
          ✓ Access for the selected subscription
          period
        </p>

        <hr />

        <label>
          <strong>Enter your password</strong>
        </label>

        <input
          type="password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          placeholder="Enter your password"
          disabled={loading}
          style={{
            display: "block",
            width: "100%",
            boxSizing: "border-box",
            marginTop: "10px",
            padding: "12px",
            border: "1px solid #ccc",
            borderRadius: "8px",
          }}
        />

        {error && (
          <p
            style={{
              color: "red",
              marginTop: "10px",
            }}
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "20px",
            padding: "12px",
            border: "none",
            borderRadius: "10px",
            cursor: loading
              ? "not-allowed"
              : "pointer",
            fontWeight: "600",
          }}
        >
          {loading
            ? "Confirming..."
            : `Confirm ${planName}`}
        </button>
      </div>
    </div>
  );
}

export default ConfirmSubscription;