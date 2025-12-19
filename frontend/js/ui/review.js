/**
 * Review Tab UI Module
 * Handles Phase 3: Review & Edit Tests + AI Chat
 */

/**
 * Switch between edit and chat modes
 */
function switchReviewMode(mode) {
  window.appState.reviewMode = mode;

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

    // Show/hide buttons
    document.getElementById("addTestBtn").style.display = "inline-block";
    document.getElementById("saveSuiteBtn").style.display = "inline-block";
  } else {
    chatBtn.style.background = "#667eea";
    chatBtn.style.color = "white";
    editBtn.style.background = "transparent";
    editBtn.style.color = "#667eea";

    document.getElementById("reviewEditPanel").style.display = "none";
    document.getElementById("reviewChatPanel").style.display = "flex";

    // Hide add button in chat mode, but keep save button visible
    document.getElementById("addTestBtn").style.display = "none";
    document.getElementById("saveSuiteBtn").style.display = "inline-block";

    // Enable chat input if suite is selected
    if (window.appState.currentReviewSuiteId) {
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

  const testSuites = getSavedTestSuites();
  testSuites.forEach((suite) => {
    const option = document.createElement("option");
    option.value = suite.id;
    option.textContent = `${suite.name} (${suite.data.test_cases?.length || 0} tests)`;
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
    window.appState.currentReviewSuiteId = null;
    document.getElementById("addTestBtn").disabled = true;
    document.getElementById("saveSuiteBtn").disabled = true;
    showEmptyState(
      document.getElementById("reviewTestsContainer"),
      "💬",
      "Review & Edit Tests",
      "Select a test suite above to review and modify test cases"
    );
    return;
  }

  window.appState.currentReviewSuiteId = suiteId;
  const suite = getTestSuiteById(suiteId);

  if (!suite) return;

  // Clone test cases for editing
  window.appState.editingTests = JSON.parse(JSON.stringify(suite.data.test_cases || []));
  window.appState.chatHistory = getChatHistory(suiteId);

  document.getElementById("addTestBtn").disabled = false;
  document.getElementById("saveSuiteBtn").disabled = false;

  // Enable chat if in chat mode
  if (window.appState.reviewMode === "chat") {
    document.getElementById("sendChatBtn").disabled = false;
    // Restore chat history
    if (window.appState.chatHistory.length > 0) {
      document.getElementById("chatMessages").innerHTML = "";
      window.appState.chatHistory.forEach((msg) => addChatMessage(msg.role, msg.content));
    } else {
      showEmptyState(
        document.getElementById("chatMessages"),
        "💬",
        "AI Chat Mode",
        "Ask me to add, modify, or remove tests"
      );
    }
  }

  renderEditableTests();
}

/**
 * Render editable test cases
 */
function renderEditableTests() {
  const container = document.getElementById("reviewTestsContainer");

  if (window.appState.editingTests.length === 0) {
    container.innerHTML = `
      <div style="color: #6c757d; text-align: center; padding: 40px 20px;">
        <div style="font-size: 14px;">No tests in this suite. Click "Add Test" to create one.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = window.appState.editingTests
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
              "\n"
            )}</textarea>
        </div>
        
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
          <div>
            <label style="font-size: 11px; color: #667eea; font-weight: 600; display: block; margin-bottom: 4px;">Expected Outcome:</label>
            <input type="text" value="${escapeHtml(test.expected_outcome)}"
              onchange="updateTestField(${index}, 'expected_outcome', this.value)"
              style="width: 100%; font-size: 12px; border: 1px solid #e0e0e0; border-radius: 4px; padding: 6px;">
          </div>
          <div>
            <label style="font-size: 11px; color: #667eea; font-weight: 600; display: block; margin-bottom: 4px;">Priority:</label>
            <select onchange="updateTestField(${index}, 'priority', this.value)"
              style="width: 100%; font-size: 12px; border: 1px solid #e0e0e0; border-radius: 4px; padding: 6px;">
              <option value="Low" ${test.priority === "Low" ? "selected" : ""}>Low</option>
              <option value="Medium" ${test.priority === "Medium" ? "selected" : ""}>Medium</option>
              <option value="High" ${test.priority === "High" ? "selected" : ""}>High</option>
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
  if (window.appState.editingTests[index]) {
    window.appState.editingTests[index][field] = value;
  }
}

/**
 * Update test steps
 */
function updateTestSteps(index, value) {
  if (window.appState.editingTests[index]) {
    window.appState.editingTests[index].steps = value
      .split("\n")
      .filter((s) => s.trim().length > 0);
  }
}

/**
 * Delete test
 */
function deleteTest(index) {
  if (confirm("Delete this test case?")) {
    window.appState.editingTests.splice(index, 1);
    renderEditableTests();
  }
}

/**
 * Add new test
 */
function addNewTest() {
  const newTest = {
    id: window.appState.editingTests.length + 1,
    name: "New Test Case",
    description: "Test description here",
    steps: ["Step 1", "Step 2"],
    expected_outcome: "Expected outcome here",
    priority: "Medium",
  };
  window.appState.editingTests.push(newTest);
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

  if (!message || !window.appState.currentReviewSuiteId) return;

  const suite = getTestSuiteById(window.appState.currentReviewSuiteId);
  if (!suite) return;

  // Add user message to chat
  addChatMessage("user", message);
  input.value = "";

  // Disable input while processing
  document.getElementById("sendChatBtn").disabled = true;
  input.disabled = true;

  try {
    // Send to AI with test suite AND exploration context
    const result = await apiSendChatMessage(message, {
      suite_name: suite.name,
      test_cases: window.appState.editingTests,
      url: suite.url,
      elements: suite.exploration?.elements || [],
      structure: suite.exploration?.structure || "",
    });

    if (result.success) {
      // Update metrics from chat interaction
      if (result.metrics) {
        const existingMetrics = getSavedMetrics();
        existingMetrics.per_phase.push({
          phase: result.metrics.phase,
          response_time: result.metrics.response_time,
          tokens_used: result.metrics.tokens_used,
          timestamp: Date.now(),
        });
        saveMetrics(existingMetrics);
        await updateMetrics();
      }

      // Check if AI returned modified test cases
      if (result.data.modified_tests && Array.isArray(result.data.modified_tests)) {
        window.appState.editingTests = result.data.modified_tests;
        renderEditableTests();

        // Update the suite selector to show new count
        const suiteSelect = document.getElementById("reviewSuiteSelect");
        if (suiteSelect && window.appState.currentReviewSuiteId) {
          const option = suiteSelect.querySelector(
            `option[value="${window.appState.currentReviewSuiteId}"]`
          );
          if (option) {
            option.textContent = `${suite.name} (${window.appState.editingTests.length} tests)`;
          }
        }

        addChatMessage("assistant", result.data.response || "Done! I updated the test cases.");
        // Indicate unsaved changes
        document.getElementById("saveSuiteBtn").style.background = "#dc3545";
        document.getElementById("saveSuiteBtn").textContent = "💾 Save Changes*";
      } else {
        addChatMessage("assistant", result.data.response);
      }
    } else {
      addChatMessage("assistant", "Sorry, I encountered an error. Please try again.");
    }
  } catch (error) {
    console.error("Chat error:", error);
    let errorMsg = "Connection error. Please check your backend.";
    if (error.message && error.message.includes("402")) {
      errorMsg = "⚠️ API limit reached. Please check your API credits or switch providers.";
    } else if (error.message && error.message.includes("500")) {
      errorMsg = "Server error. The AI service may be unavailable. Try again later.";
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
  if (window.appState.chatHistory.length === 0) {
    container.innerHTML = "";
  }

  window.appState.chatHistory.push({ role, content, timestamp: new Date() });

  // Save chat history
  if (window.appState.currentReviewSuiteId) {
    saveChatHistory(window.appState.currentReviewSuiteId, window.appState.chatHistory);
  }

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
    <div style="font-size: 13px; line-height: 1.5;">${escapeHtml(content)}</div>
  `;

  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

/**
 * Save suite changes
 */
function saveSuiteChanges() {
  if (!window.appState.currentReviewSuiteId) return;

  const suite = updateTestSuiteData(
    window.appState.currentReviewSuiteId,
    window.appState.editingTests
  );

  if (suite) {
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
}
