# Skribbl Clone

A multiplayer drawing and guessing game built with React + Node.js + Socket.IO.

## Live Demo

https://skribbl-clone-production-b8e2.up.railway.app

## How to Run Locally

### 1. Install backend dependencies
```bash
npm install
```

### 2. Install frontend dependencies
```bash
cd client
npm install
```

### 3. Run the backend
```bash
node server.js
```

### 4. Run the frontend (new terminal)
```bash
cd client
npm run dev
```

Open http://localhost:5173 in your browser.

## How to Play
1. Enter your name and create a room
2. Share the room code with friends
3. Host clicks Start Game
4. The drawer picks a word and draws it
5. Others type guesses in the chat
6. Correct guess earns points
7. Most points at the end wins

## Tech Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Real-time: Socket.IO
- Canvas: HTML5 Canvas API
- Deployment: Railway

## Architecture
- The backend (server.js) handles all game logic, room management, and WebSocket events using Socket.IO
- The frontend connects to the backend via Socket.IO and renders the canvas, chat, and game state in real time
- Drawing strokes are captured on the canvas, sent to the server via draw_start/draw_move/draw_end events, and broadcast to all players in the room
- Game state (rounds, turn order, scoring) is managed entirely on the server to prevent cheating
- Word matching is case-insensitive and trimmed before comparison
