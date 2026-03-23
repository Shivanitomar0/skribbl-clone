import { useEffect, useRef, useState } from "react";
import socket from "../socket";

const COLORS = ["#000000","#ffffff","#ff0000","#ff6600","#ffcc00","#00cc00","#0066ff","#9900cc","#ff66cc","#00cccc","#663300","#999999"];

export default function Canvas({ roomId, isDrawer }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const currentStroke = useRef(null);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function drawLine(ctx, x0, y0, x1, y1, c, s) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    ctx.strokeStyle = c; ctx.lineWidth = s; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke();
  }

  function handleDown(e) {
    if (!isDrawer) return;
    e.preventDefault();
    isDrawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    const c = isEraser ? "#ffffff" : color;
    socket.emit("draw_start", { roomId, x: pos.x, y: pos.y, color: c, size: brushSize });
  }

  function handleMove(e) {
    if (!isDrawer || !isDrawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    const c = isEraser ? "#ffffff" : color;
    drawLine(ctx, lastPos.current.x, lastPos.current.y, pos.x, pos.y, c, brushSize);
    socket.emit("draw_move", { roomId, x: pos.x, y: pos.y });
    lastPos.current = pos;
  }

  function handleUp() {
    if (!isDrawer || !isDrawing.current) return;
    isDrawing.current = false;
    socket.emit("draw_end", { roomId });
  }

  function replayStrokes(strokes) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    let cur = null;
    strokes.forEach(s => {
      if (s.type === "start") cur = s;
      else if (s.type === "move" && cur) { drawLine(ctx, cur.x, cur.y, s.x, s.y, cur.color, cur.size); cur = { ...cur, x: s.x, y: s.y }; }
      else if (s.type === "end") cur = null;
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);

    socket.on("draw_start", ({ x, y, color: c, size: s }) => { currentStroke.current = { x, y, color: c, size: s }; });
    socket.on("draw_move", ({ x, y }) => {
      if (!currentStroke.current) return;
      const ctx = canvasRef.current.getContext("2d");
      const { x: lx, y: ly, color: c, size: s } = currentStroke.current;
      drawLine(ctx, lx, ly, x, y, c, s);
      currentStroke.current = { ...currentStroke.current, x, y };
    });
    socket.on("draw_end", () => { currentStroke.current = null; });
    socket.on("canvas_clear", () => {
      const ctx = canvasRef.current.getContext("2d");
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    });
    socket.on("canvas_history", ({ strokes }) => replayStrokes(strokes));

    return () => { socket.off("draw_start"); socket.off("draw_move"); socket.off("draw_end"); socket.off("canvas_clear"); socket.off("canvas_history"); };
  }, []);

  return (
    <div>
      <canvas ref={canvasRef} width={700} height={450}
        style={{ background:"#fff", border:"2px solid #ddd", borderRadius:8, cursor: isDrawer ? "crosshair" : "default", width:"100%", touchAction:"none", display:"block" }}
        onMouseDown={handleDown} onMouseMove={handleMove} onMouseUp={handleUp} onMouseLeave={handleUp}
        onTouchStart={handleDown} onTouchMove={handleMove} onTouchEnd={handleUp}
      />
      {isDrawer && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, padding:"8px 4px", alignItems:"center", marginTop:6 }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => { setColor(c); setIsEraser(false); }}
              style={{ width:22, height:22, borderRadius:"50%", background:c, cursor:"pointer", border: color===c && !isEraser ? "3px solid #4a90e2" : "2px solid #ccc" }} />
          ))}
          <div style={{ width:1, height:24, background:"#ddd", margin:"0 4px" }} />
          <input type="range" min={1} max={30} value={brushSize} onChange={e => setBrushSize(+e.target.value)} style={{ width:80 }} />
          <span style={{ fontSize:12, color:"#666" }}>{brushSize}px</span>
          <div style={{ width:1, height:24, background:"#ddd", margin:"0 4px" }} />
          <button onClick={() => setIsEraser(!isEraser)} style={{ background: isEraser ? "#4a90e2" : "#eee", color: isEraser ? "#fff" : "#333", fontSize:12, padding:"4px 10px" }}>Eraser</button>
          <button onClick={() => socket.emit("draw_undo", { roomId })} style={{ background:"#eee", color:"#333", fontSize:12, padding:"4px 10px" }}>Undo</button>
          <button onClick={() => socket.emit("canvas_clear", { roomId })} style={{ background:"#eee", color:"#333", fontSize:12, padding:"4px 10px" }}>Clear</button>
        </div>
      )}
    </div>
  );
}
