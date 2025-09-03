'use client';

import React from 'react';
import { Message, RoleInstance } from '@/lib/Types';

interface ChatMessageProps {
    roleInstance: RoleInstance;
    message: Message;
    previousSender: number | null;
}

export default function ChatMessage({ roleInstance, message, previousSender }: ChatMessageProps) {
    const isOwnMessage = message.role_instance.user.id === roleInstance.user.id;
    const isSameSenderAsPrevious = message.role_instance.user.id === previousSender;

    const timestampText = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

    const timestampStyle: React.CSSProperties = {
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        maxWidth: '6rem',
    };

    return (
        <div
            className={`flex flex-col w-full 
                ${isSameSenderAsPrevious ? 'mt-1' : 'mt-3'} 
                ${isOwnMessage ? 'items-end' : 'items-start'}
            `}
        >
            {!isOwnMessage && !isSameSenderAsPrevious && (
                <div className="mb-1">
                    <p className="text-xs text-gray-400">{message.role_instance.role.name}</p>
                    <p className="font-semibold">{message.role_instance.user.username}</p>
                </div>
            )}

            <div
                className={`flex items-end gap-2 w-full 
                    ${isOwnMessage
                        ? 'justify-end'
                        : 'justify-start'
                    }
                `}
            >
                {isOwnMessage && (
                    <span className="text-xs text-gray-400 flex-shrink-0" style={timestampStyle}>
                        {timestampText}
                    </span>
                )}

                <div
                    className={`px-3 py-2 rounded-lg break-words whitespace-pre-wrap flex-shrink 
                        ${isOwnMessage
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-neutral-600 text-white rounded-bl-none'
                        }
                    `}
                    style={{ maxWidth: '75%' }}
                >
                    {message.text}
                </div>

                {!isOwnMessage && (
                    <span className="text-xs text-gray-400 flex-shrink-0" style={timestampStyle}>
                        {timestampText}
                    </span>
                )}
            </div>
        </div>
    );
}
