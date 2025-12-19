'use client';

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { apiGenerateCode } from '@/lib/api';

export default function CodegenTab() {
  const { testSuites, setLoading: setGlobalLoading } = useApp();
  const [selectedSuiteId, setSelectedSuiteId] = useState<number | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const selectedSuite = testSuites.find((s) => s.id === selectedSuiteId);

  const handleGenerateCode = async () => {
    if (!selectedSuite) return;

    setLocalLoading(true);
    setGlobalLoading(true, '⚡ Generating Playwright Python code...');
    try {
      const result = await apiGenerateCode(
        selectedSuite.testCases,
        selectedSuite.url,
        selectedSuite.name,
        selectedSuite.explorationData?.elements || [],
        customInstructions
      );
      if (result.success && result.data) {
        // Clean escaped newlines
        const cleanCode = result.data.code.replace(/\\n/g, '\n');
        setGeneratedCode(cleanCode);
      } else {
        throw new Error(result.message || 'Code generation failed');
      }
    } catch (error) {
      alert('Code Generation Error: ' + (error as Error).message);
    } finally {
      setLocalLoading(false);
      setGlobalLoading(false, '');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSuite?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'test'}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    alert('✅ Code copied to clipboard');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '15px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', color: '#667eea', fontWeight: '600' }}>Select Suite:</label>
          <select
            value={selectedSuiteId || ''}
            onChange={(e) => {
              setSelectedSuiteId(Number(e.target.value) || null);
              setGeneratedCode('');
            }}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px', minWidth: '200px' }}
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
              padding: '10px 20px',
              background: (!selectedSuiteId || localLoading) ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: (!selectedSuiteId || localLoading) ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            {localLoading ? 'Generating...' : '⚡ Generate Playwright Code'}
          </button>
          <button
            onClick={handleCopy}
            disabled={!generatedCode}
            style={{
              padding: '10px 20px',
              background: !generatedCode ? '#ccc' : '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: !generatedCode ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            📋 Copy
          </button>
          <button
            onClick={handleDownload}
            disabled={!generatedCode}
            style={{
              padding: '10px 20px',
              background: !generatedCode ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: !generatedCode ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            ⬇️ Download
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
          <label style={{ fontSize: '13px', color: '#667eea', fontWeight: '600', paddingTop: '8px' }}>Custom Instructions:</label>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Add custom instructions for code generation (e.g., 'Use data-testid attributes for locators', 'Add extra assertions for accessibility', 'Include retry logic for flaky elements')"
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              fontSize: '13px',
              minHeight: '60px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      {/* Code Display */}
      <div style={{ flex: 1, overflow: 'hidden', background: '#2d2d2d', borderRadius: '8px', padding: '20px' }}>
        {generatedCode ? (
          <pre style={{ fontSize: '13px', color: '#4ec9b0', fontFamily: 'Courier New, monospace', overflow: 'auto', height: '100%', whiteSpace: 'pre-wrap', margin: 0 }}>
            {generatedCode}
          </pre>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>💻</div>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px', color: '#ccc' }}>Code Generation</div>
              <div style={{ fontSize: '14px' }}>Select a test suite to generate Playwright Python code</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
