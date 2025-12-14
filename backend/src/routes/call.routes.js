// src/routes/call.routes.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  startCall,
  acceptCall,
  rejectCall,
  endCall,
  getCallHistory,
  markMissedCall
} from "../controllers/call.controller.js";

const router = express.Router();

router.post("/start", authMiddleware, startCall);
router.post("/:callId/accept", authMiddleware, acceptCall);
router.post("/:callId/reject", authMiddleware, rejectCall);
router.post("/:callId/end", authMiddleware, endCall);
router.post("/:callId/missed", authMiddleware, markMissedCall);
router.get("/history", authMiddleware, getCallHistory);

export default router;
