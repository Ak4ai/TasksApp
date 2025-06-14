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

export function playEspecialSpriteAnimation(canvasId = 'especial-attack-canvas', callback) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.src = 'effects/especial.png';

  const cols = 4;
  let rows = 1;
  let frameWidth = 1000;
  let frameHeight = 1000;
  let totalFrames = 0;
  let frame = 0;
  let playing = true;
  const frameDelay = 15;

  img.onload = () => {
    frameWidth = img.width / cols;
    frameHeight = frameWidth;
    rows = Math.floor(img.height / frameHeight);
    totalFrames = rows * cols;

    canvas.width = frameWidth;
    canvas.height = frameHeight;
    canvas.style.display = 'block';

    const audio = new Audio('effects/sounds/Darkness1.ogg');
    audio.play();

        function draw() {
      if (!playing) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    
      // --- Esfera negra radial animada ---
      // Só desenha a esfera se não estiver nos 3 últimos frames
      if (frame < totalFrames - 40) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = Math.max(frameWidth, frameHeight) * (0.48 + 0.04 * Math.sin(frame * 0.25));
        const grad = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.2, centerX, centerY, baseRadius);
        grad.addColorStop(0, 'rgb(0, 0, 0)');
        grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.75)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
        ctx.save();
        ctx.globalAlpha = 0.85;
    
        ctx.beginPath();
        const points = 64;
        for (let i = 0; i <= points; i++) {
          const ang = (i / points) * 2 * Math.PI;
          const distortion = Math.sin(ang * 3 + frame * 0.18) * 10 + Math.sin(ang * 7 - frame * 0.12) * 6;
          const r = baseRadius + distortion;
          const x = centerX + Math.cos(ang) * r;
          const y = centerY + Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }
      // --- Fim esfera negra animada ---
    
      const row = Math.floor(frame / cols);
      const col = frame % cols;
    
      // Aumenta o scale em 170% para o especial
      const scale = 1.7;
      const scaledWidth = frameWidth * scale;
      const scaledHeight = frameHeight * scale;
      const offsetX = (canvas.width - scaledWidth) / 2;
      const offsetY = (canvas.height - scaledHeight) / 2;
    
      ctx.drawImage(
        img,
        col * frameWidth, row * frameHeight, frameWidth, frameHeight,
        offsetX, offsetY, scaledWidth, scaledHeight
      );
    
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

window.playEspecialSpriteAnimation = playEspecialSpriteAnimation;