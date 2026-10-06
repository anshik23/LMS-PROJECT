import type { Request, Response } from "express";
import { pool } from "../db.js";

export const getUserCourses = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await pool.query(
      `
      SELECT
        c.id,
        c.title,
        c.description,
        c.thumbnail_url,

        COUNT(cv.id)::INTEGER AS total_videos,

        COALESCE(
          SUM(cv.duration_seconds),
          0
        )::INTEGER AS total_duration_seconds

      FROM courses c

      LEFT JOIN course_videos cv
        ON cv.course_id = c.id

      GROUP BY
        c.id,
        c.title,
        c.description,
        c.thumbnail_url

      ORDER BY c.created_at DESC
      `
    );

    res.json({
      courses: result.rows,
    });
  } catch (error) {
    console.error(
      "Error fetching courses:",
      error
    );

    res.status(500).json({
      message: "Unable to fetch courses",
    });
  }
};

export const getCourseVideos = async (
  req: Request,
  res: Response
) => {
  try {
    const { courseId } = req.params;
    const { userId } = req.query;

    if (typeof userId !== "string") {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    // Get course information
    const courseResult = await pool.query(
      `
      SELECT
        id,
        title,
        description,
        thumbnail_url
      FROM courses
      WHERE id = $1
      `,
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    // Find the user's active subscription
    const subscriptionResult =
      await pool.query(
        `
        SELECT
          plan_type,
          status,
          expires_at
        FROM course_subscriptions
        WHERE user_id = $1
          AND course_id = $2
          AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [userId, courseId]
      );

    let planType:
      | "monthly"
      | "full_course"
      | null = null;

    if (
      subscriptionResult.rows.length > 0
    ) {
      const subscription =
        subscriptionResult.rows[0];

      // Check whether a monthly subscription has expired
      if (
        subscription.plan_type ===
          "monthly" &&
        subscription.expires_at &&
        new Date(subscription.expires_at) <
          new Date()
      ) {
        await pool.query(
          `
          UPDATE course_subscriptions
          SET status = 'expired'
          WHERE user_id = $1
            AND course_id = $2
            AND status = 'active'
            AND plan_type = 'monthly'
          `,
          [userId, courseId]
        );
      } else {
        planType = subscription.plan_type;
      }
    }

    // Get all videos for the course
    const videosResult = await pool.query(
      `
      SELECT
        id,
        title,
        description,
        youtube_url,
        video_order,
        duration_seconds
      FROM course_videos
      WHERE course_id = $1
      ORDER BY video_order ASC
      `,
      [courseId]
    );

    // Decide which videos the user can access
    const videos = videosResult.rows.map(
      (video) => {
        const isAccessible =
          planType === "full_course" ||
          (
            planType === "monthly" &&
            video.video_order <= 3
          );

        return {
          ...video,
          isAccessible,
        };
      }
    );

    res.json({
      course: courseResult.rows[0],

      subscription: {
        planType,
        isSubscribed: planType !== null,
      },

      videos,
    });
  } catch (error) {
    console.error(
      "Error fetching course videos:",
      error
    );

    res.status(500).json({
      message:
        "Unable to fetch course videos",
    });
  }
};