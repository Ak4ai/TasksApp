import { auth } from './auth.js';
import { db, carregarMeuSimpleID, listarAmigosAceitos } from './firebase-config.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { query, where, doc, collection, addDoc, getDocs, Timestamp, deleteDoc, serverTimestamp, setDoc, getDoc, increment } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import { carregarTarefas,mostrarPopup,carregarInventario, calcularDefesa, atualizarXP, atualizarMoedas } from './tarefas.js';
export { atacarInimigo, inimigoAtaca, darRecompensa, mostrarMissoesDiarias };


const MISSOES_DIARIAS = [
  {
    id: 'fisico',
    descricao: 'Conclua 2 tarefas do tipo Físico',
    tipo: 'Físico', 
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
  },
  {
    id: 'dois-tipos',
    descricao: 'Conclua uma tarefa de dois tipos diferentes',
    tipo: 'dois-tipos',
    quantidade: 2,
    xp: 60
  },
  {
    id: 'dano-inimigo',
    descricao: 'Dê 15 de dano no inimigo hoje',
    tipo: 'dano-inimigo',
    quantidade: 15,
    xp: 60
  },
  {
    id: 'ganhe-xp',
    descricao: 'Ganhe 20 de XP hoje',
    tipo: 'ganhe-xp',
    quantidade: 20,
    xp: 60
  }
];

const MISSOES_COMPARTILHADAS = [
  {
    id: 'coop-fisico',
    descricao: 'Junto com um amigo, concluam 3 tarefas do tipo Físico cada um',
    tipo: 'Físico',
    quantidade: 3,
    xp: 100
  },
  {
    id: 'coop-social',
    descricao: 'Você e um amigo devem completar 2 tarefas Sociais cada',
    tipo: 'Social',
    quantidade: 2,
    xp: 100
  },
  {
    id: 'coop-intelecto',
    descricao: 'Você e um amigo devem completar 2 tarefas de Intelecto cada',
    tipo: 'Intelecto',
    quantidade: 2,
    xp: 100
  },
  {
    id: 'coop-criativo',
    descricao: 'Em cooperação, façam 2 tarefas do tipo Criativo cada um',
    tipo: 'Criativo',
    quantidade: 2,
    xp: 100
  },
  {
    id: 'coop-espiritual',
    descricao: 'Junto com um amigo, concluam 1 tarefa Espiritual cada',
    tipo: 'Espiritual',
    quantidade: 1,
    xp: 100
  }
];


// Sorteia e salva as missões do dia
async function sortearMissoesDiarias(uid) {
  const missoes = [];
  const indices = [];

  // Sorteia 2 missões comuns
  while (missoes.length < 2) {
    const idx = Math.floor(Math.random() * MISSOES_DIARIAS.length);
    if (!indices.includes(idx)) {
      indices.push(idx);
      missoes.push({
        ...MISSOES_DIARIAS[idx],
        progresso: 0,
        concluida: false
      });
    }
  }

  // Tenta sortear missão compartilhada, se tiver amigo
  const amigos = await obterAmigosUID(uid);

  if (amigos.length > 0) {
    // Escolhe um amigo aleatório
    const randomAmigoUid = amigos[Math.floor(Math.random() * amigos.length)];

    // Busca o simpleID do amigo
    const amigoDoc = await getDoc(doc(db, "usuarios", randomAmigoUid));
    const amigoData = amigoDoc.exists() ? amigoDoc.data() : null;

    if (amigoData) {
      const missaoCompartilhada = MISSOES_COMPARTILHADAS[
        Math.floor(Math.random() * MISSOES_COMPARTILHADAS.length)
      ];

      missoes.push({
        ...missaoCompartilhada,
        progresso: 0,
        concluida: false,
        tipo: "compartilhada",
        com: randomAmigoUid,
        comSimpleID: amigoData.simpleID || "Amigo"
      });
    }
  }

  // Salva tudo no Firestore
  const ref = doc(db, "usuarios", uid, "missoes", "diaria");
  await setDoc(ref, {
    data: new Date().toDateString(),
    missoes
  });

  return missoes;
}


async function obterAmigosUID(uid) {
  const q1 = query(collection(db, "amizades"), where("from", "==", uid), where("status", "==", "accepted"));
  const q2 = query(collection(db, "amizades"), where("to", "==", uid), where("status", "==", "accepted"));
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  const amigosUIDsSet = new Set();

  snap1.forEach(doc => amigosUIDsSet.add(doc.data().to));
  snap2.forEach(doc => amigosUIDsSet.add(doc.data().from));

  return Array.from(amigosUIDsSet);
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

function abrirModalTrocarMissao(missao, idx, uid) {
  const modal = document.getElementById('modal-trocar-missao');
  const fechar = document.getElementById('fechar-modal-trocar-missao');
  const btnTrocar = document.getElementById('btn-trocar-missao-modal');
  const texto = document.getElementById('texto-troca-missao');

  // NOVO: Se já está concluída, mostra mensagem especial e desabilita botão
  if (missao.concluida) {
    texto.textContent = 'Você já concluiu essa tarefa. Não é possível trocá-la.';
    btnTrocar.disabled = true;
  } else {
  // Verifica se já foi trocada hoje
  const jaTrocou = missao.dataTroca === new Date().toDateString();
  btnTrocar.disabled = jaTrocou || missao.concluida;
  texto.textContent = jaTrocou
    ? 'Você já trocou esta missão hoje.'
    : 'Só é possível trocar cada missão uma vez por dia.';
  }

  modal.style.display = 'flex';

  fechar.onclick = () => { modal.style.display = 'none'; };
  btnTrocar.onclick = async () => {
    btnTrocar.disabled = true;
    await trocarMissaoDiaria(uid, missao.id);
    modal.style.display = 'none';
    mostrarMissoesDiarias(uid);
  };
}

async function trocarMissaoDiaria(uid, missaoId) {
  const ref = doc(db, "usuarios", uid, "missoes", "diaria");
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const idx = data.missoes.findIndex(m => m.id === missaoId);
  if (idx === -1) return;

  // Sorteia uma missão diferente das atuais
  const idsAtuais = data.missoes.map(m => m.id);
  const opcoes = MISSOES_DIARIAS.filter(m => !idsAtuais.includes(m.id));
  if (opcoes.length === 0) return;
  const nova = opcoes[Math.floor(Math.random() * opcoes.length)];

  // Troca e marca data da troca
  data.missoes[idx] = { ...nova, progresso: 0, concluida: false, dataTroca: new Date().toDateString() };
  await setDoc(ref, data);
}

// Mostra as missões na home
async function mostrarMissoesDiarias(uid) {
  const missoes = await carregarMissoesDiarias(uid);
  const container = document.getElementById('missoes-diarias');
  if (!container) return;
  container.innerHTML = '<h3>Missões Diárias</h3>';
  missoes.forEach((missao, idx) => {
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
    const amigoInfo = missao.comSimpleID ? `<br><small>🤝 Com: ${missao.comSimpleID}</small>` : '';

    div.innerHTML = `
      <span class="missao-desc">${missao.descricao}${amigoInfo}</span>
      <span class="missao-info-lateral">
        <span class="missao-progresso">
          ${missao.concluida ? '<span class="missao-check">✔️</span>' : '<span class="missao-tempo">⏳</span>'}
          ${missao.progresso || 0} / ${missao.quantidade}
        </span>
        <span class="missao-xp" title="XP da missão">
          <span class="estrela-xp">⭐</span> ${missao.xp} XP
        </span>
      </span>
    `;
    div.style.cursor = 'pointer';
    div.onclick = () => abrirModalTrocarMissao(missao, idx, uid);
    container.appendChild(div);
  });

} 

export async function atualizarProgressoMissoes(uid, tipoTarefa, xpGanho = 0) {
  const ref = doc(db, "usuarios", uid, "missoes", "diaria");
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  let alterou = false;

  for (const missao of data.missoes) {
    // Missões padrão por tipo
    if (!missao.concluida && ['Físico','Intelecto','Social','Criativo','Espiritual'].includes(missao.tipo) && missao.tipo === tipoTarefa) {
      missao.progresso = (missao.progresso || 0) + 1;
      if (missao.progresso >= missao.quantidade) {
        missao.concluida = true;
        await darRecompensa(uid, missao.xp, 0);
        mostrarPopup(`Missão concluída! +${missao.xp} XP`);
      }
      alterou = true;
    }

    // Missão "dois tipos"
    if (!missao.concluida && missao.tipo === 'dois-tipos' && tipoTarefa) {
      if (!missao.tipos) missao.tipos = [];
      if (!missao.tipos.includes(tipoTarefa)) {
        missao.tipos.push(tipoTarefa);
        missao.progresso = missao.tipos.length;
        if (missao.progresso >= missao.quantidade) {
          missao.concluida = true;
          await darRecompensa(uid, missao.xp, 0);
          mostrarPopup(`Missão concluída! +${missao.xp} XP`);
        }
        alterou = true;
      }
    }

    // Missão "ganhe xp"
    if (!missao.concluida && missao.tipo === 'ganhe-xp' && xpGanho > 0) {
      missao.progresso = (missao.progresso || 0) + xpGanho;
      if (missao.progresso >= missao.quantidade) {
        missao.concluida = true;
        await darRecompensa(uid, missao.xp, 0);
        mostrarPopup(`Missão concluída! +${missao.xp} XP`);
      }
      alterou = true;
    }

    // ✅ Missão compartilhada
    if (!missao.concluida && missao.tipo === "compartilhada" && missao.com && missao.descricao && tipoTarefa && missao.descricao.toLowerCase().includes(tipoTarefa.toLowerCase())) {
      missao.progresso = (missao.progresso || 0) + 1;
      if (missao.progresso >= missao.quantidade) {
        missao.concluida = true;
        await darRecompensa(uid, missao.xp, 0);
        mostrarPopup(`Missão compartilhada concluída! +${missao.xp} XP`);
      }
      alterou = true;

      // 🔁 Atualiza também a missão do amigo
      const refAmigo = doc(db, "usuarios", missao.com, "missoes", "diaria");
      const snapAmigo = await getDoc(refAmigo);
      if (snapAmigo.exists()) {
        const dataAmigo = snapAmigo.data();
        let alterouAmigo = false;
        for (const missaoAmigo of dataAmigo.missoes) {
          if (!missaoAmigo.concluida && missaoAmigo.tipo === "compartilhada" && missaoAmigo.com === uid && missaoAmigo.descricao === missao.descricao) {
            missaoAmigo.progresso = (missaoAmigo.progresso || 0) + 1;
            if (missaoAmigo.progresso >= missaoAmigo.quantidade) {
              missaoAmigo.concluida = true;
              await darRecompensa(missao.com, missaoAmigo.xp, 0);
              // Você pode também adicionar um popup remoto via notificação ou flag
            }
            alterouAmigo = true;
            break;
          }
        }
        if (alterouAmigo) {
          await setDoc(refAmigo, dataAmigo);
        }
      }
    }
  }

  if (alterou) {
    await setDoc(ref, data);
  }
}

const INIMIGOS = [
  {
    nome: "Slime",
    vidaAtual: 30,
    vidaMaxima: 30,
    imagem: "img/slime.png",
    recompensaXP: 60,
    recompensaMoedas: 20,
    danoPorExpirada: 5,
    tags: ["selvagem"]
  },
  {
    nome: "Goblin",
    vidaAtual: 50,
    vidaMaxima: 50,
    imagem: "img/goblin.png",
    recompensaXP: 100,
    recompensaMoedas: 50,
    danoPorExpirada: 10,
    tags: ["selvagem"]
  },
  {
    nome: "Esqueleto",
    vidaAtual: 90,
    vidaMaxima: 90,
    imagem: "img/esqueleto.png",
    recompensaXP: 120,
    recompensaMoedas: 60,
    danoPorExpirada: 12,
    tags: ["sombrio", "morto-vivo"]
  },
  {
    nome: "Orc",
    vidaAtual: 150,
    vidaMaxima: 150,
    imagem: "img/orc.png",
    recompensaXP: 150,
    recompensaMoedas: 80,
    danoPorExpirada: 15,
    tags: ["selvagem"]
  },
  {
    nome: "Mago Sombrio",
    vidaAtual: 130,
    vidaMaxima: 130,
    imagem: "img/mago_sombrio.png",
    recompensaXP: 180,
    recompensaMoedas: 100,
    danoPorExpirada: 18,
    tags: ["sombrio", "mágico"]
  },
  {
    nome: "Cavaleiro Negro",
    vidaAtual: 180,
    vidaMaxima: 180,
    imagem: "img/cavaleiro_negro.png",
    recompensaXP: 220,
    recompensaMoedas: 120,
    danoPorExpirada: 20,
    tags: ["sombrio", "guerreiro"]
  },
  {
    nome: "Dragão",
    vidaAtual: 300,
    vidaMaxima: 300,
    imagem: "img/dragao.png",
    recompensaXP: 300,
    recompensaMoedas: 150,
    danoPorExpirada: 25,
    tags: ["lendário", "selvagem"]
  },
  {
    nome: "Rei Demônio",
    vidaAtual: 400,
    vidaMaxima: 400,
    imagem: "img/rei_demonio.png",
    recompensaXP: 500,
    recompensaMoedas: 300,
    danoPorExpirada: 35,
    tags: ["sombrio", "lendário"]
  }
  // Adicione mais inimigos aqui
];


function getNovoInimigo(indice = 0) {
  const idx = Math.max(0, Math.min(indice, INIMIGOS.length - 1));
  const base = INIMIGOS[idx];
  return { ...base, indice: idx, vidaAtual: base.vidaMaxima, ataquesDisponiveis: 0 };  
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

  // Corrigido: troca as imagens dentro da div
  const inimigoImgDiv = document.getElementById('inimigo-img');
  if (inimigoImgDiv) {
    // Sombra (primeira imagem)
    const sombraImg = inimigoImgDiv.querySelector('.inimigo-sombra');
    if (sombraImg) sombraImg.src = inimigo.imagem;
    // Imagem principal (segunda imagem)
    const mainImg = Array.from(inimigoImgDiv.querySelectorAll('img')).find(img => !img.classList.contains('inimigo-sombra'));
    if (mainImg) mainImg.src = inimigo.imagem;
  }

  document.getElementById('inimigo-nome').textContent = inimigo.nome;
  document.getElementById('inimigo-vida-text').textContent = `${inimigo.vidaAtual} / ${inimigo.vidaMaxima}`;
  const recompensaDiv = document.getElementById('inimigo-recompensa');
  if (recompensaDiv) {
    recompensaDiv.textContent = `Recompensa: ${inimigo.recompensaXP} XP, ${inimigo.recompensaMoedas} moedas`;
  }

  // Atualiza barra de vida
  const percent = Math.max(0, Math.round((inimigo.vidaAtual / inimigo.vidaMaxima) * 100));
  document.getElementById('inimigo-vida-fill').style.width = percent + "%";

  // Atualiza botão de ataque extra
  const btn = document.getElementById('atacar-inimigo');
  if (btn) {
    const ataques = inimigo.ataquesDisponiveis || 0;
    btn.textContent = ataques > 0 ? `Atacar (${ataques})` : 'Atacar (0)';
    btn.disabled = ataques <= 0;
  }

  // Troca o background da main-content.show conforme a tag do inimigo
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    // Remove todas as classes de fundo possíveis
    mainContent.classList.remove(
      'bg-inimigo-sombrio',
      'bg-inimigo-selvagem',
      'bg-inimigo-magico',
      'bg-inimigo-lendario'
    );
    // Define prioridade: lendário > sombrio > magico > selvagem
    let bgClass = '';
    if (inimigo.tags?.includes('lendário')) bgClass = 'bg-inimigo-lendario';
    else if (inimigo.tags?.includes('sombrio')) bgClass = 'bg-inimigo-sombrio';
    else if (inimigo.tags?.includes('mágico')) bgClass = 'bg-inimigo-magico';
    else if (inimigo.tags?.includes('selvagem')) bgClass = 'bg-inimigo-selvagem';
    if (bgClass) mainContent.classList.add(bgClass);
  }
}

async function atualizarProgressoDanoInimigo(uid, dano) {
  const ref = doc(db, "usuarios", uid, "missoes", "diaria");
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  let alterou = false;
  for (const missao of data.missoes) {
    if (!missao.concluida && missao.tipo === 'dano-inimigo') {
      missao.progresso = (missao.progresso || 0) + dano;
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

async function atacarInimigo(dano = 10) {
  const usuario = auth.currentUser;
  if (!usuario) return;
  let inimigo = await carregarInimigoFirestore(usuario.uid);

  // Subtrai o dano da vida atual
  inimigo.vidaAtual = Math.max(0, inimigo.vidaAtual - dano);

  // Sempre que der dano automático, adiciona 1 ataque extra
  inimigo.ataquesDisponiveis = (inimigo.ataquesDisponiveis || 0) + 1;

  // Adiciona progresso para ataque especial
  inimigo.ataquesNormaisDados = (inimigo.ataquesNormaisDados || 0) + 1;

  // Salva o inimigo atualizado
  await salvarInimigoFirestore(usuario.uid, inimigo);

  // Atualiza a UI
  atualizarUIInimigo();

  // Atualiza botão especial
  atualizarBotaoEspecial();

  await atualizarProgressoDanoInimigo(usuario.uid, dano);

  // Se morreu, processa derrota e troca de inimigo
  if (inimigo.vidaAtual <= 0) {
    mostrarPopup(`Você derrotou ${inimigo.nome}! Ganhou ${inimigo.recompensaXP} XP e ${inimigo.recompensaMoedas} moedas!`);
    await darRecompensa(usuario.uid, inimigo.recompensaXP, inimigo.recompensaMoedas);

    await atualizarProgressoMissoes(usuario.uid, null, inimigo.recompensaXP);

    // Preserva ataques extras e especiais antes de trocar de inimigo
    const ataquesExtrasPreservados = inimigo.ataquesDisponiveis || 0;
    const ataquesEspeciaisPreservados = inimigo.ataquesNormaisDados || 0;

    // Avança para o próximo inimigo
    const proximoIndice = (inimigo.indice ?? 0) + 1;
    if (proximoIndice < INIMIGOS.length) {
      inimigo = getNovoInimigo(proximoIndice);
    } else {
      inimigo = getNovoInimigo(0);
    }
    
    // Restaura as contagens preservadas
    inimigo.ataquesDisponiveis = ataquesExtrasPreservados;
    inimigo.ataquesNormaisDados = ataquesEspeciaisPreservados;
    
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
      atualizarBotaoEspecial();
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



// Detecta iOS e adiciona classe ao body para ajuste do botão de ajuda
function isIOSDevice() {
    const ua = navigator.userAgent.toLowerCase();
    return /iphone|ipod|ipad/.test(ua) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

if (isIOSDevice()) {
    document.body.classList.add('ios');
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
        'tab-amigos-active',
        'tab-settings-active',
      );

      if (alvo === 'tab-home') document.body.classList.add('tab-home-active');
      if (alvo === 'tab-tasks') document.body.classList.add('tab-tasks-active');
      if (alvo === 'tab-tasks-nao-periodicas') document.body.classList.add('tab-tasks-nao-periodicas-active');
      if (alvo === 'tab-tasks-personalizadas') document.body.classList.add('tab-tasks-personalizadas-active');
      if (alvo === 'tab-amigos') document.body.classList.add('tab-amigos-active');
            // ...dentro do eventListener das nav-buttons...
      if (alvo === 'tab-settings') document.body.classList.add('tab-settings-active');

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
      'tab-tasks-personalizadas-active',
      'tab-enemy-active',
      'tab-settings-active',
    );
    if (nextTabId === 'tab-home') document.body.classList.add('tab-home-active');
    if (nextTabId === 'tab-tasks') document.body.classList.add('tab-tasks-active');
    if (nextTabId === 'tab-tasks-nao-periodicas') document.body.classList.add('tab-tasks-nao-periodicas-active');
    if (nextTabId === 'tab-tasks-personalizadas') document.body.classList.add('tab-tasks-personalizadas-active');
    if (nextTabId === 'tab-enemy') document.body.classList.add('tab-enemy-active');
    if (nextTabId === 'tab-settings') document.body.classList.add('tab-settings-active');
    

    // Adiciona ou remove a classe show em main-content igual aos botões
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      if (nextTabId === 'tab-enemy') {
        mainContent.classList.add('show');
      } else {
        mainContent.classList.remove('show');
      }
    }

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
    if (isMobile()) {
      // Calcula o offset manualmente
      grid.scrollLeft = cards[current].offsetLeft;
      updateIndicadores(current);
    }
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
    if (isMobileTarefasSlider()) {
      grid.scrollLeft = cards[current].offsetLeft;
      updateIndicadores(current);
    }
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
    if (!container) return false;
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

  // Aguarda o carregamento das tarefas antes de decidir qual card abrir
  setTimeout(() => {
    if (isMobileTarefasSlider()) {
      const fixadas = document.querySelector('#tarefas-fixadas .tasks-container');
      const proximas = document.querySelector('#tarefas-proximas .tasks-container');
      const temFixadas = temTarefas(fixadas);
      const temProximas = temTarefas(proximas);
      if (!temFixadas && temProximas) {
        scrollToCard(1); // Abre "Tarefas Próximas"
      } else {
        scrollToCard(0); // Abre "Tarefas Fixadas" (padrão)
      }
    } else {
      updateIndicadores(0);
    }
  }, 100); // Pequeno delay para garantir que as tarefas já estejam no DOM
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
// Adiciona ataques extras ao inimigo do usuário
export async function adicionarAtaqueExtra(uid, quantidade = 1) {
  const ref = doc(db, "usuarios", uid, "inimigo", "atual");
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const inimigo = snap.data();
  inimigo.ataquesDisponiveis = (inimigo.ataquesDisponiveis || 0) + quantidade;
  await setDoc(ref, inimigo);
  await atualizarUIInimigo();
}

// Atacar usando ataque extra (consome 1 ataque extra)
export async function atacarInimigoExtra(dano = 10) {
  const usuario = auth.currentUser;
  if (!usuario) return;
  let inimigo = await carregarInimigoFirestore(usuario.uid);

  if ((inimigo.ataquesDisponiveis || 0) <= 0) {
    mostrarPopup("Você não possui ataques extras disponíveis!");
    return;
  }

  // --- ANIMAÇÃO DE ATAQUE ---
  const inimigoImgDiv = document.getElementById('inimigo-img');
  if (inimigoImgDiv) {
    inimigoImgDiv.classList.remove('inimigo-anim-ataque');
    void inimigoImgDiv.offsetWidth;
    inimigoImgDiv.classList.add('inimigo-anim-ataque');
    setTimeout(() => inimigoImgDiv.classList.remove('inimigo-anim-ataque'), 400);
  }
  // --- FIM ANIMAÇÃO ---

  inimigo.ataquesDisponiveis -= 1;
  inimigo.vidaAtual = Math.max(0, inimigo.vidaAtual - dano);

  // 1.1. Conta ataques normais
  inimigo.ataquesNormaisDados = (inimigo.ataquesNormaisDados || 0) + 1;

  await salvarInimigoFirestore(usuario.uid, inimigo);
  await atualizarUIInimigo();

  await atualizarProgressoDanoInimigo(usuario.uid, dano);

  if (inimigo.vidaAtual <= 0) {
    // Preserva ataques extras e especiais ANTES de dar recompensas
    const ataquesExtrasPreservados = inimigo.ataquesDisponiveis || 0;
    const ataquesEspeciaisPreservados = inimigo.ataquesNormaisDados || 0;

    mostrarPopup(`Você derrotou ${inimigo.nome}! Ganhou ${inimigo.recompensaXP} XP e ${inimigo.recompensaMoedas} moedas!`);
    await darRecompensa(usuario.uid, inimigo.recompensaXP, inimigo.recompensaMoedas);

    // Atualiza a interface após dar as recompensas
    await atualizarXP();
    await atualizarMoedas();

    await atualizarProgressoMissoes(usuario.uid, null, inimigo.recompensaXP);

    // Próximo inimigo
    const proximoIndice = (inimigo.indice ?? 0) + 1;
    inimigo = getNovoInimigo(proximoIndice < INIMIGOS.length ? proximoIndice : 0);
    
    // Restaura as contagens preservadas
    inimigo.ataquesDisponiveis = ataquesExtrasPreservados;
    inimigo.ataquesNormaisDados = ataquesEspeciaisPreservados;
    
    await salvarInimigoFirestore(usuario.uid, inimigo);
    await atualizarUIInimigo();
  }
  // Atualiza botão especial
  atualizarBotaoEspecial();
}

// 2. Função de ataque especial
export async function ataqueEspecialInimigo() {
  const usuario = auth.currentUser;
  if (!usuario) return;
  let inimigo = await carregarInimigoFirestore(usuario.uid);

  if ((inimigo.ataquesNormaisDados || 0) < 10) {
    mostrarPopup("Você precisa dar 10 ataques normais para usar o ataque especial!");
    return;
  }

  // --- ANIMAÇÃO DE ATAQUE ESPECIAL ---
  window.playEspecialSpriteAnimation;
  playEspecialSpriteAnimation('especial-attack-canvas');

  // Balanço forte no inimigo
  const inimigoImgDiv = document.getElementById('inimigo-img');
  if (inimigoImgDiv) {
    inimigoImgDiv.classList.remove('inimigo-anim-especial');
    void inimigoImgDiv.offsetWidth; // força reflow
    inimigoImgDiv.classList.add('inimigo-anim-especial');
    setTimeout(() => inimigoImgDiv.classList.remove('inimigo-anim-especial'), 600);
  }
  // --- FIM ANIMAÇÃO ---

  const danoEspecial = 10 * 10;
  inimigo.vidaAtual = Math.max(0, inimigo.vidaAtual - danoEspecial);
  inimigo.ataquesNormaisDados = 0;

  await salvarInimigoFirestore(usuario.uid, inimigo);
  await atualizarUIInimigo();
  await atualizarProgressoDanoInimigo(usuario.uid, danoEspecial);

  mostrarPopup("Ataque especial realizado! 💥");

  if (inimigo.vidaAtual <= 0) {
    // Preserva ataques extras e especiais ANTES de dar recompensas
    const ataquesExtrasPreservados = inimigo.ataquesDisponiveis || 0;
    const ataquesEspeciaisPreservados = inimigo.ataquesNormaisDados || 0;

    mostrarPopup(`Você derrotou ${inimigo.nome}! Ganhou ${inimigo.recompensaXP} XP e ${inimigo.recompensaMoedas} moedas!`);
    await darRecompensa(usuario.uid, inimigo.recompensaXP, inimigo.recompensaMoedas);

    // Atualiza a interface após dar as recompensas
    await atualizarXP();
    await atualizarMoedas();

    await atualizarProgressoMissoes(usuario.uid, null, inimigo.recompensaXP);
    
    const proximoIndice = (inimigo.indice ?? 0) + 1;
    inimigo = getNovoInimigo(proximoIndice < INIMIGOS.length ? proximoIndice : 0);
    
    // Restaura as contagens preservadas
    inimigo.ataquesDisponiveis = ataquesExtrasPreservados;
    inimigo.ataquesNormaisDados = ataquesEspeciaisPreservados;
    
    await salvarInimigoFirestore(usuario.uid, inimigo);
    await atualizarUIInimigo();
  }
  atualizarBotaoEspecial();
}

// 4. Atualize o estado do botão especial:
function atualizarBotaoEspecial() {
  const usuario = auth.currentUser;
  if (!usuario) return;
  carregarInimigoFirestore(usuario.uid).then(inimigo => {
    const btnEspecial = document.getElementById('especial-inimigo');
    if (btnEspecial) {
      // Cria elementos se não existirem
      let bar = btnEspecial.querySelector('.especial-progress-bar');
      let label = btnEspecial.querySelector('.especial-label');
      let text = btnEspecial.querySelector('.especial-progress-text');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'especial-progress-bar';
        btnEspecial.appendChild(bar);
      }
      if (!label) {
        label = document.createElement('span');
        label.className = 'especial-label';
        label.textContent = 'Especial';
        btnEspecial.appendChild(label);
      }
      if (!text) {
        text = document.createElement('span');
        text.className = 'especial-progress-text';
        btnEspecial.appendChild(text);
      }

      const valor = inimigo.ataquesNormaisDados || 0;
      const max = 10;
      const percent = Math.min(100, Math.round((valor / max) * 100));
      bar.style.width = percent + '%';
      text.textContent = `(${valor}/${max})`;

      btnEspecial.disabled = valor < max;
      if (valor >= max) {
        btnEspecial.classList.add('carregado');
      } else {
        btnEspecial.classList.remove('carregado');
      }
    }
  });
}

// 5. Adicione o listener para o botão especial:
document.addEventListener('DOMContentLoaded', () => {
  const btnEspecial = document.getElementById('especial-inimigo'); // <-- id correto
  if (btnEspecial) {
    btnEspecial.onclick = ataqueEspecialInimigo;
    atualizarBotaoEspecial();
  }
});

// Adicione o listener para ataque extra e animação de ataque inimigo

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('atacar-inimigo');
  if (btn) {
    btn.onclick = async () => {
      // Buscar itens ativos do usuário antes de chamar a animação
      const usuario = auth.currentUser;
      let itensAtivos = [];
      if (usuario) {
        const usuarioRef = doc(db, "usuarios", usuario.uid);
        const usuarioSnap = await getDoc(usuarioRef);
        itensAtivos = usuarioSnap.exists() ? (usuarioSnap.data().itensAtivos || []) : [];
      }
      playEnemyAttackAnimation('enemy-attack-canvas', itensAtivos);
      atacarInimigoExtra(10); // ou outro valor de dano
    };
  }
});

function ajustarTamanhoInimigoImg() {
  const container = document.getElementById('tab-enemy');
  const img = document.getElementById('inimigo-img');
  if (!container || !img) return;

  const { width, height } = container.getBoundingClientRect();
  const size = Math.min(width, height - 186); // subtrai 86 do height

  img.style.width = size + 'px';
  img.style.height = size + 'px';
}

const container = document.getElementById('tab-enemy'); // alterado de 'inimigo-container' para 'tab-enemy'
if (container) {
  const ro = new ResizeObserver(ajustarTamanhoInimigoImg);
  ro.observe(container);
  window.addEventListener('resize', ajustarTamanhoInimigoImg);
  ajustarTamanhoInimigoImg();
}


function playEspecialAttackAnimation(canvasId = 'especial-attack-canvas') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.style.display = 'block';
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  const ctx = canvas.getContext('2d');

  // Partículas para explosão
  const particles = [];
  const particleCount = 32;
  for (let i = 0; i < particleCount; i++) {
    const angle = (2 * Math.PI * i) / particleCount;
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: Math.cos(angle) * (2 + Math.random() * 2),
      vy: Math.sin(angle) * (2 + Math.random() * 2),
      alpha: 1,
      radius: 6 + Math.random() * 6,
      color: i % 2 === 0 ? '#ff00dd' : '#b700ff'
    });
  }

  let frame = 0;
  const maxFrames = 40;

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const progress = frame / maxFrames;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(canvas.width, canvas.height) * 0.38;

    // Flash de tela rápido no início
    if (frame < 5) {
      ctx.save();
      ctx.globalAlpha = 0.18 * (1 - frame / 5);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Círculo pulsante (camada 1)
    ctx.save();
    ctx.globalAlpha = 0.7 * (1 - progress);
    const grad1 = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * 0.9);
    grad1.addColorStop(0, '#fff0');
    grad1.addColorStop(0.2, '#ff00dd88');
    grad1.addColorStop(0.6, '#b700ffcc');
    grad1.addColorStop(1, '#fff0');
    ctx.fillStyle = grad1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius * (0.7 + 0.3 * progress), 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    // Círculo pulsante (camada 2)
    ctx.save();
    ctx.globalAlpha = 0.4 * (1 - progress);
    const grad2 = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * 0.6);
    grad2.addColorStop(0, '#fff0');
    grad2.addColorStop(0.3, '#fff');
    grad2.addColorStop(0.7, '#ff00dd44');
    grad2.addColorStop(1, '#fff0');
    ctx.fillStyle = grad2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius * (0.4 + 0.5 * progress), 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    // Explosão de linhas (burst)
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.globalAlpha = 0.5 * (1 - progress);
    ctx.lineWidth = 2 + 4 * (1 - progress);
    for (let i = 0; i < 12; i++) {
      const angle = (2 * Math.PI * i) / 12;
      const len = maxRadius * (0.7 + 0.5 * progress);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle) * len, centerY + Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.restore();

    // Partículas voando para fora
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha * (1 - progress);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (1 - progress * 0.7), 0, 2 * Math.PI);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();

      // Move partículas
      p.x += p.vx * (1 + progress * 1.5);
      p.y += p.vy * (1 + progress * 1.5);
      p.alpha *= 0.96;
    });

    // Flash central
    if (progress > 0.25 && progress < 0.7) {
      ctx.save();
      ctx.globalAlpha = 0.18 * (1 - Math.abs(0.5 - progress) * 2);
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius * 0.22, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.restore();
    }

    frame++;
    if (frame <= maxFrames) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
  }
  animate();
}

document.addEventListener('DOMContentLoaded', () => {
  const ajudaBtn = document.getElementById('ajuda-btn');
  const modalAjuda = document.getElementById('modal-ajuda');
  const fecharAjuda = document.getElementById('fechar-modal-ajuda');
  const conteudoAjuda = document.getElementById('conteudo-ajuda');

  const textosAjuda = {
    'tab-home': `
      <h3>Missões Diárias</h3>
      <ul>
        <li>Todo dia você recebe 2 missões aleatórias.</li>
        <li>Complete missões para ganhar XP extra.</li>
        <li>Você pode trocar cada missão uma vez por dia (clique na missão para trocar).</li>
      </ul>
      <h3>Calendário</h3>
      <ul>
        <li>Veja todas as tarefas agendadas para cada dia.</li>
        <li>Você pode ver dias em que tarefas foram concluídas ou expiradas. Basta marcar a checkbox.</li>
        <li>Use os botões para navegar entre os meses.</li>
      </ul>
      <h3>Gráficos</h3>
      <ul>
        <li>Acompanhe seu desempenho diário, semanal e mensal.</li>
        <li>Veja quantas tarefas concluiu em cada período.</li>
      </ul>
    `,
    'tab-enemy': `
      <h3>Inimigos</h3>
      <ul>
        <li>Ao concluir tarefas, você ataca o inimigo automaticamente.</li>
        <li>Concluir tarefas dá direito a um ataque extra manual.</li>
        <li>Após 10 ataques extras, você pode usar um ataque especial.</li>
        <li>Derrote inimigos para ganhar XP e moedas.</li>
        <li>Se tarefas vencerem, o inimigo te ataca e você perde XP.</li>
      </ul>
    `,
    'tab-tasks': `
      <h3>Tarefas Periódicas</h3>
      <ul>
        <li>Tarefas que se repetem diariamente, semanalmente ou mensalmente.</li>
        <li>Marque como concluída para ganhar XP e moedas.</li>
      </ul>
    `,
    'tab-tasks-nao-periodicas': `
      <h3>Tarefas Não Periódicas</h3>
      <ul>
        <li>Tarefas importantes, mas sem repetição automática.</li>
        <li>Marque como concluída para ganhar recompensas.</li>
      </ul>
    `,
    'tab-tasks-personalizadas': `
      <h3>Tarefas Personalizadas</h3>
      <ul>
        <li>Crie tarefas únicas ou com regras de repetição personalizadas.</li>
        <li>Use tags para organizar.</li>
        <li>Adicione anotações e notificações personalizadas.</li>
      </ul>
    `,
    'tab-inventario': `
      <h3>Inventário</h3>
      <ul>
        <li>Veja e gerencie seus itens comprados.</li>
        <li>Ative, desative ou venda itens.</li>
        <li>Itens ativos dão bônus em tarefas e batalhas.</li>
      </ul>
    `,
    'tab-loja': `
      <h3>Loja</h3>
      <ul>
        <li>Compre itens cosméticos, armas, bônus e consumíveis.</li>
        <li>Itens dão vantagens em tarefas e batalhas (clique em um item para ver o que ele faz).</li>
        <li>Use moedas ganhas ao concluir tarefas.</li>
      </ul>
    `,
    'tab-amigos': `
      <h3>Amigos</h3>
      <ul>
        <li>Adicione amigos pelo ID.</li>
        <li>Veja sua lista de amigos.</li>
        <li>Envie e aceite pedidos de amizade.</li>
      </ul>
    `,
    'tab-settings': `
      <h3>Configurações</h3>
      <ul>
        <li>Altere seu ID público.</li>
        <li>Gerencie notificações, cache e tarefas.</li>
        <li>Veja informações do app e versão.</li>
      </ul>
    `
  };

  ajudaBtn.onclick = () => {
    // Descobre a aba ativa
    const abaAtiva = document.querySelector('.tab-content.active');
    let id = abaAtiva ? abaAtiva.id : '';
    conteudoAjuda.innerHTML = textosAjuda[id] || 'Ajuda não disponível para esta aba.';
    modalAjuda.style.display = 'flex';
  };

  fecharAjuda.onclick = () => {
    modalAjuda.style.display = 'none';
  };

  // Fecha ao clicar fora do conteúdo
  modalAjuda.addEventListener('click', (e) => {
    if (e.target === modalAjuda) modalAjuda.style.display = 'none';
  });
});

document.addEventListener('DOMContentLoaded', function() {
  const ajudaBtn = document.getElementById('ajuda-btn');
  const modalAjuda = document.getElementById('modal-ajuda');
  const naoMostrarBtn = document.querySelector('.nao-mostrar-novamente-btn');
  const checkAjuda = document.getElementById('check-nao-mostrar-ajuda');

  // Função para atualizar o estado do checkbox e do botão
  function syncAjudaCheck() {
    const escondido = localStorage.getItem('naoMostrarAjuda') === '1';
    if (checkAjuda) checkAjuda.checked = escondido;
    if (ajudaBtn) ajudaBtn.style.display = escondido ? 'none' : '';
  }

  // Inicializa o estado ao carregar
  syncAjudaCheck();

  // Quando clicar no botão do modal
  if (naoMostrarBtn) {
    naoMostrarBtn.addEventListener('click', function() {
      localStorage.setItem('naoMostrarAjuda', '1');
      syncAjudaCheck();
      if (modalAjuda) modalAjuda.style.display = 'none';
    });
  }

  // Quando mudar o checkbox na aba de configurações
  if (checkAjuda) {
    checkAjuda.addEventListener('change', function() {
      if (checkAjuda.checked) {
        localStorage.setItem('naoMostrarAjuda', '1');
      } else {
        localStorage.removeItem('naoMostrarAjuda');
      }
      syncAjudaCheck();
    });
  }
});

function esconderBotaoAjuda() {
  const btn = document.getElementById('ajuda-btn');
  if (btn) btn.style.display = 'none';
}
function mostrarBotaoAjuda() {
  const btn = document.getElementById('ajuda-btn');
  if (btn) btn.style.display = '';
}

// Esconde ao abrir qualquer modal principal
['modal-criar-tarefa', 'modal-tarefa', 'modal-ajuda', 'modal-trocar-missao', 'modal-funcao-item', 'modal-amizades', 'modal-amigo', 'modal-tarefas-custom', 'modal-next-event', 'modal-visualizacao-anexo'].forEach(id => {
  const modal = document.getElementById(id);
  if (modal) {
    // Observe mudanças de display
    const observer = new MutationObserver(() => {
      if (modal.style.display !== 'none') {
        esconderBotaoAjuda();
      } else {
        mostrarBotaoAjuda();
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
  }
});