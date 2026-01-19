sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("dealerportal.controller.Claims", {
        onInit: function () {
            this.getView().setModel(new JSONModel([]), "claimsModel");
            this._loadClaims();
        },

        _loadClaims: function () {
            $.ajax({
                url: "/api/claims",
                method: "GET",
                success: function (data) {
                    var oModel = new JSONModel({ claims: data });
                    this.getView().setModel(oModel);
                }.bind(this),
                error: function (err) {
                    MessageToast.show("Failed to load claims");
                }
            });
        },

        onCreateClaimPress: function () {
            if (!this.pCreateDialog) {
                this.pCreateDialog = this.loadFragment({
                    name: "dealerportal.view.CreateClaimDialog"
                });
            }
            this.pCreateDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onCreateSubmit: function () {
            var sDoId = this.byId("inputDoId").getValue();
            var sMat = this.byId("inputMaterial").getValue();
            var sQty = this.byId("inputQty").getValue();
            var sReason = this.byId("inputReason").getSelectedKey();
            var sDesc = this.byId("inputDesc").getValue();

            var oPayload = {
                delivery_order_id: sDoId || null,
                material_code: sMat,
                quantity: sQty,
                reason: sReason,
                description: sDesc
            };

            $.ajax({
                url: "/api/claims",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify(oPayload),
                success: function (data) {
                    MessageToast.show("Claim Created!");
                    this.onCreateCancel();
                    this._loadClaims();
                }.bind(this),
                error: function (err) {
                    MessageBox.error("Creation failed");
                }
            });
        },

        onCreateCancel: function () {
            this.pCreateDialog.then(function (oDialog) {
                oDialog.close();
            });
        },

        onSubmitSAPPress: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getParent();
            var oContext = oItem.getBindingContext();
            var sId = oContext.getProperty("id");

            MessageBox.confirm("Submit this claim to SAP?", {
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        $.ajax({
                            url: "/api/claims/" + sId + "/submit",
                            method: "POST",
                            success: function (data) {
                                MessageToast.show("Submitted! SAP ID: " + data.sapResponse.CLAIM_ID);
                                this._loadClaims();
                            }.bind(this),
                            error: function (err) {
                                MessageBox.error("Submission failed");
                            }
                        });
                    }
                }.bind(this)
            });
        },

        onDownloadReportPress: function () {
            // Use window.open to reduce chance of popup blockers interfering
            window.open("/api/claims/report", "_blank");
        },

        formatter: {
            statusState: function (sStatus) {
                switch (sStatus) {
                    case "APPROVED": return "Success";
                    case "REJECTED": return "Error";
                    case "DRAFT": return "None";
                    case "SUBMITTED": return "Warning";
                    default: return "Information";
                }
            }
        }
    });
});
