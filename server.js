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

    code +=
      characters[
        Math.floor(
          Math.random() *
          characters.length
        )
      ];

  }

  return code;

}


// ==========================================
// 👤 PLAYER CONNECTION
// ==========================================

wss.on("connection", (socket) => {

  console.log(
    "🎨 Player connected!"
  );

  socket.roomCode = null;
  socket.playerNumber = null;


  // ========================================
  // 📩 RECEIVE MESSAGE
  // ========================================

  socket.on("message", (message) => {

    let data;

    try {

      data =
        JSON.parse(
          message.toString()
        );

    } catch (error) {

      socket.send(
        JSON.stringify({

          type: "error",

          message:
            "Invalid message."

        })
      );

      return;

    }


    // ========================================
    // 🏠 CREATE ROOM
    // ========================================

    if (
      data.type ===
      "createRoom"
    ) {

      let roomCode;

      do {

        roomCode =
          createRoomCode();

      } while (
        rooms[roomCode]
      );


      // Create room

      rooms[roomCode] = {

        players: [],

        // Default: 1 minute

        roundTime: 60

      };


      // If the host selected a time,
      // use that time instead.

      if (
        Number.isFinite(
          Number(data.roundTime)
        )
      ) {

        const requestedTime =
          Number(data.roundTime);


        // Only allow our four
        // official time choices.

        const allowedTimes = [
          30,
          50,
          60,
          120
        ];


        if (
          allowedTimes.includes(
            requestedTime
          )
        ) {

          rooms[roomCode].roundTime =
            requestedTime;

        }

      }


      rooms[roomCode].players.push(
        socket
      );


      socket.roomCode =
        roomCode;

      socket.playerNumber =
        1;


      // Tell host the room was created

      socket.send(
        JSON.stringify({

          type:
            "roomCreated",

          roomCode:
            roomCode,

          playerNumber:
            1,

          roundTime:
            rooms[roomCode]
              .roundTime

        })
      );


      console.log(
        `🏠 Room ${roomCode} created. ` +
        `Round time: ` +
        `${rooms[roomCode].roundTime}s`
      );


      return;

    }


    // ========================================
    // 🚪 JOIN ROOM
    // ========================================

    if (
      data.type ===
      "joinRoom"
    ) {

      const roomCode =
        String(
          data.roomCode || ""
        )
          .trim()
          .toUpperCase();


      const room =
        rooms[roomCode];


      // Room doesn't exist

      if (!room) {

        socket.send(
          JSON.stringify({

            type:
              "error",

            message:
              "Battle not found."

          })
        );

        return;

      }


      // Room is full

      if (
        room.players.length >= 2
      ) {

        socket.send(
          JSON.stringify({

            type:
              "error",

            message:
              "This battle is already full."

          })
        );

        return;

      }


      // Add player

      room.players.push(
        socket
      );


      socket.roomCode =
        roomCode;

      socket.playerNumber =
        2;


      // Tell player 2 they joined

      socket.send(
        JSON.stringify({

          type:
            "roomJoined",

          roomCode:
            roomCode,

          playerNumber:
            2,

          roundTime:
            room.roundTime

        })
      );


      // Tell BOTH players
      // that player 2 joined

      room.players.forEach(
        (player) => {

          player.send(
            JSON.stringify({

              type:
                "playerJoined",

              players:
                room.players.length,

              roundTime:
                room.roundTime

            })
          );

        }
      );


      console.log(
        `⚔️ Player 2 joined ` +
        `room ${roomCode}.`
      );


      return;

    }

  });


  // ==========================================
  // ❌ PLAYER DISCONNECT
  // ==========================================

  socket.on("close", () => {

    console.log(
      "👋 Player disconnected."
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


    // Tell remaining player

    room.players.forEach(
      (player) => {

        player.send(
          JSON.stringify({

            type:
              "playerLeft"

          })
        );

      }
    );


    // Delete empty room

    if (
      room.players.length === 0
    ) {

      delete rooms[roomCode];

      console.log(
        `🗑️ Room ${roomCode} deleted.`
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
      `🎨 Art Fight server ` +
      `running on port ${PORT}`
    );

  }
);
