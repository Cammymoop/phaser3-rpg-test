import Phaser from "./phaser-module.js";
import OverheadMapScene from "./overhead-map-scene.js";
import EncounterScene from "./encounter-scene.js";

export let LoadedMaps = new Map();

export default class PreloaderScene extends Phaser.Scene {
    constructor() {
        "use strict";
        super({ key: 'PreloaderScene' });
    }

    preload() {
        "use strict";
        this.sys.canvas.style.display = "block";
        this.sys.canvas.style.marginLeft = "auto";
        this.sys.canvas.style.marginRight = "auto";
        this.sys.canvas.style.border = "6px solid #ffa300";

        this.cameras.main.setBackgroundColor('#00000');
        this.cameras.main.zoom = 6;

        this.load.setBaseURL('assets/');

        this.load.image('loader-image', 'img/loader.png');
        this.load.once('filecomplete', this.fullLoad, this);
    }

    fullLoad() {
        "use strict";
        // show the loading splash screen
        var loadingScreen = this.add.image(0, 0, 'loader-image');
        this.cameras.main.centerOn(0, 0);


        this.load.spritesheet('tiles', 'img/tiles.png', {frameWidth: 16, frameHeight: 16});
        this.load.image('tiles_img', 'img/tiles.png');
        this.load.spritesheet('player-character', 'img/player_character.png', {frameWidth: 16, frameHeight: 16});
        this.load.spritesheet('rat', 'img/rat.png', {frameWidth: 32, frameHeight: 32});

        this.load.image('encounter-background', 'img/encounter_bg.png');
        this.load.image('game-over', 'img/game-over.png');
        this.load.image('minus-two', 'img/minus-two.png');
        this.load.image('minus-three', 'img/minus-three.png');
        this.load.image('player-battle-menu', 'img/player-battle-menu.png');
        //this.load.spritesheet('symbols', 'img/symbols.png', {frameWidth: 5, frameHeight: 6});
        this.load.image('symbols', 'img/symbols.png');

        // maps
        var mapId = 1;
        this.preloadLevel(mapId++, 'map1', 'map/map1.json');

        // audio
        this.load.audio('remove', [
            'audio/remove.ogg',
            'audio/remove.mp3'
        ]);
        this.load.audio('lasor', [
            'audio/lasor.ogg',
            'audio/lasor.mp3'
        ]);
        this.load.audio('shot-hit', [
            'audio/shot-hit.ogg',
            'audio/shot-hit.mp3'
        ]);
        this.load.audio('shot-hit-break', [
            'audio/shot-hit-break.ogg',
            'audio/shot-hit-break.mp3'
        ]);
        this.load.audio('shff', [
            'audio/shff.ogg',
            'audio/shff.mp3'
        ]);
        this.load.audio('foo', [
            'audio/foo.ogg',
            'audio/foo.mp3'
        ]);

        // Data
        this.load.json('item-data', 'data/items.json', 'items');
        this.load.json('character-data', 'data/characters.json', 'characters');
    }

    preloadLevel(mapId, key, file) {
        "use strict";
        this.load.tilemapTiledJSON(key, file);
        LoadedMaps.set(mapId, key);
    }

    create() {
        "use strict";
        this.cache.bitmapFont.add('basic-font', Phaser.GameObjects.RetroFont.Parse(this, {
            image: 'symbols',
            chars: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>-+',
            width: 5,
            height: 6,
            charsPerRow: 10,
            spacing: {x: 1, y: 1},
        }));

        this.scene.add('OverheadMapScene', OverheadMapScene);
        this.scene.add('EncounterScene', EncounterScene);

        console.log('starting overhead map scene');
        this.scene.start("OverheadMapScene");
    }
}
