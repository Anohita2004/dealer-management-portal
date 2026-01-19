const { PhysicalInventory, InventoryCount } = require('../models');
const sapService = require('../services/sapService');

exports.initiateCount = async (req, res) => {
    try {
        const { plant, storage_location, description, planned_date } = req.body;

        // 1. Create Header
        const header = await PhysicalInventory.create({
            plant,
            storage_location,
            description,
            planned_date,
            status: 'PLANNED'
        });

        // 2. Fetch Book Stock from SAP (Mock for now)
        const sapData = await sapService.callRFC('ZRFC_PHYSICAL_INVENTORY', {
            ACTION: 'INIT',
            PLANT: plant
        });

        if (sapData.STATUS === 'S') {
            const counts = sapData.ITEMS.map(item => ({
                physical_inventory_id: header.id,
                material_code: item.MATNR,
                material_desc: item.MAKTX,
                batch: item.BATCH,
                book_qty: item.BOOK_QTY,
                status: 'PENDING'
            }));

            await InventoryCount.bulkCreate(counts);
            header.sap_doc_no = sapData.SAP_DOC_NO;
            header.status = 'IN_PROGRESS';
            await header.save();

            res.status(201).json({ header, counts });
        } else {
            res.status(400).json({ error: 'SAP Initialization Failed' });
        }

    } catch (error) {
        console.error('Error initiating count:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getCounts = async (req, res) => {
    try {
        const counts = await PhysicalInventory.findAll({
            include: ['counts'],
            order: [['createdAt', 'DESC']]
        });
        res.json(counts);
    } catch (error) {
        console.error('Error fetching counts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.submitCount = async (req, res) => {
    try {
        const { id } = req.params; // Inventory Count ID (Line Item) or Header ID? Assuming Header for bulk update
        const { counts } = req.body; // Array of { id, physical_qty }

        for (const item of counts) {
            const countRecord = await InventoryCount.findByPk(item.id);
            if (countRecord) {
                countRecord.physical_qty = item.physical_qty;
                countRecord.variance = parseFloat(item.physical_qty) - parseFloat(countRecord.book_qty);
                countRecord.status = 'COUNTED';
                await countRecord.save();
            }
        }
        res.json({ success: true });

    } catch (error) {
        console.error('Error submitting count:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.postAdjustment = async (req, res) => {
    try {
        const { id } = req.params; // Header ID
        const header = await PhysicalInventory.findByPk(id, { include: ['counts'] });

        if (!header) return res.status(404).json({ error: 'Not Found' });

        // Prepare data for SAP
        const adjustments = header.counts.map(c => ({
            MATNR: c.material_code,
            QTY: c.physical_qty
        }));

        const sapResponse = await sapService.callRFC('ZRFC_PHYSICAL_INVENTORY', {
            ACTION: 'POST',
            SAP_DOC_NO: header.sap_doc_no,
            ITEMS: adjustments
        });

        if (sapResponse.STATUS === 'S') {
            header.status = 'POSTED';
            header.posted_date = new Date();
            await header.save();
            res.json({ success: true, sapResponse });
        } else {
            res.status(400).json({ error: 'SAP Posting Failed', details: sapResponse });
        }

    } catch (error) {
        console.error('Error posting adjustment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
