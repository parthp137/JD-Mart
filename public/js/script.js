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
})();

