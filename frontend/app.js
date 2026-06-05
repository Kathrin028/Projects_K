let allProducts = [];
let salesHistory = [];   // Runtime cache — loaded from MongoDB on page open


/* ================= LOAD PRODUCTS ================= */
async function loadProducts() {
    try {
        const response = await fetch("http://localhost:5000/products");
        const products = await response.json();

        allProducts = products;
        populateCategories(products);

    } catch (error) {
        console.error("Error loading products:", error);
    }
}

/* ================= RENDER PRODUCTS ================= */
function renderProducts(products) {

    const tableBody = document.getElementById("productTableBody");
    tableBody.innerHTML = "";

    let totalProfit = 0;
    let lowStock = 0;
    let highDemand = 0;

    let reorderProduct = "";
    let topProduct = "";
    let maxDemand = 0;

    // NEW INSIGHT VARIABLES
    let slowMoving = "";
    let minDemand = Infinity;
    let highestProfit = 0;
    let highestProfitProduct = "";

    products.forEach((product) => {

        const selling = product.selling_price || 0;
        const cost = product.cost_price || 0;
        const stock = product.stock || 0;
        const demand = product.demand_count || 0;
        let prediction = "Low";

        if (demand >= 15) prediction = "Very High";
        else if (demand >= 10) prediction = "High";
        else if (demand >= 5) prediction = "Medium";

        let discountSuggestion = "";

        if (demand <= 2 && stock > 5) {
            discountSuggestion = "💡 Suggest 10% discount";
        }




        if (stock <= 5 && demand >= 5) {
            reorderProduct = product.product_name;
        }

        if (demand > maxDemand) {
            maxDemand = demand;
            topProduct = product.product_name;
        }

        const profit = selling - cost;
        totalProfit += profit;

        if (demand < minDemand) {
            minDemand = demand;
            slowMoving = product.product_name;
        }

        if (profit > highestProfit) {
            highestProfit = profit;
            highestProfitProduct = product.product_name;
        }

        // INSIGHTS
        if (stock <= 5) lowStock++;
        if (demand >= 10) highDemand++;

        // ✅ CREATE ROW FIRST
        const row = document.createElement("tr");

        // low stock highlight
        if (stock <= 5) {
            row.style.backgroundColor = "#ffe5e5";
        }

        // category icon
        const category = (product.category || "").toLowerCase();

        let icon = "📦";

        if (category === "mobile") icon = "📱";
        else if (category === "laptop") icon = "💻";
        else if (category === "earphones") icon = "🎧";
        else if (category === "tablet") icon = "📲";
        else if (category === "accessory") icon = "⌚";

        // ✅ NOW USE row.innerHTML
        row.innerHTML = `
        <td>
            <span class="badge ${category}">
                ${icon} ${product.category}
            </span>
            <span style="font-weight: 600;">${product.product_name}</span>
        </td>
        <td>₹${selling}</td>
        <td><span style="font-weight: 700; color: var(--primary);">${stock}</span></td>
        <td>${product.discount || 0}%</td>
        <td>${demand}</td>
        <td><span style="font-weight: 700; color: var(--success);">₹${profit}</span></td>
        <td><span class="prediction ${prediction.toLowerCase().split(' ')[0]}">${prediction}</span></td>
        <td style="font-size: 13px;">${discountSuggestion}</td>
        <td class="action-buttons">
    <button class="btn sell" onclick="sellProduct('${product._id}')">
        <i class="fa-solid fa-cart-shopping"></i> Sell
    </button>

    <button class="btn stock" onclick="addStock('${product._id}')">
        <i class="fa-solid fa-plus"></i> Stock
    </button>

    <button class="btn delete" onclick="deleteProduct('${product._id}')">
        <i class="fa-solid fa-trash"></i> Delete
    </button>
</td>
    `;

        tableBody.appendChild(row);
    });


    /* ================= DASHBOARD ================= */
    document.getElementById("totalProducts").innerText = products.length;
    document.getElementById("lowStock").innerText = lowStock;
    document.getElementById("highDemand").innerText = highDemand;
    document.getElementById("totalProfit").innerText = totalProfit;

    /* ================= INSIGHTS ================= */
    document.getElementById("topSelling").innerText = topProduct || "-";
    document.getElementById("reorderProduct").innerText = reorderProduct || "-";
    document.getElementById("slowMoving").innerText = slowMoving || "-";
    document.getElementById("highestProfit").innerText = highestProfitProduct || "-";
    /* ================= ALERTS ================= */
    if (reorderProduct) {
        document.getElementById("reorderAlert").style.display = "block";
        document.getElementById("reorderAlert").innerText =
            "📦 Reorder recommended: " + reorderProduct;

        // 🔔 ADD THIS
        addNotification("📦 Reorder needed: " + reorderProduct);

    } else {
        document.getElementById("reorderAlert").style.display = "none";
    }

    if (lowStock > 0) {
        document.getElementById("lowStockAlert").style.display = "block";
        document.getElementById("lowStockAlert").innerText =
            "⚠ " + lowStock + " product(s) are low in stock";

        // 🔔 ADD THIS LINE
        addNotification("⚠ " + lowStock + " items low in stock");

    } else {
        document.getElementById("lowStockAlert").style.display = "none";
    }

    renderChart(products);
    renderProfitChart(products);
}

function filterCategory() {

    if (!allProducts.length) return;


    const selected = document.getElementById("categoryFilter").value;

    if (selected === "all") {
        renderProducts(allProducts);
        return;
    }

    const filtered = allProducts.filter(product =>
        (product.category || "").toLowerCase() === selected.toLowerCase()
    );

    renderProducts(filtered);

}

/* ================= SELL PRODUCT ================= */
async function sellProduct(id) {
    const res = await fetch(`http://localhost:5000/sell-product/${id}`, { method: "PUT" });
    const updated = await res.json();

    const product = allProducts.find(p => p._id === id);

    if (product && updated.stock !== undefined) {
        showNotification(`🛒 Sale recorded! "${product.product_name}" has been successfully sold and stock has been updated.`, "success");
    }

    // Reload products and refresh sales cache
    await loadProducts();
    await loadSalesHistory();
    filterCategory();
}

/* ================= ADD STOCK ================= */
async function addStock(id) {
    await fetch(`http://localhost:5000/add-stock/${id}`, { method: "PUT" });
    const product = allProducts.find(p => p._id === id);
    await loadProducts();
    filterCategory();
    if (product) {
        showNotification(`📦 Stock updated! "${product.product_name}" inventory has been restocked successfully.`, "info");
    }
}

/* ================= DELETE PRODUCT ================= */
async function deleteProduct(id) {
    const product = allProducts.find(p => p._id === id);
    await fetch(`http://localhost:5000/delete/${id}`, { method: "DELETE" });
    await loadProducts();
    filterCategory();
    if (product) {
        showNotification(`🗑️ Done! "${product.product_name}" has been removed from your inventory permanently.`, "error");
    }
}

/* ================= ADD PRODUCT ================= */
async function addProduct() {

    const name = document.getElementById("name").value;
    const category = document.getElementById("category").value;
    const brand = document.getElementById("brand").value;
    const cost = parseInt(document.getElementById("cost").value);
    const selling = parseInt(document.getElementById("selling").value);
    const stock = parseInt(document.getElementById("stock").value);
    const discount = parseInt(document.getElementById("discount").value);

    if (!name || !category || !brand || !cost || !selling || !stock) {
        alert("Please fill all fields");
        return;
    }



    await fetch("http://localhost:5000/add-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            product_name: name,
            category,
            brand,
            cost_price: cost,
            selling_price: selling,
            stock,
            discount,
            demand_count: 0
        })
    });

    showNotification(`✅ Product added! The new item has been added to your inventory.`, "success");

    loadProducts();

}


function clearForm() {

    document.getElementById("name").value = "";
    document.getElementById("category").value = "Mobile"; // default
    document.getElementById("brand").value = "";
    document.getElementById("cost").value = "";
    document.getElementById("selling").value = "";
    document.getElementById("stock").value = "";
    document.getElementById("discount").value = "";

}
/* ================= SEARCH ================= */
function searchProduct() {
    const keyword = document.getElementById("searchInput").value.toLowerCase();

    const filtered = allProducts.filter(p =>
        p.product_name.toLowerCase().includes(keyword)
    );

    renderProducts(filtered);
}

/* ================= CATEGORY ================= */
function populateCategories(products) {

    const select = document.getElementById("categoryFilter");

    // 🔥 SAVE CURRENT SELECTION
    const currentValue = select.value;

    const categories = [...new Set(products.map(p => p.category))];

    select.innerHTML = '<option value="all">All Categories</option>';

    categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });

    // 🔥 RESTORE PREVIOUS VALUE
    select.value = currentValue || "all";
}

/* ================= CHARTS ================= */
let chart;
function renderChart(products) {

    const ctx = document.getElementById("demandChart").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: products.map(p => p.product_name),
            datasets: [{
                label: "Demand Count",
                data: products.map(p => p.demand_count || 0),
                backgroundColor: "rgba(99, 102, 241, 0.7)",
                borderColor: "rgba(99, 102, 241, 1)",
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

let profitChart;
function renderProfitChart(products) {

    const ctx = document.getElementById("profitChart").getContext("2d");

    if (profitChart) profitChart.destroy();

    profitChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: products.map(p => p.product_name),
            datasets: [{
                label: "Profit (₹)",
                data: products.map(p => (p.selling_price || 0) - (p.cost_price || 0)),
                backgroundColor: "rgba(16, 185, 129, 0.7)",
                borderColor: "rgba(16, 185, 129, 1)",
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

let categoryChart;

function renderCategoryChart(products) {

    const ctx = document.getElementById("categoryChart");

    if (categoryChart) categoryChart.destroy();

    const categoryMap = {};

    products.forEach(p => {
        const cat = p.category || "Other";
        const demand = p.demand_count || 0;

        categoryMap[cat] = (categoryMap[cat] || 0) + demand;
    });

    categoryChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: Object.keys(categoryMap),
            datasets: [{
                data: Object.values(categoryMap),
                backgroundColor: [
                    "rgba(99, 102, 241, 0.7)",
                    "rgba(16, 185, 129, 0.7)",
                    "rgba(245, 158, 11, 0.7)",
                    "rgba(239, 68, 68, 0.7)",
                    "rgba(139, 92, 246, 0.7)"
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "bottom" }
            }
        }
    });
}


let trendChart;

function renderTrendChart(products) {

    const ctx = document.getElementById("trendChart").getContext("2d");

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: products.map(p => p.product_name),
            datasets: [{
                label: "Sales Trend",
                data: products.map(p => p.demand_count || 0),
                borderColor: "rgba(139, 92, 246, 1)",
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}


function renderLowStockTable(products) {

    const tbody = document.getElementById("lowStockTableBody");
    tbody.innerHTML = "";

    const lowStock = products.filter(p => (p.stock || 0) <= 5);

    lowStock.forEach(p => {

        const row = document.createElement("tr");

        row.innerHTML = `
<td>${p.product_name}</td>
<td>${p.stock || 0}</td>
<td>${p.demand_count || 0}</td>
<td><button onclick="addStock('${p._id}')">Reorder</button></td>
`;

        tbody.appendChild(row);

    });
}

/* ================= LOAD SALES FROM MONGODB ================= */
async function loadSalesHistory() {
    try {
        const res  = await fetch("http://localhost:5000/sales-history");
        salesHistory = await res.json();
        renderSalesHistory();
    } catch (err) {
        console.error("Failed to load sales history:", err);
    }
}

function renderSalesHistory() {
    const table = document.getElementById("salesTableBody");
    if (!table) return;

    table.innerHTML = "";
    let totalProfit = 0;

    salesHistory.forEach(sale => {
        const row = document.createElement("tr");

        // MongoDB stores product_name; legacy local records use name
        const name     = sale.product_name || sale.name || "-";
        const category = sale.category     || "-";
        const quantity = sale.quantity     || 1;
        const profit   = sale.profit       || 0;
        const date     = sale.sold_at
            ? new Date(sale.sold_at).toLocaleString()
            : (sale.date || "-");

        row.innerHTML = `
            <td>${name}</td>
            <td>${category}</td>
            <td>${quantity}</td>
            <td>₹${profit}</td>
            <td>${date}</td>
        `;

        table.appendChild(row);
        totalProfit += profit;
    });

    const totalSalesCountEl = document.getElementById("totalSalesCount");
    if(totalSalesCountEl) totalSalesCountEl.innerText = salesHistory.length;

    const totalSalesProfitValueEl = document.getElementById("totalSalesProfitValue");
    if(totalSalesProfitValueEl) totalSalesProfitValueEl.innerText = "₹" + totalProfit;
}


async function clearSales() {
    try {
        await fetch("http://localhost:5000/clear-sales", { method: "DELETE" });
        salesHistory = [];
        renderSalesHistory();
        showNotification("🗑️ All sales history has been cleared.", "error");
    } catch (err) {
        console.error("Failed to clear sales:", err);
    }
}

function downloadSales() {

    const selected = document.getElementById("salesCategoryFilter").value;

    let filtered = selected === "all"
        ? salesHistory
        : salesHistory.filter(s => s.category === selected);

    if (filtered.length === 0) {
        showNotification("⚠️ No sales data for the selected category.", "info");
        return;
    }

    let csv = "Product,Category,Quantity,Profit,Date\n";

    filtered.forEach(sale => {
        const name  = sale.product_name || sale.name || "";
        const date  = sale.sold_at
            ? new Date(sale.sold_at).toLocaleString()
            : (sale.date || "");
        csv += `${name},${sale.category},${sale.quantity},${sale.profit},${date}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = selected === "all" ? "Sales_Report.csv" : selected + "_Sales_Report.csv";
    a.click();
    window.URL.revokeObjectURL(url);
}
function filterSales() {

    const selected = document.getElementById("salesCategoryFilter").value;

    const filtered = selected === "all"
        ? salesHistory
        : salesHistory.filter(s => s.category === selected);

    renderFilteredSales(filtered);
}

function renderFilteredSales(data) {

    const table = document.getElementById("salesTableBody");
    table.innerHTML = "";

    let totalProfit = 0;

    data.forEach(sale => {
        const row = document.createElement("tr");

        const name  = sale.product_name || sale.name || "-";
        const date  = sale.sold_at
            ? new Date(sale.sold_at).toLocaleString()
            : (sale.date || "-");

        row.innerHTML = `
            <td>${name}</td>
            <td>${sale.category || "-"}</td>
            <td>${sale.quantity || 1}</td>
            <td>₹${sale.profit || 0}</td>
            <td>${date}</td>
        `;

        table.appendChild(row);
        totalProfit += sale.profit || 0;
    });

    const totalSalesCountEl = document.getElementById("totalSalesCount");
    if(totalSalesCountEl) totalSalesCountEl.innerText = data.length;

    const totalSalesProfitValueEl = document.getElementById("totalSalesProfitValue");
    if(totalSalesProfitValueEl) totalSalesProfitValueEl.innerText = "₹" + totalProfit;
}


function clearNotifications() {

    document.getElementById("notificationList").innerHTML = "";

    document.getElementById("notificationCount").innerText = "0";

}

function downloadReport() {

    const category = document.getElementById("analyticsCategory").value;

    let filtered = allProducts;

    if (category !== "all") {
        filtered = allProducts.filter(p => p.category === category);
    }

    let csv = "Product,Category,Brand,Cost,Selling,Stock,Demand,Profit\n";

    filtered.forEach(p => {

        const profit = (p.selling_price || 0) - (p.cost_price || 0);

        csv += `${p.product_name},${p.category},${p.brand},${p.cost_price},${p.selling_price},${p.stock},${p.demand_count},${profit}\n`;

    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;

    if (category === "all") {
        a.download = "electronics_inventory_report.csv";
    } else {
        a.download = category.toLowerCase() + "_inventory_report.csv";
    }

    a.click();

    window.URL.revokeObjectURL(url);
}

function filterAnalytics() {

    const category = document.getElementById("analyticsCategory").value;

    let filtered = allProducts;

    if (category !== "all") {
        filtered = allProducts.filter(p => p.category === category);
    }

    renderChart(filtered);
    renderProfitChart(filtered);
    renderCategoryChart(filtered);
    renderTrendChart(filtered);
    renderLowStockTable(filtered);

}

function toggleNotifications() {
    const panel = document.getElementById("notificationPanel");

    panel.style.display =
        panel.style.display === "block" ? "none" : "block";
}

function addNotification(message) {

    const list = document.getElementById("notificationList");

    const item = document.createElement("div");
    item.className = "notification-item";

    item.innerHTML = `
<span>${message}</span>
<button onclick="removeNotification(this)" class="delete-btn">✖</button>
`;

    list.prepend(item);

    const count = document.getElementById("notificationCount");
    count.innerText = list.children.length;

}

function removeNotification(btn) {

    const item = btn.parentElement;
    item.remove();

    const count = document.getElementById("notificationCount");
    count.innerText =
        document.getElementById("notificationList").children.length;

}

/* ================= POPUP NOTIFICATIONS ================= */
/**
 * Shows a modern sliding toast notification in the top right.
 */
function showNotification(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const iconMap  = { 
        success: '<i class="fa-solid fa-circle-check"></i>', 
        error: '<i class="fa-solid fa-circle-xmark"></i>', 
        info: '<i class="fa-solid fa-circle-info"></i>' 
    };
    const labelMap = { success: "Success", error: "Removed", info: "Updated" };

    toast.innerHTML = `
        <div class="toast-icon">${iconMap[type] || '<i class="fa-solid fa-bell"></i>'}</div>
        <div class="toast-body">
            <div class="toast-label">${labelMap[type] || "Notice"}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="dismissPopup(this)"><i class="fa-solid fa-xmark"></i></button>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("toast-show"));

    setTimeout(() => {
        if (toast.parentElement) dismissPopup(toast.querySelector(".toast-close"));
    }, 4000);
}

function dismissPopup(btn) {
    const toast = btn.closest(".toast");
    if (!toast) return;
    toast.classList.remove("toast-show");
    toast.classList.add("toast-hide");
    toast.addEventListener("transitionend", () => {
        toast.remove();
    }, { once: true });
}

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("collapsed");
    document.getElementById("mainContent").classList.toggle("expanded");
}
/* ================= INIT ================= */
window.onload = function () {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark");
    }
    document.getElementById("welcomeUser").innerHTML =
        "👋 <strong>Welcome, " +
        (localStorage.getItem("username") || "Admin") +
        "</strong> 🚀";

    loadProducts().then(() => {
        filterCategory();   // 🔥 keeps selected category
    });
};
function logout() {
    localStorage.removeItem("username");
    window.location.href = "login.html";
}
function toggleDarkMode() {

    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
        localStorage.setItem("theme", "dark");
    } else {
        localStorage.setItem("theme", "light");
    }

}

function showSection(section, element) {

    const sections = ["dashboardSection", "productsSection", "analyticsSection", "salesSection"];

    sections.forEach(s => {
        const el = document.getElementById(s);
        el.style.display = "none";
        el.classList.remove("fade-in");
    });

    document.querySelectorAll(".sidebar ul li").forEach(li => li.classList.remove("active"));
    if (element) element.classList.add("active");

    const target = document.getElementById(section + "Section");
    if (target) {
        target.style.display = "block";
        
        // Trigger DOM reflow to restart CSS animation
        void target.offsetWidth; 
        
        target.classList.add("fade-in");
    }

    if (section === "analytics") {
        filterAnalytics();
        renderChart(allProducts);
        renderProfitChart(allProducts);
        renderCategoryChart(allProducts);
        renderTrendChart(allProducts);
        renderLowStockTable(allProducts);
    }
    else if (section === "sales") {
        loadSalesHistory();   // 🔄 Always fetch fresh from MongoDB
    }
}