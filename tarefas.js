import { auth } from './auth.js';
import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, Timestamp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

let carregandoTarefas = false;

async function carregarTarefas() {
    if (carregandoTarefas) return;
    carregandoTarefas = true;

    const usuario = auth.currentUser;
    if (!usuario) {
        carregandoTarefas = false;
        return;
    }

    limparCards();

    const tarefasRef = collection(db, "usuarios", usuario.uid, "tarefas");
    const snapshot = await getDocs(tarefasRef);
    const agora = new Date();

    snapshot.forEach(doc => {
        const tarefa = doc.data();
        const dataLimite = tarefa.dataLimite?.toDate 
            ? tarefa.dataLimite.toDate() 
            : new Date(tarefa.dataLimite);

        if (dataLimite < agora) {
            adicionarNaCard(tarefa, 'purple-card', dataLimite);
        } else {
            adicionarNaCard(tarefa, 'blue-card', dataLimite);
        }
    });

    carregandoTarefas = false;
}

function limparCards() {
    document.querySelector('.blue-card').innerHTML = `
        <span class="card-title">TAREFAS</span>    
    `;
    document.querySelector('.purple-card').innerHTML = `
        <span class="card-title">TAREFAS</span>    
    `;
}

function adicionarNaCard(tarefa, cardClass, dataLimite) {
    const card = document.querySelector(`.${cardClass}`);
    const tarefaId = `${tarefa.descricao}-${dataLimite.toISOString()}`;

    // Verifica se já existe
    if (card.querySelector(`[data-id="${tarefaId}"]`)) return;

    const p = document.createElement("p");
    p.textContent = tarefa.descricao + " - até " + dataLimite.toLocaleDateString();
    p.setAttribute("data-id", tarefaId);

    card.appendChild(p);
}

export { carregarTarefas };
