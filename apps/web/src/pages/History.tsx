import { useEffect, useState } from "react";
import "../styles/history.css";

export interface HistoryVideo {
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

// Shape returned by GET /video-session/history?userId=...
interface HistoryItem {
  videoId: string;
  courseId: string;
  courseTitle: string;
  videoTitle: string;
  videoDescription: string;
  youtubeUrl: string;
  videoOrder: number;
  durationSeconds: number | null;
  watchedSeconds: number;
  videoProgress: number;
  videoCompleted: boolean;
  lastWatchedAt: string;
}

interface HistoryProps {
  userId: string;
  onBack: () => void;
  onOpenVideo: (video: HistoryVideo, courseId: string) => void;
}

function History({ userId, onBack, onOpenVideo }: HistoryProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `http://localhost:5000/learning-history/${encodeURIComponent(
            userId
          )}`
        );

        const data = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setError(data.message || "Unable to load your history.");
          return;
        }

        setItems(Array.isArray(data.history) ? data.history : []);
      } catch (err) {
        if (!cancelled) {
          console.error("History error:", err);
          setError("Unable to load your history. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const formatTime = (seconds: number) => {
    if (!seconds || !Number.isFinite(seconds)) {
      return "0:00";
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const openItem = (item: HistoryItem) => {
    onOpenVideo(
      {
        id: item.videoId,
        title: item.videoTitle,
        description: item.videoDescription,
        youtube_url: item.youtubeUrl,
        video_order: item.videoOrder,
        duration_seconds: item.durationSeconds,
        resumeSeconds: item.watchedSeconds,
        videoProgress: item.videoProgress,
        videoCompleted: item.videoCompleted,
      },
      item.courseId
    );
  };

  const inProgress = items.filter((item) => !item.videoCompleted);
  const completed = items.filter((item) => item.videoCompleted);

  const renderItem = (item: HistoryItem) => (
    <li key={item.videoId} className="history-item">
      <div className="history-item-info">
        <p className="history-course">{item.courseTitle}</p>

        <h3 className="history-video-title">
          Lesson {item.videoOrder}: {item.videoTitle}
        </h3>

        {item.videoCompleted ? (
          <p className="history-meta">
            Completed
            {item.lastWatchedAt && ` on ${formatDate(item.lastWatchedAt)}`}
          </p>
        ) : (
          <>
            <div className="history-bar">
              <div
                className="history-bar-fill"
                style={{
                  width: `${Math.min(100, Math.max(0, item.videoProgress))}%`,
                }}
              />
            </div>

            <p className="history-meta">
              Stopped at {formatTime(item.watchedSeconds)} (
              {Math.round(item.videoProgress)}% watched)
              {item.lastWatchedAt && ` · ${formatDate(item.lastWatchedAt)}`}
            </p>
          </>
        )}
      </div>

      <button
        type="button"
        className="history-action"
        onClick={() => openItem(item)}
      >
        {item.videoCompleted ? "Watch again" : "Resume"}
      </button>
    </li>
  );

  return (
    <div className="history-page">
      <button type="button" className="history-back" onClick={onBack}>
        ← Back to Home
      </button>

      <h1 className="history-title">Your history</h1>

      {loading && <p className="history-message">Loading your history…</p>}

      {!loading && error && (
        <p className="history-message history-error">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="history-message">
          You haven't watched any videos yet. Open a course to get started.
        </p>
      )}

      {!loading && !error && inProgress.length > 0 && (
        <section className="history-section">
          <h2>Continue watching</h2>
          <ul className="history-list">{inProgress.map(renderItem)}</ul>
        </section>
      )}

      {!loading && !error && completed.length > 0 && (
        <section className="history-section">
          <h2>Completed</h2>
          <ul className="history-list">{completed.map(renderItem)}</ul>
        </section>
      )}
    </div>
  );
}

export default History;