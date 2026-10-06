import type { Request, Response } from "express";
import { pool } from "../db.js";
import bcrypt from "bcrypt";

const getExpiryDate = (planType: "monthly" | "yearly") => {
  const expiresAt = new Date();

  if (planType === "monthly") {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  } else {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }

  return expiresAt;
};

export const subscribeToCourse = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId, courseId, planType, password } = req.body;

    // Check required fields
    if (!userId || !courseId || !planType || !password) {
      return res.status(400).json({
        message:
          "userId, courseId, planType and password are required",
      });
    }

    // Check plan type
    if (planType !== "monthly" && planType !== "yearly") {
      return res.status(400).json({
        message: "Invalid subscription plan",
      });
    }

    // Get user's password hash
    const userResult = await pool.query(
      `
      SELECT id, password_hash
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(
      password,
      userResult.rows[0].password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Incorrect password",
      });
    }

    // Check course exists
    const courseResult = await pool.query(
      `
      SELECT id
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

    // Check existing subscription that is still valid
    // (expired rows no longer block a new subscription)
    const existingResult = await pool.query(
      `
      SELECT *
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

    const expiresAt = getExpiryDate(planType);

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];

      // Already on the yearly plan: nothing to upgrade to
      if (existing.plan_type === "yearly") {
        return res.status(400).json({
          message:
            "You already have an active yearly subscription for this course",
          subscription: existing,
        });
      }

      // Monthly subscribers can only move up to yearly
      if (planType === "monthly") {
        return res.status(400).json({
          message:
            "You already have an active monthly subscription. Choose the yearly plan to upgrade.",
          subscription: existing,
        });
      }

      // UPGRADE: monthly -> yearly.
      // The yearly period starts today and replaces the monthly one.
      const upgradeResult = await pool.query(
        `
        UPDATE course_subscriptions
        SET
          plan_type = 'yearly',
          started_at = CURRENT_TIMESTAMP,
          expires_at = $1
        WHERE id = $2
        RETURNING *
        `,
        [expiresAt, existing.id]
      );

      return res.status(200).json({
        message: "Subscription upgraded to yearly",
        subscription: upgradeResult.rows[0],
      });
    }

    // No valid subscription: create a new one
    const result = await pool.query(
      `
      INSERT INTO course_subscriptions (
        user_id,
        course_id,
        plan_type,
        status,
        started_at,
        expires_at
      )
      VALUES (
        $1,
        $2,
        $3,
        'active',
        CURRENT_TIMESTAMP,
        $4
      )
      RETURNING *
      `,
      [userId, courseId, planType, expiresAt]
    );

    return res.status(201).json({
      message: "Course subscription created successfully",
      subscription: result.rows[0],
    });
  } catch (error) {
    console.error("Subscription error:", error);

    return res.status(500).json({
      message: "Unable to create subscription",
    });
  }
};