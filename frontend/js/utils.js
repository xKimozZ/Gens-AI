/**
 * Utility Functions
 * Helper functions used across the application
 */

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format timestamp to readable string
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Download text content as file
 */
function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Copy failed:", err);
    return false;
  }
}

/**
 * Show loading indicator
 */
function showLoadingIndicator(container, message) {
  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <div>${escapeHtml(message)}</div>
    </div>
  `;
}

/**
 * Show error message
 */
function showErrorMessage(container, title, message) {
  container.innerHTML = `
    <div style="color: #dc3545; padding: 20px;">
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">❌ ${escapeHtml(
        title
      )}</div>
      <div>${escapeHtml(message)}</div>
    </div>
  `;
}

/**
 * Show empty state
 */
function showEmptyState(container, icon, title, subtitle) {
  container.innerHTML = `
    <div style="color: #6c757d; text-align: center; padding: 60px 20px;">
      <div style="font-size: 48px; margin-bottom: 20px;">${icon}</div>
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">${escapeHtml(
        title
      )}</div>
      <div style="font-size: 14px;">${escapeHtml(subtitle)}</div>
    </div>
  `;
}

/**
 * Toggle element visibility
 */
function toggleVisibility(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display =
      element.style.display === "none" ? "block" : "none";
  }
}

/**
 * Debounce function calls
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Sanitize filename
 */
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
}
