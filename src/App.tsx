import { BrowserRouter, Routes, Route } from "react-router";
import Home from './pages/Home'
import PhaserGame from "@/pages/PhaserGame";
import Controller from "@/pages/Controller";
import EndScreen from "@/pages/EndScreen";
import Admin from "@/pages/Admin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<PhaserGame />} />
        <Route path="/control" element={<Controller />} />
        <Route path="/result" element={<EndScreen />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
