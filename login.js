
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAIRxjalis8bF2H2WPUG4TwCo6t9ygo3Dw",
  authDomain: "studyos-74dcb.firebaseapp.com",
  projectId: "studyos-74dcb",
  storageBucket: "studyos-74dcb.firebasestorage.app",
  messagingSenderId: "177623662603",
  appId: "1:177623662603:web:7fe46cbf03a6771ce4870e",
  measurementId: "G-P3CD9LPHC4"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const form = document.getElementById("loginForm");
const message = document.getElementById("message");
const button = document.getElementById("loginButton");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  message.textContent = "";
  button.disabled = true;
  button.textContent = "Logging in...";

  try {
    await signInWithEmailAndPassword(auth, email, password);

    message.style.color = "#78e6ad";
    message.textContent = "Login successful! Opening StudyOS...";

    window.location.href = "index.html";
  } catch (error) {
    const messages = {
      "auth/invalid-credential":
        "Incorrect email or password. Check your details and try again.",
      "auth/user-not-found":
        "No account found. Please create an account first.",
      "auth/wrong-password":
        "Incorrect password. Please try again.",
      "auth/invalid-email":
        "Please enter a valid email address.",
      "auth/too-many-requests":
        "Too many attempts. Please wait and try again."
    };

    message.style.color = "#ffaaaa";
    message.textContent =
      messages[error.code] || "Login failed. Check your connection and try again.";
  } finally {
    button.disabled = false;
    button.textContent = "Log in →";
  }
});
