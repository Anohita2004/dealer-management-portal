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

        onGenerateFIDaywise: function () {
            this._generateReport("fi-daywise");
        },

        onGenerateInvoiceRegister: function () {
            this._generateReport("invoice-register");
        },

        onGenerateCreditDebitNote: function () {
            this._generateReport("credit-debit-notes");
        },

        onGenerateCollection: function () {
            this._generateReport("collections");
        },

        onOpenAgeingReport: function () {
            var oAppModel = this.getOwnerComponent().getModel("app");
            var sApiUrl = oAppModel.getProperty("/apiUrl");
            var sToken = oAppModel.getProperty("/token");

            jQuery.ajax({
                url: sApiUrl + "/reports/ageing-link",
                method: "GET",
                headers: { "Authorization": "Bearer " + sToken },
                success: function (oData) {
                    if (oData && oData.url) {
                        sap.m.URLHelper.redirect(oData.url, true);
                    }
                },
                error: function () {
                    MessageBox.error("Failed to fetch Ageing Report link");
                }
            });
        },

        onGenerateStockOverview: function () {
            this._generateReport("stock-overview");
        },

        onGenerateStockComparative: function () {
            this._generateReport("stock-comparative");
        },

        onGenerateStockCompliance: function () {
            this._generateReport("stock-compliance");
        },

        onGenerateRRSummary: function () {
            this._generateReport("rr-summary");
        },

        onGenerateRakeArrival: function () {
            this._generateReport("rakes");
        },

        onGenerateRakeExceptions: function () {
            this._generateReport("rakes-exceptions");
        },

        onGenerateRakeApprovals: function () {
            this._generateReport("rakes-approvals");
        },

        onGenerateTerritoryReport: function () {
            this._generateReport("territory");
        },

        onGenerateDiversion: function () {
            this._generateReport("diversion");
        },

        onGenerateDMSOrders: function () {
            this._generateReport("dms-orders");
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("dashboard");
        }
    });
});
