// src/routes/admin.routes.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import * as AdminCtrl from "../controllers/admin.controller.js";

const router = express.Router();

// All admin routes require auth + admin check
router.use(authMiddleware, isAdmin);

/* ====== Stats ====== */
// global numeric dashboard
router.get("/stats/global", AdminCtrl.getGlobalStats);

// by chat
router.get("/stats/chat/:chatId", AdminCtrl.getChatStats);

// by user
router.get("/stats/user/:userId", AdminCtrl.getUserStats);

// calls summary
router.get("/stats/calls", AdminCtrl.getCallStats);

// media counts (global or per chat), supports ?period=day|month|quarter|half|year
router.get("/stats/media", AdminCtrl.getMediaStats);

// activity timeline (hourly/daily/monthly/... )
router.get("/stats/activity", AdminCtrl.getActivityTimeline);

// top n chats/users
router.get("/stats/top", AdminCtrl.getTopEntities);

// Promote/demote users + export user summary
router.post("/users/:userId/promote", AdminCtrl.promoteUser);
router.post("/users/:userId/demote", AdminCtrl.demoteUser);
router.get("/users/:userId/export", AdminCtrl.exportUserSummary);

export default router;
