import { BrowserRouter, Routes, Route } from "react-router";
import Home from './pages/Home'
import PhaserGame from "./pages/PhaserGame";
import Controller from "./pages/Controller";
import EndScreen from "./pages/EndScreen";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game:id" element={<PhaserGame />} />
        <Route path="/play:id" element={<Controller />} />
        <Route path="/result:id" element={<EndScreen />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
