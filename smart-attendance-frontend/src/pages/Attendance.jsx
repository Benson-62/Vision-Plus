import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { BluetoothConnected, Bluetooth } from "lucide-react";
import bleService from "../utils/bleService";

const BASE_URL = "http://127.0.0.1:8000";

export default function Attendance() {
  const videoRef = useRef(null);
  const canvas1Ref = useRef(null);
  const canvas2Ref = useRef(null);

  const navigate = useNavigate();

  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [bleConnected, setBleConnected] = useState(false);
  const [bleError, setBleError] = useState("");

  const TARGET_GATE_NAME = "OnePlus Nord Buds 3";

  const email = localStorage.getItem("email");

  useEffect(() => {
    // Initial check
    const connected = bleService.getConnectedDevices().some(d => d.state === "Connected");
    setBleConnected(connected);

    // Subscribe to live changes
    const unsubscribe = bleService.subscribe((devices) => {
      setBleConnected(devices.some(d => d.state === "Connected"));
    });

    return () => unsubscribe();
  }, []);

  async function connectBLE() {
    setBleError("");
    try {
      await bleService.connectDevice(TARGET_GATE_NAME);
    } catch (err) {
      setBleError(`Failed to find ${TARGET_GATE_NAME}. Ensure Gate BLE is nearby.`);
    }
  }

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
    } catch {
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.9);
    });
  }

  /* ================= ATTENDANCE ================= */
  async function markAttendance() {
    if (!email) {
      setMessage("❌ Not logged in");
      return;
    }

    if (!cameraReady) {
      setMessage("❌ Start camera first");
      return;
    }

    if (!bleConnected) {
      setMessage("❌ You must be in range of the Gate BLE device");
      return;
    }

    setLoading(true);
    setMessage("Perform liveness (blink or move head)…");

    try {
      const img1 = await captureFrame(canvas1Ref);
      await new Promise(r => setTimeout(r, 1000));
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

      if (!res.ok || data.status !== "success") {
        throw new Error(data.detail || data.reason || "Attendance failed");
      }

      setMessage("✅ Attendance marked successfully");

      // ✅ REDIRECT BACK TO DASHBOARD
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);

    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Mark Attendance">
      <div style={{ display: "grid", gap: 16 }}>

        {/* VIDEO */}
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

        {/* HIDDEN CANVAS */}
        <canvas ref={canvas1Ref} hidden />
        <canvas ref={canvas2Ref} hidden />

        {/* BLE STATUS CARD */}
        <div style={{
          padding: 12,
          borderRadius: 8,
          backgroundColor: "#f3f4f6",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <strong>Location Status: </strong>
            <br />
            {bleConnected ? (
              <span style={{ color: "green", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                <BluetoothConnected size={16} /> Verified (In Range)
              </span>
            ) : (
              <span style={{ color: "#d97706", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                <Bluetooth size={16} /> Not Verified
              </span>
            )}
          </div>
          {!bleConnected && (
            <button
              onClick={connectBLE}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              Verify BLE
            </button>
          )}
        </div>
        {bleError && <p style={{ color: "red", fontSize: 13, margin: 0 }}>{bleError}</p>}

        {/* CONTROLS */}
        <button onClick={startCamera}>
          Start Camera
        </button>

        <button
          onClick={markAttendance}
          disabled={!cameraReady || loading || !bleConnected}
          style={{ opacity: (!cameraReady || loading || !bleConnected) ? 0.6 : 1 }}
        >
          {loading ? "Checking…" : "Mark Attendance"}
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
