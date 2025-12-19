'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { apiSendChatMessage } from '@/lib/api';
import type { TestCase } from '@/lib/api';

export default function ReviewTab() {
  const { testSuites, updateTestSuite, getChatHistory, saveChatMessage, setLoading: setGlobalLoading } = useApp();
  const [selectedSuiteId, setSelectedSuiteId] = useState<number | null>(null);
  const [mode, setMode] = useState<'edit' | 'chat'>('edit');
  const [editedTests, setEditedTests] = useState<TestCase[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [expandedTests, setExpandedTests] = useState<Record<number, boolean>>({});

  const selectedSuite = testSuites.find((s) => s.id === selectedSuiteId);
  const chatHistory = selectedSuiteId ? getChatHistory(selectedSuiteId) : [];

  useEffect(() => {
    if (selectedSuite) {
      setEditedTests(JSON.parse(JSON.stringify(selectedSuite.testCases)));
    }
  }, [selectedSuite?.testCases, selectedSuiteId]);

  const handleSaveChanges = () => {
    if (selectedSuiteId) {
      updateTestSuite(selectedSuiteId, { testCases: editedTests });
      alert('✅ Changes saved successfully');
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !selectedSuiteId || !selectedSuite) return;

    const userMessage = {
      role: 'user' as const,
      content: chatInput,
      timestamp: Date.now(),
    };
    saveChatMessage(selectedSuiteId, userMessage);
    setChatInput('');
    setLocalLoading(true);
    setGlobalLoading(true, '💬 AI is processing your request...');

    try {
      const result = await apiSendChatMessage(selectedSuite.testCases, chatInput, selectedSuite.explorationData);
      if (result.success && result.data) {
        const assistantMessage = {
          role: 'assistant' as const,
          content: result.data.response,
          timestamp: Date.now(),
        };
        saveChatMessage(selectedSuiteId, assistantMessage);
        
        // Backend may return modified_tests or test_cases
        const updatedTests = result.data.modified_tests || result.data.test_cases;
        if (updatedTests) {
          updateTestSuite(selectedSuiteId, { testCases: updatedTests });
          setEditedTests(JSON.parse(JSON.stringify(updatedTests)));
        }
      } else {
        throw new Error(result.message || 'Chat failed');
      }
    } catch (error) {
      alert('Chat Error: ' + (error as Error).message);
    } finally {
      setLocalLoading(false);
      setGlobalLoading(false, '');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Suite Selector */}
      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '15px', flexShrink: 0 }}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '13px', color: '#667eea', fontWeight: '600', marginRight: '10px' }}>Select Suite:</label>
          <select
            value={selectedSuiteId || ''}
            onChange={(e) => setSelectedSuiteId(Number(e.target.value) || null)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px', minWidth: '200px' }}
          >
            <option value="">-- Select a test suite --</option>
            {testSuites.map((suite) => (
              <option key={suite.id} value={suite.id}>
                {suite.name} ({suite.testCases.length} tests)
              </option>
            ))}
          </select>
        </div>
        {selectedSuite && (
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '13px', color: '#667eea', fontWeight: '600', marginRight: '10px' }}>Suite Name:</label>
            <input
              type="text"
              value={selectedSuite.name}
              onChange={(e) => updateTestSuite(selectedSuiteId!, { name: e.target.value })}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #e0e0e0',
                fontSize: '13px',
                minWidth: '300px'
              }}
            />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'white', borderRadius: '6px', padding: '3px', display: 'inline-flex', border: '1px solid #e0e0e0' }}>
            <button
              onClick={() => setMode('edit')}
              style={{
                padding: '6px 16px',
                background: mode === 'edit' ? '#667eea' : 'transparent',
                color: mode === 'edit' ? 'white' : '#667eea',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ✏️ Manual Edit
            </button>
            <button
              onClick={() => setMode('chat')}
              style={{
                padding: '6px 16px',
                background: mode === 'chat' ? '#667eea' : 'transparent',
                color: mode === 'chat' ? 'white' : '#667eea',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              💬 AI Chat
            </button>
          </div>
          <button
            onClick={handleSaveChanges}
            disabled={!selectedSuiteId}
            style={{
              padding: '8px 16px',
              background: selectedSuiteId ? '#667eea' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: selectedSuiteId ? 'pointer' : 'not-allowed',
              fontWeight: '600'
            }}
          >
            💾 Save
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {!selectedSuite ? (
          <div style={{ color: '#6c757d', textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>💬</div>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>
              {mode === 'edit' ? 'Manual Edit Mode' : 'AI Chat Mode'}
            </div>
            <div style={{ fontSize: '14px' }}>Select a test suite above to {mode === 'edit' ? 'edit test cases' : 'chat with AI'}</div>
          </div>
        ) : mode === 'edit' ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div>
              {editedTests.map((test, index) => {
                const isExpanded = expandedTests[index] !== false; // default to true
                const toggleExpanded = () => {
                  setExpandedTests(prev => ({ ...prev, [index]: !prev[index] }));
                };
                return (
                <div key={index} style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '15px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
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
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={test.name}
                        onChange={(e) => {
                          const newTests = [...editedTests];
                          newTests[index].name = e.target.value;
                          setEditedTests(newTests);
                        }}
                        style={{
                          width: '100%',
                          fontWeight: '600',
                          color: '#333',
                          padding: '8px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
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
                  {isExpanded && (
                  <>
                  <textarea
                    value={test.description}
                    onChange={(e) => {
                      const newTests = [...editedTests];
                      newTests[index].description = e.target.value;
                      setEditedTests(newTests);
                    }}
                    style={{
                      width: '100%',
                      fontSize: '13px',
                      color: '#6c757d',
                      marginBottom: '8px',
                      padding: '8px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px'
                    }}
                    rows={2}
                  />
                  <select
                    value={test.priority}
                    onChange={(e) => {
                      const newTests = [...editedTests];
                      newTests[index].priority = e.target.value as 'high' | 'medium' | 'low';
                      setEditedTests(newTests);
                    }}
                    style={{
                      padding: '6px 8px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                  </>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '15px', marginBottom: '10px' }}>
              {chatHistory.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6c757d' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>💬</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>AI Chat Mode</div>
                    <div style={{ fontSize: '14px' }}>Ask me to add, modify, or remove tests</div>
                  </div>
                </div>
              ) : (
                <div>
                  {chatHistory.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        background: msg.role === 'user' ? '#f0f4ff' : '#f8f9fa',
                        marginLeft: msg.role === 'user' ? '32px' : '0',
                        marginRight: msg.role === 'assistant' ? '32px' : '0'
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: '#6c757d' }}>
                        {msg.role === 'user' ? '👤 You' : '🤖 Assistant'}
                      </div>
                      <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !localLoading && handleSendChat()}
                placeholder="Ask me to modify tests (e.g., 'Add a test for login validation')"
                disabled={localLoading}
                style={{
                  flex: 1,
                  padding: '10px 15px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}
              />
              <button
                onClick={handleSendChat}
                disabled={localLoading || !chatInput.trim()}
                style={{
                  padding: '10px 20px',
                  background: (localLoading || !chatInput.trim()) ? '#ccc' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: (localLoading || !chatInput.trim()) ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                {localLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
