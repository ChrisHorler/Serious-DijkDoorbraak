import { io } from 'socket.io-client';

const BASE_URL = 'http://localhost:3001';

const sessionIdArg = process.argv[2];
const scenarioIdArg = process.argv[3];

console.log('Fetching roles...');
const rolesRes = await fetch(`${BASE_URL}/roles`);
const roles = await rolesRes.json();
const lcRole = roles.find(r => r.shortName === 'LC');
const lcAbility = lcRole.abilities[0];
console.log(`LC role: ${lcRole.id}`);
console.log(`LC ability: ${lcAbility.name} (${lcAbility.id})`);

let sessionId, joinCode;

if (sessionIdArg) {
  sessionId = sessionIdArg;
  const sessionRes = await fetch(`${BASE_URL}/sessions/${sessionId}`);
  const session = await sessionRes.json();
  joinCode = session.joinCode;
  console.log(`Using existing session: ${sessionId} | Join code: ${joinCode}`);
} else if (scenarioIdArg) {
  const sessionRes = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId: scenarioIdArg }),
  });
  const session = await sessionRes.json();
  sessionId = session.id;
  joinCode = session.joinCode;
  console.log(`Created session: ${sessionId} | Join code: ${joinCode}`);
} else {
  console.error('Usage: node test-ws.mjs [sessionId] OR node test-ws.mjs "" <scenarioId>');
  console.error('Example: node test-ws.mjs "" bd3fe2bb-f6c0-4518-9485-b90fd20d7f2c');
  process.exit(1);
}

let joinedPlayer = null;

const socket = io(BASE_URL, { transports: ['websocket'] });

socket.onAny((event, ...args) => {
  console.log('\n📨 Event:', event, JSON.stringify(args, null, 2));
});

socket.on('connect', () => {
  console.log('\nWebSocket connected:', socket.id);
  console.log(`\n👉 Join code: ${joinCode}`);
  console.log('Go to http://localhost:3002/player/join and enter the join code now.');
  console.log('Waiting 10 seconds...\n');

  setTimeout(() => {
    console.log('Joining lobby as Admin_TestSpeler...');
    socket.emit('join_lobby', { joinCode, nickname: 'Admin_TestSpeler' }, (ack) => {
      console.log('join_lobby ack:', JSON.stringify(ack, null, 2));
      joinedPlayer = ack.player;
    });
  }, 10000);
});

socket.on('lobby_updated', (data) => {
  const player = data.players.find(p => p.roleId === null);
  if (player) {
    console.log(`Assigning LC role to player ${player.id}...`);
    socket.emit('assign_role', { playerId: player.id, roleId: lcRole.id }, (ack) => {
      console.log('assign_role ack:', JSON.stringify(ack, null, 2));
    });
  }
});

socket.on('role_assigned', () => {
  console.log('✅ role_assigned — starting scenario in 3 seconds...');
  setTimeout(() => {
    socket.emit('start_scenario', { sessionId }, (ack) => {
      console.log('start_scenario ack:', JSON.stringify(ack, null, 2));
    });
  }, 3000);
});

socket.on('scenario_started', () => {
  console.log('✅ scenario_started');
  setTimeout(() => {
    console.log('Submitting ability action...');
    socket.emit('submit_action', {
      playerId: joinedPlayer?.id,
      sessionId,
      abilityId: lcAbility.id,
    }, (ack) => {
      console.log('submit_action ack:', JSON.stringify(ack, null, 2));
    });
  }, 1000);
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
});

setTimeout(() => {
  console.log('\nTest complete — disconnecting');
  socket.disconnect();
  process.exit(0);
}, 35000);
