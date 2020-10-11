const chatForm = document.getElementById("chat-form");
const chatMessages = document.querySelector(".chat-messages");
const roomName = document.getElementById("room-name");
const userList = document.getElementById("users");

// Get username and room from URL
const { username, room } = Qs.parse(location.search, {
    ignoreQueryPrefix: true,
});

const socket = io();

// Join chatroom
socket.emit("joinRoom", { username, room });

// Get room and users
socket.on("roomUsers", ({ room, users }) => {
    outputRoomName(room);
    outputUsers(users);
});

// Message from server
socket.on("output", data => {
    handleOutput(data);

    // Scroll
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Message submit
chatForm.addEventListener("submit", e => {
    e.preventDefault();

    // Get message text
    const msg = e.target.elements.msg.value;

    // Emit message to server
    socket.emit("chatMessage", msg);

    // Clear input
    e.target.elements.msg.value = "";
    e.target.elements.msg.focus();
});

// Output message to DOM
const handleOutput = data => {
    for (let i = 0; i < data.length; i++) {
        const div = document.createElement("div");
        div.classList.add("message");
        div.innerHTML = `<p class="meta">${data[i].username} <span>${data[i].time}</span></p>
        <p class="text">
            ${data[i].text}
        </p>`;
        chatMessages.appendChild(div);
    }
};

// Add room name to DOM
const outputRoomName = room => (roomName.innerText = room);

// Add users to DOM
const outputUsers = users => {
    userList.innerHTML = `
        ${users.map(user => `<li>${user.username}</li>`).join("")}
    `;
};
