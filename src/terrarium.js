import App from './app.js';
import Game from './game.js';

const app = new App('Terrarium', new Game());
app.setEventListeners();
app.run();
