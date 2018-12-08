import App from './app.js';
import Game from './game.js';

const urlParams = new URLSearchParams(window.location.search);
const debug = urlParams.has('debug');

const app = new App('Terrarium', new Game(), { debug: debug });
app.setEventListeners();
app.run();
