import React, { useState, useRef, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';
import { v4 as uuidv4} from  'uuid'

const socket: Socket = io('http://localhost:3000');

const App: React.FC = () => {
    const [roomId, setRoomId] = useState('');
    const [inRoom, setInRoom] = useState(false);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRefs = useRef<{ [id: string]: HTMLVideoElement }>({});
    const localStream = useRef<MediaStream | null>(null);
    const peers = useRef<{ [id: string]: RTCPeerConnection }>({});
    const [createdRoomId, setCreatedRoomId] = useState(''); // Add this line

    useEffect(() => {
        socket.on('user-joined', (userId: string) => {
            const peerConnection = createPeerConnection(userId);
            peers.current[userId] = peerConnection;

            localStream.current?.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream.current!);
            });

            peerConnection.createOffer().then(offer => {
                peerConnection.setLocalDescription(offer);
                socket.emit('offer', roomId, offer);
            });
        });

        socket.on('offer', async (offer: RTCSessionDescriptionInit, userId: string) => {
            const peerConnection = createPeerConnection(userId);
            peers.current[userId] = peerConnection;

            await peerConnection.setRemoteDescription(offer);

            localStream.current?.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream.current!);
            });

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('answer', roomId, answer);
        });

        socket.on('answer', async (answer: RTCSessionDescriptionInit, userId: string) => {
            const peerConnection = peers.current[userId];
            await peerConnection.setRemoteDescription(answer);
        });

        socket.on('ice-candidate', async (candidate: RTCIceCandidate, userId: string) => {
            const peerConnection = peers.current[userId];
            await peerConnection.addIceCandidate(candidate);
        });

        return () => {
            socket.off('user-joined');
            socket.off('offer');
            socket.off('answer');
            socket.off('ice-candidate');
        };
    }, [roomId]);

    const createPeerConnection = (userId: string): RTCPeerConnection => {
        const peerConnection = new RTCPeerConnection();

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', roomId, event.candidate);
            }
        };

        peerConnection.ontrack = (event) => {
            console.log('Track received:', event); // Log the received track
            if (!remoteVideoRefs.current[userId]) {
                const videoElement = document.createElement('video');
                videoElement.autoplay = true;
                videoElement.style.width = '100%'; // Ensure the video is visible
                videoElement.style.height = 'auto'; // Maintain aspect ratio
                videoElement.style.borderRadius = '8px'; // Add rounded corners
                videoElement.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)'; // Add shadow for depth
                videoElement.style.margin = '10px'; // Add margin for spacing
                videoElement.style.flex = '1'; // Allow video to grow and shrink equally
                videoElement.style.maxWidth = '45%'; // Set a maximum width for each video
                remoteVideoRefs.current[userId] = videoElement;
                document.getElementById('remote-videos')?.append(videoElement);
            }
            remoteVideoRefs.current[userId].srcObject = event.streams[0];
        };

        return peerConnection;
    };

    const handleStartRoom = async () => {
        const newRoomId = uuidv4(); // Generate a new room ID
        setRoomId(newRoomId); // Set the generated room ID
        await initLocalStream();
        socket.emit('join-room', newRoomId); // Use the new room ID
        setInRoom(true);
        setCreatedRoomId(newRoomId); 
        console.log('This is room id', newRoomId);
    };

    const handleJoinRoom = async () => {
        await initLocalStream();
        socket.emit('join-room', roomId);
        setInRoom(true);
    };

    const initLocalStream = async () => {
        localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream.current;
        }
    };

    return (
        <div>
            {inRoom && <div>Welcome to the room!</div>} {/* Conditionally render based on inRoom */}
            <div>
                <input 
                    type="text" 
                    value={roomId} 
                    onChange={(e) => setRoomId(e.target.value)} 
                    placeholder="Enter room ID"
                />
                <button onClick={handleStartRoom}>Start Room</button>
                <button onClick={handleJoinRoom}>Join Room</button>
            </div>
            <div>Room ID: {createdRoomId}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}> {/* Flex container for videos */}
                <video ref={localVideoRef} autoPlay playsInline style={{ flex: '1', maxWidth: '45%', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)', margin: '10px' }} />
                <div id="remote-videos" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}></div>
            </div>
        </div>
    );
};

export default App;
