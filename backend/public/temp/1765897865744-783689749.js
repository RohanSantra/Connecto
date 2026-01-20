import { Server } from "socket.io";
import User from "../models/User";
import Message from "../models/Message";
import { useCallback } from "react";


const onlineUsers = new Map();
const typingUsers = new Map();

export function initializeSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        },
        pingTimeout: 60000, //Disconnect incative users or sockets after 60s
    });


    io.on("connection", (socket) => {
        console.log(`User connected : ${socket.id}`);
        let userId = null;


        socket.on("user_connected", async (connectingUserId) => {
            try {
                userId = connectingUserId;
                onlineUsers.Map(userId, socket.id);
                socket.join(userId);

                await User.findByIdAndUpdate(userId, {
                    isOnline: true,
                    lastSeen: new Date()
                })

                io.emit("user_status", { userId, isOnline: true })
            } catch (error) {
                console.error("Error handling user connection", error);
            }
        })


        socket.on("get_user_status", (requestedUserId, callback) => {
            const isOnline = onlineUsers.has(requestedUserId)
            callback({
                userId: requestedUserId,
                isOnline,
                lastSeen: isOnline ? new Date() : null
            })
        })

        // Forward message to receiver if online
        socket.on("send_message", async (message) => {
            try {
                const receiverSocketId = onlineUsers.get(message.receiver?._id);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("receive_message", message)
                }
            } catch (error) {
                console.error("Error sending msg", error);
                socket.emit("message_error", { error: "Error sending msg" });
            }
        })


        socket.on("message_read", async ({ messageId, senderId }) => {
            try {
                await Message.updateMany(
                    { _id: { $in: messageId } },
                    { $set: { messageStatus: "read" } }
                )
                const senderSocketId = onlineUsers.get(senderId);
                if (senderSocketId) {
                    messageId.forEach((messageId) => {
                        io.to(senderSocketId).emit("message_status_update", {
                            messageId,
                            messageStatus: read
                        })
                    })
                }
            } catch (error) {
                console.error("Error updating message read ", error);
            }
        })

        socket.on("typing_start", ({ conversationId, receiverId }) => {
            if (!userId || !conversationId || !receiverId) return;

            if (!typingUsers.has(userId)) typingUsers.set(userId, {});

            const userTyping = typingUsers.get(userId)

            userTyping(conversationId) = true;

            if (userTyping[`${conversationId}_timeout`]) {
                clearTimeout(userTyping[`${conversationId}_timeout`])
            }

            userTyping[`${conversationId}_timeout`] = setTimeout(() => {
                userTyping[`${conversationId}_timeout`] = false;
                socket.io(receiverId).emit("user_typing", {
                    userId,
                    conversationId,
                    isTyping: false
                })
            }, 3000)


            socket.to(receiverId).emit("user_typing", {
                userId,
                conversationId,
                isTyping: true
            })
        })

        socket.on("typing_stop", ({ conversationId, receiverId }) => {
            if (!userId || !conversationId || !receiverId) return;

            if (!typingUsers.has(userId)) {
                const userTyping = typingUsers.get(userId);
                userTyping[conversationId] = false
                if (userTyping[`${conversationId}_timeout`]) {
                    clearTimeout(userTyping[`${conversationId}_timeout`])
                    delete userTyping[`${conversationId}_timeout`]
                }
            }

            socket.to(receiverId).emit("user_typing", {
                userId,
                conversationId,
                isTyping: false
            })
        })


        socket.on("add_reaction", async ({ messageId, emoji, userId, reactionUserId }) => {
            try {
                const message = await Message.findById(messageId);
                if (!message) return;

                const existingIndex = message.reactions.findIndex((r) => r.user.toString() === reactionUserId)

                if (existingIndex > -1) {
                    const existing = message.reactions(existingIndex)
                    if (existing.emoji === emoji) {
                        message.reaction.splice(existingIndex, 1)
                    } else {
                        message.reaction[existingIndex].emoji = emoji
                    }
                } else {
                    message.reaction.push({ user: reactionUserId, emoji });
                }

                const populatedMessage = await Message.findone({})

                // complete all the rest 
            } catch (error) {

            }
        })

        // handle disconnection and mark user offline
        const handleDisconnected = async () => {
            if (!userId) return;
            try {
                onlineUsers.delete(userId);
                if (typingUsers.has(userId)) {
                    const userTyping = typingUsers.get(userId);
                    Object.keys(userTyping).forEach((key) => {
                        if (key.endsWith('_timeout')) clearTimeout(userTyping[key])
                    })
                    typingUsers.delete(userId);
                }

                await User.findByIdAndUpdate(userId, {
                    isOnline: false,
                    lastSeen: new Date()
                })

                io.emit("user_status", {
                    userId,
                    isOnline: false,
                    lastSeen: new Date()
                })

                socket.leave(userId)
            } catch (error) {

            }
        }

        socket.on("disconnect", handleDisconnected)
    })
    // attach the online user map to the socket server for external use
    io.socketUserMap = onlineUsers;

    return io
}



// apply socket middleware before routes

app.use((req,res,next)=>{
    req.io=io;
    req.socketUserMap=io.socketUserMap
    next();
})