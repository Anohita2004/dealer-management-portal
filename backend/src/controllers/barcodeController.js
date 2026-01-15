const { ScannedLog, Material, User } = require('../models');

/**
 * Capture a barcode scan and store it initially.
 * POST /api/barcodes/scan
 */
const scanBarcode = async (req, res) => {
    try {
        const { barcode } = req.body;
        const userId = req.user.id;

        if (!barcode) {
            return res.status(400).json({ success: false, message: 'Barcode is required' });
        }

        // Optional: Check if the material actually exists (helps with immediate feedback)
        const material = await Material.findOne({ where: { barcode } });

        const scan = await ScannedLog.create({
            barcode,
            userId,
            scannedAt: new Date()
        });

        return res.status(201).json({
            success: true,
            message: 'Barcode captured successfully',
            data: {
                scan,
                materialName: material ? material.name : 'Unknown Product'
            }
        });
    } catch (error) {
        console.error('Error in scanBarcode:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get scanning history for the current user.
 * GET /api/barcodes/history
 */
const getScanHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const scans = await ScannedLog.findAll({
            where: { userId },
            order: [['scannedAt', 'DESC']],
            limit: 50
        });

        return res.status(200).json({ success: true, data: scans });
    } catch (error) {
        console.error('Error in getScanHistory:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    scanBarcode,
    getScanHistory
};
