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
            this._loadMasterData();
        },

        _loadMasterData: function () {
            // Mock master data for Select Dialogs
            var oData = {
                storageLocations: [
                    { key: "SL01", text: "SL01 - Main Warehouse" },
                    { key: "SL02", text: "SL02 - Returns" },
                    { key: "SL03", text: "SL03 - Bonded Store" }
                ],
                loadingPoints: [
                    { key: "LP01", text: "North Gate" },
                    { key: "LP02", text: "South Gate" },
                    { key: "LP03", text: "Express Dock" }
                ]
            };
            this.getView().setModel(new JSONModel(oData), "masterData");
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
            var sSloc = this.byId("inputSloc").getSelectedKey(); // Changed to getSelectedKey
            var sLp = this.byId("inputLoadingPoint").getSelectedKey(); // Changed to getSelectedKey

            // Enhancement 3: Date Validation
            if (sDate && sDate < new Date()) {
                // Check if it's strictly in the past (ignoring time if needed, but simple check for now)
                // Let's reset time to 00:00:00 for strict day comparison if desired, but user said "cannot be in the past"
                var today = new Date();
                today.setHours(0, 0, 0, 0);
                if (sDate < today) {
                    MessageBox.error("Delivery Date cannot be in the past.");
                    return;
                }
            }

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
                    case "PGI": return "Success"; // Green
                    case "ALLOCATED": return "Information"; // Blue
                    case "DRAFT": return "None"; // Grey
                    case "COMPLETED": return "Success";
                    case "SCHEDULED": return "Warning";
                    default: return "None";
                }
            }
        }
    });
});
