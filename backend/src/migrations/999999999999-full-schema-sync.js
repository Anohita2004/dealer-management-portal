'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = ["AccountStatements","AuditLogs","Campaigns","CreditDebitNotes","Documents","Inventories","Invoices","Notifications","PaymentRequests","PricingUpdates","Products","Regions","SalesGroupMembers","Users","areas","chat_messages","conversations","dealer_materials","dealers","documents","feature_toggles","invoices","material_groups","materials","messages","order_items","orders","participants","payment_requests","permissions","region_materials","regions","rolepermissions","roles","sales_groups","territories","truck_assignments","truck_location_history","trucks","user_dealers","warehouses","workflow_timelines"];
    
    // Disable FK checks to allow creating tables in any order
    await queryInterface.sequelize.query('SET session_replication_role = "replica";'); // Postgres specific

    console.log('Creating table: AccountStatements');
    await queryInterface.createTable('AccountStatements', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "statementDate": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "documentType": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "documentNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "description": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "debitAmount": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
        defaultValue: "0",
      },
      "creditAmount": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
        defaultValue: "0",
      },
      "balance": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
      },
      "productGroup": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "sapDocumentNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
    });

    console.log('Creating table: AuditLogs');
    await queryInterface.createTable('AuditLogs', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "userId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "action": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "entity": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "entityId": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "changes": {
        type: Sequelize.JSON,
        allowNull: true,
        primaryKey: false,
      },
      "ipAddress": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "userAgent": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "timestamp": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: Campaigns');
    await queryInterface.createTable('Campaigns', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "campaignName": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "campaignType": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "description": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "startDate": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "endDate": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "productGroup": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "discountPercentage": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "discountAmount": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "targetAudience": {
        type: Sequelize.JSON,
        allowNull: true,
        primaryKey: false,
      },
      "isActive": {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        primaryKey: false,
        defaultValue: true,
      },
      "terms": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "bannerImage": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "areaId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "approvalStage": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "approvalStatus": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
        defaultValue: "pending",
      },
      "approvedBy": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "approvedAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "rejectionReason": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "currentSlaExpiresAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: CreditDebitNotes');
    await queryInterface.createTable('CreditDebitNotes', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "noteNumber": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "noteType": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "noteDate": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "amount": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
      },
      "reasonCode": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "description": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "referenceInvoiceNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "pending",
      },
      "pdfPath": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "sapDocumentNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
    });

    console.log('Creating table: Documents');
    await queryInterface.createTable('Documents', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "documentType": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "documentName": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "filePath": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "fileSize": {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: false,
      },
      "mimeType": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "uploadedBy": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "description": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "pending",
      },
      "approvedBy": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "approvedAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "rejectionReason": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "sapDocumentId": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "dealerId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "areaId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: Inventories');
    await queryInterface.createTable('Inventories', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "plant": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "stock": {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: false,
        defaultValue: "0",
      },
      "uom": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "Units",
      },
      "lastUpdatedAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "sapMaterialNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "reorderLevel": {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: false,
        defaultValue: "0",
      },
      "minStock": {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: false,
        defaultValue: "0",
      },
      "price": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
        defaultValue: "0",
      },
      "description": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "materialNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "materialCode": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: Invoices');
    await queryInterface.createTable('Invoices', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "invoiceNumber": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "invoiceDate": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "dueDate": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "amount": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
      },
      "taxAmount": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
        defaultValue: "0",
      },
      "totalAmount": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
      },
      "paidAmount": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
        defaultValue: "0",
      },
      "balanceAmount": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "unpaid",
      },
      "productGroup": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "description": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "pdfPath": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "sapDocumentNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "paymentDate": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "dealerId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: Notifications');
    await queryInterface.createTable('Notifications', {
      "senderId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "recipientId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "recipientRole": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "title": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "message": {
        type: Sequelize.TEXT,
        allowNull: false,
        primaryKey: false,
      },
      "type": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "isRead": {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "relatedId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: PaymentRequests');
    await queryInterface.createTable('PaymentRequests', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "invoiceId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "dealerId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "amount": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
      },
      "paymentMode": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "utrNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "proofFile": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "dealer_pending",
      },
      "dealerApprovalStatus": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "pending",
      },
      "dealerApprovalRemarks": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "dealerApprovedAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "dealerApprovedBy": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "remarks": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "approvedAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "approvedBy": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "currentSlaExpiresAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "approvalStage": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "approvalStatus": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
        defaultValue: "pending",
      },
      "rejectionReason": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "gatewayOrderId": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "gatewayPaymentId": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "gatewaySignature": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "paymentGateway": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: PricingUpdates');
    await queryInterface.createTable('PricingUpdates', {
      "id": {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      "productId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "oldPrice": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "newPrice": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
      },
      "reason": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "requestedBy": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "requestedByUserId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "pending",
      },
      "remarks": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "approvedBy": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "approvedAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "dealerId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "currentSlaExpiresAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "approvalStage": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "approvalStatus": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
        defaultValue: "pending",
      },
      "rejectionReason": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: Products');
    await queryInterface.createTable('Products', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "plant": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "stock": {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: false,
        defaultValue: "0",
      },
      "uom": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "lastUpdatedAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
    });

    console.log('Creating table: Regions');
    await queryInterface.createTable('Regions', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "geojson": {
        type: Sequelize.JSON,
        allowNull: true,
        primaryKey: false,
      },
      "centroidLat": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "centroidLng": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: SalesGroupMembers');
    await queryInterface.createTable('SalesGroupMembers', {
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "salesGroupId": {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      "dealerId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
    });

    console.log('Creating table: Users');
    await queryInterface.createTable('Users', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "username": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "email": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "password": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "role": {
        type: Sequelize.TEXT,
        allowNull: false,
        primaryKey: false,
        defaultValue: "dealer",
      },
      "isActive": {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        primaryKey: false,
        defaultValue: true,
      },
      "isBlocked": {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        primaryKey: false,
      },
      "lastLogin": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "otp": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "otpExpiry": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "phoneNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "dealerId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "roleId": {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: false,
      },
      "regionId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "managerId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "areaId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "territoryId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "salesGroupId": {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: false,
      },
      "createdBy": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: areas');
    await queryInterface.createTable('areas', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "regionId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "geojson": {
        type: Sequelize.JSON,
        allowNull: true,
        primaryKey: false,
      },
      "centroidLat": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "centroidLng": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
    });

    console.log('Creating table: chat_messages');
    await queryInterface.createTable('chat_messages', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "conversationId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "senderId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "content": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "messageType": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "text",
      },
      "attachments": {
        type: Sequelize.JSON,
        allowNull: true,
        primaryKey: false,
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "sent",
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
    });

    console.log('Creating table: conversations');
    await queryInterface.createTable('conversations', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "type": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "one_to_one",
      },
      "title": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "meta": {
        type: Sequelize.JSON,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
    });

    console.log('Creating table: dealer_materials');
    await queryInterface.createTable('dealer_materials', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "dealerId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "materialId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "isActive": {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        primaryKey: false,
        defaultValue: true,
      },
      "price": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "stockQty": {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        defaultValue: Sequelize.literal('now()'),
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        defaultValue: Sequelize.literal('now()'),
      },
    });

    console.log('Creating table: dealers');
    await queryInterface.createTable('dealers', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "dealerCode": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "businessName": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "contactPerson": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "email": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "phoneNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "address": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "city": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "state": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "pincode": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "gstNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "panNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "bankName": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "bankAccountNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "bankIFSC": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "paymentTerms": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "creditLimit": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
        defaultValue: "0",
      },
      "outstandingAmount": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
        defaultValue: "0",
      },
      "territory": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "sapCustomerNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "sapVendorNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "isActive": {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        primaryKey: false,
        defaultValue: true,
      },
      "isBlocked": {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        primaryKey: false,
      },
      "blockReason": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "isVerified": {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        primaryKey: false,
      },
      "licenseNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "licenseDocument": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "verifiedBy": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "verifiedAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "licenses": {
        type: Sequelize.JSON,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "managerId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "regionId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "lat": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "lng": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "territoryId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "areaId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
        defaultValue: "pending_approval",
      },
      "approvalStage": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "approvalStatus": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
        defaultValue: "pending",
      },
      "approvedBy": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "approvedAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "rejectionReason": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "currentSlaExpiresAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: documents');
    await queryInterface.createTable('documents', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "dealerId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "documentType": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "documentName": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "filePath": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "fileSize": {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: false,
      },
      "mimeType": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "uploadedBy": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "description": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "pending",
      },
      "sapDocumentId": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "approvalStage": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "approvalStatus": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
        defaultValue: "pending",
      },
      "approvedBy": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "approvedAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "rejectionReason": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "currentSlaExpiresAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: feature_toggles');
    await queryInterface.createTable('feature_toggles', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "key": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "description": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "isEnabled": {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        primaryKey: false,
        defaultValue: true,
      },
      "config": {
        type: Sequelize.JSON,
        allowNull: true,
        primaryKey: false,
        defaultValue: "{}",
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
    });

    console.log('Creating table: invoices');
    await queryInterface.createTable('invoices', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "dealerId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "invoiceNumber": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "invoiceDate": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "dueDate": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "taxAmount": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
        defaultValue: "0",
      },
      "totalAmount": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
        defaultValue: "0",
      },
      "paidAmount": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
        defaultValue: "0",
      },
      "balanceAmount": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
        defaultValue: "0",
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "unpaid",
      },
      "productGroup": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "description": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "pdfPath": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "sapDocumentNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "paymentDate": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "baseAmount": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
        defaultValue: "0",
      },
      "orderId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "approvalStage": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "approvalStatus": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
        defaultValue: "pending",
      },
      "approvedBy": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "approvedAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "rejectionReason": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "currentSlaExpiresAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: material_groups');
    await queryInterface.createTable('material_groups', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "code": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "description": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
    });

    console.log('Creating table: materials');
    await queryInterface.createTable('materials', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "materialNumber": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "description": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "uom": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "plant": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "stock": {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: false,
        defaultValue: "0",
      },
      "materialGroupId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "reorderLevel": {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: false,
        defaultValue: "0",
      },
      "expiryDate": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: messages');
    await queryInterface.createTable('messages', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "senderId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "recipientId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "subject": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "body": {
        type: Sequelize.TEXT,
        allowNull: false,
        primaryKey: false,
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "unread",
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "messageType": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "chat",
      },
    });

    console.log('Creating table: order_items');
    await queryInterface.createTable('order_items', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "orderId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "materialId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "qty": {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: false,
        defaultValue: "1",
      },
      "unitPrice": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
        defaultValue: "0",
      },
      "lineTotal": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
        defaultValue: "0",
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
    });

    console.log('Creating table: orders');
    await queryInterface.createTable('orders', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "dealerId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "orderNumber": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "Pending",
      },
      "totalAmount": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
        defaultValue: "0",
      },
      "notes": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "approvalStage": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "approvalStatus": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
        defaultValue: "draft",
      },
      "approvedBy": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "approvedAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "rejectionReason": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "currentSlaExpiresAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "truckAssignmentId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: participants');
    await queryInterface.createTable('participants', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "conversationId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "userId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "role": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "lastReadAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
    });

    console.log('Creating table: payment_requests');
    await queryInterface.createTable('payment_requests', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "amount": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "pending",
      },
      "dealerId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
        defaultValue: Sequelize.literal('now()'),
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
        defaultValue: Sequelize.literal('now()'),
      },
      "approvalStage": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "approvalStatus": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
        defaultValue: "pending",
      },
      "rejectionReason": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: permissions');
    await queryInterface.createTable('permissions', {
      "id": {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      "key": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "description": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
    });

    console.log('Creating table: region_materials');
    await queryInterface.createTable('region_materials', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "regionId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "materialId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "isActive": {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        primaryKey: false,
        defaultValue: true,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        defaultValue: Sequelize.literal('now()'),
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        defaultValue: Sequelize.literal('now()'),
      },
    });

    console.log('Creating table: regions');
    await queryInterface.createTable('regions', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "geojson": {
        type: Sequelize.JSON,
        allowNull: true,
        primaryKey: false,
      },
      "centroidLat": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "centroidLng": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: rolepermissions');
    await queryInterface.createTable('rolepermissions', {
      "roleId": {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: false,
      },
      "permissionId": {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "id": {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: false,
        autoIncrement: true,
      },
    });

    console.log('Creating table: roles');
    await queryInterface.createTable('roles', {
      "id": {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "category": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "description": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
    });

    console.log('Creating table: sales_groups');
    await queryInterface.createTable('sales_groups', {
      "id": {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "region": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "description": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "metadata": {
        type: Sequelize.JSON,
        allowNull: true,
        primaryKey: false,
        defaultValue: "{}",
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
    });

    console.log('Creating table: territories');
    await queryInterface.createTable('territories', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "regionId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
      },
      "geojson": {
        type: Sequelize.JSON,
        allowNull: true,
        primaryKey: false,
      },
      "centroidLat": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "centroidLng": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "areaId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: truck_assignments');
    await queryInterface.createTable('truck_assignments', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "orderId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "truckId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "warehouseId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "driverName": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "driverPhone": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "assignedBy": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "assignedAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "assigned",
      },
      "pickupAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "deliveredAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "estimatedDeliveryAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "notes": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "startLocationLat": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "startLocationLng": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "startTrackingAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "warehouseArrivedAt": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "currentEta": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
    });

    console.log('Creating table: truck_location_history');
    await queryInterface.createTable('truck_location_history', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "truckId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "truckAssignmentId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "lat": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
      },
      "lng": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
      },
      "speed": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "heading": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "timestamp": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    console.log('Creating table: trucks');
    await queryInterface.createTable('trucks', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "truckName": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "licenseNumber": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "truckType": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "medium",
      },
      "capacity": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        defaultValue: "available",
      },
      "currentLat": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "currentLng": {
        type: Sequelize.DECIMAL,
        allowNull: true,
        primaryKey: false,
      },
      "lastLocationUpdate": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "isActive": {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        primaryKey: false,
        defaultValue: true,
      },
      "regionId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    console.log('Creating table: user_dealers');
    await queryInterface.createTable('user_dealers', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "userId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "dealerId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "isPrimary": {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        primaryKey: false,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        defaultValue: Sequelize.literal('now()'),
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        defaultValue: Sequelize.literal('now()'),
      },
    });

    console.log('Creating table: warehouses');
    await queryInterface.createTable('warehouses', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "warehouseCode": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "address": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "city": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "state": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "pincode": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "lat": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
      },
      "lng": {
        type: Sequelize.DECIMAL,
        allowNull: false,
        primaryKey: false,
      },
      "regionId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "areaId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "contactPerson": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "phoneNumber": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "email": {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
      },
      "isActive": {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        primaryKey: false,
        defaultValue: true,
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    console.log('Creating table: workflow_timelines');
    await queryInterface.createTable('workflow_timelines', {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      "entityType": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "entityId": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: false,
      },
      "stage": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "action": {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
      },
      "actorId": {
        type: Sequelize.UUID,
        allowNull: true,
        primaryKey: false,
      },
      "remarks": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "rejectionReason": {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
      },
      "slaStart": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "slaEnd": {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
      },
      "metadata": {
        type: Sequelize.JSON,
        allowNull: true,
        primaryKey: false,
        defaultValue: "{}",
      },
      "createdAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updatedAt": {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });


    // Re-enable FK checks
    await queryInterface.sequelize.query('SET session_replication_role = "origin";');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }
};