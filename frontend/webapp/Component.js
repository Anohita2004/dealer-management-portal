sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
    "use strict";

    return UIComponent.extend("dealerportal.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            var oAppModel = new JSONModel({
                apiUrl: "http://localhost:3000/api",
                user: null,
                token: null,
                isAuthenticated: false
            });
            this.setModel(oAppModel, "app");

            this.getRouter().initialize();

            var sToken = localStorage.getItem("token");
            var sUser = localStorage.getItem("user");
            if (sToken && sUser) {
                oAppModel.setProperty("/token", sToken);
                oAppModel.setProperty("/user", JSON.parse(sUser));
                oAppModel.setProperty("/isAuthenticated", true);
                this.getRouter().navTo("dashboard");
            }
        }
    });
});
