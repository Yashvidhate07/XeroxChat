/**
 * Main Server Entry Point
 * Production-grade server setup with Railway MySQL integration
 */

import http from "http";
import mysql from "mysql2";
import dotenv from "dotenv";

import { config } from "./config";

import { createApp } from "./app/express";

import {
   createSocketServer,
   configureSocketMiddleware,
   registerSocketHandlers,
} from "./socket";

import { createLogger } from "./services/logger.service";

// Load environment variables
dotenv.config();

const logger = createLogger("Server");

/**
 * MySQL Database Connection
 */
export const db = mysql.createConnection({
   host: process.env.DB_HOST,
   user: process.env.DB_USER,
   password: process.env.DB_PASSWORD,
   database: process.env.DB_NAME,
   port: Number(process.env.DB_PORT),
});

/**
 * Connect MySQL Database
 */
db.connect((err) => {

   if (err) {

      logger.error(
         "❌ MySQL connection failed",
         {
            error: err,
         }
      );

   } else {

      logger.info(
         "✅ MySQL Connected Successfully"
      );

   }
});

/**
 * Bootstrap Application
 */
async function bootstrap(): Promise<void> {

   try {

      /**
       * Create Express App
       */
      const app = createApp();

      /**
       * Create HTTP Server
       */
      const server =
         http.createServer(app);

      /**
       * Create Socket.IO Server
       */
      const io =
         createSocketServer(server);

      /**
       * Configure Socket Middleware
       */
      configureSocketMiddleware(io);

      /**
       * Register Socket Handlers
       */
      registerSocketHandlers(io);

      /**
       * Server Port
       */
      const port =
         Number(process.env.PORT) ||
         config.env.PORT ||
         10000;

      /**
       * Start Server
       */
      server.listen(port, () => {

         logger.info(
            `🚀 ${config.app.name} server started`,
            {
               port,
               environment:
                  process.env.NODE_ENV ||
                  "production",
               version:
                  config.app.version,
            }
         );

         logger.info(
            `🌐 Server running at: http://localhost:${port}`
         );

      });

      /**
       * Graceful Shutdown
       */
      const gracefulShutdown = async (
         signal: string
      ): Promise<void> => {

         logger.info(
            `⚠️ ${signal} received, shutting down...`
         );

         // Close Socket.IO
         io.close(() => {

            logger.info(
               "✅ Socket.IO connections closed"
            );

         });

         // Close HTTP Server
         server.close(() => {

            logger.info(
               "✅ HTTP server closed"
            );

            process.exit(0);

         });

         // Force shutdown timeout
         setTimeout(() => {

            logger.error(
               "❌ Forced shutdown due to timeout"
            );

            process.exit(1);

         }, 10000);
      };

      /**
       * Process Signals
       */
      process.on(
         "SIGTERM",
         () => gracefulShutdown("SIGTERM")
      );

      process.on(
         "SIGINT",
         () => gracefulShutdown("SIGINT")
      );

      /**
       * Handle Uncaught Exceptions
       */
      process.on(
         "uncaughtException",
         (error) => {

            logger.error(
               "❌ Uncaught Exception",
               error
            );

            process.exit(1);

         }
      );

      /**
       * Handle Promise Rejections
       */
      process.on(
         "unhandledRejection",
         (reason) => {

            logger.error(
               "❌ Unhandled Rejection",
               reason as Error
            );

            process.exit(1);

         }
      );

   } catch (error) {

      logger.error(
         "❌ Failed to start server",
         error as Error
      );

      process.exit(1);

   }
}

/**
 * Start Application
 */
bootstrap();