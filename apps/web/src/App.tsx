import { useEffect, useState } from "react";
import "./styles/global.css";

import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import Course from "./pages/Course";
import VideoPlayer from "./pages/VideoPlayer";
import Subscription from "./pages/Subscription";
import ConfirmSubscription from "./pages/ConfirmSubscription";
import History from "./pages/History";

type Page =
  | "welcome"
  | "login"
  | "register"
  | "forgotPassword"
  | "resetPassword"
  | "home"
  | "history"
  | "course"
  | "video"
  | "subscription"
  | "confirmSubscription";

interface Video {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  video_order: number;
  duration_seconds: number | null;

  resumeSeconds?: number;
  videoProgress?: number;
  videoCompleted?: boolean;
}

interface LoginData {
  activityId: string;
  loginTime?: string;
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

function App() {
  const [page, setPage] = useState<Page>("welcome");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activityId, setActivityId] = useState("");
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");

  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  // Where the "Back" button of the video player should return to
  // (the course page, or the history page).
  const [videoReturnPage, setVideoReturnPage] = useState<"course" | "history">(
    "course"
  );

  const [selectedPlan, setSelectedPlan] = useState<
    "monthly" | "yearly" | null
  >(null);

  const [resetToken, setResetToken] = useState("");

  // Used to force Course.tsx to reload after a successful subscription.
  const [courseRefreshKey, setCourseRefreshKey] = useState(0);

  // ==================================================
  // CHECK EXISTING LOGIN
  // ==================================================

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        return;
      }

      const user = JSON.parse(savedUser);

      if (!user?.id) {
        localStorage.removeItem("user");
        return;
      }

      setUserId(user.id);
      setIsLoggedIn(true);
      setPage("home");
    } catch (error) {
      console.error("Saved user error:", error);
      localStorage.removeItem("user");
    }
  }, []);

  // ==================================================
  // LOGOUT
  // ==================================================

  const handleLogout = async () => {
    try {
      if (activityId) {
        const response = await fetch("http://localhost:5000/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityId }),
        });

        const data = await response.json();

        console.log("LOGOUT RESPONSE:", data);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("user");

      setIsLoggedIn(false);
      setActivityId("");
      setUserId("");
      setCourseId("");
      setSelectedVideo(null);
      setVideoReturnPage("course");
      setSelectedPlan(null);
      setResetToken("");
      setCourseRefreshKey(0);

      setPage("welcome");
    }
  };

  // ==================================================
  // VIDEO PLAYER
  // ==================================================

  if (page === "video") {
    if (!selectedVideo || !userId || !courseId) {
      setPage("course");
      return null;
    }

    return (
      <VideoPlayer
        key={selectedVideo.id}
        video={selectedVideo}
        userId={userId}
        courseId={courseId}
        onBack={() => {
          setSelectedVideo(null);
          setPage(videoReturnPage);
        }}
      />
    );
  }

  // ==================================================
  // CONFIRM SUBSCRIPTION
  // ==================================================

  if (page === "confirmSubscription") {
    if (!selectedPlan) {
      setPage("subscription");
      return null;
    }

    return (
      <ConfirmSubscription
        userId={userId}
        courseId={courseId}
        planType={selectedPlan}
        onBack={() => {
          setPage("subscription");
        }}
        onConfirm={() => {
          console.log("SUBSCRIPTION SUCCESS:", selectedPlan);

          // Clear selected plan
          setSelectedPlan(null);

          // Force Course.tsx to fetch the new subscription status.
          setCourseRefreshKey((previous) => previous + 1);

          // Return to course
          setPage("course");
        }}
      />
    );
  }

  // ==================================================
  // SUBSCRIPTION PAGE
  // ==================================================

  if (page === "subscription") {
    if (!userId || !courseId) {
      setPage("home");
      return null;
    }

    return (
      <Subscription
        courseId={courseId}
        userId={userId}
        onBack={() => {
          setPage("course");
        }}
        onContinue={(planType) => {
          setSelectedPlan(planType);
          setPage("confirmSubscription");
        }}
      />
    );
  }

  // ==================================================
  // COURSE PAGE
  // ==================================================

  if (page === "course") {
    if (!courseId || !userId) {
      setPage("home");
      return null;
    }

    return (
      <Course
        key={`${courseId}-${courseRefreshKey}`}
        courseId={courseId}
        userId={userId}
        onBack={() => {
          setPage("home");
        }}
        onWatchVideo={(video) => {
          console.log("OPEN VIDEO:", video);

          setSelectedVideo(video);
          setVideoReturnPage("course");
          setPage("video");
        }}
        onSubscribe={() => {
          setPage("subscription");
        }}
      />
    );
  }

  // ==================================================
  // HISTORY PAGE
  // ==================================================

  if (page === "history") {
    if (!userId) {
      setPage("home");
      return null;
    }

    return (
      <History
        userId={userId}
        onBack={() => {
          setPage("home");
        }}
        onOpenVideo={(video, videoCourseId) => {
          setCourseId(videoCourseId);
          setSelectedVideo(video);
          setVideoReturnPage("history");
          setPage("video");
        }}
      />
    );
  }

  // ==================================================
  // HOME PAGE
  // ==================================================

  if (isLoggedIn && page === "home") {
    return (
      <div>
        <Home
          userId={userId}
          onOpenCourse={(id) => {
            console.log("COURSE ID RECEIVED:", id);

            setCourseId(id);
            setSelectedVideo(null);
            setPage("course");
          }}
        />

        <button
          type="button"
          onClick={() => {
            setPage("history");
          }}
        >
          History
        </button>

        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    );
  }

  // ==================================================
  // WELCOME
  // ==================================================

  if (page === "welcome") {
    return (
      <Welcome
        onLogin={() => {
          setPage("login");
        }}
        onRegister={() => {
          setPage("register");
        }}
      />
    );
  }

  // ==================================================
  // LOGIN
  // ==================================================

  if (page === "login") {
    return (
      <Login
        onLoginSuccess={(data: LoginData) => {
          console.log("LOGIN DATA:", data);

          localStorage.setItem("user", JSON.stringify(data.user));

          setActivityId(data.activityId);
          setUserId(data.user.id);
          setIsLoggedIn(true);

          setPage("home");
        }}
        onForgotPassword={() => {
          setPage("forgotPassword");
        }}
        onBack={() => {
          setPage("welcome");
        }}
      />
    );
  }

  // ==================================================
  // REGISTER
  // ==================================================

  if (page === "register") {
    return (
      <Register
        onBack={() => {
          setPage("welcome");
        }}
        onLogin={() => {
          setPage("login");
        }}
      />
    );
  }

  // ==================================================
  // FORGOT PASSWORD
  // ==================================================

  if (page === "forgotPassword") {
    return (
      <ForgotPassword
        onBack={() => {
          setPage("login");
        }}
        onReset={(token) => {
          setResetToken(token);
          setPage("resetPassword");
        }}
      />
    );
  }

  // ==================================================
  // RESET PASSWORD
  // ==================================================

  if (page === "resetPassword") {
    return (
      <ResetPassword
        resetToken={resetToken}
        onSuccess={() => {
          setResetToken("");
          setPage("login");
        }}
      />
    );
  }

  return null;
}

export default App;