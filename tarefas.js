import { auth } from './auth.js';
import { db } from './firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

let carregandoTarefas = false;
let tempoMaisRecente = null; // <- variável global exportável

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

    const tarefas = [];

    snapshot.forEach(doc => {
        const tarefa = doc.data();
        const dataLimite = tarefa.dataLimite?.toDate 
            ? tarefa.dataLimite.toDate() 
            : new Date(tarefa.dataLimite);
        tarefas.push({ ...tarefa, dataLimite });
    });

    // Ordenar pela data mais próxima
    tarefas.sort((a, b) => a.dataLimite - b.dataLimite);

    // Salvar o tempo da tarefa mais urgente (se existir)
    if (tarefas.length > 0) {
        tempoMaisRecente = tarefas[0].dataLimite;
    }

    // Adicionar as tarefas ao card correspondente
    tarefas.forEach(tarefa => {
        if (tarefa.dataLimite < agora) {
            adicionarNaCard(tarefa, 'purple-card', tarefa.dataLimite);
        } else {
            adicionarNaCard(tarefa, 'blue-card', tarefa.dataLimite);
        }
    });

    carregandoTarefas = false;

    // Depois de definir tempoMaisRecente
    if (tarefas.length > 0) {
        tempoMaisRecente = tarefas[0].dataLimite;
        atualizarContadorProximaTarefa(); // 👈 Aqui
    }

}

function limparCards() {
    document.querySelector('.blue-card').innerHTML = `
        <span class="card-title">TAREFAS A REALIZAR</span>    
    `;
    document.querySelector('.purple-card').innerHTML = `
        <span class="card-title">TAREFAS REALIZADAS</span>    
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

let intervaloContador = null;

function atualizarContadorProximaTarefa() {
    const span = document.querySelector('.next-event');
    if (!tempoMaisRecente || !(tempoMaisRecente instanceof Date)) {
        span.textContent = '⏰ Nenhuma tarefa pendente';
        return;
    }

    function atualizar() {
        const agora = new Date();
        const diff = tempoMaisRecente - agora;

        if (diff <= 0) {
            span.textContent = '⏰ Tarefa vencida!';
            clearInterval(intervaloContador);
            return;
        }

        const horas = Math.floor(diff / (1000 * 60 * 60));
        const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diff % (1000 * 60)) / 1000);

        span.textContent = `⏰ ${horas}h ${minutos}m ${segundos}s`;
    }

    // Atualiza agora e inicia intervalo
    atualizar();
    clearInterval(intervaloContador); // Limpa contador anterior se existir
    intervaloContador = setInterval(atualizar, 1000);
}

function atualizarDataAtual() {
    const span = document.querySelector('.current-day');
    const agora = new Date();

    const opcoes = {
        weekday: 'long',    // Segunda-feira
        day: 'numeric',     // 23
        month: 'numeric',      // Abril
        year: 'numeric'     // 2025
    };

    // Exibe: 📅 quarta-feira, 23 de abril de 2025
    span.textContent = '📅 ' + agora.toLocaleDateString('pt-BR', opcoes).replace(/^\w/, c => c.toUpperCase());
}



export { carregarTarefas, tempoMaisRecente };
export { atualizarDataAtual }; // <- exporta a função para uso em auth.js