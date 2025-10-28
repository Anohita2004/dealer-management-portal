sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "dealerportal/model/formatter"
], function (Controller, JSONModel, MessageToast, MessageBox, formatter) {
    "use strict";

    return Controller.extend("dealerportal.controller.Campaigns", {
        formatter: formatter,

        onInit: function () {
            var oCampaignsModel = new JSONModel({
                campaigns: [],
                total: 0
            });
            this.getView().setModel(oCampaignsModel, "campaigns");
            
            this._loadCampaigns();
        },

        _loadCampaigns: function () {
            var oAppModel = this.getOwnerComponent().getModel("app");
            var sApiUrl = oAppModel.getProperty("/apiUrl");
            var sToken = oAppModel.getProperty("/token");
            
            var that = this;
            jQuery.ajax({
                url: sApiUrl + "/campaigns?limit=100",
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + sToken
                },
                success: function (oData) {
                    that.getView().getModel("campaigns").setData(oData);
                },
                error: function (oError) {
                    MessageBox.error("Failed to load campaigns");
                }
            });
        },

        onRefresh: function () {
            this._loadCampaigns();
            MessageToast.show("Refreshed");
        },

        onCreateCampaign: function () {
            MessageBox.information("Campaign creation functionality will be available soon. Please use the API directly for now.");
        },

        onViewCampaign: function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext("campaigns");
            var oCampaign = oContext.getObject();
            
            MessageBox.information("Campaign Details:\n\n" +
                "Name: " + oCampaign.campaignName + "\n" +
                "Type: " + oCampaign.campaignType + "\n" +
                "Discount: " + oCampaign.discountPercentage + "%\n" +
                "Start Date: " + new Date(oCampaign.startDate).toLocaleDateString() + "\n" +
                "End Date: " + new Date(oCampaign.endDate).toLocaleDateString() + "\n" +
                "Product Group: " + oCampaign.productGroup + "\n" +
                "Description: " + oCampaign.description);
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("dashboard");
        }
    });
});
