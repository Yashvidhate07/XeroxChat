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

// =====================================
// INITIALIZE APP
// =====================================

const app = express();

const server =
   http.createServer(app);

const io =
   new SocketIOServer(server);

// =====================================
// MIDDLEWARE
// =====================================

app.use(express.json());

app.use(express.urlencoded({
   extended: true
}));

app.use(
   express.static(
      path.join(
         __dirname,
         "../public"
      )
   )
);

// =====================================
// CONSTANTS
// =====================================

const BOT_NAME =
   "XeroxChat Bot";

const PORT =
   process.env.PORT || 3000;

// =====================================
// HOME ROUTE
// =====================================

app.get("/", (req, res) => {

   res.sendFile(
      path.join(
         __dirname,
         "../public/index.html"
      )
   );

});

// =====================================
// REGISTER API
// =====================================

app.post(
   "/api/auth/register",

   async (req, res) => {

      console.log(
         "📥 Register Request Received"
      );

      try {

         const {
            username,
            email,
            password
         } = req.body;

         // Validation
         if (
            !username ||
            !email ||
            !password
         ) {

            return res.status(400).json({

               message:
                  "All fields are required"

            });

         }

         // Check existing user
         const checkSql =

            "SELECT * FROM users WHERE email = ?";

         db.query(

            checkSql,

            [email],

            async (
               err,
               results: any
            ) => {

               if (err) {

                  console.log(err);

                  return res.status(500).json({

                     message:
                        "Database error"

                  });

               }

               if (
                  results.length > 0
               ) {

                  return res.status(400).json({

                     message:
                        "User already exists"

                  });

               }

               // Encrypt password
               const hashedPassword =

                  await bcrypt.hash(
                     password,
                     10
                  );

               // Insert user
               const insertSql =

                  "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";

               db.query(

                  insertSql,

                  [
                     username,
                     email,
                     hashedPassword
                  ],

                  (
                     err,
                     result: any
                  ) => {

                     if (err) {

                        console.log(err);

                        return res.status(500).json({

                           message:
                              "Registration failed"

                        });

                     }

                     console.log(

                        "✅ New User Registered:",
                        username

                     );

                     return res.json({

                        success: true,

                        message:
                           "User registered successfully",

                        userId:
                           result.insertId

                     });

                  }
               );

            }
         );

      } catch (error) {

         console.log(error);

         return res.status(500).json({

            message:
               "Server Error"

         });

      }

   }
);

// =====================================
// LOGIN API
// =====================================

app.post(
   "/api/auth/login",

   async (req, res) => {

      console.log(
         "🔐 Login Request Received"
      );

      try {

         const {
            email,
            password
         } = req.body;

         if (
            !email ||
            !password
         ) {

            return res.status(400).json({

               message:
                  "Email and password required"

            });

         }

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

                  console.log(err);

                  return res.status(500).json({

                     message:
                        "Database Error"

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

               // Compare password
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

               // Generate JWT
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

               // Save login history
               const loginSql =

                  "INSERT INTO login_history (username, email, ip_address) VALUES (?, ?, ?)";

               db.query(

                  loginSql,

                  [
                     user.username,
                     user.email,
                     req.ip
                  ],

                  (err) => {

                     if (err) {

                        console.log(err);

                     } else {

                        console.log(

                           "✅ Login History Saved"

                        );

                     }

                  }
               );

               console.log(

                  "✅ User Logged In:",
                  user.username

               );

               return res.json({

                  success: true,

                  message:
                     "Login successful",

                  token,

                  username:
                     user.username

               });

            }
         );

      } catch (error) {

         console.log(error);

         return res.status(500).json({

            message:
               "Server Error"

         });

      }

   }
);

// =====================================
// SOCKET.IO
// =====================================

io.on("connection", (socket) => {

   console.log(
      "🟢 User Connected"
   );

   // ==========================
   // JOIN ROOM
   // ==========================

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

         socket.join(user.room);

         // Load old messages
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

         // Welcome message
         socket.emit(

            "message",

            formatMessage(

               BOT_NAME,

               "Welcome to XeroxChat 🚀"

            )

         );

         // Broadcast join
         socket.broadcast
            .to(user.room)
            .emit(

               "message",

               formatMessage(

                  BOT_NAME,

                  `${user.username} joined the chat`

               )

            );

         // Room users
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

   // ==========================
   // TYPING INDICATOR
   // ==========================

   socket.on(
      "typing",

      (username) => {

         socket.broadcast.emit(
            "typing",
            username
         );

      }
   );

   // ==========================
   // CHAT MESSAGE
   // ==========================

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

         console.log(
            `💬 ${user.username}: ${msg}`
         );

         // Save user message
         const saveSql =

            "INSERT INTO messages (username, room, text) VALUES (?, ?, ?)";

         db.query(

            saveSql,

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

         // Send message
         io.to(user.room).emit(

            "message",

            formatMessage(
               user.username,
               msg
            )

         );

         // ======================
         // SMART CHATBOT
         // ======================

         let botReply =
            "Interesting 😊";

         const lowerMsg =
            msg.toLowerCase();

         if (
            lowerMsg.includes("hello") ||
            lowerMsg.includes("hi") ||
            lowerMsg.includes("hey")
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
               "bye"
            )
         ) {

            botReply =
               "Goodbye 👋 Have a nice day!";

         }

         else if (
            lowerMsg.includes(
               "thank"
            )
         ) {

            botReply =
               "You're welcome 😊";

         }

         // Bot reply
         setTimeout(() => {

            io.to(user.room).emit(

               "message",

               formatMessage(
                  BOT_NAME,
                  botReply
               )

            );

            // Save bot message
            db.query(

               saveSql,

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

   // ==========================
   // DISCONNECT
   // ==========================

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
            "🔴 User Disconnected"
         );

      }
   );

});

// =====================================
// START SERVER
// =====================================

server.listen(PORT, () => {

   console.log(

      `🚀 XeroxChat Server Running on PORT ${PORT}`

   );

});