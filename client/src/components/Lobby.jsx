import { useEffect } from "react";
import socket from "../socket";

export default function Lobby({ roomData, setRoomData, onGameStart, onLeave }) {
  const { roomId, playerId, players, settings } = roomData;
  const isHost = players[0]?.id === playerId;

  useEffect(() => {
    socket.on("player_joined", ({ players }) => setRoomData(p => ({ ...p, players })));
    socket.on("player_left", ({ players }) => setRoomData(p => ({ ...p, players })));
    socket.on("round_start", () => onGameStart());
    return () => { socket.off("player_joined"); socket.off("player_left"); socket.off("round_start"); };
  }, []);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#f5f5f5" }}>
      <div style={{ background:"#fff", borderRadius:8, padding:28, width:380, boxShadow:"0 1px 6px rgba(0,0,0,0.1)" }}>
        <h2 style={{ marginBottom:4, color:"#333", fontSize:22 }}>Lobby</h2>
        <p style={{ color:"#888", fontSize:13, marginBottom:20 }}>
          {settings.rounds} rounds &middot; {settings.drawTime}s draw time &middot; max {settings.maxPlayers} players
        </p>

        <div style={{ background:"#f5f5f5", borderRadius:6, padding:"10px 14px", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:12, color:"#888", marginBottom:2 }}>Room Code</div>
            <div style={{ fontSize:22, fontWeight:"bold", letterSpacing:6, color:"#333" }}>{roomId}</div>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(roomId); alert("Copied: " + roomId); }}
            style={{ background:"#4a90e2", color:"#fff", fontSize:12, padding:"6px 12px" }}>
            Copy
          </button>
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:13, color:"#888", marginBottom:8 }}>Players ({players.length}/{settings.maxPlayers})</div>
          {players.map((p, i) => (
            <div key={p.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:"#f9f9f9", borderRadius:6, marginBottom:6, border:"1px solid #eee" }}>
              <span style={{ fontSize:13, color:"#aaa", width:20 }}>{i + 1}.</span>
              <span style={{ fontSize:14, fontWeight: p.id === playerId ? "bold" : "normal", color:"#333" }}>
                {p.name} {p.id === playerId && <span style={{ color:"#4a90e2", fontSize:12 }}>(you)</span>}
                {i === 0 && <span style={{ color:"#f0a500", fontSize:12, marginLeft:6 }}>host</span>}
              </span>
            </div>
          ))}
        </div>

        {isHost ? (
          <button onClick={() => socket.emit("start_game", { roomId })} disabled={players.length < 2}
            style={{ width:"100%", background:"#27ae60", color:"#fff", padding:"10px 0", fontSize:14, marginBottom:8 }}>
            {players.length < 2 ? "Waiting for more players..." : "Start Game"}
          </button>
        ) : (
          <p style={{ textAlign:"center", color:"#888", fontSize:13, marginBottom:8 }}>Waiting for host to start...</p>
        )}

        <button onClick={onLeave} style={{ width:"100%", background:"#f0f0f0", color:"#666", padding:"8px 0", fontSize:13 }}>
          Leave
        </button>
      </div>
    </div>
  );
}
