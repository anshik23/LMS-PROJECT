import { useEffect, useState } from "react";

interface HomeProps {
  userId: string;
  onOpenCourse: (courseId: string) => void;
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  total_videos: number;
  total_duration_seconds: number;
}

function Home({
  userId,
  onOpenCourse,
}: HomeProps) {
  const [courses, setCourses] =
    useState<Course[]>([]);

  const [message, setMessage] =
    useState("Loading courses...");

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/courses/${userId}`
        );

        const data =
          await response.json();

        if (response.ok) {
          setCourses(data.courses);
          setMessage("");
        } else {
          setMessage(
            data.message ||
              "Unable to load courses"
          );
        }
      } catch (error) {
        console.error(
          "Course fetch error:",
          error
        );

        setMessage(
          "Unable to connect to server"
        );
      }
    };

    if (userId) {
      fetchCourses();
    }
  }, [userId]);

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

  return (
    <div
      style={{
        padding: "30px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <h1>Welcome to DemoProject 👋</h1>

      <h2>Explore Courses 🎓</h2>

      {message && <p>{message}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "25px",
          marginTop: "25px",
        }}
      >
        {courses.map((course) => (
          <div
            key={course.id}
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: "16px",
              overflow: "hidden",
              background: "#fff",
              boxShadow:
                "0 4px 15px rgba(0,0,0,0.08)",
            }}
          >
            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                style={{
                  width: "100%",
                  height: "170px",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  height: "170px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f5f5f5",
                }}
              >
                No Thumbnail
              </div>
            )}

            <div
              style={{
                padding: "20px",
              }}
            >
              <h3>{course.title}</h3>

              <p>
                {course.description}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "15px",
                  margin: "15px 0",
                }}
              >
                <span>
                  📚 {course.total_videos}
                  {" "}Videos
                </span>

                <span>
                  ⏱{" "}
                  {formatDuration(
                    course.total_duration_seconds
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  onOpenCourse(course.id)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >
                View Course
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;