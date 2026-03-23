import { useState } from "react";
import socket from "../socket";

export default function Home({ onRoomReady }) {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [tab, setTab] = useState("create");
  const [rounds, setRounds] = useState(3);
  const [drawTime, setDrawTime] = useState(80);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function connect(cb) {
    if (!name.trim()) { setError("Please enter your name!"); return; }
    setError("");
    setLoading(true);
    if (!socket.connected) { socket.connect(); socket.once("connect", cb); }
    else cb();
  }

  function createRoom() {
    connect(() => {
      socket.emit("create_room", { playerName: name.trim(), settings: { rounds, drawTime, maxPlayers, wordCount: 3 } });
      socket.once("room_created", (data) => { setLoading(false); onRoomReady({ ...data, playerId: socket.id, playerName: name.trim() }); });
    });
  }

  function joinRoom() {
    if (!roomCode.trim()) { setError("Please enter a room code!"); return; }
    connect(() => {
      socket.emit("join_room", { roomId: roomCode.trim().toUpperCase(), playerName: name.trim() });
      socket.once("room_joined", (data) => { setLoading(false); onRoomReady({ ...data, playerId: socket.id, playerName: name.trim() }); });
      socket.once("join_error", (data) => { setLoading(false); setError(data.message); });
    });
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#f5f5f5" }}>
      <h1 style={{ fontSize:32, marginBottom:6, color:"#333" }}>Skribbl Clone</h1>
      <p style={{ color:"#888", marginBottom:28, fontSize:14 }}>Draw and guess with friends</p>

      <div style={{ background:"#fff", borderRadius:8, padding:28, width:360, boxShadow:"0 1px 6px rgba(0,0,0,0.1)" }}>
        <div style={{ display:"flex", marginBottom:20, borderBottom:"1px solid #eee" }}>
          <button onClick={() => setTab("create")} style={{ flex:1, background:"none", borderRadius:0, padding:"8px 0", borderBottom: tab==="create" ? "2px solid #4a90e2" : "2px solid transparent", color: tab==="create" ? "#4a90e2" : "#aaa", marginBottom:-1 }}>
            Create Room
          </button>
          <button onClick={() => setTab("join")} style={{ flex:1, background:"none", borderRadius:0, padding:"8px 0", borderBottom: tab==="join" ? "2px solid #4a90e2" : "2px solid transparent", color: tab==="join" ? "#4a90e2" : "#aaa", marginBottom:-1 }}>
            Join Room
          </button>
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:13, color:"#555", display:"block", marginBottom:4 }}>Your Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" maxLength={20} />
        </div>

        {tab === "join" && (
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:13, color:"#555", display:"block", marginBottom:4 }}>Room Code</label>
            <input value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} placeholder="e.g. AB12CD" maxLength={6} />
          </div>
        )}

        {tab === "create" && (
          <>
            <div style={{ display:"flex", gap:10, marginBottom:12 }}>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:13, color:"#555", display:"block", marginBottom:4 }}>Rounds</label>
                <select value={rounds} onChange={e => setRounds(+e.target.value)}>
                  {[2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:13, color:"#555", display:"block", marginBottom:4 }}>Draw Time</label>
                <select value={drawTime} onChange={e => setDrawTime(+e.target.value)}>
                  {[30,45,60,80,100,120].map(n => <option key={n} value={n}>{n}s</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:13, color:"#555", display:"block", marginBottom:4 }}>Max Players</label>
              <select value={maxPlayers} onChange={e => setMaxPlayers(+e.target.value)}>
                {[2,4,6,8,10,12].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </>
        )}

        {error && <p style={{ color:"red", fontSize:13, marginBottom:10 }}>{error}</p>}

        <button onClick={tab === "create" ? createRoom : joinRoom} disabled={loading}
          style={{ width:"100%", background:"#4a90e2", color:"#fff", padding:"10px 0", fontSize:14, marginTop:4 }}>
          {loading ? "Connecting..." : tab === "create" ? "Create Room" : "Join Room"}
        </button>
      </div>
    </div>
  );
}
