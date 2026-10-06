import { useEffect, useState } from "react";

interface Video {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  video_order: number;
  duration_seconds: number | null;
  isAccessible: boolean;

  // Saved position for Resume
  resumeSeconds?: number;
  videoProgress?: number;
  videoCompleted?: boolean;
}

interface CourseProps {
  courseId: string;
  userId: string;
  onBack: () => void;
  onWatchVideo: (video: Video) => void;
  onSubscribe: () => void;
}

interface CourseData {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
}

interface Subscription {
  planType: "monthly" | "yearly" | null;
  isSubscribed: boolean;
  expiresAt?: string | null;
}

function Course({
  courseId,
  userId,
  onBack,
  onWatchVideo,
  onSubscribe,
}: CourseProps) {
  const [videos, setVideos] = useState<Video[]>([]);

  const [course, setCourse] =
    useState<CourseData | null>(null);

  const [subscription, setSubscription] =
    useState<Subscription>({
      planType: null,
      isSubscribed: false,
      expiresAt: null,
    });

  const [message, setMessage] =
    useState("Loading course...");

  const [loadingVideoId, setLoadingVideoId] =
    useState<string | null>(null);

  // --------------------------------------------------
  // Fetch course and videos
  // --------------------------------------------------

  useEffect(() => {
    const fetchCourseVideos = async () => {
      try {
        setMessage("Loading course...");

        const response = await fetch(
          `http://localhost:5000/courses/${courseId}/videos?userId=${userId}`
        );

        const data = await response.json();

        if (!response.ok) {
          setMessage(
            data.message ||
              "Unable to load course"
          );
          return;
        }

        setCourse(data.course);
        setVideos(data.videos);
        setSubscription(data.subscription);
        setMessage("");
      } catch (error) {
        console.error(
          "Course error:",
          error
        );

        setMessage(
          "Unable to connect to server"
        );
      }
    };

    fetchCourseVideos();
  }, [courseId, userId]);

  // --------------------------------------------------
  // Start video + get Resume position
  // --------------------------------------------------

  const handleWatchVideo = async (
    video: Video
  ) => {
    try {
      setLoadingVideoId(video.id);

      const response = await fetch(
        "http://localhost:5000/video-session/start",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            courseId,
            videoId: video.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            "Unable to start video"
        );
        return;
      }

      // Get saved resume information
      const resumeSeconds =
        Number(
          data.resume?.watchedSeconds || 0
        );

      const videoProgress =
        Number(
          data.resume?.videoProgress || 0
        );

      const videoCompleted =
        Boolean(
          data.resume?.videoCompleted
        );

      // Pass the video + resume information
      // to the video player
      onWatchVideo({
        ...video,
        resumeSeconds,
        videoProgress,
        videoCompleted,
      });
    } catch (error) {
      console.error(
        "Start video error:",
        error
      );

      alert(
        "Unable to connect to server"
      );
    } finally {
      setLoadingVideoId(null);
    }
  };

  // --------------------------------------------------
  // Course duration
  // --------------------------------------------------

  const totalDuration = videos.reduce(
    (total, video) =>
      total +
      (video.duration_seconds || 0),
    0
  );

  const formatDuration = (
    seconds: number
  ) => {
    const hours = Math.floor(
      seconds / 3600
    );

    const minutes = Math.floor(
      (seconds % 3600) / 60
    );

    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }

    return `${minutes} min`;
  };

  // --------------------------------------------------
  // Format subscription expiry
  // --------------------------------------------------

  const formatExpiry = (
    date: string | null | undefined
  ) => {
    if (!date) {
      return "";
    }

    return new Date(
      date
    ).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div
      style={{
        padding: "30px",
        maxWidth: "1000px",
        margin: "0 auto",
      }}
    >
      {/* Back Button */}

      <button
        type="button"
        onClick={onBack}
        style={{
          marginBottom: "25px",
          padding: "10px 16px",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        ← Back to My Courses
      </button>

      {/* Loading / Error Message */}

      {message && (
        <p>{message}</p>
      )}

      {course && (
        <>
          {/* ==================================================
              COURSE HEADER
          ================================================== */}

          <div
            style={{
              border:
                "1px solid #e5e5e5",
              borderRadius: "18px",
              overflow: "hidden",
              background: "#fff",
              boxShadow:
                "0 4px 15px rgba(0,0,0,0.08)",
            }}
          >
            {course.thumbnail_url ? (
              <img
                src={
                  course.thumbnail_url
                }
                alt={course.title}
                style={{
                  width: "100%",
                  height: "300px",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  height: "300px",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  background: "#f5f5f5",
                }}
              >
                No Thumbnail
              </div>
            )}

            <div
              style={{
                padding: "30px",
              }}
            >
              <h1>
                {course.title}
              </h1>

              <p
                style={{
                  lineHeight: "1.6",
                  color: "#555",
                }}
              >
                {course.description}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "30px",
                  marginTop: "20px",
                  flexWrap:
                    "wrap",
                }}
              >
                <span>
                  📚{" "}
                  <strong>
                    {videos.length}
                  </strong>{" "}
                  Videos
                </span>

                <span>
                  ⏱{" "}
                  <strong>
                    {formatDuration(
                      totalDuration
                    )}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* ==================================================
              SUBSCRIPTION SECTION
          ================================================== */}

          <div
            style={{
              marginTop: "30px",
              padding: "25px",
              border:
                "1px solid #e5e5e5",
              borderRadius: "16px",
              background: "#fff",
            }}
          >
            {subscription.isSubscribed ? (
              <>
                <h2>
                  ✓ You are subscribed
                </h2>

                <p>
                  Plan:{" "}
                  <strong>
                    {subscription.planType ===
                    "monthly"
                      ? "Monthly"
                      : "Yearly"}
                  </strong>
                </p>

                {subscription.expiresAt && (
                  <p
                    style={{
                      color: "#666",
                    }}
                  >
                    Access until:{" "}
                    <strong>
                      {formatExpiry(
                        subscription.expiresAt
                      )}
                    </strong>
                  </p>
                )}

{subscription.planType === "monthly" ? (
  <div style={{ marginTop: "15px" }}>
    <p>
      Want a full year of access? Upgrade to the
      yearly plan (₹4,999 / year).
    </p>

    <button
      type="button"
      onClick={onSubscribe}
      style={{
        padding: "10px 20px",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "600",
      }}
    >
      Upgrade to Yearly
    </button>
  </div>
) : (
  <p>You have access to all course videos.</p>
)}
              </>
            ) : (
              <>
                <h2>
                  Subscribe to this
                  course
                </h2>

                <p>
                  Get access to all
                  videos and course
                  content.
                </p>

                <button
                  type="button"
                  onClick={
                    onSubscribe
                  }
                  style={{
                    padding:
                      "12px 24px",
                    border: "none",
                    borderRadius:
                      "10px",
                    cursor:
                      "pointer",
                    fontWeight:
                      "600",
                  }}
                >
                  Subscribe to
                  Course
                </button>
              </>
            )}
          </div>

          {/* ==================================================
              COURSE VIDEOS
          ================================================== */}

          <div
            style={{
              marginTop: "30px",
            }}
          >
            <h2>
              Course Videos
            </h2>

            {videos.map(
              (video) => (
                <div
                  key={video.id}
                  style={{
                    marginTop:
                      "15px",
                    padding:
                      "20px",
                    border:
                      "1px solid #e5e5e5",
                    borderRadius:
                      "12px",
                    background:
                      "#fff",
                  }}
                >
                  <h3>
                    {video.video_order}.{" "}
                    {video.title}
                  </h3>

                  <p
                    style={{
                      color: "#666",
                    }}
                  >
                    {
                      video.description
                    }
                  </p>

                  {subscription.isSubscribed &&
                  video.isAccessible ? (
                    <>
                      {/* Resume information */}
                      {video.videoCompleted && (
                        <p
                          style={{
                            color:
                              "green",
                            fontWeight:
                              "600",
                          }}
                        >
                          ✓ Completed
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleWatchVideo(
                            video
                          )
                        }
                        disabled={
                          loadingVideoId ===
                          video.id
                        }
                        style={{
                          padding:
                            "9px 18px",
                          border:
                            "none",
                          borderRadius:
                            "8px",
                          cursor:
                            loadingVideoId ===
                            video.id
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {loadingVideoId ===
                        video.id
                          ? "Loading..."
                          : "▶ Watch Video"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Subscribe to access this video"
                      style={{
                        padding:
                          "9px 18px",
                        border:
                          "none",
                        borderRadius:
                          "8px",
                        cursor:
                          "not-allowed",
                      }}
                    >
                      🔒 Subscribe to
                      Unlock
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Course;