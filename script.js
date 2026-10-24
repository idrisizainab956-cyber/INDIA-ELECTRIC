                                                                                                                                                                                                                /* =========================================================
   INDIA ELECTRICALS
   COMPLETE SCRIPT.JS
   Services • Wiring • PVC • Cart • GST • Admin • WhatsApp
========================================================= */

"use strict";

/*
  IMPORTANT:
  1. Demo mode is disabled by default.
  2. Secure admin login and permanent product/image storage
     require a real backend API.
  3. Never publish passwords or secret API keys in this file.
*/

const IE_CONFIG = {
    apiBase: "",

    // Keep false on the public website.
    // A local-only demo must not be treated as secure authentication.
    demoMode: false,

    currency: "INR",
    whatsappNumber: "919454242450",

    endpoints: {
        login: "/api/auth/login",
        logout: "/api/auth/logout",
        products: "/api/products",
        business: "/api/business",
        orders: "/api/orders",
        tracking: "/api/orders/track",
        enquiries: "/api/enquiries"
    }
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

const money = amount =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: IE_CONFIG.currency,
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);

const safeNumber = value => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};

const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

function setMessage(selector, message, type = "info") {
    const element = $(selector);
    if (!element) return;

    element.textContent = message;
    element.dataset.status = type;
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
}

function setHidden(element, hidden) {
    if (element) element.hidden = Boolean(hidden);
}

function showPanel(selector) {
    const panel = $(selector);
    if (!panel) return;

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hidePanel(selector) {
    const panel = $(selector);
    if (panel) panel.hidden = true;
}

async function apiRequest(path, options = {}) {
    if (!IE_CONFIG.apiBase) {
        throw new Error("Backend API configure nahi hai.");
    }

    const headers = new Headers(options.headers || {});
    const isFormData = options.body instanceof FormData;

    if (!isFormData && options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(
        IE_CONFIG.apiBase.replace(/\/$/, "") + path,
        {
            ...options,
            headers,
            credentials: "include"
        }
    );

    const contentType = response.headers.get("content-type") || "";
    let result = null;

    if (contentType.includes("application/json")) {
        result = await response.json();
    } else {
        result = await response.text();
    }

    if (!response.ok) {
        const message =
            result && typeof result === "object" && result.message
                ? result.message
                : `Request failed (${response.status}).`;

        throw new Error(message);
    }

    return result;
}

/* =========================================================
   1. MAIN SERVICE BUTTONS
========================================================= */

function initServiceToggles() {
    const buttons = $$(".service-toggle");

    buttons.forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();

            const targetId = button.dataset.target;
            const target = targetId ? document.getElementById(targetId) : null;

            if (!target) {
                console.warn("Service panel not found:", targetId);
                return;
            }

            const shouldOpen = target.hidden;

            $$(".catalogue-section").forEach(panel => {
                panel.hidden = true;
            });

            buttons.forEach(otherButton => {
                otherButton.setAttribute("aria-expanded", "false");
            });

            if (shouldOpen) {
                target.hidden = false;
                button.setAttribute("aria-expanded", "true");

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest"
                });
            }
        });
    });
}

/* =========================================================
   2. NESTED WIRING AND PVC BUTTONS
========================================================= */

function initDetailToggles() {
    const buttons = $$(".detail-toggle");

    buttons.forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();

            // HTML uses data-detail. data-target is supported too.
            const targetId =
                button.dataset.detail ||
                button.dataset.target ||
                button.getAttribute("aria-controls");

            const target = targetId
                ? document.getElementById(targetId)
                : null;

            if (!target) {
                console.warn("Detail panel not found:", targetId);
                return;
            }

            const parent = button.closest(".catalogue-section");
            if (!parent) return;

            const shouldOpen = target.hidden;

            $$(".nested-detail", parent).forEach(panel => {
                panel.hidden = true;
            });

            $$(".detail-toggle", parent).forEach(otherButton => {
                otherButton.setAttribute("aria-expanded", "false");
            });

            if (shouldOpen) {
                target.hidden = false;
                button.setAttribute("aria-expanded", "true");
            }
        });
    });
}

/* =========================================================
   3. PRODUCT IMAGE ANIMATIONS
========================================================= */

function initImageAnimations() {
    const images = $$(
        ".product-grid img, #gallery img, #about img"
    );

    images.forEach(image => {
        image.style.transition = "transform 0.3s ease";

        image.addEventListener("mouseenter", () => {
            image.style.transform = "scale(1.035)";
        });

        image.addEventListener("mouseleave", () => {
            image.style.transform = "";
        });
    });
}

/* =========================================================
   4. SHOP PRODUCT STORAGE
========================================================= */

const CART_STORAGE_KEY = "ie_cart_v2";

let cart = [];

function loadCart() {
    try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];

        cart = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn("Cart could not be loaded.", error);
        cart = [];
    }
}

function saveCart() {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
        console.warn("Cart could not be saved.", error);
        setMessage(
            "#cartTaxNotice",
            "Cart save nahi ho saka. Browser storage check karein.",
            "error"
        );
    }
}

function productKey(product) {
    return String(product.id || product.productId || "");
}

function validProductForCart(product) {
    return (
        product &&
        productKey(product) &&
        safeNumber(product.price) >= 0 &&
        safeNumber(product.gstRate) >= 0 &&
        String(product.hsn || "").trim() !== ""
    );
}

function addToCart(product) {
    if (!validProductForCart(product)) {
        alert(
            "Is product ka valid price, HSN ya GST data available nahi hai. " +
            "Please admin se details confirm karein."
        );
        return;
    }

    const id = productKey(product);
    const existing = cart.find(item => productKey(item) === id);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id,
            name: String(product.name || product.productName || "Product"),
            brand: String(product.brand || ""),
            price: safeNumber(product.price),
            gstRate: safeNumber(product.gstRate),
            hsn: String(product.hsn),
            unit: String(product.unit || "piece"),
            quantity: 1
        });
    }

    saveCart();
    renderCart();

    setMessage("#cartTaxNotice", "Product cart mein add ho gaya.");
}

function updateCartQuantity(id, quantity) {
    const item = cart.find(product => productKey(product) === String(id));
    if (!item) return;

    const newQuantity = Math.floor(safeNumber(quantity));

    if (newQuantity <= 0) {
        removeFromCart(id);
        return;
    }

    item.quantity = Math.min(newQuantity, 9999);

    saveCart();
    renderCart();
}

function removeFromCart(id) {
    cart = cart.filter(item => productKey(item) !== String(id));
    saveCart();
    renderCart();
}

/*
  Prices are treated as GST-inclusive selling prices.
  Tax split is calculated from the inclusive amount.

  State comparison should use validated state codes in production.
*/

function getCartTotals() {
    let grossTotal = 0;
    let taxableValue = 0;
    let totalGST = 0;

    cart.forEach(item => {
        const gross = safeNumber(item.price) * safeNumber(item.quantity);
        const rate = safeNumber(item.gstRate);
        const divisor = 1 + rate / 100;

        const taxable = divisor > 0 ? gross / divisor : gross;
        const gst = gross - taxable;

        grossTotal += gross;
        taxableValue += taxable;
        totalGST += gst;
    });

    const sameState = isSameState();

    const cgst = sameState ? totalGST / 2 : 0;
    const sgst = sameState ? totalGST / 2 : 0;
    const igst = sameState ? 0 : totalGST;

    return {
        grossTotal,
        taxableValue,
        totalGST,
        cgst,
        sgst,
        igst,
        discount: 0,
        shipping: 0,
        otherCharges: 0,
        grandTotal: grossTotal
    };
}

function isSameState() {
    const billing = $("#billingState")?.value?.trim().toLowerCase();
    const delivery = $("#deliveryState")?.value?.trim().toLowerCase();

    if (!billing || !delivery) return true;

    return billing === delivery;
}

function renderCart() {
    const cartItems = $("#cartItems");
    if (!cartItems) return;

    const count = cart.reduce(
        (sum, item) => sum + safeNumber(item.quantity),
        0
    );

    const countElement = $("#cartCount");
    if (countElement) countElement.textContent = String(count);

    if (!cart.length) {
        cartItems.innerHTML =
            '<tr><td colspan="6">Your cart is currently empty.</td></tr>';
    } else {
        cartItems.innerHTML = cart.map(item => `
            <tr>
                <td>${escapeHTML(item.name)}</td>
                <td>${escapeHTML(item.brand || "—")}</td>
                <td>${money(item.price)}</td>
                <td>
                    <input
                        type="number"
                        min="1"
                        max="9999"
                        step="1"
                        value="${safeNumber(item.quantity)}"
                        data-cart-quantity="${escapeHTML(productKey(item))}"
                        aria-label="Quantity for ${escapeHTML(item.name)}"
                    >
                </td>
                <td>${money(item.price * item.quantity)}</td>
                <td>
                    <button
                        type="button"
                        data-cart-remove="${escapeHTML(productKey(item))}"
                    >Remove</button>
                </td>
            </tr>
        `).join("");
    }

    const totals = getCartTotals();

    const setText = (id, value) => {
        const element = $(id);
        if (element) element.textContent = value;
    };

    setText("#cartSubtotal", money(totals.grossTotal));
    setText("#cartDiscount", money(totals.discount));
    setText("#cartTaxableValue", money(totals.taxableValue));
    setText("#cartCGST", money(totals.cgst));
    setText("#cartSGST", money(totals.sgst));
    setText("#cartIGST", money(totals.igst));
    setText("#cartShipping", "To be confirmed");
    setText("#cartOtherCharges", "To be confirmed");
    setText("#cartGrandTotal", money(totals.grandTotal));

    setMessage(
        "#cartTaxNotice",
        "Estimate only. Final GST split, delivery charges, stock and payable amount must be verified by the server."
    );
}

function initCartEvents() {
    const cartItems = $("#cartItems");
    if (!cartItems) return;

    cartItems.addEventListener("change", event => {
        const input = event.target.closest("[data-cart-quantity]");
        if (!input) return;

        updateCartQuantity(
            input.dataset.cartQuantity,
            input.value
        );
    });

    cartItems.addEventListener("click", event => {
        const button = event.target.closest("[data-cart-remove]");
        if (!button) return;

        removeFromCart(button.dataset.cartRemove);
    });
}

/* =========================================================
   5. PUBLIC PRODUCT CATALOGUE
========================================================= */

function renderShopProducts(products) {
    const grid = $("#shopProductGrid");
    if (!grid) return;

    if (!Array.isArray(products) || products.length === 0) {
        grid.innerHTML = `
            <p id="shopEmptyMessage">
                Products will appear here when they are published by the admin.
            </p>
        `;
        return;
    }

    grid.innerHTML = products.map(product => {
        const id = productKey(product);
        const name = product.name || product.productName || "Product";
        const brand = product.brand || "";
        const price = safeNumber(product.price);
        const gstRate = safeNumber(product.gstRate);
        const hsn = product.hsn || "";

        /*
          Only render image URLs returned by the trusted backend.
          Do not inject untrusted HTML or arbitrary URL schemes.
        */
        const image = typeof product.imageUrl === "string" &&
            /^https?:\/\//i.test(product.imageUrl)
            ? product.imageUrl
            : "";

        return `
            <article class="product-card">
                ${
                    image
                    ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(name)}" loading="lazy">`
                    : `<div class="product-image" aria-label="No product photo">Photo not available</div>`
                }
                <h4>${escapeHTML(name)}</h4>
                <p>Brand: ${escapeHTML(brand || "—")}</p>
                <p>Price: ${money(price)}</p>
                <p>GST rate: ${gstRate}%</p>
                <p>HSN: ${escapeHTML(hsn || "—")}</p>
                <button
                    type="button"
                    data-shop-add="${escapeHTML(id)}"
                >Add to Cart</button>
            </article>
        `;
    }).join("");

    grid.addEventListener("click", event => {
        const button = event.target.closest("[data-shop-add]");
        if (!button) return;

        const product = products.find(
            item => productKey(item) === button.dataset.shopAdd
        );

        if (product) addToCart(product);
    }, { once: true });
}

async function loadPublicProducts() {
    if (!IE_CONFIG.apiBase) {
        renderShopProducts([]);
        return;
    }

    try {
        const result = await apiRequest(IE_CONFIG.endpoints.products);

        const products = Array.isArray(result)
            ? result
            : Array.isArray(result.products)
                ? result.products
                : [];

        renderShopProducts(products);
    } catch (error) {
        console.error("Product catalogue load failed:", error);
        renderShopProducts([]);
    }
}

/* =========================================================
   6. CHECKOUT AND ORDER REVIEW
========================================================= */

function initCheckout() {
    const form = $("#checkoutForm");
    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (!cart.length) {
            setMessage("#paymentStatus", "Pehle cart mein product add karein.", "error");
            return;
        }

        if (!form.reportValidity()) return;

        const data = new FormData(form);

        const customer = {
            name: String(data.get("customerName") || "").trim(),
            mobile: String(data.get("mobile") || "").trim(),
            email: String(data.get("email") || "").trim(),
            billingAddress: String(data.get("billingAddress") || "").trim(),
            billingState: String(data.get("billingState") || "").trim(),
            billingPincode: String(data.get("billingPincode") || "").trim(),
            deliveryAddress: String(data.get("deliveryAddress") || "").trim(),
            deliveryState: String(data.get("deliveryState") || "").trim(),
            deliveryPincode: String(data.get("deliveryPincode") || "").trim(),
            gstin: String(data.get("gstin") || "").trim()
        };

        const orderPayload = {
            customer,
            items: cart.map(item => ({
                productId: productKey(item),
                quantity: safeNumber(item.quantity)
            }))
        };

        if (!IE_CONFIG.apiBase) {
            setMessage(
                "#paymentStatus",
                "Order abhi submit nahi hua. Secure order processing ke liye backend configure karna zaroori hai.",
                "error"
            );
            return;
        }

        try {
            const result = await apiRequest(IE_CONFIG.endpoints.orders, {
                method: "POST",
                body: JSON.stringify(orderPayload)
            });

            setMessage(
                "#paymentStatus",
                result.message || "Order review server se receive ho gaya.",
                "success"
            );

            const review = $("#checkoutOrderReview");
            setHidden(review, false);

            const reviewItems = $("#checkoutReviewItems");
            if (reviewItems) {
                reviewItems.innerHTML = cart.map(item => `
                    <p>
                        ${escapeHTML(item.name)} × ${safeNumber(item.quantity)}
                        — ${money(item.price * item.quantity)}
                    </p>
                `).join("");
            }

            const finalAmount = $("#checkoutFinalAmount");
            if (finalAmount) {
                finalAmount.textContent =
                    result.grandTotal != null
                        ? `Server-confirmed total: ${money(result.grandTotal)}`
                        : "Final amount pending server confirmation.";
            }

            const payButton = $("#payNowButton");

            // Payment stays disabled until a verified payment session is returned.
            if (payButton) {
                const paymentUrl = result.paymentUrl;

                if (
                    typeof paymentUrl === "string" &&
                    /^https:\/\//i.test(paymentUrl) &&
                    result.paymentSessionVerified === true
                ) {
                    payButton.disabled = false;
                    payButton.dataset.paymentUrl = paymentUrl;
                } else {
                    payButton.disabled = true;
                    delete payButton.dataset.paymentUrl;
                }
            }
        } catch (error) {
            setMessage("#paymentStatus", error.message, "error");
        }
    });

    const payButton = $("#payNowButton");
    if (payButton) {
        payButton.addEventListener("click", () => {
            const paymentUrl = payButton.dataset.paymentUrl;

            if (!paymentUrl || payButton.disabled) {
                setMessage(
                    "#paymentMessage",
                    "Verified payment session abhi available nahi hai.",
                    "error"
                );
                return;
            }

            // Only use a secure payment URL returned by the backend.
            window.location.assign(paymentUrl);
        });
    }
}

/* =========================================================
   7. ENQUIRY FORM -> WHATSAPP
========================================================= */

function initEnquiryForm() {
    const form = $("#enquiryForm");
    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (!form.reportValidity()) return;

        const name = $("#customerName")?.value.trim() || "";
        const phone = $("#customerPhone")?.value.trim() || "";
        const service = $("#customerService")?.value || "";
        const message = $("#customerMessage")?.value.trim() || "";

        const text = [
            "Hello India Electricals,",
            "",
            `Name: ${name}`,
            `Mobile: ${phone}`,
            `Service: ${service}`,
            `Requirement: ${message}`
        ].join("\n");

        if (IE_CONFIG.apiBase) {
            try {
                await apiRequest(IE_CONFIG.endpoints.enquiries, {
                    method: "POST",
                    body: JSON.stringify({ name, phone, service, message })
                });
            } catch (error) {
                console.warn("Enquiry backend submission failed:", error);
            }
        }

        const url =
            "https://wa.me/" +
            IE_CONFIG.whatsappNumber +
            "?text=" +
            encodeURIComponent(text);

        window.open(url, "_blank", "noopener,noreferrer");
    });
}

/* =========================================================
   8. ADMIN LOGIN
========================================================= */

function initAdminLogin() {
    const openButton = $("#adminLoginButton");
    const closeButton = $("#closeAdminLogin");
    const form = $("#adminLoginForm");

    openButton?.addEventListener("click", () => {
        showPanel("#adminLoginPanel");
        setMessage("#adminLoginMessage", "Sign in with an authorized account.");
    });

    closeButton?.addEventListener("click", () => {
        hidePanel("#adminLoginPanel");
    });

    form?.addEventListener("submit", async event => {
        event.preventDefault();

        const email = $("#adminEmail")?.value.trim() || "";
        const password = $("#adminPassword")?.value || "";

        if (!email || !password) {
            setMessage("#adminLoginMessage", "Email aur password enter karein.", "error");
            return;
        }

        if (!IE_CONFIG.apiBase) {
            setMessage(
                "#adminLoginMessage",
                "Secure admin login available nahi hai. Pehle backend authentication configure karein. Public website par frontend-only password secure nahi hota.",
                "error"
            );
            return;
        }

        try {
            const result = await apiRequest(IE_CONFIG.endpoints.login, {
                method: "POST",
                body: JSON.stringify({ email, password })
            });

            if (result.authenticated !== true) {
                throw new Error("Admin authentication verify nahi hua.");
            }

            hidePanel("#adminLoginPanel");
            showPanel("#adminDashboard");

            setMessage(
                "#adminLoginMessage",
                "Login successful.",
                "success"
            );

            const roleLabel = $("#adminRoleLabel");
            if (roleLabel && result.role) {
                roleLabel.textContent = `Authorized role: ${result.role}`;
            }

            await loadAdminProducts();
        } catch (error) {
            setMessage("#adminLoginMessage", error.message, "error");
        } finally {
            const passwordField = $("#adminPassword");
            if (passwordField) passwordField.value = "";
        }
    });

    $("#adminLogoutButton")?.addEventListener("click", async () => {
        try {
            if (IE_CONFIG.apiBase) {
                await apiRequest(IE_CONFIG.endpoints.logout, {
                    method: "POST"
                });
            }
        } catch (error) {
            console.warn("Logout request failed:", error);
        }

        hidePanel("#adminDashboard");
        hidePanel("#adminLoginPanel");

        const formElement = $("#adminLoginForm");
        formElement?.reset();
    });
}

/* =========================================================
   9. PRODUCT PHOTO PREVIEW
========================================================= */

let currentPreviewUrl = null;

function initProductImagePreview() {
    const input = $("#adminProductImage");
    const preview = $("#adminImagePreview");

    if (!input || !preview) return;

    input.addEventListener("change", () => {
        const file = input.files?.[0];

        if (currentPreviewUrl) {
            URL.revokeObjectURL(currentPreviewUrl);
            currentPreviewUrl = null;
        }

        if (!file) {
            preview.removeAttribute("src");
            preview.hidden = true;
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            input.value = "";
            preview.removeAttribute("src");
            preview.hidden = true;

            setMessage(
                "#adminProductMessage",
                "JPG, PNG ya WebP image select karein.",
                "error"
            );
            return;
        }

        const maxSize = 5 * 1024 * 1024;

        if (file.size > maxSize) {
            input.value = "";
            preview.removeAttribute("src");
            preview.hidden = true;

            setMessage(
                "#adminProductMessage",
                "Photo ka size 5 MB se kam rakhein.",
                "error"
            );
            return;
        }

        currentPreviewUrl = URL.createObjectURL(file);
        preview.src = currentPreviewUrl;
        preview.hidden = false;

        setMessage(
            "#adminProductMessage",
            "Photo preview ready hai. Permanent upload ke liye backend storage chahiye."
        );
    });
}

/* =========================================================
   10. ADMIN PRODUCT UPLOAD
========================================================= */

function initProductUpload() {
    const form = $("#productUploadForm");
    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (!form.reportValidity()) return;

        if (!IE_CONFIG.apiBase) {
            setMessage(
                "#adminProductMessage",
                "Product save nahi hua. Permanent product records aur photos ke liye backend/database configure karna zaroori hai.",
                "error"
            );
            return;
        }

        const file = $("#adminProductImage")?.files?.[0] || null;
        const formData = new FormData();

        formData.append("id", $("#adminProductId")?.value || "");
        formData.append("service", $("#adminProductService")?.value || "");
        formData.append("brand", $("#adminProductBrand")?.value.trim() || "");
        formData.append("series", $("#adminProductSeries")?.value.trim() || "");
        formData.append("name", $("#adminProductName")?.value.trim() || "");
        formData.append("price", $("#adminProductPrice")?.value || "");
        formData.append("hsn", $("#adminProductHSN")?.value.trim() || "");
        formData.append("gstRate", $("#adminProductGSTRate")?.value || "");
        formData.append("unit", $("#adminProductUnit")?.value || "");
        formData.append("stock", $("#adminProductStock")?.value || "0");
        formData.append("packLength", $("#adminProductPackLength")?.value || "");
        formData.append(
            "cableCuttingRestrictions",
            $("#adminProductCableCutting")?.value.trim() || ""
        );
        formData.append(
            "description",
            $("#adminProductDescription")?.value.trim() || ""
        );

        if (file) {
            formData.append("image", file);
        }

        try {
            const id = $("#adminProductId")?.value.trim();
            const path = IE_CONFIG.endpoints.products + (id ? `/${encodeURIComponent(id)}` : "");
            const method = id ? "PUT" : "POST";

            await apiRequest(path, {
                method,
                body: formData
            });

            setMessage(
                "#adminProductMessage",
                "Product backend par save ho gaya.",
                "success"
            );

            form.reset();

            const preview = $("#adminImagePreview");
            if (preview) {
                preview.removeAttribute("src");
                preview.hidden = true;
            }

            if (currentPreviewUrl) {
                URL.revokeObjectURL(currentPreviewUrl);
                currentPreviewUrl = null;
            }

            await loadAdminProducts();
            await loadPublicProducts();
        } catch (error) {
            setMessage("#adminProductMessage", error.message, "error");
        }
    });
}

/* =========================================================
   11. ADMIN PRODUCT LIST
========================================================= */

async function loadAdminProducts() {
    const list = $("#adminProductList");
    if (!list || !IE_CONFIG.apiBase) return;

    try {
        const result = await apiRequest(IE_CONFIG.endpoints.products);

        const products = Array.isArray(result)
            ? result
            : Array.isArray(result.products)
                ? result.products
                : [];

        renderAdminProducts(products);
    } catch (error) {
        console.error("Admin products load failed:", error);
        list.textContent = "Products load nahi ho sake. Backend response check karein.";
    }
}

function renderAdminProducts(products) {
    const list = $("#adminProductList");
    if (!list) return;

    if (!products.length) {
        list.innerHTML = "<p>Abhi koi saved product nahi hai.</p>";
        return;
    }

    list.innerHTML = products.map(product => {
        const id = productKey(product);

        return `
            <article class="product-card">
                <h4>${escapeHTML(product.name || product.productName || "Product")}</h4>
                <p>Brand: ${escapeHTML(product.brand || "—")}</p>
                <p>Price: ${money(product.price)}</p>
                <p>HSN: ${escapeHTML(product.hsn || "—")}</p>
                <p>GST: ${safeNumber(product.gstRate)}%</p>
                <p>Stock: ${safeNumber(product.stock)}</p>
                <button type="button" data-product-edit="${escapeHTML(id)}">Edit</button>
                <button type="button" data-product-delete="${escapeHTML(id)}">Delete</button>
            </article>
        `;
    }).join("");

    list.onclick = async event => {
        const editButton = event.target.closest("[data-product-edit]");
        const deleteButton = event.target.closest("[data-product-delete]");

        if (editButton) {
            const product = products.find(
                item => productKey(item) === editButton.dataset.productEdit
            );

            if (product) populateProductForm(product);
        }

        if (deleteButton) {
            const id = deleteButton.dataset.productDelete;

            if (!confirm("Kya aap is product ko delete karna chahte hain?")) {
                return;
            }

            try {
                await apiRequest(
                    IE_CONFIG.endpoints.products + "/" + encodeURIComponent(id),
                    { method: "DELETE" }
                );

                await loadAdminProducts();
                await loadPublicProducts();
            } catch (error) {
                setMessage("#adminProductMessage", error.message, "error");
            }
        }
    };
}

function populateProductForm(product) {
    const fields = {
        "#adminProductId": product.id || product.productId,
        "#adminProductService": product.service,
        "#adminProductBrand": product.brand,
        "#adminProductSeries": product.series,
        "#adminProductName": product.name || product.productName,
        "#adminProductPrice": product.price,
        "#adminProductHSN": product.hsn,
        "#adminProductGSTRate": product.gstRate,
        "#adminProductUnit": product.unit,
        "#adminProductStock": product.stock,
        "#adminProductPackLength": product.packLength,
        "#adminProductCableCutting": product.cableCuttingRestrictions,
        "#adminProductDescription": product.description
    };

    Object.entries(fields).forEach(([selector, value]) => {
        const element = $(selector);
        if (element && value != null) element.value = String(value);
    });

    setMessage(
        "#adminProductMessage",
        "Product edit mode mein hai. Photo change karna optional hai."
    );

    $("#productUploadForm")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

/* =========================================================
   12. BUSINESS AND GST SETTINGS
========================================================= */

function initBusinessSettings() {
    const form = $("#adminBusinessSettingsForm");
    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (!IE_CONFIG.apiBase) {
            setMessage(
                "#businessSettingsMessage",
                "Business details save karne ke liye secure backend configure karein.",
                "error"
            );
            return;
        }

        const payload = {
            legalName: $("#businessLegalName")?.value.trim() || "",
            registeredAddress: $("#businessRegisteredAddress")?.value.trim() || "",
            gstin: $("#businessGSTIN")?.value.trim() || "",
            stateCode: $("#businessStateCode")?.value.trim() || ""
        };

        if (!payload.legalName || !payload.registeredAddress || !payload.gstin) {
            setMessage(
                "#businessSettingsMessage",
                "Business legal name, registered address aur GSTIN required hain.",
                "error"
            );
            return;
        }

        try {
            await apiRequest(IE_CONFIG.endpoints.business, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            setMessage(
                "#businessSettingsMessage",
                "Business settings save ho gayi.",
                "success"
            );
        } catch (error) {
            setMessage("#businessSettingsMessage", error.message, "error");
        }
    });
}

/* =========================================================
   13. ORDER TRACKING
========================================================= */

function initOrderTracking() {
    const form = $("#orderTrackingForm");
    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const orderId = $("#trackingOrderId")?.value.trim() || "";
        const mobile = $("#trackingMobile")?.value.trim() || "";

        if (!orderId || !mobile) {
            setMessage(
                "#orderTrackingResult",
                "Order ID aur mobile number enter karein.",
                "error"
            );
            return;
        }

        if (!IE_CONFIG.apiBase) {
            setMessage(
                "#orderTrackingResult",
                "Order tracking backend configure hone ke baad available hoga.",
                "error"
            );
            return;
        }

        try {
            const result = await apiRequest(IE_CONFIG.endpoints.tracking, {
                method: "POST",
                body: JSON.stringify({ orderId, mobile })
            });

            setMessage(
                "#orderTrackingResult",
                `Order status: ${result.status || "Update unavailable"}`,
                "success"
            );
        } catch (error) {
            setMessage("#orderTrackingResult", error.message, "error");
        }
    });
}

/* =========================================================
   14. FOOTER YEAR
========================================================= */

function initFooterYear() {
    const year = $("#currentYear");
    if (year) year.textContent = String(new Date().getFullYear());
}

/* =========================================================
   15. INITIALISE WEBSITE
========================================================= */

function initIndiaElectricals() {
    initServiceToggles();
    initDetailToggles();
    initImageAnimations();

    loadCart();
    renderCart();
    initCartEvents();

    initCheckout();
    initEnquiryForm();

    initAdminLogin();
    initProductImagePreview();
    initProductUpload();
    initBusinessSettings();

    initOrderTracking();
    initFooterYear();

    loadPublicProducts();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initIndiaElectricals,
        { once: true }
    );
} else {
    initIndiaElectricals();
}
// INDIA ELECTRICALS - SOLAR CATEGORY NAVIGATION

(function () {
    const solarSection = document.getElementById("solar");

    if (!solarSection) return;

    const buttons = solarSection.querySelectorAll(
        ".solar-category-btn"
    );

    const title = document.getElementById("solarSelectedTitle");
    const description = document.getElementById(
        "solarCategoryDescription"
    );

    const solarCategories = {
        "1kw": {
            title: "1 kW Solar Kit",
            description: "Explore available 1 kW solar kits."
        },
        "2kw": {
            title: "2 kW Solar Kit",
            description: "Explore available 2 kW solar kits."
        },
        "3kw": {
            title: "3 kW Solar Kit",
            description: "Explore available 3 kW solar kits."
        },
        "5kw": {
            title: "5 kW Solar Kit",
            description: "Explore available 5 kW solar kits."
        },
        "10kw": {
            title: "10 kW Solar Kit",
            description: "Explore available 10 kW solar kits."
        },
        "on-grid": {
            title: "On-Grid Solar System",
            description: "Explore grid-connected solar systems."
        },
        "off-grid": {
            title: "Off-Grid Solar System",
            description: "Explore solar systems with battery backup."
        },
        "hybrid": {
            title: "Hybrid Solar System",
            description: "Explore hybrid solar system options."
        },
        "panels": {
            title: "Solar Panels",
            description: "Explore available solar panels and specifications."
        },
        "inverter-battery": {
            title: "Solar Inverter & Battery",
            description: "Explore solar inverters and compatible batteries."
        },
        "accessories": {
            title: "Solar Accessories",
            description: "Explore solar cables, connectors and mounting accessories."
        },
        "installation": {
            title: "Solar Installation Services",
            description: "Contact India Electricals for installation details and quotations."
        }
    };

    buttons.forEach(function (button) {
        button.addEventListener("click", function () {
            const category = button.dataset.solarCategory;
            const selected = solarCategories[category];

            if (!selected) return;

            buttons.forEach(function (item) {
                item.classList.remove("active");
            });

            button.classList.add("active");

            title.textContent = selected.title;
            description.textContent = selected.description;

            /*
             * Product loading from Supabase will be connected here.
             * The selected category must match the product's
             * saved subcategory in the database.
             */
            solarSection.dispatchEvent(
                new CustomEvent("solar-category-change", {
                    detail: { category: category }
                })
            );
        });
    });
})();

const civilWorkItems = [
    {
        
rcc: {
    title: "RCC Work",
    description: "Explore our RCC Work services. Contact India Electricals for your project requirements.",
    photos: [
        {
            url: "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcSqoYXLt_4MCc9lLRkIzPW96-mDQbq5SXD2XDuSLaPac0YZyKw7igmMXY9EwTt_JkZnkvuZVRNDC33ZXACon4jnDzMxMGIcaeVV89gezPYX36zkHo5rwy7l",
            name: "RCC Work"
        }
    ]
},

    },
    {
        name: "Brick Work",
        description: "Brick masonry aur wall construction work.",
        photos: []
    },
    {
        name: "Plaster Work",
        description: "Interior aur exterior plaster work.",
        photos: []
    },
    {
        name: "Flooring Work",
        description: "Flooring aur floor finishing work.",
        photos: []
    },
    {
        name: "Tile Work",
        description: "Wall aur floor tile installation work.",
        photos: []
    },
    {
        name: "Waterproofing",
        description: "Roof, terrace aur seepage waterproofing work.",
        photos: []
    },
    {
        name: "Boundary Wall",
        description: "Boundary wall construction aur related work.",
        photos: []
    },
    {
        name: "Repair & Renovation",
        description: "Ghar aur building repair aur renovation work.",
        photos: []
    }
];

const civilButtons = document.getElementById("civilWorkButtons");
const civilDetails = document.getElementById("civilWorkDetails");
const civilTitle = document.getElementById("civilWorkTitle");
const civilDescription = document.getElementById("civilWorkDescription");
const civilPhotos = document.getElementById("civilWorkPhotos");
const civilWhatsApp = document.getElementById("civilWorkWhatsApp");

if (civilButtons && civilDetails) {
    civilWorkItems.forEach((work) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "civil-work-btn";
        button.textContent = work.name;

        button.addEventListener("click", () => {
            civilButtons.querySelectorAll("button")
                .forEach(btn => btn.classList.remove("active"));

            button.classList.add("active");

            civilDetails.hidden = false;
            civilTitle.textContent = work.name;
            civilDescription.textContent = work.description;

            civilPhotos.replaceChildren();

            if (work.photos.length > 0) {
                work.photos.forEach((photoUrl) => {
                    const image = document.createElement("img");

                    image.src = photoUrl;
                    image.alt = work.name;
                    image.className = "civil-work-photo";
                    image.loading = "lazy";

                    civilPhotos.appendChild(image);
                });
            } else {
                const placeholder = document.createElement("div");

                placeholder.className = "civil-photo-placeholder";
                placeholder.textContent = "Is work ki photo baad mein add hogi.";

                civilPhotos.appendChild(placeholder);
            }

            const message =
                "Hello India Electricals, mujhe " +
                work.name +
                " ke liye enquiry karni hai.";

            civilWhatsApp.href =
                "https://wa.me/919454242450?text=" +
                encodeURIComponent(message);
        });
        
        civilButtons.appendChild(button);
    });
}

function initCivilWorkButtons() {
    const section = document.getElementById("civil");
    if (!section || section.dataset.civilInitialized === "true") return;

    section.dataset.civilInitialized = "true";

    const buttons = section.querySelectorAll(".civil-category-btn");
    const content = document.getElementById("civilSelectedContent");
    const title = document.getElementById("civilSelectedTitle");
    const description = document.getElementById("civilSelectedDescription");
    const photoGrid = document.getElementById("civilPhotoGrid");

    if (!content || !title || !description || !photoGrid) {
        console.error("Civil Works HTML elements are missing.");
        return;
    }

    const categories = {
        rcc: {
            title: "RCC Work",
            description: "RCC construction services. Contact us for your project requirements.",
            photos: []
        },
        brick: {
            title: "Brick Work",
            description: "Brick masonry work for residential and commercial projects.",
            photos: []
        },
        plaster: {
            title: "Plastering",
            description: "Wall and ceiling plastering services.",
            photos: []
        },
        flooring: {
            title: "Flooring",
            description: "Floor preparation and flooring work.",
            photos: []
        },
        tiling: {
            title: "Tiling",
            description: "Wall and floor tile installation services.",
            photos: []
        },
        renovation: {
            title: "Renovation",
            description: "Repair, renovation and improvement work.",
            photos: []
        },
        repair: {
            title: "Structural Repair",
            description: "Discuss your structural repair requirements with our team.",
            photos: []
        }
    };

    const whatsappNumber = "919454242450";

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            const category = categories[button.dataset.civilCategory];
            if (!category) return;

            buttons.forEach(item => item.classList.remove("active"));
            button.classList.add("active");

            title.textContent = category.title;
            description.textContent = category.description;
            content.hidden = false;
            photoGrid.replaceChildren();

            if (category.photos.length === 0) {
                const note = document.createElement("p");
                note.textContent = "Photos will appear here after photo links are added.";
                photoGrid.appendChild(note);
            }

            category.photos.forEach((photo, index) => {
                const card = document.createElement("article");
                card.className = "civil-photo-card";

                const img = document.createElement("img");
                img.src = photo.url;
                img.alt = photo.name || category.title;
                img.loading = "lazy";
                card.appendChild(img);

                const name = document.createElement("h5");
                name.textContent = photo.name || `${category.title} Photo ${index + 1}`;
                card.appendChild(name);

                if (photo.price) {
                    const price = document.createElement("p");
                    price.textContent = `Service charge: ${photo.price}`;
                    card.appendChild(price);
                }

                const enquiry = document.createElement("a");
                enquiry.className = "civil-enquiry-btn";
                enquiry.href =
                    `https://wa.me/${whatsappNumber}?text=` +
                    encodeURIComponent(
                        `Hello India Electricals, I want to enquire about ${category.title}` +
                        ` - ${name.textContent}.`
                    );
                enquiry.target = "_blank";
                enquiry.rel = "noopener noreferrer";
                enquiry.textContent =
    category.title === "RCC Work"
        ? "Explore on WhatsApp"
        : "WhatsApp Enquiry";
                card.appendChild(enquiry);

                photoGrid.appendChild(card);
            });

            content.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });
        });
    });
}

