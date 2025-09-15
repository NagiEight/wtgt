// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Topbar from './components/_Topbar';
import Watch from './pages/Watch';
import Join from './pages/Join';
import Host from './pages/Host';

function App() {
  return (
    <Router>
      <Topbar></Topbar>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/watch" element={<Watch />} />
        <Route path="/host" element={<Host />} />
        <Route path="/join" element={<Join />} />
      </Routes>
    </Router>
  );
}

export default App;
