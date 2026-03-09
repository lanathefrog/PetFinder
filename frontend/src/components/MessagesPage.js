import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    getChatConversations,
    getConversationMessages,
    markConversationRead,
    sendChatMessageHttp,
} from "../services/api";
import { useToast } from "./ToastContext";
import "../styles/messages.css";

const MessagesPage = ({ initialConversationId = null, onOpenAnnouncement }) => {
    const { showToast } = useToast();
    const currentUserId = Number(localStorage.getItem("user_id"));
    const token = localStorage.getItem("access_token");

    const [loadingConversations, setLoadingConversations] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(initialConversationId);
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [messageText, setMessageText] = useState("");
    const [sending, setSending] = useState(false);
    const [openReactionMenuFor, setOpenReactionMenuFor] = useState(null);
    const [messageReactions, setMessageReactions] = useState({});

    const ReactionIcon = ({ className = '' }) => (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M12 3.1c-.6 0-1.2.2-1.7.6L8 5.9 5.7 6.6c-.9.2-1.5 1-1.5 1.9v4.9c0 .9.6 1.7 1.4 1.9L8 15.6l1.9 2.2c.5.6 1.2.9 1.9.9.7 0 1.4-.3 1.9-.9L16 15.6l1.4-1.3c.8-.2 1.4-1 1.4-1.9V8.5c0-1-.6-1.7-1.5-1.9L16 5.9l-2.3-2.2c-.5-.4-1.1-.6-1.7-.6z" fill="#ff6b4a" />
        </svg>
    );

    const wsRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const messagesEndRef = useRef(null);
    // track previous messages length per conversation to avoid auto-scrolling on initial load
    const prevMessagesLengthByConvRef = useRef({});

    const activeConversation = useMemo(
        () => conversations.find((item) => item.id === activeConversationId) || null,
        [conversations, activeConversationId]
    );

    const sortByActivity = (items) => {
        return [...items].sort((a, b) => {
            const aDate = a?.last_message?.created_at || a?.updated_at || a?.created_at || "";
            const bDate = b?.last_message?.created_at || b?.updated_at || b?.created_at || "";
            return new Date(bDate) - new Date(aDate);
        });
    };

    const updateConversationMeta = (conversationId, metaPatch) => {
        setConversations((prev) =>
            sortByActivity(
                prev.map((item) =>
                    item.id === conversationId
                        ? { ...item, ...metaPatch }
                        : item
                )
            )
        );
    };

    const renderPresenceText = (user) => {
        if (!user) return "Offline";
        if (user.is_online) return "Online";
        if (user.last_seen) {
            const minutes = Math.max(
                1,
                Math.round((Date.now() - new Date(user.last_seen).getTime()) / 60000)
            );
            return `Last seen ${minutes} min ago`;
        }
        return "Offline";
    };

    const fetchConversations = async () => {
        setLoadingConversations(true);
        try {
            const res = await getChatConversations({ page: 1, page_size: 50 });
            const items = res.data?.results || [];
            setConversations(sortByActivity(items));

            if (!activeConversationId && items.length > 0) {
                setActiveConversationId(items[0].id);
            }
        } catch (err) {
            showToast("Failed to load conversations", "error");
        } finally {
            setLoadingConversations(false);
        }
    };

    const fetchMessages = async (conversationId) => {
        if (!conversationId) {
            setMessages([]);
            return;
        }

        setLoadingMessages(true);
        try {
            const res = await getConversationMessages(conversationId, { limit: 50 });
            setMessages(res.data?.results || []);
            await markConversationRead(conversationId);
            updateConversationMeta(conversationId, { unread_count: 0 });
        } catch (err) {
            showToast("Failed to load messages", "error");
        } finally {
            setLoadingMessages(false);
        }
    };

    const closeSocket = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (reconnectTimerRef.current) {
            window.clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    };

    const connectSocket = (conversationId) => {
        closeSocket();
        if (!conversationId || !token) return;

        const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
        const wsUrl = `${wsProtocol}://127.0.0.1:8001/ws/chat/${conversationId}/?token=${token}`;
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onmessage = async (event) => {
            try {
                const payload = JSON.parse(event.data);
                // message events created by server contain 'type': 'message'
                if (payload.type === "message") {
                    const normalizedMessage = {
                        id: payload.id,
                        conversation: payload.conversation_id,
                        sender_id: payload.sender_id,
                        text: payload.text,
                        created_at: payload.created_at,
                    };

                    if (Number(payload.conversation_id) === Number(activeConversationId)) {
                        setMessages((prev) => {
                            if (prev.some((item) => item.id === normalizedMessage.id)) {
                                return prev;
                            }
                            return [...prev, normalizedMessage];
                        });

                        if (payload.sender_id !== currentUserId) {
                            await markConversationRead(payload.conversation_id);
                        }
                        updateConversationMeta(payload.conversation_id, { unread_count: 0 });
                    } else {
                        setConversations((prev) =>
                            sortByActivity(
                                prev.map((item) =>
                                    item.id === payload.conversation_id
                                        ? {
                                            ...item,
                                            unread_count: (item.unread_count || 0) + 1,
                                        }
                                        : item
                                )
                            )
                        );
                        showToast("New message", "info");
                    }

                    setConversations((prev) =>
                        sortByActivity(
                            prev.map((item) =>
                                item.id === payload.conversation_id
                                    ? {
                                        ...item,
                                        last_message: {
                                            id: payload.id,
                                            text: payload.text,
                                            created_at: payload.created_at,
                                            sender_id: payload.sender_id,
                                        },
                                        updated_at: payload.created_at,
                                    }
                                    : item
                            )
                        )
                    );
                }

                // reaction events sent by server are plain objects with message_id, counts, user_reacted
                if (payload && payload.message_id && payload.counts) {
                    const msgId = String(payload.message_id);
                    setMessageReactions((prev) => ({
                        ...prev,
                        [msgId]: {
                            counts: payload.counts || {},
                            user_reacted: payload.user_reacted || [],
                        },
                    }));
                }
            } catch (error) {
                // ignore parsing errors
            }
        };

        socket.onclose = () => {
            reconnectTimerRef.current = window.setTimeout(() => {
                if (Number(activeConversationId) === Number(conversationId)) {
                    connectSocket(conversationId);
                }
            }, 2000);
        };
    };

    const sendMessage = async () => {
        const text = messageText.trim();
        if (!text || !activeConversationId) return;

        setSending(true);
        try {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: "message", text }));
            } else {
                const res = await sendChatMessageHttp(activeConversationId, text);
                const data = res.data;
                const normalizedMessage = {
                    id: data.id,
                    conversation: data.conversation,
                    sender_id: data.sender_id || data.sender?.id,
                    text: data.text,
                    created_at: data.created_at,
                };
                setMessages((prev) => [...prev, normalizedMessage]);
                updateConversationMeta(activeConversationId, {
                    last_message: {
                        id: normalizedMessage.id,
                        text: normalizedMessage.text,
                        created_at: normalizedMessage.created_at,
                        sender_id: normalizedMessage.sender_id,
                    },
                    updated_at: normalizedMessage.created_at,
                });
            }
            setMessageText("");
        } catch (err) {
            showToast("Failed to send message", "error");
        } finally {
            setSending(false);
        }
    };

    const REACTION_KINDS = [
        { kind: 'like', icon: '❤️' },
        { kind: 'helpful', icon: '👍' },
        { kind: 'sad', icon: '😢' },
        { kind: 'laugh', icon: '😂' },
        { kind: 'angry', icon: '😠' },
        { kind: 'surprised', icon: '😮' },
        { kind: 'love', icon: '🥰' },
    ];

    const toggleReaction = (messageId, kind) => {
        const msgId = String(messageId);
        // optimistic update
        setMessageReactions((prev) => {
            const existing = prev[msgId] || { counts: {}, user_reacted: [] };
            const prevKinds = existing.user_reacted || [];
            const prevKind = prevKinds[0] || null;
            const nextCounts = { ...existing.counts };

            if (prevKind === kind) {
                // toggle off
                if (nextCounts[kind]) nextCounts[kind] = Math.max(0, nextCounts[kind] - 1);
                return { ...prev, [msgId]: { counts: nextCounts, user_reacted: [] } };
            }

            // switching to a new kind: decrement previous kind, increment new kind
            if (prevKind) {
                if (nextCounts[prevKind]) nextCounts[prevKind] = Math.max(0, nextCounts[prevKind] - 1);
            }
            nextCounts[kind] = (nextCounts[kind] || 0) + 1;
            return { ...prev, [msgId]: { counts: nextCounts, user_reacted: [kind] } };
        });

        // send via websocket if available
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'reaction', message_id: messageId, kind }));
        }
        setOpenReactionMenuFor(null);
    };

    useEffect(() => {
        fetchConversations();
        const timer = window.setInterval(fetchConversations, 20000);
        return () => {
            window.clearInterval(timer);
            closeSocket();
        };
    }, []);

    useEffect(() => {
        if (initialConversationId) {
            setActiveConversationId(initialConversationId);
        }
    }, [initialConversationId]);

    useEffect(() => {
        if (!activeConversationId) return;
        fetchMessages(activeConversationId);
        connectSocket(activeConversationId);
    }, [activeConversationId]);

    useEffect(() => {
        const convId = String(activeConversationId || '');
        const prev = prevMessagesLengthByConvRef.current[convId] || 0;
        const next = messages?.length || 0;
        // Only auto-scroll when messages length increases after initial load for that conversation
        if (prev > 0 && next > prev) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        // update stored length for this conversation
        prevMessagesLengthByConvRef.current[convId] = next;
    }, [messages, activeConversationId]);

    return (
        <div className="messages-page">
            <div className="messages-layout">
                <aside className="conversations-panel">
                    <div className="messages-panel-header">
                        <h2>Messages</h2>
                    </div>

                    {loadingConversations ? (
                        <p className="messages-muted">Loading conversations...</p>
                    ) : conversations.length === 0 ? (
                        <p className="messages-muted">No conversations yet</p>
                    ) : (
                        <div className="conversations-list">
                            {conversations.map((conversation) => (
                                <button
                                    key={conversation.id}
                                    className={`conversation-item ${conversation.id === activeConversationId ? "active" : ""}`}
                                    onClick={() => setActiveConversationId(conversation.id)}
                                >
                                    <div className="conversation-main">
                                        <div className="conversation-title-row">
                                            <h3>{conversation.announcement_title}</h3>
                                            {conversation.unread_count > 0 && (
                                                <span className="unread-pill">{conversation.unread_count}</span>
                                            )}
                                        </div>
                                        <p className="conversation-meta">
                                            <span style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('openUserProfile', { detail: conversation.other_user?.id })); showToast(`Opening ${conversation.other_user?.username}'s profile`, 'info'); }}>
                                                {conversation.other_user?.username || "User"}
                                            </span>
                                        </p>
                                        <p className="conversation-preview">
                                            {conversation.last_message?.text || "Start the conversation"}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </aside>

                <section className="chat-panel">
                    {!activeConversation ? (
                        <div className="chat-empty">
                            <p>Select a conversation</p>
                        </div>
                    ) : (
                        <>
                            <div className="chat-header">
                                <div>
                                    <h3>{activeConversation.announcement_title}</h3>
                                    <p className="messages-muted">
                                        with <span style={{ cursor: 'pointer' }} onClick={() => { window.dispatchEvent(new CustomEvent('openUserProfile', { detail: activeConversation.other_user?.id })); showToast(`Opening ${activeConversation.other_user?.username}'s profile`, 'info'); }}>{activeConversation.other_user?.username || "user"}</span>
                                    </p>
                                    <p className={`presence-indicator ${activeConversation.other_user?.is_online ? "online" : "offline"}`}>
                                        {activeConversation.other_user?.is_online ? "🟢 " : ""}{renderPresenceText(activeConversation.other_user)}
                                    </p>
                                </div>
                                {activeConversation && activeConversation.announcement_id ? (
                                    <button
                                        className="chat-link-btn"
                                        onClick={() => onOpenAnnouncement?.(activeConversation.announcement_id)}
                                    >
                                        Open announcement
                                    </button>
                                ) : null}
                            </div>

                            <div className="chat-messages">
                                {loadingMessages ? (
                                    <p className="messages-muted">Loading messages...</p>
                                ) : messages.length === 0 ? (
                                    <p className="messages-muted">Start the conversation</p>
                                ) : (
                                    messages.map((message) => {
                                        const isOwn = Number(message.sender_id) === currentUserId;
                                        const actions = (
                                            <div className="message-actions">
                                                <button
                                                    className="reaction-btn"
                                                    onClick={() => setOpenReactionMenuFor(openReactionMenuFor === message.id ? null : message.id)}
                                                    aria-label="Reactions"
                                                >
                                                    {(() => {
                                                        const info = messageReactions[String(message.id)];
                                                        const userKind = info?.user_reacted?.[0];
                                                        if (userKind) {
                                                            const kindDef = REACTION_KINDS.find(r => r.kind === userKind);
                                                            return (
                                                                <>
                                                                    <span className="emoji-selected">{kindDef?.icon || '❤️'}</span>
                                                                </>
                                                            );
                                                        }
                                                        const total = info ? Object.values(info.counts || {}).reduce((a,b)=>a+b,0) : 0;
                                                        return (
                                                            <>
                                                                <ReactionIcon className="reaction-icon" />
                                                                {total > 0 && <span className="reaction-count">{total}</span>}
                                                            </>
                                                        );
                                                    })()}
                                                </button>

                                                {openReactionMenuFor === message.id && (
                                                    <div className="reaction-menu">
                                                        {REACTION_KINDS.map((r) => (
                                                            <button
                                                                key={r.kind}
                                                                className={`reaction-item ${messageReactions[String(message.id)]?.user_reacted?.includes(r.kind) ? 'selected' : ''}`}
                                                                onClick={() => toggleReaction(message.id, r.kind)}
                                                            >
                                                                <span className="emoji">{r.icon}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );

                                        return (
                                            <div
                                                key={message.id}
                                                className={`message-row ${isOwn ? "own" : "other"}`}
                                            >
                                                {isOwn && actions}
                                                <div className="message-bubble">
                                                    <p>{message.text}</p>
                                                    <span>{new Date(message.created_at).toLocaleString()}</span>
                                                </div>
                                                {!isOwn && actions}
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="chat-input-row">
                                <input
                                    type="text"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder="Type a message..."
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            sendMessage();
                                        }
                                    }}
                                />
                                <button
                                    className="chat-send-btn"
                                    onClick={sendMessage}
                                    disabled={sending}
                                >
                                    Send
                                </button>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
};

export default MessagesPage;
