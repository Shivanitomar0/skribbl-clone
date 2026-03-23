import { useState, useEffect } from "react";
import socket from "../socket";
import Canvas from "./Canvas";
import Chat from "./Chat";

export default function Game({ roomData, setRoomData, onLeave }) {
  const { roomId, playerId } = roomData;
  const [players, setPlayers] = useState(roomData.players);
  const [phase, setPhase] = useState("word_select");
  const [round, setRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(roomData.settings.rounds);
  const [drawerId, setDrawerId] = useState(null);
  const [drawerName, setDrawerName] = useState("");
  const [wordHint, setWordHint] = useState([]);
  const [myWord, setMyWord] = useState("");
  const [wordOptions, setWordOptions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [roundWord, setRoundWord] = useState("");
  const [gameOver, setGameOver] = useState(null);

  const isDrawer = drawerId === playerId;

  useEffect(() => {
    socket.on("round_start", ({ round, totalRounds, drawerId, drawerName, players }) => {
      setRound(round); setTotalRounds(totalRounds); setDrawerId(drawerId);
      setDrawerName(drawerName); setPlayers(players);
      setPhase("word_select"); setMyWord(""); setWordHint([]); setRoundWord("");
    });
    socket.on("word_options", ({ words }) => setWordOptions(words));
    socket.on("your_word", ({ word }) => { setMyWord(word); setPhase("drawing"); });
    socket.on("word_hint", ({ hint }) => { setWordHint(hint); setPhase("drawing"); });
    socket.on("timer_update", ({ timeLeft }) => setTimeLeft(timeLeft));
    socket.on("correct_guess", ({ players }) => setPlayers(players));
    socket.on("round_end", ({ word, players }) => { setRoundWord(word); setPlayers(players); setPhase("round_end"); });
    socket.on("game_over", ({ winner, leaderboard }) => { setGameOver({ winner, leaderboard }); setPhase("game_over"); });
    socket.on("player_joined", ({ players }) => setPlayers(players));
    socket.on("player_left", ({ players }) => setPlayers(players));

    return () => {
      ["round_start","word_options","your_word","word_hint","timer_update",
       "correct_guess","round_end","game_over","player_joined","player_left"]
        .forEach(e => socket.off(e));
    };
  }, []);

  // Game over screen
  if (phase === "game_over" && gameOver) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#f5f5f5" }}>
        <div style={{ background:"#fff", borderRadius:8, padding:32, width:380, boxShadow:"0 1px 6px rgba(0,0,0,0.1)", textAlign:"center" }}>
          <h2 style={{ color:"#333", marginBottom:4 }}>Game Over</h2>
          <p style={{ color:"#888", marginBottom:20, fontSize:14 }}>
            Winner: <strong style={{ color:"#27ae60" }}>{gameOver.winner?.name}</strong> with {gameOver.winner?.score} points
          </p>
          <div style={{ textAlign:"left", marginBottom:20 }}>
            <div style={{ fontSize:12, color:"#aaa", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Leaderboard</div>
            {gameOver.leaderboard.map((p, i) => (
              <div key={p.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 10px", background: i===0 ? "#f0fff4" : "#f9f9f9", borderRadius:6, marginBottom:4, border:"1px solid #eee" }}>
                <span style={{ fontSize:14 }}>{i+1}. {p.name} {p.id === playerId && <span style={{ color:"#4a90e2", fontSize:12 }}>(you)</span>}</span>
                <span style={{ fontWeight:"bold", fontSize:14 }}>{p.score} pts</span>
              </div>
            ))}
          </div>
          <button onClick={onLeave} style={{ background:"#4a90e2", color:"#fff", width:"100%", padding:"10px 0", fontSize:14 }}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"#f5f5f5" }}>

      {/* Top bar */}
      <div style={{ background:"#fff", borderBottom:"1px solid #ddd", padding:"8px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
        <span style={{ fontWeight:"bold", color:"#333", fontSize:16 }}>Skribbl Clone</span>

        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <span style={{ fontSize:13, color:"#888" }}>Round {round} of {totalRounds}</span>

          {phase === "drawing" && (
            <span style={{ background: timeLeft <= 10 ? "#e74c3c" : "#4a90e2", color:"#fff", borderRadius:4, padding:"3px 12px", fontWeight:"bold", fontSize:15 }}>
              {timeLeft}s
            </span>
          )}

          <span style={{ fontSize:14, color:"#333" }}>
            {phase === "drawing" && isDrawer && <>Drawing: <strong>{myWord}</strong></>}
            {phase === "drawing" && !isDrawer && wordHint.length > 0 && (
              <span style={{ letterSpacing:5, fontWeight:"bold" }}>
                {wordHint.map((c, i) => (
                  <span key={i} style={{ display:"inline-block", minWidth:12, borderBottom: c==="_" ? "2px solid #333" : "none", marginRight:2 }}>
                    {c === " " ? "\u00A0\u00A0" : c !== "_" ? c : "\u00A0"}
                  </span>
                ))}
              </span>
            )}
            {phase === "word_select" && <span style={{ color:"#aaa" }}>{isDrawer ? "Choose a word..." : `${drawerName} is choosing a word...`}</span>}
            {phase === "round_end" && <span>Word was: <strong style={{ color:"#27ae60" }}>{roundWord}</strong></span>}
          </span>
        </div>

        <button onClick={onLeave} style={{ background:"#f0f0f0", color:"#666", fontSize:12, padding:"4px 10px" }}>Leave</button>
      </div>

      {/* Word select modal */}
      {phase === "word_select" && isDrawer && wordOptions.length > 0 && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"#fff", borderRadius:8, padding:28, textAlign:"center", width:320 }}>
            <h3 style={{ marginBottom:6, color:"#333" }}>Choose a word</h3>
            <p style={{ color:"#aaa", fontSize:13, marginBottom:16 }}>Pick one to draw:</p>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {wordOptions.map(word => (
                <button key={word} onClick={() => { socket.emit("word_chosen", { roomId, word }); setWordOptions([]); }}
                  style={{ background:"#4a90e2", color:"#fff", padding:"10px 0", fontSize:15 }}>
                  {word}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Round end modal */}
      {phase === "round_end" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"#fff", borderRadius:8, padding:28, textAlign:"center", width:320 }}>
            <h3 style={{ marginBottom:6, color:"#333" }}>Round Over</h3>
            <p style={{ color:"#555", marginBottom:16, fontSize:14 }}>The word was: <strong style={{ color:"#27ae60" }}>{roundWord}</strong></p>
            {players.map(p => (
              <div key={p.id} style={{ display:"flex", justifyContent:"space-between", padding:"6px 10px", background:"#f9f9f9", borderRadius:6, marginBottom:4 }}>
                <span style={{ fontSize:13 }}>{p.name}</span>
                <span style={{ fontWeight:"bold", fontSize:13 }}>{p.score} pts</span>
              </div>
            ))}
            <p style={{ color:"#aaa", fontSize:12, marginTop:12 }}>Next round starting...</p>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div style={{ display:"flex", flex:1, maxWidth:1100, margin:"0 auto", width:"100%", padding:12, gap:10 }}>

        {/* Players sidebar */}
        <div style={{ width:130, flexShrink:0 }}>
          <div style={{ background:"#fff", borderRadius:8, padding:10, border:"1px solid #eee" }}>
            <div style={{ fontSize:11, color:"#aaa", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Players</div>
            {players.map(p => (
              <div key={p.id} style={{ padding:"6px 8px", borderRadius:6, marginBottom:4, background: p.id===drawerId ? "#f0f7ff" : "#fafafa", border: p.id===drawerId ? "1px solid #c0d8f0" : "1px solid #eee" }}>
                <div style={{ fontSize:12, fontWeight: p.id===playerId ? "bold" : "normal", color:"#333" }}>
                  {p.id===drawerId ? "* " : ""}{p.name}{p.id===playerId ? " (you)" : ""}
                </div>
                <div style={{ fontSize:11, color:"#aaa" }}>{p.score} pts</div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex:1, minWidth:0 }}>
          <Canvas roomId={roomId} isDrawer={isDrawer} />
        </div>

        {/* Chat */}
        <div style={{ width:210, flexShrink:0 }}>
          <Chat roomId={roomId} isDrawer={isDrawer} />
        </div>
      </div>
    </div>
  );
}
