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

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

const BOT_NAME = "XeroxChat Bot";
const PORT = process.env["PORT"] ?? 3000;

/**
 * Socket.IO connection handler
 */
io.on("connection", (socket) => {

   /**
    * Handle user joining a room
    */
   socket.on("joinRoom", (data: JoinRoomData) => {

      const { username, room } = data;

      const { error, user } = userJoin(
         socket.id,
         username,
         room
      );

      if (error) {
         socket.emit("usernameError", error);
         return;
      }

      if (!user) {
         return;
      }

      socket.join(user.room);

      // Load old messages from MySQL
      const sql =
         "SELECT * FROM messages WHERE room = ? ORDER BY created_at ASC";

      db.query(sql, [user.room], (err, results: any) => {

         if (err) {
            console.log(err);
         } else {

            results.forEach((msg: any) => {

               socket.emit(
                  "message",
                  formatMessage(msg.username, msg.text)
               );

            });
         }
      });

      // Welcome current user
      socket.emit(
         "message",
         formatMessage(BOT_NAME, "Welcome to XeroxChat!")
      );

      // Broadcast when user joins
      socket.broadcast
         .to(user.room)
         .emit(
            "message",
            formatMessage(
               BOT_NAME,
               `${user.username} has joined the chat!`
            )
         );

      // Send room users info
      io.to(user.room).emit("roomUsers", {
         room: user.room,
         users: getRoomUsers(user.room),
      });
   });

   /**
    * Handle chat messages
    */
   socket.on("chatMessage", (msg: string) => {

      const user = getCurrentUser(socket.id);

      if (!user) {
         return;
      }

      // Save message into MySQL
      const sql =
         "INSERT INTO messages (username, room, text) VALUES (?, ?, ?)";

      db.query(
         sql,
         [user.username, user.room, msg],
         (err) => {

            if (err) {
               console.log(err);
            }
         }
      );

      // Send message to room
      io.to(user.room).emit(
         "message",
         formatMessage(user.username, msg)
      );
   });

   /**
    * Handle disconnect
    */
   socket.on("disconnect", () => {

      const user = userLeave(socket.id);

      if (user) {

         io.to(user.room).emit(
            "message",
            formatMessage(
               BOT_NAME,
               `${user.username} has left the chat!`
            )
         );

         // Update room users
         io.to(user.room).emit("roomUsers", {
            room: user.room,
            users: getRoomUsers(user.room),
         });
      }
   });
});

/**
 * Start server
 */
server.listen(PORT, () => {
   console.log(`🎯 Server is running on PORT: ${PORT}`);
});