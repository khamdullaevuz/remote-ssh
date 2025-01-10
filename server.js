const { Server } = require("ws");
const { Client } = require("ssh2");

const wss = new Server({ port: 8080 });

wss.on("connection", (ws) => {
  const conn = new Client();

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "connect") {
      // Establish SSH connection
      conn
        .on("ready", () => {
          ws.send(
            JSON.stringify({ type: "status", message: "SSH Connection Ready" })
          );

          conn.shell((err, stream) => {
            if (err)
              return ws.send(
                JSON.stringify({ type: "error", message: err.message })
              );

            ws.on("message", (msg) => {
              const { type, payload } = JSON.parse(msg);
              if (type === "command") {
                stream.write(payload);
              }
            });

            stream.on("data", (data) => {
              ws.send(
                JSON.stringify({ type: "data", payload: data.toString() })
              );
            });

            stream.on("close", () => {
              conn.end();
            });
          });
        })
        .connect({
          host: data.host,
          port: 22,
          username: data.username,
          password: data.password,
        });

      conn.on("error", (err) => {
        ws.send(JSON.stringify({ type: "error", message: err.message }));
      });

      conn.on("close", () => {
        ws.send(
          JSON.stringify({ type: "status", message: "SSH Connection Closed" })
        );
      });
    }
  });

  ws.on("close", () => {
    conn.end();
  });
});

console.log("WebSocket server is running on ws://localhost:8080");
