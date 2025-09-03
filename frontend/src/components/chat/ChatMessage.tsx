'use client';

import { Message, RoleInstance } from '@/lib/Types';

interface ChatMessageProps {
    message: Message;
    roleInstance: RoleInstance;
}

export default function ChatMessage({ roleInstance, message }: ChatMessageProps) {
    const isOwnMessage = message.role_instance.user.id === roleInstance.user.id;

    return (
        <div
            className={`flex flex-col mb-2 
                ${isOwnMessage 
                    ? "items-end"
                    : "items-start"
                }
            `}
        >
            {!isOwnMessage && (
                <span className="text-xs text-gray-400">
                    {message.role_instance.role.name}
                </span>
            )}
            <div className="flex items-center gap-2">
                {!isOwnMessage && (
                    <span className="text-lg font-semibold">
                        {message.role_instance.user.username}
                    </span>
                )}
                <span className="text-xs text-gray-400">
                    {new Date(message.timestamp).toLocaleTimeString()}
                </span>
            </div>
            <div
                className={`max-w-xs px-3 py-2 rounded-lg break-words whitespace-pre-wrap
                    ${isOwnMessage
                        ? "bg-blue-600 text-white rounded-br-none self-end"
                        : "bg-neutral-600 text-white rounded-bl-none self-start"
                    }
                `}
            >
                {message.text}
            </div>
        </div>
    );
}