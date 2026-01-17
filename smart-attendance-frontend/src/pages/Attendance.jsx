import { useRef, useState } from "react";
import Layout from "../components/Layout";

const BASE_URL = "http://127.0.0.1:8000";

export default function Attendance() {
  const videoRef = useRef(null);
  const canvas1Ref = useRef(null);
  const canvas2Ref = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const email = localStorage.getItem("email");

  /* ================= CAMERA ================= */
  async function startCamera() {
    setMessage("");
    setCameraReady(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;

      videoRef.current.onloadedmetadata = () => {
        setCameraReady(true);
      };
    } catch (err) {
      setMessage("❌ Camera access denied");
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }

  function captureFrame(canvasRef) {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !video.srcObject) {
      throw new Error("Camera not running");
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error("Camera not ready");
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.9);
    });
  }

  /* ================= ATTENDANCE (LIVENESS) ================= */
  async function markAttendance() {
    if (!email) {
      setMessage("❌ Not logged in");
      return;
    }

    if (!cameraReady) {
      setMessage("❌ Start camera first");
      return;
    }

    setLoading(true);
    setMessage("Perform liveness (blink or move head)…");

    try {
      // Frame 1
      const img1 = await captureFrame(canvas1Ref);

      // Wait 1 second (liveness)
      await new Promise(r => setTimeout(r, 1000));

      // Frame 2
      const img2 = await captureFrame(canvas2Ref);

      stopCamera();

      const fd = new FormData();
      fd.append("email", email);
      fd.append("image1", img1, "frame1.jpg");
      fd.append("image2", img2, "frame2.jpg");

      const res = await fetch(`${BASE_URL}/checkin_live`, {
        method: "POST",
        body: fd
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Attendance failed");
      }

      if (data.status !== "success") {
        throw new Error(data.reason || "Face mismatch / liveness failed");
      }

      setMessage("✅ Attendance marked successfully");

    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Mark Attendance">
      <div style={{ display: "grid", gap: 16 }}>

        {/* VIDEO FEED */}
        <div style={{ position: "relative" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            width="100%"
            height="260"
            style={{ borderRadius: 12 }}
          />

          {/* FACE ALIGNMENT GUIDE */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 170,
              height: 170,
              borderRadius: "50%",
              border: "3px dashed #4da3ff",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none"
            }}
          />
        </div>

        {/* HIDDEN CANVASES */}
        <canvas ref={canvas1Ref} hidden />
        <canvas ref={canvas2Ref} hidden />

        {/* CONTROLS */}
        <button onClick={startCamera}>
          Start Camera
        </button>

        <button
          onClick={markAttendance}
          disabled={!cameraReady || loading}
        >
          {loading ? "Checking…" : "Mark Attendance"}
        </button>

        {/* STATUS MESSAGE */}
        {message && (
          <p style={{ textAlign: "center" }}>
            {message}
          </p>
        )}
      </div>
    </Layout>
  );
}
