/**
 * Socket.IO Event Handlers
 * Real-time chat handlers with MySQL + Smart ChatBot
 */

import {
  TypedSocket,
  TypedServer,
  SocketEvents,
  JoinRoomPayload
} from '../types/socket.types';

import { db } from "../main";

import { userService } from '../services/user.service';
import { messageService } from '../services/message.service';

import {
  validate,
  joinRoomSchema,
  messageSchema
} from '../validation/schemas';

import { createLogger } from '../services/logger.service';

const logger = createLogger('SocketHandler');

/**
 * Broadcast room users
 */
function broadcastRoomUsers(
  io: TypedServer,
  room: string
): void {

  const users =
    userService.getRoomUsers(room);

  io.to(room).emit(
    SocketEvents.ROOM_USERS,
    {
      room,
      users
    }
  );
}

/**
 * Handle Join Room
 */
export function handleJoinRoom(
  io: TypedServer,
  socket: TypedSocket,
  data: JoinRoomPayload
): void {

  logger.debug('Join room attempt', {
    socketId: socket.id,
    data
  });

  // Validate input
  const validationResult = validate(
    joinRoomSchema,
    data
  );

  if (!validationResult.success) {

    socket.emit(
      SocketEvents.USERNAME_ERROR,
      (validationResult as any)
        .error?.message
    );

    return;
  }

  const { username, room } =
    validationResult.data;

  // Join room
  const joinResult =
    userService.join(
      socket.id,
      username,
      room
    );

  if (!joinResult.success) {

    socket.emit(
      SocketEvents.USERNAME_ERROR,
      (joinResult as any)
        .error?.message
    );

    return;
  }

  const user =
    joinResult.data;

  // Save user in socket
  socket.data.user = user;

  // Join room
  socket.join(user.room);

  /**
   * Load old messages
   */
  const loadSql =
    "SELECT * FROM messages WHERE room = ? ORDER BY created_at ASC";

  db.query(
    loadSql,
    [user.room],
    (err, results: any) => {

      if (err) {

        logger.error(
          "Failed to load messages",
          err
        );

      } else {

        results.forEach(
          (msg: any) => {

            socket.emit(
              SocketEvents.MESSAGE,
              messageService.format(
                msg.username,
                msg.text
              )
            );

          }
        );
      }
    }
  );

  // Welcome current user
  socket.emit(
    SocketEvents.MESSAGE,
    messageService.welcome()
  );

  // Broadcast joined user
  socket.broadcast
    .to(user.room)
    .emit(
      SocketEvents.MESSAGE,
      messageService.userJoined(
        user.username
      )
    );

  // Update room users
  broadcastRoomUsers(
    io,
    user.room
  );

  logger.info(
    'User joined successfully',
    {
      username:
        user.username,
      room:
        user.room
    }
  );
}

/**
 * Handle Chat Message
 */
export function handleChatMessage(
  io: TypedServer,
  socket: TypedSocket,
  msg: string
): void {

  const user =
    socket.data.user ??
    userService.getById(socket.id);

  if (!user) {

    socket.emit(
      SocketEvents.ERROR,
      {
        code: 'USER_NOT_FOUND',
        message:
          'Join room first',
      }
    );

    return;
  }

  // Validate message
  const validationResult =
    validate(
      messageSchema,
      msg
    );

  if (!validationResult.success) {

    socket.emit(
      SocketEvents.ERROR,
      {
        code: 'INVALID_MESSAGE',
        message:
          (validationResult as any)
            .error?.message,
      }
    );

    return;
  }

  const sanitizedMessage =
    validationResult.data;

  /**
   * Save USER message
   */
  const userSql =
    "INSERT INTO messages (username, room, text) VALUES (?, ?, ?)";

  db.query(
    userSql,
    [
      user.username,
      user.room,
      sanitizedMessage
    ],
    (err) => {

      if (err) {

        logger.error(
          "User message save failed",
          err
        );

      } else {

        logger.info(
          "User message saved"
        );

      }
    }
  );

  /**
   * Broadcast USER message
   */
  io.to(user.room).emit(
    SocketEvents.MESSAGE,
    messageService.format(
      user.username,
      sanitizedMessage
    )
  );

  /**
   * SMART BOT SYSTEM
   */

  let botReply =
    "I'm still learning 😊";

  const lowerMsg =
    sanitizedMessage.toLowerCase();

  // Greetings
  if (
    lowerMsg.includes("hello") ||
    lowerMsg.includes("hi") ||
    lowerMsg.includes("hey")
  ) {

    const replies = [
      "Hello 👋 Welcome to XeroxChat!",
      "Hi there 😊",
      "Hey! How are you doing?",
      "Nice to meet you 🚀",
      "Hello friend 😄"
    ];

    botReply =
      replies[
        Math.floor(
          Math.random() *
          replies.length
        )
      ];
  }

  // How are you
  else if (
    lowerMsg.includes(
      "how are you"
    )
  ) {

    const replies = [
      "I'm doing great 🚀",
      "Awesome! Thanks for asking 😊",
      "Feeling smart today 🤖",
      "Everything is running perfectly ⚡",
      "I’m always active 😄"
    ];

    botReply =
      replies[
        Math.floor(
          Math.random() *
          replies.length
        )
      ];
  }

  // Project
  else if (
    lowerMsg.includes(
      "project"
    )
  ) {

    botReply =
      "This project is built using TypeScript, Socket.IO, Express, and MySQL.";
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

  // Name
  else if (
    lowerMsg.includes(
      "your name"
    )
  ) {

    botReply =
      "My name is XeroxChat Bot 🤖";
  }

  // Creator
  else if (
    lowerMsg.includes(
      "who created you"
    )
  ) {

    botReply =
      "I was created by Yash Vidhate 🚀";
  }

  // Bye
  else if (
    lowerMsg.includes("bye")
  ) {

    const replies = [
      "Goodbye 👋",
      "See you again 😊",
      "Take care 🚀",
      "Have a wonderful day 🌟",
      "Bye friend 😄"
    ];

    botReply =
      replies[
        Math.floor(
          Math.random() *
          replies.length
        )
      ];
  }

  // Time
  else if (
    lowerMsg.includes("time")
  ) {

    botReply =
      `Current server time is ${new Date().toLocaleTimeString()}`;
  }

  // Date
  else if (
    lowerMsg.includes("date")
  ) {

    botReply =
      `Today's date is ${new Date().toLocaleDateString()}`;
  }

  // Help
  else if (
    lowerMsg.includes("help")
  ) {

    botReply =
      "You can ask me about project, database, date, time, greetings, or creator 😊";
  }

  // Thanks
  else if (
    lowerMsg.includes("thank")
  ) {

    botReply =
      "You're welcome 😊";
  }

  // Motivation
  else if (
    lowerMsg.includes("motivate")
  ) {

    botReply =
      "Keep learning and keep building projects 🚀";
  }

  // Coding
  else if (
    lowerMsg.includes("coding")
  ) {

    botReply =
      "Coding is fun when logic starts working 😎";
  }

  // Default random replies
  else {

    const randomReplies = [
      "Interesting 🤔",
      "Tell me more 😊",
      "That sounds great 🚀",
      "I'm listening 👀",
      "Really? That's cool 😎",
      "Nice conversation 🔥",
      "Can you explain more?",
      "Awesome 😄",
      "That's very interesting!",
      "I like this conversation 😊"
    ];

    botReply =
      randomReplies[
        Math.floor(
          Math.random() *
          randomReplies.length
        )
      ];
  }

  /**
   * Send BOT reply
   */
  setTimeout(() => {

    // Broadcast BOT reply
    io.to(user.room).emit(
      SocketEvents.MESSAGE,
      messageService.format(
        "XeroxChat Bot",
        botReply
      )
    );

    /**
     * Save BOT reply
     */
    const botSql =
      "INSERT INTO messages (username, room, text) VALUES (?, ?, ?)";

    db.query(
      botSql,
      [
        "XeroxChat Bot",
        user.room,
        botReply
      ],
      (err) => {

        if (err) {

          logger.error(
            "Bot reply save failed",
            err
          );

        } else {

          logger.info(
            "Bot reply saved"
          );

        }
      }
    );

  }, 1000);

  logger.debug(
    'Message sent',
    {
      username:
        user.username,
      room:
        user.room
    }
  );
}

/**
 * Handle Typing
 */
export function handleTyping(
  socket: TypedSocket,
  data: {
    isTyping: boolean
  }
): void {

  const user =
    socket.data.user ??
    userService.getById(
      socket.id
    );

  if (!user) return;

  socket.broadcast
    .to(user.room)
    .emit(
      SocketEvents.USER_TYPING,
      {
        username:
          user.username,
        isTyping:
          data.isTyping,
      }
    );
}

/**
 * Handle Disconnect
 */
export function handleDisconnect(
  io: TypedServer,
  socket: TypedSocket
): void {

  const user =
    userService.leave(
      socket.id
    );

  if (user) {

    io.to(user.room).emit(
      SocketEvents.MESSAGE,
      messageService.userLeft(
        user.username
      )
    );

    broadcastRoomUsers(
      io,
      user.room
    );

    logger.info(
      'User disconnected',
      {
        username:
          user.username,
        room:
          user.room
      }
    );
  }
}

/**
 * Register Socket Handlers
 */
export function registerSocketHandlers(
  io: TypedServer
): void {

  io.on(
    SocketEvents.CONNECTION,
    (
      socket: TypedSocket
    ) => {

      logger.debug(
        'New connection',
        {
          socketId:
            socket.id
        }
      );

      socket.on(
        SocketEvents.JOIN_ROOM,
        (data) => {

          handleJoinRoom(
            io,
            socket,
            data
          );

        }
      );

      socket.on(
        SocketEvents.CHAT_MESSAGE,
        (msg) => {

          handleChatMessage(
            io,
            socket,
            msg
          );

        }
      );

      socket.on(
        SocketEvents.TYPING,
        (data) => {

          handleTyping(
            socket,
            data
          );

        }
      );

      socket.on(
        SocketEvents.DISCONNECT,
        () => {

          handleDisconnect(
            io,
            socket
          );

        }
      );

      socket.on(
        'error',
        (error) => {

          logger.error(
            'Socket error',
            error,
            {
              socketId:
                socket.id
            }
          );

        }
      );
    }
  );

  logger.info(
    'Socket handlers registered'
  );
}