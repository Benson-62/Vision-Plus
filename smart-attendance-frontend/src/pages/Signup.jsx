import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const BASE_URL = "http://127.0.0.1:8000";

export default function Signup() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [cameraReady, setCameraReady] = useState(false);
  const [faceBlob, setFaceBlob] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= CAMERA ================= */
  async function startCamera() {
    setMessage("");
    setPreview(null);
    setFaceBlob(null);

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

  function captureFace() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!cameraReady) {
      setMessage("❌ Camera not ready");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      setFaceBlob(blob);
      setPreview(URL.createObjectURL(blob));
      stopCamera();
      setMessage("✅ Face captured. Ready to register.");
    }, "image/jpeg", 0.9);
  }

  function retake() {
    setFaceBlob(null);
    setPreview(null);
    setMessage("");
  }

  /* ================= REGISTER ================= */
  async function registerUser() {
    if (!name || !email || !password || !faceBlob) {
      setMessage("❌ All fields and face capture are required");
      return;
    }

    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("email", email);
      fd.append("password", password);
      fd.append("image", faceBlob, "face.jpg");

      const res = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        body: fd
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Registration failed");
      }

      setMessage("✅ Registration successful! Redirecting to login…");

      setTimeout(() => {
        navigate("/");
      }, 1500);

    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Create Account">
      <div style={{ display: "grid", gap: 14 }}>

        <input
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {/* CAMERA */}
        {!preview && (
          <div style={{ position: "relative" }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              width="100%"
              height="260"
              style={{ borderRadius: 12 }}
            />

            {/* FACE GUIDE */}
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
        )}

        <canvas ref={canvasRef} hidden />

        {!preview && (
          <>
            <button onClick={startCamera}>
              Start Camera
            </button>

            <button
              onClick={captureFace}
              disabled={!cameraReady}
            >
              Capture Face
            </button>
          </>
        )}

        {/* PREVIEW */}
        {preview && (
          <>
            <p style={{ textAlign: "center", color: "#9aa4b2" }}>
              Captured Face
            </p>

            <img
              src={preview}
              alt="Captured face"
              style={{
                width: 160,
                margin: "0 auto",
                borderRadius: 12,
                border: "2px solid #4da3ff"
              }}
            />

            <button className="secondary" onClick={retake}>
              Retake
            </button>
          </>
        )}

        <button
          onClick={registerUser}
          disabled={loading}
        >
          {loading ? "Registering…" : "Register"}
        </button>

        {message && (
          <p style={{ textAlign: "center" }}>
            {message}
          </p>
        )}

      </div>
    </Layout>
  );
}
