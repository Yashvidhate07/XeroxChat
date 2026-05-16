import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";

import db from "./config/db";

import formatMessage from "./utils/messages";

import {
   userJoin,
   getCurrentUser,
   userLeave,
   getRoomUsers,
} from "./utils/users";

import { JoinRoomData } from "./types/index";

// Initialize Express
const app = express();

const server =
   http.createServer(app);

const io =
   new SocketIOServer(server);

// Static Files
app.use(
   express.static(
      path.join(
         __dirname,
         "../public"
      )
   )
);

const BOT_NAME =
   "XeroxChat Bot";

const PORT =
   process.env["PORT"] ?? 3000;

/**
 * Socket.IO Connection
 */
io.on("connection", (socket) => {

   console.log(
      "🟢 New user connected"
   );

   /**
    * Join Room
    */
   socket.on(
      "joinRoom",
      (data: JoinRoomData) => {

         const {
            username,
            room
         } = data;

         const {
            error,
            user
         } = userJoin(
            socket.id,
            username,
            room
         );

         if (error) {

            socket.emit(
               "usernameError",
               error
            );

            return;
         }

         if (!user) {
            return;
         }

         // Join Room
         socket.join(user.room);

         /**
          * Load Old Messages
          */
         const loadSql =
            "SELECT * FROM messages WHERE room = ? ORDER BY created_at ASC";

         db.query(
            loadSql,
            [user.room],
            (
               err,
               results: any
            ) => {

               if (err) {

                  console.log(err);

               } else {

                  results.forEach(
                     (
                        msg: any
                     ) => {

                        socket.emit(
                           "message",
                           formatMessage(
                              msg.username,
                              msg.text
                           )
                        );

                     }
                  );
               }
            }
         );

         /**
          * Welcome User
          */
         socket.emit(
            "message",
            formatMessage(
               BOT_NAME,
               "Welcome to XeroxChat 🚀"
            )
         );

         /**
          * Broadcast Join
          */
         socket.broadcast
            .to(user.room)
            .emit(
               "message",
               formatMessage(
                  BOT_NAME,
                  `${user.username} joined the chat`
               )
            );

         /**
          * Room Users
          */
         io.to(user.room).emit(
            "roomUsers",
            {
               room:
                  user.room,
               users:
                  getRoomUsers(
                     user.room
                  ),
            }
         );
      }
   );

   /**
    * Chat Messages
    */
   socket.on(
      "chatMessage",
      (msg: string) => {

         const user =
            getCurrentUser(
               socket.id
            );

         if (!user) {
            return;
         }

         /**
          * Save USER Message
          */
         const userSql =
            "INSERT INTO messages (username, room, text) VALUES (?, ?, ?)";

         db.query(
            userSql,
            [
               user.username,
               user.room,
               msg
            ],
            (err) => {

               if (err) {
                  console.log(err);
               }
            }
         );

         /**
          * Broadcast USER Message
          */
         io.to(user.room).emit(
            "message",
            formatMessage(
               user.username,
               msg
            )
         );

         /**
          * SMART CHATBOT
          */

         let botReply =
            "Interesting 😊";

         const lowerMsg =
            msg.toLowerCase();

         // Greetings
         if (
            lowerMsg.includes("hello") ||
            lowerMsg.includes("hi") ||
            lowerMsg.includes("hey")
         ) {

            botReply =
               "Hello 👋 Welcome to XeroxChat!";

         }

         // How are you
         else if (
            lowerMsg.includes(
               "how are you"
            )
         ) {

            botReply =
               "I'm doing great 🚀";

         }

         // Project
         else if (
            lowerMsg.includes(
               "project"
            )
         ) {

            botReply =
               "This project uses TypeScript, Socket.IO, Express, and MySQL.";

         }

         // Database
         else if (
            lowerMsg.includes(
               "database"
            )
         ) {

            botReply =
               "Messages are stored permanently using MySQL database.";

         }

         // Thanks
         else if (
            lowerMsg.includes(
               "thank"
            )
         ) {

            botReply =
               "You're welcome 😊";

         }

         // Bye
         else if (
            lowerMsg.includes(
               "bye"
            )
         ) {

            botReply =
               "Goodbye 👋 Have a nice day!";

         }

         // Time
         else if (
            lowerMsg.includes(
               "time"
            )
         ) {

            botReply =
               `Current server time is ${new Date().toLocaleTimeString()}`;

         }

         /**
          * Send BOT Reply
          */
         setTimeout(() => {

            io.to(user.room).emit(
               "message",
               formatMessage(
                  BOT_NAME,
                  botReply
               )
            );

            /**
             * Save BOT Reply
             */
            const botSql =
               "INSERT INTO messages (username, room, text) VALUES (?, ?, ?)";

            db.query(
               botSql,
               [
                  BOT_NAME,
                  user.room,
                  botReply
               ],
               (err) => {

                  if (err) {
                     console.log(err);
                  }
               }
            );

         }, 1000);
      }
   );

   /**
    * Typing Indicator
    */
   socket.on(
      "typing",
      (username) => {

         socket.broadcast.emit(
            "typing",
            username
         );

      }
   );

   /**
    * Disconnect
    */
   socket.on(
      "disconnect",
      () => {

         const user =
            userLeave(
               socket.id
            );

         if (user) {

            io.to(user.room).emit(
               "message",
               formatMessage(
                  BOT_NAME,
                  `${user.username} left the chat`
               )
            );

            // Update Users
            io.to(user.room).emit(
               "roomUsers",
               {
                  room:
                     user.room,
                  users:
                     getRoomUsers(
                        user.room
                     ),
               }
            );
         }

         console.log(
            "🔴 User disconnected"
         );
      }
   );
});

/**
 * Start Server
 */
server.listen(PORT, () => {

   console.log(
      `🚀 XeroxChat server running on PORT ${PORT}`
   );

});