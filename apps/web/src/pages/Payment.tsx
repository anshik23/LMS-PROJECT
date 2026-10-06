import { useState } from "react";

interface PaymentProps {
  courseId: string;
  userId: string;
  planType: "monthly" | "full_course";
  onBack: () => void;
  onSuccess: () => void;
}

function Payment({
  courseId,
  userId,
  planType,
  onBack,
  onSuccess,
}: PaymentProps) {
  const [paymentMethod, setPaymentMethod] =
    useState("");

  const price =
    planType === "monthly"
      ? "₹499"
      : "₹1,999";

  const planName =
    planType === "monthly"
      ? "Monthly Plan"
      : "Full Course Plan";

  const handlePayment = () => {
    if (!paymentMethod) {
      alert(
        "Please select a payment method"
      );
      return;
    }

    console.log("PAYMENT SUCCESS");
    console.log("User:", userId);
    console.log("Course:", courseId);
    console.log("Plan:", planType);

    onSuccess();
  };

  return (
    <div>
      <button onClick={onBack}>
        ← Back to Plans
      </button>

      <h1>Payment</h1>

      <h2>{planName}</h2>

      <h3>{price}</h3>

      <p>
        This is a simulated payment.
      </p>

      <h3>Select Payment Method</h3>

      <div>
        <label>
          <input
            type="radio"
            name="payment"
            value="upi"
            checked={
              paymentMethod === "upi"
            }
            onChange={(e) =>
              setPaymentMethod(
                e.target.value
              )
            }
          />
          UPI
        </label>
      </div>

      <div>
        <label>
          <input
            type="radio"
            name="payment"
            value="card"
            checked={
              paymentMethod === "card"
            }
            onChange={(e) =>
              setPaymentMethod(
                e.target.value
              )
            }
          />
          Credit / Debit Card
        </label>
      </div>

      <div>
        <label>
          <input
            type="radio"
            name="payment"
            value="netbanking"
            checked={
              paymentMethod ===
              "netbanking"
            }
            onChange={(e) =>
              setPaymentMethod(
                e.target.value
              )
            }
          />
          Net Banking
        </label>
      </div>

      <br />

      <button
        onClick={handlePayment}
      >
        Pay {price}
      </button>
    </div>
  );
}

export default Payment;