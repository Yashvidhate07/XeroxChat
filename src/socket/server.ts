import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

import {
  TypedServer,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket.types';


import { createLogger } from '../services/logger.service';

const logger = createLogger('SocketFactory');

export function createSocketServer(
  httpServer: HttpServer
): TypedServer {

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },

    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
  });

  logger.info('Socket.IO server created');

  return io;
}

export function configureSocketMiddleware(
  io: TypedServer
): void {

  io.use((socket, next) => {

    logger.debug('Socket connection attempt', {
      socketId: socket.id,
    });

    next();
  });

  logger.info('Socket middleware configured');
}