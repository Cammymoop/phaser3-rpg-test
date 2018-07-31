
Phaser3RPG.PreloaderScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
        "use strict";
        Phaser.Scene.call(this, { key: 'PreloaderScene' });
    },

    preload: function () {
        "use strict";
        this.sys.canvas.style.display = "block";
        this.sys.canvas.style.marginLeft = "auto";
        this.sys.canvas.style.marginRight = "auto";
        this.sys.canvas.style.border = "6px solid #ffa300";

        this.cameras.main.setBackgroundColor('#00000');
        this.cameras.main.zoom = 6;

        this.load.image('loader-image', 'src/img/loader.png');
        this.load.once('filecomplete', this.fullLoad, this);
    },

    fullLoad: function () {
        "use strict";
        // show the loading splash screen
        var loadingScreen = this.add.image(0, 0, 'loader-image');
        this.cameras.main.centerOn(0, 0);


        this.load.spritesheet('tiles', 'src/img/tiles.png', {frameWidth: 16, frameHeight: 16});
        this.load.image('tiles_img', 'src/img/tiles.png');
        this.load.spritesheet('player-character', 'src/img/player_character.png', {frameWidth: 16, frameHeight: 16});
        this.load.spritesheet('rat', 'src/img/rat.png', {frameWidth: 32, frameHeight: 32});

        this.load.image('encounter-background', 'src/img/encounter_bg.png');
        this.load.image('game-over', 'src/img/game-over.png');
        this.load.image('minus-two', 'src/img/minus-two.png');
        this.load.image('minus-three', 'src/img/minus-three.png');
        this.load.image('player-battle-menu', 'src/img/player-battle-menu.png');
        this.load.spritesheet('symbols', 'src/img/symbols.png', {frameWidth: 5, frameHeight: 6});

        // maps
        var mapId = 1;
        this.preloadLevel(mapId++, 'map1', 'map/map1.json');

        // audio
        this.load.audio('remove', [
            'src/audio/remove.ogg',
            'src/audio/remove.mp3'
        ]);
        this.load.audio('lasor', [
            'src/audio/lasor.ogg',
            'src/audio/lasor.mp3'
        ]);
        this.load.audio('shot-hit', [
            'src/audio/shot-hit.ogg',
            'src/audio/shot-hit.mp3'
        ]);
        this.load.audio('shot-hit-break', [
            'src/audio/shot-hit-break.ogg',
            'src/audio/shot-hit-break.mp3'
        ]);
        this.load.audio('shff', [
            'src/audio/shff.ogg',
            'src/audio/shff.mp3'
        ]);
        this.load.audio('foo', [
            'src/audio/foo.ogg',
            'src/audio/foo.mp3'
        ]);
    },

    preloadLevel: function (mapId, key, file) {
        if (!Phaser3RPG.loadedMaps) {
            Phaser3RPG.loadedMaps = new Map();
        }
        this.load.tilemapTiledJSON(key, file);
        Phaser3RPG.loadedMaps.set(mapId, key);
    },

    create: function () {
        this.scene.add('OverheadMapScene', Phaser3RPG.OverheadMapScene);
        this.scene.add('EncounterScene', Phaser3RPG.EncounterScene);

        this.registry.set('player-health', 20);

        console.log('starting overhead map scene');
        this.scene.start("OverheadMapScene");
    },
});
