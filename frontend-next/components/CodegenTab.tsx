"use client";

import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { apiGenerateCode, apiReviewTests } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CodegenTab() {
  const { testSuites, setLoading: setGlobalLoading } = useApp();
  const [selectedSuiteId, setSelectedSuiteId] = useState<number | null>(null);
  const [customInstructions, setCustomInstructions] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [runTests, setRunTests] = useState(false);
  const [executionLog, setExecutionLog] = useState<any>(null);
  // Review state
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [reviewCritique, setReviewCritique] = useState("");
  const [reviewResponse, setReviewResponse] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  // Evidence viewer state
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(
    null
  );
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const selectedSuite = testSuites.find((s) => s.id === selectedSuiteId);

  const handleGenerateCode = async () => {
    if (!selectedSuite) return;

    setLocalLoading(true);
    setGlobalLoading(true, "⚡ Generating Playwright Python code...");
    setExecutionLog(null);
    setShowReviewPanel(false);
    setReviewResponse("");
    try {
      const result = await apiGenerateCode(
        selectedSuite.testCases,
        selectedSuite.url,
        selectedSuite.name,
        selectedSuite.explorationData?.elements || [],
        customInstructions,
        runTests
      );
      if (result.success && result.data) {
        // Clean escaped newlines
        const cleanCode = result.data.code.replace(/\\n/g, "\n");
        setGeneratedCode(cleanCode);
        if (result.data.execution_log) {
          setExecutionLog(result.data.execution_log);
        }
      } else {
        throw new Error(result.message || "Code generation failed");
      }
    } catch (error) {
      alert("Code Generation Error: " + (error as Error).message);
    } finally {
      setLocalLoading(false);
      setGlobalLoading(false, "");
    }
  };

  const handleReview = async (action: "analyze" | "refactor" | "explain") => {
    if (!generatedCode) return;

    setReviewLoading(true);
    setShowReviewPanel(true);
    try {
      const result = await apiReviewTests(
        generatedCode,
        executionLog,
        reviewCritique,
        action
      );
      if (result.success && result.data) {
        setReviewResponse(result.data.response);
        if (action === "refactor" && result.data.refactored_code) {
          // Update the displayed code - file is already saved on backend
          setGeneratedCode(result.data.refactored_code);
          alert(
            "✅ Refactored code saved to tests/test_generated.py\n\nOnly failing tests were modified. You can now re-run tests to verify the fixes."
          );
        }
      }
    } catch (error) {
      setReviewResponse("Error: " + (error as Error).message);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${
      selectedSuite?.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "test"
    }.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    alert("✅ Code copied to clipboard");
  };

  return (
    <div className="flex flex-col h-auto overflow-scroll">
      {/* Controls */}
      <div
        style={{
          background: "#f8f9fa",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "15px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <label
            style={{ fontSize: "13px", color: "#667eea", fontWeight: "600" }}
          >
            Select Suite:
          </label>
          <select
            value={selectedSuiteId || ""}
            onChange={(e) => {
              setSelectedSuiteId(Number(e.target.value) || null);
              setGeneratedCode("");
              setExecutionLog(null);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #e0e0e0",
              fontSize: "13px",
              minWidth: "200px",
            }}
          >
            <option value="">-- Select a test suite --</option>
            {testSuites.map((suite) => (
              <option key={suite.id} value={suite.id}>
                {suite.name} ({suite.testCases.length} tests)
              </option>
            ))}
          </select>
          <button
            onClick={handleGenerateCode}
            disabled={!selectedSuiteId || localLoading}
            style={{
              padding: "10px 20px",
              background: !selectedSuiteId || localLoading ? "#ccc" : "#667eea",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              cursor:
                !selectedSuiteId || localLoading ? "not-allowed" : "pointer",
              fontWeight: "600",
            }}
          >
            {localLoading ? "Generating..." : "⚡ Generate Playwright Code"}
          </button>
          <button
            onClick={handleCopy}
            disabled={!generatedCode}
            style={{
              padding: "10px 20px",
              background: !generatedCode ? "#ccc" : "#17a2b8",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              cursor: !generatedCode ? "not-allowed" : "pointer",
              fontWeight: "600",
            }}
          >
            📋 Copy
          </button>
          <button
            onClick={handleDownload}
            disabled={!generatedCode}
            style={{
              padding: "10px 20px",
              background: !generatedCode ? "#ccc" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              cursor: !generatedCode ? "not-allowed" : "pointer",
              fontWeight: "600",
            }}
          >
            ⬇️ Download
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <input
            type="checkbox"
            id="runTestsCheckbox"
            checked={runTests}
            onChange={(e) => setRunTests(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <label
            htmlFor="runTestsCheckbox"
            style={{
              fontSize: "13px",
              color: "#667eea",
              fontWeight: "600",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            🧪 Run Tests After Generation
          </label>
          <span
            style={{
              fontSize: "12px",
              color: runTests ? "#28a745" : "#dc3545",
              fontWeight: "500",
            }}
          >
            ({runTests ? "Enabled" : "Disabled"})
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "start", gap: "10px" }}>
          <label
            style={{
              fontSize: "13px",
              color: "#667eea",
              fontWeight: "600",
              paddingTop: "8px",
            }}
          >
            Custom Instructions:
          </label>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Add custom instructions for code generation (e.g., 'Use data-testid attributes for locators', 'Add extra assertions for accessibility', 'Include retry logic for flaky elements')"
            style={{
              flex: 1,
              padding: "10px",
              border: "1px solid #e0e0e0",
              borderRadius: "6px",
              fontSize: "13px",
              minHeight: "60px",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {/* Test Execution Results */}
      {executionLog && (
        <div
          style={{
            background: executionLog.all_passed ? "#d4edda" : "#f8d7da",
            border: `1px solid ${
              executionLog.all_passed ? "#c3e6cb" : "#f5c6cb"
            }`,
            borderRadius: "8px",
            padding: "15px",
            marginBottom: "15px",
            flexShrink: 0,
            maxHeight: "400px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: "600",
                color: "#333",
              }}
            >
              {executionLog.all_passed ? "✅" : "⚠️"} Test Execution Results
            </h3>
            <div style={{ fontSize: "13px", fontWeight: "600" }}>
              <span style={{ color: "#28a745" }}>{executionLog.passed}</span>
              {" / "}
              <span style={{ color: "#666" }}>{executionLog.total_tests}</span>
              {" passed "}
              <span
                style={{
                  color: executionLog.all_passed ? "#28a745" : "#dc3545",
                }}
              >
                ({executionLog.success_rate?.toFixed(1) || 0}%)
              </span>
              <span style={{ marginLeft: "10px", color: "#666" }}>
                ⏱️ {executionLog.duration?.toFixed(2) || 0}s
              </span>
            </div>
          </div>

          {executionLog.test_results &&
            executionLog.test_results.length > 0 && (
              <div
                style={{
                  marginTop: "10px",
                  overflowY: "auto",
                  flex: 1,
                  minHeight: 0,
                }}
              >
                {executionLog.test_results.map((test: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: "8px 10px",
                      marginBottom: "6px",
                      background: "white",
                      borderRadius: "4px",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "start",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>
                      {test.passed ? "✅" : "❌"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: "600",
                          color: "#333",
                          marginBottom: "4px",
                        }}
                      >
                        {test.test_name}
                      </div>
                      <div style={{ color: "#666", fontSize: "11px" }}>
                        Duration: {test.duration?.toFixed(2) || 0}s
                      </div>
                      {/* Evidence buttons */}
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginTop: "6px",
                        }}
                      >
                        {test.screenshot_url && (
                          <button
                            onClick={() =>
                              setSelectedScreenshot(
                                `${API_BASE_URL}${test.screenshot_url}`
                              )
                            }
                            style={{
                              padding: "4px 8px",
                              fontSize: "10px",
                              background: "#17a2b8",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            📸 Screenshot
                          </button>
                        )}
                        {test.video_url && (
                          <button
                            onClick={() =>
                              setSelectedVideo(
                                `${API_BASE_URL}${test.video_url}`
                              )
                            }
                            style={{
                              padding: "4px 8px",
                              fontSize: "10px",
                              background: "#6f42c1",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            🎬 Video
                          </button>
                        )}
                      </div>
                      {!test.passed && test.error_message && (
                        <div
                          style={{
                            marginTop: "6px",
                            padding: "8px",
                            background: "#fff3cd",
                            border: "1px solid #ffc107",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontFamily: "monospace",
                            color: "#856404",
                          }}
                        >
                          <div
                            style={{ fontWeight: "600", marginBottom: "4px" }}
                          >
                            {test.error_type}
                            {test.line_number && ` (line ${test.line_number})`}
                          </div>
                          <div style={{ whiteSpace: "pre-wrap" }}>
                            {test.error_message}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

          {/* Review Actions */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "10px",
              paddingTop: "10px",
              borderTop: "1px solid rgba(0,0,0,0.1)",
            }}
          >
            <input
              type="text"
              placeholder="Ask about the results or request changes..."
              value={reviewCritique}
              onChange={(e) => setReviewCritique(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            />
            <button
              onClick={() => handleReview("analyze")}
              disabled={reviewLoading}
              style={{
                padding: "8px 12px",
                background: "#17a2b8",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "11px",
                cursor: reviewLoading ? "not-allowed" : "pointer",
              }}
            >
              🔍 Analyze
            </button>
            <button
              onClick={() => handleReview("refactor")}
              disabled={reviewLoading}
              style={{
                padding: "8px 12px",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "11px",
                cursor: reviewLoading ? "not-allowed" : "pointer",
              }}
            >
              ✏️ Refactor
            </button>
            <button
              onClick={() => handleReview("explain")}
              disabled={reviewLoading}
              style={{
                padding: "8px 12px",
                background: "#6f42c1",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "11px",
                cursor: reviewLoading ? "not-allowed" : "pointer",
              }}
            >
              💡 Explain
            </button>
          </div>
        </div>
      )}

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setSelectedScreenshot(null)}
        >
          <div style={{ maxWidth: "90%", maxHeight: "90%" }}>
            <img
              src={selectedScreenshot}
              alt="Test Screenshot"
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                borderRadius: "8px",
              }}
            />
            <p
              style={{ color: "white", textAlign: "center", marginTop: "10px" }}
            >
              Click anywhere to close
            </p>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {selectedVideo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setSelectedVideo(null)}
        >
          <div
            style={{ maxWidth: "90%", maxHeight: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={selectedVideo}
              controls
              autoPlay
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: "8px",
              }}
            />
            <p
              style={{ color: "white", textAlign: "center", marginTop: "10px" }}
            >
              <button
                onClick={() => setSelectedVideo(null)}
                style={{
                  padding: "8px 16px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Close Video
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Review Response Panel */}
      {showReviewPanel && (
        <div
          style={{
            background: "#f0f4f8",
            border: "1px solid #d1d9e6",
            borderRadius: "8px",
            padding: "15px",
            marginBottom: "15px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: "600",
                color: "#333",
              }}
            >
              🤖 AI Review Response
            </h3>
            <button
              onClick={() => setShowReviewPanel(false)}
              style={{
                background: "none",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                color: "#666",
              }}
            >
              ×
            </button>
          </div>
          {reviewLoading ? (
            <div
              style={{ textAlign: "center", padding: "20px", color: "#666" }}
            >
              ⏳ Analyzing...
            </div>
          ) : (
            <div
              style={{
                background: "white",
                padding: "12px",
                borderRadius: "4px",
                fontSize: "13px",
                whiteSpace: "pre-wrap",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {reviewResponse}
            </div>
          )}
        </div>
      )}

      {/* Code Display */}
      <div
        style={{
          flex: 1,
          //overflow: "auto",
          background: "#2d2d2d",
          borderRadius: "8px",
          padding: "20px",
          maxHeight: "400px",
        }}
      >
        {generatedCode ? (
          <pre
            style={{
              fontSize: "13px",
              color: "#4ec9b0",
              fontFamily: "Courier New, monospace",
              overflow: "auto",
              height: "100%",
              whiteSpace: "pre-wrap",
              margin: 0,
            }}
          >
            {generatedCode}
          </pre>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#888",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "20px" }}>💻</div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "10px",
                  color: "#ccc",
                }}
              >
                Code Generation
              </div>
              <div style={{ fontSize: "14px" }}>
                Select a test suite to generate Playwright Python code
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
