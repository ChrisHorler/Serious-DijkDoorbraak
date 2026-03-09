import { io } from 'socket.io-client';

const BASE_URL = 'http://localhost:3001';

// Step 1: Get roles so we can assign by ID
console.log('Fetching roles...');
const rolesRes = await fetch(`${BASE_URL}/roles`);
const roles = await rolesRes.json();
const lcRole = roles.find(r => r.shortName === 'LC');
const lwRole = roles.find(r => r.shortName === 'LW');
console.log(`LC role: ${lcRole.id}`);
console.log(`LW role: ${lwRole.id}`);

// Pick a couple abilities to test with
const lcAbility = lcRole.abilities[0];
const lwAbility = lwRole.abilities[0];
console.log(`LC ability: ${lcAbility.name} (${lcAbility.id})`);
console.log(`LW ability: ${lwAbility.name} (${lwAbility.id})`);

// Step 2: Get or create a scenario
const scenarioId = '03992b19-3a42-4b8c-a967-e27775cfbb31';
console.log('Using scenarioId:', scenarioId);

// Step 3: Create a fresh session
console.log('\nCreating session...');
const sessionRes = await fetch(`${BASE_URL}/sessions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenarioId }),
});
const session = await sessionRes.json();
console.log('Session created:', session.id, '| Join code:', session.joinCode);

// Track player for later use
let joinedPlayer = null;

const socket = io(BASE_URL, {
  transports: ['websocket'],
});

socket.onAny((event, ...args) => {
  console.log('\n📨 Raw event:', event, JSON.stringify(args, null, 2));
});

socket.on('connect', () => {
  console.log('\nWebSocket connected:', socket.id);

  setTimeout(() => {
    console.log('Joining lobby as LC player...');
    socket.emit('join_lobby', {
      joinCode: session.joinCode,
      nickname: 'TestSpeler_LC',
    }, (ack) => {
      console.log('join_lobby ack:', JSON.stringify(ack, null, 2));
      joinedPlayer = ack.player;
    });
  }, 500);
});

socket.on('lobby_updated', (data) => {
  console.log('✅ lobby_updated received');

  const player = data.players.find(p => p.roleId === null);
  if (player) {
    console.log(`Assigning LC role to player ${player.id}...`);
    socket.emit('assign_role', {
      playerId: player.id,
      roleId: lcRole.id,
    }, (ack) => {
      console.log('assign_role ack:', JSON.stringify(ack, null, 2));
    });
  }
});

socket.on('role_assigned', (data) => {
  console.log('✅ role_assigned:', JSON.stringify(data, null, 2));

  console.log('\nStarting scenario...');
  socket.emit('start_scenario', {
    sessionId: session.id,
  }, (ack) => {
    console.log('start_scenario ack:', JSON.stringify(ack, null, 2));
  });
});

socket.on('scenario_started', (data) => {
  console.log('✅ scenario_started');

  // Submit a predefined ability action
  console.log('\nSubmitting predefined ability action...');
  socket.emit('submit_action', {
    playerId: joinedPlayer.id,
    sessionId: session.id,
    abilityId: lcAbility.id,
  }, (ack) => {
    console.log('submit_action (ability) ack:', JSON.stringify(ack, null, 2));
  });

  // Submit a custom action
  setTimeout(() => {
    console.log('\nSubmitting custom action...');
    socket.emit('submit_action', {
      playerId: joinedPlayer.id,
      sessionId: session.id,
      customAction: 'Ik wil een extra vergadering bijeenroepen met alle hulpdiensten op locatie.',
    }, (ack) => {
      console.log('submit_action (custom) ack:', JSON.stringify(ack, null, 2));
    });
  }, 1000);
});

socket.on('action_submitted', (data) => {
  console.log('✅ action_submitted broadcast received');
});

socket.on('inject_received', (data) => {
  console.log('✅ inject_received:', JSON.stringify(data, null, 2));
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

setTimeout(() => {
  console.log('\nTest complete — disconnecting');
  socket.disconnect();
  process.exit(0);
}, 20000);
