import { auth } from './auth.js';
import { db } from './firebase-config.js';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, deleteDoc,Timestamp, addDoc, increment,arrayUnion, setDoc } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
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

const ITENS_CONFIG = {
  // Cosméticos
  hat: {
    tipo: "cosmetico",
    nome: "Chapéu de Caubói",
    efeito: null
  },
  viking: {
    tipo: "cosmetico",
    nome: "Capacete Viking",
    efeito: null
  },
  mago: {
    tipo: "cosmetico",
    nome: "Chapéu de Mago",
    efeito: null
  },
  cartola: {
    tipo: "cosmetico",
    nome: "Cartola de Mágico",
    efeito: null
  },
  astronauta: {
    tipo: "cosmetico",
    nome: "Capacete Astronauta",
    efeito: null
  },
  oculos: {
    tipo: "cosmetico",
    nome: "Óculos Descolado",
    efeito: null
  },
  carnaval: {
    tipo: "cosmetico",
    nome: "Máscara de Carnaval",
    efeito: null
  },
  // Armas
  espada: {
    tipo: "arma",
    nome: "Espada Lendária",
    efeito: { dano: 10 }
  },
  escudo: {
    tipo: "arma",
    nome: "Escudo Resistente",
    efeito: { defesa: 5 }
  },
  arco: {
    tipo: "arma",
    nome: "Arco do Élfico",
    efeito: { dano: 7 }
  },
  machado: {
    tipo: "arma",
    nome: "Machado de Guerra",
    efeito: { dano: 8 }
  },
  cajado: {
    tipo: "arma",
    nome: "Cajado Arcano",
    efeito: { dano: 5 }
  },
  // Itens bônus
  coroa: {
    tipo: "bonus",
    nome: "Coroa Brilhante",
    efeito: { moedasExtra: 3 } // +3 moedas por tarefa
  },
  livro: {
    tipo: "bonus",
    nome: "Livro de Feitiços",
    efeito: { xpExtra: 0.2 } // +20% XP por tarefa
  },
};

function getNomeItem(id) {
  const NOMES_ITENS = {
    hat: "Chapéu de Caubói",
    viking: "Capacete Viking",
    espada: "Espada Lendária",
    coroa: "Coroa Brilhante",
    oculos: "Óculos Descolado",
    livro: "Livro de Fetiços",
    mago: "Chapéu de Mago",
    cajado: "Cajado Arcano",
    cartola: "Cartola de Mágico",
    escudo: "Escudo Resistente",
    arco: "Arco do Élfico",
    astronauta: "Capacete Astronauta",
    mascara: "Máscara de Carnaval",
    machado: "Machado de Guerra",
    // adicione outros itens aqui
  };
  return NOMES_ITENS[id] || id;
}

const VALORES_ITENS = {
  "hat": 50,
  'viking': 70,
  'espada': 200,
  'coroa': 150,
  'oculos': 75,
  'livro': 120,
  'mago': 100,
  'cajado': 180,
  'cartola': 60,
  'escudo': 120,
  'arco': 150,
  'astronauta': 180,
  'mascara': 40,
  'machado': 100
  // adicione outros itens aqui
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
  ]
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
  atualizarMoedas();
  const div = document.createElement('div');
  div.classList.add('task-rect');
  div.setAttribute('data-id', t.id);
  div.setAttribute('data-tipo', t.tipo || 'personalizado');

  const isConcluivel = t.tipo !== 'personalizado' || t.permitirConclusao;
  const dataLimite = new Date(t.dataLimite);
  const agora = new Date();
  const diffMs = dataLimite - agora;

  // Cálculos de tempo
  const horas = Math.floor(diffMs / (1000 * 60 * 60));
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const semanas = Math.floor(dias / 7);
  const meses = Math.floor(dias / 30);

  // Elementos HTML
  const idSelect = `select-tempo-${t.id}`;
  const idSpan = `span-tempo-${t.id}`;

  div.innerHTML = `
    <div class="titulo-tarefa">
      ${isConcluivel ? `<input type="checkbox" class="checkbox-tarefa" title="Marcar como feita" ${t.finalizada ? 'checked' : ''}>` : ''}
      <strong>${t.nome}</strong>
    </div>
    <small class="anotacao">${(t.descricao || '').trim()}</small>
    <small>Até: ${dataLimite.toLocaleString('pt-BR')}</small>
    <div style="margin-top: 4px;">
      <label>Tempo restante: 
        <span id="${idSpan}">${dias} dias</span>
      </label>
      <select id="${idSelect}" class="select-task">
        <option value="horas">Horas</option>
        <option value="dias" selected>Dias</option>
        <option value="semanas">Semanas</option>
        <option value="meses">Meses</option>
      </select>
    </div>
    <span class="tipo-badge">
      ${{
        periodico: 'Importante Periódico',
        'nao-periodico': 'Importante Não-Periódico',
        personalizado: 'Personalizado'
      }[t.tipo || 'personalizado']}
    </span>
  `;

  // Lógica de troca de visualização
  setTimeout(() => {
    const select = document.getElementById(idSelect);
    const span = document.getElementById(idSpan);

    if (select && span) {
      select.addEventListener('change', () => {
        const val = select.value;
        let texto = '';
        if (diffMs < 0) {
          texto = 'Expirado';
        } else {
          if (val === 'horas') texto = `${horas} horas`;
          else if (val === 'dias') texto = `${dias} dias`;
          else if (val === 'semanas') texto = `${semanas} semanas`;
          else if (val === 'meses') texto = `${meses} meses`;
        }
        span.textContent = texto;
      });

      // Aqui, para evitar abrir modal ao clicar no select:
      select.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }, 0);


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

    if (checkbox.checked) {
      let classeAtiva = localStorage.getItem('classeAtiva') || 'Guerreiro';
      personagemFalaAleatoriamente(classeAtiva);

      // Só chama para personalizadas
      if (t.tipo === 'personalizado') {
        await criarRecorrentePersonalizada({
          ...t,
          finalizada: true
        });
        // Chama ajuste só após concluir personalizada
        await ajustarRecorrentesPersonalizadas([{
          ...t,
          finalizada: true
        }]);
      }
    }

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
      diasSemana: data.diasSemana || [],         
      horaSemanal: data.horaSemanal || null,
      excluida: data.excluida || false // <-- ADICIONE ESTA LINHA
    });
  });

  const tarefasNaoExcluidas = tarefas.filter(t => !t.excluida);

  await ajustarRecurrentes(tarefasNaoExcluidas);

  const containers = {
    'periodico': document.querySelector('#tarefas-periodico .tasks-container'),
    'nao-periodico': document.querySelector('#tarefas-nao-periodico .tasks-container'),
    'personalizado': document.querySelector('#tarefas-personalizado .tasks-container'),
  };

  Object.values(containers).forEach(c => c.innerHTML = '');

  // Use tarefasNaoExcluidas para montar as listas!
  tarefasFuturas = tarefasNaoExcluidas.filter(t => !t.finalizada && t.dataLimite >= agora);
  tarefasExpiradas = tarefasNaoExcluidas.filter(t => !t.finalizada && t.dataLimite < agora);
  tarefasConcluidas = tarefasNaoExcluidas.filter(t => t.finalizada);
  tarefasNaoExcluidas.sort((a, b) => a.dataLimite - b.dataLimite);

  const tarefasFixadas = tarefasNaoExcluidas.filter(t => t.fixada && !t.finalizada);
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

  // Filtrar tarefas com prazo nas próximas 24 horas (dataLimite >= agora e <= 24h)
  const limite24h = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
  const tarefas24h = tarefasNaoExcluidas.filter(t => 
    !t.finalizada && 
    t.dataLimite >= agora && 
    t.dataLimite <= limite24h
  );

  // Ordena pelo prazo
  tarefas24h.sort((a, b) => a.dataLimite - b.dataLimite);

  const containerProximas = document.querySelector('#tarefas-proximas .tasks-container');
  if (containerProximas) {
    containerProximas.innerHTML = '';
    if (tarefas24h.length === 0) {
      containerProximas.innerHTML = `<p>Nenhuma tarefa com prazo nas próximas 24 horas.</p>`;
    } else {
      tarefas24h.forEach(t => {
        const div = renderizarTarefa(t);
        containerProximas.appendChild(div);
      });
    }
  }


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
  renderizarCalendario(tarefas);
}



let calendarioAnoAtual = new Date().getFullYear();
let calendarioMesAtual = new Date().getMonth();
let tarefasGlobais = [];

document.addEventListener('DOMContentLoaded', () => {
  const btnFechar = document.getElementById('fechar-modal-tarefas');
  const modal = document.getElementById('modal-tarefas-custom');

  // Fecha o modal ao clicar no botão
  if (btnFechar && modal) {
    btnFechar.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  renderizarCalendario(tarefasGlobais, calendarioAnoAtual, calendarioMesAtual);
});

function renderizarCalendario(tarefas, ano = calendarioAnoAtual, mes = calendarioMesAtual) {
  calendarioAnoAtual = ano;
  calendarioMesAtual = mes;
  tarefasGlobais = tarefas;

  const container = document.getElementById('calendario-container');
  container.innerHTML = '';

  const titulo = document.getElementById('mes-ano-titulo');
  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  titulo.textContent = `${nomesMeses[mes]} de ${ano}`;

  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diaSemanaInicial = primeiroDia.getDay();

  for (let i = 0; i < diaSemanaInicial; i++) {
    const div = document.createElement('div');
    container.appendChild(div);
  }

  const mostrarTodas = document.getElementById('mostrar-concluidas-expiradas')?.checked;
  const agora = new Date();

  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    const div = document.createElement('div');
    div.classList.add('dia');
    div.textContent = dia;

    const tarefasDoDia = tarefas.filter(t =>
      t.dataLimite.getFullYear() === ano &&
      t.dataLimite.getMonth() === mes &&
      t.dataLimite.getDate() === dia &&
      (mostrarTodas || !t.finalizada)
    );

    const algumaVisivel = tarefasDoDia.some(t =>
      (!t.finalizada && t.dataLimite >= agora) || mostrarTodas
    );

    if (tarefasDoDia.length > 0 && algumaVisivel) {
      div.classList.add('com-tarefa');
      div.style.cursor = 'pointer';

      // Verifica se todas estão concluídas ou expiradas
      const todasConcluidasOuExpiradas = tarefasDoDia.every(t =>
        t.finalizada || t.dataLimite < agora
      );

      if (todasConcluidasOuExpiradas) {
        // Se todas são concluídas
        const todasConcluidas = tarefasDoDia.every(t => t.finalizada);
        const todasExpiradas = tarefasDoDia.every(t => !t.finalizada && t.dataLimite < agora);

        // Descobre os tipos presentes
        const tiposPresentes = [];
        if (tarefasDoDia.some(t => t.tipo === 'periodico')) tiposPresentes.push('periodico');
        if (tarefasDoDia.some(t => t.tipo === 'nao-periodico')) tiposPresentes.push('nao-periodico');
        if (tarefasDoDia.some(t => t.tipo === 'personalizado')) tiposPresentes.push('personalizado');

        // Remove classes de tipo vivas
        div.classList.remove('periodico', 'nao-periodico', 'personalizado');

        if (todasConcluidas) {
          // Aplica cor apagada para concluídas
          if (tiposPresentes.length === 1) {
            div.classList.add(`expirada-${tiposPresentes[0]}`);
          } else if (tiposPresentes.length > 1) {
            const coresMortas = {
              'periodico': '#b9cfda',
              'nao-periodico': '#ffe0b2',
              'personalizado': '#c8e6c9'
            };
            const faixas = tiposPresentes.map(tipo => coresMortas[tipo]);
            const step = 100 / faixas.length;
            let grad = faixas.map((cor, i) =>
              `${cor} ${i * step}% ${(i + 1) * step}%`
            ).join(', ');
            div.style.background = `linear-gradient(to right, ${grad})`;
            div.style.color = '#333';
          }
        } else if (todasExpiradas) {
          // Aplica vermelho para expiradas
          div.classList.add('expirada');
          div.style.background = '#ffb3b3';
          div.style.color = '#b71c1c';
        }
      } else {
        // Remove classe cinza se não for o caso
        div.classList.remove('expirada-ou-concluida');

        const tipos = ['periodico', 'nao-periodico', 'personalizado'];
        const coresVivas = {
          'periodico': '#4fc3f7',
          'nao-periodico': '#ffa726',
          'personalizado': '#66bb6a'
        };
        const coresApagadas = {
          'periodico': '#b0bec5',
          'nao-periodico': '#ffe9c6',
          'personalizado': '#d0e8d0'
        };

        let gradApplied = false;

        tipos.forEach(tipo => {
          const temPendente = tarefasDoDia.some(t => t.tipo === tipo && !t.finalizada && t.dataLimite >= agora);
          const temConcluida = tarefasDoDia.some(t => t.tipo === tipo && t.finalizada);

          if (temPendente && temConcluida) {
            div.classList.remove(tipo, `expirada-${tipo}`);
            div.style.background = `linear-gradient(to right, ${coresVivas[tipo]} 0%, ${coresVivas[tipo]} 50%, ${coresApagadas[tipo]} 50%, ${coresApagadas[tipo]} 100%)`;
            div.style.color = '#0d47a1';
            gradApplied = true;
          }
        });

        if (!gradApplied) {
          // Lógica padrão já existente:
          const tiposPresentes = [];
          if (tarefasDoDia.some(t => t.tipo === 'periodico')) tiposPresentes.push('periodico');
          if (tarefasDoDia.some(t => t.tipo === 'nao-periodico')) tiposPresentes.push('nao-periodico');
          if (tarefasDoDia.some(t => t.tipo === 'personalizado')) tiposPresentes.push('personalizado');

          if (tiposPresentes.length === 1) {
            div.classList.add(tiposPresentes[0]);
          } else if (tiposPresentes.length > 1) {
            div.classList.remove('periodico', 'nao-periodico', 'personalizado');
            // Fundo dividido em faixas verticais
            const cores = {
              'periodico': '#4fc3f7',
              'nao-periodico': '#ffa726',
              'personalizado': '#66bb6a'
            };
            const faixas = tiposPresentes.map(tipo => cores[tipo]);
            const step = 100 / faixas.length;
            let grad = faixas.map((cor, i) =>
              `${cor} ${i * step}% ${(i + 1) * step}%`
            ).join(', ');
            div.style.background = `linear-gradient(to right, ${grad})`;
            div.style.color = '#222'; // Ajuste para contraste
          }
        }
      }
    }

    div.addEventListener('click', () => {
      const lista = document.getElementById('lista-tarefas-dia');
      lista.innerHTML = '';

      const tarefasVisiveis = tarefasDoDia.filter(t =>
        (!t.finalizada && t.dataLimite >= agora) || mostrarTodas
      );

      if (tarefasVisiveis.length === 0) {
        lista.innerHTML = '<li>Nenhuma tarefa neste dia.</li>';
      } else {
        tarefasVisiveis.forEach(t => {
          const li = document.createElement('li');

          const status = t.finalizada ? '✅ Concluída' : '⌛ Pendente';
          const tags = t.tags.length > 0 ? t.tags.map(tag => `#${tag}`).join(', ') : 'Nenhuma';
          const destaque = t.fixada ? '<strong style="color: red;">📌 Fixada</strong><br>' : '';

          li.innerHTML = `
            ${destaque}
            <strong>${t.nome}</strong><br>
            📝 ${t.descricao}<br>
            📅 <em>${t.dataLimite.toLocaleDateString()} às ${t.dataLimite.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</em><br>
            🧭 Tipo: ${t.tipo}<br>
            🔁 Frequência: ${t.frequencia || 'Não definida'}<br>
            🏷️ Tags: ${tags}<br>
            📌 Status: ${status}
          `;

          li.style.marginBottom = '12px';
          li.style.borderBottom = '1px solid #ccc';
          li.style.paddingBottom = '8px';

          lista.appendChild(li);
        });
      }

      const modal = document.getElementById('modal-tarefas-custom');
      if (modal) {
        modal.style.display = 'flex'; // mostra o modal
      }
    });
    container.appendChild(div);
  }
}

document.getElementById('mostrar-concluidas-expiradas')?.addEventListener('change', () => {
  renderizarCalendario(tarefasGlobais, calendarioAnoAtual, calendarioMesAtual);
});


document.getElementById('mes-anterior').addEventListener('click', () => {
  calendarioMesAtual--;
  if (calendarioMesAtual < 0) {
    calendarioMesAtual = 11;
    calendarioAnoAtual--;
  }
  renderizarCalendario(tarefasGlobais, calendarioAnoAtual, calendarioMesAtual);
});

document.getElementById('mes-seguinte').addEventListener('click', () => {
  calendarioMesAtual++;
  if (calendarioMesAtual > 11) {
    calendarioMesAtual = 0;
    calendarioAnoAtual++;
  }
  renderizarCalendario(tarefasGlobais, calendarioAnoAtual, calendarioMesAtual);
});





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


function calcularBonusXP(itensAtivos) {
  let bonus = 0;
  itensAtivos.forEach(item => {
    const config = ITENS_CONFIG[item];
    if (config && config.tipo === "bonus" && config.efeito?.xpExtra) {
      bonus += config.efeito.xpExtra;
    }
  });
  return bonus;
}

function calcularBonusMoedas(itensAtivos) {
  let bonus = 0;
  itensAtivos.forEach(item => {
    const config = ITENS_CONFIG[item];
    if (config && config.tipo === "bonus" && config.efeito?.moedasExtra) {
      bonus += config.efeito.moedasExtra;
    }
  });
  return bonus;
}

function xpNecessarioParaNivel(nivel) {
  return 100 + (nivel - 1) * 20;
}

async function atualizarXP(tarefasConcluidas, classeAtiva) {
  const usuario = auth.currentUser;
  if (!usuario) return;

  const usuarioRef = doc(db, "usuarios", usuario.uid);
  const usuarioSnap = await getDoc(usuarioRef);

  const xpPorTarefa = 10;
  let xpTotal = 0;

  const dadosUsuario = usuarioSnap.exists() ? usuarioSnap.data() : {};
  const itensAtivos = dadosUsuario.itensAtivos || [];

  tarefasConcluidas.forEach(tarefa => {
    let xpBase = xpPorTarefa;

    const tags = tarefa.tags || [];
    const bonusCategorias = classesJogador[classeAtiva]?.bonusCategorias || [];
    const temBonus = tags.some(tag => bonusCategorias.includes(tag));

    if (temBonus) {
      xpBase += xpBase * classesJogador[classeAtiva].bonusXP;
    }

    // Bônus de itens
    const bonusXP = calcularBonusXP(itensAtivos);
    xpBase += xpBase * bonusXP;

    xpTotal += xpBase;
  });

  let xpRestante = xpTotal;
  let nivel = 1;
  let xpParaProximo = xpNecessarioParaNivel(nivel);

  while (xpRestante >= xpParaProximo) {
    xpRestante -= xpParaProximo;
    nivel++;
    xpParaProximo = xpNecessarioParaNivel(nivel);
  }
  const xpAtual = xpRestante;
  const porcentagem = Math.min(100, (xpAtual / xpParaProximo) * 100);

  // Atualiza ou cria o documento do usuário
  if (usuarioSnap.exists()) {
    await updateDoc(usuarioRef, {
      nivel: nivel,
      xp: xpAtual
    });
  } else {
    await setDoc(usuarioRef, {
      nivel: nivel,
      xp: xpAtual
    });
  }

  const xpInfo = document.querySelector('.xp-info');
  if (!xpInfo) return;

  xpInfo.querySelector('strong').textContent = `Nível ${nivel} (${classeAtiva})`;
  xpInfo.querySelector('.xp-fill').style.width = `${porcentagem}%`;
  xpInfo.querySelector('span').textContent = `XP: ${Math.floor(xpAtual)} / ${xpParaProximo}`;

  const corPorClasse = {
    'Guerreiro': '#FF5733',
    'Mago': '#33FF57',
    'Ladino': '#3357FF',
    'Bardo': '#FF33A1',
    'Bruxo': '#FF8C33'
  };

  xpInfo.querySelector('.xp-fill').style.backgroundColor = corPorClasse[classeAtiva] || '#ccc';

  // ATUALIZA O LEVEL NA BARRA SUPERIOR
  const classNameSpan = document.querySelector('.class-name');
  if (classNameSpan) {
    classNameSpan.textContent = `👤 ${Math.floor(xpAtual)} / ${xpParaProximo}`;
  }

  return nivel;
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

async function atualizarTarefaNoFirestore(id, dados) {
  const usuario = auth.currentUser;
  const refDoc = doc(db, "usuarios", usuario.uid, "tarefas", id);
  await updateDoc(refDoc, dados);
}



// Altere a função de exclusão para aceitar exclusão total
// ...existing code...
async function excluirTarefaDoFirestore(id, exclusaoTotal = false) {
  const usuario = auth.currentUser;
  if (!usuario) {
    console.warn("Usuário não autenticado.");
    return;
  }

  const refDoc = doc(db, "usuarios", usuario.uid, "tarefas", id);

  if (exclusaoTotal) {
    // Marca a tarefa original como excluída antes de deletar
    await updateDoc(refDoc, { excluida: true });

    // Remove tarefas subsequentes (repetidas) ligadas a esta
    const tarefasColecao = collection(db, "usuarios", usuario.uid, "tarefas");
    const q = query(tarefasColecao, where("tarefaOriginal", "==", id));
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      await updateDoc(doc(db, "usuarios", usuario.uid, "tarefas", docSnap.id), { excluida: true });
      await deleteDoc(doc(db, "usuarios", usuario.uid, "tarefas", docSnap.id));
    }
    // Exclui a tarefa original
    await deleteDoc(refDoc);
    return;
  }

  // Exclusão padrão (apenas marca como finalizada e exclui)
  await updateDoc(refDoc, { finalizada: true });
  try {
    await deleteDoc(refDoc);
  } catch (e) {
    console.error("Erro ao excluir tarefa:", e);
  }
}
// ...existing code...

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

function atualizarSelectSubtag(tagPrincipal, selectSubtagId) {
  const select = document.getElementById(selectSubtagId);
  select.innerHTML = ''; // Limpa o conteúdo atual

  if (!tagPrincipal || !subTagsPorCategoria[tagPrincipal]) {
    select.disabled = true;
    return;
  }

  // Habilita o select
  select.disabled = false;

  // Adiciona opção vazia
  const defaultOption = document.createElement("option");
  defaultOption.value = '';
  defaultOption.textContent = '-- Selecione --';
  select.appendChild(defaultOption);

  // Adiciona as subtags
  subTagsPorCategoria[tagPrincipal].forEach(subtag => {
    const option = document.createElement("option");
    option.value = subtag;
    option.textContent = subtag;
    select.appendChild(option);
  });
}

document.getElementById('editar-tagPrincipal').addEventListener('change', (e) => {
  const novaPrincipal = e.target.value;
  atualizarSelectSubtag(novaPrincipal, 'editar-tagSecundaria');
});




function abrirModalDetalhe(tarefa) {
  const modal = document.getElementById('modal-tarefa');
  modal.style.display = 'flex';

  // Campos básicos
  document.getElementById('editar-nome').value = tarefa.nome || '';
  document.getElementById('editar-descricao').value = tarefa.descricao || '';
  document.getElementById('editar-dataLimite').value = tarefa.dataLimite?.toISOString().slice(0, 16) || '';
  document.getElementById('editar-tipo-tarefa').value = tarefa.tipo || 'personalizado';
  document.getElementById('fixarNaHomeEditar').checked = tarefa.fixada === true;

  // Tags
  const tags = tarefa.tags || [];
  const categorias = Object.keys(subTagsPorCategoria);
  const subtags = Object.values(subTagsPorCategoria).flat().map(tag => tag.toLowerCase());

  let tagPrincipal = tags.find(tag => categorias.includes(tag));
  let tagSecundaria = null;
  let tagsPersonalizadas = [];

  if (tagPrincipal) {
    const subtagsDaPrincipal = subTagsPorCategoria[tagPrincipal].map(tag => tag.toLowerCase());

    tagSecundaria = tags.find(
      tag => tag !== tagPrincipal && subtagsDaPrincipal.includes(tag.toLowerCase())
    );

    tagsPersonalizadas = tags.filter(
      tag =>
        tag !== tagPrincipal &&
        tag !== tagSecundaria &&
        !subtags.includes(tag.toLowerCase())
    );
  } else {
    tagsPersonalizadas = tags;
  }

  document.getElementById('editar-tagPrincipal').value = tagPrincipal || '';
  atualizarSelectSubtag(tagPrincipal, 'editar-tagSecundaria');
  document.getElementById('editar-tagSecundaria').value = tagSecundaria || '';
  document.getElementById('editar-tagsPersonalizadas').value = tagsPersonalizadas.join(', ');

  // Personalizado
  document.getElementById('editar-permitirConclusao').checked = tarefa.permitirConclusao || false;
  document.getElementById('editar-personalizadoExtras').style.display = tarefa.tipo === 'personalizado' ? 'block' : 'none';

  // Tipo periódico e personalizado
  document.getElementById('editar-frequenciaSelecao').value = tarefa.frequencia || 'diario';

  // Ajusta o select do modo personalizado
  const modoPersonalizado = tarefa.modoPersonalizado || 'frequencia';
  document.getElementById('modoPersonalizado').value = modoPersonalizado;

  // Função para mostrar os blocos certos
  function mostrarBlocosPersonalizado(modo) {
    document.getElementById('editar-bloco-datas').style.display = modo === 'datas' ? 'block' : 'none';
    document.getElementById('editar-bloco-frequencia').style.display = modo === 'frequencia' ? 'block' : 'none';
    document.getElementById('editar-bloco-semanal').style.display = modo === 'semanal' ? 'block' : 'none';
  }

  // Exibe o bloco correto conforme tipo da tarefa
  document.getElementById('editar-frequencia-wrapper').style.display = tarefa.tipo === 'periodico' ? 'block' : 'none';
  document.getElementById('editar-padrao-wrapper').style.display = tarefa.tipo === 'personalizado' ? 'block' : 'none';
  document.getElementById('editar-frequenciaSelecao').dispatchEvent(new Event('change'));
  
  mostrarBlocosPersonalizado(modoPersonalizado);



  // Escuta mudança no tipo de tarefa
  document.getElementById('editar-tipo-tarefa').onchange = (e) => {
    const tipo = e.target.value;
    document.getElementById('editar-frequencia-wrapper').style.display = tipo === 'periodico' ? 'block' : 'none';
    document.getElementById('editar-padrao-wrapper').style.display = tipo === 'personalizado' ? 'block' : 'none';
    document.getElementById('editar-personalizadoExtras').style.display = tipo === 'personalizado' ? 'block' : 'none';
  };


  // Quando modo personalizado muda
  document.getElementById('modoPersonalizado').onchange = (e) => {
    mostrarBlocoPersonalizado(e.target.value);
  };

  // Salvar
  document.getElementById('salvar-edicao').onclick = async () => {
    const novoNome = document.getElementById('editar-nome').value.trim();
    const novaDescricao = document.getElementById('editar-descricao').value.trim();
    const novaData = new Date(document.getElementById('editar-dataLimite').value);
    const novoTipo = document.getElementById('editar-tipo-tarefa').value;
    const fixarNaHome = document.getElementById('fixarNaHomeEditar').checked;

    const tagPrincipal = document.getElementById('editar-tagPrincipal').value;
    const tagSecundaria = document.getElementById('editar-tagSecundaria').value;
    const tagsExtras = document.getElementById('editar-tagsPersonalizadas').value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const permitirConclusao = document.getElementById('editar-permitirConclusao').checked;
    const frequencia = document.getElementById('editar-frequenciaSelecao').value;
    const modoPersonalizado = document.getElementById('modoPersonalizado').value;

    const todasAsTags = [...new Set([
      ...(tagPrincipal ? [tagPrincipal] : []),
      ...(tagSecundaria ? [tagSecundaria] : []),
      ...tagsExtras
    ])];

    // MONTE O OBJETO CONFORME O TIPO
  let updateData = {
    nome: novoNome,
    descricao: novaDescricao,
    dataLimite: novaData,
    tipo: novoTipo,
    fixada: fixarNaHome,
    tags: todasAsTags
  };

  if (novoTipo === 'periodico') {
    updateData.frequencia = frequencia;
    updateData.modoPersonalizado = null;
    updateData.permitirConclusao = null;
  } else if (novoTipo === 'personalizado') {
    updateData.modoPersonalizado = modoPersonalizado;
    updateData.permitirConclusao = permitirConclusao;
    updateData.frequencia = frequencia; // se usar frequência personalizada
  } else {
    // Não periódica: remova campos extras
    updateData.frequencia = null;
    updateData.modoPersonalizado = null;
    updateData.permitirConclusao = null;
  }

  await atualizarTarefaNoFirestore(tarefa.id, updateData);

  modal.style.display = 'none';
  mostrarPopup(`Editando tarefa: ${tarefa.nome}`, 3000);
  await carregarTarefas();
};

  // Excluir
  document.getElementById('excluir-tarefa').onclick = async () => {
    await excluirTarefaDoFirestore(tarefa.id, true); // exclusão total
    modal.style.display = 'none';
    setTimeout(() => carregarTarefas(), 500);
  };

  // Fechar
  document.getElementById('fechar-modal-editar').onclick = () => {
    modal.style.display = 'none';
  };
}

// Função auxiliar para exibir o bloco correto
function mostrarBlocoPersonalizado(modo) {
  const blocos = {
    datas: 'bloco-datas',
    frequencia: 'bloco-frequencia',
    semanal: 'bloco-semanal',
    unico: null
  };

  document.querySelectorAll('.sub-bloco-personalizado').forEach(div => {
    div.style.display = 'none';
  });

  const bloco = blocos[modo];
  if (bloco) {
    document.getElementById(bloco).style.display = 'block';
  }
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
        span.textContent = '⏰ 0:00:00';
        tempoMaisRecente = null;
        return;
      }
  
      tarefasFuturas.sort((a, b) => a.dataLimite - b.dataLimite);
      tempoMaisRecente = tarefasFuturas[0].dataLimite;
  
      const diff = tempoMaisRecente - agora;
      const horas = Math.floor(diff / (1000 * 60 * 60));
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diff % (1000 * 60)) / 1000);
      span.textContent = `⏰ ${horas}:${minutos}:${segundos}`;
    }, 1000);
}

function atualizarDataAtual() {
  const span = document.querySelector('.current-day');
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, '0');
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  span.textContent = `📅 ${dia}/${mes}`;
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

async function criarRecorrentePersonalizada(tarefa) {
  const usuario = auth.currentUser;
  if (!usuario) return;

  if (tarefa.tipo !== 'personalizado') return;

  let dataProxima = null;
  const dataLimiteAnterior = tarefa.dataLimite.toDate ? tarefa.dataLimite.toDate() : new Date(tarefa.dataLimite);

  // Cálculo da próxima data para personalizada
  if (tarefa.modoPersonalizado === 'semanal' && Array.isArray(tarefa.diasSemana) && tarefa.diasSemana.length > 0) {
    // Próximo dia da semana selecionado
    let menorDiff = null;
    let proximoDia = null;
    tarefa.diasSemana.forEach(dia => {
      let diff = (dia + 7 - dataLimiteAnterior.getDay()) % 7;
      if (diff === 0) diff = 7; // sempre para frente
      if (menorDiff === null || diff < menorDiff) {
        menorDiff = diff;
        proximoDia = new Date(dataLimiteAnterior);
        proximoDia.setDate(proximoDia.getDate() + diff);
      }
    });
    dataProxima = proximoDia;
  } else if (tarefa.modoPersonalizado === 'frequencia' && typeof tarefa.frequencia === 'number') {
    dataProxima = new Date(dataLimiteAnterior);
    dataProxima.setDate(dataProxima.getDate() + tarefa.frequencia);
  } else {
    // Adicione outros modos se necessário
    return;
  }

  if (!dataProxima) return;

  const novaTarefa = {
    nome: tarefa.nome,
    descricao: tarefa.descricao,
    tipo: 'personalizado',
    dataLimite: Timestamp.fromDate(dataProxima),
    finalizada: false,
    repetida: true,
    tarefaOriginal: tarefa.tarefaOriginal || tarefa.id,
    tags: Array.isArray(tarefa.tags) ? [...tarefa.tags] : []
  };
  if (tarefa.modoPersonalizado !== undefined) novaTarefa.modoPersonalizado = tarefa.modoPersonalizado;
  if (tarefa.frequencia !== undefined) novaTarefa.frequencia = tarefa.frequencia;
  if (tarefa.padraoPersonalizado !== undefined) novaTarefa.padraoPersonalizado = tarefa.padraoPersonalizado;
  if (tarefa.diasSemana !== undefined) novaTarefa.diasSemana = tarefa.diasSemana;
  if (tarefa.horaSemanal !== undefined) novaTarefa.horaSemanal = tarefa.horaSemanal;
  if (tarefa.permitirConclusao !== undefined) novaTarefa.permitirConclusao = tarefa.permitirConclusao;

  const tarefasColecao = collection(db, "usuarios", usuario.uid, "tarefas");
  await addDoc(tarefasColecao, novaTarefa);
  const refDoc = doc(db, "usuarios", usuario.uid, "tarefas", tarefa.id);
  await updateDoc(refDoc, { finalizada: true });
}

// Função para ajustar recorrência de tarefas PERSONALIZADAS
export async function ajustarRecorrentesPersonalizadas(tarefas) {
  const usuario = auth.currentUser;
  if (!usuario) return;

  const tarefasColecao = collection(db, "usuarios", usuario.uid, "tarefas");

  for (const t of tarefas) {
    // Só personalizadas, não finalizadas, não excluídas, não repetidas
    if (
      t.tipo !== 'personalizado' ||
      t.finalizada ||
      t.excluida ||
      t.repetida
    ) continue;

    // Verifica se já existe próxima ocorrência
    let dataProxima = null;
    const dataLimiteAnterior = t.dataLimite.toDate ? t.dataLimite.toDate() : new Date(t.dataLimite);

    // Exemplo: só faz para modo semanal (ajuste para outros modos se quiser)
    if (t.modoPersonalizado === 'semanal' && Array.isArray(t.diasSemana) && t.diasSemana.length > 0) {
      // Descobre o próximo dia da semana selecionado
      const hoje = new Date();
      let menorDiff = null;
      let proximoDia = null;
      t.diasSemana.forEach(dia => {
        // dia: 0=Dom, 1=Seg, ..., 6=Sab
        let diff = (dia + 7 - dataLimiteAnterior.getDay()) % 7;
        if (diff === 0) diff = 7; // sempre para frente
        if (menorDiff === null || diff < menorDiff) {
          menorDiff = diff;
          proximoDia = new Date(dataLimiteAnterior);
          proximoDia.setDate(proximoDia.getDate() + diff);
        }
      });
      dataProxima = proximoDia;
    } else if (t.modoPersonalizado === 'frequencia' && typeof t.frequencia === 'number') {
      dataProxima = new Date(dataLimiteAnterior);
      dataProxima.setDate(dataProxima.getDate() + t.frequencia);
    } else {
      continue; // só trata semanal/frequencia, adicione outros modos se quiser
    }

    // Verifica duplicidade
    const jaExiste = await existeTarefaRepetida(tarefasColecao, t.descricao, dataProxima);
    if (jaExiste) continue;

    // Cria nova tarefa personalizada recorrente
    const novaTarefa = {
      nome: t.nome,
      descricao: t.descricao,
      tipo: 'personalizado',
      dataLimite: Timestamp.fromDate(dataProxima),
      finalizada: false,
      repetida: true,
      tarefaOriginal: t.tarefaOriginal || t.id,
      tags: Array.isArray(t.tags) ? [...t.tags] : []
    };
    if (t.modoPersonalizado !== undefined) novaTarefa.modoPersonalizado = t.modoPersonalizado;
    if (t.frequencia !== undefined) novaTarefa.frequencia = t.frequencia;
    if (t.padraoPersonalizado !== undefined) novaTarefa.padraoPersonalizado = t.padraoPersonalizado;
    if (t.diasSemana !== undefined) novaTarefa.diasSemana = t.diasSemana;
    if (t.horaSemanal !== undefined) novaTarefa.horaSemanal = t.horaSemanal;
    if (t.permitirConclusao !== undefined) novaTarefa.permitirConclusao = t.permitirConclusao;

    await addDoc(tarefasColecao, novaTarefa);
    await updateDoc(doc(db, "usuarios", usuario.uid, "tarefas", t.id), { finalizada: true });
    mostrarPopup(`Nova tarefa personalizada criada: ${t.descricao} para ${dataProxima.toLocaleDateString('pt-BR')}`);
  }
}

export async function ajustarRecurrentes(tarefas) {
  const usuario = auth.currentUser;
  if (!usuario) return;

  const tarefasColecao = collection(db, "usuarios", usuario.uid, "tarefas");

  for (const t of tarefas) {
    // Checa se a tarefa existe e não foi excluída/finalizada
    const refDoc = doc(db, "usuarios", usuario.uid, "tarefas", t.id);
    const snap = await getDoc(refDoc);
    if (!snap.exists()) continue;
    const dados = snap.data();
    if (dados.excluida || dados.finalizada) continue;
    if (t.repetida) continue;

    let dataProxima = null;
    const dataLimiteAnterior = t.dataLimite.toDate ? t.dataLimite.toDate() : new Date(t.dataLimite);
    const hoje = new Date();

    // Só recria para tarefas periódicas!
    if (t.tipo === 'periodico' && t.finalizada) {
      const proxima = new Date(dataLimiteAnterior);
      switch (t.frequencia) {
        case 'diario':
          proxima.setDate(proxima.getDate() + 1);
          break;
        case 'semanal':
          proxima.setDate(proxima.getDate() + 7);
          break;
        case 'mensal':
          proxima.setMonth(proxima.getMonth() + 1);
          break;
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

    // Verifica duplicidade antes de criar
    const jaExiste = await existeTarefaRepetida(tarefasColecao, t.descricao, dataProxima);
    if (jaExiste) continue;

    // Cria nova tarefa com os mesmos dados
    const novaTarefa = {
      nome: t.nome,
      descricao: t.descricao,
      tipo: t.tipo,
      dataLimite: Timestamp.fromDate(dataProxima),
      finalizada: false,
      repetida: true,
      tags: Array.isArray(t.tags) ? [...t.tags] : [],
      tarefaOriginal: t.id
    };
    if (t.frequencia !== undefined) novaTarefa.frequencia = t.frequencia;
    if (t.modoPersonalizado !== undefined) novaTarefa.modoPersonalizado = t.modoPersonalizado;
    if (t.padraoPersonalizado !== undefined) novaTarefa.padraoPersonalizado = t.padraoPersonalizado;
    if (t.permitirConclusao !== undefined) novaTarefa.permitirConclusao = t.permitirConclusao;
    if (t.diasSemana !== undefined) novaTarefa.diasSemana = t.diasSemana;
    if (t.horaSemanal !== undefined) novaTarefa.horaSemanal = t.horaSemanal;

    await addDoc(tarefasColecao, novaTarefa);
    mostrarPopup(`Nova tarefa criada: ${t.descricao} para ${dataProxima.toLocaleDateString('pt-BR')}`);
    personagemFalaAleatoriamente();
    await carregarTarefas();

    await updateDoc(refDoc, { finalizada: true });
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
    tags: Array.isArray(t.tags) ? [...t.tags] : []
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
    const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60));
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
  } else if (modo === 'semanal') {
    document.getElementById('bloco-semanal').style.display = 'block';
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

// Adicione o seguinte código JS ao seu app principal

// 🔁 Exibir moedas na top bar
async function atualizarMoedas() {
  const usuario = auth.currentUser;
  if (!usuario) return;

  const usuarioRef = doc(db, "usuarios", usuario.uid);
  const usuarioSnap = await getDoc(usuarioRef);
  const moedas = usuarioSnap.exists() ? usuarioSnap.data().moedas || 0 : 0;

  const moedasSpan = document.querySelector(".moedas-info");
  if (moedasSpan) {
    moedasSpan.innerText = `🪙 ${moedas}`;
  }
}

// 🧠 Atualize moedas ao concluir tarefa com base no nível do usuário
async function concluirTarefaComMoedas(tarefaId) {
  const usuario = auth.currentUser;
  if (!usuario) return;

  const tarefaRef = doc(db, "usuarios", usuario.uid, "tarefas", tarefaId);
  await updateDoc(tarefaRef, { finalizada: true });

  // Pegue nível do usuário (ou XP e calcule)
  const usuarioRef = doc(db, "usuarios", usuario.uid);
  const usuarioSnap = await getDoc(usuarioRef);
  const dados = usuarioSnap.exists() ? usuarioSnap.data() : null;
  const nivel = dados && typeof dados.nivel === "number" ? dados.nivel : 1; // valor padrão

  // Verifica itens ativos para bônus de moedas
  const itensAtivos = dados && Array.isArray(dados.itensAtivos) ? dados.itensAtivos : [];
  const bonusMoedas = calcularBonusMoedas(itensAtivos);

  let ganho = 5 + nivel * 2;
  ganho += bonusMoedas; // Aplica bônus de moedas dos itens ativos

  await updateDoc(usuarioRef, {
    moedas: increment(ganho)
  });

  mostrarPopup(`Tarefa concluída! Você ganhou ${ganho} moedas.`, 3000);
  atualizarMoedas();
}

window.comprarItem = async function comprarItem(itemId, preco) {
  const usuario = auth.currentUser;
  if (!usuario) {
    alert("Você precisa estar logado para comprar itens.");
    return;
  }

  const usuarioRef = doc(db, "usuarios", usuario.uid);
  const usuarioSnap = await getDoc(usuarioRef);
  if (!usuarioSnap.exists()) {
    alert("Dados do usuário não encontrados.");
    return;
  }

  const dados = usuarioSnap.data();
  const moedasAtuais = dados.moedas || 0;

  if (moedasAtuais < preco) {
    alert("Você não tem moedas suficientes para comprar este item.");
    return;
  }

  // Atualiza as moedas
  await updateDoc(usuarioRef, {
    moedas: increment(-preco),
    // Adiciona o item ao inventário, por exemplo:
    inventario: arrayUnion(itemId)
  });

  mostrarPopup(`Item comprado com sucesso: ${itemId}`);
  atualizarInventarioUI();
  atualizarMoedas();
}

async function atualizarInventarioUI() {
  const usuario = auth.currentUser;
  if (!usuario) return;

  const usuarioRef = doc(db, "usuarios", usuario.uid);
  const usuarioSnap = await getDoc(usuarioRef);
  if (!usuarioSnap.exists()) return;

  const inventario = usuarioSnap.data().inventario || [];
  // Aqui pode atualizar o HTML para mostrar os itens comprados, se quiser
}

async function ativarItem(item) {
  const usuario = auth.currentUser;
  if (!usuario) return;

  const usuarioRef = doc(db, "usuarios", usuario.uid);
  const snap = await getDoc(usuarioRef);
  const dados = snap.data();
  let itensAtivos = dados.itensAtivos || [];

  if (!itensAtivos.includes(item)) {
    itensAtivos.push(item);
    await updateDoc(usuarioRef, { itensAtivos });
  }

  await carregarInventario(); // Recarrega a UI atualizada
}

async function desativarItem(item) {
  const usuario = auth.currentUser;
  if (!usuario) return;

  const usuarioRef = doc(db, "usuarios", usuario.uid);
  const snap = await getDoc(usuarioRef);
  const dados = snap.data();
  let itensAtivos = dados.itensAtivos || [];

  itensAtivos = itensAtivos.filter(i => i !== item);

  await updateDoc(usuarioRef, { itensAtivos });
  await carregarInventario(); // Recarrega a UI atualizada
}

async function venderItem(item) {
  const usuario = auth.currentUser;
  if (!usuario) return;

  const usuarioRef = doc(db, "usuarios", usuario.uid);
  const snap = await getDoc(usuarioRef);
  const dados = snap.data();



  let inventario = dados.inventario || [];
  let itensAtivos = dados.itensAtivos || [];
  let moedas = dados.moedas || 0;

  inventario = inventario.filter(i => i !== item);
  itensAtivos = itensAtivos.filter(i => i !== item);

  const valorOriginal = VALORES_ITENS[item] || 0;
  const valorVenda = Math.floor(valorOriginal * 0.5);

  await updateDoc(usuarioRef, {
    inventario,
    itensAtivos,
    moedas: moedas + valorVenda
  });
  mostrarPopup(`Item vendido: ${item} por ${valorVenda} moedas.`);
  atualizarMoedas();
  await carregarInventario();
}

export async function carregarInventario() {
  const usuario = auth.currentUser;
  if (!usuario) return;

  const usuarioRef = doc(db, "usuarios", usuario.uid);
  const snap = await getDoc(usuarioRef);
  const dados = snap.data();

  const inventario = dados.inventario || [];
  const itensAtivos = dados.itensAtivos || [];

  const grid = document.getElementById("inventario-grid");
  if (!grid) return;
  grid.innerHTML = "";

  inventario.forEach(item => {
    const card = document.createElement("div");
    card.className = "item-card";

    const img = document.createElement("img");
    img.src = `img/${item}.png`;
    img.alt = item;
    img.classList.add("item-imagem");

    const nome = document.createElement("span");
    nome.className = "item-nome";
    nome.textContent = getNomeItem(item);

    // Ações unificadas
    const btnWrapper = document.createElement("div");
    btnWrapper.className = "btn-wrapper";

    const btnAcoes = document.createElement("button");
    btnAcoes.className = "btn-acoes";
    btnAcoes.textContent = "⚙ Ações ▾";

    const dropdown = document.createElement("div");
    dropdown.className = "dropdown-acoes";

    const acaoAtivar = document.createElement("div");
    acaoAtivar.className = "dropdown-item";
    if (itensAtivos.includes(item)) {
      acaoAtivar.textContent = "🔽 Desativar item";
      acaoAtivar.onclick = () => desativarItem(item);
    } else {
      acaoAtivar.textContent = "🔼 Ativar item";
      acaoAtivar.onclick = () => ativarItem(item);
    }

    const valorVenda = Math.floor((VALORES_ITENS[item] || 0) * 0.5);
    const acaoVender = document.createElement("div");
    acaoVender.className = "dropdown-item";
    acaoVender.textContent = `💰 Vender por ${valorVenda} moedas`;
    acaoVender.onclick = () => venderItem(item);

    dropdown.appendChild(acaoAtivar);
    dropdown.appendChild(acaoVender);
    btnWrapper.appendChild(btnAcoes);
    btnWrapper.appendChild(dropdown);

    // Exibir/ocultar menu
    btnAcoes.onclick = () => {
      dropdown.classList.toggle("visivel");
    };

    card.appendChild(img);
    card.appendChild(nome);
    card.appendChild(btnWrapper);
    grid.appendChild(card);
  });

  // Renderiza itens ativos
  const itensContainer = document.getElementById("itens-ativos-container");
  if (!itensContainer) return;
  itensContainer.innerHTML = "";

  itensAtivos.forEach(item => {
    const card = document.createElement("div");
    card.className = "item-ativo-card";

    const img = document.createElement("img");
    img.src = `img/${item}.png`;
    img.alt = item;

    const nome = document.createElement("span");
    nome.textContent = getNomeItem(item);

    card.appendChild(img);
    card.appendChild(nome);
    itensContainer.appendChild(card);
  });
}



