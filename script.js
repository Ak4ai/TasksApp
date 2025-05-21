import { auth } from './auth.js';
import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, Timestamp, deleteDoc } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
// script.js
import { carregarTarefas,mostrarPopup } from './tarefas.js';


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
  document.getElementById('botao-criar-tarefa').addEventListener('click', async () => {
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

    // Se não houver descrição, usa "vazio"
    if (!desc) {
      desc = "vazio";
    }

    // cria a tarefa
    await adicionarTarefa(nome, desc, dataLimite);

    // ✅ mostra popup de sucesso
    mostrarPopup(`Tarefa criada: ${nome}`, 4000);

    // fecha o modal
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
  const tags = [tagPrincipal];
  if (tagSecundaria) tags.push(tagSecundaria);
  // 2) Monta o objeto base
  const novaTarefa = {
    nome,
    descricao,
    dataLimite: Timestamp.fromDate(dataLimiteDate),
    finalizada: false,
    tipo,
    tags 
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

    // modo 'unico' não adiciona mais nada
  }



  // 4) Grava no Firestore
  const tarefasRef = collection(db, "usuarios", usuario.uid, "tarefas");
  const docRef = await addDoc(tarefasRef, novaTarefa);


  // Lida com o anexo (se houver)
  console.log("input anexoArquivo existe?", document.getElementById('anexoArquivo'));
  const input = document.getElementById('anexoArquivo');
  const arquivo = input.files[0];

  if (arquivo) {
    const base64 = await fileToBase64(arquivo);
    const anexoObj = {
      nome: arquivo.name,
      tipo: arquivo.type,
      base64: base64
    };

    // Salva no localStorage usando o ID da tarefa
    localStorage.setItem(`anexos_${docRef.id}`, JSON.stringify(anexoObj));
  }


  // 5) Recarrega a UI
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
  
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(alvo).classList.add('active');
  
        // Remove classes ativas e foca
        document.querySelectorAll('.nav-button').forEach(b => {
          b.classList.remove('active');
          b.blur(); // <-- remove foco/hover preso
        });
  
        btn.classList.add('active');
  
        if (alvo === 'tab-tasks') {
          carregarTarefas();
        }

        

        // ⬇️ ATUALIZA VISIBILIDADE DO APP BODY
        atualizarVisibilidadeAppBody();
      });
    });
  
    // Inicializa na home
    document.querySelector('.nav-button[data-tab="tab-home"]').click();
  });
  
  let touchStartX = 0;
let touchEndX = 0;
const minSwipeDistance = 100; // AUMENTADO para reduzir sensibilidade

document.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
}, false);

document.addEventListener('touchend', e => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
}, false);

function handleSwipe() {
  const deltaX = touchEndX - touchStartX;
  if (Math.abs(deltaX) < minSwipeDistance) return;

  const navButtons = Array.from(document.querySelectorAll('.bottom-nav .nav-button'));
  const activeBtn = document.querySelector('.bottom-nav .nav-button.active');
  const activeTabId = activeBtn.dataset.tab;
  const activeTab = document.getElementById(activeTabId);
  let idx = navButtons.indexOf(activeBtn);

  // Determinar próximo índice
  if (deltaX < 0) {
    idx = (idx + 1) % navButtons.length;
  } else {
    idx = (idx - 1 + navButtons.length) % navButtons.length;
  }

  const nextBtn = navButtons[idx];
  const nextTabId = nextBtn.dataset.tab;
  const nextTab = document.getElementById(nextTabId);

  // Aplica classe de animação de saída
  activeTab.classList.add('tab-exit');
  nextTab.classList.add('tab-enter');

  setTimeout(() => {
    // Troca aba ativa
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    nextTab.classList.add('active');

    navButtons.forEach(b => b.classList.remove('active'));
    nextBtn.classList.add('active');

    // Remove animações após transição
    activeTab.classList.remove('tab-exit');
    nextTab.classList.remove('tab-enter');

    

    // ⬇️ ATUALIZA VISIBILIDADE DO APP BODY
    atualizarVisibilidadeAppBody();
  }, 250); // deve ser igual ao tempo da animação CSS

  // Desativa hover momentaneamente
  navButtons.forEach(btn => {
    btn.classList.add('disable-hover');
    btn.blur();
  });

  setTimeout(() => {
    navButtons.forEach(btn => btn.classList.remove('disable-hover'));
  }, 300);
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
        modal.style.display = 'block';

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

  const nome       = document.getElementById('nomeTarefa').value.trim();
  const descricao  = document.getElementById('descricaoTarefa').value.trim();
  const dataLimite = document.getElementById('dataLimite').value;

  if (!nome) {
    alert('Por favor, informe o nome da tarefa.');
    return;
  }

  adicionarTarefa(nome, descricao, dataLimite)
    .then(() => modalCriar.style.display = 'none');
});

    let startX = 0;
    let isAtLeftEdge = false;
    const indicator = document.getElementById('pull-up-indicator');
  
    if (!indicator) return;
  
    // Ajuste o CSS do indicador para ficar na esquerda/vertical centralizado:
    // #pull-up-indicator {
    //   position: fixed;
    //   left: 0;
    //   top: 50%;
    //   transform: translateY(-50%) scale(0.8);
    //   opacity: 0;
    //   transition: transform 0.2s ease, opacity 0.2s ease;
    // }
  
    window.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      const windowWidth = window.innerWidth;
      // região de início: primeiros 20% da largura
      const leftThreshold = windowWidth * 0.2;
  
      if (startX > leftThreshold) {
        isAtLeftEdge = false;
        indicator.style.opacity = '0';
        return;
      }
  
      isAtLeftEdge = true;
      indicator.style.opacity = '1';
    });
  
    window.addEventListener('touchmove', (e) => {
      if (!isAtLeftEdge) return;
  
      const currentX = e.touches[0].clientX;
      const distance = currentX - startX;  // positiva para a direita
  
      if (distance > 0 && distance < 100) {
        // move o indicador para a direita à medida que arrasta
        indicator.style.transform =
          `translateY(-50%) translateX(${distance / 2}px) scale(${1 + distance / 200})`;
        indicator.style.opacity = `${Math.min(1, distance / 50)}`;
      }
    });
  
    window.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      const swipeDistance = endX - startX;
  
      // reset visual
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateY(-50%) scale(0.8)';
  
      // aciona ação se arrastou > 280px da borda esquerda
      if (isAtLeftEdge && swipeDistance > 280) {
        document.body.classList.add('abas-mostradas');
      }
    });
});
  

