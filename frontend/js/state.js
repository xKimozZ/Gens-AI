/**
 * State Management Module
 * Handles all global state and localStorage operations
 */

// Global state
window.appState = {
  explorationData: null,
  selectedExplorationId: null,
  currentTab: "explorations",
  reviewMode: "edit",
  currentReviewSuiteId: null,
  currentCodegenSuiteId: null,
  currentTestSuiteId: null,
  editingTests: [],
  chatHistory: [],
  generatedCode: "",
};

// LocalStorage keys
const STORAGE_KEYS = {
  EXPLORATIONS: "explorations",
  TEST_SUITES: "testSuites",
  METRICS: "metrics",
  CHAT_HISTORY: "chatHistory",
};

/**
 * Get saved explorations from localStorage
 */
function getSavedExplorations() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPLORATIONS) || "[]");
}

/**
 * Save explorations to localStorage
 */
function saveExplorations(explorations) {
  localStorage.setItem(STORAGE_KEYS.EXPLORATIONS, JSON.stringify(explorations));
}

/**
 * Get saved test suites from localStorage
 */
function getSavedTestSuites() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.TEST_SUITES) || "[]");
}

/**
 * Save test suites to localStorage
 */
function saveTestSuites(testSuites) {
  localStorage.setItem(STORAGE_KEYS.TEST_SUITES, JSON.stringify(testSuites));
}

/**
 * Get saved metrics from localStorage
 */
function getSavedMetrics() {
  return JSON.parse(
    localStorage.getItem(STORAGE_KEYS.METRICS) ||
      '{"per_phase":[], "totals":{"total_response_time":0, "total_tokens":0, "avg_response_time":0}}'
  );
}

/**
 * Save metrics to localStorage
 */
function saveMetrics(metrics) {
  localStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify(metrics));
}

/**
 * Get chat history for a specific suite
 */
function getChatHistory(suiteId) {
  const key = `${STORAGE_KEYS.CHAT_HISTORY}_${suiteId}`;
  return JSON.parse(localStorage.getItem(key) || "[]");
}

/**
 * Save chat history for a specific suite
 */
function saveChatHistory(suiteId, history) {
  const key = `${STORAGE_KEYS.CHAT_HISTORY}_${suiteId}`;
  localStorage.setItem(key, JSON.stringify(history));
}

/**
 * Add a new exploration
 */
function addExploration(explorationData, url) {
  const explorations = getSavedExplorations();
  const exploration = {
    id: Date.now(),
    name: `Exploration ${explorations.length + 1}`,
    url: url,
    timestamp: new Date().toISOString(),
    data: explorationData,
  };
  explorations.push(exploration);
  saveExplorations(explorations);
  return exploration;
}

/**
 * Update exploration name
 */
function updateExplorationName(id, newName) {
  const explorations = getSavedExplorations();
  const exploration = explorations.find((e) => e.id === id);
  if (exploration) {
    exploration.name = newName;
    saveExplorations(explorations);
  }
}

/**
 * Delete exploration
 */
function deleteExplorationById(id) {
  const explorations = getSavedExplorations();
  const filtered = explorations.filter((e) => e.id !== id);
  saveExplorations(filtered);
  return filtered;
}

/**
 * Get exploration by ID
 */
function getExplorationById(id) {
  const explorations = getSavedExplorations();
  return explorations.find((e) => e.id === id);
}

/**
 * Add a new test suite
 */
function addTestSuite(testData, explorationId, url, explorationElements) {
  const testSuites = getSavedTestSuites();
  const testSuite = {
    id: Date.now(),
    name: `Test Suite ${testSuites.length + 1}`,
    explorationId: explorationId,
    url: url,
    timestamp: new Date().toISOString(),
    data: testData,
    exploration: {
      elements: explorationElements || [],
      structure: window.appState.explorationData?.structure || "",
    },
  };
  testSuites.push(testSuite);
  saveTestSuites(testSuites);
  return testSuite;
}

/**
 * Update test suite name
 */
function updateTestSuiteName(id, newName) {
  const testSuites = getSavedTestSuites();
  const suite = testSuites.find((s) => s.id === id);
  if (suite) {
    suite.name = newName;
    saveTestSuites(testSuites);
  }
}

/**
 * Update test suite data
 */
function updateTestSuiteData(id, newTestCases) {
  const testSuites = getSavedTestSuites();
  const suite = testSuites.find((s) => s.id === id);
  if (suite) {
    // Renumber IDs sequentially
    newTestCases.forEach((test, index) => {
      test.id = index + 1;
    });
    suite.data.test_cases = newTestCases;
    saveTestSuites(testSuites);
    return suite;
  }
  return null;
}

/**
 * Delete test suite
 */
function deleteTestSuiteById(id) {
  const testSuites = getSavedTestSuites();
  const filtered = testSuites.filter((s) => s.id !== id);
  saveTestSuites(filtered);
  return filtered;
}

/**
 * Get test suite by ID
 */
function getTestSuiteById(id) {
  const testSuites = getSavedTestSuites();
  return testSuites.find((s) => s.id === id);
}
