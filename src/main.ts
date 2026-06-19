import './styles.css';
import { Game } from './world/game';

const canvas = document.querySelector<HTMLCanvasElement>('#world');
if (!canvas) {
  throw new Error('Missing #world canvas');
}

const game = new Game(canvas);
game.start();
