const { InsuranceClaim, DeliveryOrder } = require('../models');
const sapService = require('../services/sapService');

exports.createClaim = async (req, res) => {
    try {
        const { delivery_order_id, material_code, quantity, reason, description } = req.body;

        const claim = await InsuranceClaim.create({
            delivery_order_id,
            material_code,
            quantity,
            reason,
            description,
            status: 'DRAFT'
        });

        res.status(201).json(claim);
    } catch (error) {
        console.error('Error creating claim:', error);
        res.status(500).json({ error: 'Failed to create claim' });
    }
};

exports.getClaims = async (req, res) => {
    try {
        const claims = await InsuranceClaim.findAll({
            include: [{ model: DeliveryOrder, as: 'deliveryOrder' }],
            order: [['createdAt', 'DESC']]
        });
        res.json(claims);
    } catch (error) {
        console.error('Error fetching claims:', error);
        res.status(500).json({ error: 'Failed to fetch claims' });
    }
};

exports.submitToSAP = async (req, res) => {
    try {
        const { id } = req.params;
        const claim = await InsuranceClaim.findByPk(id);

        if (!claim) return res.status(404).json({ error: 'Claim not found' });

        const sapResponse = await sapService.callRFC('ZRFC_CREATE_CLAIM', {
            DELIVERY_DOC: claim.delivery_order_id, // Map properly if needed
            MATERIAL: claim.material_code,
            QTY: claim.quantity,
            REASON: claim.reason
        });

        if (sapResponse.STATUS === 'S') {
            claim.sap_claim_id = sapResponse.CLAIM_ID;
            claim.status = 'SUBMITTED';
            await claim.save();
            res.json({ success: true, sapResponse, claim });
        } else {
            res.status(400).json({ error: 'SAP Submission Failed', sapResponse });
        }

    } catch (error) {
        console.error('Error submitting claim to SAP:', error);
        res.status(500).json({ error: 'Failed to submit claim' });
    }
};
