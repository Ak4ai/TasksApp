import { auth } from './auth.js';
import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, Timestamp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
// script.js
import { carregarTarefas } from './tarefas.js';


// Variável para armazenar a fila de mensagens
const filaDeMensagens = [];


document.addEventListener('DOMContentLoaded', () => {
    // const mensagemDeBoasVindas = "Bem-vindo ao sistema!";
    // mostrarMensagem(mensagemDeBoasVindas);

    document.getElementById('botao-criar-tarefa').addEventListener('click', () => {
        console.log("Botão Criar Tarefa clicado!");
        const desc = document.getElementById('descricao').value;
        const dataLimite = document.getElementById('dataLimite').value;
        if (desc && dataLimite) {
            adicionarTarefa(desc, dataLimite).then(() => {
                document.getElementById('modal-criar-tarefa').style.display = 'none';
            });
        }
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

function mostrarPopup(mensagem, duracao = 2000) {
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

function isIOSDevice() {
    const ua = navigator.userAgent.toLowerCase();
    return /iphone|ipod|ipad/.test(ua) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}






async function adicionarTarefa(descricao, dataLimite) {
    const usuario = auth.currentUser;
    if (!usuario) return;
  
    const tarefasRef = collection(db, "usuarios", usuario.uid, "tarefas");
    await addDoc(tarefasRef, {
      descricao,
      dataLimite: Timestamp.fromDate(new Date(dataLimite)),
      finalizada: false
    });
  
    carregarTarefas(); // recarrega a UI
}


// Abrir e fechar modal
document.getElementById('criar-button').addEventListener('click', () => {
    document.getElementById('modal-criar-tarefa').style.display = 'flex';
});
  
document.getElementById('fechar-modal').addEventListener('click', () => {
    document.getElementById('modal-criar-tarefa').style.display = 'none';
});
  
// script.js
import { atualizarDataAtual } from './tarefas.js';

document.addEventListener('DOMContentLoaded', () => {
  atualizarDataAtual();
  // configura tabs
  document.querySelectorAll('.bottom-nav .nav-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const alvo = btn.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.getElementById(alvo).classList.add('active');
      document.querySelectorAll('.nav-button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (alvo === 'tab-tasks') {
        carregarTarefas();
      }
    });
  });
  // inicializa na home
  document.querySelector('.nav-button[data-tab="tab-home"]').click();
});

// ===== Swipe para trocar de aba =====
let touchStartX = 0;
let touchEndX = 0;
const minSwipeDistance = 50; // distância mínima em px para considerar swipe

// Captura início do toque
document.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
}, false);

// Captura fim do toque e trata o swipe
document.addEventListener('touchend', e => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
}, false);

function handleSwipe() {
  const deltaX = touchEndX - touchStartX;
  if (Math.abs(deltaX) < minSwipeDistance) return; // muito curto, ignora

  // Lista de botões de navegação na ordem visual
  const navButtons = Array.from(document.querySelectorAll('.bottom-nav .nav-button'));
  const activeBtn = document.querySelector('.bottom-nav .nav-button.active');
  let idx = navButtons.indexOf(activeBtn);

  if (deltaX < 0) {
    // swipe para a esquerda → avançar aba
    idx = (idx + 1) % navButtons.length;
  } else {
    // swipe para a direita → voltar aba
    // idx = (idx - 1 + navButtons.length) % navButtons.length;
  }

  navButtons[idx].click(); // dispara o clique, mantendo seu carregamento de tarefas
}



























document.addEventListener('DOMContentLoaded', () => {
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
  