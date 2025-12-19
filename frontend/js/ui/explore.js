/**
 * Exploration Tab UI Module
 * Handles Phase 1: Page Exploration
 */

/**
 * Explore a URL
 */
async function exploreUrl() {
  const url = document.getElementById("urlInput").value;
  const exploreBtn = document.getElementById("exploreBtn");
  const designBtn = document.getElementById("designBtn");

  if (!url) {
    alert("Please enter a URL");
    return;
  }

  exploreBtn.disabled = true;
  designBtn.disabled = true;

  const display = document.getElementById("explorationDisplay");
  showLoadingIndicator(display, "🔍 Exploring page... (This may take 30-60 seconds)");

  try {
    const result = await apiExploreUrl(url);

    if (result.success) {
      window.appState.explorationData = result.data;

      // Save exploration
      const exploration = addExploration(result.data, result.data.url);
      window.appState.selectedExplorationId = exploration.id;

      displayExplorationResult(result.data);
      updateMetrics();
      renderExplorationsList();

      // Auto-select in test design dropdown
      const designSelect = document.getElementById("explorationSelect");
      if (designSelect) {
        designSelect.value = exploration.id;
        designBtn.disabled = false;
      } else {
        designBtn.disabled = false;
      }
    } else {
      throw new Error(result.message || "Exploration failed");
    }
  } catch (error) {
    showErrorMessage(display, "Exploration Error", error.message);
  } finally {
    exploreBtn.disabled = false;
  }
}

/**
 * Display exploration results
 */
function displayExplorationResult(data) {
  const display = document.getElementById("explorationDisplay");
  const elementsCount = data.elements?.length || 0;

  display.innerHTML = `
    <span class="phase-badge">Phase 1: Exploration Complete</span>
    <h3 style="margin-bottom: 15px;">${escapeHtml(
      data.title || "Page Explored"
    )}</h3>
    <p style="margin-bottom: 10px; font-size: 13px;"><strong>URL:</strong> ${escapeHtml(
      data.url
    )}</p>
    <p style="margin-bottom: 15px; font-size: 13px;"><strong>Elements Found:</strong> ${elementsCount}</p>
    
    <div class="json-collapsible">
      <div class="json-header" onclick="toggleJson()">
        <span>📄 Raw Data (JSON)</span>
        <span id="json-toggle">▼</span>
      </div>
      <div class="json-content" id="json-content" style="display: none;">
${escapeHtml(JSON.stringify(data, null, 2))}
      </div>
    </div>
  `;
}

/**
 * Toggle JSON visibility
 */
function toggleJson() {
  const content = document.getElementById("json-content");
  const toggle = document.getElementById("json-toggle");
  if (content.style.display === "none") {
    content.style.display = "block";
    toggle.textContent = "▲";
  } else {
    content.style.display = "none";
    toggle.textContent = "▼";
  }
}

/**
 * Render saved explorations list
 */
function renderExplorationsList() {
  const list = document.getElementById("explorationsList");
  const explorations = getSavedExplorations();

  if (explorations.length === 0) {
    list.innerHTML = `
      <div style="color: #999; font-size: 11px; text-align: center; padding: 20px 10px;">
        No explorations yet
      </div>
    `;
    return;
  }

  list.innerHTML = explorations
    .map(
      (exp) => `
      <div class="exploration-item ${
        exp.id === window.appState.selectedExplorationId ? "selected" : ""
      }" onclick="selectExploration(${exp.id})">
        <div style="flex: 1;">
          <input 
            type="text" 
            value="${escapeHtml(exp.name)}" 
            class="exploration-name-input"
            onchange="renameExploration(${exp.id}, this.value)"
            onclick="event.stopPropagation()"
          >
          <div style="font-size: 10px; color: #6c757d; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(
            exp.url
          )}</div>
        </div>
        <button onclick="event.stopPropagation(); deleteExploration(${
          exp.id
        })" class="delete-btn" title="Delete">🗑️</button>
      </div>
    `
    )
    .join("");
}

/**
 * Select exploration for test design
 */
function selectExploration(id) {
  window.appState.selectedExplorationId = id;
  const exploration = getExplorationById(id);
  if (exploration) {
    window.appState.explorationData = exploration.data;
    displayExplorationResult(exploration.data);
    document.getElementById("designBtn").disabled = false;
    renderExplorationsList();

    // Ensure we're on explorations tab
    if (window.appState.currentTab !== "explorations") {
      switchTab("explorations");
      document.querySelectorAll(".tab-btn")[0].click();
    }
  }
}

/**
 * Rename exploration
 */
function renameExploration(id, newName) {
  updateExplorationName(id, newName);
}

/**
 * Delete exploration
 */
function deleteExploration(id) {
  if (confirm("Delete this exploration?")) {
    deleteExplorationById(id);
    if (window.appState.selectedExplorationId === id) {
      window.appState.selectedExplorationId = null;
      window.appState.explorationData = null;
      document.getElementById("designBtn").disabled = true;
      showEmptyState(
        document.getElementById("explorationDisplay"),
        "🔍",
        "Select or Create",
        "Click an exploration or create a new one above"
      );
    }
    renderExplorationsList();
  }
}

/**
 * Reset agent state
 */
async function resetAgent() {
  if (
    confirm(
      "Reset agent state? This will clear backend state but keep local storage."
    )
  ) {
    try {
      await apiResetAgent();
      updateMetrics();
      alert("Agent reset complete");
    } catch (error) {
      alert("Reset failed: " + error.message);
    }
  }
}
