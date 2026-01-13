const BASE_URL = "http://127.0.0.1:8000";
let capturedBlob = null;

async function registerUser() {
  const name = document.getElementById("reg-name").value;
  const email = document.getElementById("reg-email").value;
  const image = document.getElementById("reg-image").files[0];

  if (!name || !email || !image) {
    alert("Fill all fields");
    return;
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("email", email);
  formData.append("image", image);

  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  document.getElementById("output").innerText =
    JSON.stringify(data, null, 2);
}

async function updateUser() {
  const email = document.getElementById("edit-email").value;
  const name = document.getElementById("edit-name").value;
  const image = document.getElementById("edit-image").files[0];

  if (!email) {
    alert("Email is required");
    return;
  }

  const formData = new FormData();
  formData.append("email", email);

  if (name) {
    formData.append("name", name);
  }

  if (image) {
    formData.append("image", image);
  }

  const res = await fetch(`${BASE_URL}/update_user`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  document.getElementById("output").innerText =
    JSON.stringify(data, null, 2);
}
async function startCamera() {
  const video = document.getElementById("video");

  const stream = await navigator.mediaDevices.getUserMedia({
    video: true
  });

  video.srcObject = stream;
}
function captureFace() {
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const preview = document.getElementById("preview");

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(blob => {
    capturedBlob = blob;
    preview.src = URL.createObjectURL(blob);
  }, "image/jpeg");
}
async function markAttendance() {
  const email = document.getElementById("checkin-email").value;

  if (!email || !capturedBlob) {
    alert("Email and face capture required");
    return;
  }

  const formData = new FormData();
  formData.append("email", email);
  formData.append("image", capturedBlob, "face.jpg");

  const res = await fetch(`${BASE_URL}/checkin`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  document.getElementById("output").innerText =
    JSON.stringify(data, null, 2);
}
let frame1 = null;
let frame2 = null;

function captureFrame(num) {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const video = document.getElementById("video");

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(blob => {
    if (num === 1) frame1 = blob;
    else frame2 = blob;
  }, "image/jpeg");
}
let regStream = null;
let regFaceBlob = null;
async function startRegisterCamera() {
  const video = document.getElementById("reg-video");
  const captureBtn = document.getElementById("captureRegBtn");

  try {
    regStream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = regStream;
    captureBtn.disabled = false;
    resultDiv.textContent = "Camera started. Align your face and capture.";
  } catch (err) {
    resultDiv.textContent = "Camera error: " + err.message;
  }
}
function captureRegisterFace() {
  const video = document.getElementById("reg-video");
  const canvas = document.getElementById("reg-canvas");
  const preview = document.getElementById("reg-preview");
  const registerBtn = document.getElementById("registerBtn");

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(blob => {
    regFaceBlob = blob;
    preview.src = URL.createObjectURL(blob);
    preview.style.display = "block";
    registerBtn.disabled = false;
    resultDiv.textContent = "Face captured. Click Register.";
  }, "image/jpeg", 0.9);
}
async function registerUserCamera() {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();

  if (!name || !email || !regFaceBlob) {
    alert("Name, email, and face capture are required");
    return;
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("email", email);
  formData.append("image", regFaceBlob, "face.jpg");

  try {
    resultDiv.textContent = "Registering user...";

    const res = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    resultDiv.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    resultDiv.textContent = "Error: " + err.message;
  }
}
function captureFace() {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(blob => {
    setFaceBlob(blob);
    setFacePreview(URL.createObjectURL(blob));

    // ✅ STOP CAMERA
    const stream = videoRef.current.srcObject;
    stream.getTracks().forEach(track => track.stop());
    videoRef.current.srcObject = null;
  }, "image/jpeg", 0.9);
}


// const RECEPTION_DEVICE_NAME = "RECEPTION_PC_BLE";
// if (device.name === RECEPTION_DEVICE_NAME) {
//     if (device.rssi > -70) {
//         insideReception = true;
//     } else {
//         insideReception = false;
//     }
// }

// if (insideReception) {
//     checkinBtn.disabled = false;
//     statusText.innerText = "Inside reception area";
// } else {
//     checkinBtn.disabled = true;
//     statusText.innerText = "Move closer to reception";
// }
