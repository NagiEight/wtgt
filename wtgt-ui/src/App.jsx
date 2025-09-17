// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Topbar from './components/_Topbar';
import Watch from './pages/Watch';
import Join from './pages/Join';
import Host from './pages/Host';
import { initSocket } from './utils/roomManager';
import { createContext } from "react";
import { SocketContext } from "./utils/SocketContext";

const ws = initSocket("ws://localhost:3000"); // serverIp should come from state or props
function App() {
  return (
    <SocketContext.Provider value={ws}>
      <Router>
        <Topbar></Topbar>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/watch" element={<Watch />} />
          <Route path="/host" element={<Host />} />
          <Route path="/join" element={<Join />} />
        </Routes>
      </Router>
    </SocketContext.Provider>

  );
}

export default App;
