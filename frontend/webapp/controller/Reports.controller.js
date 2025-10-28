sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("dealerportal.controller.Reports", {
        onInit: function () {
        },

        _generateReport: function (sReportType) {
            var oAppModel = this.getOwnerComponent().getModel("app");
            var sApiUrl = oAppModel.getProperty("/apiUrl");
            var sToken = oAppModel.getProperty("/token");
            
            jQuery.ajax({
                url: sApiUrl + "/reports/" + sReportType,
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + sToken
                },
                success: function (oData) {
                    MessageBox.information("Report generated successfully. Data:\n" + JSON.stringify(oData, null, 2));
                },
                error: function (oError) {
                    MessageBox.error("Failed to generate report");
                }
            });
        },

        onGenerateDealerPerformance: function () {
            this._generateReport("dealer-performance");
        },

        onGenerateAccountStatement: function () {
            this._generateReport("account-statement");
        },

        onGenerateInvoiceRegister: function () {
            this._generateReport("invoice-register");
        },

        onGenerateCreditDebitNote: function () {
            this._generateReport("credit-debit-notes");
        },

        onGenerateOutstandingReceivables: function () {
            this._generateReport("outstanding-receivables");
        },

        onGenerateTerritoryReport: function () {
            this._generateReport("territory");
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("dashboard");
        }
    });
});
