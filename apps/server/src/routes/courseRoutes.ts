import { Router } from "express";

import {
  getUserCourses,
  getCourseVideos,
} from "../controllers/courseController.js";

import {
  startVideoSession,
  updateVideoProgress,
  getVideoProgress,
  getLearningHistory,
} from "../controllers/sessionController.js";

const router = Router();

// --------------------------------------------------
// Courses
// --------------------------------------------------

router.get(
  "/courses/:userId",
  getUserCourses
);

router.get(
  "/courses/:courseId/videos",
  getCourseVideos
);

// --------------------------------------------------
// Video Session / Resume
// --------------------------------------------------

router.post(
  "/video-session/start",
  startVideoSession
);

router.put(
  "/video-session/progress",
  updateVideoProgress
);

router.get(
  "/video-session/progress",
  getVideoProgress
);

// --------------------------------------------------
// Learning History
// --------------------------------------------------

router.get(
  "/learning-history/:userId",
  getLearningHistory
);

export default router;