const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;

// ==========================================
// 🎨 ART FIGHT SERVER
// ==========================================

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });

  res.end("🎨 Art Fight server is running!");
});

const wss = new WebSocket.Server({
  server
});


// ==========================================
// 🏠 BATTLE ROOMS
// ==========================================

const rooms = {};


// ==========================================
// 🔤 CREATE BATTLE CODE
// ==========================================

function createRoomCode() {

  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 5; i++) {

    code += characters[
      Math.floor(
        Math.random() * characters.length
      )
    ];

  }

  return code;
}


// ==========================================
// 📤 SEND MESSAGE
// ==========================================

function send(player, data) {

  if (
    player &&
    player.readyState === WebSocket.OPEN
  ) {

    player.send(
      JSON.stringify(data)
    );

  }

}


// ==========================================
// 📤 BROADCAST TO ROOM
// ==========================================

function broadcast(room, data) {

  if (!room) {
    return;
  }

  room.players.forEach((player) => {
    send(player, data);
  });

}


// ==========================================
// 👤 PLAYER CONNECTION
// ==========================================

wss.on("connection", (socket) => {

  console.log("🎨 Player connected!");

  socket.roomCode = null;
  socket.playerNumber = null;
  socket.isHost = false;


  // ========================================
  // 📩 RECEIVE MESSAGE
  // ========================================

  socket.on("message", (message) => {

    let data;

    try {

      data = JSON.parse(
        message.toString()
      );

    } catch (error) {

      send(socket, {
        type: "error",
        message: "Invalid message."
      });

      return;

    }


    console.log("📩 Received:", data);


    // ======================================
    // 🏠 CREATE ROOM
    // ======================================

    if (data.type === "createRoom") {

      let roomCode;

      do {

        roomCode = createRoomCode();

      } while (rooms[roomCode]);


      rooms[roomCode] = {

        players: [],

        roundTime: 60,

        battleStarted: false,

        currentRound: 1,

        totalRounds: 3

      };


      const room = rooms[roomCode];

      room.players.push(socket);

      socket.roomCode = roomCode;
      socket.playerNumber = 1;
      socket.isHost = true;


      send(socket, {

        type: "roomCreated",

        roomCode: roomCode,

        playerNumber: 1,

        roundTime: room.roundTime,

        currentRound: 1,

        totalRounds: 3

      });


      console.log(
        `🏠 Room ${roomCode} created.`
      );

      return;

    }


    // ======================================
    // 🚪 JOIN ROOM
    // ======================================

    if (data.type === "joinRoom") {

      const roomCode =
        String(data.roomCode || "")
          .trim()
          .toUpperCase();


      const room = rooms[roomCode];


      if (!room) {

        send(socket, {

          type: "error",

          message: "Battle not found."

        });

        return;

      }


      if (room.players.length >= 2) {

        send(socket, {

          type: "error",

          message: "This battle is already full."

        });

        return;

      }


      if (room.battleStarted) {

        send(socket, {

          type: "error",

          message: "This battle has already started."

        });

        return;

      }


      room.players.push(socket);

      socket.roomCode = roomCode;
      socket.playerNumber = 2;
      socket.isHost = false;


      send(socket, {

        type: "roomJoined",

        roomCode: roomCode,

        playerNumber: 2,

        roundTime: room.roundTime,

        currentRound: room.currentRound,

        totalRounds: room.totalRounds

      });


      broadcast(room, {

        type: "playerJoined",

        players: room.players.length,

        roundTime: room.roundTime

      });


      console.log(
        `🚪 Player 2 joined room ${roomCode}.`
      );

      return;

    }


    // ======================================
    // ⏱️ HOST CHANGES ROUND TIME
    // ======================================

    if (data.type === "setRoundTime") {

      const room =
        rooms[socket.roomCode];


      if (!room) {
        return;
      }


      if (!socket.isHost) {

        send(socket, {

          type: "error",

          message:
            "Only the host can change the round time."

        });

        return;

      }


      if (room.battleStarted) {
        return;
      }


      const allowedTimes = [
        30,
        50,
        60,
        120
      ];


      const newTime =
        Number(data.roundTime);


      if (
        !allowedTimes.includes(newTime)
      ) {

        send(socket, {

          type: "error",

          message: "Invalid round time."

        });

        return;

      }


      room.roundTime = newTime;


      broadcast(room, {

        type: "roundTimeChanged",

        roundTime: room.roundTime

      });


      console.log(
        `⏱️ Room ${socket.roomCode} time changed to ${newTime} seconds.`
      );

      return;

    }


    // ======================================
    // ⚔️ HOST STARTS BATTLE
    // ======================================

    if (data.type === "startBattle") {

      const room =
        rooms[socket.roomCode];


      if (!room) {

        send(socket, {

          type: "error",

          message: "Battle room not found."

        });

        return;

      }


      if (!socket.isHost) {

        send(socket, {

          type: "error",

          message:
            "Only the host can start the battle."

        });

        return;

      }


      if (room.players.length < 2) {

        send(socket, {

          type: "error",

          message:
            "Waiting for your opponent to join."

        });

        return;

      }


      if (room.battleStarted) {
        return;
      }


      room.battleStarted = true;
      room.currentRound = 1;


      console.log(
        `⚔️ Battle ${socket.roomCode} started!`
      );


      broadcast(room, {

        type: "battleStarted",

        roundTime: room.roundTime,

        round: room.currentRound,

        totalRounds: room.totalRounds

      });


      return;

    }


    // ======================================
    // 🎨 PLAYER SUBMITS ARTWORK
    // ======================================

    if (data.type === "submitArtwork") {

      const room =
        rooms[socket.roomCode];


      if (!room || !room.battleStarted) {
        return;
      }


      socket.submittedRound =
        room.currentRound;


      console.log(
        `🎨 Player ${socket.playerNumber} submitted round ${room.currentRound}.`
      );


      broadcast(room, {

        type: "playerSubmitted",

        playerNumber:
          socket.playerNumber,

        round:
          room.currentRound

      });


      return;

    }


    // ======================================
    // ➡️ HOST ADVANCES ROUND
    // ======================================

    if (data.type === "nextRound") {

      const room =
        rooms[socket.roomCode];


      if (!room) {
        return;
      }


      // ONLY HOST CAN ADVANCE.

      if (!socket.isHost) {

        send(socket, {

          type: "error",

          message:
            "Only the host can advance the battle."

        });

        return;

      }


      if (!room.battleStarted) {
        return;
      }


      // Make sure both players submitted.

      const allSubmitted =
        room.players.length >= 2 &&
        room.players.every(
          (player) =>
            player.submittedRound ===
            room.currentRound
        );


      if (!allSubmitted) {

        send(socket, {

          type: "error",

          message:
            "Both players must submit their artwork before continuing."

        });

        return;

      }


      // Final round is finished.

      if (
        room.currentRound >=
        room.totalRounds
      ) {

        room.battleStarted = false;


        broadcast(room, {

          type: "battleFinished"

        });


        console.log(
          `🏆 Battle ${socket.roomCode} finished.`
        );


        return;

      }


      room.currentRound++;


      // Reset submission status.

      room.players.forEach(
        (player) => {

          player.submittedRound = null;

        }
      );


      console.log(
        `➡️ Room ${socket.roomCode} advancing to round ${room.currentRound}.`
      );


      // Tell BOTH players to begin
      // the exact same new round.

      broadcast(room, {

        type: "nextRoundStarted",

        round:
          room.currentRound,

        roundTime:
          room.roundTime,

        totalRounds:
          room.totalRounds

      });


      return;

    }


    // ======================================
    // ❓ UNKNOWN MESSAGE
    // ======================================

    send(socket, {

      type: "error",

      message: "Unknown message type."

    });

  });


  // ========================================
  // ❌ PLAYER DISCONNECT
  // ========================================

  socket.on("close", () => {

    console.log(
      "🔴 Player disconnected."
    );


    const roomCode =
      socket.roomCode;


    if (!roomCode) {
      return;
    }


    const room =
      rooms[roomCode];


    if (!room) {
      return;
    }


    room.players =
      room.players.filter(
        (player) =>
          player !== socket
      );


    broadcast(room, {

      type: "playerLeft"

    });


    if (room.players.length === 0) {

      delete rooms[roomCode];


      console.log(
        `🗑️ Room ${roomCode} deleted.`
      );

    }

    else {

      console.log(
        `👤 Room ${roomCode} still has a player.`
      );

    }

  });

});


// ==========================================
// 🚀 START SERVER
// ==========================================

server.listen(
  PORT,
  () => {

    console.log(
      `🎨 Art Fight server running on port ${PORT}`
    );

  }
);
