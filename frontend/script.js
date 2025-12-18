// Global state
let explorationData = null;
let savedExplorations = JSON.parse(localStorage.getItem('explorations') || '[]');
let savedTestSuites = JSON.parse(localStorage.getItem('testSuites') || '[]');
let selectedExplorationId = null;
let currentTab = 'explorations';

// API base URL
const API_BASE = window.location.origin;

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(`tab-${tabName}`).style.display = 'block';
    
    // Render content
    if (tabName === 'testsuites') {
        renderTestSuitesList();
    }
}

/**
 * Phase 1: Explore a web page
 */
async function exploreUrl() {
    const url = document.getElementById('urlInput').value;
    const exploreBtn = document.getElementById('exploreBtn');
    const designBtn = document.getElementById('designBtn');
    
    if (!url) {
        alert('Please enter a URL');
        return;
    }
    
    exploreBtn.disabled = true;
    designBtn.disabled = true;
    
    showLoadingExploration('🔍 Exploring page... (This may take 30-60 seconds)');
    
    try {
        const response = await fetch(`${API_BASE}/api/explore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
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
                data: result.data
            };
            savedExplorations.push(exploration);
            localStorage.setItem('explorations', JSON.stringify(savedExplorations));
            selectedExplorationId = exploration.id;
            
            displayExplorationResult(result.data);
            updateMetrics();
            renderExplorationsList();
            designBtn.disabled = false;
        } else {
            throw new Error(result.message || 'Exploration failed');
        }
    } catch (error) {
        showError('Exploration Error', error.message);
    } finally {
        exploreBtn.disabled = false;
    }
}

/**
 * Phase 2: Design test cases
 */
async function designTests() {
    if (!explorationData) {
        alert('Please explore a page first');
        return;
    }
    
    const designBtn = document.getElementById('designBtn');
    
    designBtn.disabled = true;
    
    // Switch to test suites tab and show loading
    switchTab('testsuites');
    document.querySelectorAll('.tab-btn')[1].click();
    showLoadingTestSuite('📋 Designing test cases... (This may take 30-60 seconds)');
    
    try {
        const response = await fetch(`${API_BASE}/api/design-tests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(explorationData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Test design result:', result.data);
            
            // Save test suite
            const testSuite = {
                id: Date.now(),
                name: `Test Suite ${savedTestSuites.length + 1}`,
                explorationId: selectedExplorationId,
                url: explorationData.url,
                timestamp: new Date().toISOString(),
                data: result.data
            };
            savedTestSuites.push(testSuite);
            localStorage.setItem('testSuites', JSON.stringify(savedTestSuites));
            
            displayTestDesign(result.data);
            updateMetrics();
            renderTestSuitesList();  // Update sidebar immediately
            
            // Show notification badge on Test Suites tab
            document.getElementById('testSuitesTab').innerHTML = '📋 Test Suites <span style="background:#dc3545;color:white;border-radius:10px;padding:2px 6px;font-size:10px;margin-left:5px;">' + savedTestSuites.length + '</span>';
        } else {
            throw new Error(result.message || 'Test design failed');
        }
    } catch (error) {
        showError('Test Design Error', error.message);
        console.error('Test design error:', error);
    } finally {
        designBtn.disabled = false;
    }
}

/**
 * Reset agent state
 */
async function resetAgent() {
    if (confirm('Reset agent state? This will clear backend state but keep local storage.')) {
        try {
            await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
            updateMetrics();
            alert('Agent reset complete');
        } catch (error) {
            alert('Reset failed: ' + error.message);
        }
    }
}

/**
 * Render saved explorations list
 */
function renderExplorationsList() {
    const list = document.getElementById('explorationsList');
    
    if (savedExplorations.length === 0) {
        list.innerHTML = `
            <div style="color: #999; font-size: 11px; text-align: center; padding: 20px 10px;">
                No explorations yet
            </div>
        `;
        return;
    }
    
    list.innerHTML = savedExplorations.map(exp => `
        <div class="exploration-item ${exp.id === selectedExplorationId ? 'selected' : ''}" onclick="selectExploration(${exp.id})">
            <div style="flex: 1;">
                <input 
                    type="text" 
                    value="${escapeHtml(exp.name)}" 
                    class="exploration-name-input"
                    onchange="renameExploration(${exp.id}, this.value)"
                    onclick="event.stopPropagation()"
                >
                <div style="font-size: 10px; color: #6c757d; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(exp.url)}</div>
            </div>
            <button onclick="event.stopPropagation(); deleteExploration(${exp.id})" class="delete-btn" title="Delete">🗑️</button>
        </div>
    `).join('');
}

/**
 * Select exploration for test design
 */
function selectExploration(id) {
    selectedExplorationId = id;
    const exploration = savedExplorations.find(e => e.id === id);
    if (exploration) {
        explorationData = exploration.data;
        displayExplorationResult(exploration.data);
        document.getElementById('designBtn').disabled = false;
        renderExplorationsList();
        
        // Ensure we're on explorations tab
        if (currentTab !== 'explorations') {
            switchTab('explorations');
            document.querySelectorAll('.tab-btn')[0].click();
        }
    }
}

/**
 * Rename exploration
 */
function renameExploration(id, newName) {
    const exploration = savedExplorations.find(e => e.id === id);
    if (exploration) {
        exploration.name = newName;
        localStorage.setItem('explorations', JSON.stringify(savedExplorations));
    }
}

/**
 * Delete exploration
 */
function deleteExploration(id) {
    if (confirm('Delete this exploration?')) {
        savedExplorations = savedExplorations.filter(e => e.id !== id);
        localStorage.setItem('explorations', JSON.stringify(savedExplorations));
        if (selectedExplorationId === id) {
            selectedExplorationId = null;
            explorationData = null;
            document.getElementById('designBtn').disabled = true;
            document.getElementById('explorationDisplay').innerHTML = `
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
    const list = document.getElementById('testSuitesList');
    
    if (savedTestSuites.length === 0) {
        list.innerHTML = `
            <div style="color: #999; font-size: 11px; text-align: center; padding: 20px 10px;">
                No test suites yet
            </div>
        `;
        return;
    }
    
    list.innerHTML = savedTestSuites.map(suite => {
        const testCases = suite.data.test_cases || [];
        return `
            <div class="exploration-item ${suite.id === currentTestSuiteId ? 'selected' : ''}" onclick="viewTestSuite(${suite.id})" style="cursor: pointer; flex-direction: column; align-items: stretch;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <input 
                        type="text" 
                        value="${escapeHtml(suite.name)}" 
                        class="exploration-name-input"
                        onchange="renameTestSuite(${suite.id}, this.value)"
                        onclick="event.stopPropagation()"
                        style="font-size: 12px; flex: 1;"
                    >
                    <button onclick="event.stopPropagation(); deleteTestSuite(${suite.id})" class="delete-btn" style="margin-left: 8px;">🗑️</button>
                </div>
                <div style="font-size: 10px; color: #6c757d; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(suite.url)}</div>
                <div style="font-size: 9px; color: #999;">${testCases.length} tests | ${(suite.data.coverage_score || 0).toFixed(1)}%</div>
            </div>
        `;
    }).join('');
}

let currentTestSuiteId = null;

/**
 * View test suite details
 */
function viewTestSuite(id) {
    currentTestSuiteId = id;
    const suite = savedTestSuites.find(s => s.id === id);
    if (suite) {
        // Ensure we're on test suites tab
        if (currentTab !== 'testsuites') {
            switchTab('testsuites');
            document.querySelectorAll('.tab-btn')[1].click();
        }
        
        displayTestDesignInSuite(suite.data, suite.name, suite.url);
        renderTestSuitesList();
    }
}

/**
 * Rename test suite
 */
function renameTestSuite(id, newName) {
    const suite = savedTestSuites.find(s => s.id === id);
    if (suite) {
        suite.name = newName;
        localStorage.setItem('testSuites', JSON.stringify(savedTestSuites));
    }
}

/**
 * Delete test suite
 */
function deleteTestSuite(id) {
    if (confirm('Delete this test suite?')) {
        savedTestSuites = savedTestSuites.filter(s => s.id !== id);
        localStorage.setItem('testSuites', JSON.stringify(savedTestSuites));
        renderTestSuitesList();
        document.getElementById('testSuitesTab').innerHTML = '📋 Test Suites' + (savedTestSuites.length > 0 ? ` <span style="background:#dc3545;color:white;border-radius:10px;padding:2px 6px;font-size:10px;margin-left:5px;">${savedTestSuites.length}</span>` : '');
    }
}

/**
 * Display exploration results
 */
function displayExplorationResult(data) {
    const display = document.getElementById('explorationDisplay');
    const elementsCount = data.elements?.length || 0;
    
    display.innerHTML = `
        <span class="phase-badge">Phase 1: Exploration Complete</span>
        <h3 style="margin-bottom: 15px;">${escapeHtml(data.title || 'Page Explored')}</h3>
        <p style="margin-bottom: 10px; font-size: 13px;"><strong>URL:</strong> ${escapeHtml(data.url)}</p>
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
    const content = document.getElementById('json-content');
    const toggle = document.getElementById('json-toggle');
    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▲';
    } else {
        content.style.display = 'none';
        toggle.textContent = '▼';
    }
}

/**
 * Display test design results in suite tab
 */
function displayTestDesignInSuite(data, suiteName, url) {
    const display = document.getElementById('testSuiteDisplay');
    const testCases = data.test_cases || [];
    
    console.log('Displaying test suite:', testCases.length, testCases);
    
    let testCasesHtml = testCases.map((tc, index) => `
        <div class="test-case">
            <div class="test-case-header" onclick="toggleTestCase(${index})">
                <div style="flex: 1;">
                    <div class="test-case-name">Test #${tc.id || index + 1}: ${escapeHtml(tc.name || 'Unnamed Test')}</div>
                    <div style="font-size: 11px; color: #6c757d; margin-top: 3px;">${escapeHtml(tc.description || 'No description')}</div>
                </div>
                <div class="toggle-icon" id="toggle-${index}">▼</div>
            </div>
            <div class="test-case-details" id="details-${index}" style="display: none;">
                ${tc.steps ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #667eea; font-size: 12px;">Steps:</strong>
                        <ol style="margin: 8px 0; padding-left: 20px; font-size: 12px;">
                            ${(Array.isArray(tc.steps) ? tc.steps : [tc.steps]).map(step => `
                                <li style="margin-bottom: 4px;">${escapeHtml(String(step))}</li>
                            `).join('')}
                        </ol>
                    </div>
                ` : ''}
                ${tc.expected_outcome || tc.expected ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #667eea; font-size: 12px;">Expected Outcome:</strong>
                        <div style="font-size: 12px; margin-top: 4px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                            ${escapeHtml(tc.expected_outcome || tc.expected)}
                        </div>
                    </div>
                ` : ''}
                ${tc.priority ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #667eea; font-size: 12px;">Priority:</strong>
                        <span style="margin-left: 8px; padding: 2px 8px; background: #667eea; color: white; border-radius: 12px; font-size: 11px;">
                            ${escapeHtml(tc.priority)}
                        </span>
                    </div>
                ` : ''}
                ${tc.locators ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #667eea; font-size: 12px;">Locators:</strong>
                        <pre style="font-size: 11px; margin-top: 4px; padding: 8px; background: #f8f9fa; border-radius: 4px; overflow-x: auto;">${escapeHtml(JSON.stringify(tc.locators, null, 2))}</pre>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    display.innerHTML = `
        <div style="margin-bottom: 15px;">
            <h3 style="margin-bottom: 8px; color: #333;">${escapeHtml(suiteName)}</h3>
            <p style="font-size: 12px; color: #6c757d; margin-bottom: 5px;"><strong>URL:</strong> ${escapeHtml(url)}</p>
            <p style="font-size: 12px; color: #6c757d;"><strong>Coverage:</strong> ${(data.coverage_score || 0).toFixed(1)}% | <strong>Test Cases:</strong> ${testCases.length}</p>
        </div>
        <div>
            ${testCasesHtml || '<p style="color: #6c757d;">No test cases generated</p>'}
        </div>
    `;
}

/**
 * Display test design results (legacy - after generation)
 */
function displayTestDesign(data) {
    const display = document.getElementById('testSuiteDisplay');
    const testCases = data.test_cases || [];
    
    console.log('Displaying test cases:', testCases.length, testCases);
    
    let testCasesHtml = testCases.map((tc, index) => `
        <div class="test-case">
            <div class="test-case-header" onclick="toggleTestCase(${index})">
                <div style="flex: 1;">
                    <div class="test-case-name">Test #${tc.id || index + 1}: ${escapeHtml(tc.name || 'Unnamed Test')}</div>
                    <div style="font-size: 11px; color: #6c757d; margin-top: 3px;">${escapeHtml(tc.description || 'No description')}</div>
                </div>
                <div class="toggle-icon" id="toggle-${index}">▼</div>
            </div>
            <div class="test-case-details" id="details-${index}" style="display: none;">
                ${tc.steps ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #667eea; font-size: 12px;">Steps:</strong>
                        <ol style="margin: 8px 0; padding-left: 20px; font-size: 12px;">
                            ${(Array.isArray(tc.steps) ? tc.steps : [tc.steps]).map(step => `
                                <li style="margin-bottom: 4px;">${escapeHtml(String(step))}</li>
                            `).join('')}
                        </ol>
                    </div>
                ` : ''}
                ${tc.expected_outcome || tc.expected ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #667eea; font-size: 12px;">Expected Outcome:</strong>
                        <div style="font-size: 12px; margin-top: 4px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                            ${escapeHtml(tc.expected_outcome || tc.expected)}
                        </div>
                    </div>
                ` : ''}
                ${tc.priority ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #667eea; font-size: 12px;">Priority:</strong>
                        <span style="margin-left: 8px; padding: 2px 8px; background: #667eea; color: white; border-radius: 12px; font-size: 11px;">
                            ${escapeHtml(tc.priority)}
                        </span>
                    </div>
                ` : ''}
                ${tc.locators ? `
                    <div style="margin-top: 12px;">
                        <strong style="color: #667eea; font-size: 12px;">Locators:</strong>
                        <pre style="font-size: 11px; margin-top: 4px; padding: 8px; background: #f8f9fa; border-radius: 4px; overflow-x: auto;">${escapeHtml(JSON.stringify(tc.locators, null, 2))}</pre>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    display.innerHTML = `
        <span class="phase-badge">Phase 2: Test Design Complete</span>
        <h3 style="margin-bottom: 15px;">Generated Test Cases (${testCases.length})</h3>
        <p style="margin-bottom: 15px; color: #6c757d; font-size: 13px;">Coverage Score: ${(data.coverage_score || 0).toFixed(1)}%</p>
        <div>
            ${testCasesHtml || '<p style="color: #6c757d;">No test cases generated</p>'}
        </div>
    `;
}

/**
 * Toggle test case details
 */
function toggleTestCase(index) {
    const details = document.getElementById(`details-${index}`);
    const toggle = document.getElementById(`toggle-${index}`);
    if (details.style.display === 'none') {
        details.style.display = 'block';
        toggle.textContent = '▲';
    } else {
        details.style.display = 'none';
        toggle.textContent = '▼';
    }
}

/**
 * Show loading state in exploration tab
 */
function showLoadingExploration(message) {
    const display = document.getElementById('explorationDisplay');
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
    const display = document.getElementById('testSuiteDisplay');
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
    const displayId = currentTab === 'testsuites' ? 'testSuiteDisplay' : 'explorationDisplay';
    const display = document.getElementById(displayId);
    display.innerHTML = `
        <div style="color: #dc3545; padding: 20px;">
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">❌ ${escapeHtml(title)}</div>
            <div>${escapeHtml(message)}</div>
        </div>
    `;
}

/**
 * Update metrics display
 */
function updateMetrics() {
    fetch(`${API_BASE}/api/metrics`)
        .then(r => {
            if (!r.ok) {
                console.warn('Metrics endpoint returned:', r.status);
                return null;
            }
            return r.json();
        })
        .then(data => {
            if (!data || !data.success || !data.data) {
                console.warn('Invalid metrics response:', data);
                return;
            }
            
            console.log('Metrics received:', data);
            
            const totals = data.data.totals;
            const perPhase = data.data.per_phase;
            
            // Update total metrics
            document.getElementById('totalTime').innerHTML = 
                (totals.total_response_time || 0).toFixed(2) + '<span class="metric-unit">s</span>';
            document.getElementById('totalTokens').innerHTML = 
                (totals.total_tokens || 0) + '<span class="metric-unit">tokens</span>';
            document.getElementById('avgTime').innerHTML = 
                (totals.avg_response_time || 0).toFixed(2) + '<span class="metric-unit">s</span>';
            
            // Update per-phase breakdown
            if (perPhase && perPhase.length > 0) {
                displayPhaseMetrics(perPhase);
            }
        })
        .catch(error => {
            console.error('Failed to fetch metrics:', error);
        });
}

/**
 * Display per-phase metrics
 */
function displayPhaseMetrics(phases) {
    const phaseMetrics = document.getElementById('phaseMetrics');
    phaseMetrics.innerHTML = '<h4 style="margin: 20px 0 15px; color: #333; font-size: 14px;">Per-Phase</h4>';
    
    phases.forEach(pm => {
        const phaseLabel = pm.phase.charAt(0).toUpperCase() + pm.phase.slice(1);
        phaseMetrics.innerHTML += `
            <div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 8px; font-size: 11px;">
                <div style="font-weight: 600; color: #667eea; margin-bottom: 3px;">${escapeHtml(phaseLabel)}</div>
                <div style="color: #6c757d;">${pm.response_time.toFixed(2)}s | ${pm.tokens_used} tokens</div>
            </div>
        `;
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🤖 Web Testing Agent initialized');
    renderExplorationsList();
    updateMetrics();
    
    // Update test suites badge
    if (savedTestSuites.length > 0) {
        document.getElementById('testSuitesTab').innerHTML = '📋 Test Suites <span style="background:#dc3545;color:white;border-radius:10px;padding:2px 6px;font-size:10px;margin-left:5px;">' + savedTestSuites.length + '</span>';
    }
});
