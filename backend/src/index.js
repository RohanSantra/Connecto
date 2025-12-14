import http from "http";
import app from "./app.js";
import connectDB from "./db/index.js";
import { initializeSocket } from "./socket/index.js";

const PORT = process.env.PORT || 4000;

(async () => {
    await connectDB();

    const server = http.createServer(app);
    initializeSocket(server, app);

    server.listen(PORT, () => {
        console.log(`🚀 Server listening at http://localhost:${PORT}`);
    });
})();
