/**
 * sapService.js
 * 
 * Handles communication with SAP systems via RFC.
 * Currently uses a MOCK implementation for the Birla Depot Portal integration 
 * since real SAP connectivity details/SDK are not available in this environment.
 */

// In a real implementation: const nodeRfc = require('node-rfc');

class SapService {
    constructor() {
        this.client = null;
        this.isMock = true; // Force mock mode for now
    }

    async connect() {
        if (this.isMock) {
            console.log('🔌 [SAP-MOCK] Connecting to SAP system...');
            return Promise.resolve(true);
        }
        // Real connection logic would go here
    }

    /**
     * Generic RFC Caller
     * @param {string} rfcName 
     * @param {object} params 
     */
    async callRFC(rfcName, params = {}) {
        console.log(`📡 [SAP-MOCK] Calling RFC: ${rfcName}`, JSON.stringify(params, null, 2));

        // Router for mock responses based on RFC Name
        switch (rfcName) {
            case 'ZFM_ORDER_TYPE':
                return this.mockOrderTypes();
            case 'ZFM_PLANT':
                return this.mockPlants(params);
            case 'ZFM_MATERIAL':
                return this.mockMaterials(params);
            case 'ZFM_SHIPPING_TYPE':
                return this.mockShippingTypes();
            case 'ZRFC_SALESORDER_DETAILS':
                return this.mockSalesOrderDetails(params);
            case 'ZFM_SLOC_DO_CREATE':
                return this.mockStorageLocations(params);
            case 'ZRFC_CREATE_INVOICE':
                return this.mockCreateInvoice(params);
            case 'ZFM_RECEIVING_PLANT_GR':
                return this.mockGoodsReceiptList(params);
            default:
                return {
                    status: 'success',
                    message: `Mock response for ${rfcName}`,
                    data: {}
                };
        }
    }

    // --- MOCK DATA GENERATORS ---

    mockOrderTypes() {
        return {
            ORDER_TYPES: [
                { DOCTYPE: 'ZOR', DESCRIPTION: 'Standard Order' },
                { DOCTYPE: 'ZRET', DESCRIPTION: 'Return Order' },
                { DOCTYPE: 'ZFOC', DESCRIPTION: 'Free of Charge' }
            ]
        };
    }

    mockPlants(params) {
        return {
            PLANTS: [
                { PLANT: 'P001', NAME1: 'Mumbai Plant' },
                { PLANT: 'P002', NAME1: 'Delhi Plant' }
            ]
        };
    }

    mockMaterials(params) {
        return {
            MATERIALS: [
                { MATNR: 'M-1001', MAKTX: 'Cement Bag 50KG', UNIT: 'BAG' },
                { MATNR: 'M-1002', MAKTX: 'White Cement 25KG', UNIT: 'BAG' },
                { MATNR: 'M-2001', MAKTX: 'Adhesive 5L', UNIT: 'CAN' }
            ]
        };
    }

    mockShippingTypes() {
        return {
            SHIPPING_TYPES: [
                { VSART: '01', BEZEI: 'Truck' },
                { VSART: '02', BEZEI: 'Rail' }
            ]
        };
    }

    mockSalesOrderDetails(params) {
        const { ORDER_ID } = params;
        return {
            HEADER: {
                VBELN: ORDER_ID || 'SO-99999',
                AUDAT: new Date().toISOString().split('T')[0],
                NETWR: '50000.00'
            },
            ITEMS: [
                { POSNR: '000010', MATNR: 'M-1001', KWMENG: '100', VRKME: 'BAG', NETWR: '25000.00' },
                { POSNR: '000020', MATNR: 'M-1002', KWMENG: '50', VRKME: 'BAG', NETWR: '25000.00' }
            ]
        };
    }

    mockStorageLocations(params) {
        return {
            LOCATIONS: [
                { LGORT: 'SL01', LGOBE: 'Raw Materials' },
                { LGORT: 'SL02', LGOBE: 'Finished Goods' }
            ]
        };
    }

    mockCreateInvoice(params) {
        const invNum = 'INV-' + Math.floor(Math.random() * 100000);
        return {
            INVOICE_NUM: invNum,
            STATUS: 'S',
            MESSAGE: 'Invoice created successfully'
        };
    }

    mockGoodsReceiptList(params) {
        // Mocking list of pending goods receipts
        return {
            GR_LIST: [
                {
                    DELIVERY_NO: 'DEL-887766',
                    VENDOR_NAME: 'UltraTech Supplies',
                    MATNR: 'M-1001',
                    QTY: 500,
                    DATE: '2023-10-25'
                },
                {
                    DELIVERY_NO: 'DEL-887767',
                    VENDOR_NAME: 'Asian Paints',
                    MATNR: 'M-2001',
                    QTY: 200,
                    DATE: '2023-10-26'
                }
            ]
        };
    }
}

module.exports = new SapService();
