const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });

  res.end("🎨 Art Fight server is running!");
});

const wss = new WebSocket.Server({
  server
});

wss.on("connection", (socket) => {

  console.log("A player connected!");

  socket.send(
    JSON.stringify({
      type: "welcome",
      message: "🎨 Welcome to Art Fight!"
    })
  );

  socket.on("message", (message) => {

    console.log(
      "Received:",
      message.toString()
    );

  });

  socket.on("close", () => {

    console.log(
      "A player disconnected."
    );

  });

});

server.listen(PORT, () => {

  console.log(
    `🎨 Art Fight server running on port ${PORT}`
  );

});
