# Skribbl Clone 🎨

A multiplayer drawing and guessing game built with React + Node.js + Socket.IO.

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

### 3. Run the backend (in root folder)
```bash
node server.js
```

### 4. Run the frontend (in client folder, new terminal)
```bash
cd client
npm run dev
```

Open http://localhost:5173 in your browser.

## How to Play
1. Enter your name and create a room (or join with a code)
2. Share the room code with friends
3. Host clicks "Start Game"
4. The drawer picks a word and draws it on the canvas
5. Others type guesses in the chat
6. Correct guess = points! Most points at the end wins.

## Tech Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Real-time: Socket.IO
- Canvas: HTML5 Canvas API

## Features
- Create/join rooms with a code
- Configurable rounds, draw time, max players
- Real-time drawing sync
- Word selection (3 choices per round)
- Letter hints revealed over time
- Scoring and leaderboard
- Undo, eraser, color picker, brush size
- Game over screen with winner
