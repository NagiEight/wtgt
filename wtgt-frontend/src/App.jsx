import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { getCurrentTheme, applyTheme } from './utils/themeManager';

import Topbar from './components/Topbar';
import Home from './pages/Home';
// import Search from './pages/Search';
// import AnimeDetails from './pages/AnimeDetails';
// import NotFound from './pages/NotFound';

function App() {
  const [theme, setTheme] = useState(getCurrentTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <Router>
      <Topbar theme={theme} setTheme={setTheme} />
      <Routes>
        <Route path="/" element={<Home theme={theme} />} />
        {/* <Route path="/search" element={<Search />} />
        <Route path="/anime/:id" element={<AnimeDetails />} />
        <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </Router>
  );
}

export default App;
