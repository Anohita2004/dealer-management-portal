const { DeliveryOrder, StorageLocation, LoadingPoint, DockSchedule } = require('../models');
const sapService = require('../services/sapService');

exports.createDeliveryOrder = async (req, res) => {
    try {
        const { vbeln, storage_location_id, loading_point_id, delivery_date, items } = req.body;

        const deliveryOrder = await DeliveryOrder.create({
            vbeln,
            storage_location_id,
            loading_point_id,
            delivery_date,
            status: 'DRAFT',
            items
        });

        res.status(201).json(deliveryOrder);
    } catch (error) {
        console.error('Error creating delivery order:', error);
        res.status(500).json({ error: 'Failed to create delivery order' });
    }
};

exports.getDeliveryOrders = async (req, res) => {
    try {
        const orders = await DeliveryOrder.findAll({
            include: ['storageLocation', 'loadingPoint']
        });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching delivery orders:', error);
        res.status(500).json({ error: 'Failed to fetch delivery orders' });
    }
};

exports.getDeliveryOrderById = async (req, res) => {
    try {
        const order = await DeliveryOrder.findByPk(req.params.id, {
            include: ['storageLocation', 'loadingPoint']
        });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (error) {
        console.error('Error fetching delivery order:', error);
        res.status(500).json({ error: 'Failed to fetch delivery order' });
    }
};

exports.allocateStorage = async (req, res) => {
    try {
        const { id } = req.params;
        const { storage_location_id } = req.body;

        const order = await DeliveryOrder.findByPk(id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        order.storage_location_id = storage_location_id;
        order.status = 'ALLOCATED';
        await order.save();

        res.json(order);
    } catch (error) {
        console.error('Error allocating storage:', error);
        res.status(500).json({ error: 'Failed to allocate storage' });
    }
};

exports.scheduleDock = async (req, res) => {
    try {
        const { id } = req.params;
        const { loading_point_id, scheduled_start, scheduled_end } = req.body;

        const order = await DeliveryOrder.findByPk(id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Create schedule
        const schedule = await DockSchedule.create({
            loading_point_id,
            delivery_order_id: id,
            scheduled_start,
            scheduled_end,
            status: 'SCHEDULED'
        });

        order.loading_point_id = loading_point_id;
        order.status = 'SCHEDULED';
        await order.save();

        res.json({ order, schedule });
    } catch (error) {
        console.error('Error scheduling dock:', error);
        res.status(500).json({ error: 'Failed to schedule dock' });
    }
};

exports.syncWithSAP = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await DeliveryOrder.findByPk(id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Call SAP Service
        const sapResponse = await sapService.callRFC('ZRFC_CREATE_DELIVERY', {
            VBELN: order.vbeln,
            // Map other fields as needed
        });

        if (sapResponse.STATUS === 'S') {
            order.likp = sapResponse.DELIVERY_NUM;
            order.status = 'PGI_PENDING';
            await order.save();
            res.json({ success: true, sapResponse, order });
        } else {
            res.status(400).json({ success: false, sapResponse });
        }
    } catch (error) {
        console.error('Error syncing with SAP:', error);
        res.status(500).json({ error: 'Failed to sync with SAP' });
    }
};
