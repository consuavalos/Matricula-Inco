import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGhPGRvhrngD5s_RnqmXKB6bAAcrccyGw",
  authDomain: "sistema-matricula-inc-3faf8.firebaseapp.com",
  projectId: "sistema-matricula-inc-3faf8",
  storageBucket: "sistema-matricula-inc-3faf8.firebasestorage.app",
  messagingSenderId: "106448458027",
  appId: "1:106448458027:web:382d46303bbbab0b7fb56e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };