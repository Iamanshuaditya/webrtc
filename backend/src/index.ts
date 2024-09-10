import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
      origin: "*"
    }
  });

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', (roomId: string) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-joined', socket.id);
    });

    socket.on('offer', (roomId: string, offer: RTCSessionDescriptionInit) => {
        socket.to(roomId).emit('offer', offer, socket.id);
    });

    socket.on('answer', (roomId: string, answer: RTCSessionDescriptionInit) => {
        socket.to(roomId).emit('answer', answer, socket.id);
    });

    socket.on('ice-candidate', (roomId: string, candidate: RTCIceCandidate) => {
        socket.to(roomId).emit('ice-candidate', candidate, socket.id);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

httpServer.listen(3000, () => {
    console.log('Server is listening on port 3000');
});
