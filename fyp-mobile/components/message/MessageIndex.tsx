import getConversationMessages from "@/services/getConversationMessages";
import { getSecureData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { io, Socket } from "socket.io-client";

const PRIMARY = "#780C60";
const PRIMARY_DARK = "#5C0949";
const BG = "#F3E1EC";
const BUBBLE_RECEIVER = "#FFFFFF";
const TICK_BLUE = "#34B7F1";
const SOCKET_URL = "https://eventify-hub.onrender.com";
const FAIL_TIMEOUT_MS = 10000;
const BACK_BTN_SIZE = 36;

// ---------- helpers ----------
// Backend field names have been inconsistent (message/content, timestamp/createdAt,
// senderId as string or populated object) - these getters make the UI resilient
// to any of those shapes instead of crashing / silently failing.
const getMsgText = (m: any) => m?.message ?? m?.content ?? "";
const getMsgTime = (m: any) =>
  m?.timestamp ?? m?.createdAt ?? m?.updatedAt ?? new Date().toISOString();
const getSenderId = (m: any) => {
  const s = m?.senderId ?? m?.sender;
  return typeof s === "object" && s !== null ? s._id : s;
};

const sortDesc = (arr: any[]) =>
  [...arr].sort(
    (a, b) => new Date(getMsgTime(b)).getTime() - new Date(getMsgTime(a)).getTime()
  );

const dedupeById = (arr: any[]) => {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const m of arr) {
    if (!seen.has(m._id)) {
      seen.add(m._id);
      out.push(m);
    }
  }
  return out;
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
};

const dateLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
};

// Builds the array actually fed to the (inverted) FlatList, inserting date
// separators at the right spots. Logic is built in normal chronological
// (oldest -> newest) order first, then reversed once at the end, because
// reasoning about "above/below" is far less error-prone that way than trying
// to insert separators directly into a descending / inverted array.
const buildDisplayData = (messagesDesc: any[]) => {
  const asc = [...messagesDesc].reverse(); // oldest -> newest
  const out: any[] = [];
  let lastDateKey = "";
  for (const msg of asc) {
    const key = new Date(getMsgTime(msg)).toDateString();
    if (key !== lastDateKey) {
      out.push({ _id: `sep-${key}`, __type: "separator", label: dateLabel(getMsgTime(msg)) });
      lastDateKey = key;
    }
    out.push({ ...msg, __type: "message" });
  }
  return out.reverse(); // back to newest -> oldest for inverted list
};

const ChatScreen: React.FC = () => {
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [receiverName, setReceiverName] = useState<string>("Conversation");
  const [loading, setLoading] = useState<boolean>(true);

  const socketRef = useRef<Socket | null>(null);
  // Refs mirror state so socket event handlers (registered once, on mount)
  // always read the LATEST values instead of a stale closure from the first
  // render. This was the root cause of messages getting stuck on
  // "Sending..." until the screen was re-opened: on reconnect, the old code
  // re-joined the room using chatId="" captured at mount time, so the client
  // silently stopped receiving broadcasts for the real room.
  const chatIdRef = useRef<string>("");
  const receiverIdRef = useRef<string>("");
  const userRef = useRef<any>(null);
  const pendingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const router = useRouter();

  const scheduleFailureCheck = useCallback((tempId: string) => {
    if (pendingTimeouts.current[tempId]) clearTimeout(pendingTimeouts.current[tempId]);
    pendingTimeouts.current[tempId] = setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === tempId && (m.status === "sending" || m.status === "sent")
            ? { ...m, status: "failed" }
            : m
        )
      );
      delete pendingTimeouts.current[tempId];
    }, FAIL_TIMEOUT_MS);
  }, []);

  const emitMessage = useCallback(
    (tempId: string, text: string) => {
      const socket = socketRef.current;
      if (!socket || !userRef.current) return;

      if (!socket.connected) {
        // Will be flushed automatically once "connect" fires again.
        setMessages((prev) => prev.map((m) => (m._id === tempId ? { ...m, status: "sending" } : m)));
        return;
      }

      socket.emit("sendMessage", {
        user: userRef.current._id,
        receiverId: receiverIdRef.current,
        chatId: chatIdRef.current,
        content: text,
      });
      // Dispatched over the wire successfully -> single tick.
      setMessages((prev) => prev.map((m) => (m._id === tempId ? { ...m, status: "sent" } : m)));
      scheduleFailureCheck(tempId);
    },
    [scheduleFailureCheck]
  );

  useEffect(() => {
    let isMounted = true;
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      // Always re-join using the CURRENT chatId (via ref), not a stale one.
      if (chatIdRef.current) {
        socket.emit("joinConversation", {
          chatId: chatIdRef.current,
          userId: userRef.current?._id,
        });
      }

      // Flush anything that never made it out because the socket was down.
      setMessages((prev) => {
        const stuck = prev.filter(
          (m) => m.temp && (m.status === "sending" || m.status === "failed")
        );
        stuck.forEach((m) => emitMessage(m._id, getMsgText(m)));
        return prev.map((m) =>
          m.temp && (m.status === "sending" || m.status === "failed")
            ? { ...m, status: "sending" }
            : m
        );
      });
    });

    socket.on("newMessage", (incoming: any) => {
      if (!isMounted) return;
      setMessages((prev) => {
        if (prev.some((m) => m._id === incoming._id)) return prev;

        // Reconcile with an optimistic message we already added locally.
        const matchIndex = prev.findIndex(
          (m) =>
            m.temp &&
            (m.status === "sending" || m.status === "sent") &&
            getSenderId(m) === getSenderId(incoming) &&
            getMsgText(m) === getMsgText(incoming)
        );

        let updated: any[];
        if (matchIndex !== -1) {
          const tempId = prev[matchIndex]._id;
          if (pendingTimeouts.current[tempId]) {
            clearTimeout(pendingTimeouts.current[tempId]);
            delete pendingTimeouts.current[tempId];
          }
          updated = [...prev];
          updated[matchIndex] = { ...incoming, status: "delivered" };
        } else {
          updated = [{ ...incoming, status: "delivered" }, ...prev];
        }
        return sortDesc(dedupeById(updated));
      });
    });

    // Ready for read-receipts once the backend adds them: when the other
    // person opens the chat, it can emit { chatId } here and every one of
    // OUR messages in that chat flips to a blue double tick automatically.
    // Until the backend sends this event, ticks simply stay at "delivered".
    socket.on("messagesSeen", (payload: { chatId?: string }) => {
      if (!isMounted || !payload?.chatId || payload.chatId !== chatIdRef.current) return;
      setMessages((prev) =>
        prev.map((m) =>
          getSenderId(m) === userRef.current?._id && m.status === "delivered"
            ? { ...m, status: "seen" }
            : m
        )
      );
    });

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const rawUser = await getSecureData("user");
        const user = rawUser ? JSON.parse(rawUser) : null;
        if (!user) throw new Error("user not found");
        userRef.current = user;

        const chatIdValue = (await getSecureData("chatId")) || "";
        const rName = (await getSecureData("receiverName")) || "Conversation";
        const rId = (await getSecureData("receiverId")) || "";
        chatIdRef.current = chatIdValue;
        receiverIdRef.current = rId;

        if (!isMounted) return;
        setReceiverName(rName);

        const messagesData = await getConversationMessages(chatIdValue);
        if (!isMounted) return;
        setMessages(
          sortDesc(dedupeById((messagesData || []).map((m: any) => ({ ...m, status: "delivered" }))))
        );

        if (socket.connected) {
          socket.emit("joinConversation", {
            chatId: chatIdValue,
            userId: user._id,
          });
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMessages();

    return () => {
      isMounted = false;
      socket.off("newMessage");
      socket.off("connect");
      socket.off("messagesSeen");
      socket.disconnect();
      Object.values(pendingTimeouts.current).forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed || !userRef.current) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const optimisticMsg = {
      _id: tempId,
      chatId: chatIdRef.current,
      senderId: userRef.current._id,
      message: trimmed,
      content: trimmed,
      timestamp: now,
      createdAt: now,
      temp: true,
      status: "sending" as const,
    };

    setMessages((prev) => sortDesc([optimisticMsg, ...prev]));
    setMessage("");
    emitMessage(tempId, trimmed);
  };

  const handleRetry = (msg: any) => {
    setMessages((prev) =>
      prev.map((m) => (m._id === msg._id ? { ...m, status: "sending", timestamp: new Date().toISOString() } : m))
    );
    emitMessage(msg._id, getMsgText(msg));
  };

  const displayData = buildDisplayData(messages);

  const renderTicks = (item: any) => {
    switch (item.status) {
      case "sending":
        return <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.85)" />;
      case "sent":
        return <Ionicons name="checkmark" size={15} color="rgba(255,255,255,0.85)" />;
      case "seen":
        return <Ionicons name="checkmark-done" size={15} color={TICK_BLUE} />;
      case "delivered":
      default:
        return <Ionicons name="checkmark-done" size={15} color="rgba(255,255,255,0.85)" />;
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    if (item.__type === "separator") {
      return (
        <View style={styles.dateSeparatorWrap}>
          <Text style={styles.dateSeparatorText}>{item.label}</Text>
        </View>
      );
    }

    const isSender = getSenderId(item) === userRef.current?._id;
    const isFailed = item.status === "failed";

    return (
      <View style={[styles.messageRow, isSender ? styles.rowSender : styles.rowReceiver]}>
        <TouchableOpacity
          activeOpacity={isFailed ? 0.6 : 1}
          disabled={!isFailed}
          onPress={() => isFailed && handleRetry(item)}
          style={[
            styles.messageContainer,
            isSender ? styles.senderMessageContainer : styles.receiverMessageContainer,
            isFailed && styles.failedMessageContainer,
          ]}
        >
          <Text style={[styles.messageText, isSender ? styles.senderMessageText : styles.receiverMessageText]}>
            {getMsgText(item)}
          </Text>

          <View style={styles.metaRow}>
            {isFailed ? (
              <>
                <Ionicons name="alert-circle" size={13} color="#B3261E" />
                <Text style={styles.retryText}>Tap to retry</Text>
              </>
            ) : (
              <>
                <Text style={[styles.metaText, isSender ? styles.metaTextSender : styles.metaTextReceiver]}>
                  {formatTime(getMsgTime(item))}
                </Text>
                {isSender && <View style={styles.tickWrap}>{renderTicks(item)}</View>}
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      // The header lives INSIDE this same KeyboardAvoidingView (it isn't a
      // separate native-stack header), so its height is already accounted
      // for in the normal layout flow. Giving a non-zero offset here on top
      // of that double-counts the header height and pushes everything up by
      // that same amount again, which is what produced the big empty pink
      // gap between the input box and the keyboard.
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenterWrap}>
          <View style={styles.headerAvatarCircle}>
            <Text style={styles.headerAvatarInitial}>
              {receiverName?.trim()?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {receiverName}
          </Text>
        </View>
      </View>

      {/* Chat Area */}
      {!loading && messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubble-ellipses-outline" size={40} color={PRIMARY} />
          <Text style={styles.emptyTitle}>Say hi 👋</Text>
          <Text style={styles.emptySubtitle}>No messages yet. Start the conversation below.</Text>
        </View>
      ) : (
        <FlatList
          data={displayData}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          inverted
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Write a message"
          placeholderTextColor="#B3A1B2"
          value={message}
          onChangeText={setMessage}
          multiline
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity
          style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!message.trim()}
        >
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.footerText}>Messages are sent to each guest privately.</Text>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  headerIconBtn: {
    width: BACK_BTN_SIZE,
    height: BACK_BTN_SIZE,
    borderRadius: BACK_BTN_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Takes the remaining space next to the back button and centers its
  // content, with a right margin equal to the back button's width so the
  // avatar+name group is visually centered across the FULL header width
  // (not just the leftover space), now that the 3-dot menu is gone.
  headerCenterWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: BACK_BTN_SIZE,
  },
  headerAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerAvatarInitial: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    maxWidth: 180,
  },
  chatArea: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 12,
  },
  chatContent: {
    paddingVertical: 12,
  },
  dateSeparatorWrap: {
    alignSelf: "center",
    backgroundColor: "rgba(120,12,96,0.10)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginVertical: 10,
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY_DARK,
  },
  messageRow: {
    marginBottom: 6,
    maxWidth: "82%",
  },
  rowSender: {
    alignSelf: "flex-end",
  },
  rowReceiver: {
    alignSelf: "flex-start",
  },
  messageContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 16,
  },
  senderMessageContainer: {
    backgroundColor: PRIMARY,
    borderBottomRightRadius: 4,
  },
  receiverMessageContainer: {
    backgroundColor: BUBBLE_RECEIVER,
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  failedMessageContainer: {
    opacity: 0.65,
  },
  messageText: {
    fontSize: 15.5,
    lineHeight: 21,
  },
  senderMessageText: {
    color: "#fff",
  },
  receiverMessageText: {
    color: "#1A1A1A",
  },
  metaRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  metaText: {
    fontSize: 10.5,
  },
  metaTextSender: {
    color: "rgba(255,255,255,0.75)",
  },
  metaTextReceiver: {
    color: "#9E9E9E",
  },
  tickWrap: {
    marginLeft: 4,
  },
  retryText: {
    fontSize: 11,
    color: "#B3261E",
    marginLeft: 3,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: "#8A8A8A",
    textAlign: "center",
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E6D4E6",
  },
  messageInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#F8F0F4",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#000",
    borderWidth: 1,
    borderColor: "#E6D4E6",
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: PRIMARY,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#C9A9C2",
  },
  footerText: {
    fontSize: 11,
    textAlign: "center",
    color: "#7A7A7A",
    marginVertical: 6,
  },
});

export default ChatScreen;