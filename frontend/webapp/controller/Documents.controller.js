sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "dealerportal/model/formatter"
], function (Controller, JSONModel, MessageToast, MessageBox, formatter) {
    "use strict";

    return Controller.extend("dealerportal.controller.Documents", {
        formatter: formatter,

        onInit: function () {
            var oDocumentsModel = new JSONModel({
                documents: [],
                total: 0
            });
            this.getView().setModel(oDocumentsModel, "documents");
            
            this._loadDocuments();
        },

        _loadDocuments: function () {
            var oAppModel = this.getOwnerComponent().getModel("app");
            var sApiUrl = oAppModel.getProperty("/apiUrl");
            var sToken = oAppModel.getProperty("/token");
            
            var that = this;
            jQuery.ajax({
                url: sApiUrl + "/documents?limit=100",
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + sToken
                },
                success: function (oData) {
                    that.getView().getModel("documents").setData(oData);
                },
                error: function (oError) {
                    MessageBox.error("Failed to load documents");
                }
            });
        },

        onRefresh: function () {
            this._loadDocuments();
            MessageToast.show("Refreshed");
        },

        onUploadDocument: function () {
            MessageBox.information("Document upload functionality will be available soon. Please use the API directly for now.");
        },

        onDownloadDocument: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getParent();
            var oContext = oItem.getBindingContext("documents");
            var oDocument = oContext.getObject();
            
            var oAppModel = this.getOwnerComponent().getModel("app");
            var sApiUrl = oAppModel.getProperty("/apiUrl");
            var sToken = oAppModel.getProperty("/token");
            
            var sUrl = sApiUrl + "/documents/" + oDocument.id + "/download";
            window.open(sUrl + "?token=" + sToken, "_blank");
            MessageToast.show("Downloading document...");
        },

        onDeleteDocument: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getParent();
            var oContext = oItem.getBindingContext("documents");
            var oDocument = oContext.getObject();
            
            var that = this;
            MessageBox.confirm("Are you sure you want to delete this document?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        var oAppModel = that.getOwnerComponent().getModel("app");
                        var sApiUrl = oAppModel.getProperty("/apiUrl");
                        var sToken = oAppModel.getProperty("/token");
                        
                        jQuery.ajax({
                            url: sApiUrl + "/documents/" + oDocument.id,
                            method: "DELETE",
                            headers: {
                                "Authorization": "Bearer " + sToken
                            },
                            success: function () {
                                MessageToast.show("Document deleted successfully");
                                that._loadDocuments();
                            },
                            error: function () {
                                MessageBox.error("Failed to delete document");
                            }
                        });
                    }
                }
            });
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("dashboard");
        }
    });
});
