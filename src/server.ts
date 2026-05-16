import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

// Middleware
app.use(express.json());

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
 * ============================
 * AUTHENTICATION APIs
 * ============================
 */

/**
 * Register User
 */
app.post(
   "/api/auth/register",
   async (req, res) => {

      const {
         username,
         email,
         password
      } = req.body;

      try {

         // Encrypt password
         const hashedPassword =
            await bcrypt.hash(
               password,
               10
            );

         const sql =
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";

         db.query(
            sql,
            [
               username,
               email,
               hashedPassword
            ],
            (err) => {

               if (err) {

                  console.log(err);

                  return res.status(500).json({
                     message:
                        "Registration failed"
                  });
               }

               res.json({
                  message:
                     "User registered successfully"
               });

            }
         );

      } catch (error) {

         console.log(error);

         res.status(500).json({
            message:
               "Server error"
         });

      }
   }
);

/**
 * Login User
 */
app.post(
   "/api/auth/login",
   (req, res) => {

      const {
         email,
         password
      } = req.body;

      const sql =
         "SELECT * FROM users WHERE email = ?";

      db.query(
         sql,
         [email],
         async (
            err,
            results: any
         ) => {

            if (err) {

               return res.status(500).json({
                  message:
                     "Server error"
               });
            }

            if (
               results.length === 0
            ) {

               return res.status(400).json({
                  message:
                     "User not found"
               });
            }

            const user =
               results[0];

            // Compare Password
            const isMatch =
               await bcrypt.compare(
                  password,
                  user.password
               );

            if (!isMatch) {

               return res.status(400).json({
                  message:
                     "Invalid password"
               });
            }

            // Generate JWT Token
            const token =
               jwt.sign(
                  {
                     id: user.id,
                     email: user.email
                  },
                  "secretkey",
                  {
                     expiresIn: "1d"
                  }
               );

            res.json({
               message:
                  "Login successful",
               token
            });

         }
      );
   }
);

/**
 * ============================
 * SOCKET.IO CONNECTION
 * ============================
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
          * Load Previous Messages
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
          * Update Users
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
    * Chat Message
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
          * Smart ChatBot
          */
         let botReply =
            "Interesting 😊";

         const lowerMsg =
            msg.toLowerCase();

         if (
            lowerMsg.includes("hello") ||
            lowerMsg.includes("hi")
         ) {

            botReply =
               "Hello 👋 Welcome to XeroxChat!";

         }

         else if (
            lowerMsg.includes(
               "how are you"
            )
         ) {

            botReply =
               "I'm doing great 🚀";

         }

         else if (
            lowerMsg.includes(
               "project"
            )
         ) {

            botReply =
               "This project uses TypeScript, Express, Socket.IO, and MySQL.";

         }

         else if (
            lowerMsg.includes(
               "database"
            )
         ) {

            botReply =
               "Messages are stored permanently using MySQL database.";

         }

         else if (
            lowerMsg.includes(
               "bye"
            )
         ) {

            botReply =
               "Goodbye 👋 Have a nice day!";

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