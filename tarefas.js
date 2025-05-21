import { auth } from './auth.js';
import { db } from './firebase-config.js';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, deleteDoc,Timestamp, addDoc } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
export { carregarTarefas, tempoMaisRecente, atualizarDataAtual };

let carregandoTarefas = false;
let tempoMaisRecente = null;
let intervaloContador = null;
let tarefasFuturas = [];
let tarefasExpiradas = [];
let tarefasConcluidas = [];
const subTagsPorCategoria = {
  "Físico": ["Corrida", "Treino", "Alongamento", "Natação", "Ciclismo"],
  "Intelecto": ["Leitura", "Prova", "Pesquisa", "Programação", "Estudo"],
  "Social": ["Reunião", "Networking", "Festa", "Voluntariado"],
  "Criativo": ["Desenho", "Escrita", "Música", "Fotografia"],
  "Espiritual": ["Meditação", "Yoga", "Orações"]
};
const classesJogador = {
  "Guerreiro": { bonusCategorias: ["Físico"], bonusXP: 0.5 },        // +50% XP em tarefas Físicas
  "Mago": { bonusCategorias: ["Intelecto"], bonusXP: 0.5 }, // +50% XP em tarefas Intelecto
  "Ladino": { bonusCategorias: ["Social"], bonusXP: 0.5 },  // +50% XP em tarefas Social
  "Bardo": { bonusCategorias: ["Criativo"], bonusXP: 0.5 },    // +50% XP em tarefas Criativo
  "Bruxo": { bonusCategorias: ["Espiritual"], bonusXP: 0.5 }   // +50% XP em tarefas Espiritual
};
const avataresPorClasse = {
  Guerreiro: "img/guerreiro.jpg",
  Mago: "img/mago.jpeg",
  Ladino: "img/ladino.jpg",
  Bardo: "img/bardo.jpg",
  Bruxo: "img/bruxo.jpg",
};
const frasesPorClasse = {
  Guerreiro: [
    "Hora de batalhar!",
    "Sem dor, sem glória.",
    "Mais uma tarefa, mais próximo da vitória!"
  ],
  Mago: [
    "O conhecimento é poder!",
    "As estrelas me guiam nesta missão.",
    "Uma tarefa por vez... como conjurar feitiços!"
  ],
  Ladino: [
    "Discrição é tudo.",
    "Completei antes que você notasse.",
    "Silencioso, mas eficiente."
  ],
  Bardo: [
    "Cada tarefa é uma nova canção!",
    "Vamos tornar isso épico!",
    "Deixe-me narrar sua glória!"
  ],
  Bruxo: [
    "O pacto exige progresso.",
    "Tarefa feita, energia recuperada.",
    "As sombras aprovam sua dedicação."
  ],
};

function mostrarPopupPersonagem(frase, classe) {
  const popup = document.getElementById('popup-personagem');
  const texto = document.getElementById('popup-personagem-text');
  const imagem = document.getElementById('popup-personagem-img');

  texto.innerHTML = `<em>${frase}</em>`;
  imagem.src = avataresPorClasse[classe] || "default.png";

  popup.classList.remove('hide');
  popup.classList.add('show');

  setTimeout(() => {
    popup.classList.remove('show');
    popup.classList.add('hide');
  }, 4000); // 4 segundos visível
}

function personagemFalaAleatoriamente(classeAtiva) {
  const frases = frasesPorClasse[classeAtiva];
  if (!frases) return;

  const frase = frases[Math.floor(Math.random() * frases.length)];
  mostrarPopupPersonagem(frase, classeAtiva);
}



function renderizarTarefa(t) {
  const div = document.createElement('div');
  div.classList.add('task-rect');
  div.setAttribute('data-id', t.id);
  div.setAttribute('data-tipo', t.tipo || 'personalizado');

  const isConcluivel = t.tipo !== 'personalizado' || t.permitirConclusao;

  div.innerHTML = `
  <div class="titulo-tarefa">
    ${isConcluivel ? `<input type="checkbox" class="checkbox-tarefa" title="Marcar como feita" ${t.finalizada ? 'checked' : ''}>` : ''}
    <strong>${t.nome}</strong>
  </div>
  <small class="anotacao">${(t.descricao || '').trim()}</small>
  <small>Até: ${t.dataLimite.toLocaleString('pt-BR')}</small>
  <span class="tipo-badge">
    ${{
      periodico: 'Importante Periódico',
      'nao-periodico': 'Importante Não-Periódico',
      personalizado: 'Personalizado'
    }[t.tipo || 'personalizado']}
  </span>
  `;

  // Adiciona visualização de tags se existirem
  if (t.tags && t.tags.length) {
    const wrapper = document.createElement("div");
    wrapper.className = "tag-list-wrapper";

    // Cria uma lista com todas as tags padrão, já em lowercase
    const tagsPadrao = Object.values(subTagsPorCategoria)
      .flat()
      .map(tag => tag.toLowerCase());

    t.tags.forEach((tag, index) => {
      const tagElem = document.createElement("span");
      tagElem.classList.add("tag");

      // Verifica se é personalizada comparando em lowercase
      if (!tagsPadrao.includes(tag.toLowerCase())) {
        tagElem.classList.add("tag-personalizada");
      } else {
        tagElem.classList.add(`tag-nivel-${index + 1}`);
      }

      tagElem.textContent = tag;
      wrapper.appendChild(tagElem);
    });

    div.appendChild(wrapper);
  }


  // Verifica se existe anexo no localStorage
  const anexoRaw = localStorage.getItem(`anexos_${t.id}`);
  if (anexoRaw) {
    const anexo = JSON.parse(anexoRaw);

    const link = document.createElement('a');
    link.href = anexo.base64;
    link.download = anexo.nome;
    link.innerHTML = `<span class="icon-clip" aria-hidden="true" style="display:inline-flex;vertical-align:middle;">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style="display:block" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 13.5L13.5 7C14.3284 6.17157 15.6716 6.17157 16.5 7C17.3284 7.82843 17.3284 9.17157 16.5 10L10 16.5C8.067 18.433 4.933 18.433 3 16.5C1.067 14.567 1.067 11.433 3 9.5L9.5 3C10.3284 2.17157 11.6716 2.17157 12.5 3C13.3284 3.82843 13.3284 5.17157 12.5 6L6 12.5" stroke="#7ecbff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span> ${anexo.nome}`;
    link.className = 'anexo-link';
    link.target = '_blank';

    // Impede que o clique no link abra o modal
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      const nome = anexo.nome.toLowerCase();

      // Modal para imagens
      if (nome.match(/\.(png|jpg|jpeg|gif)$/)) {
        abrirModalVisualizacaoAnexo(`<img src="${anexo.base64}" alt="${anexo.nome}" />`);
        e.preventDefault();
        return;
      }
      // Modal para texto
      if (nome.endsWith('.txt')) {
        // Carrega o texto do base64
        const base64Data = anexo.base64.split(',')[1];
        const decoded = atob(base64Data);
        abrirModalVisualizacaoAnexo(`<pre>${decoded.replace(/[<>&]/g, c => ({
          '<':'&lt;','>':'&gt;','&':'&amp;'
        })[c])}</pre>`);
        e.preventDefault();
        return;
      }
      // PDF: exibe no modal usando iframe
      if (nome.endsWith('.pdf')) {
        abrirModalVisualizacaoAnexo(`
          <iframe src="${anexo.base64}" style="width:80vw; height:70vh; border:none; background:#222;"></iframe>
        `);
        e.preventDefault();
        return;
      }
      // Outros tipos: força download
      e.preventDefault();
      let mime = '';
      const match = anexo.base64.match(/^data:(.*?);base64,/);
      if (match) mime = match[1];
      const base64Data = anexo.base64.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);

      const tempLink = document.createElement('a');
      tempLink.href = url;
      tempLink.download = anexo.nome;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(url);
    });

    div.appendChild(link);
  }

  // Só adiciona o listener do checkbox se ele existir
  const checkbox = div.querySelector('.checkbox-tarefa');
  if (checkbox) {
    checkbox.addEventListener('click', async (e) => {
      e.stopPropagation();
      const usuario = auth.currentUser;

      await updateDoc(
        doc(db, "usuarios", usuario.uid, "tarefas", t.id),
        { finalizada: checkbox.checked }
      );

      // Processa tarefa periódica se for o caso
      if (t.tipo === 'periodico' && checkbox.checked) {
        await processarTarefaPeriodicaAoMarcar({
          ...t,
          finalizada: true
        });
      }

      // ✅ Personagem fala ao concluir a tarefa
      if (checkbox.checked) {
        let classeAtiva = localStorage.getItem('classeAtiva') || 'Guerreiro';
        personagemFalaAleatoriamente(classeAtiva);
      }

      // Aguarde todo o processamento antes de recarregar
      await carregarTarefas();
    });
  }


  div.addEventListener('click', () => abrirModalDetalhe(t));

  return div;
}



document.getElementById("tagPrincipal").addEventListener("change", (e) => {
  const subTagSelect = document.getElementById("tagSecundaria");
  const valorPrincipal = e.target.value;

  subTagSelect.innerHTML = '<option value="">-- Subcategoria --</option>';

  if (valorPrincipal && subTagsPorCategoria[valorPrincipal]) {
    subTagsPorCategoria[valorPrincipal].forEach(sub => {
      const opt = document.createElement("option");
      opt.value = sub;
      opt.textContent = sub;
      subTagSelect.appendChild(opt);
    });
    subTagSelect.disabled = false;
  } else {
    subTagSelect.disabled = true;
  }
});

// Funções auxiliares para cálculo das datas de início dos períodos
function getInicioDoDia(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getInicioDaSemana(date) {
  const diaSemana = date.getDay(); // 0 (domingo) a 6 (sábado)
  const diff = date.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1); // ajustar para segunda-feira
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

function getInicioDoMes(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getFimDoDia(data = new Date()) {
  const fim = new Date(data);
  fim.setHours(23, 59, 59, 999);
  return fim;
}

function getFimDaSemana(data = new Date()) {
  const fim = new Date(data);
  const dia = fim.getDay(); // 0 (Dom) a 6 (Sáb)
  const diasAteDomingo = 6 - dia;
  fim.setDate(fim.getDate() + diasAteDomingo);
  fim.setHours(23, 59, 59, 999);
  return fim;
}

function getFimDoMes(data = new Date()) {
  const fim = new Date(data.getFullYear(), data.getMonth() + 1, 0); // último dia do mês
  fim.setHours(23, 59, 59, 999);
  return fim;
}


// Filtra tarefas entre as datas inicio e fim
function filtrarTarefasPorPeriodo(tarefas, inicio, fim) {
  return tarefas.filter(t => {
    const data = t.dataLimite;
    return data >= inicio && data <= fim;
  });
}

// Calcula % de tarefas concluídas em um período
function calcularPercentualConcluidas(tarefas, inicioPeriodo, fimPeriodo = new Date()) {
  const tarefasNoPeriodo = filtrarTarefasPorPeriodo(tarefas, inicioPeriodo, fimPeriodo);
  if (tarefasNoPeriodo.length === 0) return 0; // <- já garante 0% concluído
  const concluidas = tarefasNoPeriodo.filter(t => t.finalizada).length;
  return (concluidas / tarefasNoPeriodo.length) * 100;
}


// Função para criar gráfico de pizza (Chart.js)
function criarGraficoPizza(ctx, percentual, titulo) {
  const tarefasPresentes = percentual > 0 || percentual < 100; // mesmo 0% ou 100% deve aparecer

  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Concluídas', 'Pendentes'],
      datasets: [{
        data: tarefasPresentes ? [percentual, 100 - percentual] : [0, 100],
        backgroundColor: ['#4caf50', '#ccc']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: {
          display: true,
          text: titulo
        }
      }
    }
  });
}


let graficoDia, graficoSemana, graficoMes;

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
      nome: data.nome || data.descricao,
      descricao: data.descricao || '',
      dataLimite: data.dataLimite.toDate(),
      tipo: data.tipo || 'personalizado',
      finalizada: data.finalizada || false,
      frequencia: data.frequencia,
      padraoPersonalizado: data.padraoPersonalizado,
      modoPersonalizado: data.modoPersonalizado,
      permitirConclusao: data.permitirConclusao || false,
      tags: data.tags || [],
      fixada: data.fixada || false,
      repetida: data.repetida || false // <-- ADICIONE ESTA LINHA
    });
  });

  await ajustarRecurrentes(tarefas);

  const containers = {
    'periodico': document.querySelector('#tarefas-periodico .tasks-container'),
    'nao-periodico': document.querySelector('#tarefas-nao-periodico .tasks-container'),
    'personalizado': document.querySelector('#tarefas-personalizado .tasks-container'),
  };

  Object.values(containers).forEach(c => c.innerHTML = '');

  const tarefasFuturas = tarefas.filter(t => !t.finalizada && t.dataLimite >= agora && !t.repetida);
  const tarefasExpiradas = tarefas.filter(t => !t.finalizada && t.dataLimite < agora);
  const tarefasConcluidas = tarefas.filter(t => t.finalizada);

  tarefas.sort((a, b) => a.dataLimite - b.dataLimite);

  const tarefasFixadas = tarefas.filter(t => t.fixada && !t.finalizada);
  const idsFixadas = new Set(tarefasFixadas.map(t => t.id));

  const containerFixadas = document.querySelector('#tarefas-fixadas .tasks-container');
  containerFixadas.innerHTML = '';
  tarefasFixadas.forEach(t => {
    const div = renderizarTarefa(t);
    containerFixadas.appendChild(div);
  });

  // Renderiza futuras que não estão fixadas (para evitar duplicação)
  tarefasFuturas.forEach(t => {
    const div = renderizarTarefa(t);
    containers[t.tipo].appendChild(div);
  });


  tarefasExpiradas.forEach(t => adicionarNaCard(t, 'purple-card'));
  tarefasConcluidas.forEach(t => adicionarNaCard(t, 'blue-card'));

  const allExpiredLists = document.querySelectorAll('.expired-tasks');
  tarefasExpiradas.forEach(t => {
    const dataStr = t.dataLimite.toLocaleString('pt-BR');
    allExpiredLists.forEach(container => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${t.nome}</strong> - Vencida em: ${dataStr}`;
      container.appendChild(li);
    });
  });

  const allCompletedLists = document.querySelectorAll('.completed-tasks');
  tarefasConcluidas.forEach(t => {
    const dataStr = t.dataLimite.toLocaleString('pt-BR');
    allCompletedLists.forEach(container => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${t.descricao}</strong> - Concluída até: ${dataStr}`;
      container.appendChild(li);
    });
  });

  const classeAtual = localStorage.getItem('classeAtiva') || 'Guerreiro';
  atualizarXP(tarefasConcluidas, classeAtual);

  tempoMaisRecente = tarefasFuturas.length ? tarefasFuturas[0].dataLimite : null;
  atualizarContadorProximaTarefa();

  carregandoTarefas = false;

  // Cálculo percentuais
  const inicioDia = getInicioDoDia(agora);
  const fimDia = getFimDoDia(agora);
  const inicioSemana = getInicioDaSemana(agora);
  const fimSemana = getFimDaSemana(agora);
  const inicioMes = getInicioDoMes(agora);
  const fimMes = getFimDoMes(agora);

  const percentualDia = calcularPercentualConcluidas(tarefas, inicioDia, fimDia);
  const percentualSemana = calcularPercentualConcluidas(tarefas, inicioSemana, fimSemana);
  const percentualMes = calcularPercentualConcluidas(tarefas, inicioMes, fimMes);

  // Criar/atualizar gráficos
  const ctxDia = document.getElementById('graficoDia').getContext('2d');
  const ctxSemana = document.getElementById('graficoSemana').getContext('2d');
  const ctxMes = document.getElementById('graficoMes').getContext('2d');

  if (graficoDia) graficoDia.destroy();
  if (graficoSemana) graficoSemana.destroy();
  if (graficoMes) graficoMes.destroy();

  graficoDia = criarGraficoPizza(ctxDia, percentualDia, 'Tarefas Concluídas Hoje');
  graficoSemana = criarGraficoPizza(ctxSemana, percentualSemana, 'Tarefas Concluídas Esta Semana');
  graficoMes = criarGraficoPizza(ctxMes, percentualMes, 'Tarefas Concluídas Este Mês');
}


document.addEventListener('DOMContentLoaded', () => {
  const classeAtivaSpan = document.getElementById('classe-ativa');
  const classeSelector = document.getElementById('classe-selector');
  const personagemImg = document.querySelector('.character-box img');
  

  // Classe salva ou padrão
  let classeAtiva = localStorage.getItem('classeAtiva') || 'Guerreiro';

  // Atualiza UI com a classe e imagem
  function atualizarVisualClasse() {
    classeAtivaSpan.textContent = classeAtiva;
    classeSelector.value = classeAtiva;
    classeSelector.style.display = 'none';
    classeAtivaSpan.style.display = 'inline';

    // Atualiza imagem do personagem
    personagemImg.src = avataresPorClasse[classeAtiva] || "default.png";
  }

  atualizarVisualClasse();

  // Ativa edição ao clicar no nome da classe
  classeAtivaSpan.addEventListener('click', () => {
    classeAtivaSpan.style.display = 'none';
    classeSelector.style.display = 'inline';
    classeSelector.focus();
  });

  // Quando a classe mudar
  classeSelector.addEventListener('change', () => {
    classeAtiva = classeSelector.value;
    localStorage.setItem('classeAtiva', classeAtiva);
    atualizarVisualClasse();
    atualizarXP(tarefasConcluidas, classeAtiva); // Recalcula XP ao trocar classe
  });

  // Fecha seletor ao perder o foco
  classeSelector.addEventListener('blur', () => {
    atualizarVisualClasse();
  });
  personagemFalaAleatoriamente(classeAtiva); // Fala aleatória ao carregar
  atualizarXP(tarefasConcluidas, classeAtiva); // Inicializa XP
});

// Função para salvar o XP atual (lido da interface) no Firestore
async function salvarXPNoFirestore(classeAtiva) {
  const xpInfo = document.querySelector('.xp-info');
  if (!xpInfo) return;

  // Pega o texto do XP: "XP: X / 100"
  const xpTexto = xpInfo.querySelector('span')?.textContent || 'XP: 0 / 100';
  const xpAtual = parseInt(xpTexto.match(/XP: (\d+)/)?.[1] || '0', 10);

  // Calcula xp total acumulado baseado no nível e xp atual na barra
  const nivelTexto = xpInfo.querySelector('strong')?.textContent || 'Nível 1';
  const nivel = parseInt(nivelTexto.match(/Nível (\d+)/)?.[1] || '1', 10);

  // xp total = (nivel - 1) * 100 + xpAtual
  const xpTotal = (nivel - 1) * 100 + xpAtual;

  const usuario = auth.currentUser;
  if (!usuario) {
    alert('Usuário não autenticado!');
    return;
  }

  const usuarioRef = doc(db, "usuarios", usuario.uid);

  await updateDoc(usuarioRef, {
    xpAcumulado: xpTotal
  });

  mostrarPopup(`XP salvo no Firestore: ${xpTotal}`, 3000);
}

// Função para resetar XP no Firestore e atualizar a UI
async function resetarXP(classeAtiva) {
  const usuario = auth.currentUser;
  if (!usuario) {
    alert('Usuário não autenticado!');
    return;
  }

  const usuarioRef = doc(db, "usuarios", usuario.uid);

  await updateDoc(usuarioRef, {
    xpAcumulado: 0
  });

  atualizarXP(0, classeAtiva);
  mostrarPopup('XP resetado para zero.', 3000);
}

// Cria os botões e adiciona dentro do container da personagem
function criarBotoesXP(classeAtiva) {
  const container = document.querySelector('.character-box');
  if (!container) return;

  // Verifica se já existe para não duplicar
  if (container.querySelector('#btn-salvar-xp')) return;

  const btnSalvar = document.createElement('button');
  btnSalvar.id = 'btn-salvar-xp';
  btnSalvar.textContent = 'Salvar XP no Firestore';
  btnSalvar.style.marginRight = '10px';
  btnSalvar.addEventListener('click', () => salvarXPNoFirestore(classeAtiva));

  const btnReset = document.createElement('button');
  btnReset.id = 'btn-reset-xp';
  btnReset.textContent = 'Resetar XP';
  btnReset.addEventListener('click', () => resetarXP(classeAtiva));

  const divBotoes = document.createElement('div');
  divBotoes.style.marginTop = '10px';
  divBotoes.appendChild(btnSalvar);
  divBotoes.appendChild(btnReset);

  container.appendChild(divBotoes);
}


 async function atualizarXP(tarefasConcluidas, classeAtiva) {
  const xpPorTarefa = 10;
  let xpTotal = 0;

  tarefasConcluidas.forEach(tarefa => {
    let xpBase = xpPorTarefa;

    const tags = tarefa.tags || [];
    const bonusCategorias = classesJogador[classeAtiva]?.bonusCategorias || [];

    const temBonus = tags.some(tag => bonusCategorias.includes(tag));

    if (temBonus) {
      xpBase += xpBase * classesJogador[classeAtiva].bonusXP;
    }

    xpTotal += xpBase;
  });

  const nivel = Math.floor(xpTotal / 100) + 1;
  const xpAtual = xpTotal % 100;
  const porcentagem = Math.min(100, (xpAtual / 100) * 100);

  const xpInfo = document.querySelector('.xp-info');
  if (!xpInfo) return;

  xpInfo.querySelector('strong').textContent = `Nível ${nivel} (${classeAtiva})`;
  xpInfo.querySelector('.xp-fill').style.width = `${porcentagem}%`;
  xpInfo.querySelector('span').textContent = `XP: ${Math.floor(xpAtual)} / 100`;

  const corPorClasse = {
    'Guerreiro': '#FF5733',
    'Mago': '#33FF57',
    'Ladino': '#3357FF',
    'Bardo': '#FF33A1',
    'Bruxo': '#FF8C33'
  };

  xpInfo.querySelector('.xp-fill').style.backgroundColor = corPorClasse[classeAtiva] || '#ccc';
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

    p.innerHTML   = `<strong>${tarefa.nome}</strong> – até ${dataFormatada} às ${horaFormatada}`;
    p.setAttribute('data-id', tarefa.id);

    card.appendChild(p);
  adicionarIconeDeExcluir(p, tarefa);
}

async function atualizarTarefaNoFirestore(id, nome, descricao, dataLimite, fixada) {
    const usuario = auth.currentUser;
    const refDoc = doc(db, "usuarios", usuario.uid, "tarefas", id);
    await updateDoc(refDoc, { nome, descricao, dataLimite, fixada });
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

    // Remove do DOM
    pElem.remove();

    // ✅ Mostra popup
    mostrarPopup(`Tarefa excluída: ${tarefa.descricao}`, 4000);

    // NÃO chama atualizarXP()
  });

  pElem.appendChild(btn);
}


function abrirModalDetalhe(tarefa) {
    const modal = document.getElementById('modal-tarefa');
    modal.style.display = 'flex';
  
    document.getElementById('editar-nome').value = tarefa.nome;
    document.getElementById('editar-descricao').value = tarefa.descricao;
    document.getElementById('editar-dataLimite').value = tarefa.dataLimite.toISOString().slice(0,16);
    document.getElementById('tipo-tarefa').value = tarefa.tipo;
    document.getElementById('fixarNaHomeEditar').checked = tarefa.fixada === true;

    document.getElementById('salvar-edicao').onclick = async () => {
        const novaNome = document.getElementById('editar-nome').value.trim();
        const novaDesc = document.getElementById('editar-descricao').value.trim();
        const novaData = new Date(document.getElementById('editar-dataLimite').value);
        const fixarNaHome = document.getElementById('fixarNaHomeEditar').checked;
        await atualizarTarefaNoFirestore(tarefa.id, novaNome, novaDesc, novaData, fixarNaHome);
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

export function mostrarPopup(mensagem, duracao = 4000) {  // Aumentando o tempo para 4 segundos por padrão
    const popup = document.getElementById('popup-alert');
    const text = document.getElementById('popup-alert-text');
    
    text.textContent = "🎲 " + mensagem + " 🎲";
    
    // Remove classes antigas e adiciona a classe 'show' para disparar o fade in e o slide
    popup.classList.remove('hide');
    popup.classList.add('show');
    
    // Após 'duracao' milissegundos, inicia o fade out
    setTimeout(() => {
      popup.classList.remove('show');
      popup.classList.add('hide');
    }, duracao);
}


async function existeTarefaRepetida(tarefasColecao, descricao, dataProxima) {
  const q = query(
    tarefasColecao,
    where("descricao", "==", descricao),
    where("repetida", "==", true),
    where("dataLimite", "==", Timestamp.fromDate(dataProxima))
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function ajustarRecurrentes(tarefas) {
  const usuario = auth.currentUser;
  if (!usuario) return;

  const tarefasColecao = collection(db, "usuarios", usuario.uid, "tarefas");

  for (const t of tarefas) {
    if (t.repetida) {
      console.log(`⛔ Ignorado: tarefa repetida '${t.descricao}'`);
      continue;
    }

    let dataProxima = null;
    const dataLimiteAnterior = t.dataLimite.toDate ? t.dataLimite.toDate() : new Date(t.dataLimite);
    const hoje = new Date();

    console.log(`🔍 Avaliando: ${t.descricao} | Finalizada: ${t.finalizada} | Data: ${dataLimiteAnterior.toISOString()} | Tipo: ${t.tipo}`);

    const podeRecriar =
      (!t.finalizada && dataLimiteAnterior < hoje) ||
      (t.tipo === 'personalizado' && t.finalizada && ['frequencia', 'datas'].includes(t.modoPersonalizado));

    if (!podeRecriar) continue;

    // PERSONALIZADAS
    if (t.tipo === 'personalizado') {
      if (t.modoPersonalizado === 'frequencia') {
        if (!t.frequencia) continue;
        const proxima = new Date(dataLimiteAnterior);
        proxima.setDate(proxima.getDate() + t.frequencia);
        dataProxima = proxima;

      } else if (t.modoPersonalizado === 'datas') {
        if (!t.padraoPersonalizado) continue;

        const datas = t.padraoPersonalizado
          .split(',')
          .map(str => new Date(str.trim()))
          .filter(d => !isNaN(d))
          .sort((a, b) => a - b);

        dataProxima = datas.find(d => d > dataLimiteAnterior);

        if (!dataProxima) {
          console.log(`🔁 Nenhuma data futura para '${t.descricao}'`);
          continue;
        }
      } else {
        continue;
      }

    // PERIÓDICAS
    } else if (t.tipo === 'periodico') {
      const proxima = new Date(dataLimiteAnterior);
      switch (t.frequencia) {
        case 'diario': proxima.setDate(proxima.getDate() + 1); break;
        case 'semanal': proxima.setDate(proxima.getDate() + 7); break;
        case 'mensal': proxima.setMonth(proxima.getMonth() + 1); break;
        default:
          if (typeof t.frequencia === 'number') {
            proxima.setDate(proxima.getDate() + t.frequencia);
          } else {
            continue;
          }
      }
      dataProxima = proxima;
    } else {
      continue;
    }

    // ❗ Verifica duplicidade antes de criar
    const jaExiste = await existeTarefaRepetida(tarefasColecao, t.descricao, dataProxima);
    if (jaExiste) {
      console.log(`⚠️ Já existe tarefa futura para '${t.descricao}' em ${dataProxima.toISOString()}`);
      continue;
    }
    

    const novaTarefa = {
      nome: t.nome,
      descricao: t.descricao,
      tipo: t.tipo,
      dataLimite: Timestamp.fromDate(dataProxima),
      finalizada: false,
      repetida: true,
      tags: Array.isArray(t.tags) ? [...t.tags] : [],
      tarefaOriginal: t.id,
    };

    if (t.frequencia != null) novaTarefa.frequencia = t.frequencia;
    if (t.modoPersonalizado) novaTarefa.modoPersonalizado = t.modoPersonalizado;
    if (t.padraoPersonalizado) novaTarefa.padraoPersonalizado = t.padraoPersonalizado;
    if (t.permitirConclusao != null) novaTarefa.permitirConclusao = t.permitirConclusao;

    await addDoc(tarefasColecao, novaTarefa);
    mostrarPopup(`Nova tarefa criada: ${t.descricao} para ${dataProxima.toLocaleDateString('pt-BR')}`);
    personagemFalaAleatoriamente
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
    nome: t.nome,
    descricao: t.descricao,
    tipo: t.tipo,
    frequencia: t.frequencia,
    dataLimite: Timestamp.fromDate(next),
    finalizada: false,
    tags: Array.isArray(t.tags) ? [...t.tags] : [],
    repetida: true,
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





document.getElementById('tipo-tarefa').addEventListener('change', (e) => {
  const extras = document.getElementById('personalizadoExtras');
  extras.style.display = e.target.value === 'personalizado' ? 'block' : 'none';
});
document.getElementById('modoPersonalizado').addEventListener('change', (e) => {
  const modo = e.target.value;
  document.querySelectorAll('.sub-bloco-personalizado').forEach(bloco => {
    bloco.style.display = 'none';
  });

  if (modo === 'datas') {
    document.getElementById('bloco-datas').style.display = 'block';
  } else if (modo === 'frequencia') {
    document.getElementById('bloco-frequencia').style.display = 'block';
  }
});


function abrirModalVisualizacaoAnexo(html) {
  const modal = document.getElementById('modal-visualizacao-anexo');
  const conteudo = document.getElementById('conteudo-anexo');
  conteudo.innerHTML = html;
  modal.style.display = 'flex';
}

document.getElementById('fechar-modal-anexo').onclick = function() {
  document.getElementById('modal-visualizacao-anexo').style.display = 'none';
  document.getElementById('conteudo-anexo').innerHTML = '';
};