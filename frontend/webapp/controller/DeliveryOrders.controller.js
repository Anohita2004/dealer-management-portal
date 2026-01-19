sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("dealerportal.controller.DeliveryOrders", {
        onInit: function () {
            this.getView().setModel(new JSONModel([]), "deliveryModel");
            this._loadDeliveryOrders();
        },

        _loadDeliveryOrders: function () {
            // Mock data for now, or fetch from API
            // fetch("/api/delivery") ...

            // For now, let's just make sure the page loads.
            // Ideally we should make an AJAX call here.
            $.ajax({
                url: "/api/delivery",
                method: "GET",
                success: function (data) {
                    var oModel = new JSONModel({ deliveryOrders: data });
                    this.getView().setModel(oModel);
                }.bind(this),
                error: function (err) {
                    MessageToast.show("Failed to load delivery orders");
                }
            });
        },

        onCreateDeliveryPress: function () {
            // Logic to open create dialog
            if (!this.pCreateDialog) {
                this.pCreateDialog = this.loadFragment({
                    name: "dealerportal.view.CreateDeliveryDialog"
                });
            }
            this.pCreateDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onSyncSAPPress: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getParent();
            var oContext = oItem.getBindingContext();
            var sId = oContext.getProperty("id");

            MessageBox.confirm("Sync this order with SAP?", {
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        $.ajax({
                            url: "/api/delivery/" + sId + "/sap-sync",
                            method: "POST",
                            success: function (data) {
                                MessageToast.show("Synced successfully! SAP Delivery: " + data.sapResponse.DELIVERY_NUM);
                                this._loadDeliveryOrders();
                            }.bind(this),
                            error: function (err) {
                                MessageBox.error("Sync failed");
                            }
                        });
                    }
                }.bind(this)
            });
        },

        onCreateCancel: function () {
            this.pCreateDialog.then(function (oDialog) {
                oDialog.close();
            });
        },

        onCreateSubmit: function () {
            var sVbeln = this.byId("inputVbeln").getValue();
            var sDate = this.byId("inputDate").getDateValue();
            var sSloc = this.byId("inputSloc").getValue();
            var sLp = this.byId("inputLoadingPoint").getValue();

            var oPayload = {
                vbeln: sVbeln,
                delivery_date: sDate,
                storage_location_id: sSloc || null, // handle empty
                loading_point_id: sLp || null
            };

            $.ajax({
                url: "/api/delivery",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify(oPayload),
                success: function (data) {
                    MessageToast.show("Delivery Order Created!");
                    this.onCreateCancel();
                    this._loadDeliveryOrders();
                }.bind(this),
                error: function (err) {
                    MessageBox.error("Creation failed");
                }
            });
        },

        onScheduleDockPress: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getParent();
            var oContext = oItem.getBindingContext();
            var sId = oContext.getProperty("id");

            if (!this.pScheduleDialog) {
                this.pScheduleDialog = this.loadFragment({
                    name: "dealerportal.view.DockSchedulingDialog"
                });
            }
            this.pScheduleDialog.then(function (oDialog) {
                this.byId("inputScheduleDoId").setValue(sId);
                oDialog.open();
            }.bind(this));
        },

        onScheduleCancel: function () {
            this.pScheduleDialog.then(function (oDialog) {
                oDialog.close();
            });
        },

        onScheduleSubmit: function () {
            var sId = this.byId("inputScheduleDoId").getValue();
            var sLp = this.byId("inputScheduleLp").getValue();
            var sStart = this.byId("inputScheduleStart").getDateValue();
            var sEnd = this.byId("inputScheduleEnd").getDateValue();

            var oPayload = {
                loading_point_id: sLp,
                scheduled_start: sStart,
                scheduled_end: sEnd
            };

            $.ajax({
                url: "/api/delivery/" + sId + "/schedule",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify(oPayload),
                success: function (data) {
                    MessageToast.show("Dock Scheduled Successfully!");
                    this.onScheduleCancel();
                    this._loadDeliveryOrders();
                }.bind(this),
                error: function (err) {
                    MessageBox.error("Scheduling failed");
                }
            });
        },

        formatter: {
            statusState: function (sStatus) {
                switch (sStatus) {
                    case "COMPLETED": return "Success";
                    case "DRAFT": return "None";
                    case "SCHEDULED": return "Warning";
                    default: return "Information";
                }
            }
        }
    });
});
