const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema({

    product_name: {
        type: String,
        required: true
    },

    category: {
        type: String,
        default: ""
    },

    quantity: {
        type: Number,
        default: 1
    },

    profit: {
        type: Number,
        default: 0
    },

    sold_at: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("Sale", saleSchema, "sales");
