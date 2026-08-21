import getConversationMessages from "@/services/getConversationMessages";
import getVendorContactDetails from "@/services/getVendorContactDetails";
import getUserPresence from "@/services/getUserPresence";
import getPinnedMessages from "@/services/getPinnedMessages";
import { getSecureData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import uploadChatImage from "@/services/uploadChatImage";
import { Paths } from "expo-file-system";
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
  Alert,
  ActionSheetIOS,
  Image,
  Modal,
  ScrollView,
  Dimensions,
  Linking,
} from "react-native";
import {
  connectSocket,
  disconnectSocket,
  registerUser,
  joinConversation,
  sendChatMessage,
  emitDeleteForMe,
  emitDeleteForEveryone,
  emitTypingStart,
  emitTypingStop,
  emitMessageSeen,
  emitPinMessage,
  emitUnpinMessage,
  onNewMessage,
  onMessageDeletedForEveryone,
  onMessagePinned,
  onMessageUnpinned,
  listenTypingStatus,
  listenPresenceUpdate,
  listenMessageDelivered,
  listenMessageSeen,
} from "@/utils/socketService";

const PRIMARY = "#780C60";
const PRIMARY_DARK = "#5C0949";
const BG = "#F3E1EC";
const BUBBLE_RECEIVER = "#FFFFFF";
const TICK_BLUE = "#34B7F1";
const FAIL_TIMEOUT_MS = 10000;
const BACK_BTN_SIZE = 36;

// ---------- helpers ----------
// Backend field names have been inconsistent (message/content, timestamp/createdAt,
// senderId as string or populated object) - these getters make the UI resilient
// to any of those shapes instead of crashing / silently failing.
const getMsgText = (m: any) => m?.message ?? m?.content ?? "";
const getMsgImage = (m: any) => m?.imageUrl ?? "";
const getMsgTime = (m: any) =>
  m?.timestamp ?? m?.createdAt ?? m?.updatedAt ?? new Date().toISOString();
const getSenderId = (m: any) => {
  const s = m?.senderId ?? m?.sender;
  return typeof s === "object" && s !== null ? s._id : s;
};

// Normalizes an id whether it arrives as a raw string or a populated
// object ({ _id: ... }) — used for reply/pin comparisons where the same
// field can be either shape depending on where the data came from
// (optimistic snapshot vs. server-populated payload).
const idStr = (id: any): string => {
  if (!id) return "";
  if (typeof id === "object") return String(id._id ?? id.id ?? "");
  return String(id);
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
const deriveStatus = (m: any): "sent" | "delivered" | "seen" => {
  if (m?.seenAt) return "seen";
  if (m?.deliveredAt) return "delivered";
  return "sent";
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

// 🔵 NEW (Phase 7.1) — WhatsApp-style "Online" / "Last seen ..." header text.
const formatPresence = (isOnline: boolean, lastSeen: string | null): string => {
  if (isOnline) return "Online";
  if (!lastSeen) return "";

  const d = new Date(lastSeen);
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const time = formatTime(lastSeen);
  if (sameDay(d, now)) return `Last seen today at ${time}`;
  if (sameDay(d, yesterday)) return `Last seen yesterday at ${time}`;
  return `Last seen ${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })} at ${time}`;
};

// 🟢 NEW (Reply feature) — reads the replied-to reference off a message,
// whichever shape it happens to be in:
//  - populated object from the server (normal case)
//  - a lightweight local snapshot we attach to optimistic messages
//  - null/undefined for ordinary messages (the overwhelming majority)
const getRepliedTo = (m: any) => m?.repliedToMessageId ?? null;

// Safe preview text for a quoted/replied message. Handles the "original
// message no longer exists / was deleted" cases without ever crashing.
const getReplyPreviewText = (r: any) => {
  if (!r) return "Message deleted";
  if (r?.isDeletedForEveryone) return "This message was deleted";
  if (getMsgImage(r)) return "📷 Photo";
  const text = getMsgText(r);
  return text ? text : "Message";
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
  const [uploading, setUploading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactDetails, setContactDetails] = useState<any>(null);
  const [contactLoading, setContactLoading] = useState(false);
  // 🔵 NEW (Phase 7.1)
  const [isReceiverTyping, setIsReceiverTyping] = useState(false);
  const [presence, setPresence] = useState<{ isOnline: boolean; lastSeen: string | null }>({
    isOnline: false,
    lastSeen: null,
  });
  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

  // 🟢 NEW (Reply feature) — message currently being replied to, shown in
  // the composer preview. Null when not replying.
  const [replyingTo, setReplyingTo] = useState<any>(null);

  // 🟢 NEW (Search feature)
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // 🟢 NEW (Pin feature)
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);

  // Briefly highlights a message after jumping to it (from a quoted reply,
  // a search result, or the pinned banner) so the user can actually spot it.
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

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
  const seenMessageIdsRef = useRef<Set<string>>(new Set()); // avoid re-emitting messageSeen for the same id
  const router = useRouter();

  // 🟢 NEW — kept in sync with `messages` so socket callbacks (registered
  // once on mount) and scroll helpers can read the latest list without
  // needing to be re-created every render.
  const messagesRef = useRef<any[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 🟢 NEW — reused by quoted-reply taps, search-result taps, and the
  // pinned banner. Only scrolls within what's already loaded in the
  // existing FlatList/data — no second list is introduced.
  const flatListRef = useRef<FlatList<any>>(null);

  const findMessageIndex = useCallback((messageId: string) => {
    const displayList = buildDisplayData(messagesRef.current);
    return displayList.findIndex((m) => m._id === messageId);
  }, []);

  const scrollToMessage = useCallback(
    (messageId: string) => {
      if (!messageId) return;
      const index = findMessageIndex(messageId);
      if (index === -1) {
        Alert.alert(
          "Message not found",
          "This message isn't available in the current view."
        );
        return;
      }
      try {
        flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.4 });
      } catch {
        // Fall back safely rather than crashing if the list can't resolve
        // the index yet (e.g. still measuring items).
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId((cur) => (cur === messageId ? null : cur));
      }, 1600);
    },
    [findMessageIndex]
  );

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
    (tempId: string, text: string, repliedToMessageId: string | null = null) => {
      if (!userRef.current) return;

      sendChatMessage({
        user: userRef.current._id,
        receiverId: receiverIdRef.current,
        chatId: chatIdRef.current,
        content: text,
        repliedToMessageId: repliedToMessageId || undefined,
      });
      // Dispatched over the wire successfully -> single tick.
      setMessages((prev) => prev.map((m) => (m._id === tempId ? { ...m, status: "sent" } : m)));
      scheduleFailureCheck(tempId);
    },
    [scheduleFailureCheck]
  );

  // Marks any currently-loaded messages from the other person as seen. Only
  // called while this screen is mounted and visible, matching the "only
  // when receiver is currently viewing" requirement.
  const markVisibleMessagesSeen = useCallback((msgs: any[]) => {
    if (!userRef.current || !chatIdRef.current) return;
    const unseenIds = msgs
      .filter(
        (m) =>
          !m.temp &&
          getSenderId(m) !== userRef.current._id &&
          !m.isRead &&
          !seenMessageIdsRef.current.has(m._id)
      )
      .map((m) => m._id);

    if (!unseenIds.length) return;
    unseenIds.forEach((id) => seenMessageIdsRef.current.add(id));
    emitMessageSeen(chatIdRef.current, unseenIds, userRef.current._id);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const socket = connectSocket();

    const handleConnect = () => {
      // Always re-join using the CURRENT chatId (via ref), not a stale one.
      if (chatIdRef.current) {
        joinConversation(chatIdRef.current, userRef.current?._id);
      }

      // Flush anything that never made it out because the socket was down.
      setMessages((prev) => {
        const stuck = prev.filter(
          (m) => m.temp && (m.status === "sending" || m.status === "failed")
        );
        stuck.forEach((m) => {
          const rid = idStr(getRepliedTo(m)) || null;
          emitMessage(m._id, getMsgText(m), rid);
        });
        return prev.map((m) =>
          m.temp && (m.status === "sending" || m.status === "failed")
            ? { ...m, status: "sending" }
            : m
        );
      });
    };
    socket.on("connect", handleConnect);

    const offNewMessage = onNewMessage((incoming: any) => {
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
          updated[matchIndex] = { ...incoming, status: deriveStatus(incoming) };
        } else {
          updated = [{ ...incoming, status: deriveStatus(incoming) }, ...prev];
        }
        return sortDesc(dedupeById(updated));
      });

      // If the incoming message is from the other person and this screen is
      // open right now, immediately mark it seen.
      if (getSenderId(incoming) !== userRef.current?._id) {
        markVisibleMessagesSeen([incoming]);
      }
    });

    const offMessagesSeen = listenMessageSeen((payload) => {
      if (!isMounted || !payload?.chatId || payload.chatId !== chatIdRef.current) return;
      if (!payload.seenBy || payload.seenBy === userRef.current?._id) return;

      setMessages((prev) =>
        prev.map((m) => {
          const isMine = getSenderId(m) === userRef.current?._id;
          if (!isMine) return m;
          // If specific messageIds were included, only flip those; otherwise
          // (join-based event) flip every delivered message from me.
          if (payload.messageIds && payload.messageIds.length) {
            return payload.messageIds.includes(m._id) ? { ...m, status: "seen" } : m;
          }
          return m.status === "delivered" || m.status === "sent" ? { ...m, status: "seen" } : m;
        })
      );
    });

    // 🔵 NEW (Phase 7.1): a message I sent just reached the receiver's device.
    const offDelivered = listenMessageDelivered((payload) => {
  if (!isMounted || !payload?.messageId) return;

  // Ignore delivery events belonging to another conversation.
  if (
    payload.chatId &&
    payload.chatId !== chatIdRef.current
  ) {
    return;
  }

  setMessages((prev) =>
    prev.map((m) =>
      m._id === payload.messageId &&
      (m.status === "sent" || m.status === "sending")
        ? {
            ...m,
            status: "delivered",
            deliveredAt:
              payload.deliveredAt ?? m.deliveredAt,
          }
        : m
    )
  );
});

    // 🔵 NEW (Phase 7.1): typing indicator for the person we're chatting with
    const offTyping = listenTypingStatus((payload) => {
      if (!isMounted) return;
      if (payload.chatId !== chatIdRef.current) return;
      if (payload.userId !== receiverIdRef.current) return;
      setIsReceiverTyping(payload.isTyping);
    });

    // 🔵 NEW (Phase 7.1): live online/offline updates for the receiver
    const offPresence = listenPresenceUpdate((payload) => {
      if (!isMounted) return;
      if (payload.userId !== receiverIdRef.current) return;
      setPresence({ isOnline: payload.isOnline, lastSeen: payload.lastSeen });
    });

    const offDeletedForEveryone = onMessageDeletedForEveryone((payload) => {
      if (!isMounted) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === payload.messageId ? { ...m, isDeletedForEveryone: true } : m
        )
      );
    });

    // 🟢 NEW (Pin feature) — real-time pin/unpin from either participant.
    // Registered/cleaned up alongside every other listener; does not touch
    // typing, presence, delivery, or seen listeners.
    const offMessagePinned = onMessagePinned((payload) => {
      if (!isMounted || payload.chatId !== chatIdRef.current) return;
      setPinnedMessages((prev) => {
        if (prev.some((p) => idStr(p._id) === idStr(payload.messageId))) return prev;
        const found = messagesRef.current.find((m) => m._id === payload.messageId);
        return [...prev, found || { _id: payload.messageId }];
      });
    });

    const offMessageUnpinned = onMessageUnpinned((payload) => {
      if (!isMounted || payload.chatId !== chatIdRef.current) return;
      setPinnedMessages((prev) => prev.filter((p) => idStr(p._id) !== idStr(payload.messageId)));
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

        // Tell the backend who owns this socket (presence) and fetch the
        // receiver's current online/last-seen snapshot.
        registerUser(user._id);
        if (rId) {
          getUserPresence(rId).then((p) => {
            if (isMounted) setPresence(p);
          });
        }

        const messagesData = await getConversationMessages(
          chatIdValue,
          user._id
        );
        if (!isMounted) return;
        const loaded = sortDesc(
  dedupeById((messagesData || []).map((m: any) => ({ ...m, status: deriveStatus(m) })))
);
        setMessages(loaded);
        markVisibleMessagesSeen(loaded);

        // 🟢 NEW (Pin feature) — initial pinned-messages snapshot.
        if (chatIdValue) {
          getPinnedMessages(chatIdValue, user._id)
            .then((pinned) => {
              if (isMounted) setPinnedMessages(pinned || []);
            })
            .catch(() => {
              // Non-fatal — pinned banner just stays empty.
            });
        }

        if (socket.connected) {
          joinConversation(chatIdValue, user._id);
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
      socket.off("connect", handleConnect);
      offNewMessage();
      offMessagesSeen();
      offDelivered();
      offTyping();
      offPresence();
      offDeletedForEveryone();
      offMessagePinned();
      offMessageUnpinned();
      if (chatIdRef.current && userRef.current) {
        emitTypingStop(chatIdRef.current, userRef.current._id);
      }
      Object.values(pendingTimeouts.current).forEach(clearTimeout);
      // NOTE: we intentionally do NOT disconnectSocket() here — the socket
      // is shared app-wide (single instance) and other screens (e.g. the
      // conversation list) may still need it.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔵 NEW (Phase 7.1): typing indicator — debounce lives inside socketService,
  // this just forwards every keystroke to it.
  const handleChangeMessage = (text: string) => {
    setMessage(text);
    if (!userRef.current || !chatIdRef.current) return;

    if (text.trim().length > 0) {
      emitTypingStart(chatIdRef.current, userRef.current._id);
    } else {
      emitTypingStop(chatIdRef.current, userRef.current._id);
    }
  };

  // 🟢 NEW (Reply feature) — builds the small snapshot we attach to
  // optimistic messages so the quoted preview renders instantly, before
  // the server round-trip comes back with the populated version.
  const buildReplySnapshot = (original: any) =>
    original
      ? {
          _id: original._id,
          message: getMsgText(original),
          imageUrl: getMsgImage(original),
          senderId: getSenderId(original),
          isDeletedForEveryone: !!original.isDeletedForEveryone,
        }
      : null;

  const handleSendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed || !userRef.current) return;

    emitTypingStop(chatIdRef.current, userRef.current._id);

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const replySnapshot = buildReplySnapshot(replyingTo);
    const replyId = replyingTo?._id ?? null;

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
      repliedToMessageId: replySnapshot,
    };

    setMessages((prev) => sortDesc([optimisticMsg, ...prev]));
    setMessage("");
    setReplyingTo(null);
    emitMessage(tempId, trimmed, replyId);
  };

  const sendImageMessage = async (imageUri: string) => {
    if (!userRef.current) return;
    setUploading(true);
    const replySnapshot = buildReplySnapshot(replyingTo);
    const replyId = replyingTo?._id ?? null;
    try {
      const remoteUrl = await uploadChatImage(imageUri);

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      const optimisticMsg = {
        _id: tempId,
        chatId: chatIdRef.current,
        senderId: userRef.current._id,
        message: "",
        content: "",
        imageUrl: remoteUrl,
        timestamp: now,
        createdAt: now,
        temp: true,
        status: "sending" as const,
        repliedToMessageId: replySnapshot,
      };

      setMessages((prev) => sortDesc([optimisticMsg, ...prev]));
      setReplyingTo(null);

      sendChatMessage({
        user: userRef.current._id,
        receiverId: receiverIdRef.current,
        chatId: chatIdRef.current,
        content: "",
        imageUrl: remoteUrl,
        repliedToMessageId: replyId || undefined,
      });
      setMessages((prev) => prev.map((m) => (m._id === tempId ? { ...m, status: "sent" } : m)));
      scheduleFailureCheck(tempId);
    } catch (error) {
      Alert.alert("Upload failed", "Could not send image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!viewerUri) return;

    try {
      setDownloading(true);

      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Gallery access is required to save photos."
        );
        return;
      }

      const fileName =
        viewerUri.split("/").pop() || `chat-image-${Date.now()}.jpg`;

      // legacy API me cacheDirectory ek string hoti hai, function nahi
      const localUri = FileSystem.cacheDirectory + fileName;

      const downloadResult = await FileSystem.downloadAsync(
        viewerUri,
        localUri
      );

      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);

      await MediaLibrary.createAlbumAsync("Eventify", asset, false);

      Alert.alert("Saved", "Image saved to your gallery.");
    } catch (error) {
      console.error(error);
      Alert.alert("Download failed", "Could not save the image.");
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenContactDetails = async () => {
    setContactModalVisible(true);
    if (contactDetails) return; // already fetched once, cache use karo

    setContactLoading(true);
    try {
      const data = await getVendorContactDetails(receiverIdRef.current);
      setContactDetails(data);
    } catch (error) {
      setContactDetails(null);
    } finally {
      setContactLoading(false);
    }
  };

  const handleAttachPress = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Gallery"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) openCamera();
          else if (buttonIndex === 2) openGallery();
        }
      );
    } else {
      Alert.alert("Send Photo", "", [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: openCamera },
        { text: "Choose from Gallery", onPress: openGallery },
      ]);
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      sendImageMessage(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Gallery access is required to send photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      sendImageMessage(result.assets[0].uri);
    }
  };

  const handleRetry = (msg: any) => {
    setMessages((prev) =>
      prev.map((m) => (m._id === msg._id ? { ...m, status: "sending", timestamp: new Date().toISOString() } : m))
    );
    const rid = idStr(getRepliedTo(msg)) || null;
    emitMessage(msg._id, getMsgText(msg), rid);
  };

  const handleDeleteForMe = (item: any) => {
    Alert.alert(
      "Delete Message",
      "Delete this message from your device?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setMessages((prev) => prev.filter((m) => m._id !== item._id));
            emitDeleteForMe(item._id, userRef.current._id);
          },
        },
      ]
    );
  };

  const handleDeleteForEveryone = (item: any) => {
    Alert.alert(
      "Delete Message",
      "This message will be deleted for everyone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete for Everyone",
          style: "destructive",
          onPress: () => {
            setMessages((prev) =>
              prev.map((m) =>
                m._id === item._id ? { ...m, isDeletedForEveryone: true } : m
              )
            );
            emitDeleteForEveryone(item._id, userRef.current._id, chatIdRef.current);
          },
        },
      ]
    );
  };

  // 🟢 NEW (Reply feature)
  const handleReplyToMessage = (item: any) => {
    setReplyingTo(item);
  };

  // 🟢 NEW (Pin feature) — optimistic pin/unpin with revert-on-failure via
  // the 'pinError' event (see socketService.onPinError, wired below).
  const isMessagePinned = useCallback(
    (item: any) => pinnedMessages.some((p) => idStr(p._id) === idStr(item._id)),
    [pinnedMessages]
  );

  const handleTogglePin = (item: any) => {
    if (!userRef.current || !chatIdRef.current) return;
    const alreadyPinned = isMessagePinned(item);

    if (alreadyPinned) {
      setPinnedMessages((prev) => prev.filter((p) => idStr(p._id) !== idStr(item._id)));
      emitUnpinMessage(chatIdRef.current, item._id, userRef.current._id);
    } else {
      setPinnedMessages((prev) => [...prev, item]);
      emitPinMessage(chatIdRef.current, item._id, userRef.current._id);
    }
  };

  const handleLongPressMessage = (item: any) => {
    if (item.isDeletedForEveryone || item.temp) return; // deleted ya abhi bhej rahe optimistic msg pe kuch mat karo
    const isSender = getSenderId(item) === userRef.current?._id;
    const pinLabel = isMessagePinned(item) ? "Unpin Message" : "Pin Message";

    if (Platform.OS === "ios") {
      const options = isSender
        ? ["Cancel", "Reply", pinLabel, "Delete for Me", "Delete for Everyone"]
        : ["Cancel", "Reply", pinLabel, "Delete for Me"];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: isSender ? options.length - 1 : undefined,
        },
        (buttonIndex) => {
          const label = options[buttonIndex];
          if (label === "Reply") handleReplyToMessage(item);
          else if (label === pinLabel) handleTogglePin(item);
          else if (label === "Delete for Me") handleDeleteForMe(item);
          else if (label === "Delete for Everyone") handleDeleteForEveryone(item);
        }
      );
    } else {
      const buttons: any[] = [
        { text: "Cancel", style: "cancel" },
        { text: "Reply", onPress: () => handleReplyToMessage(item) },
        { text: pinLabel, onPress: () => handleTogglePin(item) },
        { text: "Delete for Me", onPress: () => handleDeleteForMe(item) },
      ];
      if (isSender) {
        buttons.push({
          text: "Delete for Everyone",
          style: "destructive",
          onPress: () => handleDeleteForEveryone(item),
        });
      }
      Alert.alert("Message Options", "", buttons);
    }
  };

  // 🟢 NEW (Search feature) — searches the already-loaded `messages` array
  // instead of hitting the network on every keystroke. The conversation is
  // fully loaded when the screen opens, so this reuses that data (a
  // conversation-scoped backend search endpoint also exists — see
  // services/searchConversationMessages.ts — for when that assumption no
  // longer holds, e.g. once pagination is introduced).
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchQueryChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    const trimmed = text.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchDebounceRef.current = setTimeout(() => {
      const q = trimmed.toLowerCase();
      const results = messagesRef.current.filter(
        (m) =>
          !m.isDeletedForEveryone &&
          !m.temp &&
          getMsgText(m).toLowerCase().includes(q)
      );
      setSearchResults(sortDesc(results));
      setSearching(false);
    }, 250);
  };

  const closeSearch = () => {
    setSearchMode(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearching(false);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
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
    const repliedTo = getRepliedTo(item);
    const pinned = isMessagePinned(item);
    const isHighlighted = highlightedMessageId === item._id;

    return (
      <View style={[styles.messageRow, isSender ? styles.rowSender : styles.rowReceiver]}>
        <TouchableOpacity
          activeOpacity={isFailed ? 0.6 : 1}
          disabled={item.isDeletedForEveryone}
          onPress={() => isFailed && handleRetry(item)}
          onLongPress={() => handleLongPressMessage(item)}
          delayLongPress={500}
          style={[
            styles.messageContainer,
            isSender
              ? styles.senderMessageContainer
              : styles.receiverMessageContainer,
            isFailed && styles.failedMessageContainer,
            isHighlighted && styles.highlightedMessageContainer,
          ]}
        >
          {item.isDeletedForEveryone ? (
            <View style={styles.deletedRow}>
              <Ionicons
                name="ban-outline"
                size={14}
                color={isSender ? "rgba(255,255,255,0.75)" : "#9E9E9E"}
              />
              <Text
                style={[
                  styles.deletedText,
                  isSender && { color: "rgba(255,255,255,0.75)" },
                ]}
              >
                {isSender ? "You deleted this message" : "This message was deleted"}
              </Text>
            </View>
          ) : (
            <>
              {/* 🟢 NEW (Reply feature) — quoted original message preview */}
              {repliedTo ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => scrollToMessage(idStr(repliedTo))}
                  style={[
                    styles.quotedBox,
                    isSender ? styles.quotedBoxSender : styles.quotedBoxReceiver,
                  ]}
                >
                  <Text
                    style={[styles.quotedSender, isSender && styles.quotedSenderOnDark]}
                    numberOfLines={1}
                  >
                    {idStr(getSenderId(repliedTo)) === idStr(userRef.current?._id)
                      ? "You"
                      : receiverName}
                  </Text>
                  <Text
                    style={[styles.quotedText, isSender && styles.quotedTextOnDark]}
                    numberOfLines={1}
                  >
                    {getReplyPreviewText(repliedTo)}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {getMsgImage(item) ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    setViewerUri(getMsgImage(item));
                    setViewerVisible(true);
                  }}
                  onLongPress={() => handleLongPressMessage(item)}
                  delayLongPress={500}
                >
                  <Image
                    source={{ uri: getMsgImage(item) }}
                    style={styles.chatImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : null}

              {getMsgText(item) ? (
                <Text
                  style={[
                    styles.messageText,
                    isSender ? styles.senderMessageText : styles.receiverMessageText,
                  ]}
                >
                  {getMsgText(item)}
                </Text>
              ) : null}
            </>
          )}

          <View style={styles.metaRow}>
            {isFailed ? (
              <>
                <Ionicons name="alert-circle" size={13} color="#B3261E" />
                <Text style={styles.retryText}>Tap to retry</Text>
              </>
            ) : (
              <>
                {pinned && (
                  <Ionicons
                    name="pin"
                    size={11}
                    color={isSender ? "rgba(255,255,255,0.85)" : PRIMARY}
                    style={{ marginRight: 4 }}
                  />
                )}
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

  // 🔵 NEW (Phase 7.1): header subtitle — typing takes priority over presence
  const headerSubtitle = isReceiverTyping
    ? "typing..."
    : formatPresence(presence.isOnline, presence.lastSeen);

  const latestPinned = pinnedMessages[pinnedMessages.length - 1];

  return (
    <>
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
        {searchMode ? (
          // 🟢 NEW (Search feature) — replaces the normal header while
          // active; the underlying FlatList/messages stay mounted, only
          // this overlay changes.
          <View style={styles.header}>
            <TouchableOpacity onPress={closeSearch} style={styles.headerIconBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Search in conversation"
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={searchQuery}
              onChangeText={handleSearchQueryChange}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => handleSearchQueryChange("")}
                style={styles.searchClearBtn}
              >
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerCenterWrap}
              activeOpacity={0.8}
              onPress={handleOpenContactDetails}
            >
              <View style={styles.headerAvatarCircle}>
                <Text style={styles.headerAvatarInitial}>
                  {receiverName?.trim()?.charAt(0)?.toUpperCase() || "?"}
                </Text>
                {presence.isOnline && <View style={styles.onlineDot} />}
              </View>
              <View style={styles.headerTextCol}>
                <View style={styles.headerNameRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {receiverName}
                  </Text>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color="rgba(255,255,255,0.85)"
                    style={styles.headerInfoIcon}
                  />
                </View>
                {!!headerSubtitle && (
                  <Text
                    style={[
                      styles.headerSubtitleText,
                      isReceiverTyping && styles.headerSubtitleTyping,
                    ]}
                    numberOfLines={1}
                  >
                    {headerSubtitle}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* 🟢 NEW (Search feature) — search entry point in the header */}
            <TouchableOpacity onPress={() => setSearchMode(true)} style={styles.headerIconBtn}>
              <Ionicons name="search" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {searchMode ? (
          // 🟢 NEW (Search feature) — results list. Reuses the existing
          // message data/format; not a second persistent message list.
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item._id}
            style={styles.chatArea}
            contentContainerStyle={{ paddingVertical: 8 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchResultRow}
                onPress={() => {
                  const id = item._id;
                  closeSearch();
                  setTimeout(() => scrollToMessage(id), 80);
                }}
              >
                <Ionicons
                  name="chatbox-ellipses-outline"
                  size={18}
                  color={PRIMARY}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchResultSender}>
                    {getSenderId(item) === userRef.current?._id ? "You" : receiverName}
                  </Text>
                  <Text style={styles.searchResultText} numberOfLines={2}>
                    {getMsgText(item)}
                  </Text>
                  <Text style={styles.searchResultTime}>{formatTime(getMsgTime(item))}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              searchQuery.trim().length === 0 ? null : (
                <Text style={styles.searchEmptyText}>
                  {searching ? "Searching..." : "No messages found"}
                </Text>
              )
            }
          />
        ) : (
          <>
            {/* 🟢 NEW (Pin feature) — banner for the most recently pinned
                message; tapping it scrolls to that message. */}
            {latestPinned && (
              <TouchableOpacity
                style={styles.pinnedBanner}
                activeOpacity={0.85}
                onPress={() => scrollToMessage(idStr(latestPinned._id))}
              >
                <Ionicons name="pin" size={16} color={PRIMARY} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pinnedBannerLabel}>
                    {pinnedMessages.length > 1
                      ? `${pinnedMessages.length} Pinned Messages`
                      : "Pinned Message"}
                  </Text>
                  <Text style={styles.pinnedBannerText} numberOfLines={1}>
                    {getReplyPreviewText(latestPinned)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#B0B0B0" />
              </TouchableOpacity>
            )}

            {/* Chat Area */}
            {!loading && messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-ellipses-outline" size={40} color={PRIMARY} />
                <Text style={styles.emptyTitle}>Say hi 👋</Text>
                <Text style={styles.emptySubtitle}>No messages yet. Start the conversation below.</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={displayData}
                renderItem={renderItem}
                keyExtractor={(item) => item._id}
                style={styles.chatArea}
                contentContainerStyle={styles.chatContent}
                inverted
                showsVerticalScrollIndicator={false}
                onScrollToIndexFailed={(info) => {
                  // Item not measured yet — retry shortly instead of
                  // crashing or silently doing nothing.
                  setTimeout(() => {
                    flatListRef.current?.scrollToIndex({
                      index: info.index,
                      animated: true,
                      viewPosition: 0.4,
                    });
                  }, 250);
                }}
              />
            )}

            {/* 🟢 NEW (Reply feature) — reply preview above composer */}
            {replyingTo && (
              <View style={styles.replyPreviewBar}>
                <View style={styles.replyPreviewAccent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.replyPreviewName} numberOfLines={1}>
                    {getSenderId(replyingTo) === userRef.current?._id ? "You" : receiverName}
                  </Text>
                  <View style={styles.replyPreviewContentRow}>
                    {getMsgImage(replyingTo) ? (
                      <Image
                        source={{ uri: getMsgImage(replyingTo) }}
                        style={styles.replyPreviewThumb}
                      />
                    ) : null}
                    <Text style={styles.replyPreviewText} numberOfLines={1}>
                      {getReplyPreviewText(replyingTo)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setReplyingTo(null)}
                  style={styles.replyPreviewCloseBtn}
                >
                  <Ionicons name="close" size={18} color="#8A8A8A" />
                </TouchableOpacity>
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.attachButton}
                onPress={handleAttachPress}
                disabled={uploading}
              >
                <Ionicons
                  name="camera"
                  size={22}
                  color={PRIMARY}
                />
              </TouchableOpacity>
              <TextInput
                style={styles.messageInput}
                placeholder="Write a message"
                placeholderTextColor="#B3A1B2"
                value={message}
                onChangeText={handleChangeMessage}
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
          </>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewerBackdrop}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity
              style={styles.viewerIconBtn}
              onPress={() => setViewerVisible(false)}
            >
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewerIconBtn}
              onPress={handleDownloadImage}
              disabled={downloading}
            >
              <Ionicons
                name={downloading ? "hourglass-outline" : "download-outline"}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.viewerScrollContent}
            maximumZoomScale={4}
            minimumZoomScale={1}
            pinchGestureEnabled
            centerContent
          >
            {viewerUri && (
              <Image
                source={{ uri: viewerUri }}
                style={{
                  width: SCREEN_W,
                  height: SCREEN_H * 0.8,
                }}
                resizeMode="contain"
              />
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={contactModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.vendorInfoContainer}>
          {/* Header */}
          <View style={styles.vendorInfoHeader}>
            <TouchableOpacity
              onPress={() => setContactModalVisible(false)}
              style={styles.headerIconBtn}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.vendorInfoHeaderTitle}>Vendor Info</Text>
            <View style={{ width: BACK_BTN_SIZE }} />
          </View>

          {contactLoading ? (
            <View style={styles.vendorInfoCenter}>
              <Text style={styles.contactLoadingText}>Loading...</Text>
            </View>
          ) : !contactDetails ? (
            <View style={styles.vendorInfoCenter}>
              <Ionicons name="person-circle-outline" size={56} color="#C9A9C2" />
              <Text style={styles.contactLoadingText}>
                Contact details not available yet.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.vendorInfoScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Profile block */}
              <View style={styles.vendorProfileBlock}>
                {contactDetails.brandLogo ? (
                  <Image
                    source={{ uri: contactDetails.brandLogo }}
                    style={styles.vendorLogoLarge}
                  />
                ) : (
                  <View style={styles.vendorLogoPlaceholder}>
                    <Text style={styles.vendorLogoPlaceholderText}>
                      {contactDetails.brandName?.trim()?.charAt(0)?.toUpperCase() || "?"}
                    </Text>
                  </View>
                )}
                <Text style={styles.vendorBrandNameLarge}>
                  {contactDetails.brandName || receiverName}
                </Text>
                {contactDetails.city ? (
                  <View style={styles.vendorCityPill}>
                    <Ionicons name="location" size={12} color={PRIMARY} />
                    <Text style={styles.vendorCityPillText}>{contactDetails.city}</Text>
                  </View>
                ) : null}
              </View>

              {/* Contact Information card */}
              {(contactDetails.contactNumber || contactDetails.bookingEmail || contactDetails.officialAddress) && (
                <View style={styles.vendorSectionCard}>
                  <Text style={styles.vendorSectionTitle}>Contact Information</Text>

                  {contactDetails.contactNumber ? (
                    <View style={styles.vendorInfoRow}>
                      <View style={styles.vendorInfoIconWrap}>
                        <Ionicons name="call" size={16} color={PRIMARY} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vendorInfoLabel}>Phone</Text>
                        <Text style={styles.vendorInfoValue}>{contactDetails.contactNumber}</Text>
                      </View>
                    </View>
                  ) : null}

                  {contactDetails.bookingEmail ? (
                    <View style={styles.vendorInfoRow}>
                      <View style={styles.vendorInfoIconWrap}>
                        <Ionicons name="mail" size={16} color={PRIMARY} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vendorInfoLabel}>Email</Text>
                        <Text style={styles.vendorInfoValue}>{contactDetails.bookingEmail}</Text>
                      </View>
                    </View>
                  ) : null}

                  {contactDetails.officialAddress ? (
                    <View style={[styles.vendorInfoRow, { borderBottomWidth: 0 }]}>
                      <View style={styles.vendorInfoIconWrap}>
                        <Ionicons name="business" size={16} color={PRIMARY} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vendorInfoLabel}>Address</Text>
                        <Text style={styles.vendorInfoValue}>{contactDetails.officialAddress}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Social & Web */}
              {(contactDetails.instagramLink || contactDetails.facebookLink || contactDetails.website || contactDetails.officialGoogleLink) && (
                <View style={styles.vendorSectionCard}>
                  <Text style={styles.vendorSectionTitle}>Social & Web</Text>
                  <View style={styles.vendorSocialRow}>
                    {contactDetails.instagramLink ? (
                      <TouchableOpacity
                        style={styles.vendorSocialBtn}
                        onPress={() => Linking.openURL(contactDetails.instagramLink)}
                      >
                        <Ionicons name="logo-instagram" size={20} color={PRIMARY} />
                      </TouchableOpacity>
                    ) : null}
                    {contactDetails.facebookLink ? (
                      <TouchableOpacity
                        style={styles.vendorSocialBtn}
                        onPress={() => Linking.openURL(contactDetails.facebookLink)}
                      >
                        <Ionicons name="logo-facebook" size={20} color={PRIMARY} />
                      </TouchableOpacity>
                    ) : null}
                    {contactDetails.website ? (
                      <TouchableOpacity
                        style={styles.vendorSocialBtn}
                        onPress={() => Linking.openURL(contactDetails.website)}
                      >
                        <Ionicons name="globe" size={20} color={PRIMARY} />
                      </TouchableOpacity>
                    ) : null}
                    {contactDetails.officialGoogleLink ? (
                      <TouchableOpacity
                        style={styles.vendorSocialBtn}
                        onPress={() => Linking.openURL(contactDetails.officialGoogleLink)}
                      >
                        <Ionicons name="map" size={20} color={PRIMARY} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              )}

              <View style={{ height: 30 }} />
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  headerTextCol: {
    flexShrink: 1,
  },
  headerNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerInfoIcon: {
    marginLeft: 5,
    marginTop: 1,
  },
  headerSubtitleText: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.75)",
    marginTop: 1,
  },
  headerSubtitleTyping: {
    color: "#D9F2C4",
    fontStyle: "italic",
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
  // Sits between the back button and the search button (both fixed-width),
  // so flex:1 + centered content keeps the avatar+name group visually
  // centered without needing a manual margin hack.
  headerCenterWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
  onlineDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3ED598",
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    maxWidth: 140,
  },
  // 🟢 NEW (Search feature)
  searchInput: {
    flex: 1,
    marginHorizontal: 10,
    color: "#FFFFFF",
    fontSize: 15,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.4)",
  },
  searchClearBtn: {
    padding: 4,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchResultSender: {
    fontSize: 12.5,
    fontWeight: "700",
    color: PRIMARY,
    marginBottom: 2,
  },
  searchResultText: {
    fontSize: 14,
    color: "#333",
  },
  searchResultTime: {
    fontSize: 10.5,
    color: "#9E9E9E",
    marginTop: 3,
  },
  searchEmptyText: {
    textAlign: "center",
    color: "#9E9E9E",
    marginTop: 40,
    fontSize: 13.5,
  },
  // 🟢 NEW (Pin feature)
  pinnedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  pinnedBannerLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: PRIMARY,
  },
  pinnedBannerText: {
    fontSize: 12.5,
    color: "#6A6A6A",
    marginTop: 1,
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
  // 🟢 NEW — brief highlight flash when jumping to a message
  highlightedMessageContainer: {
    borderWidth: 2,
    borderColor: "#F4C94C",
  },
  // 🟢 NEW (Reply feature) — quoted message box inside a bubble
  quotedBox: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6,
  },
  quotedBoxSender: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderLeftColor: "rgba(255,255,255,0.75)",
  },
  quotedBoxReceiver: {
    backgroundColor: "rgba(120,12,96,0.06)",
    borderLeftColor: PRIMARY,
  },
  quotedSender: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
    marginBottom: 1,
  },
  quotedSenderOnDark: {
    color: "#FFFFFF",
  },
  quotedText: {
    fontSize: 12.5,
    color: "#5A5A5A",
  },
  quotedTextOnDark: {
    color: "rgba(255,255,255,0.85)",
  },
  // 🟢 NEW (Reply feature) — reply preview bar above composer
  replyPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E6D4E6",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  replyPreviewAccent: {
    width: 3,
    alignSelf: "stretch",
    backgroundColor: PRIMARY,
    borderRadius: 2,
    marginRight: 10,
  },
  replyPreviewName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: PRIMARY,
  },
  replyPreviewContentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  replyPreviewThumb: {
    width: 28,
    height: 28,
    borderRadius: 4,
    marginRight: 6,
  },
  replyPreviewText: {
    fontSize: 13,
    color: "#6A6A6A",
    flexShrink: 1,
  },
  replyPreviewCloseBtn: {
    padding: 6,
    marginLeft: 6,
  },
  chatImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F0F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E6D4E6",
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
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  viewerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 55 : 30,
    paddingBottom: 10,
  },
  viewerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  deletedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  deletedText: {
    fontStyle: "italic",
    color: "#9E9E9E",
    fontSize: 13,
    marginLeft: 5,
  },
  contactBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  contactCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    maxHeight: "75%",
  },
  contactHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  contactHeaderTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  contactLoadingText: {
    color: "#8A8A8A",
    textAlign: "center",
    paddingVertical: 20,
  },
  contactLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignSelf: "center",
    marginBottom: 10,
  },
  contactBrandName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#780C60",
    textAlign: "center",
    marginBottom: 14,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  contactText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#333",
    flexShrink: 1,
  },
  vendorInfoContainer: {
    flex: 1,
    backgroundColor: BG,
  },
  vendorInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  vendorInfoHeaderTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  vendorInfoCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  vendorInfoScroll: {
    paddingHorizontal: 18,
    paddingTop: 24,
  },
  vendorProfileBlock: {
    alignItems: "center",
    marginBottom: 22,
  },
  vendorLogoLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  vendorLogoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  vendorLogoPlaceholderText: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
  },
  vendorBrandNameLarge: {
    fontSize: 21,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 6,
    textAlign: "center",
  },
  vendorCityPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(120,12,96,0.08)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  vendorCityPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: PRIMARY_DARK,
    marginLeft: 4,
  },
  vendorSectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  vendorSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: PRIMARY,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  vendorInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E4EC",
  },
  vendorInfoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(120,12,96,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  vendorInfoLabel: {
    fontSize: 11,
    color: "#9E9E9E",
    marginBottom: 2,
  },
  vendorInfoValue: {
    fontSize: 14.5,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  vendorSocialRow: {
    flexDirection: "row",
    gap: 12,
  },
  vendorSocialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(120,12,96,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ChatScreen;