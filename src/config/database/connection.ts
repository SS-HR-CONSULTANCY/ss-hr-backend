import dns from "dns";
import mongoose from "mongoose";
import { mongoConfig } from "../env";
import logger from "../../infrastructure/logger/logger";

// Set reliable public DNS servers for Node SRV resolution (fixes ESERVFAIL on Windows/ISP IPv6 DNS)
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch {
  // Ignore if custom DNS cannot be configured in current environment
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    try {
      const mongoUri = mongoConfig.mongoURL;

      if (!mongoUri) {
        throw new Error("MONGODB_URI is not defined in environment variables");
      }

      await mongoose.connect(mongoUri);
      logger.info("✅ Database connected");

      mongoose.connection.on("error", (error) => {
        console.error("❌ Database connection error:", error);
      });

      mongoose.connection.on("disconnected", () => {
        logger.info("⚠️ Database disconnected");
      });
    } catch (error) {
      logger.error("❌ Failed to connect to database:", error);
      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    await mongoose.connection.close();
    logger.info("🛑 Database connection closed");
  }
}

// Export a helper so you don’t have to call getInstance everywhere
export const connectDB = async () => {
  await DatabaseConnection.getInstance().connect();
};

export const disconnectDB = async () => {
  await DatabaseConnection.getInstance().disconnect();
};
