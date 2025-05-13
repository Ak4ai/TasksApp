import { auth } from './auth.js';
import { db } from './firebase-config.js';
import { collection, getDocs, getDoc, doc, updateDoc, deleteDoc,Timestamp, addDoc } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
export { carregarTarefas, tempoMaisRecente, atualizarDataAtual };

let carregandoTarefas = false;
let tempoMaisRecente = null;
let intervaloContador = null;
let tarefasFuturas = [];
let tarefasExpiradas = [];
let tarefasConcluidas = [];

function renderizarTarefa(t) {
  const div = document.createElement('div');
  div.classList.add('task-rect');
  div.setAttribute('data-id', t.id);
  div.setAttribute('data-tipo', t.tipo || 'personalizado');

  div.innerHTML = `
    <input type="checkbox" class="checkbox-tarefa" title="Marcar como feita" ${t.finalizada ? 'checked' : ''}>
    <strong>${t.descricao}</strong><br>
    <small>Até: ${t.dataLimite.toLocaleString('pt-BR')}</small>
    <span class="tipo-badge">
      ${{
        periodico: 'Importante Periódico',
        'nao-periodico': 'Importante Não-Periódico',
        personalizado: 'Personalizado'
      }[t.tipo || 'personalizado']}
    </span>
  `;

  const checkbox = div.querySelector('.checkbox-tarefa');
  checkbox.addEventListener('click', async (e) => {
  e.stopPropagation();
  const usuario = auth.currentUser;

  // 1) marca no Firestore
  await updateDoc(
    doc(db, "usuarios", usuario.uid, "tarefas", t.id),
    { finalizada: checkbox.checked }
  );

  // 2) se período e marcado, cria próxima instância
  if (t.tipo === 'periodico' && checkbox.checked) {
    await processarTarefaPeriodicaAoMarcar({
      ...t,
      finalizada: true
    });
  }

  // 3) atualiza UI / XP etc.
  carregarTarefas();
});
  

  div.addEventListener('click', () => abrirModalDetalhe(t));

  return div;
}


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
      finalizada: data.finalizada || false,
      frequencia: data.frequencia,
      padraoPersonalizado: data.padraoPersonalizado
    });
  });

  await ajustarRecurrentes(tarefas);

  const containers = {
    'periodico': document.querySelector('#tarefas-periodico .tasks-container'),
    'nao-periodico': document.querySelector('#tarefas-nao-periodico .tasks-container'),
    'personalizado': document.querySelector('#tarefas-personalizado .tasks-container'),
  };

  // LIMPAR CONTAINERS (antes de popular)
  Object.values(containers).forEach(c => c.innerHTML = '');

  // SEPARAR TAREFAS
  tarefasFuturas    = tarefas.filter(t => !t.finalizada && t.dataLimite >= agora);
  tarefasExpiradas  = tarefas.filter(t => !t.finalizada && t.dataLimite <  agora);
  tarefasConcluidas = tarefas.filter(t =>  t.finalizada);

  // ORDENAR POR DATA
  tarefas.sort((a, b) => a.dataLimite - b.dataLimite);

  // RENDERIZAR FUTURAS NAS RESPECTIVAS ABAS
  tarefasFuturas.forEach(t => {
    const div = renderizarTarefa(t);
    containers[t.tipo].appendChild(div);
  });

  // 1) Continua populando os cards que você já tinha
  tarefasExpiradas.forEach(t => adicionarNaCard(t, 'purple-card'));
  tarefasConcluidas.forEach(t => adicionarNaCard(t, 'blue-card'));

  // 2) AQUI VEM A PARTE NOVA: popular TODOS os containers de "expired-tasks" e "completed-tasks"
  
  // Seleciona **todos** os containers de tarefas expiradas
  const allExpiredLists = document.querySelectorAll('.expired-tasks');
  tarefasExpiradas.forEach(t => {
    const data = t.dataLimite.toLocaleString('pt-BR');
    allExpiredLists.forEach(container => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${t.descricao}</strong> - Vencida em: ${data}`;
      container.appendChild(li);
    });
  });

  // Seleciona **todos** os containers de tarefas concluídas
  const allCompletedLists = document.querySelectorAll('.completed-tasks');
  tarefasConcluidas.forEach(t => {
    const data = t.dataLimite.toLocaleString('pt-BR');
    allCompletedLists.forEach(container => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${t.descricao}</strong> - Concluída até: ${data}`;
      container.appendChild(li);
    });
  });

  // ATUALIZA XP
  atualizarXP(tarefasConcluidas);

  // ATUALIZA PRÓXIMA TAREFA
  tempoMaisRecente = tarefasFuturas.length ? tarefasFuturas[0].dataLimite : null;
  atualizarContadorProximaTarefa();

  carregandoTarefas = false;
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
  document.querySelector('.purple-card').innerHTML = '<span class="card-title">TAREFAS EXPIRADAS</span>';
  document.querySelector('.blue-card').innerHTML = '<span class="card-title">TAREFAS CONCLUÍDAS</span>';
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
  adicionarIconeDeExcluir(p, tarefa);
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

function adicionarIconeDeExcluir(pElem, tarefa) {
  const btn = document.createElement('button');
  btn.textContent = '🗑';
  btn.title = 'Excluir permanentemente';
  btn.style.marginLeft = '8px';
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    // Remove do Firestore
    await excluirTarefaDoFirestore(tarefa.id);
    // Remove apenas do DOM, **não** de tarefasConcluidas nem tarefasExpiradas
    pElem.remove();
    // NÃO chama atualizarXP() — assim o XP não cai
  });
  pElem.appendChild(btn);
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
  
      // Remover tarefas vencidas da lista de futuras
      const aindaFuturas = [];
      tarefasFuturas.forEach(t => {
        if (t.dataLimite <= agora) {
          // Venceu: mover para expiradas
          tarefasExpiradas.push(t);
  
          // Remover visual da lista
          const elem = document.querySelector(`[data-id="${t.id}"]`);
          if (elem) elem.remove();
  
          // Adicionar no card de expiradas
          adicionarNaCard(t, 'purple-card');
        } else {
          aindaFuturas.push(t); // ainda válida
        }
      });
  
      tarefasFuturas = aindaFuturas;
  
      // Atualizar próxima tarefa (se houver)
      if (tarefasFuturas.length === 0) {
        span.textContent = '⏰ Sem tarefas futuras';
        tempoMaisRecente = null;
        return;
      }
  
      tarefasFuturas.sort((a, b) => a.dataLimite - b.dataLimite);
      tempoMaisRecente = tarefasFuturas[0].dataLimite;
  
      const diff = tempoMaisRecente - agora;
      const horas = Math.floor(diff / (1000 * 60 * 60));
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diff % (1000 * 60)) / 1000);
      span.textContent = `⏰ Próx. em ${horas}h ${minutos}m ${segundos}s`;
    }, 1000);
}

function atualizarDataAtual() {
    const span = document.querySelector('.current-day');
    const agora = new Date();
    const opcoes = { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' };
    span.textContent = '📅 ' + agora.toLocaleDateString('pt-BR', opcoes).replace(/^\w/, c=>c.toUpperCase());
}


export async function ajustarRecurrentes(tarefas) {
  const usuario = auth.currentUser;
  if (!usuario) return;
  const tarefasColecao = collection(db, "usuarios", usuario.uid, "tarefas");
  const hoje = new Date();

  // para não disparar múltiplas criações por task, iteramos uma a uma
  for (const t of tarefas) {
    if (t.tipo !== 'periodico'            // só periódicas
        || t.finalizada                   // já finalizadas
        || t.dataLimite >= hoje           // ainda não expirou
    ) {
      continue;
    }

    // calcula apenas UMA vez o próximo prazo
    const next = new Date(t.dataLimite);
    switch (t.frequencia) {
      case 'diario':  next.setDate(next.getDate() + 1); break;
      case 'semanal': next.setDate(next.getDate() + 7); break;
      case 'mensal':  next.setMonth(next.getMonth() + 1); break;
      default:
        if (typeof t.frequencia === 'number') {
          next.setDate(next.getDate() + t.frequencia);
        }
    }

    // 1) cria a nova tarefa na coleção
    const novaTarefa = {
      descricao: t.descricao,
      tipo: t.tipo,
      frequencia: t.frequencia,
      dataLimite: Timestamp.fromDate(next),
      finalizada: false
    };
    if (t.padraoPersonalizado != null) {
      novaTarefa.padraoPersonalizado = t.padraoPersonalizado;
    }
    await addDoc(tarefasColecao, novaTarefa);

    // 2) marca a antiga como finalizada (para não recriar de novo)
    const refAntigo = doc(db, "usuarios", usuario.uid, "tarefas", t.id);
    await updateDoc(refAntigo, { finalizada: true });
  }
}

export async function processarTarefaPeriodicaAoMarcar(t) {
  const usuario = auth.currentUser;
  if (!usuario) return;

  // só tarefas periódicas recém-concluídas
  if (t.tipo !== 'periodico' || !t.finalizada) {
    return;
  }

  // calcula a próxima data **uma única vez**
  const next = new Date(t.dataLimite);
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
      if (typeof t.frequencia === 'number') {
        next.setDate(next.getDate() + t.frequencia);
      }
  }

  // 1) cria a nova tarefa com a próxima data
  const tarefasColecao = collection(db, "usuarios", usuario.uid, "tarefas");
  const novaTarefa = {
    descricao: t.descricao,
    tipo: t.tipo,
    frequencia: t.frequencia,
    dataLimite: Timestamp.fromDate(next),
    finalizada: false
  };
  if (t.padraoPersonalizado != null) {
    novaTarefa.padraoPersonalizado = t.padraoPersonalizado;
  }
  await addDoc(tarefasColecao, novaTarefa);

  // 2) marca a tarefa original como finalizada (já feito pelo listener)
  // nada mais necessário aqui pois já foi atualizada antes de chamar esta função
}

  document.querySelector('.next-event').addEventListener('click', () => {
    const modalNextEvent = document.getElementById('modal-next-event');
    if (modalNextEvent.style.display === 'flex') return;
  
    modalNextEvent.style.display = 'flex';
  
    
    // Tarefas VENCIDAS (a data já passou e não foram concluídas)
    const listaExpiradas = tarefasExpiradas.map(t => {
      const data = t.dataLimite.toLocaleString('pt-BR');
      return `<li><strong>${t.descricao}</strong> - Vencida em: ${data}</li>`;
    }).join('');
  
    // Tarefas FUTURAS (com data futura)
    const listaFuturas = tarefasFuturas.map(t => {
      const dataLimite = new Date(t.dataLimite);
      const tempoRestante = calcularTempoRestante(dataLimite);
      const data = dataLimite.toLocaleString('pt-BR');
      return `<li><strong>${t.descricao}</strong> - Próximo evento em: ${data} (Restante: ${tempoRestante})</li>`;
    }).join('');
  
    // Tarefas CONCLUÍDAS (checkbox marcados manualmente)
    const listaConcluidas = tarefasConcluidas.map(t => {
      const data = t.dataLimite.toLocaleString('pt-BR');
      return `<li><strong>${t.descricao}</strong> - Concluída até: ${data}</li>`;
    }).join('');
  
    const listaContainer = document.getElementById('lista-tarefas-organizada');

    listaContainer.innerHTML = `
      <h2>Tarefas Vencidas</h2>
      <ul>${listaExpiradas || '<em>Nenhuma tarefa vencida.</em>'}</ul>

      <h2>Próximos Eventos</h2>
      <ul>${listaFuturas || '<em>Nenhum evento futuro.</em>'}</ul>

      <h2>Tarefas Concluídas</h2>
      <ul>${listaConcluidas || '<em>Nenhuma tarefa concluída.</em>'}</ul>
    `;

  
    document.getElementById('fechar-modal-next-event').onclick = () => {
      modalNextEvent.style.display = 'none';
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
// Eventos dos botões de ordenação
document.getElementById('ordenar-tipo').addEventListener('click', () => {
  mostrarTarefasOrganizadas('tipo');
});

document.getElementById('ordenar-tempo').addEventListener('click', () => {
  mostrarTarefasOrganizadas('tempo');
});

function mostrarTarefasOrganizadas(criterio) {
  const agora = new Date();
  const listaContainer = document.getElementById('lista-tarefas-organizada');

  // filtra só futuras e não-finalizadas
  const futuras = tarefasFuturas.filter(t => !t.finalizada && t.dataLimite > agora);

  // Se for ordenação POR TEMPO, renderiza igual antes
  if (criterio === 'tempo') {
    futuras.sort((a, b) => a.dataLimite - b.dataLimite);
    const items = futuras.map(t => {
      const data = t.dataLimite.toLocaleString('pt-BR');
      const restante = calcularTempoRestante(t.dataLimite);
      return `<li><strong>${t.descricao}</strong> — até ${data} (Restante: ${restante})</li>`;
    }).join('');
    listaContainer.innerHTML = `<h2>Próximos Eventos</h2><ul>${items || '<em>Nenhuma tarefa futura.</em>'}</ul>`;
    return;
  }

  // --- ordenação POR TIPO ---
  // 1. agrupa por tipo
  const grupos = futuras.reduce((acc, t) => {
    const label = {
      'periodico': 'Periódico',
      'nao-periodico': 'Não Periódico',
      'personalizado': 'Personalizado'
    }[t.tipo] || 'Outros';
    if (!acc[label]) acc[label] = [];
    acc[label].push(t);
    return acc;
  }, {});

  // 2. para cada grupo, ordena por data interna e gera HTML
  let html = '';
  Object.keys(grupos).forEach(label => {
    const arr = grupos[label];
    arr.sort((a, b) => a.dataLimite - b.dataLimite);
    const itens = arr.map(t => {
      const data = t.dataLimite.toLocaleString('pt-BR');
      const restante = calcularTempoRestante(t.dataLimite);
      return `<li>
      <strong>${t.descricao}</strong> — até ${data} (Restante: ${restante})
    </li>`;    
    }).join('');
    html += `
      <div class="grupo-tipo">
        <h3 class="grupo-tipo-titulo">${label}</h3>
        <ul class="grupo-tipo-lista">${itens}</ul>
      </div>
    `;
  });

  listaContainer.innerHTML = html || '<em>Nenhuma tarefa futura.</em>';
}





