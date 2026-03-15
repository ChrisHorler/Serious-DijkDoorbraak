import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io(BACKEND_URL, {
            transports: ['websocket'],
            autoConnect: false,
        });
    }
    return socket;
}

export function connectSocket(): Socket {
    const s = getSocket();
    if (!s.connected) s.connect();
    return s;
}

/** Connect as admin — attaches the token so the backend marks this socket as admin. */
export function connectAdminSocket(token: string): Socket {
    // Disconnect and recreate so the auth option is applied fresh.
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    socket = io(BACKEND_URL, {
        transports: ['websocket'],
        autoConnect: false,
        auth: { token },
    });
    socket.connect();
    return socket;
}

export function disconnectSocket() {
    if (socket?.connected) {
        socket.disconnect();
    }
}
