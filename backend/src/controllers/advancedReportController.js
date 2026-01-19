const PDFDocument = require('pdfkit');
const { InsuranceClaim } = require('../models');

exports.generateClaimsReport = async (req, res) => {
    try {
        const claims = await InsuranceClaim.findAll();

        const doc = new PDFDocument();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=claims_report.pdf');

        doc.pipe(res);

        // Header
        doc.fontSize(25).text('Insurance Claims Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown();

        // Table Header
        const startX = 50;
        let currentY = doc.y;

        doc.text('Claim ID', startX, currentY);
        doc.text('Material', startX + 150, currentY);
        doc.text('Qty', startX + 250, currentY);
        doc.text('Status', startX + 350, currentY);
        doc.moveDown();

        doc.moveTo(startX, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Data
        claims.forEach(claim => {
            currentY = doc.y;

            // Check page break
            if (currentY > 700) {
                doc.addPage();
                currentY = 50;
            }

            doc.text(claim.id.substring(0, 8) + '...', startX, currentY);
            doc.text(claim.material_code, startX + 150, currentY);
            doc.text(claim.quantity.toString(), startX + 250, currentY);
            doc.text(claim.status, startX + 350, currentY);
            doc.moveDown();
        });

        // Summary
        doc.addPage();
        const totalClaims = claims.length;
        const totalPending = claims.filter(c => c.status === 'SUBMITTED').length;

        doc.fontSize(18).text('Summary Statistics');
        doc.moveDown();
        doc.fontSize(12).text(`Total Claims: ${totalClaims}`);
        doc.text(`Pending SAP Approval: ${totalPending}`);

        doc.end();

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};
