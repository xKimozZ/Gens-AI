/**
 * Dashboard page - Overview of current session and quick actions.
 * TODO: Implement session cards
 * TODO: Show recent activity
 * TODO: Show quick stats
 */
function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Stats cards - TODO: Implement */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Active Sessions</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Tests Generated</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Coverage</h3>
          <p className="text-3xl font-bold mt-2">0%</p>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Quick Start</h2>
        <p className="text-gray-600 mb-4">
          Start a new testing session by clicking the Chat tab and entering a URL to explore.
        </p>
        {/* TODO: Add quick action buttons */}
      </div>
    </div>
  )
}

export default Dashboard
