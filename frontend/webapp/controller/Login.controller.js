sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("dealerportal.controller.Login", {
        onInit: function () {
            var oLoginModel = new JSONModel({
                username: "",
                password: "",
                otp: "",
                otpSent: false,
                userId: null
            });
            this.getView().setModel(oLoginModel);
        },

        onLogin: function () {
            var oModel = this.getView().getModel();
            var oAppModel = this.getOwnerComponent().getModel("app");
            var sApiUrl = oAppModel.getProperty("/apiUrl");
            
            var sUsername = oModel.getProperty("/username");
            var sPassword = oModel.getProperty("/password");

            if (!sUsername || !sPassword) {
                MessageBox.error("Please enter username and password");
                return;
            }

            var that = this;
            jQuery.ajax({
                url: sApiUrl + "/auth/login",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({
                    username: sUsername,
                    password: sPassword
                }),
                success: function (oData) {
                    MessageToast.show("OTP sent successfully");
                    oModel.setProperty("/otpSent", true);
                    oModel.setProperty("/userId", oData.userId);
                },
                error: function (oError) {
                    var sMessage = "Login failed";
                    if (oError.responseJSON && oError.responseJSON.error) {
                        sMessage = oError.responseJSON.error;
                    }
                    MessageBox.error(sMessage);
                }
            });
        },

        onVerifyOTP: function () {
            var oModel = this.getView().getModel();
            var oAppModel = this.getOwnerComponent().getModel("app");
            var sApiUrl = oAppModel.getProperty("/apiUrl");
            
            var sOTP = oModel.getProperty("/otp");
            var sUserId = oModel.getProperty("/userId");

            if (!sOTP) {
                MessageBox.error("Please enter OTP");
                return;
            }

            var that = this;
            jQuery.ajax({
                url: sApiUrl + "/auth/verify-otp",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({
                    userId: sUserId,
                    otp: sOTP
                }),
                success: function (oData) {
                    MessageToast.show("Login successful");
                    
                    localStorage.setItem("token", oData.token);
                    localStorage.setItem("user", JSON.stringify(oData.user));
                    
                    oAppModel.setProperty("/token", oData.token);
                    oAppModel.setProperty("/user", oData.user);
                    oAppModel.setProperty("/isAuthenticated", true);
                    
                    that.getOwnerComponent().getRouter().navTo("dashboard");
                },
                error: function (oError) {
                    var sMessage = "OTP verification failed";
                    if (oError.responseJSON && oError.responseJSON.error) {
                        sMessage = oError.responseJSON.error;
                    }
                    MessageBox.error(sMessage);
                }
            });
        },

        onForgotPassword: function () {
            MessageBox.information("Please contact your administrator to reset your password.");
        }
    });
});
