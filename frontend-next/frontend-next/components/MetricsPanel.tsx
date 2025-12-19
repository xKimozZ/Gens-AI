'use client';

import { useState, useEffect } from 'react';
import { apiGetMetrics, type Metrics } from '@/lib/api';
import { useApp } from '@/contexts/AppContext';

export default function MetricsPanel() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const { isLoading } = useApp();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await apiGetMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [refreshTrigger]);

  // Trigger refresh when loading state changes (operation completes)
  useEffect(() => {
    if (!isLoading) {
      // Wait a moment for backend to update, then refresh
      const timeout = setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  return (
    <div style={{
      background: '#f8f9fa',
      padding: '20px',
      borderLeft: '1px solid #e0e0e0',
      height: '100%',
      overflowY: 'auto'
    }}>
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: '700', 
        color: '#333', 
        marginBottom: '20px' 
      }}>📊 Metrics</h3>

      <div style={{
        background: 'white',
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '15px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          color: '#6c757d',
          fontSize: '12px',
          marginBottom: '5px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>Total Response Time</div>
        <div style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>
          {metrics?.totals?.total_response_time?.toFixed(2) || 0}<span style={{ fontSize: '14px', color: '#6c757d', marginLeft: '5px' }}>s</span>
        </div>
      </div>

      <div style={{
        background: 'white',
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '15px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          color: '#6c757d',
          fontSize: '12px',
          marginBottom: '5px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>Tokens Used</div>
        <div style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>
          {metrics?.totals?.total_tokens?.toLocaleString() || 0}<span style={{ fontSize: '14px', color: '#6c757d', marginLeft: '5px' }}>tokens</span>
        </div>
      </div>

      <div style={{
        background: 'white',
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '15px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          color: '#6c757d',
          fontSize: '12px',
          marginBottom: '5px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>Avg Response Time</div>
        <div style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>
          {metrics?.totals?.avg_response_time?.toFixed(2) || 0}<span style={{ fontSize: '14px', color: '#6c757d', marginLeft: '5px' }}>s</span>
        </div>
      </div>

      {metrics?.per_phase && metrics.per_phase.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>Per-Phase</h4>
          {metrics.per_phase.map((item, idx) => (
            <div key={idx} style={{
              background: 'white',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '8px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>
                {item.phase}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6c757d' }}>
                <span>Time: {item.response_time.toFixed(2)}s</span>
                <span>Tokens: {item.tokens_used.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
