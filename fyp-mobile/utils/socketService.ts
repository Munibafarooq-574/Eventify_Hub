// fyp-mobile/utils/socketService.ts


import { io, Socket } from "socket.io-client";

const SOCKET_URL = "https://eventify-hub.onrender.com";

let socket: Socket | null = null;
let currentUserId: string | null = null;

export function connectSocket(): Socket {
  if (socket) return socket;

  socket = io(SOCKET_URL);

  socket.on("connect", () => {
    // Re-announce identity on every (re)connect so the backend's presence
    // map stays correct even after a network drop / app resume.
    if (currentUserId) {
      socket?.emit("registerUser", { userId: currentUserId });
    }
  });

  return socket;
}

/**
 * Tells the backend which user owns this socket. Call this as soon as the
 * user id is known (e.g. right after loading it from secure storage), and
 * again any time it might have changed (login/logout). This is what powers
 * the online/offline presence system.
 */
export function registerUser(userId: string) {
  currentUserId = userId;
  if (socket?.connected) {
    socket.emit("registerUser", { userId });
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  currentUserId = null;
}

export function getSocket(): Socket | null {
  return socket;
}

// ---------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------
// Debounced so we only ever emit "typingStart" once per burst of typing,
// and "typingStop" once ~900ms after the user stops. No event is sent per
// keystroke.

let typingDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let isCurrentlyTyping = false;

export function emitTypingStart(chatId: string, userId: string) {
  if (!socket?.connected || !chatId || !userId) return;

  if (!isCurrentlyTyping) {
    isCurrentlyTyping = true;
    socket.emit("typingStart", { chatId, userId });
  }

  if (typingDebounceTimer) clearTimeout(typingDebounceTimer);
  typingDebounceTimer = setTimeout(() => {
    emitTypingStop(chatId, userId);
  }, 900);
}

export function emitTypingStop(chatId: string, userId: string) {
  if (typingDebounceTimer) {
    clearTimeout(typingDebounceTimer);
    typingDebounceTimer = null;
  }
  if (!isCurrentlyTyping) return;
  isCurrentlyTyping = false;
  socket?.emit("typingStop", { chatId, userId });
}

// ---------------------------------------------------------------------
// Seen receipts
// ---------------------------------------------------------------------
export function emitMessageSeen(conversationId: string, messageIds: string[], userId: string) {
  if (!socket?.connected || !messageIds?.length) return;
  socket.emit("messageSeen", { conversationId, messageIds, userId });
}

// ---------------------------------------------------------------------
// Conversation / message actions
// ---------------------------------------------------------------------
export function joinConversation(chatId: string, userId: string) {
  socket?.emit("joinConversation", { chatId, userId });
}

export function sendChatMessage(payload: {
  user: string;
  receiverId: string;
  chatId: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;       // 🆕 ADD
  videoDurationMs?: number;    // 🆕 ADD
  repliedToMessageId?: string | null;
}) {
  socket?.emit("sendMessage", payload);
}

export function emitDeleteForMe(messageId: string, userId: string) {
  socket?.emit("deleteForMe", { messageId, userId });
}

export function emitDeleteForEveryone(messageId: string, userId: string, chatId: string) {
  socket?.emit("deleteForEveryone", { messageId, userId, chatId });
}

// 🟢 NEW (Pin feature)
// 🟢 NEW (Pin duration feature)
// Keep these values in sync with the backend pin-duration.type.ts.
export type PinDuration = "24h" | "7d" | "30d";
export function emitPinMessage(
  chatId: string,
  messageId: string,
  userId: string,
  duration?: PinDuration
) {
  socket?.emit("pinMessage", {
    chatId,
    messageId,
    userId,
    duration,
  });
}

export function emitUnpinMessage(chatId: string, messageId: string, userId: string) {
  socket?.emit("unpinMessage", { chatId, messageId, userId });
}

// ---------------------------------------------------------------------
// Listeners — each returns an unsubscribe function so callers can clean
// up in a useEffect's return without needing to import `getSocket()`
// separately.
// ---------------------------------------------------------------------
export function onConnect(cb: () => void) {
  socket?.on("connect", cb);
  return () => socket?.off("connect", cb);
}

export function onNewMessage(cb: (msg: any) => void) {
  socket?.on("newMessage", cb);
  return () => socket?.off("newMessage", cb);
}

export function onMessageDeletedForEveryone(cb: (payload: { messageId: string }) => void) {
  socket?.on("messageDeletedForEveryone", cb);
  return () => socket?.off("messageDeletedForEveryone", cb);
}

export function listenTypingStatus(
  cb: (payload: { userId: string; chatId: string; isTyping: boolean }) => void
) {
  socket?.on("typingStatus", cb);
  return () => socket?.off("typingStatus", cb);
}

export function listenPresenceUpdate(
  cb: (payload: { userId: string; isOnline: boolean; lastSeen: string | null }) => void
) {
  socket?.on("presenceUpdated", cb);
  return () => socket?.off("presenceUpdated", cb);
}

export function listenMessageDelivered(
  cb: (payload: {
    messageId: string;
    chatId?: string;
    deliveredAt?: string;
  }) => void
) {
  socket?.on("messageDelivered", cb);
  return () => socket?.off("messageDelivered", cb);
}

export function listenMessageSeen(
  cb: (payload: { chatId: string; seenBy?: string; seenAt?: string; messageIds?: string[] }) => void
) {
  socket?.on("messagesSeen", cb);
  return () => socket?.off("messagesSeen", cb);
}

// 🟢 NEW (Pin feature) — real-time pin/unpin updates for the other
// participant. Registered/cleaned up the same way as every other listener
// above; does not touch typing/presence/delivery/seen listeners.
export function onMessagePinned(
  cb: (payload: {
    chatId: string;
    messageId: string;
    pinnedBy: string;
    pinnedAt?: string | null;
    pinExpiresAt?: string | null;
  }) => void
) {
  socket?.on("messagePinned", cb);

  return () => socket?.off("messagePinned", cb);
}

export function onMessageUnpinned(
  cb: (payload: { chatId: string; messageId: string; unpinnedBy: string }) => void
) {
  socket?.on("messageUnpinned", cb);
  return () => socket?.off("messageUnpinned", cb);
}

export function onPinError(cb: (payload: { messageId: string; error: string }) => void) {
  socket?.on("pinError", cb);
  return () => socket?.off("pinError", cb);
}