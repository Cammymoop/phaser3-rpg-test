import Phaser from "./phaser-module.js";
import constants from "./constants.js";
import MapCharacter from "./map-character.js";
import TileEntity from "./tile-entity.js";

import { LoadedMaps } from "./preloader-scene.js";


export default class OverheadMapScene extends Phaser.Scene {

    constructor() {
        "use strict";
        super({ key: 'OverheadMapScene' });
    }

    create(data) {
        "use strict";
        this.cameras.main.setBackgroundColor('#00000');
        this.cameras.main.zoom = 6;

        if (!this.data.has('mapId')) {
            this.data.set('mapId', 1);
        }

        if (!this.registry.has('player-health')) {
            this.registry.set('player-health', 9000);
            this.registry.set('player-max-health', 9000);
        }

        if (!this.registry.has('muted')) {
            this.registry.set('muted', false);
        }
        this.sound.mute = this.registry.get('muted');

        this.gamePause = false;

        // load the map
        this.levelLoaded = false;
        this.loadMap(this.data.get('mapId'));

        // controls
        this.cursors = this.input.keyboard.createCursorKeys();
        
        this.input.keyboard.on('keydown_R', function (event) {
            this.scene.restart();
        }, this);
        
        this.input.keyboard.on('keydown_M', function (event) {
            this.registry.set('muted', !this.registry.get('muted'));
            this.sound.mute = this.registry.get('muted');
        }, this);
        
        this.input.keyboard.on('keydown_P', function (event) {
            var curZoom = this.cameras.main.zoom;
            this.cameras.main.zoom = {6: 9, 9: 5, 5: 6}[curZoom];
        }, this);
        
        // advance map for debugging
        this.input.keyboard.on('keydown_ZERO', function (event) {
            this.goToNextLevel();
        }, this);

        this.input.keyboard.on("keydown_SPACE", function () {
            console.log(this.player.tilePosition);
        }, this);
    }

    goToNextLevel() {
        if (LoadedMaps.has(this.currentMapId + 1)) {
            this.data.set('mapId', this.currentMapId + 1);
        } else {
            this.data.set('mapId', 1);
        }
        this.scene.restart();
    }

    loadMap(mapId) {
        if (!LoadedMaps.has(mapId)) {
            console.log("that map (" + mapId + ") doesn't exist, maybe");
            return;
        }
        console.log('loading map: ' + mapId);
        this.currentMapId = mapId;

        // the tilemap
        this.map = this.make.tilemap({key: LoadedMaps.get(mapId)});
        var tiles = this.map.addTilesetImage('tiles', 'tiles_img');
        this.collisionLayer = this.map.createDynamicLayer('Tile Layer 1', tiles, 0, 0);
        this.collisionLayer.depth = 0;
        this.collisionLayer.setOrigin(0);

        this.foregroundLayer = false;
        for (let layer of this.map.layers) {
            if (layer.name !== "Tile Layer 2") {
                continue;
            }
            this.foregroundLayer = this.map.createDynamicLayer('Tile Layer 2', tiles, 0, 0);
            this.foregroundLayer.depth = 10;
            this.foregroundLayer.setOrigin(0);
        }

        // lock the camera inside the map
        this.cameras.main.setBounds(0, 0, this.collisionLayer.width, this.collisionLayer.height);

        // Tile entities
        // spawn entities
        this.tileEntities = [];
        var entityTileIndexes = [];
        for (var i of entityTileIndexes) {
            var tile = this.collisionLayer.findByIndex(i);
            while (tile) {
                var te = new TileEntity(this, tile.x, tile.y, i, tile.rotation/(Math.PI/2));
                this.tileEntities.push(te);
                this.setCollisionTile(tile.x, tile.y, null);
                tile = this.collisionLayer.findByIndex(i);
            }
        }

        this.staticEncounters = new Map();
        let encounters = this.map.getObjectLayer('encounters');
        if (encounters) {
            for (let mapEncounter of encounters.objects) {
                if (mapEncounter.type !== "static-encounter") {
                    continue;
                }
                let tilePosition = this.getTilePosFromWorldPos(mapEncounter.x, mapEncounter.y);
                console.log(mapEncounter);
                this.staticEncounters.set(OverheadMapScene.coordinateKey(tilePosition), {
                    enemyType: mapEncounter.properties['enemy-type'],
                    enemyQuantity: mapEncounter.properties['enemy-quantity'],
                });
            }
        }

        // spawn the player
        var startingTile = {x: 0, y:0};
        if (this.foregroundLayer) {
            startingTile = this.foregroundLayer.findByIndex(3);
            this.setForegroundTile(startingTile.x, startingTile.y, null);
        }
        this.player = new MapCharacter(this, 'player-character', startingTile.x, startingTile.y);
        this.add.existing(this.player);
        this.tileEntities.push(this.player);

        this.cameras.main.startFollow(this.player, true);

        this.levelLoaded = true;
    }

    static coordinateKey(coordObj) {
        return OverheadMapScene.coordinateKeyXY(coordObj.x, coordObj.y);
    }
    static coordinateKeyXY(x, y) {
        return x + "|" + y;
    }

    update(time, delta) {
        "use strict";
        if (!this.levelLoaded || this.gamePause) {
            return;
        }
        
        if (this.player.state === "stationary") {
            if (this.cursors.right.isDown) {
                this.player.startWalk(1, 'x');
            } else if (this.cursors.left.isDown) {
                this.player.startWalk(-1, 'x');
            } else if (this.cursors.down.isDown) {
                this.player.startWalk(1, 'y');
            } else if (this.cursors.up.isDown) {
                this.player.startWalk(-1, 'y');
            }
        }

        this.player.update(time, delta);
    }

    getForegroundTileAt(tileX, tileY) {
        "use strict";
        if (!this.foregroundLayer || tileX < 0 || tileX >= this.map.width || tileY < 0 || tileY >= this.map.height) {
            return -1;
        }
        return this.foregroundLayer.getTileAt(tileX, tileY, true).index;
    }

    getCollisionTileAt(tileX, tileY) {
        "use strict";
        if (tileX < 0 || tileX >= this.map.width || tileY < 0 || tileY >= this.map.height) {
            return -1;
        }
        var t = this.collisionLayer.getTileAt(tileX, tileY, true);
        if (!t) {
            console.log([tileX, tileY]);
        }
        return t.index;
    }

    collisionCheckIncludingEntities(tileX, tileY, side, collisionType) {
        "use strict";
        var collidable = {};
        var someCollision = false;
        collidable.entities = this.tileEntities.filter(function (te) {
            return (te.tilePosition.x === tileX && te.tilePosition.y === tileY && te.isSolid && te.sideIsSolid(side, collisionType));
        });
        if (collidable.entities.length < 1) {
            delete collidable.entities;
        } else {
            someCollision = true;
        }
        collidable.tile = this.getCollisionTileAt(tileX, tileY);
        if (!this.tileIsSolid(collidable.tile, side, collisionType)) {
            delete collidable.tile;
        } else {
            someCollision = true;
        }
        return someCollision ? collidable : false;
    }

    setCollisionTile(tileX, tileY, newTileIndex) {
        "use strict";
        if (newTileIndex === null) {
            this.collisionLayer.removeTileAt(tileX, tileY);
        } else {
            this.collisionLayer.putTileAt(newTileIndex, tileX, tileY);
        }
    }

    setForegroundTile(tileX, tileY, newTileIndex) {
        "use strict";
        if (newTileIndex === null) {
            this.foregroundLayer.removeTileAt(tileX, tileY);
        } else {
            this.foregroundLayer.putTileAt(newTileIndex, tileX, tileY);
        }
    }

    getTilePosFromWorldPos(worldX, worldY) {
        "use strict";
        return new Phaser.Geom.Point(Math.floor(worldX/constants.TILE_SIZE), Math.floor(worldY/constants.TILE_SIZE));
    }

    // Do you collide with this tile?
    tileIsSolid(tileIndex, side, collisionType) {
        "use strict";
        var solidTiles = [5, 7, 9, 10, 13, 14, 15, 17, 31];
        if (side === constants.TOP_SIDE) {
            //solidTiles.push(13);
        } else if (side === constants.BOTTOM_SIDE) {
            //solidTiles.push(10);
        }
        if (collisionType === "walk") {
            solidTiles.push(2);
        }
        return solidTiles.includes(tileIndex);
    }

    fixBrokenKeyState() {
        "use strict";
        for (let key of this.input.keyboard.keys) {
            if (key && key.isDown) {
                key.reset();
            }
        }
    }

    resume() {
        "use strict";
        this.scene.wake();
        this.scene.bringToTop();
        this.fixBrokenKeyState();
        this.gamePause = false;
    }

    pause() {
        "use strict";
        this.gamePause = true;
    }

    startEncounter(encounterData) {
        "use strict";
        this.pause();
        this.cameras.main.flash(120);
        this.time.addEvent({delay: 300, callback: () => { this.launchEncounter(encounterData); }});
    }

    launchEncounter(encounterData) {
        "use strict";
        console.log("starting encounter");
        this.scene.sleep();
        let enemies = [];
        enemies.push({type: encounterData.enemyType, quantity: encounterData.enemyQuantity});
        this.scene.run("EncounterScene", {enemies: enemies});
        this.scene.bringToTop("EncounterScene");
    }
}
