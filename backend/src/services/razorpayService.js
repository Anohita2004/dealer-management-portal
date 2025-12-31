const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayService {
    constructor() {
        this.keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_id';
        this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret';
        this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_mock_secret';

        this.razorpay = new Razorpay({
            key_id: this.keyId,
            key_secret: this.keySecret,
        });
    }

    /**
     * Create an order in Razorpay
     * @param {number} amount - Amount in INR
     * @param {string} receiptId - Local PaymentRequest ID
     * @returns {Promise<Object>} Razorpay Order
     */
    async createOrder(amount, receiptId) {
        try {
            const options = {
                amount: Math.round(amount * 100), // Razorpay expects amount in paise
                currency: 'INR',
                receipt: receiptId,
                payment_capture: 1, // Auto capture
            };

            const order = await this.razorpay.orders.create(options);
            return order;
        } catch (error) {
            console.error('Razorpay Create Order Error:', error);

            let errorMessage = error.error?.description || error.description || error.message || 'Unknown Razorpay Error';

            if (this.keyId === 'rzp_test_mock_id') {
                errorMessage = "Razorpay keys are missing in .env file. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.";
            }

            throw new Error(`Failed to create Razorpay order: ${errorMessage}`);
        }
    }

    /**
     * Verify Webhook Signature
     * @param {string} body - Raw body string
     * @param {string} signature - x-razorpay-signature header
     * @returns {boolean}
     */
    verifyWebhookSignature(body, signature) {
        try {
            const expectedSignature = crypto
                .createHmac('sha256', this.webhookSecret)
                .update(body)
                .digest('hex');

            return expectedSignature === signature;
        } catch (error) {
            console.error('Razorpay Signature Verification Error:', error);
            return false;
        }
    }

    /**
     * Fetch payment details
     * @param {string} paymentId 
     */
    async getPaymentDetails(paymentId) {
        return this.razorpay.payments.fetch(paymentId);
    }
}

module.exports = new RazorpayService();
