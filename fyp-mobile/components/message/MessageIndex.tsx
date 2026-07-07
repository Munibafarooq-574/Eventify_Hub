import getConversationMessages from "@/services/getConversationMessages";
import { getSecureData } from "@/store";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { io } from "socket.io-client"; // Import socket.io client

const ChatScreen: React.FC = () => {
    const [message, setMessage] = useState<string>("");
    const [messages, setMessages] = useState<any[]>([]);
    const [loggedInUser, setLoggedInUser] = useState<any>();
    const [chatId, setChatId] = useState<string>("chatId_here"); // Get chatId dynamically
    const [socketObj, setSocketObj] = useState<any>();
    const router = useRouter();

    useEffect(() => {
        // Fetch the messages for the conversation when the component mounts
        const fetchMessages = async () => {
            try {
                const user = JSON.parse(await getSecureData("user") || "");
                if (!user) {
                    throw "user not found";
                }
                setLoggedInUser(user);
                const chatIdValue = await getSecureData("chatId") || "";
                const messagesData = await getConversationMessages(chatIdValue); // API to fetch messages
                console.log("messagesData", messagesData);
                setChatId(chatIdValue);
                setMessages(messagesData);
            } catch (error) {
                console.error("Error fetching messages:", error);
            }
        };

        fetchMessages();

        // Initialize WebSocket connection
        const socket = io("http://13.233.214.252:3000"); // Replace with your server URL
        socket.emit("joinConversation", chatId); // Join the conversation room

        // Listen for incoming messages
        socket.on("newMessage", (newMessage) => {
            setMessages((prevMessages) => [newMessage, ...prevMessages]);
        });

        setSocketObj(socket);

        // Cleanup on component unmount
        return () => {
            socket.disconnect();
        };
    }, [chatId]);

    const handleSendMessage = async () => {
        if (message.trim()) {
            const user = JSON.parse(await getSecureData("user") || "");
            if (!user) {
                throw "user not found";
            }
            const userId = user._id; // Replace with actual userId
            console.log("userId", userId, "chatId", chatId, "message", message);

            // Send the message via WebSocket to the server
            socketObj.emit("sendMessage", {
                user: userId,
                chatId,
                content: message,
            });

            // Optionally, add the sent message to the local state immediately for instant feedback
            // setMessages((prevMessages) => [...prevMessages, { message, senderId: userId }]);

            setMessage(""); // Clear the input field
        }
    };

    const renderMessage = ({ item }: { item: any }) => {
        // Determine if the message is from the sender or the receiver
        const isSender = item.senderId === loggedInUser._id; // Replace with the actual userId

        return (
            <View
                style={[
                    styles.messageContainer,
                    isSender ? styles.senderMessageContainer : styles.receiverMessageContainer,
                ]}
            >
                <Text
                    style={[
                        styles.messageText,
                        isSender ? styles.senderMessageText : styles.receiverMessageText,
                    ]}
                >
                    {item.message}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"} // Adjust for iOS and Android
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backArrow}>{"<"}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Conversation</Text>
                <TouchableOpacity>
                    <Text style={styles.optionsMenu}>{"⋮"}</Text>
                </TouchableOpacity>
            </View>

            {/* Chat Area */}
            <FlatList
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item, index) => item._id || index.toString()} // Use _id or index as the key
                style={styles.chatArea}
                contentContainerStyle={styles.chatContent}
                inverted // To display the most recent message at the bottom
            />

            {/* Footer */}
            <View style={styles.footer}>
                <TextInput
                    style={styles.messageInput}
                    placeholder="Write a message"
                    placeholderTextColor="#B3A1B2"
                    value={message}
                    onChangeText={setMessage}
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                    <Text style={styles.sendButtonText}>{">"}</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.footerText}>Messages are sent to each guest privately.</Text>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8EAF2",
        paddingTop: 70,
        paddingBottom: 20,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E6D4E6",
    },
    backArrow: {
        fontSize: 20,
        color: "#7A7A7A",
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#000",
    },
    optionsMenu: {
        fontSize: 20,
        color: "#7A7A7A",
    },
    chatArea: {
        flex: 1,
        backgroundColor: "#F8EAF2",
        padding: 16,
    },
    chatContent: {
        paddingBottom: 16,
    },
    messageContainer: {
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
        maxWidth: "80%",
    },
    senderMessageContainer: {
        backgroundColor: "#7B2869", // Sender message background color
        alignSelf: "flex-end", // Align sender messages to the right
    },
    receiverMessageContainer: {
        backgroundColor: "#FFFFFF", // Receiver message background color
        alignSelf: "flex-start", // Align receiver messages to the left
    },
    messageText: {
        fontSize: 16,
        color: "#000",
    },
    senderMessageText: {
        color: "#fff", // White text for the sender's message
    },
    receiverMessageText: {
        color: "#000", // Black text for the receiver's message
    },
    footer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E6D4E6",
    },
    messageInput: {
        flex: 1,
        height: 40,
        backgroundColor: "#F8F0F4",
        borderRadius: 20,
        paddingHorizontal: 12,
        fontSize: 14,
        color: "#000",
        borderWidth: 1,
        borderColor: "#E6D4E6",
    },
    sendButton: {
        marginLeft: 8,
        backgroundColor: "#7B2869",
        borderRadius: 20,
        padding: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    sendButtonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "bold",
    },
    footerText: {
        fontSize: 12,
        textAlign: "center",
        color: "#7A7A7A",
        marginVertical: 8,
    },
});

export default ChatScreen;
