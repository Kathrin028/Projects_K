console.log("SERVER FILE LOADED");

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const Product = require("./models/product");
const Sale = require("./models/sale");

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, "../frontend")));

const PORT = 5000;

/* MongoDB Connection */
mongoose.connect("mongodb://localhost:27017/electronics_inventory")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

/* Root Test */
app.get("/", (req, res) => {
    res.send("Server is running successfully");
});

app.get("/test", (req,res)=>{
    res.send("TEST WORKING");
});

/* Add Product */
app.post("/add-product", async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.send("Product Added");
    } catch (err) {
        res.status(500).send(err);
    }
});

/* Get Products */
app.get("/products", async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).send(err);
    }
});

/* Sell Product */
app.put("/sell-product/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).send("Product not found");
        }

        if (product.stock > 0) {
            product.stock -= 1;
            product.demand_count = (product.demand_count || 0) + 1;
            await product.save();

            // ✅ Persist sale to MongoDB
            const profit = (product.selling_price || 0) - (product.cost_price || 0);
            await Sale.create({
                product_name: product.product_name,
                category:     product.category,
                quantity:     1,
                profit:       profit
            });
        }

        res.json(product);
    } catch (err) {
        res.status(500).send(err);
    }
});

/* Add Stock */
app.put("/add-stock/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).send("Product not found");
        }

        product.stock += 1;
        await product.save();

        res.json(product);
    } catch (err) {
        res.status(500).send(err);
    }
});

/* Delete Product */
app.delete("/delete/:id", async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.send("Product Deleted");
    } catch (err) {
        res.status(500).send(err);
    }
});

/* ================= SALES HISTORY ================= */

/* GET all sales (persistent, from MongoDB) */
app.get("/sales-history", async (req, res) => {
    try {
        const sales = await Sale.find().sort({ sold_at: -1 });
        res.json(sales);
    } catch (err) {
        res.status(500).send(err);
    }
});

/* POST a manual sale (optional — used if you ever save from frontend directly) */
app.post("/save-sale", async (req, res) => {
    try {
        const sale = await Sale.create(req.body);
        res.json(sale);
    } catch (err) {
        res.status(500).send(err);
    }
});

/* DELETE a single sale */
app.delete("/delete-sale/:id", async (req, res) => {
    try {
        await Sale.findByIdAndDelete(req.params.id);
        res.send("Sale deleted");
    } catch (err) {
        res.status(500).send(err);
    }
});

/* DELETE all sales */
app.delete("/clear-sales", async (req, res) => {
    try {
        await Sale.deleteMany({});
        res.send("All sales cleared");
    } catch (err) {
        res.status(500).send(err);
    }
});

/* Low Stock */
app.get("/low-stock", async (req, res) => {
    try {
        const result = await Product.find({ stock: { $lte: 5 } });
        res.json(result);
    } catch (err) {
        res.status(500).send(err);
    }
});

/* Smart Alerts */
app.get("/smart-alerts", async (req, res) => {
    try {
        const products = await Product.find();

        const alerts = products.filter(p =>
            p.stock <= 5 && (p.demand_count || 0) >= 10
        );

        res.json(alerts);
    } catch (err) {
        res.status(500).send(err);
    }
});

/* Start Server */
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});