const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    product_name: String,
    category: String,
    brand: String,

    cost_price: Number,
    selling_price: Number,

    stock: Number,
    min_stock: Number,

    supplier: String,

    discount: Number,

    demand_count: {
        type: Number,
        default: 0
    },

    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Product", productSchema, "products");