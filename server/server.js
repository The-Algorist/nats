const WebSocket = require("ws");
const { connect } = require("nats");

const wss = new WebSocket.Server({ port: 3001 });
const natsUrl = "nats://nats-server:4222"; // Ensure NATS is accessible

async function startServer() {
  let nc;

  try {
    nc = await connect({ servers: natsUrl });
    console.log("Connected to NATS server:", natsUrl);
  } catch (err) {
    console.error("Error connecting to NATS:", err);
    return;
  }

  // WebSocket server listens for incoming connections
  wss.on("connection", (ws) => {
    console.log("New WebSocket client connected");

    ws.on("message", (message) => {
      try {
        const { cameraId, data } = JSON.parse(message);
        console.log(`Received frame from ${cameraId}`);

        if (!cameraId || !data) {
          console.error("Invalid message format: missing cameraId or data");
          return;
        }

        // Publish the video frame data to a specific NATS subject based on the camera ID
        const subject = `video.frames.${cameraId}`;
        const frameData = Buffer.from(data, 'base64');

        // Publish frame data to NATS
        nc.publish(subject, frameData, (err) => {
          if (err) {
            console.error(`Error publishing to NATS: ${err}`);
          } else {
            console.log(`Published frame for ${cameraId} to NATS`);
          }
        });

        // Optionally broadcast the frame to all connected WebSocket clients for the same camera ID
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && client !== ws) {
            client.send(JSON.stringify({ cameraId, data }));
            console.log(`Broadcasting frame for ${cameraId} to WebSocket clients`);
          }
        });

      } catch (err) {
        console.error("Error processing message:", err);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });

  // Subscribe to all camera streams dynamically and forward them to WebSocket clients
  nc.subscribe("video.frames.*", (msg, { subject }) => {
    const cameraId = subject.split(".")[2];
    const base64Data = msg.toString('base64');
    console.log(`Forwarding frame for ${cameraId} to WebSocket clients`);

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ cameraId, data: base64Data }));
      }
    });
  });

  console.log("WebSocket server is running on ws://localhost:3001");
}

// Start the server
startServer().catch(console.error);

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  wss.close();
  if (nc) {
    nc.close();
  }
  process.exit(0);
});
