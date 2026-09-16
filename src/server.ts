import { appConfig } from "./config/env";
import { socketServer } from "./infrastructure/lib/socket.io";
import { connectDB, disconnectDB } from "./config/database/connection";
import logger from "./infrastructure/logger/logger";

const port = parseInt(appConfig.port || "5000", 10);

async function startServer() {
  try {
    await connectDB();

    const server = socketServer.listen(port, () => {
      logger.info(`Server running at ${port}`);
    });

    const shutdown = async () => {
      logger.info("\nShutting down server...");
      await disconnectDB();
      server.close(() => {
        logger.info(" Server stopped");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  } catch (error) {
    logger.error("Server startup failed:", error);
    process.exit(1);
  }
}
// test
startServer();
