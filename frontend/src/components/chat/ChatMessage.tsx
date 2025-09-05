'use client';

import { Message, RoleInstance } from '@/lib/Types';

interface ChatMessageProps {
    destinationTeamName: string;
    viewerRoleInstance: RoleInstance;
    message: Message;
    previousMessage: Message | null;
}

export default function ChatMessage({ destinationTeamName, viewerRoleInstance, message, previousMessage }: ChatMessageProps) {
    const isViewerMessage = message.sender_role_instance.user.id === viewerRoleInstance.user.id;
    const isSameSenderAsPrevious = message.sender_role_instance.user.id === previousMessage?.sender_role_instance.user.id;

    const isCrossTeamChannel = destinationTeamName != "Gamemasters" && viewerRoleInstance.team_instance.team.name !== destinationTeamName;
    const messageSenderRoleName = message.sender_role_instance.role.name;
    const messageRoleDisplayName = isCrossTeamChannel ? `${destinationTeamName} ${messageSenderRoleName}` : messageSenderRoleName;

    const timestampText = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div
            className={`flex flex-col w-full 
                ${isSameSenderAsPrevious ? 'mt-1' : 'mt-3'} 
                ${isViewerMessage ? 'items-end' : 'items-start'}
            `}
        >
            {!isViewerMessage && !isSameSenderAsPrevious && (
                <div className="mb-1">
                    <p className="text-xs text-gray-400">{messageRoleDisplayName}</p>
                    <p className="font-semibold">{message.sender_role_instance.user.username}</p>
                </div>
            )}

            <div
                className={`flex items-end gap-2 w-full 
                    ${isViewerMessage
                        ? 'justify-end'
                        : 'justify-start'
                    }
                `}
            >
                {isViewerMessage && (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                        {timestampText}
                    </span>
                )}

                <div
                    className={`px-3 py-2 rounded-lg break-words whitespace-pre-wrap flex-shrink 
                        ${isViewerMessage
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-neutral-600 text-white rounded-bl-none'
                        }
                    `}
                    style={{ maxWidth: '75%' }}
                >
                    {message.text}
                </div>

                {!isViewerMessage && (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                        {timestampText}
                    </span>
                )}
            </div>
        </div>
    );
}
