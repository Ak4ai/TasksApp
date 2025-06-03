// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"; // <-- IMPORTANTE
import { getMessaging } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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
const messaging = getMessaging(app);


const DIAS_ESPERA = 14;

export async function carregarMeuSimpleID() {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    const idSpan = document.getElementById("id-atual");
    const msgMudanca = document.getElementById("msg-mudanca");

    if (snap.exists()) {
        const data = snap.data();
        const simpleID = data.simpleID || "(não definido)";
        idSpan.textContent = simpleID;

        if (data.lastChange) {
            const ultimaData = data.lastChange.toDate();
            const agora = new Date();
            const diasPassados = Math.floor((agora - ultimaData) / (1000 * 60 * 60 * 24));
            if (diasPassados < DIAS_ESPERA) {
                const restante = DIAS_ESPERA - diasPassados;
                msgMudanca.textContent = `Você poderá mudar seu ID novamente em ${restante} dia(s).`;
                document.getElementById("meu-id-simples").disabled = true;
            } else {
                msgMudanca.textContent = `Você pode mudar seu ID agora.`;
                document.getElementById("meu-id-simples").disabled = false;
            }
        } else {
            msgMudanca.textContent = "Você pode escolher seu ID.";
        }
    } else {
        idSpan.textContent = "(não definido)";
        msgMudanca.textContent = "Você pode escolher seu ID.";
    }
}

async function definirMeuID() {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return alert("Você precisa estar logado.");

    const inputID = document.getElementById("meu-id-simples").value.trim().toLowerCase();
    if (!inputID.match(/^[a-z0-9_]{3,20}$/)) {
        return alert("ID inválido. Use letras, números e underscore (3 a 20 caracteres).");
    }

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const agora = new Date();

    // Verifica se já existe esse ID simples em outro usuário
    const q = query(collection(db, "users"), where("simpleID", "==", inputID));
    const results = await getDocs(q);
    if (!results.empty) {
        const existingUID = results.docs[0].id;
        if (existingUID !== user.uid) {
            return alert("Esse ID já está em uso.");
        }
    }

    // Verifica a última alteração
    if (snap.exists()) {
        const data = snap.data();
        if (data.lastChange) {
            const ultimaData = data.lastChange.toDate();
            const diasPassados = Math.floor((agora - ultimaData) / (1000 * 60 * 60 * 24));
            if (diasPassados < DIAS_ESPERA) {
                return alert(`Você só poderá mudar seu ID em ${DIAS_ESPERA - diasPassados} dia(s).`);
            }
        }
    }

    // Atualiza Firestore
    await setDoc(ref, {
        uid: user.uid,
        simpleID: inputID,
        lastChange: agora
    });

    alert("ID atualizado com sucesso!");
    carregarMeuSimpleID(); // atualiza interface
}


// Chame ao carregar a página:
window.definirMeuID = definirMeuID; // <-- Torna a função acessível globalmente

export { app, db, messaging }; // <-- Agora pode exportar com segurança

