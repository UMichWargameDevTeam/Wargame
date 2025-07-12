'use client';

import { useEffect, useState } from 'react';

export default function MainMapPage() {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [messages, setMessages] = useState<string[]>([]);
    const [input, setInput] = useState('');

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8000/ws/mainmap/');
        setSocket(ws);

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                setMessages((prev) => [...prev, msg.message]); // 👈 extract "message" key
            } catch (e) {
                console.error('Invalid JSON received:', event.data);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
        };

        return () => {
            ws.close();
        };
    }, []);

    const sendMessage = () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            const payload = JSON.stringify({ message: input });
            socket.send(payload);
            setInput('');
        }
    };

    return (
        <main className="p-4">
            <h1 className="text-xl font-bold mb-4">Main Map - Live Messages</h1>

            <div className="mb-4">
                <input
                    type="text"
                    className="border p-2 mr-2"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <button
                    className="bg-blue-500 text-white px-4 py-2"
                    onClick={sendMessage}
                >
                    Send
                </button>
            </div>

            <div className="border p-2 h-60 overflow-y-scroll">
                {messages.map((msg, index) => (
                    <div key={index} className="mb-1">
                        {msg}
                    </div>
                ))}
            </div>
        </main>
    );
}
