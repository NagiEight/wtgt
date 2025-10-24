import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Connect from "./pages/Connect";
import Watch from "./pages/Watch";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Connect />} />
        <Route path="/watch" element={<Watch />} />
      </Routes>
    </Router>
  );
}
export default App;
