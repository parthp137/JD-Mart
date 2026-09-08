(() => {
  "use strict";

  // ================= DOM CACHE =================
  const dropdown = document.getElementById("userDropdown");
  const locationText = document.getElementById("locationText");
  const searchInput = document.getElementById("productSearch");
  const productLinks = document.querySelectorAll(".product-link");
  const defaultAddress = document.getElementById("defaultAddress");
  const searchContainer = searchInput?.closest(".navbar-search") || null;

  // Category Buttons
  const categoryButtons = document.querySelectorAll(".cat-btn");

  // ================= USER DROPDOWN =================
  if (dropdown) {
    document.addEventListener("click", (e) => {
      dropdown.classList.toggle("active", dropdown.contains(e.target));
    });
  }

  // ================= GEO LOCATION =================
  async function getLocationAndSave() {
    if (!navigator.geolocation || !locationText) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );

        const data = await res.json();
        const addr = data.address || {};

        const area = addr.suburb || addr.village || "";
        const city = addr.city || addr.town || addr.state || "";
        const country = addr.country || "";

        const fullAddress = `${area ? area + ", " : ""}${city}, ${country}`;

        // Show in navbar
        locationText.textContent = fullAddress;

        // Store for backend if exists
        if (defaultAddress) {
          defaultAddress.value = fullAddress;
        }
      } catch (err) {
        console.error("Location error:", err);
        locationText.textContent = "Location unavailable";
      }
    });
  }

  // ================= SEARCH FILTER =================
  if (searchInput) {
    const products = Array.from(productLinks).map((link) => {
      const name = link.querySelector(".jd-product-name")?.innerText.trim() || "";
      const category = link.querySelector(".jd-category")?.innerText.trim() || "";
      const description = link.dataset.search || "";

      return {
        name,
        category,
        description,
        url: link.getAttribute("href") || "#",
        searchableText: `${name} ${category} ${description}`.toLowerCase()
      };
    });

    let activeIndex = -1;
    let filteredSuggestions = [];
    const suggestionBox = document.createElement("div");
    suggestionBox.className = "search-suggestions hidden";
    suggestionBox.innerHTML = "<ul></ul>";
    searchContainer?.appendChild(suggestionBox);

    const suggestionList = suggestionBox.querySelector("ul");

    const hideSuggestions = () => {
      activeIndex = -1;
      filteredSuggestions = [];
      suggestionBox.classList.add("hidden");
      suggestionList.innerHTML = "";
    };

    const renderSuggestions = (query) => {
      const normalized = query.trim().toLowerCase();

      if (!normalized || !products.length) {
        hideSuggestions();
        return;
      }

      filteredSuggestions = products
        .filter((product) => product.searchableText.includes(normalized))
        .slice(0, 8);

      if (!filteredSuggestions.length) {
        hideSuggestions();
        return;
      }

      suggestionBox.classList.remove("hidden");
      suggestionList.innerHTML = filteredSuggestions
        .map(
          (product, index) => `
            <li class="${index === activeIndex ? "active" : ""}" data-index="${index}">
              <div class="search-suggestion-main">
                <span class="search-suggestion-name">${product.name}</span>
                <span class="search-suggestion-meta">${product.category}</span>
              </div>
              <span class="search-suggestion-badge">Open</span>
            </li>
          `
        )
        .join("");
    };

    const openSuggestion = (index) => {
      const product = filteredSuggestions[index];
      if (!product) return;
      window.location.href = product.url;
    };

    const applySearch = () => {
      const query = searchInput.value.trim();

      if (filteredSuggestions.length && activeIndex >= 0) {
        openSuggestion(activeIndex);
        return;
      }

      const params = new URLSearchParams(window.location.search);

      if (query) {
        params.set("search", query);
      } else {
        params.delete("search");
      }

      params.set("page", "1");
      window.location.href = `/products?${params.toString()}`;
    };

    searchInput.addEventListener("input", () => {
      activeIndex = -1;
      renderSuggestions(searchInput.value);
    });

    searchInput.addEventListener("focus", () => {
      renderSuggestions(searchInput.value);
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!filteredSuggestions.length) return;
        activeIndex = (activeIndex + 1) % filteredSuggestions.length;
        renderSuggestions(searchInput.value);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!filteredSuggestions.length) return;
        activeIndex = (activeIndex - 1 + filteredSuggestions.length) % filteredSuggestions.length;
        renderSuggestions(searchInput.value);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        applySearch();
        return;
      }

      if (event.key === "Escape") {
        hideSuggestions();
      }
    });

    suggestionBox.addEventListener("click", (event) => {
      const item = event.target.closest("li[data-index]");
      if (!item) return;
      const index = Number(item.dataset.index);
      openSuggestion(index);
    });

    document.addEventListener("click", (event) => {
      if (!searchContainer?.contains(event.target)) {
        hideSuggestions();
      }
    });

    // ================= RECENT SEARCHES =================
    const saveRecentSearch = (query) => {
      if (!query.trim()) return;
      try {
        let recentSearches = JSON.parse(localStorage.getItem("recentSearches") || "[]");
        recentSearches = recentSearches.filter(s => s.toLowerCase() !== query.toLowerCase());
        recentSearches.unshift(query);
        recentSearches = recentSearches.slice(0, 5); // Keep last 5
        localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
      } catch (e) {
        console.error("Error saving recent search:", e);
      }
    };

    const showRecentSearches = () => {
      if (searchInput.value.trim()) return;
      try {
        const recentSearches = JSON.parse(localStorage.getItem("recentSearches") || "[]");
        if (!recentSearches.length) return;
        
        suggestionList.innerHTML = recentSearches.map((search, idx) => 
          `<li class="recent-search-item" data-idx="${idx}">
            <i class="fa-solid fa-history" style="margin-right: 0.5rem; color: #9ca3af;"></i>
            <strong>${search}</strong>
          </li>`
        ).join("");
        
        suggestionBox.classList.remove("hidden");
        
        suggestionList.querySelectorAll(".recent-search-item").forEach((item) => {
          item.addEventListener("click", () => {
            searchInput.value = item.textContent.trim();
            searchInput.form?.submit();
          });
        });
      } catch (e) {
        console.error("Error showing recent searches:", e);
      }
    };

    searchInput.addEventListener("focus", showRecentSearches);

    // Save search on form submit
    searchInput.closest("form")?.addEventListener("submit", () => {
      saveRecentSearch(searchInput.value);
    });
  }

  // ================= CATEGORY FILTER =================
  if (categoryButtons.length) {
    categoryButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        categoryButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const selectedCategory = btn.dataset.category;
        const params = new URLSearchParams(window.location.search);

        if (selectedCategory === "all") {
          params.delete("category");
        } else {
          params.set("category", selectedCategory);
        }

        params.set("page", "1");
        window.location.href = `/products?${params.toString()}`;
      });
    });
  }

  // ================= INIT =================
  getLocationAndSave();

  // Highlight active mobile bottom nav item
  const currentPath = window.location.pathname;
  if (currentPath === "/" || currentPath === "/products") {
    document.getElementById("navHome")?.classList.add("active");
    document.getElementById("navCatalog")?.classList.add("active");
  } else if (currentPath.startsWith("/rfq")) {
    document.getElementById("navRfqs")?.classList.add("active");
  } else if (currentPath.startsWith("/orders")) {
    document.getElementById("navOrders")?.classList.add("active");
  } else if (currentPath.startsWith("/cart")) {
    document.getElementById("navCart")?.classList.add("active");
  }
})();

/* ==========================================================================
   GLOBAL UI/UX ENHANCEMENT HANDLERS (JD MART)
   ========================================================================== */

// 2. CROP QUALITY & HARVEST INSPECTION MODAL HANDLER
window.openCropInspection = function(cropName, grade, category, moisture, supplier) {
  const modalElem = document.getElementById("cropInspectionModal");
  if (!modalElem) return;

  const modalCropName = document.getElementById("modalCropName");
  const modalCropGrade = document.getElementById("modalCropGrade");
  const modalCropCategory = document.getElementById("modalCropCategory");
  const modalMoistureVal = document.getElementById("modalMoistureVal");
  const modalMoistureMeter = document.getElementById("modalMoistureMeter");
  const modalSupplierName = document.getElementById("modalSupplierName");
  const modalHarvestDate = document.getElementById("modalHarvestDate");

  if (modalCropName) modalCropName.textContent = cropName || "Agricultural Commodity";
  if (modalCropGrade) modalCropGrade.textContent = `Grade ${grade || 'A'} Quality`;
  if (modalCropCategory) modalCropCategory.textContent = category || "Mandi Certified";
  if (modalMoistureVal) modalMoistureVal.textContent = `${moisture || '11.8%'} (APMC Standard: <14%)`;
  if (modalMoistureMeter) {
    const moistNum = parseFloat(moisture) || 12;
    const fillPercent = Math.min(100, Math.max(20, (moistNum / 15) * 100));
    modalMoistureMeter.style.width = `${fillPercent}%`;
  }
  if (modalSupplierName) modalSupplierName.textContent = supplier || "APMC Mandi Verified Lot";
  if (modalHarvestDate) {
    const today = new Date();
    const formatted = today.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
    modalHarvestDate.textContent = `Harvested ${formatted}`;
  }

  // Open Bootstrap modal
  if (window.bootstrap && bootstrap.Modal) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalElem);
    modal.show();
  }
};

// 3. SLIDE-OUT INSTANT RFQ DRAWER HANDLERS
let currentDrawerListedRate = 0;

window.openRfqDrawer = function(productId, productName, listedRate, defaultLocation) {
  const drawer = document.getElementById("jdRfqDrawer");
  const backdrop = document.getElementById("jdRfqBackdrop");
  if (!drawer) return;

  currentDrawerListedRate = parseFloat(listedRate) || 0;

  const idInput = document.getElementById("drawerProductId");
  const nameElem = document.getElementById("drawerProductName");
  const rateElem = document.getElementById("drawerListedRate");
  const qtyInput = document.getElementById("drawerQuantity");
  const targetPriceInput = document.getElementById("drawerTargetPrice");
  const locationInput = document.getElementById("drawerLocation");

  if (idInput) idInput.value = productId || "";
  if (nameElem) nameElem.textContent = productName || "Selected Commodity";
  if (rateElem) rateElem.textContent = `₹${currentDrawerListedRate.toFixed(2)}/quintal`;
  if (qtyInput) qtyInput.value = 50; // default wholesale sample
  if (targetPriceInput) targetPriceInput.value = Math.round(currentDrawerListedRate * 0.92); // default proposed 8% discount
  if (locationInput && !locationInput.value) locationInput.value = defaultLocation || "";

  window.recalcDrawerOffer();

  drawer.classList.add("open");
  if (backdrop) backdrop.classList.add("open");
  document.body.style.overflow = "hidden";
};

window.closeRfqDrawer = function() {
  const drawer = document.getElementById("jdRfqDrawer");
  const backdrop = document.getElementById("jdRfqBackdrop");
  if (drawer) drawer.classList.remove("open");
  if (backdrop) backdrop.classList.remove("open");
  document.body.style.overflow = "";
};

window.recalcDrawerOffer = function() {
  const qtyInput = document.getElementById("drawerQuantity");
  const targetPriceInput = document.getElementById("drawerTargetPrice");
  const totalProposedElem = document.getElementById("drawerTotalProposed");
  const varianceElem = document.getElementById("drawerPriceVariance");

  const qty = parseFloat(qtyInput?.value) || 0;
  const targetRate = parseFloat(targetPriceInput?.value) || 0;

  const total = qty * targetRate;
  if (totalProposedElem) {
    totalProposedElem.textContent = `₹${total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (varianceElem && currentDrawerListedRate > 0) {
    const diff = targetRate - currentDrawerListedRate;
    const percent = ((diff / currentDrawerListedRate) * 100).toFixed(1);
    if (diff <= 0) {
      varianceElem.textContent = `${Math.abs(percent)}% below listed rate`;
      varianceElem.className = "fw-bold text-success";
    } else {
      varianceElem.textContent = `+${percent}% above listed rate`;
      varianceElem.className = "fw-bold text-primary";
    }
  }
};

window.selectLogistics = function(mode) {
  const doorstep = document.getElementById("logisticsDoorstep");
  const pickup = document.getElementById("logisticsPickup");

  if (mode === "Doorstep Delivery") {
    doorstep?.classList.add("selected");
    pickup?.classList.remove("selected");
  } else {
    pickup?.classList.add("selected");
    doorstep?.classList.remove("selected");
  }
};

/* ==========================================================================
   TOP 5 ENHANCEMENTS CLIENT JS ENGINE (THEME, COMPARISON, SPARKLINES, TOASTS)
   ========================================================================== */

// 1. THEME ENGINE (DARK / LIGHT MANDI MODE)
(function initTheme() {
  const savedTheme = localStorage.getItem("jd_theme") || "light";
  document.body.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
})();

window.toggleTheme = function() {
  const currentTheme = document.body.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.body.setAttribute("data-theme", newTheme);
  localStorage.setItem("jd_theme", newTheme);
  updateThemeIcon(newTheme);
  window.showToast(`Switched to ${newTheme === 'dark' ? 'Dark Mandi' : 'Light'} theme`, "info");
};

function updateThemeIcon(theme) {
  const icon = document.getElementById("themeIcon");
  if (!icon) return;
  if (theme === "dark") {
    icon.className = "fa-regular fa-sun";
  } else {
    icon.className = "fa-regular fa-moon";
  }
}

// 2. CROP LOT COMPARISON MATRIX ENGINE
let comparedProducts = [];
try {
  comparedProducts = JSON.parse(localStorage.getItem("jd_compare_lots") || "[]");
} catch(e) {
  comparedProducts = [];
}

window.handleCompareToggle = function(chk) {
  const id = chk.dataset.id;
  const name = chk.dataset.name;
  const category = chk.dataset.category;
  const grade = chk.dataset.grade;
  const price = chk.dataset.price;
  const moisture = chk.dataset.moisture;
  const purity = chk.dataset.purity;
  const supplier = chk.dataset.supplier;
  const location = chk.dataset.location;
  const delivery = chk.dataset.delivery;
  const image = chk.dataset.image;

  if (chk.checked) {
    if (comparedProducts.length >= 4) {
      chk.checked = false;
      window.showToast("You can compare up to 4 crop lots simultaneously.", "error");
      return;
    }
    if (!comparedProducts.some(p => p.id === id)) {
      comparedProducts.push({ id, name, category, grade, price, moisture, purity, supplier, location, delivery, image });
      window.showToast(`Added "${name}" to comparison matrix`, "info");
    }
  } else {
    comparedProducts = comparedProducts.filter(p => p.id !== id);
    window.showToast(`Removed "${name}" from comparison`, "info");
  }

  localStorage.setItem("jd_compare_lots", JSON.stringify(comparedProducts));
  updateCompareUI();
};

function updateCompareUI() {
  const bar = document.getElementById("floatingCompareBar");
  const countBadge = document.getElementById("compareCountBadge");

  // Sync checkboxes on page
  document.querySelectorAll(".compare-item-chk").forEach(chk => {
    chk.checked = comparedProducts.some(p => p.id === chk.dataset.id);
  });

  if (countBadge) countBadge.textContent = comparedProducts.length;

  if (bar) {
    if (comparedProducts.length > 0) {
      bar.classList.add("show");
    } else {
      bar.classList.remove("show");
    }
  }
}

window.openComparisonModal = function() {
  if (comparedProducts.length === 0) {
    window.showToast("Select at least 1 product to compare.", "info");
    return;
  }
  renderComparisonTable();
  const modalElem = document.getElementById("cropComparisonModal");
  if (modalElem && window.bootstrap && bootstrap.Modal) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalElem);
    modal.show();
  }
};

function renderComparisonTable() {
  const tbody = document.getElementById("comparisonTableBody");
  if (!tbody) return;

  const fields = [
    { label: "Commodity", key: "name", render: p => `<strong>${p.name}</strong><br><small class="text-muted">${p.category}</small>` },
    { label: "Grade", key: "grade", render: p => `<span class="badge bg-success">Grade ${p.grade} Quality</span>` },
    { label: "Price Rate", key: "price", render: p => `<span class="fw-bold text-success fs-6">₹${p.price}/kg</span><br><small class="text-muted">₹${(parseFloat(p.price) * 100).toFixed(0)}/Qtl</small>` },
    { label: "Moisture Content", key: "moisture", render: p => `<span class="text-info fw-bold"><i class="fa-solid fa-droplet me-1"></i>${p.moisture}</span> (Optimal: &lt;14%)` },
    { label: "Grain Purity", key: "purity", render: p => `<span class="text-success fw-bold"><i class="fa-solid fa-check-double me-1"></i>${p.purity}</span>` },
    { label: "APMC Mandi / Location", key: "location", render: p => `<i class="fa-solid fa-location-dot text-danger me-1"></i>${p.location}` },
    { label: "Supplier / Farmer", key: "supplier", render: p => `<i class="fa-solid fa-shield-halved text-success me-1"></i>${p.supplier}` },
    { label: "Delivery Lead Time", key: "delivery", render: p => `<i class="fa-regular fa-clock me-1 text-muted"></i>${p.delivery}` },
    { 
      label: "Actions", 
      key: "actions", 
      render: p => `
        <div class="d-flex flex-column gap-1">
          <a href="/products/${p.id}" class="btn btn-sm btn-success fw-semibold"><i class="fa-solid fa-eye me-1"></i> Inspect Lot</a>
          <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeCompareItem('${p.id}')"><i class="fa-solid fa-trash me-1"></i> Remove</button>
        </div>
      `
    }
  ];

  let html = "";
  fields.forEach(field => {
    html += `<tr>
      <th style="width: 20%; background: var(--jd-bg-elevated); font-weight: 600;">${field.label}</th>
      ${comparedProducts.map(p => `<td style="width: ${80 / comparedProducts.length}%; vertical-align: middle;">${field.render(p)}</td>`).join("")}
    </tr>`;
  });

  tbody.innerHTML = html;
}

window.removeCompareItem = function(id) {
  comparedProducts = comparedProducts.filter(p => p.id !== id);
  localStorage.setItem("jd_compare_lots", JSON.stringify(comparedProducts));
  updateCompareUI();
  if (comparedProducts.length === 0) {
    const modalElem = document.getElementById("cropComparisonModal");
    if (modalElem && window.bootstrap && bootstrap.Modal) {
      const modal = bootstrap.Modal.getInstance(modalElem);
      if (modal) modal.hide();
    }
  } else {
    renderComparisonTable();
  }
};

window.clearAllCompared = function() {
  comparedProducts = [];
  localStorage.removeItem("jd_compare_lots");
  updateCompareUI();
  const modalElem = document.getElementById("cropComparisonModal");
  if (modalElem && window.bootstrap && bootstrap.Modal) {
    const modal = bootstrap.Modal.getInstance(modalElem);
    if (modal) modal.hide();
  }
  window.showToast("Cleared comparison selection.", "info");
};

// 3. GLOBAL TOAST NOTIFICATION HELPER
window.showToast = function(message, type = "info") {
  const container = document.getElementById("jdToastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `jd-toast ${type === "error" ? "toast-error" : type === "info" ? "toast-info" : ""}`;
  
  let icon = "fa-solid fa-circle-check text-success";
  if (type === "error") icon = "fa-solid fa-circle-exclamation text-danger";
  if (type === "info") icon = "fa-solid fa-info-circle text-primary";

  toast.innerHTML = `
    <i class="${icon} fs-5"></i>
    <span class="flex-grow-1">${message}</span>
    <button type="button" class="btn-close btn-close-white ms-2 small" onclick="this.parentElement.remove()"></button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    setTimeout(() => toast.remove(), 400);
  }, 4000);
};

/* ==========================================================================
   4. SLIDE-OVER MINI-CART DRAWER ENGINE
   ========================================================================== */
let cartDrawerItems = [
  { id: "sample1", name: "Premium Basmati Paddy 1121", category: "Grains", grade: "A", rate: 38.90, qty: 10, image: "/images/image.png" },
  { id: "sample2", name: "Unjha Export Quality Jeera", category: "Spices", grade: "A", rate: 274.50, qty: 5, image: "/images/image.png" }
];

window.openCartDrawer = function() {
  const drawer = document.getElementById("jdCartDrawer");
  const backdrop = document.getElementById("jdCartBackdrop");
  if (!drawer) return;

  renderCartDrawer();
  drawer.classList.add("open");
  if (backdrop) backdrop.classList.add("open");
  document.body.style.overflow = "hidden";
};

window.closeCartDrawer = function() {
  const drawer = document.getElementById("jdCartDrawer");
  const backdrop = document.getElementById("jdCartBackdrop");
  if (drawer) drawer.classList.remove("open");
  if (backdrop) backdrop.classList.remove("open");
  document.body.style.overflow = "";
};

function renderCartDrawer() {
  const itemsContainer = document.getElementById("drawerCartItems");
  const countBadge = document.getElementById("drawerCartCount");
  const navBadge = document.getElementById("navCartBadge");
  const subtotalElem = document.getElementById("drawerSubtotal");
  const gstElem = document.getElementById("drawerGst");
  const totalElem = document.getElementById("drawerTotal");
  const progressFill = document.getElementById("freightProgressFill");
  const milestoneText = document.getElementById("freightMilestoneText");

  if (!itemsContainer) return;

  if (cartDrawerItems.length === 0) {
    itemsContainer.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="fa-solid fa-cart-shopping fs-1 mb-2 text-secondary opacity-50"></i>
        <h6>Your Wholesale Cart is Empty</h6>
        <small class="d-block mb-3">Add verified agricultural lots to start ordering.</small>
        <a href="/products" class="btn btn-sm btn-outline-success" onclick="closeCartDrawer()">Browse Catalog</a>
      </div>
    `;
    if (countBadge) countBadge.textContent = "0 Items";
    if (navBadge) navBadge.textContent = "0";
    if (subtotalElem) subtotalElem.textContent = "₹0.00";
    if (gstElem) gstElem.textContent = "₹0.00";
    if (totalElem) totalElem.textContent = "₹0.00";
    if (progressFill) progressFill.style.width = "0%";
    if (milestoneText) milestoneText.textContent = "Add 25 Qtl for Free Freight";
    return;
  }

  let totalQuintals = 0;
  let subtotal = 0;

  itemsContainer.innerHTML = cartDrawerItems.map((item, index) => {
    const itemSubtotal = item.qty * item.rate * 100;
    subtotal += itemSubtotal;
    totalQuintals += item.qty;

    return `
      <div class="jd-cart-item-row">
        <img src="${item.image}" alt="${item.name}" class="jd-cart-item-img" onerror="this.src='/images/image.png'">
        <div class="flex-grow-1">
          <h6 class="mb-0 fw-bold small text-dark">${item.name}</h6>
          <small class="text-muted d-block" style="font-size: 0.75rem;">Grade ${item.grade} • ₹${item.rate.toFixed(2)}/kg</small>
          <strong class="text-success small">₹${itemSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
        </div>
        <div class="d-flex align-items-center gap-1">
          <button type="button" class="btn btn-sm btn-light border px-2 py-0" onclick="adjustDrawerQty(${index}, -1)">−</button>
          <span class="fw-bold px-1 small">${item.qty} Q</span>
          <button type="button" class="btn btn-sm btn-light border px-2 py-0" onclick="adjustDrawerQty(${index}, 1)">+</button>
          <button type="button" class="btn btn-sm text-danger border-0 p-1 ms-1" onclick="removeDrawerItem(${index})" title="Remove">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");

  const gst = subtotal * 0.05;
  const total = subtotal + gst;

  if (countBadge) countBadge.textContent = `${cartDrawerItems.length} Lots`;
  if (navBadge) navBadge.textContent = cartDrawerItems.length;
  if (subtotalElem) subtotalElem.textContent = `₹${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (gstElem) gstElem.textContent = `₹${gst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (totalElem) totalElem.textContent = `₹${total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Free Freight Milestones (Threshold: 25 Quintals)
  const freightPercent = Math.min(100, Math.round((totalQuintals / 25) * 100));
  if (progressFill) progressFill.style.width = `${freightPercent}%`;
  if (milestoneText) {
    if (totalQuintals >= 25) {
      milestoneText.textContent = "🎉 Free Freight Unlocked!";
      milestoneText.className = "text-success fw-bold";
    } else {
      milestoneText.textContent = `Add ${25 - totalQuintals} more Qtl for Free Freight`;
      milestoneText.className = "text-muted fw-semibold";
    }
  }
}

window.adjustDrawerQty = function(index, delta) {
  if (!cartDrawerItems[index]) return;
  cartDrawerItems[index].qty += delta;
  if (cartDrawerItems[index].qty <= 0) {
    cartDrawerItems.splice(index, 1);
  }
  renderCartDrawer();
};

window.removeDrawerItem = function(index) {
  if (!cartDrawerItems[index]) return;
  const removedName = cartDrawerItems[index].name;
  cartDrawerItems.splice(index, 1);
  renderCartDrawer();
  window.showToast(`Removed "${removedName}" from cart`, "info");
};

/* ==========================================================================
   5. FARM TRACEABILITY PASSPORT MODAL ENGINE
   ========================================================================== */
window.openTraceabilityPassport = function(cropName, grade, category, farmer, location) {
  const modalElem = document.getElementById("farmTraceabilityModal");
  if (!modalElem) return;

  const nameElem = document.getElementById("traceCropName");
  const lotElem = document.getElementById("traceLotNumber");
  const gradeElem = document.getElementById("traceGradeBadge");
  const mandiElem = document.getElementById("traceMandiYard");
  const farmerElem = document.getElementById("traceFarmerName");

  const randomLot = Math.floor(1000 + Math.random() * 9000);

  if (nameElem) nameElem.textContent = cropName || "Agricultural Harvest";
  if (lotElem) lotElem.textContent = `Lot #APMC-${randomLot}`;
  if (gradeElem) gradeElem.textContent = `Grade ${grade || 'A'} Certified`;
  if (mandiElem) mandiElem.textContent = location || "Unjha APMC Yard, Gujarat";
  if (farmerElem) farmerElem.textContent = farmer || "Patel Organic Mandi Producer";

  if (window.bootstrap && bootstrap.Modal) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalElem);
    modal.show();
  }
};

/* ==========================================================================
   6. MANDI TARGET PRICE ALERT ENGINE
   ========================================================================== */
let activePriceAlertProduct = null;

window.openPriceAlertModal = function(productId, cropName, currentRate) {
  const modalElem = document.getElementById("mandiPriceAlertModal");
  if (!modalElem) return;

  activePriceAlertProduct = { productId, cropName, currentRate };

  const nameElem = document.getElementById("alertCropName");
  const rateElem = document.getElementById("alertCurrentRate");
  const inputElem = document.getElementById("alertTargetRateInput");

  if (nameElem) nameElem.textContent = cropName || "Selected Commodity";
  if (rateElem) rateElem.textContent = `₹${(parseFloat(currentRate) * 100).toFixed(0)}/Quintal`;
  if (inputElem) inputElem.value = Math.round(parseFloat(currentRate) * 100 * 0.93);

  if (window.bootstrap && bootstrap.Modal) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalElem);
    modal.show();
  }
};

window.saveMandiPriceAlert = function() {
  const inputElem = document.getElementById("alertTargetRateInput");
  const targetRate = parseFloat(inputElem?.value) || 0;
  const modalElem = document.getElementById("mandiPriceAlertModal");

  if (activePriceAlertProduct && targetRate > 0) {
    let savedAlerts = [];
    try {
      savedAlerts = JSON.parse(localStorage.getItem("jd_price_alerts") || "[]");
    } catch(e) {
      savedAlerts = [];
    }
    savedAlerts.push({
      ...activePriceAlertProduct,
      targetRate,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem("jd_price_alerts", JSON.stringify(savedAlerts));

    if (modalElem && window.bootstrap && bootstrap.Modal) {
      const modal = bootstrap.Modal.getInstance(modalElem);
      if (modal) modal.hide();
    }
    window.showToast(`🔔 Price Alert Activated for "${activePriceAlertProduct.cropName}" at ₹${targetRate}/Qtl!`, "info");
  }
};

/* ==========================================================================
   7. MULTI-LINGUAL MANDI LOCALIZATION ENGINE
   ========================================================================== */
const agriTranslations = {
  en: {
    label: "EN",
    searchPlaceholder: "Search for crops, grains, spices...",
    categories: "Categories",
    grains: "Grains",
    pulses: "Pulses",
    oilseeds: "Oilseeds",
    spices: "Spices",
    priceRange: "Price Range",
    applyFilters: "Apply Filters",
    freshHarvest: "Fresh Harvest",
    details: "Details",
    bulkRfq: "Bulk RFQ"
  },
  hi: {
    label: "हिन्दी",
    searchPlaceholder: "फसलें, अनाज, मसाले खोजें...",
    categories: "श्रेणियाँ",
    grains: "अनाज (Grains)",
    pulses: "दालें (Pulses)",
    oilseeds: "तिलहन (Oilseeds)",
    spices: "मसाले (Spices)",
    priceRange: "मूल्य सीमा (₹/किग्रा)",
    applyFilters: "फ़िल्टर लागू करें",
    freshHarvest: "ताज़ा फसल",
    details: "विवरण",
    bulkRfq: "थोक बोली (RFQ)"
  },
  gu: {
    label: "ગુજરાતી",
    searchPlaceholder: "પાક, અનાજ, મસાલા શોધો...",
    categories: "કેટેગરીઝ",
    grains: "અનાજ (Grains)",
    pulses: "કઠોળ (Pulses)",
    oilseeds: "તેલીબિયાં (Oilseeds)",
    spices: "મસાલા (Spices)",
    priceRange: "ભાવ મર્યાદા (₹/કિલો)",
    applyFilters: "ફિલ્ટર લાગુ કરો",
    freshHarvest: "તાજો પાક",
    details: "વિગત",
    bulkRfq: "જથ્થાબંધ ભાવ (RFQ)"
  },
  pa: {
    label: "ਪੰਜਾਬੀ",
    searchPlaceholder: "ਫਸਲਾਂ, ਅਨਾਜ, ਮਸਾਲੇ ਖੋਜੋ...",
    categories: "ਸ਼੍ਰੇਣੀਆਂ",
    grains: "ਅਨਾਜ (Grains)",
    pulses: "ਦਾਲਾਂ (Pulses)",
    oilseeds: "ਤੇਲ ਬੀਜ (Oilseeds)",
    spices: "ਮਸਾਲੇ (Spices)",
    priceRange: "ਕੀਮਤ ਦਾ ਦਾਇਰਾ",
    applyFilters: "ਫਿਲਟਰ ਲਗਾਓ",
    freshHarvest: "ਤਾਜ਼ੀ ਫ਼ਸਲ",
    details: "ਵੇਰਵਾ",
    bulkRfq: "ਥੋਕ ਪੇਸ਼ਕਸ਼ (RFQ)"
  }
};

window.setLanguage = function(langKey) {
  if (!agriTranslations[langKey]) langKey = "en";
  localStorage.setItem("jd_language", langKey);

  const currentLangLabel = document.getElementById("currentLangLabel");
  if (currentLangLabel) currentLangLabel.textContent = agriTranslations[langKey].label;

  const searchInput = document.getElementById("productSearch");
  if (searchInput) searchInput.placeholder = agriTranslations[langKey].searchPlaceholder;

  window.showToast(`Language switched to ${agriTranslations[langKey].label}`, "info");
};

(function initLanguage() {
  const savedLang = localStorage.getItem("jd_language") || "en";
  const labelElem = document.getElementById("currentLangLabel");
  if (labelElem && agriTranslations[savedLang]) {
    labelElem.textContent = agriTranslations[savedLang].label;
  }
})();

/* ==========================================================================
   8. IN-APP INVOICE PREVIEW MODAL GENERATOR
   ========================================================================== */
window.openInvoicePreview = function(orderId, cropName, qty, total, address, date, status) {
  const modalElem = document.getElementById("invoicePreviewModal");
  const modalBody = document.getElementById("invoiceModalBody");
  if (!modalElem || !modalBody) return;

  const parsedTotal = parseFloat(total) || 0;
  const taxable = (parsedTotal / 1.05).toFixed(2);
  const gst = (parsedTotal - taxable).toFixed(2);

  modalBody.innerHTML = `
    <div class="p-3 border rounded-3 bg-white">
      <div class="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
        <div class="d-flex align-items-center">
          <img src="/images/image.png" alt="JD Mart Logo" height="38" class="me-2" style="border-radius: 6px;">
          <div>
            <h5 class="fw-bold mb-0 text-success">JD Mart Agricultural Marketplace</h5>
            <small class="text-muted">GSTIN: 24AABCA1234F1Z8 • APMC Reg: APMC-GJ-2024-8841</small>
          </div>
        </div>
        <div class="text-end">
          <span class="badge bg-success fs-6">${status || 'Confirmed'}</span>
          <small class="d-block text-muted mt-1">Invoice: <strong>#INV-${orderId || '2026-001'}</strong></small>
        </div>
      </div>

      <div class="row g-3 mb-3 small">
        <div class="col-6">
          <span class="text-muted d-block">BILLED TO (BUYER):</span>
          <strong>Wholesale Agricultural Buyer</strong>
          <p class="mb-0 text-muted">${address || 'APMC Mandi Hub Delivery'}</p>
        </div>
        <div class="col-6 text-end">
          <span class="text-muted d-block">ORDER DATE:</span>
          <strong>${date || new Date().toDateString()}</strong>
          <span class="text-muted d-block mt-1">DISPATCH MANDI:</span>
          <strong>Gujarat APMC Yard (Verified Hub)</strong>
        </div>
      </div>

      <div class="table-responsive mb-3">
        <table class="table table-bordered table-sm small mb-0">
          <thead class="table-light">
            <tr>
              <th>Commodity Lot</th>
              <th class="text-center">HSN Code</th>
              <th class="text-center">Quantity</th>
              <th class="text-end">Taxable Value</th>
              <th class="text-end">GST (5%)</th>
              <th class="text-end">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${cropName || 'Verified Agricultural Lot'}</strong><br><small class="text-muted">Grade A Mandi Tested</small></td>
              <td class="text-center">100190</td>
              <td class="text-center fw-bold">${qty || 1} Quintals</td>
              <td class="text-end">₹${taxable}</td>
              <td class="text-end">₹${gst}</td>
              <td class="text-end fw-bold text-success">₹${parsedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="d-flex justify-content-between p-2 bg-light rounded-2 small fw-bold">
        <span>Grand Total (in Words): Indian Rupees Only</span>
        <span class="text-success fs-6">₹${parsedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  `;

  if (window.bootstrap && bootstrap.Modal) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalElem);
    modal.show();
  }
};

// Initialize UI States on DOM load
document.addEventListener("DOMContentLoaded", () => {
  updateCompareUI();
});




