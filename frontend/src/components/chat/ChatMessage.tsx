'use client';

import { Message, RoleInstance } from '@/lib/Types';

interface ChatMessageProps {
    message: Message;
    roleInstance: RoleInstance
}

export default function ChatMessage({ roleInstance, message }: ChatMessageProps) {

    return (
        <>
            <span>
                <h5 className="text-lg font-semibold">{message.role_instance.user.username}</h5>
                {new Date(message.timestamp).toLocaleTimeString()}
            </span>
            <div>
                {message.text}
            </div>
        </>
    );
}
