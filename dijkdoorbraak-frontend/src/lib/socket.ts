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

export function disconnectSocket() {
    if (socket?.connected) {
        socket.disconnect();
    }
}