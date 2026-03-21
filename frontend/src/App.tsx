import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ProcessingPage from "./pages/ProcessingPage";
import KaraokePage from "./pages/KaraokePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/processing/:jobId" element={<ProcessingPage />} />
      <Route path="/karaoke/:jobId" element={<KaraokePage />} />
    </Routes>
  );
}
