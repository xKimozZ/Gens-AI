/**
 * Test Design page - View and refine test cases, see coverage.
 * TODO: Display test cases list
 * TODO: Show coverage visualization
 * TODO: Allow refinement
 * TODO: Show diff view for changes
 */
function TestDesign() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Test Design</h1>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Test cases panel */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Test Cases</h2>
          <div className="text-gray-500 text-center py-8">
            No test cases generated yet
          </div>
          {/* TODO: Display test cases */}
        </div>
        
        {/* Coverage visualization */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Coverage Map</h2>
          <div className="text-gray-500 text-center py-8">
            Coverage visualization will appear here
          </div>
          {/* TODO: Display coverage map with shaded regions */}
        </div>
      </div>
      
      {/* Actions */}
      <div className="mt-6 flex gap-4">
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Refine Test Cases
        </button>
        <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          Generate BDD
        </button>
      </div>
    </div>
  )
}

export default TestDesign
