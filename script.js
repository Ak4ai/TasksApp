import { auth } from './auth.js';
import { db, carregarMeuSimpleID, listarAmigosAceitos } from './firebase-config.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { doc, collection, addDoc, getDocs, Timestamp, deleteDoc, serverTimestamp, setDoc, getDoc, increment } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
// script.js
import { carregarTarefas,mostrarPopup,carregarInventario, calcularDefesa } from './tarefas.js';
export { atacarInimigo, inimigoAtaca, darRecompensa, mostrarMissoesDiarias };


const MISSOES_DIARIAS = [
  {
    id: 'fisico',
    descricao: 'Conclua 2 tarefas do tipo Físico',
    tipo: 'Físico', // <-- igual ao valor da tag
    quantidade: 2,
    xp: 50
  },
  {
    id: 'intelecto',
    descricao: 'Conclua 2 tarefas do tipo Intelecto',
    tipo: 'Intelecto',
    quantidade: 2,
    xp: 50
  },
  {
    id: 'social',
    descricao: 'Conclua 2 tarefas do tipo Social',
    tipo: 'Social',
    quantidade: 2,
    xp: 50
  },
  {
    id: 'criativo',
    descricao: 'Conclua 2 tarefas do tipo Criativo',
    tipo: 'Criativo',
    quantidade: 2,
    xp: 50
  },
  {
    id: 'espiritual',
    descricao: 'Conclua 2 tarefas do tipo Espiritual',
    tipo: 'Espiritual',
    quantidade: 2,
    xp: 50
  }
];

// Sorteia e salva as missões do dia
async function sortearMissoesDiarias(uid) {
  const missoes = [];
  const indices = [];
  while (missoes.length < 2) { // 2 missões por dia
    const idx = Math.floor(Math.random() * MISSOES_DIARIAS.length);
    if (!indices.includes(idx)) {
      indices.push(idx);
      missoes.push({ ...MISSOES_DIARIAS[idx], progresso: 0, concluida: false });
    }
  }
  const ref = doc(db, "usuarios", uid, "missoes", "diaria");
  await setDoc(ref, {
    data: new Date().toDateString(),
    missoes
  });
  return missoes;
}

// Carrega as missões do dia
async function carregarMissoesDiarias(uid) {
  const ref = doc(db, "usuarios", uid, "missoes", "diaria");
  const snap = await getDoc(ref);
  const hoje = new Date().toDateString();
  if (snap.exists() && snap.data().data === hoje) {
    return snap.data().missoes;
  } else {
    return await sortearMissoesDiarias(uid);
  }
}

// Mostra as missões na home
async function mostrarMissoesDiarias(uid) {
  const missoes = await carregarMissoesDiarias(uid);
  const container = document.getElementById('missoes-diarias');
  if (!container) return;
  container.innerHTML = '<h3>Missões Diárias</h3>';
  missoes.forEach(missao => {
    const div = document.createElement('div');
    div.className = 'missao-diaria' + (missao.concluida ? ' concluida' : '');
    const cores = {
      "Físico": "#4fc3f7",
      "Intelecto": "#9575cd",
      "Social": "#ffb74d",
      "Criativo": "#81c784",
      "Espiritual": "#f06292"
    };
    div.style.borderLeft = `5px solid ${cores[missao.tipo] || "#90caf9"}`;
    // Progresso com ícone
    div.innerHTML = `
      <span class="missao-desc">${missao.descricao}</span>
      <span class="missao-info-lateral">
        <span class="missao-progresso">
          ${missao.concluida
            ? '<span class="missao-check">✔️</span>'
            : '<span class="missao-tempo">⏳</span>'}
          ${missao.progresso || 0} / ${missao.quantidade}
        </span>
        <span class="missao-xp" title="XP da missão">
          <span class="estrela-xp">⭐</span> ${missao.xp} XP
        </span>
      </span>
    `;
    container.appendChild(div);
  });
} 

export async function atualizarProgressoMissoes(uid, tipoTarefa) {
  const ref = doc(db, "usuarios", uid, "missoes", "diaria");
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  let alterou = false;
  for (const missao of data.missoes) {
    if (!missao.concluida && missao.tipo === tipoTarefa) {
      missao.progresso = (missao.progresso || 0) + 1;
      if (missao.progresso >= missao.quantidade) {
        missao.concluida = true;
        await darRecompensa(uid, missao.xp, 0);
        mostrarPopup(`Missão concluída! +${missao.xp} XP`);
      }
      alterou = true;
    }
  }
  if (alterou) await setDoc(ref, data);
}

const INIMIGOS = [
  // Lista de inimigos
  {
    nome: "Slime",
    vidaAtual: 30,
    vidaMaxima: 30,
    imagem: "img/slime.png",
    recompensaXP: 60,
    recompensaMoedas: 20,
    danoPorExpirada: 5
  },
  {
    nome: "Goblin",
    vidaAtual: 50,
    vidaMaxima: 50,
    imagem: "img/goblin.png",
    recompensaXP: 100,
    recompensaMoedas: 50,
    danoPorExpirada: 10
  },
  {
    nome: "Esqueleto",
    vidaAtual: 90,
    vidaMaxima: 90,
    imagem: "img/esqueleto.png",
    recompensaXP: 120,
    recompensaMoedas: 60,
    danoPorExpirada: 12
  },
  {
    nome: "Orc",
    vidaAtual: 150,
    vidaMaxima: 150,
    imagem: "img/orc.png",
    recompensaXP: 150,
    recompensaMoedas: 80,
    danoPorExpirada: 15
  },
  {
    nome: "Mago Sombrio",
    vidaAtual: 130,
    vidaMaxima: 130,
    imagem: "img/mago_sombrio.png",
    recompensaXP: 180,
    recompensaMoedas: 100,
    danoPorExpirada: 18
  },
  {
    nome: "Cavaleiro Negro",
    vidaAtual: 180,
    vidaMaxima: 180,
    imagem: "img/cavaleiro_negro.png",
    recompensaXP: 220,
    recompensaMoedas: 120,
    danoPorExpirada: 20
  },
  {
    nome: "Dragão",
    vidaAtual: 300,
    vidaMaxima: 300,
    imagem: "img/dragao.png",
    recompensaXP: 300,
    recompensaMoedas: 150,
    danoPorExpirada: 25
  },
  {
    nome: "Rei Demônio",
    vidaAtual: 400,
    vidaMaxima: 400,
    imagem: "img/rei_demonio.png",
    recompensaXP: 500,
    recompensaMoedas: 300,
    danoPorExpirada: 35
  }
  // Adicionar mais inimigos aqui
];


function getNovoInimigo(indice = 0) {
  const idx = Math.max(0, Math.min(indice, INIMIGOS.length - 1));
  const base = INIMIGOS[idx];
  return { ...base, indice: idx, vidaAtual: base.vidaMaxima };  
}

// Carrega o inimigo do Firestore (ou cria um novo se não existir)
async function carregarInimigoFirestore(uid) {
  const ref = doc(db, "usuarios", uid, "inimigo", "atual");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data();
  } else {
    const novo = getNovoInimigo();
    await setDoc(ref, novo);
    return novo;
  }
}

// Salva o inimigo no Firestore
async function salvarInimigoFirestore(uid, inimigo) {
  const ref = doc(db, "usuarios", uid, "inimigo", "atual");
  await setDoc(ref, inimigo);
}

async function atualizarUIInimigo() {
  const usuario = auth.currentUser;
  if (!usuario) return;
  const inimigo = await carregarInimigoFirestore(usuario.uid);

  document.getElementById('inimigo-img').src = inimigo.imagem;
  document.getElementById('inimigo-nome').textContent = inimigo.nome;
  document.getElementById('inimigo-vida-text').textContent = `${inimigo.vidaAtual} / ${inimigo.vidaMaxima}`;
  const recompensaDiv = document.getElementById('inimigo-recompensa');
  if (recompensaDiv) {
    recompensaDiv.textContent = `Recompensa: ${inimigo.recompensaXP} XP, ${inimigo.recompensaMoedas} moedas`;
  }

  // Atualiza barra de vida
  const percent = Math.max(0, Math.round((inimigo.vidaAtual / inimigo.vidaMaxima) * 100));
  document.getElementById('inimigo-vida-fill').style.width = percent + "%";
}

async function atacarInimigo(dano = 10) {
  const usuario = auth.currentUser;
  if (!usuario) return;
  let inimigo = await carregarInimigoFirestore(usuario.uid);

  // Subtrai o dano da vida atual
  inimigo.vidaAtual = Math.max(0, inimigo.vidaAtual - dano);

  // Salva o inimigo atualizado
  await salvarInimigoFirestore(usuario.uid, inimigo);

  // Atualiza a UI
  atualizarUIInimigo();

  // Se morreu, processa derrota e troca de inimigo
  if (inimigo.vidaAtual <= 0) {
    mostrarPopup(`Você derrotou ${inimigo.nome}! Ganhou ${inimigo.recompensaXP} XP e ${inimigo.recompensaMoedas} moedas!`);
    await darRecompensa(usuario.uid, inimigo.recompensaXP, inimigo.recompensaMoedas);

    // Avança para o próximo inimigo
    const proximoIndice = (inimigo.indice ?? 0) + 1;
    if (proximoIndice < INIMIGOS.length) {
      inimigo = getNovoInimigo(proximoIndice);
    } else {
      inimigo = getNovoInimigo(0);
    }
    await salvarInimigoFirestore(usuario.uid, inimigo);
    atualizarUIInimigo();
  }
}

async function inimigoAtaca() {
  const usuario = auth.currentUser;
  if (!usuario) return;
  let inimigo = await carregarInimigoFirestore(usuario.uid);

  // Pegue os itens ativos do usuário
  const usuarioRef = doc(db, "usuarios", usuario.uid);
  const usuarioSnap = await getDoc(usuarioRef);
  const itensAtivos = usuarioSnap.exists() ? usuarioSnap.data().itensAtivos || [] : [];
  const defesa = calcularDefesa(itensAtivos);

  let xpPerdido = inimigo.danoPorExpirada - defesa;
  if (xpPerdido < 0) xpPerdido = 0;

  mostrarPopup(`${inimigo.nome} te atacou! Você perdeu ${xpPerdido} XP!`);
  await perderXP(usuario.uid, xpPerdido);
}

async function darRecompensa(uid, xp, moedas) {
  const usuarioRef = doc(db, "usuarios", uid);
  // Atualiza os campos de xp e moedas (cria se não existir)
  await setDoc(usuarioRef, {
    xp: increment(xp),
    moedas: increment(moedas)
  }, { merge: true });
}

async function perderXP(uid, xp) {
  const usuarioRef = doc(db, "usuarios", uid);
  await setDoc(usuarioRef, {
    xp: increment(-Math.abs(xp))
  }, { merge: true });
}

// Variável para armazenar a fila de mensagens
const filaDeMensagens = [];

document.getElementById('delete-all-tasks-button').addEventListener('click', async () => {
          const confirmacao = confirm("⚠️ Tem certeza que deseja excluir TODAS as suas tarefas? Esta ação não pode ser desfeita.");
          if (!confirmacao) return;

          const usuario = auth.currentUser;
          if (!usuario) {
            alert("Usuário não autenticado.");
            return;
          }

          const tarefasRef = collection(db, "usuarios", usuario.uid, "tarefas");
          const snapshot = await getDocs(tarefasRef);

          const promises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
          await Promise.all(promises);

          alert("Todas as tarefas foram excluídas com sucesso.");
          location.reload();
        });

document.addEventListener('DOMContentLoaded', () => {
  const auth = getAuth();
  onAuthStateChanged(auth, (user) => {
    if (user) {
      carregarMeuSimpleID();
      atualizarUIInimigo();
      mostrarMissoesDiarias(user.uid);
  }
  });
  const botao = document.getElementById('botao-criar-tarefa');

  // ✅ Remove listeners duplicados antes de adicionar
  const novoBotao = botao.cloneNode(true);
  botao.parentNode.replaceChild(novoBotao, botao);

  novoBotao.addEventListener('click', async () => {
    const nome = document.getElementById('nomeTarefa').value.trim();
    let desc = document.getElementById('descricaoTarefa').value.trim();
    const dataLimite = document.getElementById('dataLimite').value;

    if (!nome) {
      alert('Por favor, informe o nome da tarefa.');
      return;
    }

    if (!dataLimite) {
      alert('Por favor, informe a data limite.');
      return;
    }

    await adicionarTarefa(nome, desc, dataLimite);
    mostrarPopup(`Tarefa criada: ${nome}`, 4000);
    document.getElementById('modal-criar-tarefa').style.display = 'none';
  });
});





function mostrarMensagem(mensagem) {
    const dialog = document.getElementById('custom-dialog');
    const dialogMessage = document.getElementById('dialog-message');
    const dialogOkButton = document.getElementById('dialog-ok-button');

    // Adiciona a mensagem à fila de mensagens
    filaDeMensagens.push(mensagem);

    // Verifica se o diálogo já está sendo exibido
    if (dialog.style.display === 'none' || dialog.style.display === '') {
        exibirProximaMensagem();
        exibirBlurBackground(); // Exibe o blur-background ao mostrar o primeiro diálogo
    }
}

function exibirProximaMensagem() {
    const dialog = document.getElementById('custom-dialog');
    const dialogMessage = document.getElementById('dialog-message');
    const dialogOkButton = document.getElementById('dialog-ok-button');

    // Verifica se há mensagens na fila
    if (filaDeMensagens.length > 0) {
        // Obtem a próxima mensagem da fila
        const mensagem = filaDeMensagens.shift(); // Remove e retorna o primeiro elemento da fila

        // Define a mensagem no diálogo e exibe
        dialogMessage.innerText = mensagem;
        dialog.style.display = 'flex';

        // Limpa qualquer evento onclick anterior do botão
        dialogOkButton.onclick = null;

        // Define o evento onclick para fechar o diálogo e exibir a próxima mensagem
        dialogOkButton.onclick = function() {
            dialog.style.display = 'none';
            // Verifica se ainda há mensagens na fila após fechar o diálogo
            if (filaDeMensagens.length === 0) {
                esconderBlurBackground(); // Esconde o blur-background ao fechar o último diálogo
            }
            exibirProximaMensagem(); // Exibe a próxima mensagem da fila

        };
    }
}

function exibirBlurBackground() {
    const blurBackground = document.getElementById('blur-background');
    blurBackground.style.display = 'block';
}

function esconderBlurBackground() {
    const blurBackground = document.getElementById('blur-background');
    blurBackground.style.display = 'none';
}



function isIOSDevice() {
    const ua = navigator.userAgent.toLowerCase();
    return /iphone|ipod|ipad/.test(ua) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}


function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}



async function adicionarTarefa(nome, descricao, dataLimite) {
  const usuario = auth.currentUser;
  if (!usuario) return;

  // 1) Coleta valores do DOM
  const tipo = document.getElementById('tipo-tarefa').value;
  const dataLimiteDate = new Date(dataLimite);
  const tagPrincipal = document.getElementById("tagPrincipal").value;
  const tagSecundaria = document.getElementById("tagSecundaria").value;
  const fixada = document.getElementById('fixarNaHome').checked;

  const tags = [tagPrincipal];
  if (tagSecundaria) tags.push(tagSecundaria);
  // 2) Monta o objeto base
  const novaTarefa = {
    nome,
    descricao,
    dataLimite: Timestamp.fromDate(dataLimiteDate),
    finalizada: false,
    tipo,
    tags,
    fixada 
  };

  // 3) Adiciona campos específicos
  if (tipo === 'periodico') {
    const freq = document.getElementById('frequenciaSelecao').value;
    novaTarefa.frequencia = freq; // 'diario', 'semanal', 'mensal', etc.
  }

  if (tipo === 'personalizado') {
    const modo = document.getElementById('modoPersonalizado').value;
    const permitirConclusao = document.getElementById('permitirConclusao').checked;
    const tagsPersonalizadas = document.getElementById('tagsPersonalizadas').value
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    novaTarefa.modoPersonalizado = modo;
    novaTarefa.permitirConclusao = permitirConclusao;
    novaTarefa.tags = [...novaTarefa.tags, ...tagsPersonalizadas];

    if (modo === 'datas') {
      const padrao = document.getElementById('padraoPersonalizado').value;
      novaTarefa.padraoPersonalizado = padrao; // CSV de datas
    }



    if (modo === 'frequencia') {
      const dias = parseInt(document.getElementById('diasFrequencia').value);
      novaTarefa.frequencia = dias; // Ex: repetir a cada X dias
    }

    if (modo === 'semanal') {
      const checkboxes = document.querySelectorAll('input[name="diasSemana"]:checked');
      const diasSemana = Array.from(checkboxes).map(cb => parseInt(cb.value));
      const horaSemanal = document.getElementById('horaSemanal').value;

      if (diasSemana.length === 0 || !horaSemanal) {
        alert("Selecione pelo menos um dia da semana e informe o horário.");
        return;
      }

      novaTarefa.diasSemana = diasSemana; // ex: [1,3,5]
      novaTarefa.horaSemanal = horaSemanal; // ex: "09:30"
    }


    // modo 'unico' não adiciona mais nada
  }

  const notificacoes = Array.from(document.querySelectorAll('.notificacao-checkbox:checked'))
    .map(cb => parseInt(cb.value, 10)); // minutos antes
  
  novaTarefa.notificacoes = notificacoes;
  
  // 4) Grava no Firestore
  const tarefasRef = collection(db, "usuarios", usuario.uid, "tarefas");
  const docRef = await addDoc(tarefasRef, novaTarefa);
  
  // 5) Agendar notificações se selecionado
  if (notificacoes.length > 0) {
    const dataTarefa = new Date(dataLimite);
    for (const minutosAntes of notificacoes) {
      const dataNotificacao = new Date(dataTarefa.getTime() - minutosAntes * 60000);
      await addDoc(collection(db, "scheduledNotifications"), {
        uid: usuario.uid,
        tarefaId: docRef.id,
        title: `Tarefa: ${nome}`,
        body: `Sua tarefa "${nome}" está chegando!\nData limite: ${dataLimiteDate.toLocaleString()}`,
        badge: "https://raw.githubusercontent.com/Ak4ai/TasksApp/e38ef409e5a90d423d1b5034e2229433d85cd538/badge.png",
        scheduledAt: dataNotificacao,
        sent: false,
        createdAt: serverTimestamp()
      });
    }
    // Chama a API para processar notificações agendadas
    fetch('https://runa-phi.vercel.app/api/send-notifications', { method: 'POST' })
      .then(r => r.json())
      .then(data => console.log('Notificações processadas:', data))
      .catch(e => console.warn('Erro ao chamar API de notificações:', e));
  }

  // 6) Recarrega a UI
  await carregarTarefas();
}
  
  document.getElementById('fechar-modal').addEventListener('click', () => {
    document.getElementById('modal-criar-tarefa').style.display = 'none';
  });
  
  // Importação
  import { atualizarDataAtual } from './tarefas.js';
  
document.addEventListener('DOMContentLoaded', () => {
  atualizarDataAtual();

  // Configura tabs
  document.querySelectorAll('.bottom-nav .nav-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const alvo = btn.dataset.tab;

      // Troca a aba visível
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.getElementById(alvo).classList.add('active');

      // Aplica ou remove a classe .show na main-content
      const mainContent = document.querySelector('.main-content');
      if (alvo === 'tab-enemy') {
        mainContent.classList.add('show');
      } else {
        mainContent.classList.remove('show');
      }

      // Remove classes ativas nos botões
      document.querySelectorAll('.nav-button').forEach(b => {
        b.classList.remove('active');
        b.blur();
      });

      btn.classList.add('active');

      // Ações específicas por aba
      if (alvo === 'tab-tasks') {
        carregarTarefas();
      }

      if (alvo === 'tab-inventario') {
        carregarInventario();
      }

      if (alvo === 'tab-amigos') {
        listarAmigosAceitos(); // <-- carrega amigos
      }

      // Atualiza classes no body (para temas/cor)
      document.body.classList.remove(
        'tab-home-active',
        'tab-tasks-active',
        'tab-tasks-nao-periodicas-active',
        'tab-tasks-personalizadas-active',
        'tab-amigos-active'
      );

      if (alvo === 'tab-home') document.body.classList.add('tab-home-active');
      if (alvo === 'tab-tasks') document.body.classList.add('tab-tasks-active');
      if (alvo === 'tab-tasks-nao-periodicas') document.body.classList.add('tab-tasks-nao-periodicas-active');
      if (alvo === 'tab-tasks-personalizadas') document.body.classList.add('tab-tasks-personalizadas-active');
      if (alvo === 'tab-amigos') document.body.classList.add('tab-amigos-active');

      atualizarVisibilidadeAppBody();
    });
  });

  // Inicializa na home
  document.querySelector('.nav-button[data-tab="tab-home"]').click();
  carregarTarefas();
});


document.getElementById('refresh-btn').addEventListener('click', () => {
  mostrarPopup('Atualizando tarefas...', 2000);
  carregarTarefas();
});


let touchStartX = 0;
let touchEndX = 0;
const minSwipeDistance = 100;

// Helper para saber se o evento começou em um carousel
function isInCarouselArea(target) {
  return target.closest && target.closest('.carousel-swipe-area');
}

let swipeStartedInCarousel = false;

document.addEventListener('touchstart', e => {
  swipeStartedInCarousel = isInCarouselArea(e.target);
  if (swipeStartedInCarousel) return;
  touchStartX = e.changedTouches[0].screenX;
}, false);

document.addEventListener('touchend', e => {
  if (swipeStartedInCarousel) {
    swipeStartedInCarousel = false;
    return;
  }
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
}, false);

function handleSwipe() {
  const deltaX = touchEndX - touchStartX;
  if (Math.abs(deltaX) < minSwipeDistance) return;

  const navButtons = Array.from(document.querySelectorAll('.bottom-nav .nav-button'));
  const activeBtn = document.querySelector('.bottom-nav .nav-button.active');
  let idx = navButtons.indexOf(activeBtn);

  // Determinar próximo índice
  let direction;
  if (deltaX < 0) {
    idx = (idx + 1) % navButtons.length;
    direction = 'left';
  } else {
    idx = (idx - 1 + navButtons.length) % navButtons.length;
    direction = 'right';
  }

  const nextBtn = navButtons[idx];
  const nextTabId = nextBtn.dataset.tab;

  // Anima o main-content e troca a aba no callback
  animateMainContent(direction, () => {
    // Troca aba ativa
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(nextTabId).classList.add('active');

    navButtons.forEach(b => b.classList.remove('active'));
    nextBtn.classList.add('active');

    // Atualiza classes do body
    document.body.classList.remove(
      'tab-home-active',
      'tab-tasks-active',
      'tab-tasks-nao-periodicas-active',
      'tab-tasks-personalizadas-active'
    );
    if (nextTabId === 'tab-home') document.body.classList.add('tab-home-active');
    if (nextTabId === 'tab-tasks') document.body.classList.add('tab-tasks-active');
    if (nextTabId === 'tab-tasks-nao-periodicas') document.body.classList.add('tab-tasks-nao-periodicas-active');
    if (nextTabId === 'tab-tasks-personalizadas') document.body.classList.add('tab-tasks-personalizadas-active');

    atualizarVisibilidadeAppBody();
  });

  // Desativa hover momentaneamente
  navButtons.forEach(btn => {
    btn.classList.add('disable-hover');
    btn.blur();
  });

  setTimeout(() => {
    navButtons.forEach(btn => btn.classList.remove('disable-hover'));
  }, 300);
}

// ...existing code...

function animateMainContent(direction, callback) {
  const mainContent = document.querySelector('.main-content');
  if (!mainContent) return callback && callback();

  // Remove classes antigas
  mainContent.classList.remove('slide-in-left', 'slide-in-right', 'slide-out-left', 'slide-out-right');

  // Define as classes de saída e entrada
  const outClass = direction === 'left' ? 'slide-out-left' : 'slide-out-right';
  const inClass = direction === 'left' ? 'slide-in-right' : 'slide-in-left';

  mainContent.classList.add(outClass);

  mainContent.addEventListener('animationend', function handler() {
    mainContent.classList.remove(outClass);
    // Troca o conteúdo da aba aqui (ex: ativa a próxima aba)
    if (callback) callback();

    mainContent.classList.add(inClass);
    // Remove a classe de entrada após a animação
    setTimeout(() => {
      mainContent.classList.remove(inClass);
    }, 300);

    mainContent.removeEventListener('animationend', handler);
  });
}

// Exemplo de uso ao trocar de aba:
function trocarAbaComAnimacao(tabAtual, tabNova, direction) {
  animateMainContent(direction, () => {
    // Esconde todas as tabs
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    // Mostra a nova tab
    document.getElementById(tabNova).classList.add('active');
  });
}

function atualizarVisibilidadeAppBody() {
  const abaAtiva = document.querySelector('.tab-content.active');
  const appBody = document.getElementById('app-body');
  const navSeparator = document.querySelector('.bottom-nav-separator');

  const abasComTarefas = [
    'tab-tasks',
    'tab-tasks-nao-periodicas',
    'tab-tasks-personalizadas'
  ];

  const mostrar = abaAtiva && abasComTarefas.includes(abaAtiva.id);

  // Atualiza app-body
  appBody.style.display = mostrar ? 'flex' : 'none';

  // Atualiza estilo do separador
  if (navSeparator) {
    navSeparator.classList.toggle('active', mostrar);
  }
}

document.querySelectorAll('.criar-button').forEach(botao => {
  botao.addEventListener('click', () => {
    const modal = document.getElementById('modal-criar-tarefa');
    const selectTipo = document.getElementById('tipo-tarefa');
    const extras = document.getElementById('personalizadoExtras');

    const abaAtiva = document.querySelector('.tab-content.active');
    let tipoDetectado = 'personalizado';

    if (abaAtiva) {
      switch (abaAtiva.id) {
        case 'tab-tasks':
          tipoDetectado = 'periodico';
          break;
        case 'tab-tasks-nao-periodicas':
          tipoDetectado = 'nao-periodico';
          break;
        case 'tab-tasks-personalizadas':
          tipoDetectado = 'personalizado';
          break;
      }
    }
    
    setTimeout(() => {
      if (selectTipo) {
        selectTipo.value = tipoDetectado;
        ajustarWrappers();
        // Mostra o modal
        modal.style.display = 'flex';

        // Atualiza o valor do select
        selectTipo.value = tipoDetectado;
        
        // Exibe ou esconde os campos extras
        extras.style.display = tipoDetectado === 'personalizado' ? 'block' : 'none';
      } else {
        console.warn("Elemento #tipo-tarefa não encontrado.");
      }
    }, 100);
  });
});
  
window.addEventListener('DOMContentLoaded', () => {
  const label = document.getElementById('git-version-label');
  if (
    window.APP_VERSION &&
    window.APP_VERSION.hash &&
    window.APP_VERSION.date &&
    window.APP_VERSION.msg
  ) {
    label.textContent = `Versão: ${window.APP_VERSION.msg} (${window.APP_VERSION.hash} - ${window.APP_VERSION.date})`;
  } else if (window.APP_VERSION && window.APP_VERSION.hash && window.APP_VERSION.date) {
    label.textContent = `Versão: ${window.APP_VERSION.hash} (${window.APP_VERSION.date})`;
  } else {
    label.textContent = 'Versão: desconhecida';
  }
});


  function ajustarWrappers() {
    const tipoSel = document.getElementById('tipo-tarefa');
    const freqWrap = document.getElementById('frequencia-wrapper');
    const padraoWrap = document.getElementById('padrao-wrapper');
    const tipo = tipoSel.value;
    if (tipo === 'periodico') {
      freqWrap.style.display   = 'block';
      padraoWrap.style.display = 'none';
    } else if (tipo === 'personalizado') {
      freqWrap.style.display   = 'none';
      padraoWrap.style.display = 'block';
    } else { // nao-periodico
      freqWrap.style.display   = 'none';
      padraoWrap.style.display = 'none';
    }
  }

document.addEventListener('DOMContentLoaded', () => {
  const tipoSel           = document.getElementById('tipo-tarefa');
  const freqWrap          = document.getElementById('frequencia-wrapper');
  const padraoWrap        = document.getElementById('padrao-wrapper');
  const modalCriar        = document.getElementById('modal-criar-tarefa');
  const botoesAbrirModal  = document.querySelectorAll('.criar-button');
  const btnFechar         = document.getElementById('fechar-modal');
  const btnCriarTarefa    = document.getElementById('botao-criar-tarefa');

  // 1) Função que mostra ou esconde os wrappers de acordo com o tipo
  function ajustarWrappers() {
    const tipo = tipoSel.value;
    if (tipo === 'periodico') {
      freqWrap.style.display   = 'block';
      padraoWrap.style.display = 'none';
    } else if (tipo === 'personalizado') {
      freqWrap.style.display   = 'none';
      padraoWrap.style.display = 'block';
    } else { // nao-periodico
      freqWrap.style.display   = 'none';
      padraoWrap.style.display = 'none';
    }
  }

  // 2) Quando o select muda, ajusta imediatamente
  tipoSel.addEventListener('change', ajustarWrappers);

  botoesAbrirModal.forEach(botao => {
  botao.addEventListener('click', () => {
    // Detectar aba ativa
    let tipo = 'personalizado'; // default
    if (document.getElementById('tab-tasks').style.display !== 'none') {
      tipo = 'periodico';
    } else if (document.getElementById('tab-tasks-nao-periodicas').style.display !== 'none') {
      tipo = 'nao-periodico';
    } else if (document.getElementById('tab-tasks-personalizadas').style.display !== 'none') {
      tipo = 'personalizado';
    }

    tipoSel.value = tipo;
    ajustarWrappers();
    modalCriar.style.display = 'flex';
    });
  });


  // 4) Ao fechar o modal (X), apenas esconde
  btnFechar.addEventListener('click', () => {
    modalCriar.style.display = 'none';
  });

  // 5) Ao criar a tarefa, garantir que wrappers estejam ajustados
  btnCriarTarefa.addEventListener('click', () => {
  ajustarWrappers();
});
});

document.addEventListener('DOMContentLoaded', () => {
  // Evento para abrir modal de função do item
  document.querySelectorAll('.item-card').forEach(card => {
    // Evita conflito com o botão de comprar
    card.addEventListener('click', function(e) {
      if (e.target.classList.contains('btn-comprar')) return;
      const nome = card.querySelector('.item-nome').textContent;
      const funcao = card.getAttribute('data-funcao') || 'Sem função especial.';
      document.getElementById('titulo-item-modal').textContent = nome;
      document.getElementById('funcao-item-modal').textContent = funcao;
      document.getElementById('modal-funcao-item').style.display = 'block';
    });
  });

  // Fecha o modal
  document.getElementById('fechar-modal-funcao').onclick = () => {
    document.getElementById('modal-funcao-item').style.display = 'none';
  };

  // Listeners do modal de amigo
  const modalAmigo = document.getElementById('modal-amigo');
  const btnFecharModalAmigo = document.getElementById('btn-fechar-modal-amigo');
  const btnDesfazerAmizade = document.getElementById('btn-desfazer-amizade');

  if (btnFecharModalAmigo) {
    btnFecharModalAmigo.onclick = () => {
      modalAmigo.style.display = 'none';
    };
  }

  if (btnDesfazerAmizade) {
    btnDesfazerAmizade.onclick = () => {
      const uid = modalAmigo.dataset.uid;
      desfazerAmizade(uid);
      modalAmigo.style.display = 'none';
    };
  }

});

// ...existing code...

function isMobile() {
  return window.innerWidth <= 1040;
}

function animateCarousel(grid, idx, cardSelector) {
  const cards = Array.from(grid.querySelectorAll(cardSelector));
  if (!cards[idx]) return;
  const cardWidth = cards[idx].offsetWidth;
  const offset = -idx * cardWidth;
  grid.style.transform = `translateX(${offset}px)`;
}

function setupGraficoCarousel() {
  const grid = document.querySelector('.grafico-grid');
  const cards = Array.from(document.querySelectorAll('.grafico-card'));
  const prevBtn = document.getElementById('grafico-prev');
  const nextBtn = document.getElementById('grafico-next');
  const indicadores = Array.from(document.querySelectorAll('.grafico-indicador'));
  if (!grid || cards.length === 0) return;

  let current = 0;

  function updateIndicadores(idx) {
    indicadores.forEach((el, i) => {
      el.classList.toggle('ativo', i === idx);
    });
  }

  function scrollToCard(idx) {
    if (!isMobile()) return;
    current = Math.max(0, Math.min(idx, cards.length - 1));
    cards[current].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    updateIndicadores(current);
    // Desabilita botões nas extremidades
    if (prevBtn && nextBtn) {
      prevBtn.disabled = current === 0;
      nextBtn.disabled = current === cards.length - 1;
    }
  }

  // Botões
  if (prevBtn && nextBtn) {
    prevBtn.onclick = () => scrollToCard(current - 1);
    nextBtn.onclick = () => scrollToCard(current + 1);
  }

  // Indicadores clicáveis
  indicadores.forEach((el, i) => {
    el.onclick = () => scrollToCard(i);
  });

  // Swipe touch events
  let startX = null;
  grid.addEventListener('touchstart', e => {
    if (!isMobile()) return;
    startX = e.touches[0].clientX;
  });
  grid.addEventListener('touchend', e => {
    if (!isMobile() || startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) scrollToCard(current + 1);
      else scrollToCard(current - 1);
    }
    startX = null;
  });

  // Snap para o card correto ao redimensionar
  window.addEventListener('resize', () => {
    if (isMobile()) {
      scrollToCard(current);
    }
  });

  // Inicializa
  if (isMobile()) scrollToCard(0);
  else updateIndicadores(0);
}
window.addEventListener('DOMContentLoaded', setupGraficoCarousel);

// ...existing code...

function isMobileTarefasSlider() {
  return window.innerWidth <= 1040;
}
function setupTarefasSliderCarousel() {
  const grid = document.querySelector('.tarefas-slider-grid');
  const cards = Array.from(document.querySelectorAll('.tarefas-slider-card'));
  const prevBtn = document.getElementById('tarefas-slider-prev');
  const nextBtn = document.getElementById('tarefas-slider-next');
  const indicadores = Array.from(document.querySelectorAll('.tarefas-slider-indicador'));
  if (!grid || cards.length === 0) return;

  let current = 0;

  function updateIndicadores(idx) {
    indicadores.forEach((el, i) => {
      el.classList.toggle('ativo', i === idx);
    });
  }

  function scrollToCard(idx) {
    if (!isMobileTarefasSlider()) return;
    current = Math.max(0, Math.min(idx, cards.length - 1));
    cards[current].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    updateIndicadores(current);
    if (prevBtn && nextBtn) {
      prevBtn.disabled = current === 0;
      nextBtn.disabled = current === cards.length - 1;
    }
  }

  if (prevBtn && nextBtn) {
    prevBtn.onclick = () => scrollToCard(current - 1);
    nextBtn.onclick = () => scrollToCard(current + 1);
  }

  indicadores.forEach((el, i) => {
    el.onclick = () => scrollToCard(i);
  });

  let startX = null;
  grid.addEventListener('touchstart', e => {
    if (!isMobileTarefasSlider()) return;
    startX = e.touches[0].clientX;
  });
  grid.addEventListener('touchend', e => {
    if (!isMobileTarefasSlider() || startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) scrollToCard(current + 1);
      else scrollToCard(current - 1);
    }
    startX = null;
  });

  window.addEventListener('resize', () => {
    if (isMobileTarefasSlider()) {
      scrollToCard(current);
    }
  });

  // --- NOVO: lógica para abrir o card correto por padrão ---
  function temTarefas(container) {
    if (container.querySelector('.task-rect')) return true;
    if (
      container.children.length === 1 &&
      container.children[0].tagName === 'P' &&
      container.children[0].textContent.trim().toLowerCase().includes('nenhuma')
    ) {
      return false;
    }
    if (container.children.length === 0) return false;
    return true;
  }

  if (isMobileTarefasSlider()) {
    const fixadas = document.querySelector('#tarefas-fixadas .tasks-container');
    const proximas = document.querySelector('#tarefas-proximas .tasks-container');
    if (fixadas && proximas) {
      const temFixadas = temTarefas(fixadas);
      const temProximas = temTarefas(proximas);
      if (!temFixadas && temProximas) {
        scrollToCard(1); // Abre "Tarefas Próximas"
      } else {
        scrollToCard(0); // Abre "Tarefas Fixadas" (padrão)
      }
    } else {
      scrollToCard(0);
    }
  } else {
    updateIndicadores(0);
  }
}
window.setupTarefasSliderCarousel = setupTarefasSliderCarousel;
// ...existing code...
window.addEventListener('DOMContentLoaded', () => {
  // ...existing code...

  // Mostra aviso se o carregamento demorar mais de 6 segundos
  setTimeout(() => {
    const warning = document.getElementById('loader-warning');
    if (warning && document.getElementById('app-loader').style.display !== 'none') {
      warning.style.display = 'flex';
    }
  }, 2000);

  // ...existing code...
  atualizarUIInimigo();
});

document.addEventListener('DOMContentLoaded', () => {
  const btnAbrirPersonagem = document.querySelector('.class-name.icons-info');
  const modalPersonagem = document.getElementById('modal-personagem');
  const fecharModalPersonagem = document.getElementById('fechar-modal-personagem');

  if (btnAbrirPersonagem && modalPersonagem && fecharModalPersonagem) {
    btnAbrirPersonagem.addEventListener('click', () => {
      modalPersonagem.style.display = 'flex';
    });
    fecharModalPersonagem.addEventListener('click', () => {
      modalPersonagem.style.display = 'none';
    });
    // Fecha ao clicar fora do conteúdo
    modalPersonagem.addEventListener('click', (e) => {
      if (e.target === modalPersonagem) {
        modalPersonagem.style.display = 'none';
      }
    });
  }
});

function atualizarVisibilidadeTarefasSlider() {
  const sliderColuna = document.querySelector('.tarefas-slider-coluna');
  const fixadas = document.querySelector('#tarefas-fixadas .tasks-container');
  const proximas = document.querySelector('#tarefas-proximas .tasks-container');

  if (!sliderColuna || !fixadas || !proximas) return;

  // Função auxiliar: retorna true se há tarefas reais (elementos que NÃO são só <p> com mensagem)
  function temTarefas(container) {
    // Se tem .task-rect, tem tarefa real
    if (container.querySelector('.task-rect')) return true;
    // Se só tem 1 filho e é <p> com "nenhuma tarefa", considera vazio
    if (
      container.children.length === 1 &&
      container.children[0].tagName === 'P' &&
      container.children[0].textContent.trim().toLowerCase().includes('nenhuma')
    ) {
      return false;
    }
    // Se não tem filhos, está vazio
    if (container.children.length === 0) return false;
    // Se tem outros elementos, considera que tem tarefas
    return true;
  }

  const temFixadas = temTarefas(fixadas);
  const temProximas = temTarefas(proximas);

  if (!temFixadas && !temProximas) {
    sliderColuna.style.display = 'none';
  } else {
    sliderColuna.style.display = '';
  }
}
window.atualizarVisibilidadeTarefasSlider = atualizarVisibilidadeTarefasSlider;
// Chame essa função sempre que atualizar as tarefas fixadas/próximas

