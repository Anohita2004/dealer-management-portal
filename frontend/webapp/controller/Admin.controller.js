sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("dealerportal.controller.Admin", {
        onInit: function () {
            var oAdminModel = new JSONModel({
                dealers: [],
                users: []
            });
            this.getView().setModel(oAdminModel, "admin");
            
            this._loadDealers();
        },

        _loadDealers: function () {
            var oAppModel = this.getOwnerComponent().getModel("app");
            var sApiUrl = oAppModel.getProperty("/apiUrl");
            var sToken = oAppModel.getProperty("/token");
            
            var that = this;
            jQuery.ajax({
                url: sApiUrl + "/dealers?limit=100",
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + sToken
                },
                success: function (oData) {
                    that.getView().getModel("admin").setProperty("/dealers", oData.dealers || []);
                },
                error: function (oError) {
                    MessageBox.error("Failed to load dealers");
                }
            });
        },

        _loadUsers: function () {
            MessageToast.show("User management API not yet implemented");
        },

        onRefresh: function () {
            var sSelectedKey = this.byId("adminTabs").getSelectedKey();
            if (sSelectedKey === "dealers") {
                this._loadDealers();
            } else if (sSelectedKey === "users") {
                this._loadUsers();
            }
            MessageToast.show("Refreshed");
        },

        onTabSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            if (sKey === "dealers") {
                this._loadDealers();
            } else if (sKey === "users") {
                this._loadUsers();
            }
        },

        onEditDealer: function (oEvent) {
            MessageBox.information("Dealer editing functionality will be available soon. Please use the API directly for now.");
        },

        onToggleBlock: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getParent();
            var oContext = oItem.getBindingContext("admin");
            var oDealer = oContext.getObject();
            
            var that = this;
            var sAction = oDealer.isBlocked ? "unblock" : "block";
            
            MessageBox.confirm("Are you sure you want to " + sAction + " this dealer?", {
                onClose: function (sConfirm) {
                    if (sConfirm === MessageBox.Action.OK) {
                        var oAppModel = that.getOwnerComponent().getModel("app");
                        var sApiUrl = oAppModel.getProperty("/apiUrl");
                        var sToken = oAppModel.getProperty("/token");
                        
                        jQuery.ajax({
                            url: sApiUrl + "/dealers/" + oDealer.id + "/block",
                            method: "PATCH",
                            headers: {
                                "Authorization": "Bearer " + sToken,
                                "Content-Type": "application/json"
                            },
                            data: JSON.stringify({
                                isBlocked: !oDealer.isBlocked
                            }),
                            success: function () {
                                MessageToast.show("Dealer " + sAction + "ed successfully");
                                that._loadDealers();
                            },
                            error: function () {
                                MessageBox.error("Failed to " + sAction + " dealer");
                            }
                        });
                    }
                }
            });
        },

        onResetPassword: function () {
            MessageBox.information("Password reset functionality will be available soon. Please use the API directly for now.");
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("dashboard");
        }
    });
});
