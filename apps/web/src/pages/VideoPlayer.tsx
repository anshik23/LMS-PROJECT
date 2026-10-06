import { useEffect, useMemo, useRef, useState } from "react";
import YouTube from "react-youtube";
import type { YouTubeProps } from "react-youtube";
import "../styles/videoplayer.css";

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

interface VideoPlayerProps {
  video: Video;
  userId: string;
  courseId: string;
  onBack: () => void;
}

const API_BASE = "http://localhost:5000";

function VideoPlayer({ video, userId, courseId, onBack }: VideoPlayerProps) {
  // The YouTube player instance. Always access it inside try/catch,
  // because it can be destroyed while timers are still running.
  const playerRef = useRef<any>(null);

  // Session id lives in a ref so timers and cleanup always see the latest value.
  const sessionIdRef = useRef("");

  // Last known position/duration, used when the player is already destroyed
  // (for example when saving on unmount).
  const lastTimeRef = useRef(0);
  const lastDurationRef = useRef(0);
  const hasPlayedRef = useRef(false);
  const completedRef = useRef(false);

  const [playerReady, setPlayerReady] = useState(false);
  const [resumeReady, setResumeReady] = useState(false);
  const [resumeStart, setResumeStart] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(video.resumeSeconds || 0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const progressInterval = useRef<number | null>(null);
  const hideControlsTimeout = useRef<number | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  const getYouTubeVideoId = (url: string) => {
    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.hostname.includes("youtu.be")) {
        return parsedUrl.pathname.replace("/", "").split("?")[0];
      }

      const videoId = parsedUrl.searchParams.get("v");
      if (videoId) {
        return videoId;
      }

      const embedMatch = parsedUrl.pathname.match(/\/embed\/([^/]+)/);
      if (embedMatch) {
        return embedMatch[1];
      }

      return "";
    } catch {
      return url.trim().split("/").pop()?.split("?")[0] || "";
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || !Number.isFinite(seconds)) {
      return "0:00";
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Reads the current time/duration safely. Falls back to the last known
  // values if the player has already been destroyed.
  const readPlayerState = () => {
    try {
      const player = playerRef.current;

      if (player) {
        const current = Number(player.getCurrentTime()) || 0;
        const total = Number(player.getDuration()) || 0;

        lastTimeRef.current = current;
        lastDurationRef.current = total;
      }
    } catch {
      // player destroyed, keep the last known values
    }

    return {
      current: lastTimeRef.current,
      total: lastDurationRef.current,
    };
  };

  // --------------------------------------------------
  // Save progress
  // --------------------------------------------------

  const saveProgress = async (
    currentTimeValue: number,
    durationValue: number,
    completed = false
  ) => {
    const sessionId = sessionIdRef.current;

    if (!sessionId || durationValue <= 0) {
      return;
    }

    const progress = Math.min(
      100,
      Math.max(0, (currentTimeValue / durationValue) * 100)
    );

    try {
      const response = await fetch(`${API_BASE}/video-session/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // keepalive lets the request finish even if the page is closing
        keepalive: true,
        body: JSON.stringify({
          sessionId,
          watchedSeconds: Math.floor(currentTimeValue),
          videoProgress: Number(progress.toFixed(2)),
          videoCompleted: completed,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        console.error("Progress save failed:", data);
        return;
      }

      console.log("PROGRESS SAVED:", Math.floor(currentTimeValue), "seconds");
    } catch (error) {
      console.error("Progress save error:", error);
    }
  };

  // --------------------------------------------------
  // Progress timer (saves every 5 seconds while playing)
  // --------------------------------------------------

  const stopProgressTimer = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  const startProgressTimer = () => {
    stopProgressTimer();

    progressInterval.current = window.setInterval(() => {
      const { current, total } = readPlayerState();

      if (total <= 0) {
        return;
      }

      hasPlayedRef.current = true;
      setCurrentTime(current);
      setDuration(total);
      saveProgress(current, total);
    }, 5000);
  };

  // --------------------------------------------------
  // Start / resume session
  // --------------------------------------------------

  useEffect(() => {
    // Ignores the response if this effect was cleaned up (React StrictMode
    // double-mount, or the user moved to another video).
    let cancelled = false;

    const startSession = async () => {
      try {
        sessionIdRef.current = "";
        lastTimeRef.current = 0;
        lastDurationRef.current = 0;
        hasPlayedRef.current = false;
        completedRef.current = false;

        setResumeReady(false);
        setPlayerReady(false);
        setDuration(0);
        setIsPlaying(false);

        const response = await fetch(`${API_BASE}/video-session/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            courseId,
            videoId: video.id,
          }),
        });

        const data = await response.json();

        if (cancelled) {
          return;
        }

        console.log("VIDEO SESSION:", data);

        if (!response.ok) {
          console.error("Unable to start video session:", data.message);
          return;
        }

        sessionIdRef.current = data.session.id;

        const backendResume = Number(data.resume?.watchedSeconds || 0);

        lastTimeRef.current = backendResume;
        setResumeStart(Math.floor(backendResume));
        setCurrentTime(backendResume);

        console.log("RESUME TIME FROM BACKEND:", backendResume);

        // Only now is the YouTube player rendered, already knowing where to start.
        setResumeReady(true);
      } catch (error) {
        if (!cancelled) {
          console.error("Video session error:", error);
        }
      }
    };

    startSession();

    return () => {
      cancelled = true;
    };
  }, [userId, courseId, video.id]);

  // --------------------------------------------------
  // Cleanup on unmount (also saves the last position)
  // --------------------------------------------------

  useEffect(() => {
    return () => {
      stopProgressTimer();

      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
        hideControlsTimeout.current = null;
      }

      if (hasPlayedRef.current && !completedRef.current) {
        const { current, total } = readPlayerState();
        saveProgress(current, total);
      }

      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------
  // Play / Pause
  // --------------------------------------------------

  const togglePlay = () => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    try {
      // setIsPlaying and the timer are handled by the onPlay / onPause events
      if (isPlaying) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    } catch (error) {
      console.error("Play/pause error:", error);
    }
  };

  // --------------------------------------------------
  // Seek
  // --------------------------------------------------

  const seek = (seconds: number) => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    try {
      const current = player.getCurrentTime();
      const total = player.getDuration();
      const newTime = Math.max(0, Math.min(total, current + seconds));

      player.seekTo(newTime, true);
      setCurrentTime(newTime);
    } catch (error) {
      console.error("Seek error:", error);
    }
  };

  const handleSeekBar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    try {
      const newTime = Number(event.target.value);

      player.seekTo(newTime, true);
      setCurrentTime(newTime);
    } catch (error) {
      console.error("Seek error:", error);
    }
  };

  // --------------------------------------------------
  // Volume / mute
  // --------------------------------------------------

  const handleVolume = (event: React.ChangeEvent<HTMLInputElement>) => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    const newVolume = Number(event.target.value);

    player.setVolume(newVolume);
    setVolume(newVolume);

    if (newVolume === 0) {
      player.mute();
      setIsMuted(true);
    } else {
      player.unMute();
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    if (isMuted) {
      player.unMute();
      player.setVolume(volume || 100);
      setIsMuted(false);
    } else {
      player.mute();
      setIsMuted(true);
    }
  };

  // --------------------------------------------------
  // Playback speed
  // --------------------------------------------------

  const changePlaybackRate = (rate: number) => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    player.setPlaybackRate(rate);
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  };

  // --------------------------------------------------
  // Captions
  // --------------------------------------------------

  const toggleCaptions = () => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    try {
      if (captionsEnabled) {
        player.unloadModule("captions");
        setCaptionsEnabled(false);
      } else {
        player.loadModule("captions");
        setCaptionsEnabled(true);
      }
    } catch (error) {
      console.error("Caption error:", error);
    }
  };

  // --------------------------------------------------
  // Fullscreen
  // --------------------------------------------------

  const toggleFullscreen = async () => {
    if (!playerContainerRef.current) {
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await playerContainerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  // --------------------------------------------------
  // Picture in Picture
  // --------------------------------------------------

  const togglePictureInPicture = async () => {
    const iframe = playerContainerRef.current?.querySelector("iframe");

    if (!iframe) {
      return;
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }

      if ("requestPictureInPicture" in iframe) {
        await (
          iframe as HTMLIFrameElement & {
            requestPictureInPicture: () => Promise<void>;
          }
        ).requestPictureInPicture();
      } else {
        alert("Picture-in-Picture is not supported by this browser.");
      }
    } catch (error) {
      console.error("Picture-in-Picture error:", error);
      alert("Picture-in-Picture is not available for this video.");
    }
  };

  // --------------------------------------------------
  // Theater mode
  // --------------------------------------------------

  const toggleTheaterMode = () => {
    setTheaterMode((previous) => !previous);
  };

  // --------------------------------------------------
  // Show / hide controls
  // --------------------------------------------------

  const showControls = () => {
    setControlsVisible(true);

    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }

    if (isPlaying) {
      hideControlsTimeout.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  };

  // --------------------------------------------------
  // Derived values
  // --------------------------------------------------

  const progressPercentage =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const youtubeVideoId = useMemo(
    () => getYouTubeVideoId(video.youtube_url),
    [video.youtube_url]
  );

  // `start` makes YouTube begin at the saved position, so no seekTo is needed.
  const youtubeOptions = useMemo<YouTubeProps["opts"]>(
    () => ({
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 0,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        start: resumeStart,
      },
    }),
    [resumeStart]
  );

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className={`video-player-page ${theaterMode ? "theater-mode" : ""}`}>
      <button className="video-player-back" onClick={onBack}>
        ← Back to Course
      </button>

      <div className="video-header">
        <div>
          <h1 className="video-player-title">{video.title}</h1>
          <p className="video-player-description">{video.description}</p>
        </div>

        <span className="video-progress-badge">
          {Math.round(progressPercentage)}% watched
        </span>
      </div>

      <div
        ref={playerContainerRef}
        className={`video-player-wrapper ${
          theaterMode ? "video-player-theater" : ""
        }`}
        onMouseMove={showControls}
        onMouseEnter={showControls}
      >
        <div
          className="video-frame"
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            minHeight: "400px",
            position: "relative",
          }}
        >
          {resumeReady && (
            <YouTube
              key={video.id}
              videoId={youtubeVideoId}
              opts={youtubeOptions}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
              }}
              iframeClassName="youtube-player-iframe"
              onReady={(event) => {
                console.log("YOUTUBE PLAYER READY");

                playerRef.current = event.target;
                setPlayerReady(true);

                const total = event.target.getDuration();

                lastDurationRef.current = total;
                setDuration(total);
                setVolume(event.target.getVolume());
              }}
              onPlay={() => {
                hasPlayedRef.current = true;
                setIsPlaying(true);
                showControls();
                startProgressTimer();
              }}
              onPause={() => {
                setIsPlaying(false);
                setControlsVisible(true);
                stopProgressTimer();

                const { current, total } = readPlayerState();

                setCurrentTime(current);

                if (!completedRef.current) {
                  saveProgress(current, total);
                }
              }}
              onEnd={(event) => {
                stopProgressTimer();

                const total = event.target.getDuration();

                completedRef.current = true;
                lastTimeRef.current = total;
                lastDurationRef.current = total;

                setCurrentTime(total);
                setIsPlaying(false);
                setControlsVisible(true);

                saveProgress(total, total, true);

                console.log("VIDEO COMPLETED 🎉");
              }}
            />
          )}
        </div>

        {controlsVisible && (
          <div className="video-controls">
            <input
              className="video-progress"
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(currentTime, duration || currentTime)}
              onChange={handleSeekBar}
              style={{
                background: `linear-gradient(
                  to right,
                  #d85b91 ${progressPercentage}%,
                  #f1d6e1 ${progressPercentage}%
                )`,
              }}
            />

            <div className="video-controls-row">
              <button
                className="video-control-button"
                onClick={() => seek(-10)}
                title="Back 10 seconds"
              >
                ↶<span className="skip-number">10</span>
              </button>

              <button
                className="video-control-button video-play-button"
                onClick={togglePlay}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>

              <button
                className="video-control-button"
                onClick={() => seek(10)}
                title="Forward 10 seconds"
              >
                ↷<span className="skip-number">10</span>
              </button>

              <span className="video-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="video-volume">
                <button
                  className="video-control-button"
                  onClick={toggleMute}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? "🔇" : "🔊"}
                </button>

                <input
                  className="video-volume-slider"
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolume}
                />
              </div>

              <button
                className={`video-extra-button ${
                  captionsEnabled ? "active" : ""
                }`}
                onClick={toggleCaptions}
                title="Captions"
              >
                CC
              </button>

              <div className="video-menu-wrapper">
                <button
                  className={`video-extra-button ${
                    showSpeedMenu ? "active" : ""
                  }`}
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  title="Playback speed"
                >
                  {playbackRate}×
                </button>

                {showSpeedMenu && (
                  <div className="video-popup speed-menu">
                    <p>Playback speed</p>

                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        className={playbackRate === rate ? "selected" : ""}
                        onClick={() => changePlaybackRate(rate)}
                      >
                        {rate}×
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="video-menu-wrapper">
                <button
                  className={`video-control-button ${
                    showSettings ? "active" : ""
                  }`}
                  onClick={() => setShowSettings(!showSettings)}
                  title="Settings"
                >
                  ⚙
                </button>

                {showSettings && (
                  <div className="video-popup settings-menu">
                    <p>Player settings</p>

                    <button
                      onClick={() => {
                        toggleCaptions();
                        setShowSettings(false);
                      }}
                    >
                      <span>Captions</span>
                      <strong>{captionsEnabled ? "ON" : "OFF"}</strong>
                    </button>

                    <button
                      onClick={() => {
                        toggleTheaterMode();
                        setShowSettings(false);
                      }}
                    >
                      <span>Theater mode</span>
                      <strong>{theaterMode ? "ON" : "OFF"}</strong>
                    </button>
                  </div>
                )}
              </div>

              <button
                className="video-control-button"
                onClick={togglePictureInPicture}
                title="Picture in Picture"
              >
                ▣
              </button>

              <button
                className={`video-control-button ${
                  theaterMode ? "active" : ""
                }`}
                onClick={toggleTheaterMode}
                title="Theater mode"
              >
                ▭
              </button>

              <button
                className="video-control-button video-fullscreen-button"
                onClick={toggleFullscreen}
                title="Fullscreen"
              >
                ⛶
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="video-bottom-info">
        <p className="video-lesson">Lesson {video.video_order}</p>

        <span>{Math.round(progressPercentage)}% complete</span>
      </div>
    </div>
  );
}

export default VideoPlayer;