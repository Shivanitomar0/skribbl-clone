import { useState, useEffect, useRef } from "react";
import socket from "../socket";

export default function Chat({ roomId, isDrawer }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    socket.on("chat_message", (msg) => setMessages(prev => [...prev, msg]));
    socket.on("correct_guess", ({ playerName }) =>
      setMessages(prev => [...prev, { name: "System", text: `${playerName} guessed the word!`, type: "system" }])
    );
    return () => { socket.off("chat_message"); socket.off("correct_guess"); };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function send(e) {
    e.preventDefault();
    if (!input.trim()) return;
    if (isDrawer) socket.emit("chat", { roomId, text: input.trim() });
    else socket.emit("guess", { roomId, text: input.trim() });
    setInput("");
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:400, background:"#fff", border:"1px solid #eee", borderRadius:8, overflow:"hidden" }}>
      <div style={{ padding:"8px 12px", background:"#fafafa", borderBottom:"1px solid #eee", fontSize:12, color:"#aaa", textTransform:"uppercase", letterSpacing:1 }}>
        Chat
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:10 }}>
        {messages.length === 0 && (
          <p style={{ color:"#ccc", fontSize:12, textAlign:"center", marginTop:20 }}>
            {isDrawer ? "You are drawing" : "Type your guesses..."}
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom:5 }}>
            <span style={{ fontWeight:"bold", fontSize:12, color: msg.type==="system" ? "#27ae60" : "#4a90e2" }}>{msg.name}: </span>
            <span style={{ fontSize:13, color: msg.type==="system" ? "#27ae60" : "#555" }}>{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} style={{ display:"flex", borderTop:"1px solid #eee" }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          placeholder={isDrawer ? "Chat..." : "Guess..."}
          style={{ flex:1, border:"none", borderRadius:0, padding:"8px 10px", fontSize:13 }}
          maxLength={50} />
        <button type="submit" style={{ background:"#4a90e2", color:"#fff", borderRadius:0, padding:"0 14px", fontSize:13 }}>
          Send
        </button>
      </form>
    </div>
  );
}
