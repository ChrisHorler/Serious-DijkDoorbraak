import { io } from "socket.io-client";

const scenarioId = "bd3fe2bb-f6c0-4518-9485-b90fd20d7f2c";

console.log("Creating session...");
const sessionRes = await fetch("http://localhost:3001/sessions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ scenarioId }),
});
const session = await sessionRes.json();
console.log("Session created:", session.id, "| Join code:", session.joinCode);

const socket = io("http://localhost:3001", {
  transports: ["websocket"],
});

socket.onAny((event, ...args) => {
  console.log("📨 Raw event received:", event, JSON.stringify(args, null, 2));
});

socket.on("connect", () => {
  console.log("WebSocket connected:", socket.id);

  setTimeout(() => {
    console.log("Joining lobby...");
    socket.emit(
      "join_lobby",
      {
        joinCode: session.joinCode,
        nickname: "TestSpeler",
      },
      (ack) => {
        console.log("join_lobby ack:", JSON.stringify(ack, null, 2));
      },
    );
  }, 500);
});

socket.on("lobby_updated", async (data) => {
  console.log("✅ lobby_updated:", JSON.stringify(data, null, 2));

  const player = data.players[0];
  if (player && player.role === null) {
    console.log("Assigning role Dijkwacht...");
    socket.emit(
      "assign_role",
      {
        playerId: player.id,
        role: "Dijkwacht",
      },
      (ack) => {
        console.log("assign_role ack:", JSON.stringify(ack, null, 2));
      },
    );
  }
});

socket.on("role_assigned", (data) => {
  console.log("✅ role_assigned:", JSON.stringify(data, null, 2));

  console.log("Starting scenario...");
  socket.emit(
    "start_scenario",
    {
      sessionId: session.id,
    },
    (ack) => {
      console.log("start_scenario ack:", JSON.stringify(ack, null, 2));
    },
  );
});

socket.on("scenario_started", (data) => {
  console.log("✅ scenario_started:", JSON.stringify(data, null, 2));
  console.log("Waiting for injects...");
});

socket.on("inject_received", (data) => {
  console.log("✅ inject_received:", JSON.stringify(data, null, 2));
});

socket.on("connect_error", (err) => {
  console.error("❌ Connection error:", err.message);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});

setTimeout(() => {
  console.log("Test complete — disconnecting");
  socket.disconnect();
  process.exit(0);
}, 20000);
