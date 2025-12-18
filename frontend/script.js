// Global state
let explorationData = null;

// API base URL - adjust if backend runs on different port
const API_BASE = window.location.origin;

/**
 * Phase 1: Explore a web page
 */
async function exploreUrl() {
    const url = document.getElementById('urlInput').value;
    const output = document.getElementById('output');
    const exploreBtn = document.getElementById('exploreBtn');
    const designBtn = document.getElementById('designBtn');
    
    if (!url) {
        alert('Please enter a URL');
        return;
    }
    
    exploreBtn.disabled = true;
    designBtn.disabled = true;
    
    showLoading('🔍 Exploring page... (This may take 30-60 seconds)');
    
    try {
        const response = await fetch(`${API_BASE}/api/explore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        const result = await response.json();
        
        if (result.success) {
            explorationData = result.data;
            displayExplorationResult(result.data);
            updateMetrics(result.metrics);
            designBtn.disabled = false;
        } else {
            throw new Error('Exploration failed');
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
    
    const output = document.getElementById('output');
    const designBtn = document.getElementById('designBtn');
    
    designBtn.disabled = true;
    showLoading('📋 Designing test cases... (This may take 30-60 seconds)');
    
    try {
        const response = await fetch(`${API_BASE}/api/design-tests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(explorationData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayTestDesign(result.data);
            updateMetrics(result.metrics);
        } else {
            throw new Error('Test design failed');
        }
    } catch (error) {
        showError('Test Design Error', error.message);
    } finally {
        designBtn.disabled = false;
    }
}

/**
 * Reset agent state
 */
async function resetAgent() {
    if (confirm('Reset agent state? This will clear all exploration and test data.')) {
        try {
            await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
            location.reload();
        } catch (error) {
            alert('Reset failed: ' + error.message);
        }
    }
}

/**
 * Display exploration results
 */
function displayExplorationResult(data) {
    const output = document.getElementById('output');
    
    output.innerHTML = `
        <span class="phase-badge">Phase 1: Exploration Complete</span>
        <h3 style="margin-bottom: 15px;">${escapeHtml(data.title || 'Page Explored')}</h3>
        <p style="margin-bottom: 15px;"><strong>URL:</strong> ${escapeHtml(data.url)}</p>
        <p style="margin-bottom: 15px;"><strong>Elements Found:</strong> ${data.elements?.length || 0}</p>
        <div style="background: #fff; padding: 15px; border-radius: 8px; white-space: pre-wrap; font-family: monospace; font-size: 12px; max-height: 400px; overflow-y: auto;">
${escapeHtml(JSON.stringify(data, null, 2))}
        </div>
    `;
}

/**
 * Display test design results
 */
function displayTestDesign(data) {
    const output = document.getElementById('output');
    const testCases = data.test_cases || [];
    
    let testCasesHtml = testCases.map(tc => `
        <div class="test-case">
            <div class="test-case-name">Test #${tc.id}: ${escapeHtml(tc.name)}</div>
            <div class="test-case-desc">${escapeHtml(tc.description)}</div>
            ${tc.priority ? `<div style="font-size: 11px; color: #667eea; margin-top: 5px;">Priority: ${escapeHtml(tc.priority)}</div>` : ''}
        </div>
    `).join('');
    
    output.innerHTML = `
        <span class="phase-badge">Phase 2: Test Design Complete</span>
        <h3 style="margin-bottom: 15px;">Generated Test Cases (${testCases.length})</h3>
        <p style="margin-bottom: 15px; color: #6c757d;">Coverage Score: ${(data.coverage_score * 100).toFixed(1)}%</p>
        ${testCasesHtml || '<p style="color: #6c757d;">No test cases generated</p>'}
    `;
}

/**
 * Show loading state
 */
function showLoading(message) {
    const output = document.getElementById('output');
    output.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <div>${escapeHtml(message)}</div>
        </div>
    `;
}

/**
 * Show error message
 */
function showError(title, message) {
    const output = document.getElementById('output');
    output.innerHTML = `
        <div style="color: #dc3545; padding: 20px;">
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">❌ ${escapeHtml(title)}</div>
            <div>${escapeHtml(message)}</div>
        </div>
    `;
}

/**
 * Update metrics display
 */
function updateMetrics(currentMetrics) {
    // Fetch complete metrics from API
    fetch(`${API_BASE}/api/metrics`)
        .then(r => r.json())
        .then(data => {
            const totals = data.data.totals;
            const perPhase = data.data.per_phase;
            
            // Update total metrics
            document.getElementById('totalTime').innerHTML = 
                totals.total_response_time.toFixed(2) + '<span class="metric-unit">s</span>';
            document.getElementById('totalTokens').innerHTML = 
                totals.total_tokens + '<span class="metric-unit">tokens</span>';
            document.getElementById('avgTime').innerHTML = 
                totals.avg_response_time.toFixed(2) + '<span class="metric-unit">s</span>';
            
            // Update per-phase breakdown
            displayPhaseMetrics(perPhase);
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
    phaseMetrics.innerHTML = '<h4 style="margin: 20px 0 15px; color: #333;">Per-Phase</h4>';
    
    phases.forEach(pm => {
        const phaseLabel = pm.phase.charAt(0).toUpperCase() + pm.phase.slice(1);
        phaseMetrics.innerHTML += `
            <div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 8px; font-size: 12px;">
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
});
