import TopBar from "./components/TopBar";
import Connect from "./pages/Connect";
import Watch from "./pages/Watch";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <TopBar />
      <Connect></Connect>
    </div>
  );
}
