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


