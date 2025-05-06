import { auth } from './auth.js';
import { db } from './firebase-config.js';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

let carregandoTarefas = false;
let tempoMaisRecente = null;
let intervaloContador = null;

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

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const dataLimite = data.dataLimite?.toDate
            ? data.dataLimite.toDate()
            : new Date(data.dataLimite);
        tarefas.push({ id: docSnap.id, descricao: data.descricao, dataLimite });
    });

    // Ordena e filtra futuras
    tarefas.sort((a, b) => a.dataLimite - b.dataLimite);
    const tarefasFuturas = tarefas.filter(t => t.dataLimite >= agora);
    tempoMaisRecente = tarefasFuturas.length ? tarefasFuturas[0].dataLimite : null;

    atualizarContadorProximaTarefa();

    tarefas.forEach(t => {
        if (t.dataLimite < agora) {
            adicionarNaCard(t, 'purple-card');
        } else {
            adicionarNaCard(t, 'blue-card');
        }
    });

    carregandoTarefas = false;
}

function limparCards() {
    document.querySelector('.blue-card').innerHTML = '<span class="card-title">TAREFAS A REALIZAR</span>';
    document.querySelector('.purple-card').innerHTML = '<span class="card-title">TAREFAS REALIZADAS</span>';
}

function adicionarNaCard(tarefa, cardClass) {
    const card = document.querySelector(`.${cardClass}`);
    if (card.querySelector(`[data-id="${tarefa.id}"]`)) return;

    const p = document.createElement('p');
    const dataFormatada = tarefa.dataLimite.toLocaleDateString('pt-BR');
    const horaFormatada = tarefa.dataLimite.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    p.textContent = `${tarefa.descricao} - até ${dataFormatada} às ${horaFormatada}`;
    p.setAttribute('data-id', tarefa.id);
    p.addEventListener('click', () => abrirModalEdicao(tarefa));

    card.appendChild(p);
}

async function atualizarTarefaNoFirestore(id, descricao, dataLimite) {
    const usuario = auth.currentUser;
    const refDoc = doc(db, "usuarios", usuario.uid, "tarefas", id);
    await updateDoc(refDoc, { descricao, dataLimite });
}

async function excluirTarefaDoFirestore(id) {
    const usuario = auth.currentUser;
    const refDoc = doc(db, "usuarios", usuario.uid, "tarefas", id);
    await deleteDoc(refDoc);
}

function abrirModalEdicao(tarefa) {
    const modal = document.getElementById('modal-tarefa');
    modal.style.display = 'flex';

    document.getElementById('editar-descricao').value = tarefa.descricao;
    document.getElementById('editar-dataLimite').value = tarefa.dataLimite.toISOString().slice(0,16);

    document.getElementById('salvar-edicao').onclick = async () => {
        const novaDesc = document.getElementById('editar-descricao').value;
        const novaData = new Date(document.getElementById('editar-dataLimite').value);
        await atualizarTarefaNoFirestore(tarefa.id, novaDesc, novaData);
        modal.style.display = 'none';
        carregarTarefas();
    };

    document.getElementById('excluir-tarefa').onclick = async () => {
        await excluirTarefaDoFirestore(tarefa.id);
        modal.style.display = 'none';
        carregarTarefas();
    };

    document.getElementById('fechar-modal-editar').onclick = () => {
        modal.style.display = 'none';
    };
}

function atualizarContadorProximaTarefa() {
    const span = document.querySelector('.next-event');
    if (!tempoMaisRecente) {
        span.textContent = '⏰ N/a';
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
        const horas = Math.floor(diff / (1000*60*60));
        const minutos = Math.floor((diff % (1000*60*60))/(1000*60));
        const segundos = Math.floor((diff % (1000*60))/1000);
        span.textContent = `⏰ ${horas}h ${minutos}m ${segundos}s`;
    }

    atualizar();
    clearInterval(intervaloContador);
    intervaloContador = setInterval(atualizar, 1000);
}

function atualizarDataAtual() {
    const span = document.querySelector('.current-day');
    const agora = new Date();
    const opcoes = { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' };
    span.textContent = '📅 ' + agora.toLocaleDateString('pt-BR', opcoes).replace(/^\w/, c=>c.toUpperCase());
}

export { carregarTarefas, tempoMaisRecente, atualizarDataAtual };
