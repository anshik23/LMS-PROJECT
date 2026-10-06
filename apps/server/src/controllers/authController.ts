
import crypto from "crypto";
import type { Request, Response } from "express";
import { pool } from "../db.js";
import bcrypt from "bcrypt";

// =========================
// REGISTER
// =========================

export const register = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      username,
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      dob,
      address,
      phoneNumber,
      gender,
      qualification,
    } = req.body;

    if (
      !username ||
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword ||
      !dob ||
      !address ||
      !phoneNumber ||
      !gender ||
      !qualification
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    const usernameCheck = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (usernameCheck.rows.length > 0) {
      return res.status(409).json({
        message: "Username already exists",
      });
    }

    const emailCheck = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const result = await pool.query(
      `INSERT INTO users (
        username,
        first_name,
        last_name,
        email,
        password_hash,
        dob,
        address,
        phone_number,
        gender,
        qualification
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        id,
        username,
        first_name,
        last_name,
        email,
        created_at`,
      [
        username,
        firstName,
        lastName,
        email,
        hashedPassword,
        dob,
        address,
        phoneNumber,
        gender,
        qualification,
      ]
    );

    res.status(201).json({
      message: "User registered successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      message: "Registration failed",
    });
  }
};

// =========================
// LOGIN
// =========================

export const login = async (
  req: Request,
  res: Response
) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message:
          "Username and password are required",
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    // USER NOT FOUND

    if (result.rows.length === 0) {
      await pool.query(
        `INSERT INTO login_activity
        (email, status, platform, failure_reason)
        VALUES ($1, $2, $3, $4)`,
        [
          null,
          "FAILED",
          "web",
          "USER_NOT_FOUND",
        ]
      );

      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    const user = result.rows[0];

    // CHECK ACCOUNT BLOCK

    if (
      user.is_blocked &&
      user.blocked_until &&
      new Date(user.blocked_until) > new Date()
    ) {
      await pool.query(
        `INSERT INTO login_activity
        (user_id, email, status, platform, failure_reason)
        VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          user.email,
          "FAILED",
          "web",
          "ACCOUNT_BLOCKED",
        ]
      );

      return res.status(403).json({
        message:
          "Account is temporarily blocked. Please try again later.",
      });
    }

    // UNBLOCK EXPIRED ACCOUNT

    if (
      user.is_blocked &&
      user.blocked_until &&
      new Date(user.blocked_until) <= new Date()
    ) {
      await pool.query(
        `UPDATE users
         SET is_blocked = FALSE,
             blocked_until = NULL
         WHERE id = $1`,
        [user.id]
      );
    }

    // CHECK PASSWORD

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    // WRONG PASSWORD

    if (!passwordMatch) {
      const attempts = await pool.query(
        `SELECT COUNT(*) AS count
         FROM login_activity
         WHERE user_id = $1
           AND status = 'FAILED'
           AND failure_reason = 'INVALID_PASSWORD'
           AND login_time >=
               CURRENT_TIMESTAMP - INTERVAL '1 hour'`,
        [user.id]
      );

      const failedAttempts =
        Number(attempts.rows[0].count) + 1;

      await pool.query(
        `INSERT INTO login_activity
        (user_id, email, status, platform, failure_reason)
        VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          user.email,
          "FAILED",
          "web",
          "INVALID_PASSWORD",
        ]
      );

      if (failedAttempts >= 3) {
        await pool.query(
          `UPDATE users
           SET is_blocked = TRUE,
               blocked_until =
                 CURRENT_TIMESTAMP + INTERVAL '1 hour'
           WHERE id = $1`,
          [user.id]
        );

        return res.status(403).json({
          message:
            "Too many failed attempts. Your account has been blocked for 1 hour.",
        });
      }

      return res.status(401).json({
        message:
          `Invalid username or password. Attempt ${failedAttempts} of 3.`,
      });
    }

    // SUCCESSFUL LOGIN

    const activity = await pool.query(
      `INSERT INTO login_activity
      (
        user_id,
        email,
        status,
        platform,
        login_time
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING id, login_time`,
      [
        user.id,
        user.email,
        "SUCCESS",
        "web",
      ]
    );

    res.json({
      message: "Login successful",

      activityId: activity.rows[0].id,

      loginTime: activity.rows[0].login_time,

      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Login failed",
    });
  }
};

// =========================
// LOGOUT
// =========================

export const logout = async (
  req: Request,
  res: Response
) => {
  try {
    const { activityId } = req.body;

    if (!activityId) {
      return res.status(400).json({
        message: "Activity ID is required",
      });
    }

    const result = await pool.query(
      `SELECT login_time
       FROM login_activity
       WHERE id = $1
         AND status = 'SUCCESS'
         AND logout_time IS NULL`,
      [activityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Active login session not found",
      });
    }

    const updateResult = await pool.query(
      `UPDATE login_activity
       SET logout_time = CURRENT_TIMESTAMP,
           duration = CURRENT_TIMESTAMP - login_time
       WHERE id = $1
       RETURNING
         id,
         login_time,
         logout_time,
         duration`,
      [activityId]
    );

    res.json({
      message: "Logout successful",
      activity: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Logout error:", error);

    res.status(500).json({
      message: "Logout failed",
    });
  }
};

// =========================
// FORGOT PASSWORD
// =========================

export const forgotPassword = async (
  req: Request,
  res: Response
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const result = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({
        message:
          "If this email is registered, a password reset option will be available.",
      });
    }

    const userId = result.rows[0].id;

    const resetToken = crypto.randomUUID();

    await pool.query(
      `UPDATE users
       SET reset_token = $1,
           reset_token_expires =
             CURRENT_TIMESTAMP + INTERVAL '15 minutes'
       WHERE id = $2`,
      [resetToken, userId]
    );

    res.json({
      message: "Password reset token generated",
      resetToken,
    });
  } catch (error) {
    console.error(
      "Forgot password error:",
      error
    );

    res.status(500).json({
      message:
        "Unable to process password reset request",
    });
  }
};

// =========================
// RESET PASSWORD
// =========================

export const resetPassword = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      resetToken,
      newPassword,
      confirmPassword,
    } = req.body;

    if (
      !resetToken ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    const result = await pool.query(
      `SELECT id
       FROM users
       WHERE reset_token = $1
         AND reset_token_expires >
             CURRENT_TIMESTAMP`,
      [resetToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    const userId = result.rows[0].id;

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           reset_token = NULL,
           reset_token_expires = NULL,
           is_blocked = FALSE,
           blocked_until = NULL
       WHERE id = $2`,
      [hashedPassword, userId]
    );

    res.json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    res.status(500).json({
      message: "Password reset failed",
    });
  }
};
