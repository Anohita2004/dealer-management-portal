sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("dealerportal.controller.Dashboard", {
        onInit: function () {
            var oDashboardModel = new JSONModel({
                invoiceCount: 0,
                documentCount: 0,
                campaignCount: 0,
                outstandingAmount: 0,
                recentActivity: []
            });
            this.getView().setModel(oDashboardModel, "dashboard");

            this._loadDashboardData();
        },

        _loadDashboardData: function () {
            var oAppModel = this.getOwnerComponent().getModel("app");
            var sApiUrl = oAppModel.getProperty("/apiUrl");
            var sToken = oAppModel.getProperty("/token");
            var oUser = oAppModel.getProperty("/user");

            var that = this;

            jQuery.ajax({
                url: sApiUrl + "/invoices?limit=1",
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + sToken
                },
                success: function (oData) {
                    that.getView().getModel("dashboard").setProperty("/invoiceCount", oData.total || 0);
                }
            });

            jQuery.ajax({
                url: sApiUrl + "/documents?limit=1",
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + sToken
                },
                success: function (oData) {
                    that.getView().getModel("dashboard").setProperty("/documentCount", oData.total || 0);
                }
            });

            jQuery.ajax({
                url: sApiUrl + "/campaigns?limit=1",
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + sToken
                },
                success: function (oData) {
                    that.getView().getModel("dashboard").setProperty("/campaignCount", oData.total || 0);
                }
            });

            if (oUser.role === "dealer") {
                jQuery.ajax({
                    url: sApiUrl + "/dealers/profile",
                    method: "GET",
                    headers: {
                        "Authorization": "Bearer " + sToken
                    },
                    success: function (oData) {
                        that.getView().getModel("dashboard").setProperty("/outstandingAmount", oData.outstandingAmount || 0);
                    }
                });
            }
        },

        onNavigateToInvoices: function () {
            this.getOwnerComponent().getRouter().navTo("invoices");
        },

        onNavigateToDocuments: function () {
            this.getOwnerComponent().getRouter().navTo("documents");
        },

        onNavigateToCampaigns: function () {
            this.getOwnerComponent().getRouter().navTo("campaigns");
        },

        onNavigateToReports: function () {
            this.getOwnerComponent().getRouter().navTo("reports");
        },

        onNavigateToAdmin: function () {
            this.getOwnerComponent().getRouter().navTo("admin");
        },

        onNavigateToDelivery: function () {
            this.getOwnerComponent().getRouter().navTo("deliveryOrders");
        },

        onNavigateToInventory: function () {
            this.getOwnerComponent().getRouter().navTo("physicalInventory");
        },

        onNavigateToClaims: function () {
            this.getOwnerComponent().getRouter().navTo("claims");
        },

        onLogout: function () {
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            var oAppModel = this.getOwnerComponent().getModel("app");
            oAppModel.setProperty("/token", null);
            oAppModel.setProperty("/user", null);
            oAppModel.setProperty("/isAuthenticated", false);

            MessageToast.show("Logged out successfully");
            this.getOwnerComponent().getRouter().navTo("login");
        }
    });
});
