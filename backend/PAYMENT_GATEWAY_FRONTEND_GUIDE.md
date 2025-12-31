# Frontend Implementation Guide: Razorpay Payment Gateway

This guide explains how to integrate the Razorpay checkout flow into the Dealer Management Portal frontend.

## 1. Load Razorpay Script
Add the Razorpay Checkout script to your `index.html` or load it dynamically in your React/Vue component.

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

---

## 2. Implementation Flow (React/Javascript)

### Step 1: Initiate Payment
When the user clicks "Pay Now" on an invoice, call the backend to create a Razorpay Order.

```javascript
const handlePayment = async (invoice) => {
  try {
    // 1. Call Backend to create Order
    const response = await axios.post('/api/payments/gateway/init', {
      invoiceId: invoice.id,
      amount: invoice.balanceAmount
    });

    const { orderId, amount, currency, keyId, paymentRequestId } = response.data;

    // 2. Configure Razorpay Options
    const options = {
      key: keyId, 
      amount: amount, // Amount in paise
      currency: currency,
      name: "Dealer Management Portal",
      description: `Payment for Invoice ${invoice.invoiceNumber}`,
      order_id: orderId,
      handler: function (response) {
        // This is called after successful payment completion
        alert(`Payment Successful! ID: ${response.razorpay_payment_id}`);
        // Refresh invoice data or redirect to success page
        window.location.reload();
      },
      prefill: {
        name: user.username,
        email: user.email,
        contact: user.phoneNumber || ""
      },
      theme: {
        color: "#3399cc"
      },
      modal: {
        ondismiss: function() {
          console.log("Checkout modal closed");
        }
      }
    };

    // 3. Open Razorpay Modal
    const rzp = new window.Razorpay(options);
    rzp.open();

  } catch (error) {
    console.error("Payment initiation failed", error);
    alert("Failed to start payment. Please try again.");
  }
};
```

---

## 3. How the Backend Processes it
1.  **Selection:** User clicks "Pay Now".
2.  **Order Creation:** Frontend calls `POST /api/payments/gateway/init`.
    *   Backend creates a `PaymentRequest` with status `pending_gateway`.
    *   Backend returns `order_id` (Razorpay) and `paymentRequestId` (Local).
3.  **Checkout:** User completes payment in the Razorpay UI.
4.  **Verification (Webhook):** 
    *   Razorpay sends a POST request to `/api/payments/webhook/razorpay`.
    *   Backend verifies the signature.
    *   Backend updates `PaymentRequest` to `approved`.
    *   Backend updates `Invoice` status to `paid` and sets `balanceAmount` to 0.
5.  **Real-time Update:** The backend emits a `payment:success` event via Socket.io. The frontend should listen for this to show a success toast.

---

## 4. Socket.io Listener (Optional but Recommended)
For a premium UX, listen for the success event to show a notification immediately when the webhook processes.

```javascript
socket.on('payment:success', (data) => {
  if (data.paymentRequestId) {
    toast.success(`Payment of ₹${data.amount} processed successfully!`);
    // Trigger data re-fetch
  }
});
```

---

## 5. Dashboard Integration
*   **Invoice Table:** Change the "Action" column for unpaid invoices to show a "Pay Online" button instead of just "Upload Proof".
*   **Payment History:** Add a filter for `Payment Mode = Gateway` to show all automated transactions.
*   **Status Indicators:** Use a "Processing" status if the user closes the modal but the webhook hasn't arrived yet.

---

## 6. Testing Keys
Use the Razorpay **Test Mode** keys initially.
*   **Card:** Use `4111 1111 1111 1111` with any expiry and CVV.
*   **UPI:** Use `success@razorpay`.
