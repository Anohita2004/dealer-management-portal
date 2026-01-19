sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("dealerportal.controller.PhysicalInventory", {
        onInit: function () {
            this.getView().setModel(new JSONModel([]), "inventoryModel");
            this._loadCounts();
            this._loadMasterData();
        },

        _loadMasterData: function () {
            var oData = {
                plants: [
                    { key: "1001", text: "1001 - Hamburg Plant" },
                    { key: "1002", text: "1002 - Berlin Plant" },
                    { key: "2000", text: "2000 - Munich Plant" }
                ],
                storageLocations: [
                    { key: "FG01", text: "FG01 - Finished Goods" },
                    { key: "RM01", text: "RM01 - Raw Materials" },
                    { key: "RETS", text: "RETS - Returns" }
                ]
            };
            this.getView().setModel(new JSONModel(oData), "masterData");
        },

        _loadCounts: function () {
            $.ajax({
                url: "/api/physical-inventory",
                method: "GET",
                success: function (data) {
                    var oModel = new JSONModel({ counts: data });
                    this.getView().setModel(oModel);
                }.bind(this),
                error: function (err) {
                    MessageToast.show("Failed to load inventory counts");
                }
            });
        },

        onInitiatePress: function () {
            if (!this.pInitDialog) {
                this.pInitDialog = this.loadFragment({
                    name: "dealerportal.view.InitiateInventoryDialog"
                });
            }
            this.pInitDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onInitiateSubmit: function () {
            var sPlant = this.byId("inputPlant").getSelectedKey();
            var sSloc = this.byId("inputSloc").getSelectedKey();
            var sDesc = this.byId("inputDesc").getValue();
            var sDate = this.byId("inputDate").getDateValue();

            if (!sPlant || !sSloc || !sDate) {
                MessageBox.error("Please fill in all mandatory fields (Plant, Storage Location, Date)");
                return;
            }

            var oPayload = {
                plant: sPlant,
                storage_location: sSloc,
                description: sDesc,
                planned_date: sDate
            };

            $.ajax({
                url: "/api/physical-inventory/initiate",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify(oPayload),
                success: function (data) {
                    MessageToast.show("Count Initiated! SAP Doc: " + data.header.sap_doc_no);
                    this.onInitiateCancel();
                    this._loadCounts();
                }.bind(this),
                error: function (err) {
                    MessageBox.error("Initialization failed");
                }
            });
        },

        onInitiateCancel: function () {
            this.pInitDialog.then(function (oDialog) {
                oDialog.close();
            });
        },

        onCountPress: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getParent();
            var oContext = oItem.getBindingContext();
            var oData = oContext.getObject();

            if (!this.pCountDialog) {
                this.pCountDialog = this.loadFragment({
                    name: "dealerportal.view.InventoryCountDialog"
                });
            }
            this.pCountDialog.then(function (oDialog) {
                // Initialize variance for each item
                if (oData.counts) {
                    oData.counts.forEach(function (c) {
                        c.variance = (c.physical_qty || 0) - c.book_qty;
                        c.varianceState = c.variance !== 0 ? "Error" : "None";
                    });
                }
                var oModel = new JSONModel(oData);
                oDialog.setModel(oModel, "detail");
                oDialog.open();
            });
        },

        onQtyChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sVal = oInput.getValue();
            var fVal = parseFloat(sVal) || 0;

            var oContext = oInput.getBindingContext("detail");
            var fBook = oContext.getProperty("book_qty");
            var fVariance = fVal - fBook;

            var oModel = oContext.getModel();
            var sPath = oContext.getPath();

            oModel.setProperty(sPath + "/variance", fVariance);

            // Highlight specific large variance (e.g. > 10% or just non-zero? User said "Highlight large variances in Red")
            // Let's assume non-zero is enough for "Red" (Error), or maybe > 5% diff. 
            // Stick to simple: red if variance is negative (missing) or positive (extra).
            oModel.setProperty(sPath + "/varianceState", fVariance !== 0 ? "Error" : "Success");
        },

        onCountCancel: function () {
            this.pCountDialog.then(function (oDialog) {
                oDialog.close();
            });
        },

        onCountSubmit: function () {
            this.pCountDialog.then(function (oDialog) {
                var oData = oDialog.getModel("detail").getData();
                var aCounts = oData.counts;

                var aPayload = aCounts.map(function (c) {
                    return { id: c.id, physical_qty: c.physical_qty };
                });

                $.ajax({
                    url: "/api/physical-inventory/submit-counts",
                    method: "POST",
                    contentType: "application/json",
                    data: JSON.stringify({ counts: aPayload }),
                    success: function (data) {
                        MessageToast.show("Counts Submitted!");
                        oDialog.close();
                        this._loadCounts();
                    }.bind(this),
                    error: function (err) {
                        MessageBox.error("Submission failed");
                    }
                });
            }.bind(this));
        },

        onPostPress: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getParent();
            var oContext = oItem.getBindingContext();
            var sId = oContext.getProperty("id");

            MessageBox.confirm("Post adjustments to SAP? This cannot be undone.", {
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        $.ajax({
                            url: "/api/physical-inventory/" + sId + "/post",
                            method: "POST",
                            success: function (data) {
                                MessageToast.show("Posted Successfully! " + data.sapResponse.MESSAGE);
                                this._loadCounts();
                            }.bind(this),
                            error: function (err) {
                                MessageBox.error("Posting failed");
                            }
                        });
                    }
                }.bind(this)
            });
        },

        formatter: {
            statusState: function (sStatus) {
                switch (sStatus) {
                    case "POSTED": return "Success";
                    case "PLANNED": return "None";
                    case "IN_PROGRESS": return "Warning";
                    case "REVIEW": return "Error"; // Needs attention
                    default: return "Information";
                }
            }
        }
    });
});
