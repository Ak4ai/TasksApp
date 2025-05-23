// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"; // <-- IMPORTANTE

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAlAcMD-HOn2EKiraMUUMCqno_59TlHhFQ",
    authDomain: "tasks-dc58c.firebaseapp.com",
    projectId: "tasks-dc58c",
    storageBucket: "tasks-dc58c.firebasestorage.app",
    messagingSenderId: "38066305641",
    appId: "1:38066305641:web:bbd50f93070832198c80f8",
    measurementId: "G-T5FDLX0CYZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app); // <-- INICIALIZA Firestore

export { app, db }; // <-- Agora pode exportar com segurança
