import { auth } from './auth.js';
import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, Timestamp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
// script.js
import { carregarTarefas } from './tarefas.js';


// Variável para armazenar a fila de mensagens
const filaDeMensagens = [];


document.addEventListener('DOMContentLoaded', () => {
    const mensagemDeBoasVindas = "Bem-vindo ao sistema!";
    mostrarMensagem(mensagemDeBoasVindas);

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
  
  
