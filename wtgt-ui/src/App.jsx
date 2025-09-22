// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Topbar from './components/_Topbar';
import Watch from './pages/Watch';
import Join from './pages/Join';
import Host from './pages/Host';
import { initSocket } from './utils/roomManager';
import Connect from './pages/Connect';
import Library from './pages/Library'

function App() {
  return (
    <Router>
      <Topbar></Topbar>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/watch" element={<Watch />} />
        <Route path="/host" element={<Host />} />
        <Route path="/join" element={<Join />} />
        <Route path="/connect" element={<Connect />} />
        <Route path="/library" element={<Library />} />
      </Routes>
    </Router>

  );
}

export default App;
