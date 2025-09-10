'use client';

import { Message, RoleInstance } from '@/lib/Types';

interface CommunicationsMessageProps {
    recipientTeamName: string;
    viewerRoleInstance: RoleInstance;
    message: Message;
    previousMessage: Message | null;
}

/**
 * Renders a single chat message for the communications UI.
 *
 * Renders system messages as a centered timestamp + text block. For regular messages it aligns and styles the message bubble based on whether the message is from the viewer, whether the sender is the same as the previous non-system message (controls spacing and header suppression), and whether the message is a cross-team channel (prefixes the role display name with the recipient team). Timestamps are shown in 24-hour `HH:mm` format.
 *
 * @param recipientTeamName - Name of the team/channel receiving the message; used when rendering cross-team role labels.
 * @param viewerRoleInstance - The viewer's RoleInstance (used to determine if a message is from the viewer and the viewer's team).
 * @param message - The Message to render.
 * @param previousMessage - The previous Message in the thread, or null; used to decide whether to collapse repeated sender headers.
 * @returns The message rendered as JSX for the chat UI.
 */
export default function CommunicationsMessage({ recipientTeamName, viewerRoleInstance, message, previousMessage }: CommunicationsMessageProps) {

    const timestampText = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    if (message.type === "system") {
        return (
            <div className="flex flex-col items-center w-full my-2">
                <span className="text-xs text-gray-400 text-center">
                    <p>{timestampText}</p>
                    <p>{message.text}</p>
                </span>
            </div>
        );
    }

    const isViewerMessage = message.sender_role_instance.user.id === viewerRoleInstance.user.id;
    const isSameSenderAsPrevious = message.sender_role_instance.user.id === previousMessage?.sender_role_instance.user.id && previousMessage.type !== "system";

    const isCrossTeamChannel = recipientTeamName != "Gamemasters" && viewerRoleInstance.team_instance.team.name !== recipientTeamName;
    const messageSenderRoleName = message.sender_role_instance.role.name;
    const messageRoleDisplayName = isCrossTeamChannel ? `${recipientTeamName} ${messageSenderRoleName}` : messageSenderRoleName;

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
