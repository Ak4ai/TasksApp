// Variável para armazenar a fila de mensagens
const filaDeMensagens = [];

document.addEventListener('DOMContentLoaded', () => {
    const mensagemDeBoasVindas = "Bem-vindo ao sistema!";
    mostrarMensagem(mensagemDeBoasVindas);
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

document.addEventListener("DOMContentLoaded", () => {
    const essentialInfo = document.getElementById("essential-info");

    // Verifica a largura da janela
    function checkWindowSize() {
        if (window.innerWidth >= 1024) {
            essentialInfo.classList.remove("hidden");
        } else {
            essentialInfo.classList.add("hidden");
        }
    }

    // Executa a função no carregamento e no redimensionamento da janela
    checkWindowSize();
    window.addEventListener("resize", checkWindowSize);

    // Define a posição inicial no meio da tela
    function setInitialPosition() {
        essentialInfo.style.position = 'fixed';
        essentialInfo.style.top = '50%';
        essentialInfo.style.transform = 'translateY(-50%)';
        essentialInfo.style.transition = 'none'; // Sem transição inicial
    }

    setInitialPosition();

    let lastScrollTop = 0; // Armazena a posição do último scroll
    let isScrolling; // Variável para verificar se o scroll ainda está em andamento

    // Mantém o elemento centralizado com o scroll
    window.addEventListener('scroll', function () {
        const scrollPosition = window.scrollY;
        const scrollDirection = scrollPosition > lastScrollTop ? 'down' : 'up'; // Verifica se o scroll é para baixo ou para cima

        // Atualiza a posição do último scroll
        lastScrollTop = scrollPosition;

        // Ajusta o comportamento dependendo da direção do scroll
        if (scrollDirection === 'down') {
            essentialInfo.style.transition = 'top 0.1s linear'; // Transição rápida
            const newTop = 50 - scrollPosition * 0.03; // Elasticidade ajustada
            essentialInfo.style.top = Math.max(newTop, 35) + '%'; // Limita o movimento para não sair do centro
        } else if (scrollDirection === 'up') {
            essentialInfo.style.transition = 'top 0.1s linear'; // Transição rápida
            const newTop = 50 + scrollPosition * 0.03; // Elasticidade mais controlada
            essentialInfo.style.top = Math.min(newTop, 65) + '%'; // Limita o movimento até um pouco abaixo do centro
        }

        // Caso o scroll pare, centraliza novamente
        if (isScrolling) {
            clearTimeout(isScrolling);
        }

        isScrolling = setTimeout(function () {
            essentialInfo.style.transition = 'top 0.3s ease-in-out'; // Retorno suave ao centro
            essentialInfo.style.top = '50%';
            essentialInfo.style.transform = 'translateY(-50%)';
        }, 100); // Reduz o tempo de inatividade para maior responsividade
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const essentialInfo2 = document.getElementById("essential-info2");

    // Verifica a largura da janela
    function checkWindowSize() {
        if (window.innerWidth >= 1024) {
            essentialInfo2.classList.remove("hidden");
        } else {
            essentialInfo2.classList.add("hidden");
        }
    }

    // Executa a função no carregamento e no redimensionamento da janela
    checkWindowSize();
    window.addEventListener("resize", checkWindowSize);

    // Define a posição inicial no meio da tela
    function setInitialPosition() {
        essentialInfo2.style.position = 'fixed';
        essentialInfo2.style.top = '50%';
        essentialInfo2.style.transform = 'translateY(-50%)';
        essentialInfo2.style.transition = 'none'; // Sem transição inicial
    }

    setInitialPosition();

    let lastScrollTop = 0; // Armazena a posição do último scroll
    let isScrolling; // Variável para verificar se o scroll ainda está em andamento

    // Mantém o elemento centralizado com o scroll
    window.addEventListener('scroll', function () {
        const scrollPosition = window.scrollY;
        const scrollDirection = scrollPosition > lastScrollTop ? 'down' : 'up'; // Verifica se o scroll é para baixo ou para cima

        // Atualiza a posição do último scroll
        lastScrollTop = scrollPosition;

        // Ajusta o comportamento dependendo da direção do scroll
        if (scrollDirection === 'down') {
            essentialInfo2.style.transition = 'top 0.1s linear'; // Transição rápida
            const newTop = 50 - scrollPosition * 0.03; // Elasticidade ajustada
            essentialInfo2.style.top = Math.max(newTop, 35) + '%'; // Limita o movimento para não sair do centro
        } else if (scrollDirection === 'up') {
            essentialInfo2.style.transition = 'top 0.1s linear'; // Transição rápida
            const newTop = 50 + scrollPosition * 0.03; // Elasticidade mais controlada
            essentialInfo2.style.top = Math.min(newTop, 65) + '%'; // Limita o movimento até um pouco abaixo do centro
        }

        // Caso o scroll pare, centraliza novamente
        if (isScrolling) {
            clearTimeout(isScrolling);
        }

        isScrolling = setTimeout(function () {
            essentialInfo2.style.transition = 'top 0.3s ease-in-out'; // Retorno suave ao centro
            essentialInfo2.style.top = '50%';
            essentialInfo2.style.transform = 'translateY(-50%)';
        }, 100); // Reduz o tempo de inatividade para maior responsividade
    });
});


document.addEventListener('DOMContentLoaded', () => {
  let startY = 0;
  let isAtBottom = false;
  const indicator = document.getElementById('pull-up-indicator');

  if (!indicator) return; // Evita erro se ainda assim não encontrar

  window.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const bodyHeight = document.body.offsetHeight;
    isAtBottom = (windowHeight + scrollY + 80) >= bodyHeight;

    if (isAtBottom) {
      indicator.style.opacity = '1';
    }
  });

  window.addEventListener('touchmove', (e) => {
    if (!isAtBottom) return;
    const currentY = e.touches[0].clientY;
    const distance = startY - currentY;
    if (distance > 0 && distance < 100) {
      indicator.style.transform = `translateX(-50%) translateY(${-distance / 2}px) scale(${1 + distance / 200})`;
      indicator.style.opacity = `${Math.min(1, distance / 50)}`;
    }
  });

  window.addEventListener('touchend', (e) => {
    const endY = e.changedTouches[0].clientY;
    const swipeDistance = startY - endY;

    indicator.style.opacity = '0';
    indicator.style.transform = 'translateX(-50%) scale(0.8)';

    if (isAtBottom && swipeDistance > 280) {
      document.body.classList.add('abas-mostradas');
    }
  });
});



// Fechar abas ao clicar fora
document.addEventListener('click', function (event) {
  const aba1 = document.getElementById('essential-info');
  const aba2 = document.getElementById('essential-info2');

  const clicouFora =
    !aba1.contains(event.target) &&
    !aba2.contains(event.target) &&
    document.body.classList.contains('abas-mostradas');

  if (clicouFora) {
    document.body.classList.remove('abas-mostradas');
  }
});

const indicador = document.getElementById('pull-up-indicator');

// Define a imagem do personagem ou usa a imagem padrão
const imagemPersonagem = window.imgpersonagem || 'https://i.pinimg.com/736x/cb/b1/ef/cbb1ef1ee0bf43d633393d7203a4d497.jpg';
indicador.style.backgroundImage = `url('${imagemPersonagem}')`;

function atualizarIconeIndicador() {
    const indicador = document.getElementById('pull-up-indicator');
    const imagemPersonagem = window.imgpersonagem || 'https://i.pinimg.com/736x/cb/b1/ef/cbb1ef1ee0bf43d633393d7203a4d497.jpg';
    indicador.style.backgroundImage = `url('${imagemPersonagem}')`;
}
  
