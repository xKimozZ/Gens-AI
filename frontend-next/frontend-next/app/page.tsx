'use client';

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import ExplorationTab from '@/components/ExplorationTab';
import TestSuitesTab from '@/components/TestSuitesTab';
import ReviewTab from '@/components/ReviewTab';
import CodegenTab from '@/components/CodegenTab';
import MetricsPanel from '@/components/MetricsPanel';
import { apiResetAgent } from '@/lib/api';

export default function Home() {
  const { currentTab, setCurrentTab, isLoading, loadingStatus, setLoading } = useApp();

  const handleResetAgent = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will reset the agent state on the backend.\\n\\n' +
      'Your locally saved explorations, test suites, and chat history will NOT be affected.\\n\\n' +
      'Do you want to continue?'
    );
    
    if (!confirmed) return;

    setLoading(true, '🔄 Resetting agent...');
    try {
      await apiResetAgent();
      alert('✅ Agent reset complete');
    } catch (error) {
      alert('❌ Reset failed: ' + (error as Error).message);
    } finally {
      setLoading(false, '');
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto">
      <div className="bg-white rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] h-[90vh] grid grid-cols-[1fr_300px] overflow-hidden">
        {/* Main Panel */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '30px',
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '10px' 
          }}>
            <div>
              <h1 style={{ 
                color: '#667eea', 
                marginBottom: '10px', 
                fontSize: '28px',
                fontWeight: '700'
              }}>🤖 Web Testing Agent</h1>
              <p style={{ 
                color: '#6c757d', 
                marginBottom: '30px', 
                fontSize: '14px' 
              }}>AI-powered test exploration and design</p>
            </div>
            <button
              onClick={handleResetAgent}
              style={{
                padding: '10px 20px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🔄 Reset Agent
            </button>
          </div>

          {/* Tabs Navigation */}
          <div style={{ 
            display: 'flex', 
            gap: '5px', 
            marginBottom: '20px', 
            borderBottom: '2px solid #e0e0e0' 
          }}>
            {[
              { id: 'explorations', label: '📁 Explorations' },
              { id: 'testsuites', label: '📋 Test Suites' },
              { id: 'review', label: '💬 Review & Edit' },
              { id: 'codegen', label: '💻 Generate Code' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => !isLoading && setCurrentTab(tab.id)}
                style={{
                  padding: '10px 20px',
                  background: currentTab === tab.id ? 'transparent' : 'transparent',
                  border: 'none',
                  borderBottom: currentTab === tab.id ? '3px solid #667eea' : '3px solid transparent',
                  borderRadius: currentTab === tab.id ? '0' : '0',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: currentTab === tab.id ? '#667eea' : '#6c757d',
                  transition: 'all 0.2s',
                  opacity: isLoading ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (currentTab !== tab.id && !isLoading) {
                    e.currentTarget.style.color = '#667eea';
                    e.currentTarget.style.background = '#f8f9fa';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentTab !== tab.id) {
                    e.currentTarget.style.color = '#6c757d';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {currentTab === 'explorations' && <ExplorationTab />}
            {currentTab === 'testsuites' && <TestSuitesTab />}
            {currentTab === 'review' && <ReviewTab />}
            {currentTab === 'codegen' && <CodegenTab />}
          </div>
        </div>

        {/* Metrics Panel */}
        <MetricsPanel />
      </div>

      {/* Loading Footer */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#1a1a2e',
          borderTop: '3px solid #667eea',
          color: 'white',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
          zIndex: 1000,
          fontSize: '14px',
          fontWeight: '600'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '3px solid rgba(255,255,255,0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span>{loadingStatus || 'Processing...'}</span>
        </div>
      )}
    </div>
  );
}
