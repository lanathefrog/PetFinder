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

    const wsRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const messagesEndRef = useRef(null);

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
                if (payload.type !== "message") return;

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
            } catch (error) {
                // ignore malformed ws payload
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

    useEffect(() => {
        fetchConversations();
        return () => closeSocket();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeConversationId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

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
                                            {conversation.other_user?.username || "User"}
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
                                        with {activeConversation.other_user?.username || "user"}
                                    </p>
                                </div>
                                <button
                                    className="chat-link-btn"
                                    onClick={() => onOpenAnnouncement?.(activeConversation.announcement_id)}
                                >
                                    Open announcement
                                </button>
                            </div>

                            <div className="chat-messages">
                                {loadingMessages ? (
                                    <p className="messages-muted">Loading messages...</p>
                                ) : messages.length === 0 ? (
                                    <p className="messages-muted">Start the conversation</p>
                                ) : (
                                    messages.map((message) => {
                                        const isOwn = Number(message.sender_id) === currentUserId;
                                        return (
                                            <div
                                                key={message.id}
                                                className={`message-row ${isOwn ? "own" : "other"}`}
                                            >
                                                <div className="message-bubble">
                                                    <p>{message.text}</p>
                                                    <span>{new Date(message.created_at).toLocaleString()}</span>
                                                </div>
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
