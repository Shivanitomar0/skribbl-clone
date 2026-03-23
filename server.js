const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const WORDS = [
  "apple", "banana", "car", "dog", "elephant", "flower", "guitar", "house",
  "ice cream", "jungle", "kite", "lion", "mountain", "notebook", "ocean",
  "pizza", "queen", "rainbow", "sun", "tree", "umbrella", "volcano", "whale",
  "xylophone", "yacht", "zebra", "airplane", "bridge", "castle", "diamond",
  "eagle", "fire", "ghost", "hammer", "island", "jacket", "knife", "ladder",
  "moon", "nurse", "orange", "pencil", "robot", "snake", "tiger", "unicorn"
];

// rooms[roomId] = { id, hostId, players, settings, game }
const rooms = {};

function randomWords(n) {
  const shuffled = [...WORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function makeRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRoom(roomId) {
  return rooms[roomId];
}

function startRound(roomId) {
  const room = getRoom(roomId);
  if (!room) return;

  const game = room.game;
  game.strokes = [];
  game.currentWord = null;
  game.phase = "word_select";
  room.players.forEach(p => { p.hasGuessed = false; });

  const drawer = room.players[game.drawerIndex];
  if (!drawer) return endGame(roomId);

  const wordOptions = randomWords(room.settings.wordCount);

  io.to(drawer.id).emit("word_options", { words: wordOptions });
  io.to(roomId).emit("round_start", {
    round: game.round + 1,
    totalRounds: room.settings.rounds,
    drawerId: drawer.id,
    drawerName: drawer.name,
    players: room.players
  });

  // auto pick word if drawer doesn't choose in 15s
  game.wordTimer = setTimeout(() => {
    if (game.phase === "word_select") {
      chooseWord(roomId, wordOptions[0]);
    }
  }, 15000);
}

function chooseWord(roomId, word) {
  const room = getRoom(roomId);
  if (!room) return;
  const game = room.game;

  clearTimeout(game.wordTimer);
  game.currentWord = word.toLowerCase().trim();
  game.phase = "drawing";
  game.timeLeft = room.settings.drawTime;

  const drawer = room.players[game.drawerIndex];
  io.to(drawer.id).emit("your_word", { word: game.currentWord });

  // send blanks to others
  const hint = game.currentWord.split("").map(c => c === " " ? " " : "_");
  io.to(roomId).emit("word_hint", { hint });

  // countdown
  io.to(roomId).emit("timer_update", { timeLeft: game.timeLeft });
  game.countInterval = setInterval(() => {
    game.timeLeft--;
    io.to(roomId).emit("timer_update", { timeLeft: game.timeLeft });
    if (game.timeLeft <= 0) {
      clearInterval(game.countInterval);
      endRound(roomId);
    }
  }, 1000);

  // reveal a hint letter halfway through
  game.hintTimeout = setTimeout(() => {
    if (game.phase !== "drawing") return;
    const indices = [];
    game.currentWord.split("").forEach((c, i) => { if (c !== " ") indices.push(i); });
    const pick = indices[Math.floor(Math.random() * indices.length)];
    hint[pick] = game.currentWord[pick];
    io.to(roomId).emit("word_hint", { hint });
  }, (room.settings.drawTime / 2) * 1000);
}

function endRound(roomId) {
  const room = getRoom(roomId);
  if (!room) return;
  const game = room.game;

  clearInterval(game.countInterval);
  clearTimeout(game.hintTimeout);
  game.phase = "round_end";

  io.to(roomId).emit("round_end", {
    word: game.currentWord,
    players: room.players
  });

  setTimeout(() => {
    game.round++;
    game.drawerIndex = (game.drawerIndex + 1) % room.players.length;

    if (game.round >= room.settings.rounds) {
      endGame(roomId);
    } else {
      startRound(roomId);
    }
  }, 4000);
}

function endGame(roomId) {
  const room = getRoom(roomId);
  if (!room) return;
  room.game.phase = "game_over";

  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  io.to(roomId).emit("game_over", {
    winner: sorted[0],
    leaderboard: sorted
  });
}

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.on("create_room", ({ playerName, settings }) => {
    const roomId = makeRoomId();
    rooms[roomId] = {
      id: roomId,
      hostId: socket.id,
      players: [{ id: socket.id, name: playerName, score: 0, hasGuessed: false }],
      settings: {
        maxPlayers: settings.maxPlayers || 8,
        rounds: settings.rounds || 3,
        drawTime: settings.drawTime || 80,
        wordCount: settings.wordCount || 3
      },
      game: {
        phase: "lobby",
        round: 0,
        drawerIndex: 0,
        currentWord: null,
        strokes: [],
        timeLeft: 0
      }
    };
    socket.join(roomId);
    socket.emit("room_created", {
      roomId,
      players: rooms[roomId].players,
      settings: rooms[roomId].settings
    });
  });

  socket.on("join_room", ({ roomId, playerName }) => {
    const room = getRoom(roomId);
    if (!room) return socket.emit("join_error", { message: "Room not found!" });
    if (room.players.length >= room.settings.maxPlayers)
      return socket.emit("join_error", { message: "Room is full!" });

    room.players.push({ id: socket.id, name: playerName, score: 0, hasGuessed: false });
    socket.join(roomId);

    socket.emit("room_joined", {
      roomId,
      players: room.players,
      settings: room.settings,
      phase: room.game.phase
    });

    socket.to(roomId).emit("player_joined", {
      player: { id: socket.id, name: playerName },
      players: room.players
    });

    // send canvas history if game in progress
    if (room.game.phase === "drawing" && room.game.strokes.length > 0) {
      socket.emit("canvas_history", { strokes: room.game.strokes });
    }
  });

  socket.on("start_game", ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room || room.hostId !== socket.id) return;
    if (room.players.length < 2) return socket.emit("join_error", { message: "Need at least 2 players!" });
    room.game.round = 0;
    room.game.drawerIndex = 0;
    startRound(roomId);
  });

  socket.on("word_chosen", ({ roomId, word }) => {
    const room = getRoom(roomId);
    if (!room) return;
    const drawer = room.players[room.game.drawerIndex];
    if (!drawer || drawer.id !== socket.id) return;
    chooseWord(roomId, word);
  });

  // Drawing
  socket.on("draw_start", ({ roomId, x, y, color, size }) => {
    const room = getRoom(roomId);
    if (!room) return;
    const drawer = room.players[room.game.drawerIndex];
    if (!drawer || drawer.id !== socket.id) return;
    const data = { type: "start", x, y, color, size };
    room.game.strokes.push(data);
    socket.to(roomId).emit("draw_start", data);
  });

  socket.on("draw_move", ({ roomId, x, y }) => {
    const room = getRoom(roomId);
    if (!room) return;
    const drawer = room.players[room.game.drawerIndex];
    if (!drawer || drawer.id !== socket.id) return;
    const data = { type: "move", x, y };
    room.game.strokes.push(data);
    socket.to(roomId).emit("draw_move", data);
  });

  socket.on("draw_end", ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room) return;
    room.game.strokes.push({ type: "end" });
    socket.to(roomId).emit("draw_end", {});
  });

  socket.on("canvas_clear", ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room) return;
    const drawer = room.players[room.game.drawerIndex];
    if (!drawer || drawer.id !== socket.id) return;
    room.game.strokes = [];
    io.to(roomId).emit("canvas_clear", {});
  });

  socket.on("draw_undo", ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room) return;
    const drawer = room.players[room.game.drawerIndex];
    if (!drawer || drawer.id !== socket.id) return;
    // remove last stroke segment
    const strokes = room.game.strokes;
    let i = strokes.length - 1;
    while (i >= 0 && strokes[i].type !== "start") i--;
    room.game.strokes = strokes.slice(0, Math.max(0, i));
    io.to(roomId).emit("canvas_history", { strokes: room.game.strokes });
  });

  // Guess
  socket.on("guess", ({ roomId, text }) => {
    const room = getRoom(roomId);
    if (!room || room.game.phase !== "drawing") return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const drawer = room.players[room.game.drawerIndex];
    if (drawer && drawer.id === socket.id) return; // drawer can't guess

    if (player.hasGuessed) return;

    const isCorrect = text.toLowerCase().trim() === room.game.currentWord;

    if (isCorrect) {
      player.hasGuessed = true;
      player.score += 100;
      if (drawer) drawer.score += 50;

      io.to(roomId).emit("correct_guess", {
        playerName: player.name,
        players: room.players
      });

      // end round if everyone guessed
      const guessers = room.players.filter(p => p.id !== drawer?.id);
      if (guessers.every(p => p.hasGuessed)) {
        clearInterval(room.game.countInterval);
        endRound(roomId);
      }
    } else {
      io.to(roomId).emit("chat_message", {
        name: player.name,
        text,
        type: "guess"
      });
    }
  });

  socket.on("chat", ({ roomId, text }) => {
    const room = getRoom(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    io.to(roomId).emit("chat_message", { name: player.name, text, type: "chat" });
  });

  socket.on("disconnect", () => {
    Object.keys(rooms).forEach(roomId => {
      const room = rooms[roomId];
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx === -1) return;

      room.players.splice(idx, 1);
      io.to(roomId).emit("player_left", { playerId: socket.id, players: room.players });

      if (room.players.length === 0) {
        clearInterval(room.game.countInterval);
        clearTimeout(room.game.hintTimeout);
        clearTimeout(room.game.wordTimer);
        delete rooms[roomId];
      } else {
        if (room.hostId === socket.id) {
          room.hostId = room.players[0].id;
          io.to(roomId).emit("host_changed", { hostId: room.hostId });
        }
      }
    });
    console.log("disconnected:", socket.id);
  });
});

// serve frontend build in production
app.use(express.static(path.join(__dirname, "client/dist")));
app.get("/{*path}", (_, res) => res.sendFile(path.join(__dirname, "client/dist/index.html")));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
