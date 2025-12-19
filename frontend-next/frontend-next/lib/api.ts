/**
 * API Client for FastAPI Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ExplorationData {
  url: string;
  title?: string;
  elements?: any[];
  [key: string]: any;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  steps: string[];
  priority?: string;
  locators?: any;
  [key: string]: any;
}

export interface TestSuite {
  id: number;
  name: string;
  url: string;
  testCases: TestCase[];
  explorationData?: ExplorationData;
  timestamp: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface Metrics {
  per_phase: Array<{
    phase: string;
    response_time: number;
    tokens_used: number;
  }>;
  totals: {
    total_response_time: number;
    total_tokens: number;
    avg_response_time: number;
  };
}

/**
 * Explore a URL
 */
export async function apiExploreUrl(url: string): Promise<ApiResponse<ExplorationData>> {
  const response = await fetch(`${API_BASE_URL}/api/explore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return response.json();
}

/**
 * Design test cases
 */
export async function apiDesignTests(
  explorationData: ExplorationData,
  testCount: number
): Promise<ApiResponse<{ test_cases: TestCase[] }>> {
  const response = await fetch(`${API_BASE_URL}/api/design-tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      ...explorationData,
      desired_test_count: testCount 
    }),
  });
  return response.json();
}

/**
 * Send chat message for test modification
 */
export async function apiSendChatMessage(
  testCases: TestCase[],
  message: string,
  explorationData?: ExplorationData
): Promise<ApiResponse<{ test_cases: TestCase[]; response: string }>> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: message,
      context: {
        test_cases: testCases,
        url: explorationData?.url || '',
        elements: explorationData?.elements || [],
        structure: explorationData?.structure || ''
      }
    }),
  });
  return response.json();
}

/**
 * Generate Playwright code
 */
export async function apiGenerateCode(
  testCases: TestCase[],
  url: string,
  suiteName: string,
  elements?: any[],
  customInstructions?: string
): Promise<ApiResponse<{ code: string }>> {
  const response = await fetch(`${API_BASE_URL}/api/generate-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      test_cases: testCases,
      url: url,
      suite_name: suiteName,
      elements: elements || [],
      custom_instructions: customInstructions || ''
    }),
  });
  return response.json();
}

/**
 * Get metrics
 */
export async function apiGetMetrics(): Promise<Metrics> {
  const response = await fetch(`${API_BASE_URL}/api/metrics`);
  const result = await response.json();
  return result.data; // Extract data from ApiResponse wrapper
}

/**
 * Reset agent state
 */
export async function apiResetAgent(): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/reset`, {
    method: 'POST',
  });
  return response.json();
}
