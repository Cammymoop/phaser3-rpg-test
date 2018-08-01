let Phaser = window.Phaser;
import PreloaderScene from "./preloader-scene.js";

window.onload = function() {
    var config = {
        type: Phaser.AUTO,
        width: 208*6,
        height: 124*6,
        pixelArt: true,
        zoom: 1,
        parent: 'gameContainer',
        scene: PreloaderScene,
    };
    window.gameInstance = new Phaser.Game(config);
};
