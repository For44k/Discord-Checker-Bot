import express from "express";
import { Server } from "http";
import { config } from "./utils/env.config.js";
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from "./database/connection.js";
import { discordClientManager } from "./discord/client/clientManager.js";
import { preloadService } from "./discord/services/preload.service.js";
import { syncWorker } from "./analytics/workers/syncWorker.js";
import { writeManager } from "./database/WriteManager.js";
import { reconciliationWorker } from "./core/synchronization/ReconciliationWorker.js";
import { eventBroadcaster } from "./websocket/eventBroadcaster.js";
import userRoutes from "./api/routes/user.routes.js";
import guildRoutes from "./api/routes/guild.routes.js";
import voiceRoutes from "./api/routes/voice.routes.js";
import generalRoutes from "./api/routes/general.routes.js";
import alertRoutes from "./api/routes/alert.routes.js";

const app = express();
let server: Server | null = null;

app.set("trust proxy", 1);
app.use(express.json());

app.use("/api", userRoutes);
app.use("/api", guildRoutes);
app.use("/api", voiceRoutes);
app.use("/api", generalRoutes);
app.use("/api", alertRoutes);

app.get("/health", (_req, res) => {
    const isDbReady = isDatabaseConnected();
    const isDiscordReady = discordClientManager.isConnected();
    const isHealthy = isDbReady && isDiscordReady;

    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString()
    });
});

async function shutdown(signal: string): Promise<void> {
    console.log(`[Server] Received ${signal}, shutting down...`);
    reconciliationWorker.stop();
    await syncWorker.stop();
    await writeManager.shutdown();

    try {
        await eventBroadcaster.close();
    } catch (error) {
        console.error("[Server] Error closing WebSocket broadcaster:", error);
    }

    if (server) {
        const serverWithCloseAll = server as unknown as { closeAllConnections?: () => void };
        serverWithCloseAll.closeAllConnections?.();
        await new Promise<void>((resolve) => {
            server?.close(() => resolve());
        });
    }

    try {
        await disconnectDatabase();
    } catch (error) {
        console.error("[Server] Error disconnecting database:", error);
    }

    process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

async function bootstrap(): Promise<void> {
    try {
        await connectDatabase();
        await syncWorker.recoverFromJournal();
        syncWorker.start();
        reconciliationWorker.start();
        await discordClientManager.start();

        preloadService.preloadAllGuilds().catch((err) => {
            console.error("[Server] Preload guilds error:", err);
        });

        server = app.listen(config.PORT, () => {
            console.log(`Server listening on port ${config.PORT}`);
            if (server) {
                eventBroadcaster.init(server);
            }
        });

        server.setTimeout(30000);
        server.keepAliveTimeout = 65000;
    } catch (error) {
        console.error("[Server] Bootstrap failed:", error);
        reconciliationWorker.stop();
        await syncWorker.stop();
        await writeManager.shutdown();
        process.exit(1);
    }
}

void bootstrap();
