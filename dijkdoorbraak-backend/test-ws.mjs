import { io } from 'socket.io-client';

const scenarioId = 'bd3fe2bb-f6c0-4518-9485-b90fd20d7f2c';

console.log('Creating session...');
const response = await fetch('http://localhost:3001/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenarioId }),
});

const session = await response.json();
console.log('Session created:', session.id, '| Join code:', session.joinCode);

const socket = io('http://localhost:3001', {
  transports: ['websocket'],
});

// Log every single event received
socket.onAny((event, ...args) => {
  console.log('📨 Raw event received:', event, JSON.stringify(args, null, 2));
});

socket.on('connect', () => {
  console.log('WebSocket connected:', socket.id);

  // Small delay to ensure connection is fully established
  setTimeout(() => {
    console.log('Emitting join_lobby...');
    socket.emit('join_lobby', {
      joinCode: session.joinCode,
      nickname: 'TestSpeler',
    }, (ack) => {
      console.log('join_lobby ack:', JSON.stringify(ack, null, 2));
    });
  }, 500);
});

socket.on('lobby_updated', (data) => {
  console.log('✅ lobby_updated:', JSON.stringify(data, null, 2));

  const player = data.players[0];
  if (player) {
    console.log('Assigning role...');
    socket.emit('assign_role', {
      playerId: player.id,
      role: 'Dijkwacht',
    }, (ack) => {
      console.log('assign_role ack:', JSON.stringify(ack, null, 2));
    });
  }
});

socket.on('role_assigned', (data) => {
  console.log('✅ role_assigned:', JSON.stringify(data, null, 2));

  console.log('Starting scenario...');
  socket.emit('start_scenario', {
    sessionId: session.id,
  }, (ack) => {
    console.log('start_scenario ack:', JSON.stringify(ack, null, 2));
  });
});

socket.on('scenario_started', (data) => {
  console.log('✅ scenario_started:', JSON.stringify(data, null, 2));
  console.log('✅ All tests passed!');
  socket.disconnect();
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

setTimeout(() => {
  console.error('❌ Test timed out');
  console.log('Socket connected:', socket.connected);
  console.log('Socket id:', socket.id);
  process.exit(1);
}, 10000);
