// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"; // <-- IMPORTANTE
import { getMessaging } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";


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

    const ref = doc(db, "usuarios", user.uid);
    const snap = await getDoc(ref);

    // Atualiza TODOS os spans com id="id-atual" e id="id-atual-top"
    const idSpans = [
        ...document.querySelectorAll('#id-atual'),
        ...document.querySelectorAll('#id-atual-top')
    ];
    const idSpanConfig = document.getElementById("id-atual-config");
    const msgMudanca = document.getElementById("msg-mudanca");
    const msgMudancaConfig = document.getElementById("msg-mudanca-config");

    if (snap.exists()) {
        const data = snap.data();
        const simpleID = data.simpleID || "(não definido)";
        idSpans.forEach(span => span.textContent = simpleID);
        if (idSpanConfig) idSpanConfig.textContent = simpleID;

        if (data.lastChange) {
            const ultimaData = data.lastChange.toDate();
            const agora = new Date();
            const diasPassados = Math.floor((agora - ultimaData) / (1000 * 60 * 60 * 24));
            if (diasPassados < DIAS_ESPERA) {
                const restante = DIAS_ESPERA - diasPassados;
                if (msgMudanca) msgMudanca.textContent = `Você poderá mudar seu ID novamente em ${restante} dia(s).`;
                if (msgMudancaConfig) msgMudancaConfig.textContent = `Você poderá mudar seu ID novamente em ${restante} dia(s).`;
                document.getElementById("meu-id-simples").disabled = true;
            } else {
                if (msgMudanca) msgMudanca.textContent = `Você pode mudar seu ID agora.`;
                if (msgMudancaConfig) msgMudancaConfig.textContent = `Você pode mudar seu ID agora.`;
                document.getElementById("meu-id-simples").disabled = false;
            }
        } else {
            if (msgMudanca) msgMudanca.textContent = "Você pode escolher seu ID.";
            if (msgMudancaConfig) msgMudancaConfig.textContent = "Você pode escolher seu ID.";
        }
    } else {
        idSpans.forEach(span => span.textContent = "(não definido)");
        if (idSpanConfig) idSpanConfig.textContent = "(não definido)";
        if (msgMudanca) msgMudanca.textContent = "Você pode escolher seu ID.";
        if (msgMudancaConfig) msgMudancaConfig.textContent = "Você pode escolher seu ID.";
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

    const ref = doc(db, "usuarios", user.uid);
    const snap = await getDoc(ref);
    const agora = new Date();

    // Verifica se já existe esse ID simples em outro usuário
    const q = query(collection(db, "usuarios"), where("simpleID", "==", inputID));
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


async function carregarUsuariosParaAutocomplete() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const snapshot = await getDocs(collection(db, "usuarios"));
  const datalist = document.getElementById("lista-ids");
  datalist.innerHTML = "";

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.simpleID && data.uid !== user.uid) {
      const option = document.createElement("option");
      option.value = data.simpleID;
      datalist.appendChild(option);
    }
  });
}

async function adicionarAmigoPorSimpleID() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return alert("Você precisa estar logado.");

  const inputID = document.getElementById("buscar-amigo").value.trim().toLowerCase();
  if (!inputID) return alert("Digite um ID para buscar.");

  // Busca usuário pelo simpleID
  const q = query(collection(db, "usuarios"), where("simpleID", "==", inputID));
  const res = await getDocs(q);

  if (res.empty) {
    return alert("Usuário não encontrado.");
  }

  const amigoDoc = res.docs[0];
  const amigoUID = amigoDoc.id;

  if (amigoUID === user.uid) {
    return alert("Você não pode adicionar a si mesmo.");
  }

  // Verifica se já existe amizade ou convite entre os dois usuários
  const amizadesRef = collection(db, "amizades");
  const qExistente = query(
    amizadesRef,
    where("from", "in", [user.uid, amigoUID]),
    where("to", "in", [user.uid, amigoUID])
  );
  const snap = await getDocs(qExistente);

  let jaExiste = false;
  snap.forEach(doc => {
    const dados = doc.data();
    // Só considera se NÃO estiver removido ou rejeitado
    if (
      ((dados.from === user.uid && dados.to === amigoUID) ||
      (dados.from === amigoUID && dados.to === user.uid)) &&
      dados.status !== "rejected" &&
      dados.status !== "removed"
    ) {
      jaExiste = true;
    }
  });

  if (jaExiste) {
    return alert("Você já enviou um convite ou já é amigo dessa pessoa!");
  }

  // Cria relação de amizade
  await addDoc(collection(db, "amizades"), {
    from: user.uid,
    to: amigoUID,
    status: "pending",
    timestamp: new Date()
  });

  alert("Pedido de amizade enviado!");
}

async function listarPedidosDeAmizade() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const q = query(
    collection(db, "amizades"),
    where("to", "==", user.uid),
    where("status", "==", "pending")
  );

  const snapshot = await getDocs(q);
  const lista = document.getElementById("lista-pedidos-amizade");
  lista.innerHTML = "";

  for (const docSnap of snapshot.docs) {
    const dados = docSnap.data();
    const idDoc = docSnap.id;

    // Pega o simpleID de quem enviou
    const remetenteSnap = await getDoc(doc(db, "usuarios", dados.from));
    const remetenteID = remetenteSnap.exists() ? remetenteSnap.data().simpleID : "(usuário)";

    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${remetenteID}</strong>
      <button onclick="aceitarPedido('${idDoc}')">Aceitar</button>
      <button onclick="rejeitarPedido('${idDoc}')">Rejeitar</button>
    `;
    lista.appendChild(li);
  }
}

async function aceitarPedido(idDoc) {
  const ref = doc(db, "amizades", idDoc);
  await setDoc(ref, { status: "accepted" }, { merge: true });
  alert("Pedido aceito!");
  listarPedidosDeAmizade();
}

async function rejeitarPedido(idDoc) {
  const ref = doc(db, "amizades", idDoc);
  await setDoc(ref, { status: "rejected" }, { merge: true });
  alert("Pedido rejeitado.");
  listarPedidosDeAmizade();
}

function abrirModalAmigo(nome, uid) {
  document.getElementById('modal-amigo-nome').textContent = nome;
  const modal = document.getElementById('modal-amigo');
  modal.style.display = 'flex';
  // Salva o UID do amigo para usar ao clicar em "Desfazer amizade"
  modal.dataset.uid = uid;
}

export async function listarAmigosAceitos() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const container = document.getElementById("amigos-container");
  container.innerHTML = "";

  // Busca amizades onde o usuário é FROM ou TO e status é accepted
  const q1 = query(collection(db, "amizades"), where("from", "==", user.uid), where("status", "==", "accepted"));
  const q2 = query(collection(db, "amizades"), where("to", "==", user.uid), where("status", "==", "accepted"));

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  // Usar Set de pares ordenados para evitar duplicidade
  const paresAmizade = new Set();

  snap1.forEach(doc => {
    const uid1 = user.uid;
    const uid2 = doc.data().to;
    const chave = [uid1, uid2].sort().join('-');
    paresAmizade.add(chave);
  });
  snap2.forEach(doc => {
    const uid1 = doc.data().from;
    const uid2 = user.uid;
    const chave = [uid1, uid2].sort().join('-');
    paresAmizade.add(chave);
  });

  // Garante que cada UID de amigo só aparece uma vez
  const amigosUIDsSet = new Set();
  Array.from(paresAmizade).forEach(chave => {
    const [uid1, uid2] = chave.split('-');
    if (uid1 === user.uid) amigosUIDsSet.add(uid2);
    else amigosUIDsSet.add(uid1);
  });
  const amigosUnicos = Array.from(amigosUIDsSet);

  for (const uid of amigosUnicos) {
    const userDoc = await getDoc(doc(db, "usuarios", uid));
    const data = userDoc.exists() ? userDoc.data() : null;

    if (data) {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="amigo-nome" style="cursor:pointer;font-weight:bold;">${data.simpleID}</span>
       <small>UID: ${uid}</small>
      `;
      li.addEventListener('click', () => {
        abrirModalAmigo(data.simpleID, uid);
      });
      container.appendChild(li);
    }
  }
}

async function desfazerAmizade(uidAmigo) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  // Busca a amizade (em qualquer direção)
  const amizadesRef = collection(db, "amizades");
  const q = query(
    amizadesRef,
    where("from", "in", [user.uid, uidAmigo]),
    where("to", "in", [user.uid, uidAmigo]),
    where("status", "==", "accepted")
  );
  const snap = await getDocs(q);

  // Marca como "removed" ou deleta
  for (const docSnap of snap.docs) {
    await setDoc(doc(db, "amizades", docSnap.id), { status: "removed" }, { merge: true });
  }

  alert("Amizade desfeita!");
  listarAmigosAceitos();
}




// Chame ao carregar a página:
window.definirMeuID = definirMeuID; // <-- Torna a função acessível globalmente

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-adicionar-amigo").addEventListener("click", adicionarAmigoPorSimpleID);
  document.getElementById("buscar-amigo").addEventListener("focus", carregarUsuariosParaAutocomplete);
  const modal = document.getElementById("modal-amizades");
  const fecharBtn = document.getElementById("fechar-modal-amizades");
  const abrirBtn = document.getElementById("btn-pedidos-amizade");

  abrirBtn.addEventListener("click", () => {
    modal.style.display = "block";
    listarPedidosDeAmizade();
  });

  fecharBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });
});



export { app, db, messaging }; // <-- Agora pode exportar com segurança

window.aceitarPedido = aceitarPedido;
window.rejeitarPedido = rejeitarPedido;
window.listarAmigosAceitos = listarAmigosAceitos;
window.desfazerAmizade = desfazerAmizade;