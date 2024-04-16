import { useEffect, useRef } from 'react';
import cx from 'classnames';
import classes from './Menu.module.css';
import logo1xUrl from './images/logo@1x.png?url';
import logo2xUrl from './images/logo@2x.png?url';

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

interface MenuProps {
  open: boolean;
  gameStarted: boolean;
  onNewGame: () => void;
  onResume: () => void;
}

export const Menu = ({ open, gameStarted, onNewGame, onResume }: MenuProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null!);

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

  function handleCreditsClick() {
    // TODO: implement
  }

  function handleQuitClick() {
    // TODO: implement
  }

  // TODO: unmount menu after transition end
  return (
    <div className={cx(classes.menu, open && classes.menuOpen)}>
      <canvas className={classes.canvas} ref={canvasRef} />
      <div className={classes.vignette}></div>
      <div className={classes.logo}>
        <img alt="TacTicOe" src={logo1xUrl} srcSet={`${logo1xUrl} 1x, ${logo2xUrl} 2x`} />
      </div>
      <ul className={classes.items}>
        {/* TODO: improve Resume appearing right after New Game when implementing xstate */}
        {gameStarted && <li onClick={onResume}>Resume</li>}
        <li onClick={onNewGame}>New Game</li>
        <li onClick={handleCreditsClick}>Credits</li>
        <li onClick={handleQuitClick}>Quit</li>
      </ul>
    </div>
  );
};
