import type { Request, Response } from "express";
import { pool } from "../db.js";

/*
|--------------------------------------------------------------------------
| Start Video Session
|--------------------------------------------------------------------------
| Creates a session_activity row when the user opens a video.
|
| If the user already has progress for this video, we return the latest
| progress so the frontend can resume from that position.
|--------------------------------------------------------------------------
*/

export const startVideoSession = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      userId,
      courseId,
      videoId,
    } = req.body;

    if (!userId || !courseId || !videoId) {
      return res.status(400).json({
        message:
          "userId, courseId and videoId are required",
      });
    }

    // --------------------------------------------------
    // 1. Verify that the user has access to the course
    // --------------------------------------------------

    const subscriptionResult =
      await pool.query(
        `
        SELECT id
        FROM course_subscriptions
        WHERE user_id = $1
          AND course_id = $2
          AND status = 'active'
          AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [userId, courseId]
      );

    if (subscriptionResult.rows.length === 0) {
      return res.status(403).json({
        message:
          "You need an active subscription to watch this video",
      });
    }

    // --------------------------------------------------
    // 2. Verify that the video belongs to the course
    // --------------------------------------------------

    const videoResult = await pool.query(
      `
      SELECT id
      FROM course_videos
      WHERE id = $1
        AND course_id = $2
      `,
      [videoId, courseId]
    );

    if (videoResult.rows.length === 0) {
      return res.status(404).json({
        message:
          "Video not found in this course",
      });
    }

    // --------------------------------------------------
    // 3. Check previous progress
    // --------------------------------------------------

    const previousSessionResult =
      await pool.query(
        `
        SELECT
          id,
          watched_seconds,
          video_progress,
          video_completed,
          last_activity
        FROM session_activity
        WHERE user_id = $1
          AND course_id = $2
          AND video_id = $3
        ORDER BY last_activity DESC
        LIMIT 1
        `,
        [userId, courseId, videoId]
      );

    // --------------------------------------------------
    // 4. If progress already exists, reuse that session
    // --------------------------------------------------

    if (previousSessionResult.rows.length > 0) {
      const previousSession =
        previousSessionResult.rows[0];

      await pool.query(
        `
        UPDATE session_activity
        SET last_activity = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [previousSession.id]
      );

      return res.status(200).json({
        message:
          "Video session resumed",

        session: previousSession,

        resume: {
          watchedSeconds:
            previousSession.watched_seconds || 0,

          videoProgress:
            Number(
              previousSession.video_progress || 0
            ),

          videoCompleted:
            previousSession.video_completed || false,
        },
      });
    }

    // --------------------------------------------------
    // 5. Create a new session
    // --------------------------------------------------

    const result = await pool.query(
      `
      INSERT INTO session_activity (
        user_id,
        course_id,
        video_id,
        watched_seconds,
        video_progress,
        video_completed,
        last_activity
      )
      VALUES (
        $1,
        $2,
        $3,
        0,
        0,
        false,
        CURRENT_TIMESTAMP
      )
      RETURNING *
      `,
      [userId, courseId, videoId]
    );

    return res.status(201).json({
      message: "Video session started",

      session: result.rows[0],

      resume: {
        watchedSeconds: 0,
        videoProgress: 0,
        videoCompleted: false,
      },
    });
  } catch (error) {
    console.error(
      "Error starting video session:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to start video session",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Update Video Progress
|--------------------------------------------------------------------------
| Saves the user's current position in the video.
|
| This is what allows Resume to work.
|--------------------------------------------------------------------------
*/

export const updateVideoProgress = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      sessionId,
      watchedSeconds,
      videoProgress,
      videoCompleted,
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        message: "sessionId is required",
      });
    }

    // --------------------------------------------------
    // Validate values
    // --------------------------------------------------

    const safeWatchedSeconds = Math.max(
      0,
      Math.floor(
        Number(watchedSeconds) || 0
      )
    );

    const safeVideoProgress = Math.min(
      100,
      Math.max(
        0,
        Number(videoProgress) || 0
      )
    );

    const safeVideoCompleted =
      Boolean(videoCompleted);

    // --------------------------------------------------
    // Update progress
    // --------------------------------------------------

    const result = await pool.query(
      `
      UPDATE session_activity
      SET
        watched_seconds = $1,
        video_progress = $2,
        video_completed = $3,
        last_activity = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
      `,
      [
        safeWatchedSeconds,
        safeVideoProgress,
        safeVideoCompleted,
        sessionId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message:
          "Video session not found",
      });
    }

    return res.json({
      message:
        "Video progress updated",

      session: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Error updating video progress:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to update video progress",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get Video Progress
|--------------------------------------------------------------------------
| Used by the frontend when it needs to explicitly retrieve the saved
| resume position for a video.
|--------------------------------------------------------------------------
*/

export const getVideoProgress = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      userId,
      courseId,
      videoId,
    } = req.query;

    if (
      typeof userId !== "string" ||
      typeof courseId !== "string" ||
      typeof videoId !== "string"
    ) {
      return res.status(400).json({
        message:
          "userId, courseId and videoId are required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        user_id,
        course_id,
        video_id,
        watched_seconds,
        video_progress,
        video_completed,
        last_activity
      FROM session_activity
      WHERE user_id = $1
        AND course_id = $2
        AND video_id = $3
      ORDER BY last_activity DESC
      LIMIT 1
      `,
      [
        userId,
        courseId,
        videoId,
      ]
    );

    if (result.rows.length === 0) {
      return res.json({
        progress: null,

        resume: {
          watchedSeconds: 0,
          videoProgress: 0,
          videoCompleted: false,
        },
      });
    }

    const session = result.rows[0];

    return res.json({
      progress: session,

      resume: {
        watchedSeconds:
          session.watched_seconds || 0,

        videoProgress:
          Number(
            session.video_progress || 0
          ),

        videoCompleted:
          session.video_completed || false,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching video progress:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to fetch video progress",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get Learning History
|--------------------------------------------------------------------------
| Uses session_activity as our history table.
|
| Returns ONE row per video the user has watched:
|   - the latest position (from the most recent session for that video)
|   - completed = true if ANY session for that video was completed
|   - login/logout rows (video_id IS NULL) are ignored
|   - videos opened but never played (0 seconds, not completed) are hidden
|
| Route: GET /learning-history/:userId
|--------------------------------------------------------------------------
*/

export const getLearningHistory = async (
  req: Request,
  res: Response
) => {
  try {
    // Works with /learning-history/:userId and /learning-history?userId=...
    const userId =
      req.params.userId ??
      (typeof req.query.userId === "string"
        ? req.query.userId
        : undefined);

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    const result = await pool.query(
      `
      WITH latest AS (
        SELECT DISTINCT ON (video_id)
          video_id,
          course_id,
          watched_seconds,
          video_progress,
          last_activity
        FROM session_activity
        WHERE user_id = $1
          AND video_id IS NOT NULL
        ORDER BY video_id, last_activity DESC
      ),
      done AS (
        SELECT
          video_id,
          BOOL_OR(video_completed) AS completed
        FROM session_activity
        WHERE user_id = $1
          AND video_id IS NOT NULL
        GROUP BY video_id
      )
      SELECT
        l.video_id,
        l.course_id,
        c.title AS course_title,

        cv.title AS video_title,
        cv.description AS video_description,
        cv.youtube_url,
        cv.video_order,
        cv.duration_seconds,

        l.watched_seconds,
        l.video_progress,
        d.completed AS video_completed,
        l.last_activity AS last_watched_at

      FROM latest l
      JOIN done d
        ON d.video_id = l.video_id
      JOIN course_videos cv
        ON cv.id = l.video_id
      LEFT JOIN courses c
        ON c.id = l.course_id

      WHERE l.watched_seconds > 0
         OR d.completed = true

      ORDER BY l.last_activity DESC
      `,
      [userId]
    );

    const history = result.rows.map((row) => ({
      videoId: row.video_id,
      courseId: row.course_id,
      courseTitle: row.course_title || "",
      videoTitle: row.video_title,
      videoDescription: row.video_description || "",
      youtubeUrl: row.youtube_url,
      videoOrder: row.video_order,
      durationSeconds: row.duration_seconds,
      watchedSeconds: Number(row.watched_seconds) || 0,
      videoProgress: Number(row.video_progress) || 0,
      videoCompleted: Boolean(row.video_completed),
      lastWatchedAt: row.last_watched_at,
    }));

    return res.json({ history });
  } catch (error) {
    console.error(
      "Error fetching learning history:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to fetch learning history",
    });
  }
};