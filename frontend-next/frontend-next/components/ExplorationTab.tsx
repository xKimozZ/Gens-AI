'use client';

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { apiExploreUrl } from '@/lib/api';

export default function ExplorationTab() {
  const { explorations, addExploration, deleteExploration, updateExplorationName, setLoading } = useApp();
  const [url, setUrl] = useState('https://www.google.com');
  const [localLoading, setLocalLoading] = useState(false);
  const [selectedExpId, setSelectedExpId] = useState<number | null>(null);

  const handleExplore = async () => {
    if (!url) {
      alert('Please enter a URL');
      return;
    }

    setLocalLoading(true);
    setLoading(true, '🔍 Exploring page... (This may take 30-60 seconds)');
    try {
      const result = await apiExploreUrl(url);
      if (result.success && result.data) {
        const exploration = addExploration(result.data, url);
        setSelectedExpId(exploration.id);
      } else {
        throw new Error(result.message || 'Exploration failed');
      }
    } catch (error) {
      alert('Exploration Error: ' + (error as Error).message);
    } finally {
      setLocalLoading(false);
      setLoading(false, '');
    }
  };

  const selectedExploration = explorations.find((exp) => exp.id === selectedExpId);

  return (
    <div className="flex flex-col h-full">
      {/* Input Section */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexShrink: 0 }}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleExplore()}
          placeholder="Enter URL to explore (e.g., https://demo.playwright.dev/todomvc)"
          style={{
            flex: 1,
            padding: '12px 15px',
            border: '2px solid #e0e0e0',
            borderRadius: '10px',
            fontSize: '14px'
          }}
        />
        <button
          onClick={handleExplore}
          disabled={localLoading}
          style={{
            padding: '12px 25px',
            background: localLoading ? '#ccc' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: localLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          {localLoading ? 'Exploring...' : '🔍 Explore'}
        </button>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '15px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ borderRight: '1px solid #e0e0e0', paddingRight: '15px', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <h4 style={{ marginBottom: '10px', color: '#333', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>
            📁 Saved Sessions
          </h4>
          <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, minHeight: 0 }}>
            {explorations.length === 0 ? (
              <div style={{ color: '#999', fontSize: '11px', textAlign: 'center', padding: '20px 10px' }}>
                No explorations yet
              </div>
            ) : (
              explorations.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => setSelectedExpId(exp.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px',
                    background: selectedExpId === exp.id ? '#f0f4ff' : 'white',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    border: selectedExpId === exp.id ? '2px solid #667eea' : '2px solid #e0e0e0',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      value={exp.name}
                      onChange={(e) => updateExplorationName(exp.id, e.target.value)}
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
                    <div style={{ fontSize: '10px', color: '#6c757d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.url}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this exploration?')) {
                        deleteExploration(exp.id);
                      }
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
          {selectedExploration ? (
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
                Phase 1: Exploration Complete
              </span>
              <h3 style={{ marginBottom: '15px', fontSize: '16px', fontWeight: '600' }}>{selectedExploration.data.title || 'Page Explored'}</h3>
              <p style={{ marginBottom: '10px', fontSize: '13px' }}><strong>URL:</strong> {selectedExploration.url}</p>
              <p style={{ marginBottom: '15px', fontSize: '13px' }}><strong>Elements Found:</strong> {selectedExploration.data.elements?.length || 0}</p>
              
              <div style={{ marginTop: '15px' }}>
                <details>
                  <summary style={{
                    background: '#667eea',
                    color: 'white',
                    padding: '10px 15px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px',
                    userSelect: 'none'
                  }}>📄 Raw Data (JSON)</summary>
                  <pre style={{
                    background: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '0 0 6px 6px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    fontFamily: 'Courier New, monospace',
                    fontSize: '11px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>{JSON.stringify(selectedExploration.data, null, 2)}</pre>
                </details>
              </div>
            </div>
          ) : (
            <div style={{ color: '#6c757d', textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔍</div>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>Select or Create</div>
              <div style={{ fontSize: '14px' }}>Click an exploration or create a new one above</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
