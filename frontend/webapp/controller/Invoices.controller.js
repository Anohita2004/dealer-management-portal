sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "dealerportal/model/formatter"
], function (Controller, JSONModel, MessageToast, MessageBox, formatter) {
    "use strict";

    return Controller.extend("dealerportal.controller.Invoices", {
        formatter: formatter,

        onInit: function () {
            var oInvoicesModel = new JSONModel({
                invoices: [],
                total: 0
            });
            this.getView().setModel(oInvoicesModel, "invoices");
            
            this._loadInvoices();
        },

        _loadInvoices: function () {
            var oAppModel = this.getOwnerComponent().getModel("app");
            var sApiUrl = oAppModel.getProperty("/apiUrl");
            var sToken = oAppModel.getProperty("/token");
            
            var that = this;
            jQuery.ajax({
                url: sApiUrl + "/invoices?limit=100",
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + sToken
                },
                success: function (oData) {
                    that.getView().getModel("invoices").setData(oData);
                },
                error: function (oError) {
                    MessageBox.error("Failed to load invoices");
                }
            });
        },

        onRefresh: function () {
            this._loadInvoices();
            MessageToast.show("Refreshed");
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            var oTable = this.byId("invoiceTable");
            var oBinding = oTable.getBinding("items");
            
            if (sQuery) {
                var oFilter = new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter("invoiceNumber", sap.ui.model.FilterOperator.Contains, sQuery),
                        new sap.ui.model.Filter("dealer/businessName", sap.ui.model.FilterOperator.Contains, sQuery)
                    ],
                    and: false
                });
                oBinding.filter([oFilter]);
            } else {
                oBinding.filter([]);
            }
        },

        onViewInvoice: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getParent();
            var oContext = oItem.getBindingContext("invoices");
            var oInvoice = oContext.getObject();
            
            MessageBox.information("Invoice Details:\n\n" +
                "Invoice Number: " + oInvoice.invoiceNumber + "\n" +
                "Date: " + new Date(oInvoice.invoiceDate).toLocaleDateString() + "\n" +
                "Amount: ₹" + oInvoice.totalAmount + "\n" +
                "Status: " + oInvoice.status);
        },

        onDownloadPDF: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getParent();
            var oContext = oItem.getBindingContext("invoices");
            var oInvoice = oContext.getObject();
            
            var oAppModel = this.getOwnerComponent().getModel("app");
            var sApiUrl = oAppModel.getProperty("/apiUrl");
            var sToken = oAppModel.getProperty("/token");
            
            var sUrl = sApiUrl + "/invoices/" + oInvoice.id + "/pdf";
            window.open(sUrl + "?token=" + sToken, "_blank");
            MessageToast.show("Downloading PDF...");
        },

        onOpenFilterDialog: function () {
            MessageToast.show("Filter dialog coming soon");
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("dashboard");
        }
    });
});
