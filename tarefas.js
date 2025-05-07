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
        tarefas.push({
          id: docSnap.id,
          descricao: data.descricao,
          dataLimite: data.dataLimite.toDate(),
          tipo: data.tipo || 'personalizado',
          frequencia: data.frequencia,
          padraoPersonalizado: data.padraoPersonalizado
        });
      });
      
      await ajustarRecurrentes(tarefas);
      

    // mapa de containers por tipo
    const containers = {
        periodico: document.querySelector('#tarefas-periodico .tasks-container'),
        'nao-periodico': document.querySelector('#tarefas-nao-periodico .tasks-container'),
        personalizado: document.querySelector('#tarefas-personalizado .tasks-container'),
    };
  
    // limpar todos
    Object.values(containers).forEach(c => c.innerHTML = '');
    
    // ordenar por dataLimite asc
    tarefas.sort((a,b) => a.dataLimite - b.dataLimite);
    
    tarefas.forEach(t => {
        const now = new Date();
        if (t.dataLimite < now) return;
  
    const div = document.createElement('div');
    div.classList.add('task-rect');
    // Isto aqui faz o CSS colorir conforme o tipo
    const tipo = t.tipo || 'personalizado';
    div.setAttribute('data-tipo', tipo);
  
    div.setAttribute('data-id', t.id);
    div.innerHTML = `
      <strong>${t.descricao}</strong><br>
      <small>Até: ${t.dataLimite.toLocaleString('pt-BR')}</small>
      <!-- badge oculta, só aparece no hover -->
      <span class="tipo-badge">
        ${{
          periodico: 'Importante Não-Periódico',
          'nao-periodico': 'Importante Periódico',
          personalizado: 'Personalizado'
        }[tipo]}
      </span>
    `;
  
    div.addEventListener('click', () => abrirModalDetalhe(t));
    containers[tipo].appendChild(div);
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
    //p.addEventListener('click', () => abrirModalEdicao(tarefa)); COMENTADO POR ENQUANTO

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

function abrirModalDetalhe(tarefa) {
    const modal = document.getElementById('modal-tarefa');
    modal.style.display = 'flex';
  
    document.getElementById('editar-descricao').value = tarefa.descricao;
    document.getElementById('editar-dataLimite').value = tarefa.dataLimite.toISOString().slice(0,16);
    document.getElementById('tipo-tarefa').textContent = {
      'periodico': 'Importante Periódico',
      'nao-periodico': 'Não Periódico',
      'personalizado': 'Personalizado'
    }[tarefa.tipo];

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

async function ajustarRecurrentes(tarefas) {
    const usuario = auth.currentUser;
    const updates = []; // { id, newDate }[]
  
    tarefas.forEach(t => {
      if (t.tipo !== 'periodico') return;
  
      let next = new Date(t.dataLimite);
      const agora = new Date();
  
      // enquanto a data já tiver passado, gere a próxima
      while (next < agora) {
        switch (t.frequencia) {
          case 'diario':
            next.setDate(next.getDate() + 1);
            break;
          case 'semanal':
            next.setDate(next.getDate() + 7);
            break;
          case 'mensal':
            next.setMonth(next.getMonth() + 1);
            break;
          default:
            // se for um número de dias
            if (typeof t.frequencia === 'number') {
              next = new Date(next.getTime() + t.frequencia * 86400000);
            } else {
              return;
            }
        }
      }
  
      // se mudou, agenda update
      if (next.getTime() !== t.dataLimite.getTime()) {
        updates.push({ id: t.id, novaData: next });
        t.dataLimite = next;  // já altera no objeto para renderização
      }
    });
  
    // faz os updates em lote
    await Promise.all(updates.map(u => {
      const refDoc = doc(db, "usuarios", usuario.uid, "tarefas", u.id);
      return updateDoc(refDoc, { dataLimite: Timestamp.fromDate(u.novaData) });
    }));
  }
  