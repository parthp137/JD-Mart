/**
 * Image and Placeholder Utilities
 */
const path = require("path");
const fs = require("fs");

function getImageUrl(image) {
  const fallbackImage = "/images/products/default-crop.svg";

  if (!image) {
    return fallbackImage;
  }

  // Handle new image structure: array of {filename, url, uploadedAt} objects
  if (Array.isArray(image)) {
    if (image.length === 0) {
      return fallbackImage;
    }
    
    // If first element is an object with 'url' property (new structure)
    if (typeof image[0] === "object" && image[0].url) {
      return image[0].url;
    }
    
    // Otherwise treat as array of strings (old structure)
    return getImageUrl(image[0]);
  }

  const value = String(image).trim();

  if (!value) {
    return fallbackImage;
  }

  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }

  let candidateUrl;

  if (value.startsWith("/")) {
    candidateUrl = value;
  } else if (value.startsWith("images/") || value.startsWith("uploads/")) {
    candidateUrl = `/${value}`;
  } else {
    candidateUrl = `/images/${value}`;
  }

  // If the URL maps to a local public asset, ensure the file exists.
  const localRelative = candidateUrl.replace(/^\/+/, "");
  const localPath = path.join(__dirname, "..", "public", localRelative);

  if (fs.existsSync(localPath)) {
    return candidateUrl;
  }

  // Backward compatibility: if DB has .jpg but only .svg exists, use svg.
  if (/\.(jpg|jpeg|png)$/i.test(localRelative)) {
    const svgRelative = localRelative.replace(/\.(jpg|jpeg|png)$/i, ".svg");
    const svgPath = path.join(__dirname, "..", "public", svgRelative);
    if (fs.existsSync(svgPath)) {
      return `/${svgRelative.replace(/\\/g, "/")}`;
    }

    const baseName = path.basename(localRelative).replace(/\.(jpg|jpeg|png)$/i, "");
    const productSvgRelative = `images/products/${baseName}.svg`;
    const productSvgPath = path.join(__dirname, "..", "public", productSvgRelative);
    if (fs.existsSync(productSvgPath)) {
      return `/${productSvgRelative}`;
    }
  }

  // Also support bare names that already reference product SVG assets.
  const bareName = path.basename(localRelative);
  if (!localRelative.includes("/") && !localRelative.includes("\\")) {
    const productAssetRelative = `images/products/${bareName}`;
    const productAssetPath = path.join(__dirname, "..", "public", productAssetRelative);
    if (fs.existsSync(productAssetPath)) {
      return `/${productAssetRelative}`;
    }
  }

  return fallbackImage;
}

function getCropPlaceholder(label = "Crop") {
  const safeLabel = String(label || "Crop").slice(0, 24).replace(/[<&>]/g, "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f5132" />
          <stop offset="55%" stop-color="#16a34a" />
          <stop offset="100%" stop-color="#facc15" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" rx="36" fill="url(#g)" />
      <circle cx="650" cy="120" r="90" fill="rgba(255,255,255,0.16)" />
      <circle cx="130" cy="480" r="140" fill="rgba(255,255,255,0.10)" />
      <text x="50%" y="48%" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="52" font-weight="700">${safeLabel}</text>
      <text x="50%" y="57%" text-anchor="middle" fill="#eaffef" font-family="Arial, sans-serif" font-size="24">Image unavailable</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

module.exports = {
  getImageUrl,
  getCropPlaceholder
};
