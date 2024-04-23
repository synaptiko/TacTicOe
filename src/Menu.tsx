import { useEffect, useRef } from 'react';
import classes from './Menu.module.css';
import logo1xUrl from './images/logo@1x.png?url';
import logo2xUrl from './images/logo@2x.png?url';
import { useRootMachine } from './state/useRootMachine';
import { useMenuMachine } from './state/useMenuMachine';
import gsap from 'gsap';

const gridSize = 12;

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, xOffset: number, yOffset: number) {
  ctx.beginPath();

  for (let x = xOffset; x <= width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }

  for (let y = yOffset; y <= height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }

  ctx.stroke();
}

function render(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);

  const xOffset = (width % gridSize) / 2;
  const yOffset = (height % gridSize) / 2;

  ctx.lineWidth = 0.5;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.062)';
  drawGrid(ctx, width, height, xOffset, yOffset);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1.0;
  drawGrid(ctx, width, height, xOffset + 1, yOffset + 1);
}

export const Menu = () => {
  const menuRef = useRef<HTMLDivElement>(null!);
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const [, sendToRoot] = useRootMachine();
  const [menuState, sendToMenu] = useMenuMachine();

  useEffect(() => {
    const canvas = canvasRef.current;

    function resizeCanvas() {
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width;
      canvas.height = height;

      render(canvas.getContext('2d')!, width, height);
    }

    resizeCanvas();

    window.addEventListener('resize', resizeCanvas, false);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    const inAnimationTween = gsap.fromTo(
      menuRef.current,
      {
        opacity: 0,
      },
      {
        opacity: 1,
        duration: 0.25,
        paused: true,
        onStart: () => menuRef.current.classList.add(classes.shown),
        onComplete: () => sendToMenu({ type: 'inAnimationEnd' }),
      }
    );
    const outAnimationTween = gsap.fromTo(
      menuRef.current,
      {
        opacity: 1,
      },
      {
        opacity: 0,
        duration: 0.25,
        paused: true,
        onComplete: () => {
          menuRef.current.classList.remove(classes.shown);
          sendToMenu({ type: 'outAnimationEnd' });
        },
      }
    );
    const inAnimation = () => {
      inAnimationTween.restart();
    };
    const outAnimation = () => {
      outAnimationTween.restart();
    };

    sendToMenu({ type: 'registerAnimation', key: 'in', animation: inAnimation });
    sendToMenu({ type: 'registerAnimation', key: 'out', animation: outAnimation });

    return () => {
      inAnimationTween.kill();
      outAnimationTween.kill();
      sendToMenu({ type: 'unregisterAnimation', key: 'in', animation: inAnimation });
      sendToMenu({ type: 'unregisterAnimation', key: 'out', animation: outAnimation });
    };
  }, [sendToMenu]);

  function handleResumeClick() {
    sendToRoot({ type: 'resume' });
  }

  function handleNewGameClick() {
    sendToRoot({ type: 'newGame' });
  }

  function handleCreditsClick() {
    // TODO: implement
  }

  function handleQuitClick() {
    // TODO: implement
  }

  return (
    <div className={classes.menu} ref={menuRef}>
      <canvas className={classes.canvas} ref={canvasRef} />
      <div className={classes.vignette}></div>
      <div className={classes.logo}>
        <img alt="TacTicOe" src={logo1xUrl} srcSet={`${logo1xUrl} 1x, ${logo2xUrl} 2x`} />
      </div>
      <ul className={classes.items}>
        {menuState.context.isPaused && <li onClick={handleResumeClick}>Resume</li>}
        <li onClick={handleNewGameClick}>New Game</li>
        <li onClick={handleCreditsClick}>Credits</li>
        <li onClick={handleQuitClick}>Quit</li>
      </ul>
    </div>
  );
};
