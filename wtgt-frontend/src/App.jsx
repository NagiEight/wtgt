import TopBar from "./components/TopBar";
import Watch from "./pages/Watch";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <TopBar />
      <Watch></Watch>
    </div>
  );
}
