# Dealer Management Portal

A comprehensive full-stack SAAS-based Dealer Management Portal with OpenUI5 frontend, Node.js backend, and SAP integration capabilities.

## Technology Stack

### Frontend
- **OpenUI5**: Enterprise-grade UI framework with responsive design
- **SAPUI5 Theme**: sap_horizon theme for modern look and feel
- **Express.js**: Static file serving

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web application framework
- **Sequelize ORM**: Database abstraction layer
- **SQLite**: In-memory database (for proof of concept)
- **JWT**: Authentication and authorization
- **bcryptjs**: Password hashing
- **Multer**: File upload handling
- **PDFKit**: PDF generation

### Security
- JWT-based authentication
- OTP-based two-factor authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Rate limiting
- Helmet.js for security headers
- CORS configuration
- Audit logging

## Features

### 1. Authentication & Authorization
- Login with username and password
- OTP-based two-factor authentication
- Password reset functionality
- Role-based access control (Dealer, TM, AM, SM, Admin, Key User)
- Session management with JWT tokens

### 2. Dashboard
- Role-based dashboard views
- Quick access tiles for key functionalities
- Summary statistics (invoices, documents, campaigns)
- Outstanding amount display for dealers
- Recent activity tracking

### 3. Invoice Management
- View all invoices with pagination
- Filter and search invoices
- Invoice details view
- PDF generation and download
- Payment status tracking (Paid, Unpaid, Partial, Overdue)
- Product group categorization

### 4. Document Management
- Two-way document management
- Upload documents (certificates, statements)
- Download documents
- Document type categorization
- File size and type validation
- Audit trail for document access

### 5. Campaign Management
- Create and manage promotional campaigns
- Sales schemes and seasonal offers
- Campaign scheduling (start/end dates)
- Product group targeting
- Discount management
- Campaign visibility control

### 6. Reporting System
- Dealer Performance Report
- Account Statement Report
- Invoice Register Report
- Credit/Debit Note Report
- Outstanding Receivables Report (with aging analysis)
- Territory/Region Report

### 7. Admin Panel
- Dealer management (create, edit, block/unblock)
- User management
- Password reset
- Dealer-state mapping
- Role assignments

### 8. SAP Integration
- Mock SAP integration endpoints
- Dealer synchronization (ZFIN_CUSTACC, ZFIN_VENDACC)
- Invoice synchronization
- Credit/Debit note creation (ZCDN_PRINT)
- Customer and vendor account fetching
- Ready for real SAP integration via REST APIs

### 9. Audit Logging
- Complete audit trail for all operations
- User action tracking
- IP address and user agent logging
- Timestamp tracking

## Project Structure

```
dealer-management-portal/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── dealerController.js
│   │   │   ├── invoiceController.js
│   │   │   ├── documentController.js
│   │   │   ├── campaignController.js
│   │   │   ├── reportController.js
│   │   │   └── sapController.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Dealer.js
│   │   │   ├── Invoice.js
│   │   │   ├── Document.js
│   │   │   ├── Campaign.js
│   │   │   ├── CreditDebitNote.js
│   │   │   ├── AuditLog.js
│   │   │   ├── AccountStatement.js
│   │   │   └── index.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── dealerRoutes.js
│   │   │   ├── invoiceRoutes.js
│   │   │   ├── documentRoutes.js
│   │   │   ├── campaignRoutes.js
│   │   │   ├── reportRoutes.js
│   │   │   └── sapRoutes.js
│   │   ├── utils/
│   │   │   ├── jwt.js
│   │   │   └── seed.js
│   │   └── server.js
│   ├── uploads/
│   ├── .env
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── webapp/
│   │   ├── controller/
│   │   │   ├── App.controller.js
│   │   │   ├── Login.controller.js
│   │   │   ├── Dashboard.controller.js
│   │   │   ├── Invoices.controller.js
│   │   │   ├── Documents.controller.js
│   │   │   ├── Campaigns.controller.js
│   │   │   ├── Reports.controller.js
│   │   │   └── Admin.controller.js
│   │   ├── view/
│   │   │   ├── App.view.xml
│   │   │   ├── Login.view.xml
│   │   │   ├── Dashboard.view.xml
│   │   │   ├── Invoices.view.xml
│   │   │   ├── Documents.view.xml
│   │   │   ├── Campaigns.view.xml
│   │   │   ├── Reports.view.xml
│   │   │   └── Admin.view.xml
│   │   ├── model/
│   │   │   └── formatter.js
│   │   ├── i18n/
│   │   │   └── i18n.properties
│   │   ├── Component.js
│   │   ├── manifest.json
│   │   └── index.html
│   ├── server.js
│   └── package.json
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd dealer-management-portal/backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env file with your configuration
```

4. Seed the database with sample data:
```bash
node src/utils/seed.js
```

5. Start the backend server:
```bash
npm run dev
```

The backend server will start on http://localhost:3000

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd dealer-management-portal/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the frontend server:
```bash
npm run dev
```

The frontend server will start on http://localhost:8080

## Test Credentials

The application comes with pre-seeded test users:

| Role | Username | Password | Description |
|------|----------|----------|-------------|
| Admin | admin | Admin@123 | Full system access |
| Dealer | dealer1 | Dealer@123 | ABC Distributors |
| Dealer | dealer2 | Dealer@123 | XYZ Enterprises |
| Dealer | dealer3 | Dealer@123 | PQR Trading Company |
| Key User | keyuser | Key@123 | Campaign management |
| Territory Manager | tm_west | TM@123 | Territory management |
| Accounts User | accounts_user | Accounts@123 | Accounts Management |
| Inventory User | inventory_user | Inventory@123 | Inventory management |

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/reset-password` - Request password reset
- `POST /api/auth/reset-password-confirm` - Confirm password reset

### Dealers
- `GET /api/dealers` - Get all dealers
- `GET /api/dealers/:id` - Get dealer by ID
- `GET /api/dealers/profile` - Get dealer profile (for logged-in dealer)
- `POST /api/dealers` - Create new dealer (Admin/Key User)
- `PUT /api/dealers/:id` - Update dealer (Admin/Key User)
- `PATCH /api/dealers/:id/block` - Block/Unblock dealer (Admin)

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `GET /api/invoices/:id/pdf` - Generate and download invoice PDF
- `POST /api/invoices` - Create new invoice (Admin/Key User)
- `PUT /api/invoices/:id` - Update invoice (Admin/Key User)

### Documents
- `GET /api/documents` - Get all documents
- `POST /api/documents` - Upload document
- `GET /api/documents/:id/download` - Download document
- `DELETE /api/documents/:id` - Delete document

### Campaigns
- `GET /api/campaigns` - Get all campaigns
- `GET /api/campaigns/:id` - Get campaign by ID
- `POST /api/campaigns` - Create campaign (Admin/Key User)
- `PUT /api/campaigns/:id` - Update campaign (Admin/Key User)
- `DELETE /api/campaigns/:id` - Delete campaign (Admin/Key User)

### Reports
- `GET /api/reports/dealer-performance` - Dealer performance report
- `GET /api/reports/account-statement` - Account statement report
- `GET /api/reports/invoice-register` - Invoice register report
- `GET /api/reports/credit-debit-notes` - Credit/Debit note report
- `GET /api/reports/outstanding-receivables` - Outstanding receivables report
- `GET /api/reports/territory` - Territory/Region report

### SAP Integration
- `POST /api/sap/sync-dealers` - Sync dealers from SAP (Admin)
- `GET /api/sap/customer-account/:dealerId` - Fetch customer account from SAP
- `GET /api/sap/vendor-account/:dealerId` - Fetch vendor account from SAP
- `POST /api/sap/credit-debit-note` - Create credit/debit note in SAP
- `POST /api/sap/sync-invoices/:dealerId` - Sync invoices from SAP (Admin)

## Performance Considerations

The application is designed to support 1500 concurrent users with the following optimizations:

1. **Database Connection Pooling**: Configured with max 100 connections
2. **Rate Limiting**: 100 requests per 15 minutes per IP
3. **Pagination**: All list endpoints support pagination
4. **Caching**: Ready for Redis integration for session management
5. **In-Memory Database**: Currently using SQLite in-memory for proof of concept
6. **ORM Queries**: Optimized Sequelize queries with proper indexing

## Security Features

1. **Authentication**: JWT-based with OTP verification
2. **Authorization**: Role-based access control (RBAC)
3. **Password Security**: bcrypt hashing with salt rounds
4. **Rate Limiting**: Protection against brute force attacks
5. **CORS**: Configured for specific origins
6. **Helmet.js**: Security headers
7. **Input Validation**: Express-validator for request validation
8. **Audit Logging**: Complete audit trail for all operations
9. **File Upload Security**: File type and size validation

## Production Deployment

### Database Migration
For production, replace SQLite with PostgreSQL:

1. Update `backend/src/config/database.js`:
```javascript
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  pool: {
    max: 100,
    min: 0,
    acquire: 60000,
    idle: 10000
  }
});
```

2. Update `.env` file with PostgreSQL credentials

### SAP Integration
Replace mock SAP endpoints with real SAP integration:

1. Configure SAP connection details in `.env`
2. Update `backend/src/controllers/sapController.js` with actual SAP API calls
3. Implement proper error handling and retry logic
4. Add SAP authentication and authorization

### Environment Variables
Ensure all production environment variables are properly configured:
- JWT_SECRET: Strong secret key
- Database credentials
- SAP connection details
- Email configuration for OTP
- CORS_ORIGIN: Production frontend URL

## Future Enhancements

1. **Email Integration**: Send OTP via email/SMS
2. **Advanced Reporting**: Export to Excel, PDF with charts
3. **Real-time Notifications**: WebSocket integration
4. **Advanced Search**: Elasticsearch integration
5. **Caching**: Redis for session and data caching
6. **File Storage**: AWS S3 or similar for document storage
7. **Monitoring**: Application performance monitoring
8. **CI/CD**: Automated testing and deployment pipeline

## Support

For issues, questions, or contributions, please contact the development team.

## License

Proprietary - All rights reserved
