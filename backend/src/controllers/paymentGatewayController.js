const { PaymentRequest, Invoice, AuditLog, sequelize } = require("../models");
const razorpayService = require("../services/razorpayService");
const { WorkflowService } = require("../services/workflow");
const eventBus = require("../services/eventBus");

/**
 * Initialize a Payment Gateway Order (Razorpay)
 */
const createGatewayOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { invoiceId, amount } = req.body;
        const user = req.user;

        if (!invoiceId || !amount) {
            return res.status(400).json({ error: "Missing invoiceId or amount" });
        }

        // 1. Validate Invoice
        const invoice = await Invoice.findByPk(invoiceId, { transaction: t });
        if (!invoice) {
            await t.rollback();
            return res.status(404).json({ error: "Invoice not found" });
        }

        // 2. Security Check: Does the invoice belong to the dealer?
        if (user.dealerId && invoice.dealerId !== user.dealerId) {
            await t.rollback();
            return res.status(403).json({ error: "Unauthorized access to this invoice" });
        }

        // 3. Create a local PaymentRequest
        const paymentRequest = await PaymentRequest.create({
            invoiceId,
            dealerId: invoice.dealerId,
            amount,
            paymentMode: 'GATEWAY',
            paymentGateway: 'razorpay',
            status: 'pending_gateway',
            approvalStatus: 'pending',
            approvalStage: 'gateway', // Special stage for gateway payments
        }, { transaction: t });

        // 4. Create Razorpay Order
        const razorpayOrder = await razorpayService.createOrder(amount, paymentRequest.id);

        // 5. Update PaymentRequest with Gateway Order ID
        paymentRequest.gatewayOrderId = razorpayOrder.id;
        await paymentRequest.save({ transaction: t });

        await AuditLog.create({
            userId: user.id,
            action: "INIT_GATEWAY_PAYMENT",
            entity: "PaymentRequest",
            entityId: paymentRequest.id,
            changes: { gatewayOrderId: razorpayOrder.id, amount },
            ipAddress: req.ip,
        }, { transaction: t });

        await t.commit();

        res.json({
            success: true,
            keyId: razorpayService.keyId,
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            paymentRequestId: paymentRequest.id,
            invoiceNumber: invoice.invoiceNumber
        });

    } catch (error) {
        if (t) await t.rollback();
        console.error("Create Gateway Order Error:", error);
        res.status(500).json({ error: "Failed to initialize payment gateway order", details: error.message });
    }
};

/**
 * Razorpay Webhook Handler
 */
const handleWebhook = async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    if (!razorpayService.verifyWebhookSignature(body, signature)) {
        console.warn("Invalid Razorpay Webhook Signature");
        return res.status(400).send('Invalid signature');
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`Razorpay Webhook Event: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
        const t = await sequelize.transaction();
        try {
            const razorpayOrder = payload.order.entity;
            const razorpayPayment = payload.payment.entity;

            // Find local payment request
            const paymentRequest = await PaymentRequest.findOne({
                where: { gatewayOrderId: razorpayOrder.id },
                include: ['invoice'],
                transaction: t
            });

            if (!paymentRequest) {
                console.warn(`PaymentRequest not found for Gateway Order: ${razorpayOrder.id}`);
                await t.rollback();
                return res.status(200).send('Order not found locally'); // Still return 200 to Razorpay
            }

            if (paymentRequest.status === 'approved') {
                await t.rollback();
                return res.status(200).send('Already processed');
            }

            // Update Payment Request
            paymentRequest.gatewayPaymentId = razorpayPayment.id;
            paymentRequest.gatewaySignature = signature;
            paymentRequest.status = 'approved';
            paymentRequest.approvalStatus = 'approved';
            paymentRequest.approvalStage = null;
            paymentRequest.approvedAt = new Date();
            paymentRequest.approvedBy = 'RAZORPAY_WEBHOOK';
            await paymentRequest.save({ transaction: t });

            // Update Invoice
            if (paymentRequest.invoice) {
                const invoice = paymentRequest.invoice;
                const newPaidAmount = Number(invoice.paidAmount || 0) + Number(paymentRequest.amount);
                const newBalance = Number(invoice.totalAmount) - newPaidAmount;

                await invoice.update({
                    paidAmount: newPaidAmount,
                    balanceAmount: Math.max(0, newBalance),
                    status: newBalance <= 0 ? 'paid' : 'partial'
                }, { transaction: t });
            }

            await AuditLog.create({
                userId: null, // System action
                action: "GATEWAY_PAYMENT_SUCCESS",
                entity: "PaymentRequest",
                entityId: paymentRequest.id,
                changes: { gatewayPaymentId: razorpayPayment.id, event },
                ipAddress: req.ip,
            }, { transaction: t });

            // Emit event for real-time updates
            await eventBus.emit('payment:success', {
                paymentRequestId: paymentRequest.id,
                dealerId: paymentRequest.dealerId,
                amount: paymentRequest.amount
            });

            await t.commit();
            console.log(`Payment successful for order: ${razorpayOrder.id}`);

        } catch (error) {
            if (t) await t.rollback();
            console.error("Webhook processing error:", error);
            return res.status(500).send('Webhook process failed');
        }
    }

    res.status(200).send('OK');
};

module.exports = {
    createGatewayOrder,
    handleWebhook
};
