/**
 * Test Design Tab UI Module
 * Handles Phase 2: Test Case Design
 */

/**
 * Design test cases from exploration
 */
async function designTests() {
  if (!window.appState.explorationData) {
    alert("Please explore a page first");
    return;
  }

  const designBtn = document.getElementById("designBtn");
  designBtn.disabled = true;

  // Get desired test count
  const testCount = parseInt(document.getElementById("testCountSelect").value) || 12;

  // Switch to test suites tab and show loading
  switchTab("testsuites");
  document.querySelectorAll(".tab-btn")[1].click();
  
  const display = document.getElementById("testSuiteDisplay");
  showLoadingIndicator(
    display,
    `📋 Designing ${testCount} test cases... (This may take 30-60 seconds)`
  );

  try {
    const result = await apiDesignTests(window.appState.explorationData, testCount);

    if (result.success) {
      console.log("Test design result:", result.data);

      // Save test suite with exploration data embedded
      const testSuite = addTestSuite(
        result.data,
        window.appState.selectedExplorationId,
        window.appState.explorationData.url,
        window.appState.explorationData.elements || []
      );

      displayTestDesign(result.data);
      updateMetrics();
      renderTestSuitesList();
      populateReviewSuiteSelector();
      populateCodegenSuiteSelector();

      // Auto-select the new test suite in Review tab
      const reviewSelect = document.getElementById("reviewSuiteSelect");
      if (reviewSelect) {
        reviewSelect.value = testSuite.id;
      }

      // Show notification badge on Test Suites tab
      updateTestSuitesBadge();
    } else {
      throw new Error(result.message || "Test design failed");
    }
  } catch (error) {
    showErrorMessage(display, "Test Design Error", error.message);
    console.error("Test design error:", error);
  } finally {
    designBtn.disabled = false;
  }
}

/**
 * Display test design results
 */
function displayTestDesign(data) {
  const display = document.getElementById("testSuiteDisplay");
  const testCases = data.test_cases || [];

  console.log("Displaying test cases:", testCases.length, testCases);

  const testCasesHtml = testCases
    .map((tc, index) => renderTestCase(tc, index))
    .join("");

  display.innerHTML = `
    <span class="phase-badge">Phase 2: Test Design Complete</span>
    <h3 style="margin-bottom: 15px;">Generated Test Cases (${testCases.length})</h3>
    <p style="margin-bottom: 15px; color: #6c757d; font-size: 13px;">Coverage Score: ${(
      data.coverage_score || 0
    ).toFixed(1)}%</p>
    <div>
      ${testCasesHtml || '<p style="color: #6c757d;">No test cases generated</p>'}
    </div>
  `;
}

/**
 * Display test design in suite view
 */
function displayTestDesignInSuite(data, suiteName, url) {
  const display = document.getElementById("testSuiteDisplay");
  const testCases = data.test_cases || [];

  const testCasesHtml = testCases
    .map((tc, index) => renderTestCase(tc, index))
    .join("");

  display.innerHTML = `
    <div style="margin-bottom: 15px;">
      <h3 style="margin-bottom: 8px; color: #333;">${escapeHtml(suiteName)}</h3>
      <p style="font-size: 12px; color: #6c757d; margin-bottom: 5px;"><strong>URL:</strong> ${escapeHtml(
        url
      )}</p>
      <p style="font-size: 12px; color: #6c757d;"><strong>Coverage:</strong> ${(
        data.coverage_score || 0
      ).toFixed(1)}% | <strong>Test Cases:</strong> ${testCases.length}</p>
    </div>
    <div>
      ${testCasesHtml || '<p style="color: #6c757d;">No test cases generated</p>'}
    </div>
  `;
}

/**
 * Render a single test case
 */
function renderTestCase(tc, index) {
  return `
    <div class="test-case">
      <div class="test-case-header" onclick="toggleTestCase(${index})">
        <div style="flex: 1;">
          <div class="test-case-name">Test #${tc.id || index + 1}: ${escapeHtml(
            tc.name || "Unnamed Test"
          )}</div>
          <div style="font-size: 11px; color: #6c757d; margin-top: 3px;">${escapeHtml(
            tc.description || "No description"
          )}</div>
        </div>
        <div class="toggle-icon" id="toggle-${index}">▼</div>
      </div>
      <div class="test-case-details" id="details-${index}" style="display: none;">
        ${tc.steps ? renderTestSteps(tc.steps) : ""}
        ${tc.expected_outcome || tc.expected ? renderExpectedOutcome(tc.expected_outcome || tc.expected) : ""}
        ${tc.priority ? renderPriority(tc.priority) : ""}
        ${tc.locators ? renderLocators(tc.locators) : ""}
      </div>
    </div>
  `;
}

/**
 * Render test steps
 */
function renderTestSteps(steps) {
  const stepsArray = Array.isArray(steps) ? steps : [steps];
  return `
    <div style="margin-top: 12px;">
      <strong style="color: #667eea; font-size: 12px;">Steps:</strong>
      <ol style="margin: 8px 0; padding-left: 20px; font-size: 12px;">
        ${stepsArray
          .map(
            (step) => `
          <li style="margin-bottom: 4px;">${escapeHtml(String(step))}</li>
        `
          )
          .join("")}
      </ol>
    </div>
  `;
}

/**
 * Render expected outcome
 */
function renderExpectedOutcome(outcome) {
  return `
    <div style="margin-top: 12px;">
      <strong style="color: #667eea; font-size: 12px;">Expected Outcome:</strong>
      <div style="font-size: 12px; margin-top: 4px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
        ${escapeHtml(outcome)}
      </div>
    </div>
  `;
}

/**
 * Render priority badge
 */
function renderPriority(priority) {
  return `
    <div style="margin-top: 12px;">
      <strong style="color: #667eea; font-size: 12px;">Priority:</strong>
      <span style="margin-left: 8px; padding: 2px 8px; background: #667eea; color: white; border-radius: 12px; font-size: 11px;">
        ${escapeHtml(priority)}
      </span>
    </div>
  `;
}

/**
 * Render locators
 */
function renderLocators(locators) {
  return `
    <div style="margin-top: 12px;">
      <strong style="color: #667eea; font-size: 12px;">Locators:</strong>
      <pre style="font-size: 11px; margin-top: 4px; padding: 8px; background: #f8f9fa; border-radius: 4px; overflow-x: auto;">${escapeHtml(
        JSON.stringify(locators, null, 2)
      )}</pre>
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
 * Render test suites list
 */
function renderTestSuitesList() {
  const list = document.getElementById("testSuitesList");
  const testSuites = getSavedTestSuites();

  if (testSuites.length === 0) {
    list.innerHTML = `
      <div style="color: #999; font-size: 11px; text-align: center; padding: 20px 10px;">
        No test suites yet
      </div>
    `;
    return;
  }

  list.innerHTML = testSuites
    .map((suite) => {
      const testCases = suite.data.test_cases || [];
      return `
        <div class="exploration-item ${
          suite.id === window.appState.currentTestSuiteId ? "selected" : ""
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
          <div style="font-size: 9px; color: #999;">${testCases.length} tests | ${(
        suite.data.coverage_score || 0
      ).toFixed(1)}%</div>
        </div>
      `;
    })
    .join("");
}

/**
 * View test suite details
 */
function viewTestSuite(id) {
  window.appState.currentTestSuiteId = id;
  const suite = getTestSuiteById(id);
  if (suite) {
    // Ensure we're on test suites tab
    if (window.appState.currentTab !== "testsuites") {
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
  updateTestSuiteName(id, newName);
}

/**
 * Delete test suite
 */
function deleteTestSuite(id) {
  if (confirm("Delete this test suite?")) {
    deleteTestSuiteById(id);
    renderTestSuitesList();
    updateTestSuitesBadge();
  }
}

/**
 * Update test suites badge count
 */
function updateTestSuitesBadge() {
  const testSuites = getSavedTestSuites();
  const badge =
    testSuites.length > 0
      ? ` <span style="background:#dc3545;color:white;border-radius:10px;padding:2px 6px;font-size:10px;margin-left:5px;">${testSuites.length}</span>`
      : "";
  document.getElementById("testSuitesTab").innerHTML = "📋 Test Suites" + badge;
}
