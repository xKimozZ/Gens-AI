import { useState } from 'react'

/**
 * Code View page - View generated BDD and test code with diff functionality.
 * TODO: Display BDD feature files
 * TODO: Display POM classes
 * TODO: Display test files
 * TODO: Implement diff view (old vs new)
 * TODO: Add undo/redo functionality
 * TODO: Show code editor with syntax highlighting
 */
function CodeView() {
  const [selectedTab, setSelectedTab] = useState('bdd')
  const [showDiff, setShowDiff] = useState(false)

  const tabs = [
    { id: 'bdd', label: 'BDD Features' },
    { id: 'pom', label: 'Page Objects' },
    { id: 'tests', label: 'Test Code' }
  ]

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Code View</h1>
          
          <div className="flex items-center gap-4">
            {/* Version controls - TODO: Implement */}
            <button className="px-4 py-2 border rounded hover:bg-gray-50">
              Undo
            </button>
            <button className="px-4 py-2 border rounded hover:bg-gray-50">
              Redo
            </button>
            <button
              onClick={() => setShowDiff(!showDiff)}
              className={`px-4 py-2 rounded ${
                showDiff ? 'bg-blue-600 text-white' : 'border hover:bg-gray-50'
              }`}
            >
              Show Diff
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-4 py-2 rounded ${
                selectedTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4">
        {showDiff ? (
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="bg-white p-4 rounded-lg shadow border">
              <h3 className="font-bold mb-2">Old Version</h3>
              <div className="text-gray-500">Previous version will appear here</div>
              {/* TODO: Show old version */}
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <h3 className="font-bold mb-2">New Version</h3>
              <div className="text-gray-500">New version will appear here</div>
              {/* TODO: Show new version with highlights */}
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-lg shadow h-full">
            <div className="text-gray-500 text-center py-8">
              {selectedTab === 'bdd' && 'BDD feature files will appear here'}
              {selectedTab === 'pom' && 'Page Object Model classes will appear here'}
              {selectedTab === 'tests' && 'Test code will appear here'}
            </div>
            {/* TODO: Show code with syntax highlighting (Monaco Editor) */}
          </div>
        )}
      </div>
    </div>
  )
}

export default CodeView
