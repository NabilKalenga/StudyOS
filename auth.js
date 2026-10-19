
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const form = document.getElementById("signupForm");
const message = document.getElementById("message");
const button = document.getElementById("signupButton");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword =
    document.getElementById("confirmPassword").value;

  message.textContent = "";

  if (password !== confirmPassword) {
    message.textContent = "Your passwords do not match.";
    return;
  }

  button.disabled = true;
  button.textContent = "Creating account...";

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await updateProfile(credential.user, {
      displayName: name
    });

    message.style.color = "#78e6ad";
    message.textContent = "Account created! Opening StudyOS...";

    window.location.href = "index.html";
  } catch (error) {
    const messages = {
      "auth/email-already-in-use": "This email already has an account. Try logging in.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/weak-password": "Choose a stronger password.",
      "auth/operation-not-allowed": "Enable Email/Password in Firebase Authentication.",
      "auth/network-request-failed": "Check your internet connection."
    };

    message.style.color = "#ffaaaa";
    message.textContent =
      messages[error.code] || "Could not create your account. Please try again.";
  } finally {
    button.disabled = false;
    button.textContent = "Create account →";
  }
});
