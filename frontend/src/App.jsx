import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ChatInterface from './pages/ChatInterface'
import TestDesign from './pages/TestDesign'
import CodeView from './pages/CodeView'
import Metrics from './pages/Metrics'

/**
 * Main App component.
 * TODO: Add state management (Zustand)
 * TODO: Add WebSocket connection
 * TODO: Add authentication if needed
 */
function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/chat" element={<ChatInterface />} />
          <Route path="/test-design" element={<TestDesign />} />
          <Route path="/code" element={<CodeView />} />
          <Route path="/metrics" element={<Metrics />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
