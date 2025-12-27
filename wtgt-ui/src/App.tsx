import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { Room } from './pages/Room'
import { AdminPanel } from './pages/AdminPanel'
import { Settings } from './pages/Settings'
import { NotFound } from './pages/NotFound'
import { WebSocketProvider } from './api'

function App() {
  return (
    <WebSocketProvider url="ws://localhost:3000/">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </WebSocketProvider>
  )
}

export default App
