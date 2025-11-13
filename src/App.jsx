import React from 'react'
import BikeViewer from './components/BikeViewer'

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <header className="p-4 sm:p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-900" />
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">3D Bike Painter — R15 v2</h1>
        </div>
        <a href="/test" className="text-sm text-gray-600 hover:text-gray-900">Test Backend</a>
      </header>

      <main className="flex-1">
        <BikeViewer />
      </main>

      <footer className="p-4 text-center text-xs text-gray-500">Tip: Pick a part then choose a color to paint that section.</footer>
    </div>
  )
}

export default App
