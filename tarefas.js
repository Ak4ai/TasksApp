import { auth } from './auth.js';
import { db } from './firebase-config.js';
import { collection, getDocs, getDoc, doc, updateDoc, deleteDoc,Timestamp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

let carregandoTarefas = false;
let tempoMaisRecente = null;
let intervaloContador = null;
let tarefasFuturas = [];
let tarefasVencidas = [];


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
        'periodico': document.querySelector('#tarefas-periodico .tasks-container'),
        'nao-periodico': document.querySelector('#tarefas-nao-periodico .tasks-container'),
        'personalizado': document.querySelector('#tarefas-personalizado .tasks-container'),
    };
  
    // limpar todos
    Object.values(containers).forEach(c => c.innerHTML = '');
    
    // ordenar por dataLimite asc
    tarefas.sort((a, b) => a.dataLimite - b.dataLimite);

    
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
          periodico: 'Importante Periódico',
          'nao-periodico': 'Importante Não-Periódico',
          personalizado: 'Personalizado'
        }[tipo]}
      </span>
    `;
  
    div.addEventListener('click', () => abrirModalDetalhe(t));
    containers[tipo].appendChild(div);
  });
  
  

    // Ordena e filtra futuras
    tarefas.sort((a, b) => a.dataLimite - b.dataLimite);
    tarefasFuturas = tarefas.filter(t => t.dataLimite >= agora);
    tarefasVencidas = tarefas.filter(t => t.dataLimite < agora);
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
    atualizarXP(tarefasVencidas);
}

function atualizarXP(tarefasConcluidas) {
  const xpPorTarefa = 10;
  const xpTotal = tarefasConcluidas.length * xpPorTarefa;
  const nivel = Math.floor(xpTotal / 100) + 1;
  const xpAtual = xpTotal % 100;
  const porcentagem = Math.min(100, (xpAtual / 100) * 100);

  const xpInfo = document.querySelector('.xp-info');
  if (!xpInfo) return;

  xpInfo.querySelector('strong').textContent = `Nível ${nivel}`;
  xpInfo.querySelector('.xp-fill').style.width = `${porcentagem}%`;
  xpInfo.querySelector('span').textContent = `XP: ${xpAtual} / 100`;
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
    document.getElementById('tipo-tarefa').value = {
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

function atualizarContadorProximaTarefa() {
  const span = document.querySelector('.next-event');

  clearInterval(intervaloContador);

  intervaloContador = setInterval(() => {
      const agora = new Date();

      // Remove vencidas da lista
      tarefasFuturas = tarefasFuturas.filter(t => t.dataLimite > agora);
      tempoMaisRecente = tarefasFuturas.length ? tarefasFuturas[0].dataLimite : null;

      if (!tempoMaisRecente) {
          span.textContent = '⏰ Sem tarefas futuras';
          return;
      }

      const diff = tempoMaisRecente - agora;
      if (diff <= 0) {
          span.textContent = '⏰ Tarefa vencida!';
      } else {
          const horas = Math.floor(diff / (1000 * 60 * 60));
          const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const segundos = Math.floor((diff % (1000 * 60)) / 1000);
          span.textContent = `⏰ Próx. em ${horas}h ${minutos}m ${segundos}s`;
      }
  }, 1000);
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
  document.querySelector('.next-event').addEventListener('click', () => {

    const modalNextEvent = document.getElementById('modal-next-event');  // Novo modal para o "Next Event"
    if (modalNextEvent.style.display === 'flex') {
      return;  
    }
    modalNextEvent.style.display = 'flex';
    const contentNextEvent = document.querySelector('#modal-next-event .modal-content');

    // Criando a lista de tarefas vencidas
    const listaVencidas = tarefasVencidas.map(t => {
        const data = t.dataLimite.toLocaleString('pt-BR');
        return `<li><strong>${t.descricao}</strong> - Vencida em: ${data}</li>`;
    }).join('');

    // Criando a lista de tarefas futuras e calculando o tempo restante
    const listaFuturas = tarefasFuturas.map(t => {
        const dataLimite = new Date(t.dataLimite);
        const tempoRestante = calcularTempoRestante(dataLimite);  // Função que calcula o tempo restante
        const data = dataLimite.toLocaleString('pt-BR');
        return `<li><strong>${t.descricao}</strong> - Próximo evento em: ${data} (Restante: ${tempoRestante})</li>`;
    }).join('');

    // Atualizando o conteúdo do modal
    contentNextEvent.innerHTML = `
        <span id="fechar-modal-next-event" class="close-button">&times;</span>
        <h2>Tarefas Vencidas</h2>
        <ul>${listaVencidas || '<em>Nenhuma tarefa vencida.</em>'}</ul>

        <h2>Próximos Eventos</h2>
        <ul>${listaFuturas || '<em>Nenhum evento futuro.</em>'}</ul>
    `;

    // Evento de fechar o modal
    document.getElementById('fechar-modal-next-event').onclick = () => {
        document.getElementById('modal-next-event').style.display = 'none';
    };
});

// Função que calcula o tempo restante até a tarefa futura
function calcularTempoRestante(dataLimite) {
    const agora = new Date();
    const diff = dataLimite - agora;  // Diferença em milissegundos
    if (diff <= 0) {
        return "Já passou";
    }

    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${dias} dias, ${horas} horas e ${minutos} minutos`;
}


