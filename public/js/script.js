const chatForm = document.getElementById("chat-form");

const chatMessages =
   document.querySelector(".chat-messages");

const roomName =
   document.getElementById("room-name");

const userList =
   document.getElementById("users");

/**
 * Get username and room from URL
 */
const {
   username,
   room,
} = Qs.parse(location.search, {
   ignoreQueryPrefix: true,
});

/**
 * Socket Connection
 */
const socket = io();

/**
 * Typing Status Div
 */
const typingDiv =
   document.createElement("div");

typingDiv.classList.add(
   "typing-status"
);

document
   .querySelector(".chat-form-container")
   .appendChild(typingDiv);

/**
 * Username Error
 */
socket.on("usernameError", (msg) => {

   alert(msg);

   window.location.href = "/";

});

/**
 * Join Chat Room
 */
socket.emit("joinRoom", {
   username,
   room,
});

/**
 * Get Room & Users
 */
socket.on("roomUsers", ({
   room,
   users,
}) => {

   outputRoomName(room);

   outputUsers(users);

});

/**
 * Display Messages
 */
socket.on("message", (message) => {

   outputMessage(message);

   // Auto scroll
   chatMessages.scrollTop =
      chatMessages.scrollHeight;

});

/**
 * Typing Event Listen
 */
socket.on("typing", (user) => {

   typingDiv.innerText =
      `${user} is typing...`;

   setTimeout(() => {

      typingDiv.innerText = "";

   }, 2000);

});

/**
 * Message Submit
 */
chatForm.addEventListener(
   "submit",
   (e) => {

      e.preventDefault();

      const msgInput =
         e.target.elements.msg;

      const msg =
         msgInput.value;

      /**
       * Send Message
       */
      socket.emit(
         "chatMessage",
         msg
      );

      // Clear input
      msgInput.value = "";

      msgInput.focus();

   }
);

/**
 * Typing Event Emit
 */
document
   .getElementById("msg")
   .addEventListener(
      "input",
      () => {

         socket.emit(
            "typing",
            username
         );

      }
   );

/**
 * Output Message
 */
function outputMessage(message) {

   const div =
      document.createElement("div");

   div.classList.add("message");

   div.innerHTML = `
      <p class="meta">
         ${message.username}
         <span>${message.time}</span>
      </p>

      <p class="text">
         ${message.text}
      </p>
   `;

   chatMessages.appendChild(div);

}

/**
 * Output Room Name
 */
function outputRoomName(room) {

   roomName.innerText = room;

}

/**
 * Output Users
 */
function outputUsers(users) {

   userList.innerHTML = `
      ${users.map(user => `
         <li>
            🟢 ${user.username}
         </li>
      `).join("")}
   `;

}