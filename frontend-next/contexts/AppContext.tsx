'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { ExplorationData, TestSuite, TestCase } from '@/lib/api';

interface Exploration {
  id: number;
  name: string;
  url: string;
  data: ExplorationData;
  timestamp: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AppState {
  // Explorations
  explorations: Exploration[];
  selectedExplorationId: number | null;
  addExploration: (data: ExplorationData, url: string) => Exploration;
  getExplorationById: (id: number) => Exploration | undefined;
  updateExplorationName: (id: number, name: string) => void;
  deleteExploration: (id: number) => void;

  // Test Suites
  testSuites: TestSuite[];
  selectedSuiteId: number | null;
  addTestSuite: (suite: Omit<TestSuite, 'id' | 'timestamp'>) => TestSuite;
  getTestSuiteById: (id: number) => TestSuite | undefined;
  updateTestSuite: (id: number, updates: Partial<TestSuite>) => void;
  deleteTestSuite: (id: number) => void;
  setSelectedSuiteId: (id: number | null) => void;

  // Chat History
  getChatHistory: (suiteId: number) => ChatMessage[];
  saveChatMessage: (suiteId: number, message: ChatMessage) => void;
  clearChatHistory: (suiteId: number) => void;

  // Current Tab
  currentTab: string;
  setCurrentTab: (tab: string) => void;

  // Loading State
  isLoading: boolean;
  loadingStatus: string;
  setLoading: (loading: boolean, status?: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [explorations, setExplorations] = useState<Exploration[]>([]);
  const [selectedExplorationId, setSelectedExplorationId] = useState<number | null>(null);
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<number | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<number, ChatMessage[]>>({});
  const [currentTab, setCurrentTab] = useState('explorations');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  const setLoading = (loading: boolean, status: string = '') => {
    setIsLoading(loading);
    setLoadingStatus(status);
  };

  // Load from localStorage on mount
  useEffect(() => {
    const savedExplorations = localStorage.getItem('explorations');
    const savedTestSuites = localStorage.getItem('testSuites');
    const savedChatHistories = localStorage.getItem('chatHistories');

    if (savedExplorations) setExplorations(JSON.parse(savedExplorations));
    if (savedTestSuites) setTestSuites(JSON.parse(savedTestSuites));
    if (savedChatHistories) setChatHistories(JSON.parse(savedChatHistories));
  }, []);

  // Save explorations to localStorage
  useEffect(() => {
    localStorage.setItem('explorations', JSON.stringify(explorations));
  }, [explorations]);

  // Save test suites to localStorage
  useEffect(() => {
    localStorage.setItem('testSuites', JSON.stringify(testSuites));
  }, [testSuites]);

  // Save chat histories to localStorage
  useEffect(() => {
    localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
  }, [chatHistories]);

  // Exploration methods
  const addExploration = (data: ExplorationData, url: string): Exploration => {
    const newExploration: Exploration = {
      id: Date.now(),
      name: data.title || url,
      url,
      data,
      timestamp: Date.now(),
    };
    setExplorations((prev) => [newExploration, ...prev]);
    return newExploration;
  };

  const getExplorationById = (id: number) => {
    return explorations.find((exp) => exp.id === id);
  };

  const updateExplorationName = (id: number, name: string) => {
    setExplorations((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, name } : exp))
    );
  };

  const deleteExploration = (id: number) => {
    setExplorations((prev) => prev.filter((exp) => exp.id !== id));
    if (selectedExplorationId === id) {
      setSelectedExplorationId(null);
    }
  };

  // Test Suite methods
  const addTestSuite = (suite: Omit<TestSuite, 'id' | 'timestamp'>): TestSuite => {
    const newSuite: TestSuite = {
      ...suite,
      id: Date.now(),
      timestamp: Date.now(),
    };
    setTestSuites((prev) => [newSuite, ...prev]);
    return newSuite;
  };

  const getTestSuiteById = (id: number) => {
    return testSuites.find((suite) => suite.id === id);
  };

  const updateTestSuite = (id: number, updates: Partial<TestSuite>) => {
    setTestSuites((prev) =>
      prev.map((suite) => (suite.id === id ? { ...suite, ...updates } : suite))
    );
  };

  const deleteTestSuite = (id: number) => {
    setTestSuites((prev) => prev.filter((suite) => suite.id !== id));
    if (selectedSuiteId === id) {
      setSelectedSuiteId(null);
    }
    // Also delete chat history
    setChatHistories((prev) => {
      const newHistories = { ...prev };
      delete newHistories[id];
      return newHistories;
    });
  };

  // Chat history methods
  const getChatHistory = (suiteId: number): ChatMessage[] => {
    return chatHistories[suiteId] || [];
  };

  const saveChatMessage = (suiteId: number, message: ChatMessage) => {
    setChatHistories((prev) => ({
      ...prev,
      [suiteId]: [...(prev[suiteId] || []), message],
    }));
  };

  const clearChatHistory = (suiteId: number) => {
    setChatHistories((prev) => {
      const newHistories = { ...prev };
      delete newHistories[suiteId];
      return newHistories;
    });
  };

  const value: AppState = {
    explorations,
    selectedExplorationId,
    addExploration,
    getExplorationById,
    updateExplorationName,
    deleteExploration,
    testSuites,
    selectedSuiteId,
    addTestSuite,
    getTestSuiteById,
    updateTestSuite,
    deleteTestSuite,
    setSelectedSuiteId,
    getChatHistory,
    saveChatMessage,
    clearChatHistory,
    currentTab,
    setCurrentTab,
    isLoading,
    loadingStatus,
    setLoading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
