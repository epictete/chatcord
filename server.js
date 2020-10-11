const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const mongoose = require("mongoose");
const formatMessage = require("./utils/messages");
const {
    userJoin,
    getCurrentUser,
    userLeave,
    getRoomUsers,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

mongoose
    .connect(
        "mongodb+srv://dev123:dev123@epictete.ahqdx.mongodb.net/chat?retryWrites=true&w=majority",
        { useNewUrlParser: true, useUnifiedTopology: true }
    )
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.log(err));

const Message = mongoose.model("Message", {
    username: { type: String, required: true },
    text: { type: String, required: true },
    time: { type: String, required: true },
});

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

const chatBot = "ChatCord Bot";

// Run when client connects
io.on("connection", socket => {
    socket.on("joinRoom", ({ username, room }) => {
        const user = userJoin(socket.id, username, room);

        socket.join(user.room);

        // Get chats from mongo collection
        Message.find()
            .then(data => {
                // Emit the messages
                socket.emit("output", data);
            })
            .catch(err => console.log(err));

        // Welcome current user
        const welcome = new Message(
            formatMessage(chatBot, "Welcome to ChatCord!")
        );
        socket.emit("output", [welcome]);

        // Broadcast when a user connects
        const connect = new Message(
            formatMessage(chatBot, `${user.username} has joined the chat`)
        );
        connect.save();
        socket.broadcast.to(user.room).emit("output", [connect]);

        // Send users and room info
        io.to(user.room).emit("roomUsers", {
            room: user.room,
            users: getRoomUsers(user.room),
        });
    });

    // Listen for chatMessage
    socket.on("chatMessage", msg => {
        const user = getCurrentUser(socket.id);
        const message = new Message(formatMessage(user.username, msg));

        message.save();
        io.to(user.room).emit("output", [message]);
    });

    // Runs when client disconnects
    socket.on("disconnect", () => {
        const user = userLeave(socket.id);

        if (user) {
            const disconnect = new Message(
                formatMessage(chatBot, `${user.username} has left the chat`)
            );
            io.to(user.room).emit("output", [disconnect]);
            disconnect.save();

            // Send users and room info
            io.to(user.room).emit("roomUsers", {
                room: user.room,
                users: getRoomUsers(user.room),
            });
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
