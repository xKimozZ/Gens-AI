/**
 * Code Generation Tab UI Module
 * Handles Phase 4: Playwright Code Generation
 */

/**
 * Populate codegen suite selector
 */
function populateCodegenSuiteSelector() {
  const select = document.getElementById("codegenSuiteSelect");
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
 * Update codegen preview
 */
function updateCodegenPreview() {
  const select = document.getElementById("codegenSuiteSelect");
  const suiteId = parseInt(select.value);

  if (!suiteId) {
    window.appState.currentCodegenSuiteId = null;
    document.getElementById("generateCodeBtn").disabled = true;
    document.getElementById("downloadCodeBtn").disabled = true;
    
    const display = document.getElementById("codegenDisplay");
    display.innerHTML = `
      <div style="color: #a0a0a0; text-align: center; padding: 60px 20px;">
        <div style="font-size: 48px; margin-bottom: 20px;">💻</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px; color: #ffffff;">Code Generation</div>
        <div style="font-size: 14px;">Select a test suite to generate Playwright Python code</div>
      </div>
    `;
    return;
  }

  window.appState.currentCodegenSuiteId = suiteId;
  const suite = getTestSuiteById(suiteId);

  if (!suite) return;

  document.getElementById("generateCodeBtn").disabled = false;

  // Show suite preview
  const testCount = suite.data.test_cases?.length || 0;
  document.getElementById("codegenDisplay").innerHTML = `
    <div style="color: #a0a0a0;">
      <h3 style="color: #ffffff; margin-bottom: 15px;">📋 ${escapeHtml(suite.name)}</h3>
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
  if (!window.appState.currentCodegenSuiteId) return;

  const suite = getTestSuiteById(window.appState.currentCodegenSuiteId);
  if (!suite) return;

  const generateBtn = document.getElementById("generateCodeBtn");
  const customInstructions = document.getElementById("codegenInstructions").value.trim();

  generateBtn.disabled = true;
  generateBtn.textContent = "⚙️ Generating...";

  const display = document.getElementById("codegenDisplay");
  display.innerHTML = `
    <div style="color: #a0a0a0; text-align: center; padding: 60px 20px;">
      <div class="spinner" style="margin: 0 auto 20px;"></div>
      <div style="font-size: 16px; color: #ffffff;">Generating Playwright Python code...</div>
    </div>
  `;

  try {
    const result = await apiGenerateCode(
      suite.data.test_cases,
      suite.url,
      suite.name,
      suite.exploration?.elements || [],
      customInstructions
    );

    if (result.success) {
      window.appState.generatedCode = result.data.code;

      // Clean up code formatting if it contains escaped newlines
      if (typeof window.appState.generatedCode === "string" && window.appState.generatedCode.includes("\\n")) {
        console.log("[CODE GEN] Detected escaped newlines, converting to actual line breaks");
        // Replace escaped newlines with actual newlines
        window.appState.generatedCode = window.appState.generatedCode.replace(/\\n/g, "\n");
        // Replace escaped quotes if present
        window.appState.generatedCode = window.appState.generatedCode.replace(/\\'/g, "'");
        window.appState.generatedCode = window.appState.generatedCode.replace(/\\"/g, '"');
      }

      updateMetrics();

      // Display code with syntax highlighting
      display.innerHTML = `
        <div style="position: relative;">
          <div style="position: absolute; top: 10px; right: 10px;">
            <button onclick="copyCodeToClipboard()" style="background: #667eea; color: white; border: none; border-radius: 4px; padding: 6px 12px; font-size: 12px; cursor: pointer;">📋 Copy</button>
          </div>
          <pre style="background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 8px; overflow-x: auto; font-family: 'Consolas', 'Monaco', monospace; font-size: 12px; line-height: 1.5; margin: 0;"><code>${escapeHtml(
            window.appState.generatedCode
          )}</code></pre>
        </div>
      `;

      document.getElementById("downloadCodeBtn").disabled = false;
    } else {
      throw new Error(result.message || "Code generation failed");
    }
  } catch (error) {
    console.error("Code generation error:", error);
    display.innerHTML = `
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
async function copyCodeToClipboard() {
  const success = await copyToClipboard(window.appState.generatedCode);
  if (success) {
    alert("✅ Code copied to clipboard!");
  } else {
    alert("❌ Failed to copy code");
  }
}

/**
 * Download generated code
 */
function downloadCode() {
  if (!window.appState.generatedCode) return;

  const suite = getTestSuiteById(window.appState.currentCodegenSuiteId);
  const filename = `test_${sanitizeFilename(suite ? suite.name : "suite")}.py`;

  downloadTextFile(window.appState.generatedCode, filename);
}
