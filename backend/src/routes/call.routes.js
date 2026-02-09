// src/routes/call.routes.js
import express from "express";
import * as callCtrl from "../controllers/call.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

// start
router.post("/", authMiddleware, callCtrl.startCall);

// accept
router.post("/:callId/accept", authMiddleware, callCtrl.acceptCall);

// reject
router.post("/:callId/reject", authMiddleware, callCtrl.rejectCall);

// end
router.post("/:callId/end", authMiddleware, callCtrl.endCall);

// missed
router.post("/:callId/missed", authMiddleware, callCtrl.markMissedCall);

// history
router.get("/history", authMiddleware, callCtrl.getCallHistory);

export default router;
