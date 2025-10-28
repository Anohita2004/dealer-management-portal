sap.ui.define([], function () {
    "use strict";

    return {
        formatDate: function (sDate) {
            if (!sDate) return "";
            var oDate = new Date(sDate);
            return oDate.toLocaleDateString();
        },

        formatStatus: function (sStatus) {
            switch (sStatus) {
                case "paid":
                    return "Success";
                case "unpaid":
                    return "Error";
                case "partial":
                    return "Warning";
                case "overdue":
                    return "Error";
                default:
                    return "None";
            }
        },

        formatCurrency: function (sAmount) {
            if (!sAmount) return "₹0";
            return "₹" + parseFloat(sAmount).toFixed(2);
        }
    };
});
