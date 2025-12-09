import { useState, useEffect, useRef } from 'react'
import { FiSend } from 'react-icons/fi'

/**
 * Chat interface for interacting with AI agent.
 * TODO: Implement WebSocket connection
 * TODO: Add message history
 * TODO: Add typing indicator
 * TODO: Show live browser feed
 * TODO: Show progress indicators
 */
function ChatInterface() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef(null)

  // TODO: Implement WebSocket connection
  useEffect(() => {
    // const ws = new WebSocket('ws://localhost:8000/ws')
    // ws.onopen = () => setIsConnected(true)
    // ws.onmessage = (event) => handleMessage(JSON.parse(event.data))
    // ws.onclose = () => setIsConnected(false)
    // return () => ws.close()
  }, [])

  const handleSendMessage = async () => {
    if (!input.trim()) return

    // Add user message
    const userMessage = { role: 'user', content: input }
    setMessages([...messages, userMessage])
    setInput('')

    // TODO: Send to backend via WebSocket
    // TODO: Handle response

    // Placeholder response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'This is a placeholder response. WebSocket integration pending.' }
      ])
    }, 1000)
  }

  return (
    <div className="flex h-screen">
      {/* Chat panel */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b p-4">
          <h2 className="text-xl font-bold">Chat with Agent</h2>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p>Start a conversation with the agent</p>
              <p className="text-sm mt-2">Try: "Explore https://example.com"</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xl px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FiSend />
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Browser view panel - TODO: Implement */}
      <div className="w-96 bg-gray-50 border-l p-4">
        <h3 className="font-bold mb-4">Live Browser</h3>
        <div className="bg-white h-64 rounded border flex items-center justify-center text-gray-400">
          Browser feed placeholder
        </div>
        
        {/* Progress indicators - TODO: Implement */}
        <div className="mt-4">
          <h3 className="font-bold mb-2">Progress</h3>
          <div className="space-y-2">
            <div className="text-sm text-gray-600">Phase 1: Exploration - Idle</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface
