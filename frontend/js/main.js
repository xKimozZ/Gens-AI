/**
 * Main Application Module
 * Entry point and initialization
 */

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  window.appState.currentTab = tabName;

  // Update tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");

  // Update tab content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.style.display = "none";
  });
  document.getElementById(`tab-${tabName}`).style.display = "flex";

  // Render content for specific tabs
  if (tabName === "testsuites") {
    renderTestSuitesList();
  } else if (tabName === "review") {
    populateReviewSuiteSelector();
  } else if (tabName === "codegen") {
    populateCodegenSuiteSelector();
  }
}

/**
 * Initialize application on page load
 */
function initializeApp() {
  console.log("🤖 Web Testing Agent initialized");
  
  // Render initial UI
  renderExplorationsList();
  updateMetrics();
  populateReviewSuiteSelector();
  populateCodegenSuiteSelector();

  // Update test suites badge
  updateTestSuitesBadge();
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", initializeApp);
