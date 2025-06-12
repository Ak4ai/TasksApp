function playEnemyAttackAnimation(canvasId, itensAtivos = [], callback) {
  console.log('[Animation] Iniciando animação de ataque:', canvasId);

  // Verifica se há espada ou machado equipado
  const temSlash = itensAtivos.some(item =>
    /espada|machado/i.test(item)
  );

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn('[Animation] Canvas não encontrado:', canvasId);
    return;
  }
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.src = temSlash ? 'effects/Slash.png' : 'effects/hit.png';

  const cols = 4; // Apenas 4 colunas fixas
  let rows = 1;   // Inicialmente 1, será ajustado após carregar a imagem
  let frameWidth = 1000;   // Valor inicial, será sobrescrito
  let frameHeight = 1000;  // Valor inicial, será sobrescrito
  let totalFrames = 0;
  let frame = 0;
  let playing = true;
  const frameDelay = 10; // milissegundos por frame

  img.onload = () => {
    frameWidth = img.width / cols;
    frameHeight = frameWidth;
    rows = Math.floor(img.height / frameHeight);
    totalFrames = rows * cols;

    // Ajuste o tamanho do canvas para o frame
    canvas.width = frameWidth;
    canvas.height = frameHeight;

    // Toca o som correspondente ao ataque
    const audio = new Audio(temSlash ? 'effects/sounds/Sword5.ogg' : 'effects/sounds/Attack3.ogg');
    audio.play();

    console.log('[Animation] Spritesheet carregado:', img.width, 'x', img.height, 'Frames:', totalFrames);
    canvas.style.display = 'block';
    function draw() {
      if (!playing) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const row = Math.floor(frame / cols);
      const col = frame % cols;

      // Aumenta o scale em 150% para Slash.png
      if (temSlash) {
        const scale = 2.2;
        const scaledWidth = frameWidth * scale;
        const scaledHeight = frameHeight * scale;
        const offsetX = (canvas.width - scaledWidth) / 2;
        const offsetY = (canvas.height - scaledHeight) / 2;
        ctx.drawImage(
          img,
          col * frameWidth, row * frameHeight, frameWidth, frameHeight,
          offsetX, offsetY, scaledWidth, scaledHeight
        );
      } else {
        ctx.drawImage(
          img,
          col * frameWidth, row * frameHeight, frameWidth, frameHeight,
          0, 0, frameWidth, frameHeight
        );
      }

      frame++;
      if (frame < totalFrames) {
        setTimeout(draw, frameDelay);
      } else {
        canvas.style.display = 'none';
        playing = false;
        if (callback) callback();
      }
    }
    draw();
  };

  img.onerror = () => {
    console.error('[Animation] Falha ao carregar spritesheet:', img.src);
  };
}

window.playEnemyAttackAnimation = playEnemyAttackAnimation;