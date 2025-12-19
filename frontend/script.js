// Global state
let explorationData = null;
let savedExplorations = JSON.parse(
  localStorage.getItem("explorations") || "[]"
);
let savedTestSuites = JSON.parse(localStorage.getItem("testSuites") || "[]");
let savedMetrics = JSON.parse(
  localStorage.getItem("metrics") ||
    '{"per_phase":[], "totals":{"total_response_time":0, "total_tokens":0, "avg_response_time":0}}'
);
let selectedExplorationId = null;
let currentTab = "explorations";
let reviewMode = "edit";
let runTestsEnabled = false; // Global flag for run tests checkbox

// API base URL
const API_BASE = window.location.origin;

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  currentTab = tabName;

  // Update tab buttons
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");

  // Update tab content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.style.display = "none";
  });
  document.getElementById(`tab-${tabName}`).style.display = "block";

  // Render content
  if (tabName === "testsuites") {
    renderTestSuitesList();
  } else if (tabName === "review") {
    populateReviewSuiteSelector();
  } else if (tabName === "codegen") {
    populateCodegenSuiteSelector();
  }
}

/**
 * Phase 1: Explore a web page
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

  showLoadingExploration("🔍 Exploring page... (This may take 30-60 seconds)");

  try {
    const response = await fetch(`${API_BASE}/api/explore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const result = await response.json();

    if (result.success) {
      explorationData = result.data;

      // Save exploration to localStorage
      const exploration = {
        id: Date.now(),
        name: `Exploration ${savedExplorations.length + 1}`,
        url: result.data.url,
        timestamp: new Date().toISOString(),
        data: result.data,
      };
      savedExplorations.push(exploration);
      localStorage.setItem("explorations", JSON.stringify(savedExplorations));
      selectedExplorationId = exploration.id;

      displayExplorationResult(result.data);
      updateMetrics();
      renderExplorationsList();
      designBtn.disabled = false;
    } else {
      throw new Error(result.message || "Exploration failed");
    }
  } catch (error) {
    showError("Exploration Error", error.message);
  } finally {
    exploreBtn.disabled = false;
  }
}

/**
 * Phase 2: Design test cases
 */
async function designTests() {
  if (!explorationData) {
    alert("Please explore a page first");
    return;
  }

  const designBtn = document.getElementById("designBtn");

  designBtn.disabled = true;

  // Get desired test count
  const testCount =
    parseInt(document.getElementById("testCountSelect").value) || 12;

  // Switch to test suites tab and show loading
  switchTab("testsuites");
  document.querySelectorAll(".tab-btn")[1].click();
  showLoadingTestSuite(
    `📋 Designing ${testCount} test cases... (This may take 30-60 seconds)`
  );

  try {
    const response = await fetch(`${API_BASE}/api/design-tests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...explorationData,
        desired_test_count: testCount,
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log("Test design result:", result.data);

      // Save test suite with exploration data embedded
      const testSuite = {
        id: Date.now(),
        name: `Test Suite ${savedTestSuites.length + 1}`,
        explorationId: selectedExplorationId,
        url: explorationData.url,
        timestamp: new Date().toISOString(),
        data: result.data,
        // Embed exploration data for AI context
        exploration: {
          elements: explorationData.elements || [],
          structure: explorationData.structure || "",
        },
      };
      savedTestSuites.push(testSuite);
      localStorage.setItem("testSuites", JSON.stringify(savedTestSuites));

      displayTestDesign(result.data);
      updateMetrics();
      renderTestSuitesList(); // Update sidebar immediately
      populateReviewSuiteSelector(); // Update review dropdown

      // Show notification badge on Test Suites tab
      document.getElementById("testSuitesTab").innerHTML =
        '📋 Test Suites <span style="background:#dc3545;color:white;border-radius:10px;padding:2px 6px;font-size:10px;margin-left:5px;">' +
        savedTestSuites.length +
        "</span>";
    } else {
      throw new Error(result.message || "Test design failed");
    }
  } catch (error) {
    showError("Test Design Error", error.message);
    console.error("Test design error:", error);
  } finally {
    designBtn.disabled = false;
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
      await fetch(`${API_BASE}/api/reset`, { method: "POST" });
      updateMetrics();
      alert("Agent reset complete");
    } catch (error) {
      alert("Reset failed: " + error.message);
    }
  }
}

/**
 * Render saved explorations list
 */
function renderExplorationsList() {
  const list = document.getElementById("explorationsList");

  if (savedExplorations.length === 0) {
    list.innerHTML = `
            <div style="color: #999; font-size: 11px; text-align: center; padding: 20px 10px;">
                No explorations yet
            </div>
        `;
    return;
  }

  list.innerHTML = savedExplorations
    .map(
      (exp) => `
        <div class="exploration-item ${
          exp.id === selectedExplorationId ? "selected" : ""
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
  selectedExplorationId = id;
  const exploration = savedExplorations.find((e) => e.id === id);
  if (exploration) {
    explorationData = exploration.data;
    displayExplorationResult(exploration.data);
    document.getElementById("designBtn").disabled = false;
    renderExplorationsList();

    // Ensure we're on explorations tab
    if (currentTab !== "explorations") {
      switchTab("explorations");
      document.querySelectorAll(".tab-btn")[0].click();
    }
  }
}

/**
 * Rename exploration
 */
function renameExploration(id, newName) {
  const exploration = savedExplorations.find((e) => e.id === id);
  if (exploration) {
    exploration.name = newName;
    localStorage.setItem("explorations", JSON.stringify(savedExplorations));
  }
}

/**
 * Delete exploration
 */
function deleteExploration(id) {
  if (confirm("Delete this exploration?")) {
    savedExplorations = savedExplorations.filter((e) => e.id !== id);
    localStorage.setItem("explorations", JSON.stringify(savedExplorations));
    if (selectedExplorationId === id) {
      selectedExplorationId = null;
      explorationData = null;
      document.getElementById("designBtn").disabled = true;
      document.getElementById("explorationDisplay").innerHTML = `
                <div style="color: #6c757d; text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">Select or Create</div>
                    <div style="font-size: 14px;">Click an exploration or create a new one above</div>
                </div>
            `;
    }
    renderExplorationsList();
  }
}

/**
 * Render test suites list
 */
function renderTestSuitesList() {
  const list = document.getElementById("testSuitesList");

  if (savedTestSuites.length === 0) {
    list.innerHTML = `
            <div style="color: #999; font-size: 11px; text-align: center; padding: 20px 10px;">
                No test suites yet
            </div>
        `;
    return;
  }

  list.innerHTML = savedTestSuites
    .map((suite) => {
      const testCases = suite.data.test_cases || [];
      return `
            <div class="exploration-item ${
              suite.id === currentTestSuiteId ? "selected" : ""
            }" onclick="viewTestSuite(${
        suite.id
      })" style="cursor: pointer; flex-direction: column; align-items: stretch;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <input 
                        type="text" 
                        value="${escapeHtml(suite.name)}" 
                        class="exploration-name-input"
                        onchange="renameTestSuite(${suite.id}, this.value)"
                        onclick="event.stopPropagation()"
                        style="font-size: 12px; flex: 1;"
                    >
                    <button onclick="event.stopPropagation(); deleteTestSuite(${
                      suite.id
                    })" class="delete-btn" style="margin-left: 8px;">🗑️</button>
                </div>
                <div style="font-size: 10px; color: #6c757d; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(
                  suite.url
                )}</div>
                <div style="font-size: 9px; color: #999;">${
                  testCases.length
                } tests | ${(suite.data.coverage_score || 0).toFixed(1)}%</div>
            </div>
        `;
    })
    .join("");
}

let currentTestSuiteId = null;

/**
 * View test suite details
 */
function viewTestSuite(id) {
  currentTestSuiteId = id;
  const suite = savedTestSuites.find((s) => s.id === id);
  if (suite) {
    // Ensure we're on test suites tab
    if (currentTab !== "testsuites") {
      switchTab("testsuites");
      document.querySelectorAll(".tab-btn")[1].click();
    }

    displayTestDesignInSuite(suite.data, suite.name, suite.url);
    renderTestSuitesList();
  }
}

/**
 * Rename test suite
 */
function renameTestSuite(id, newName) {
  const suite = savedTestSuites.find((s) => s.id === id);
  if (suite) {
    suite.name = newName;
    localStorage.setItem("testSuites", JSON.stringify(savedTestSuites));
  }
}

/**
 * Delete test suite
 */
function deleteTestSuite(id) {
  if (confirm("Delete this test suite?")) {
    savedTestSuites = savedTestSuites.filter((s) => s.id !== id);
    localStorage.setItem("testSuites", JSON.stringify(savedTestSuites));
    renderTestSuitesList();
    document.getElementById("testSuitesTab").innerHTML =
      "📋 Test Suites" +
      (savedTestSuites.length > 0
        ? ` <span style="background:#dc3545;color:white;border-radius:10px;padding:2px 6px;font-size:10px;margin-left:5px;">${savedTestSuites.length}</span>`
        : "");
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
 * Display test design results in suite tab
 */
function displayTestDesignInSuite(data, suiteName, url) {
  const display = document.getElementById("testSuiteDisplay");
  const testCases = data.test_cases || [];

  console.log("Displaying test suite:", testCases.length, testCases);

  let testCasesHtml = testCases
    .map(
      (tc, index) => `
        <div class="test-case">
            <div class="test-case-header" onclick="toggleTestCase(${index})">
                <div style="flex: 1;">
                    <div class="test-case-name">Test #${
                      tc.id || index + 1
                    }: ${escapeHtml(tc.name || "Unnamed Test")}</div>
                    <div style="font-size: 11px; color: #6c757d; margin-top: 3px;">${escapeHtml(
                      tc.description || "No description"
                    )}</div>
                </div>
                <div class="toggle-icon" id="toggle-${index}">▼</div>
            </div>
            <div class="test-case-details" id="details-${index}" style="display: none;">
                ${
                  tc.steps
                    ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #667eea; font-size: 12px;">Steps:</strong>
                        <ol style="margin: 8px 0; padding-left: 20px; font-size: 12px;">
                            ${(Array.isArray(tc.steps) ? tc.steps : [tc.steps])
                              .map(
                                (step) => `
                                <li style="margin-bottom: 4px;">${escapeHtml(
                                  String(step)
                                )}</li>
                            `
                              )
                              .join("")}
                        </ol>
                    </div>
                `
                    : ""
                }
                ${
                  tc.expected_outcome || tc.expected
                    ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #667eea; font-size: 12px;">Expected Outcome:</strong>
                        <div style="font-size: 12px; margin-top: 4px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                            ${escapeHtml(tc.expected_outcome || tc.expected)}
                        </div>
                    </div>
                `
                    : ""
                }
                ${
                  tc.priority
                    ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #667eea; font-size: 12px;">Priority:</strong>
                        <span style="margin-left: 8px; padding: 2px 8px; background: #667eea; color: white; border-radius: 12px; font-size: 11px;">
                            ${escapeHtml(tc.priority)}
                        </span>
                    </div>
                `
                    : ""
                }
                ${
                  tc.locators
                    ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #667eea; font-size: 12px;">Locators:</strong>
                        <pre style="font-size: 11px; margin-top: 4px; padding: 8px; background: #f8f9fa; border-radius: 4px; overflow-x: auto;">${escapeHtml(
                          JSON.stringify(tc.locators, null, 2)
                        )}</pre>
                    </div>
                `
                    : ""
                }
            </div>
        </div>
    `
    )
    .join("");

  display.innerHTML = `
        <div style="margin-bottom: 15px;">
            <h3 style="margin-bottom: 8px; color: #333;">${escapeHtml(
              suiteName
            )}</h3>
            <p style="font-size: 12px; color: #6c757d; margin-bottom: 5px;"><strong>URL:</strong> ${escapeHtml(
              url
            )}</p>
            <p style="font-size: 12px; color: #6c757d;"><strong>Coverage:</strong> ${(
              data.coverage_score || 0
            ).toFixed(1)}% | <strong>Test Cases:</strong> ${
    testCases.length
  }</p>
        </div>
        <div>
            ${
              testCasesHtml ||
              '<p style="color: #6c757d;">No test cases generated</p>'
            }
        </div>
    `;
}

/**
 * Display test design results (legacy - after generation)
 */
function displayTestDesign(data) {
  const display = document.getElementById("testSuiteDisplay");
  const testCases = data.test_cases || [];

  console.log("Displaying test cases:", testCases.length, testCases);

  let testCasesHtml = testCases
    .map(
      (tc, index) => `
        <div class="test-case">
            <div class="test-case-header" onclick="toggleTestCase(${index})">
                <div style="flex: 1;">
                    <div class="test-case-name">Test #${
                      tc.id || index + 1
                    }: ${escapeHtml(tc.name || "Unnamed Test")}</div>
                    <div style="font-size: 11px; color: #6c757d; margin-top: 3px;">${escapeHtml(
                      tc.description || "No description"
                    )}</div>
                </div>
                <div class="toggle-icon" id="toggle-${index}">▼</div>
            </div>
            <div class="test-case-details" id="details-${index}" style="display: none;">
                ${
                  tc.steps
                    ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #667eea; font-size: 12px;">Steps:</strong>
                        <ol style="margin: 8px 0; padding-left: 20px; font-size: 12px;">
                            ${(Array.isArray(tc.steps) ? tc.steps : [tc.steps])
                              .map(
                                (step) => `
                                <li style="margin-bottom: 4px;">${escapeHtml(
                                  String(step)
                                )}</li>
                            `
                              )
                              .join("")}
                        </ol>
                    </div>
                `
                    : ""
                }
                ${
                  tc.expected_outcome || tc.expected
                    ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #667eea; font-size: 12px;">Expected Outcome:</strong>
                        <div style="font-size: 12px; margin-top: 4px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                            ${escapeHtml(tc.expected_outcome || tc.expected)}
                        </div>
                    </div>
                `
                    : ""
                }
                ${
                  tc.priority
                    ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #667eea; font-size: 12px;">Priority:</strong>
                        <span style="margin-left: 8px; padding: 2px 8px; background: #667eea; color: white; border-radius: 12px; font-size: 11px;">
                            ${escapeHtml(tc.priority)}
                        </span>
                    </div>
                `
                    : ""
                }
                ${
                  tc.locators
                    ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #667eea; font-size: 12px;">Locators:</strong>
                        <pre style="font-size: 11px; margin-top: 4px; padding: 8px; background: #f8f9fa; border-radius: 4px; overflow-x: auto;">${escapeHtml(
                          JSON.stringify(tc.locators, null, 2)
                        )}</pre>
                    </div>
                `
                    : ""
                }
            </div>
        </div>
    `
    )
    .join("");

  display.innerHTML = `
        <span class="phase-badge">Phase 2: Test Design Complete</span>
        <h3 style="margin-bottom: 15px;">Generated Test Cases (${
          testCases.length
        })</h3>
        <p style="margin-bottom: 15px; color: #6c757d; font-size: 13px;">Coverage Score: ${(
          data.coverage_score || 0
        ).toFixed(1)}%</p>
        <div>
            ${
              testCasesHtml ||
              '<p style="color: #6c757d;">No test cases generated</p>'
            }
        </div>
    `;
}

/**
 * Toggle test case details
 */
function toggleTestCase(index) {
  const details = document.getElementById(`details-${index}`);
  const toggle = document.getElementById(`toggle-${index}`);
  if (details.style.display === "none") {
    details.style.display = "block";
    toggle.textContent = "▲";
  } else {
    details.style.display = "none";
    toggle.textContent = "▼";
  }
}

/**
 * Show loading state in exploration tab
 */
function showLoadingExploration(message) {
  const display = document.getElementById("explorationDisplay");
  display.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <div>${escapeHtml(message)}</div>
        </div>
    `;
}

/**
 * Show loading state in test suite tab
 */
function showLoadingTestSuite(message) {
  const display = document.getElementById("testSuiteDisplay");
  display.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <div>${escapeHtml(message)}</div>
        </div>
    `;
}

/**
 * Show error message in current context
 */
function showError(title, message) {
  const displayId =
    currentTab === "testsuites" ? "testSuiteDisplay" : "explorationDisplay";
  const display = document.getElementById(displayId);
  display.innerHTML = `
        <div style="color: #dc3545; padding: 20px;">
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">❌ ${escapeHtml(
              title
            )}</div>
            <div>${escapeHtml(message)}</div>
        </div>
    `;
}

/**
 * Update metrics display
 */
function updateMetrics() {
  fetch(`${API_BASE}/api/metrics`)
    .then((r) => {
      if (!r.ok) {
        console.warn(
          "Metrics endpoint returned:",
          r.status,
          "- using cached metrics"
        );
        return null;
      }
      return r.json();
    })
    .then((data) => {
      if (data && data.success && data.data) {
        console.log("Metrics received from backend:", data);

        // Merge with existing metrics from localStorage
        const backendMetrics = data.data.per_phase || [];
        const existingMetrics = savedMetrics.per_phase || [];

        // Combine metrics (deduplicate by timestamp)
        const allMetrics = [...existingMetrics];
        backendMetrics.forEach((bm) => {
          if (!allMetrics.find((m) => m.timestamp === bm.timestamp)) {
            allMetrics.push(bm);
          }
        });

        savedMetrics.per_phase = allMetrics;

        // Recalculate totals
        const totalTime = allMetrics.reduce(
          (sum, m) => sum + (m.response_time || 0),
          0
        );
        const totalTokens = allMetrics.reduce(
          (sum, m) => sum + (m.tokens_used || 0),
          0
        );

        savedMetrics.totals = {
          total_response_time: totalTime,
          total_tokens: totalTokens,
          avg_response_time:
            allMetrics.length > 0 ? totalTime / allMetrics.length : 0,
        };

        // Save to localStorage
        localStorage.setItem("metrics", JSON.stringify(savedMetrics));
      } else {
        console.warn("Using cached metrics from localStorage");
      }

      // Display metrics (from savedMetrics)
      const totals = savedMetrics.totals;
      const perPhase = savedMetrics.per_phase;

      // Update total metrics
      document.getElementById("totalTime").innerHTML =
        (totals.total_response_time || 0).toFixed(2) +
        '<span class="metric-unit">s</span>';
      document.getElementById("totalTokens").innerHTML =
        (totals.total_tokens || 0) + '<span class="metric-unit">tokens</span>';
      document.getElementById("avgTime").innerHTML =
        (totals.avg_response_time || 0).toFixed(2) +
        '<span class="metric-unit">s</span>';

      // Update per-phase breakdown
      if (perPhase && perPhase.length > 0) {
        displayPhaseMetrics(perPhase);
      }
    })
    .catch((error) => {
      console.error("Failed to fetch metrics:", error);
      // Display cached metrics on error
      displayCachedMetrics();
    });
}

function displayCachedMetrics() {
  const totals = savedMetrics.totals;
  const perPhase = savedMetrics.per_phase;

  document.getElementById("totalTime").innerHTML =
    (totals.total_response_time || 0).toFixed(2) +
    '<span class="metric-unit">s</span>';
  document.getElementById("totalTokens").innerHTML =
    (totals.total_tokens || 0) + '<span class="metric-unit">tokens</span>';
  document.getElementById("avgTime").innerHTML =
    (totals.avg_response_time || 0).toFixed(2) +
    '<span class="metric-unit">s</span>';

  if (perPhase && perPhase.length > 0) {
    displayPhaseMetrics(perPhase);
  }
}

/**
 * Display per-phase metrics
 */
function displayPhaseMetrics(phases) {
  const phaseMetrics = document.getElementById("phaseMetrics");
  phaseMetrics.innerHTML =
    '<h4 style="margin: 20px 0 15px; color: #333; font-size: 14px;">Per-Phase</h4>';

  phases.forEach((pm) => {
    const phaseLabel = pm.phase.charAt(0).toUpperCase() + pm.phase.slice(1);
    phaseMetrics.innerHTML += `
            <div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 8px; font-size: 11px;">
                <div style="font-weight: 600; color: #667eea; margin-bottom: 3px;">${escapeHtml(
                  phaseLabel
                )}</div>
                <div style="color: #6c757d;">${pm.response_time.toFixed(
                  2
                )}s | ${pm.tokens_used} tokens</div>
            </div>
        `;
  });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Review Tab Variables
let currentReviewSuiteId = null;
let editingTests = [];
let chatHistory = [];

/**
 * Switch between edit and chat modes
 */
function switchReviewMode(mode) {
  reviewMode = mode;

  // Update button styles
  const editBtn = document.getElementById("editModeBtn");
  const chatBtn = document.getElementById("chatModeBtn");

  if (mode === "edit") {
    editBtn.style.background = "#667eea";
    editBtn.style.color = "white";
    chatBtn.style.background = "transparent";
    chatBtn.style.color = "#667eea";

    document.getElementById("reviewEditPanel").style.display = "block";
    document.getElementById("reviewChatPanel").style.display = "none";

    // Show/hide edit buttons
    document.getElementById("addTestBtn").style.display = "inline-block";
    document.getElementById("saveSuiteBtn").style.display = "inline-block";
  } else {
    chatBtn.style.background = "#667eea";
    chatBtn.style.color = "white";
    editBtn.style.background = "transparent";
    editBtn.style.color = "#667eea";

    document.getElementById("reviewEditPanel").style.display = "none";
    document.getElementById("reviewChatPanel").style.display = "flex";

    // Hide edit buttons in chat mode
    document.getElementById("addTestBtn").style.display = "none";
    document.getElementById("saveSuiteBtn").style.display = "none";

    // Enable chat input if suite is selected
    if (currentReviewSuiteId) {
      document.getElementById("sendChatBtn").disabled = false;
    }
  }
}

/**
 * Populate review suite selector
 */
function populateReviewSuiteSelector() {
  const select = document.getElementById("reviewSuiteSelect");
  select.innerHTML = '<option value="">-- Select a test suite --</option>';

  savedTestSuites.forEach((suite) => {
    const option = document.createElement("option");
    option.value = suite.id;
    option.textContent = `${suite.name} (${
      suite.data.test_cases?.length || 0
    } tests)`;
    select.appendChild(option);
  });
}

/**
 * Load suite for review
 */
function loadSuiteForReview() {
  const select = document.getElementById("reviewSuiteSelect");
  const suiteId = parseInt(select.value);

  if (!suiteId) {
    currentReviewSuiteId = null;
    document.getElementById("addTestBtn").disabled = true;
    document.getElementById("saveSuiteBtn").disabled = true;
    document.getElementById("reviewTestsContainer").innerHTML = `
            <div style="color: #6c757d; text-align: center; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">💬</div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">Review & Edit Tests</div>
                <div style="font-size: 14px;">Select a test suite above to review and modify test cases</div>
            </div>
        `;
    return;
  }

  currentReviewSuiteId = suiteId;
  const suite = savedTestSuites.find((s) => s.id === suiteId);

  if (!suite) return;

  // Clone test cases for editing
  editingTests = JSON.parse(JSON.stringify(suite.data.test_cases || []));
  chatHistory = []; // Reset chat history

  document.getElementById("addTestBtn").disabled = false;
  document.getElementById("saveSuiteBtn").disabled = false;

  // Enable chat if in chat mode
  if (reviewMode === "chat") {
    document.getElementById("sendChatBtn").disabled = false;
    // Clear chat display
    document.getElementById("chatMessages").innerHTML = `
            <div style="color: #6c757d; text-align: center; padding: 40px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">💬</div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">AI Chat Mode</div>
                <div style="font-size: 14px;">Ask me to add, modify, or remove tests</div>
            </div>
        `;
  }

  renderEditableTests();
}

/**
 * Render editable test cases
 */
function renderEditableTests() {
  const container = document.getElementById("reviewTestsContainer");

  if (editingTests.length === 0) {
    container.innerHTML = `
            <div style="color: #6c757d; text-align: center; padding: 40px 20px;">
                <div style="font-size: 14px;">No tests in this suite. Click "Add Test" to create one.</div>
            </div>
        `;
    return;
  }

  container.innerHTML = editingTests
    .map(
      (test, index) => `
        <div class="editable-test" style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <input type="text" value="${escapeHtml(test.name)}" 
                    onchange="updateTestField(${index}, 'name', this.value)"
                    style="flex: 1; font-size: 14px; font-weight: 600; border: 1px solid #e0e0e0; border-radius: 4px; padding: 6px; margin-right: 10px;">
                <button onclick="deleteTest(${index})" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 12px;">🗑️ Delete</button>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label style="font-size: 11px; color: #667eea; font-weight: 600; display: block; margin-bottom: 4px;">Description:</label>
                <textarea onchange="updateTestField(${index}, 'description', this.value)"
                    style="width: 100%; font-size: 12px; border: 1px solid #e0e0e0; border-radius: 4px; padding: 6px; min-height: 50px;">${escapeHtml(
                      test.description
                    )}</textarea>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label style="font-size: 11px; color: #667eea; font-weight: 600; display: block; margin-bottom: 4px;">Steps (one per line):</label>
                <textarea onchange="updateTestSteps(${index}, this.value)"
                    style="width: 100%; font-size: 12px; border: 1px solid #e0e0e0; border-radius: 4px; padding: 6px; min-height: 80px; font-family: monospace;">${test.steps.join(
                      "\\n"
                    )}</textarea>
            </div>
            
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
                <div>
                    <label style="font-size: 11px; color: #667eea; font-weight: 600; display: block; margin-bottom: 4px;">Expected Outcome:</label>
                    <input type="text" value="${escapeHtml(
                      test.expected_outcome
                    )}"
                        onchange="updateTestField(${index}, 'expected_outcome', this.value)"
                        style="width: 100%; font-size: 12px; border: 1px solid #e0e0e0; border-radius: 4px; padding: 6px;">
                </div>
                <div>
                    <label style="font-size: 11px; color: #667eea; font-weight: 600; display: block; margin-bottom: 4px;">Priority:</label>
                    <select onchange="updateTestField(${index}, 'priority', this.value)"
                        style="width: 100%; font-size: 12px; border: 1px solid #e0e0e0; border-radius: 4px; padding: 6px;">
                        <option value="Low" ${
                          test.priority === "Low" ? "selected" : ""
                        }>Low</option>
                        <option value="Medium" ${
                          test.priority === "Medium" ? "selected" : ""
                        }>Medium</option>
                        <option value="High" ${
                          test.priority === "High" ? "selected" : ""
                        }>High</option>
                    </select>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

/**
 * Update test field
 */
function updateTestField(index, field, value) {
  if (editingTests[index]) {
    editingTests[index][field] = value;
  }
}

/**
 * Update test steps
 */
function updateTestSteps(index, value) {
  if (editingTests[index]) {
    editingTests[index].steps = value
      .split("\\n")
      .filter((s) => s.trim().length > 0);
  }
}

/**
 * Delete test
 */
function deleteTest(index) {
  if (confirm("Delete this test case?")) {
    editingTests.splice(index, 1);
    renderEditableTests();
  }
}

/**
 * Add new test
 */
function addNewTest() {
  const newTest = {
    id: editingTests.length + 1,
    name: "New Test Case",
    description: "Test description here",
    steps: ["Step 1", "Step 2"],
    expected_outcome: "Expected outcome here",
    priority: "Medium",
  };
  editingTests.push(newTest);
  renderEditableTests();

  // Scroll to bottom
  const container = document.getElementById("reviewTestsContainer");
  container.scrollTop = container.scrollHeight;
}

/**
 * Send chat message to AI
 */
async function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();

  if (!message || !currentReviewSuiteId) return;

  const suite = savedTestSuites.find((s) => s.id === currentReviewSuiteId);
  if (!suite) return;

  // Add user message to chat
  addChatMessage("user", message);
  input.value = "";

  // Disable input while processing
  document.getElementById("sendChatBtn").disabled = true;
  input.disabled = true;

  try {
    // Send to AI with test suite AND exploration context
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message,
        context: {
          suite_name: suite.name,
          test_cases: editingTests,
          url: suite.url,
          elements: suite.exploration?.elements || [],
          structure: suite.exploration?.structure || "",
        },
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Update metrics from chat interaction
      if (result.metrics) {
        const existingMetrics = JSON.parse(
          localStorage.getItem("metrics") || '{"per_phase": [], "totals": {}}'
        );
        existingMetrics.per_phase.push({
          phase: result.metrics.phase,
          response_time: result.metrics.response_time,
          tokens_used: result.metrics.tokens_used,
          timestamp: Date.now(),
        });
        localStorage.setItem("metrics", JSON.stringify(existingMetrics));
        await updateMetrics();
      }

      // Check if AI returned modified test cases
      if (
        result.data.modified_tests &&
        Array.isArray(result.data.modified_tests)
      ) {
        editingTests = result.data.modified_tests;
        renderEditableTests();

        // Update the suite selector to show new count
        const suiteSelect = document.getElementById("reviewSuiteSelect");
        if (suiteSelect && currentReviewSuiteId) {
          const option = suiteSelect.querySelector(
            `option[value="${currentReviewSuiteId}"]`
          );
          if (option) {
            const suite = savedTestSuites.find(
              (s) => s.id === currentReviewSuiteId
            );
            if (suite) {
              option.textContent = `${suite.name} (${editingTests.length} tests)`;
            }
          }
        }

        addChatMessage(
          "assistant",
          result.data.response || "Done! I updated the test cases."
        );
        // Indicate unsaved changes
        document.getElementById("saveSuiteBtn").style.background = "#dc3545";
        document.getElementById("saveSuiteBtn").textContent =
          "💾 Save Changes*";
      } else {
        addChatMessage("assistant", result.data.response);
      }
    } else {
      addChatMessage(
        "assistant",
        "Sorry, I encountered an error. Please try again."
      );
    }
  } catch (error) {
    console.error("Chat error:", error);
    let errorMsg = "Connection error. Please check your backend.";
    if (error.message && error.message.includes("402")) {
      errorMsg =
        "⚠️ API limit reached. Please check your API credits or switch providers.";
    } else if (error.message && error.message.includes("500")) {
      errorMsg =
        "Server error. The AI service may be unavailable. Try again later.";
    }
    addChatMessage("assistant", errorMsg);
  } finally {
    document.getElementById("sendChatBtn").disabled = false;
    input.disabled = false;
    input.focus();
  }
}

/**
 * Add message to chat display
 */
function addChatMessage(role, content) {
  const container = document.getElementById("chatMessages");

  // Clear placeholder on first message
  if (chatHistory.length === 0) {
    container.innerHTML = "";
  }

  chatHistory.push({ role, content, timestamp: new Date() });

  const messageDiv = document.createElement("div");
  messageDiv.style.cssText = `
        margin-bottom: 15px;
        padding: 12px;
        border-radius: 8px;
        ${
          role === "user"
            ? "background: #667eea; color: white; margin-left: 20%; text-align: right;"
            : "background: #f8f9fa; color: #333; margin-right: 20%;"
        }
    `;

  messageDiv.innerHTML = `
        <div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px;">${
          role === "user" ? "You" : "AI Assistant"
        }</div>
        <div style="font-size: 13px; line-height: 1.5;">${escapeHtml(
          content
        )}</div>
    `;

  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

/**
 * Save suite changes
 */
function saveSuiteChanges() {
  if (!currentReviewSuiteId) return;

  const suite = savedTestSuites.find((s) => s.id === currentReviewSuiteId);
  if (!suite) return;

  // Renumber IDs sequentially
  editingTests.forEach((test, index) => {
    test.id = index + 1;
  });

  // Update suite data
  suite.data.test_cases = editingTests;

  // Save to localStorage
  localStorage.setItem("testSuites", JSON.stringify(savedTestSuites));

  // Update displays
  renderTestSuitesList();
  populateReviewSuiteSelector();
  populateCodegenSuiteSelector();

  // Reset save button
  document.getElementById("saveSuiteBtn").style.background = "#667eea";
  document.getElementById("saveSuiteBtn").textContent = "💾 Save Changes";

  // Show confirmation
  alert("✅ Changes saved successfully!");
}

// Code Generation Variables
let currentCodegenSuiteId = null;
let generatedCode = "";

/**
 * Populate codegen suite selector
 */
function populateCodegenSuiteSelector() {
  const select = document.getElementById("codegenSuiteSelect");
  select.innerHTML = '<option value="">-- Select a test suite --</option>';

  savedTestSuites.forEach((suite) => {
    const option = document.createElement("option");
    option.value = suite.id;
    option.textContent = `${suite.name} (${
      suite.data.test_cases?.length || 0
    } tests)`;
    select.appendChild(option);
  });
}

/**
 * Update codegen preview
 */
function updateCodegenPreview() {
  const select = document.getElementById("codegenSuiteSelect");
  const suiteId = parseInt(select.value);

  if (!suiteId) {
    currentCodegenSuiteId = null;
    document.getElementById("generateCodeBtn").disabled = true;
    document.getElementById("downloadCodeBtn").disabled = true;
    document.getElementById("codegenDisplay").innerHTML = `
            <div style="color: #a0a0a0; text-align: center; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">💻</div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px; color: #ffffff;">Code Generation</div>
                <div style="font-size: 14px;">Select a test suite to generate Playwright Python code</div>
            </div>
        `;
    return;
  }

  currentCodegenSuiteId = suiteId;
  const suite = savedTestSuites.find((s) => s.id === suiteId);

  if (!suite) return;

  document.getElementById("generateCodeBtn").disabled = false;

  // Show suite preview
  const testCount = suite.data.test_cases?.length || 0;
  document.getElementById("codegenDisplay").innerHTML = `
        <div style="color: #a0a0a0;">
            <h3 style="color: #ffffff; margin-bottom: 15px;">📋 ${escapeHtml(
              suite.name
            )}</h3>
            <p style="font-size: 13px; margin-bottom: 10px;">URL: <span style="color: #4ec9b0;">${escapeHtml(
              suite.url
            )}</span></p>
            <p style="font-size: 13px; margin-bottom: 20px;">Test Cases: <span style="color: #ce9178;">${testCount}</span></p>
            <p style="font-size: 13px; color: #dcdcaa;">Click "Generate Playwright Code" to create executable Python tests</p>
        </div>
    `;
}

/**
 * Generate Playwright code
 */
async function generateCode() {
  if (!currentCodegenSuiteId) return;

  const suite = savedTestSuites.find((s) => s.id === currentCodegenSuiteId);
  if (!suite) return;

  const generateBtn = document.getElementById("generateCodeBtn");
  const customInstructions = document
    .getElementById("codegenInstructions")
    .value.trim();

  generateBtn.disabled = true;
  generateBtn.textContent = "⚙️ Generating...";

  document.getElementById("codegenDisplay").innerHTML = `
        <div style="color: #a0a0a0; text-align: center; padding: 60px 20px;">
            <div class="spinner" style="margin: 0 auto 20px;"></div>
            <div style="font-size: 16px; color: #ffffff;">Generating Playwright Python code...</div>
        </div>
    `;

  try {
    // Use global runTestsEnabled flag (updated by checkbox event listener)
    console.log("🧪 runTestsEnabled global value:", runTestsEnabled);

    const response = await fetch(`${API_BASE}/api/generate-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        test_cases: suite.data.test_cases,
        url: suite.url,
        suite_name: suite.name,
        elements: suite.exploration?.elements || [],
        custom_instructions: customInstructions,
        run_tests: runTestsEnabled,
        headless: true,
      }),
    });

    const result = await response.json();

    if (result.success) {
      generatedCode = result.data.code;
      updateMetrics();

      // Display execution log if available
      const executionLogContainer = document.getElementById(
        "executionLogContainer"
      );
      if (result.data.execution_log) {
        const log = result.data.execution_log;
        const statusColor = log.all_passed ? "#4ade80" : "#f87171";
        const statusIcon = log.all_passed ? "✅" : "⚠️";

        executionLogContainer.style.display = "block";
        document.getElementById("executionSummary").innerHTML = `
          <span style="color: ${statusColor}; font-weight: 600;">
            ${statusIcon} ${log.passed}/${
          log.total_tests
        } passed (${log.success_rate.toFixed(1)}%)
          </span>
          <span style="margin-left: 10px; color: #888;">⏱️ ${log.duration.toFixed(
            2
          )}s</span>
        `;

        // Build test results HTML
        let resultsHtml = "";
        log.test_results.forEach((test) => {
          const icon = test.passed ? "✅" : "❌";
          const color = test.passed ? "#4ade80" : "#f87171";
          resultsHtml += `<div style="padding: 5px 0; border-bottom: 1px solid #333;">
            <span style="color: ${color};">${icon} ${test.test_name}</span>
            <span style="color: #888; margin-left: 10px;">(${test.duration.toFixed(
              2
            )}s)</span>`;
          if (!test.passed && test.error_message) {
            resultsHtml += `<div style="color: #f87171; font-size: 11px; margin-top: 4px; padding-left: 20px;">
              ${test.error_type}: ${escapeHtml(
              test.error_message.substring(0, 200)
            )}
              ${test.line_number ? `(line ${test.line_number})` : ""}
            </div>`;
          }
          resultsHtml += `</div>`;
        });

        document.getElementById("executionDetails").innerHTML = resultsHtml;
      } else {
        executionLogContainer.style.display = "none";
      }

      // Display code with syntax highlighting
      document.getElementById("codegenDisplay").innerHTML = `
                <div style="position: relative;">
                    <div style="position: absolute; top: 10px; right: 10px;">
                        <button onclick="copyCodeToClipboard()" style="background: #667eea; color: white; border: none; border-radius: 4px; padding: 6px 12px; font-size: 12px; cursor: pointer;">📋 Copy</button>
                    </div>
                    <pre style="background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 8px; overflow-x: auto; font-family: 'Consolas', 'Monaco', monospace; font-size: 12px; line-height: 1.5; margin: 0;"><code>${escapeHtml(
                      generatedCode
                    )}</code></pre>
                </div>
            `;

      document.getElementById("downloadCodeBtn").disabled = false;
    } else {
      throw new Error(result.message || "Code generation failed");
    }
  } catch (error) {
    console.error("Code generation error:", error);
    document.getElementById("executionLogContainer").style.display = "none";
    document.getElementById("codegenDisplay").innerHTML = `
            <div style="color: #f48771; padding: 20px;">
                <h3 style="color: #f48771; margin-bottom: 10px;">❌ Error</h3>
                <p style="font-size: 13px;">${escapeHtml(error.message)}</p>
            </div>
        `;
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "⚡ Generate Playwright Code";
  }
}

/**
 * Copy code to clipboard
 */
function copyCodeToClipboard() {
  navigator.clipboard
    .writeText(generatedCode)
    .then(() => {
      alert("✅ Code copied to clipboard!");
    })
    .catch((err) => {
      console.error("Copy failed:", err);
      alert("❌ Failed to copy code");
    });
}

/**
 * Download generated code
 */
function downloadCode() {
  if (!generatedCode) return;

  const suite = savedTestSuites.find((s) => s.id === currentCodegenSuiteId);
  const filename = `test_${
    suite ? suite.name.replace(/\s+/g, "_").toLowerCase() : "suite"
  }.py`;

  const blob = new Blob([generatedCode], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  console.log("🤖 Web Testing Agent initialized");
  renderExplorationsList();
  updateMetrics();
  populateReviewSuiteSelector();
  populateCodegenSuiteSelector();

  // Update test suites badge
  if (savedTestSuites.length > 0) {
    document.getElementById("testSuitesTab").innerHTML =
      '📋 Test Suites <span style="background:#dc3545;color:white;border-radius:10px;padding:2px 6px;font-size:10px;margin-left:5px;">' +
      savedTestSuites.length +
      "</span>";
  }

  // Initialize Run Tests checkbox listener and status element
  initRunTestsCheckbox();
});

/**
 * Initialize the Run Tests checkbox with event listener
 */
function initRunTestsCheckbox() {
  const runTestsCheckbox = document.getElementById("runTestsCheckbox");
  const runTestsStatus = document.getElementById("runTestsStatus");

  console.log("🔧 Initializing runTestsCheckbox:", runTestsCheckbox);
  console.log("🔧 runTestsStatus element:", runTestsStatus);

  if (runTestsCheckbox && runTestsStatus) {
    const updateStatus = (enabled) => {
      console.log("🔧 Checkbox changed:", enabled);
      runTestsEnabled = enabled; // Update global flag
      runTestsStatus.textContent = enabled
        ? "Test execution: Enabled"
        : "Test execution: Disabled";
      runTestsStatus.style.color = enabled ? "#4ade80" : "#bbb";
    };

    // Set initial status based on checkbox state
    runTestsEnabled = runTestsCheckbox.checked; // Initialize global flag
    updateStatus(runTestsCheckbox.checked);

    // Attach change event listener
    runTestsCheckbox.addEventListener("change", (e) => {
      updateStatus(e.target.checked);
    });

    console.log(
      "✅ runTestsCheckbox listener attached, initial value:",
      runTestsEnabled
    );
  } else {
    console.warn(
      "⚠️ Could not find runTestsCheckbox or runTestsStatus elements"
    );
  }
}
