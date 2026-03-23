import { useState } from "react";
import Home from "./components/Home";
import Lobby from "./components/Lobby";
import Game from "./components/Game";
import socket from "./socket";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [roomData, setRoomData] = useState(null);

  function handleRoomReady(data) {
    setRoomData(data);
    setScreen("lobby");
  }

  function handleGameStart() {
    setScreen("game");
  }

  function handleLeave() {
    socket.disconnect();
    setRoomData(null);
    setScreen("home");
  }

  if (screen === "home") return <Home onRoomReady={handleRoomReady} />;
  if (screen === "lobby") return <Lobby roomData={roomData} setRoomData={setRoomData} onGameStart={handleGameStart} onLeave={handleLeave} />;
  if (screen === "game") return <Game roomData={roomData} setRoomData={setRoomData} onLeave={handleLeave} />;
}
