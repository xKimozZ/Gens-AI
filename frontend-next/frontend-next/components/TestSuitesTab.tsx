'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { apiDesignTests } from '@/lib/api';

export default function TestSuitesTab() {
  const { explorations, testSuites, addTestSuite, deleteTestSuite, updateTestSuite, setSelectedSuiteId, setLoading: setGlobalLoading } = useApp();
  const [testCount, setTestCount] = useState(12);
  const [localLoading, setLocalLoading] = useState(false);
  const [selectedSuiteIdLocal, setSelectedSuiteIdLocal] = useState<number | null>(null);
  const [selectedExplorationId, setSelectedExplorationId] = useState<number | null>(null);
  const [expandedTests, setExpandedTests] = useState<Record<number, boolean>>({});

  const handleDesignTests = async () => {
    if (!selectedExplorationId) {
      alert('Please select an exploration first');
      return;
    }

    const selectedExploration = explorations.find(exp => exp.id === selectedExplorationId);
    if (!selectedExploration) {
      alert('Selected exploration not found');
      return;
    }

    setLocalLoading(true);
    setGlobalLoading(true, `📋 Designing ${testCount} test cases... (This may take 30-60 seconds)`);

    try {
      const result = await apiDesignTests(selectedExploration.data, testCount);
      if (result.success && result.data) {
        const suite = addTestSuite({
          name: `Test Suite - ${selectedExploration.name}`,
          url: selectedExploration.url,
          testCases: result.data.test_cases,
          explorationData: selectedExploration.data,
        });
        setSelectedSuiteIdLocal(suite.id);
      } else {
        throw new Error(result.message || 'Test design failed');
      }
    } catch (error) {
      alert('Test Design Error: ' + (error as Error).message);
    } finally {
      setLocalLoading(false);
      setGlobalLoading(false, '');
    }
  };

  const selectedSuite = testSuites.find((s) => s.id === selectedSuiteIdLocal);

  const handleSelectSuite = (id: number) => {
    setSelectedSuiteIdLocal(id);
    setSelectedSuiteId(id);
  };

  const handleDeleteSuite = (id: number) => {
    if (confirm('Delete this test suite?')) {
      deleteTestSuite(id);
      if (selectedSuiteIdLocal === id) {
        setSelectedSuiteIdLocal(null);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Test Design Controls */}
      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <label style={{ fontSize: '13px', color: '#667eea', fontWeight: '600' }}>Exploration:</label>
        <select
          value={selectedExplorationId || ''}
          onChange={(e) => setSelectedExplorationId(Number(e.target.value) || null)}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px', minWidth: '200px' }}
        >
          <option value="">-- Select exploration --</option>
          {explorations.map((exp) => (
            <option key={exp.id} value={exp.id}>
              {exp.name}
            </option>
          ))}
        </select>
        <label style={{ fontSize: '13px', color: '#667eea', fontWeight: '600' }}>Test Count:</label>
        <select
          value={testCount}
          onChange={(e) => setTestCount(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px' }}
        >
          {[5, 8, 10, 12, 15, 20].map((count) => (
            <option key={count} value={count}>
              {count} tests
            </option>
          ))}
        </select>
        <button
          onClick={handleDesignTests}
          disabled={localLoading || !selectedExplorationId}
          style={{
            padding: '10px 20px',
            background: (localLoading || !selectedExplorationId) ? '#ccc' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: (localLoading || !selectedExplorationId) ? 'not-allowed' : 'pointer',
            fontWeight: '600'
          }}
        >
          {localLoading ? 'Designing...' : '📋 Design Tests'}
        </button>
        <div style={{ flex: 1 }}></div>
        <span style={{ fontSize: '12px', color: '#6c757d' }}>💡 Select an exploration to generate tests</span>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '15px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ borderRight: '1px solid #e0e0e0', paddingRight: '15px', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <h4 style={{ marginBottom: '10px', color: '#333', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>
            📋 Saved Suites
          </h4>
          <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, minHeight: 0 }}>
            {testSuites.length === 0 ? (
              <div style={{ color: '#999', fontSize: '11px', textAlign: 'center', padding: '20px 10px' }}>
                No test suites yet
              </div>
            ) : (
              testSuites.map((suite) => (
                <div
                  key={suite.id}
                  onClick={() => handleSelectSuite(suite.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px',
                    background: selectedSuiteIdLocal === suite.id ? '#f0f4ff' : 'white',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    border: selectedSuiteIdLocal === suite.id ? '2px solid #667eea' : '2px solid #e0e0e0',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={suite.name}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateTestSuite(suite.id, { name: e.target.value });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        border: '1px solid #ccc',
                        background: '#fff',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: '600',
                        fontSize: '12px',
                        marginBottom: '4px'
                      }}
                    />
                    <div style={{ fontSize: '10px', color: '#6c757d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>{suite.url}</div>
                    <div style={{ fontSize: '10px', color: '#999' }}>
                      {suite.testCases.length} tests
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSuite(suite.id);
                    }}
                    style={{
                      padding: '4px 8px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      flexShrink: 0
                    }}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Display Area */}
        <div style={{ overflowY: 'auto', padding: '0 10px', minHeight: 0 }}>
          {selectedSuite ? (
            <div>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: '#667eea',
                color: 'white',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '10px'
              }}>
                Phase 2: Test Design Complete
              </span>
              <h3 style={{ marginBottom: '15px', fontSize: '16px', fontWeight: '600' }}>{selectedSuite.name}</h3>
              <p style={{ marginBottom: '10px', fontSize: '13px' }}>
                <strong>URL:</strong> {selectedSuite.url}
              </p>
              <p style={{ marginBottom: '15px', fontSize: '13px' }}>
                <strong>Total Tests:</strong> {selectedSuite.testCases.length}
              </p>

              {/* Test Cases */}
              <div>
                {selectedSuite.testCases.map((testCase, index) => {
                  const isExpanded = expandedTests[index] || false;
                  const toggleExpanded = () => {
                    setExpandedTests(prev => ({ ...prev, [index]: !prev[index] }));
                  };
                  return (
                  <div key={index} style={{
                    background: 'white',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    borderLeft: '4px solid #667eea',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <span style={{ 
                          background: '#667eea', 
                          color: 'white', 
                          fontWeight: '600', 
                          fontSize: '12px', 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {index + 1}
                        </span>
                        <h4 style={{ fontWeight: '600', color: '#333', fontSize: '14px' }}>{testCase.name}</h4>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          borderRadius: '4px',
                          background: testCase.priority === 'high' ? '#fee' : testCase.priority === 'medium' ? '#ffc' : '#efe',
                          color: testCase.priority === 'high' ? '#c00' : testCase.priority === 'medium' ? '#860' : '#060'
                        }}>
                          {testCase.priority}
                        </span>
                        <button
                          onClick={toggleExpanded}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            padding: '4px',
                            color: '#667eea'
                          }}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6c757d', marginBottom: isExpanded ? '12px' : '0' }}>{testCase.description}</p>
                    {isExpanded && (
                    <>
                    {testCase.steps && testCase.steps.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>Steps:</div>
                        <ol style={{ listStyleType: 'decimal', listStylePosition: 'inside', fontSize: '12px', color: '#6c757d', lineHeight: '1.6' }}>
                          {testCase.steps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    
                    {testCase.locators && Object.keys(testCase.locators).length > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>Locators:</div>
                        <div style={{ background: '#f8f9fa', borderRadius: '4px', padding: '8px', fontSize: '11px', fontFamily: 'Courier New, monospace', color: '#333' }}>
                          {Object.entries(testCase.locators).map(([key, value]) => (
                            <div key={key}>{key}: {String(value)}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    </>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ color: '#6c757d', textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>No Suite Selected</div>
              <div style={{ fontSize: '14px' }}>Generate test cases from an exploration or select a saved suite</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
