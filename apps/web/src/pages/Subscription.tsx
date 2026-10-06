import { useState } from "react";

interface SubscriptionProps {
  courseId: string;
  userId: string;
  onBack: () => void;
  onContinue: (
    planType: "monthly" | "yearly"
  ) => void;
}

function Subscription({
  courseId,
  userId,
  onBack,
  onContinue,
}: SubscriptionProps) {
  const [selectedPlan, setSelectedPlan] =
    useState<"monthly" | "yearly" | null>(null);

  return (
    <div
      style={{
        padding: "30px",
        maxWidth: "900px",
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
        ← Back to Course
      </button>

      <h1 style={{ marginTop: "30px" }}>
        Choose Your Plan
      </h1>

      <p>
        Select a plan to get full access to all
        course videos.
      </p>

      {/* PLAN CARDS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
          marginTop: "30px",
        }}
      >
        {/* MONTHLY */}

        <div
          style={{
            border:
              selectedPlan === "monthly"
                ? "2px solid #e91e63"
                : "1px solid #e5e5e5",
            borderRadius: "16px",
            padding: "25px",
            background: "#fff",
          }}
        >
          <h2>Monthly Plan</h2>

          <h3>₹499 / month</h3>

          <p>
            Full access to all course videos
            for one month.
          </p>

          <p>✓ All course videos</p>
          <p>✓ Full course access</p>
          <p>✓ Learn at your own pace</p>

          <button
            type="button"
            onClick={() =>
              setSelectedPlan("monthly")
            }
            style={{
              width: "100%",
              padding: "12px",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            {selectedPlan === "monthly"
              ? "✓ Selected"
              : "Choose Monthly"}
          </button>
        </div>

        {/* YEARLY */}

        <div
          style={{
            border:
              selectedPlan === "yearly"
                ? "2px solid #e91e63"
                : "1px solid #e5e5e5",
            borderRadius: "16px",
            padding: "25px",
            background: "#fff",
          }}
        >
          <h2>Yearly Plan</h2>

          <h3>₹4,999 / year</h3>

          <p>
            Full access to all course videos
            for one year.
          </p>

          <p>✓ All course videos</p>
          <p>✓ Full course access</p>
          <p>✓ Learn at your own pace</p>

          <button
            type="button"
            onClick={() =>
              setSelectedPlan("yearly")
            }
            style={{
              width: "100%",
              padding: "12px",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            {selectedPlan === "yearly"
              ? "✓ Selected"
              : "Choose Yearly"}
          </button>
        </div>
      </div>

      {/* CONTINUE */}

      {selectedPlan && (
        <div
          style={{
            marginTop: "30px",
            padding: "20px",
            borderRadius: "12px",
            background: "#fafafa",
            textAlign: "center",
          }}
        >
          <p>
            Selected:{" "}
            <strong>
              {selectedPlan === "monthly"
                ? "Monthly Plan"
                : "Yearly Plan"}
            </strong>
          </p>

          <button
            type="button"
            onClick={() =>
              onContinue(selectedPlan)
            }
            style={{
              padding: "12px 30px",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

export default Subscription;