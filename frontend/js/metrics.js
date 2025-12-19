/**
 * Metrics Module
 * Handles performance metrics display and updates
 */

/**
 * Update metrics display
 */
async function updateMetrics() {
  try {
    const data = await apiGetMetrics();

    if (data && data.success && data.data) {
      console.log("Metrics received from backend:", data);

      // Merge with existing metrics from localStorage
      const backendMetrics = data.data.per_phase || [];
      const savedMetrics = getSavedMetrics();
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
      const totalTime = allMetrics.reduce((sum, m) => sum + (m.response_time || 0), 0);
      const totalTokens = allMetrics.reduce((sum, m) => sum + (m.tokens_used || 0), 0);

      savedMetrics.totals = {
        total_response_time: totalTime,
        total_tokens: totalTokens,
        avg_response_time: allMetrics.length > 0 ? totalTime / allMetrics.length : 0,
      };

      // Save to localStorage
      saveMetrics(savedMetrics);

      // Display metrics
      displayMetrics(savedMetrics);
    } else {
      console.warn("Using cached metrics from localStorage");
      displayMetrics(getSavedMetrics());
    }
  } catch (error) {
    console.error("Failed to fetch metrics:", error);
    // Display cached metrics on error
    displayMetrics(getSavedMetrics());
  }
}

/**
 * Display metrics in UI
 */
function displayMetrics(metrics) {
  const totals = metrics.totals;
  const perPhase = metrics.per_phase;

  // Update total metrics
  document.getElementById("totalTime").innerHTML =
    (totals.total_response_time || 0).toFixed(2) + '<span class="metric-unit">s</span>';
  document.getElementById("totalTokens").innerHTML =
    (totals.total_tokens || 0) + '<span class="metric-unit">tokens</span>';
  document.getElementById("avgTime").innerHTML =
    (totals.avg_response_time || 0).toFixed(2) + '<span class="metric-unit">s</span>';

  // Update per-phase breakdown
  if (perPhase && perPhase.length > 0) {
    displayPhaseMetrics(perPhase);
  }
}

/**
 * Display per-phase metrics
 */
function displayPhaseMetrics(phases) {
  const phaseMetrics = document.getElementById("phaseMetrics");
  phaseMetrics.innerHTML = '<h4 style="margin: 20px 0 15px; color: #333; font-size: 14px;">Per-Phase</h4>';

  phases.forEach((pm) => {
    const phaseLabel = pm.phase.charAt(0).toUpperCase() + pm.phase.slice(1);
    phaseMetrics.innerHTML += `
      <div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 8px; font-size: 11px;">
        <div style="font-weight: 600; color: #667eea; margin-bottom: 3px;">${escapeHtml(phaseLabel)}</div>
        <div style="color: #6c757d;">${pm.response_time.toFixed(2)}s | ${pm.tokens_used} tokens</div>
      </div>
    `;
  });
}
