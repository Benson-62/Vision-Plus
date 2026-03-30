import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Camera, RotateCcw } from "lucide-react";
import Layout from "../components/Layout";

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function Signup() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1=Details, 2=Face, 3=Submit

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false
  });

  const [cameraReady, setCameraReady] = useState(false);
  const [faceBlob, setFaceBlob] = useState(null);
  const [preview, setPreview] = useState(null);
  const [captureSuccess, setCaptureSuccess] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [quality, setQuality] = useState({
    brightness: true,
    sharpness: true,
    size: true
  });

  function validatePassword(val) {
    setPassword(val);
    setPasswordStrength({
      length: val.length >= 8 && val.length <= 12,
      upper: /[A-Z]/.test(val),
      lower: /[a-z]/.test(val),
      number: /\d/.test(val),
      special: /[@$!%*?&#^_-]/.test(val)
    });
  }

  function validateUsername(val) {
    const valLower = val.toLowerCase();
    setUsername(valLower);
  }

  function goToFaceStep() {
    if (!name || !email || !password || !username) {
      setMessage("❌ Fill all details first");
      return;
    }

    const isValidPassword = Object.values(passwordStrength).every(Boolean);
    if (!isValidPassword) {
      setMessage("❌ Password does not meet security requirements");
      return;
    }

    if (!/^[a-z0-9_.]+$/.test(username)) {
      setMessage("❌ Username can only contain lowercase letters, numbers, underscores, and dots");
      return;
    }

    setMessage("");
    setStep(2);
  }

  async function startCamera() {
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => setCameraReady(true);
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

  function checkFaceQuality(canvas) {
    const ctx = canvas.getContext("2d");
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = img.data;

    let brightnessSum = 0;

    for (let i = 0; i < data.length; i += 4) {
      brightnessSum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }

    const avgBrightness = brightnessSum / (data.length / 4);
    const brightnessOk = avgBrightness > 60;

    let variance = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      variance += Math.abs(gray - avgBrightness);
    }

    const sharpnessOk = variance / (data.length / 4) > 15;
    const sizeOk = canvas.width > 200 && canvas.height > 200;

    setQuality({ brightness: brightnessOk, sharpness: sharpnessOk, size: sizeOk });

    return brightnessOk && sharpnessOk && sizeOk;
  }

  function captureFace() {
    if (!cameraReady) {
      setMessage("❌ Camera not ready");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const isQualityOk = checkFaceQuality(canvas);
    if (!isQualityOk) {
      setMessage("❌ Improve lighting, keep face steady and closer");
      return;
    }

    canvas.toBlob(blob => {
      setFaceBlob(blob);
      setPreview(URL.createObjectURL(blob));
      stopCamera();
      setCaptureSuccess(true);
      setStep(3);
      setMessage("✅ Face captured successfully");
    }, "image/jpeg", 0.9);
  }

  function retake() {
    setFaceBlob(null);
    setPreview(null);
    setCaptureSuccess(false);
    setMessage("");
    setStep(2);
  }

  async function registerUser() {
    if (!faceBlob) {
      setMessage("❌ Face capture required");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("username", username);
      fd.append("email", email);
      fd.append("password", password);
      fd.append("image", faceBlob, "face.jpg");

      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        body: fd
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");

      setMessage("✅ Registration successful! Redirecting...");
      setTimeout(() => navigate("/"), 1500);

    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="auth-container">

        {/* STEP INDICATOR */}
        <div className="steps">
          <div className={step >= 1 ? "step active" : "step"}>Details</div>
          <div className={step >= 2 ? "step active" : "step"}>Face</div>
          <div className={step >= 3 ? "step active" : "step"}>Submit</div>
        </div>

        <h2 className="auth-title">Create Account</h2>
        <p className="auth-sub">Secure face‑based registration</p>

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <div className="input-icon"><User size={18} /><input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="input-icon"><User size={18} /><input placeholder="Username" value={username} onChange={e => validateUsername(e.target.value)} /></div>
            <div className="input-icon"><Mail size={18} /><input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div className="input-icon"><Lock size={18} /><input type="password" placeholder="Password" value={password} onChange={e => validatePassword(e.target.value)} /></div>

            <div className="password-strength" style={{ fontSize: "0.8rem", textAlign: "left", margin: "10px 0" }}>
              <div style={{ color: passwordStrength.length ? "green" : "gray" }}>8-12 characters: {passwordStrength.length ? "✅" : "❌"}</div>
              <div style={{ color: passwordStrength.upper ? "green" : "gray" }}>Uppercase letter: {passwordStrength.upper ? "✅" : "❌"}</div>
              <div style={{ color: passwordStrength.lower ? "green" : "gray" }}>Lowercase letter: {passwordStrength.lower ? "✅" : "❌"}</div>
              <div style={{ color: passwordStrength.number ? "green" : "gray" }}>Number: {passwordStrength.number ? "✅" : "❌"}</div>
              <div style={{ color: passwordStrength.special ? "green" : "gray" }}>Special Character (@$!%*?&#^_-): {passwordStrength.special ? "✅" : "❌"}</div>
            </div>

            <button onClick={goToFaceStep}>Continue to Face Capture</button>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && !preview && (
          <>
            <div style={{ position: "relative", marginTop: 12 }}>
              <video ref={videoRef} autoPlay playsInline width="100%" height="240" style={{ borderRadius: 16 }} />
              <div className="face-ring" />
            </div>

            <div className="quality-checks">
              <span className={quality.brightness ? "ok" : "fail"}>💡 Lighting</span>
              <span className={quality.sharpness ? "ok" : "fail"}>🔍 Sharpness</span>
              <span className={quality.size ? "ok" : "fail"}>📏 Distance</span>
            </div>

            <button onClick={startCamera}><Camera size={18} /> Start Camera</button>
            <button onClick={captureFace} disabled={!cameraReady}>Capture Face</button>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <img src={preview} alt="Face" style={{ width: 150, margin: "0 auto", display: "block", borderRadius: 16 }} />
            {captureSuccess && <div className="success-check">✓</div>}
            <button className="secondary" onClick={retake}><RotateCcw size={16} /> Retake</button>
            <button onClick={registerUser} disabled={loading}>{loading ? "Registering…" : "Create Account"}</button>
          </>
        )}

        {message && <p style={{ textAlign: "center" }}>{message}</p>}
      </div>

      <canvas ref={canvasRef} hidden />
    </Layout>
  );
}
