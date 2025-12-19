/**
 * API Communication Layer
 * All backend communication goes through this module
 */

const API_BASE = window.location.origin;

/**
 * Explore a URL and get page structure
 */
async function apiExploreUrl(url) {
  const response = await fetch(`${API_BASE}/api/explore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Design test cases based on exploration
 */
async function apiDesignTests(explorationData, testCount) {
  const response = await fetch(`${API_BASE}/api/design-tests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...explorationData,
      desired_test_count: testCount,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Send chat message to AI
 */
async function apiSendChatMessage(message, context) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: message,
      context: context,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Generate Playwright code from test cases
 */
async function apiGenerateCode(testCases, url, suiteName, elements, customInstructions) {
  const response = await fetch(`${API_BASE}/api/generate-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      test_cases: testCases,
      url: url,
      suite_name: suiteName,
      elements: elements || [],
      custom_instructions: customInstructions,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Get metrics from backend
 */
async function apiGetMetrics() {
  const response = await fetch(`${API_BASE}/api/metrics`);

  if (!response.ok) {
    console.warn("Metrics endpoint returned:", response.status, "- using cached metrics");
    return null;
  }

  return await response.json();
}

/**
 * Reset agent state on backend
 */
async function apiResetAgent() {
  const response = await fetch(`${API_BASE}/api/reset`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}
