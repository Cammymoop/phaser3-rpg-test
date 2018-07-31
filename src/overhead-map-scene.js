

Phaser3RPG.TILE_SIZE = 16;

Phaser3RPG.BOTTOM_SIDE = 0;
Phaser3RPG.LEFT_SIDE = 1;
Phaser3RPG.TOP_SIDE = 2;
Phaser3RPG.RIGHT_SIDE = 3;

Phaser3RPG.OverheadMapScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
        "use strict";
        Phaser.Scene.call(this, { key: 'OverheadMapScene' });
    },

    create: function (data) {
        "use strict";
        this.maps = Phaser3RPG.loadedMaps;

        this.cameras.main.setBackgroundColor('#00000');
        this.cameras.main.zoom = 6;

        if (!this.data.has('mapId')) {
            this.data.set('mapId', 1);
        }

        if (!this.registry.has('muted')) {
            this.registry.set('muted', false);
        }
        this.sound.mute = this.registry.get('muted');

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
    },

    goToNextLevel: function () {
        if (this.maps.has(this.currentMapId + 1)) {
            this.data.set('mapId', this.currentMapId + 1);
        } else {
            this.data.set('mapId', 1);
        }
        this.scene.restart();
    },

    loadMap: function (mapId) {
        if (!this.maps.has(mapId)) {
            console.log("that map (" + mapId + ") doesn't exist, maybe");
            return;
        }
        console.log('loading map: ' + mapId);
        this.currentMapId = mapId;

        // the tilemap
        this.map = this.make.tilemap({key: this.maps.get(mapId)});
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
                var te = new Phaser3RPG.TileEntity(this, tile.x, tile.y, i, tile.rotation/(Math.PI/2));
                this.tileEntities.push(te);
                this.setCollisionTile(tile.x, tile.y, null);
                tile = this.collisionLayer.findByIndex(i);
            }
        }

        // spawn the player
        var startingTile = {x: 0, y:0};
        if (this.foregroundLayer) {
            startingTile = this.foregroundLayer.findByIndex(3);
            this.setForegroundTile(startingTile.x, startingTile.y, null);
        }
        this.player = new Phaser3RPG.MapCharacter(this, 'player-character', startingTile.x, startingTile.y);
        this.add.existing(this.player);
        this.tileEntities.push(this.player);

        this.cameras.main.startFollow(this.player, true);

        this.levelLoaded = true;
    },

    update: function (time, delta) {
        "use strict";
        if (!this.levelLoaded) {
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
    },

    buttonShot: function (tileX, tileY) {
        if (this.currentMapId === 4) {
            if (tileX === 20 && tileY === 10) {
                for (let i = 4; i <= 8; i++) {
                    this.setCollisionTile(25, i, null);
                }
            } else {
                if (!this.buttonsActivated) {
                    this.buttonsActivated = 0;
                }
                this.buttonsActivated++;
                if (this.buttonsActivated >= 3) {
                    this.setCollisionTile(6, 7, null);
                }
            }
        } else if (this.currentMapId === 5 && tileX === 5 && tileY === 6) {
            this.setCollisionTile(22, 2, null);
            this.setCollisionTile(22, 3, null);
        }
    },

    floorSwitchPress: function (tileX, tileY) {
        this.setCollisionTile(tileX, tileY, 29);
        if (this.currentMapId === 5 && tileX === 12 && tileY === 6) {
            this.setCollisionTile(7, 7, null);
            this.setCollisionTile(13, 1, null);
        }
    },

    getForegroundTileAt: function (tileX, tileY) {
        "use strict";
        if (!this.foregroundLayer || tileX < 0 || tileX >= this.map.width || tileY < 0 || tileY >= this.map.height) {
            return -1;
        }
        return this.foregroundLayer.getTileAt(tileX, tileY, true).index;
    },

    getCollisionTileAt: function (tileX, tileY) {
        "use strict";
        if (tileX < 0 || tileX >= this.map.width || tileY < 0 || tileY >= this.map.height) {
            return -1;
        }
        var t = this.collisionLayer.getTileAt(tileX, tileY, true);
        if (!t) {
            console.log([tileX, tileY]);
        }
        return t.index;
    },

    collisionCheckIncludingEntities: function (tileX, tileY, side, collisionType) {
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
    },

    setCollisionTile: function (tileX, tileY, newTileIndex) {
        "use strict";
        if (newTileIndex === null) {
            this.collisionLayer.removeTileAt(tileX, tileY);
        } else {
            this.collisionLayer.putTileAt(newTileIndex, tileX, tileY);
        }
    },

    setForegroundTile: function (tileX, tileY, newTileIndex) {
        "use strict";
        if (newTileIndex === null) {
            this.foregroundLayer.removeTileAt(tileX, tileY);
        } else {
            this.foregroundLayer.putTileAt(newTileIndex, tileX, tileY);
        }
    },

    getTilePosFromWorldPos: function (worldX, worldY) {
        "use strict";
        return new Phaser.Geom.Point(Math.floor(worldX/Phaser3RPG.TILE_SIZE), Math.floor(worldY/Phaser3RPG.TILE_SIZE));
    },

    // Do you collide with this tile?
    tileIsSolid: function (tileIndex, side, collisionType) {
        "use strict";
        var solidTiles = [5, 7, 9, 10];
        if (side === Phaser3RPG.TOP_SIDE) {
            //solidTiles.push(13);
        } else if (side ===Phaser3RPG.BOTTOM_SIDE) {
            //solidTiles.push(10);
        }
        if (collisionType === "walk") {
            solidTiles.push(2);
        }
        return solidTiles.includes(tileIndex);
    },

    // Can you use this collision set to slide
    collisionHasFriction: function (collision, side) {
        if (!collision) {
            return false;
        }
        if (collision.entities) {
            return true;
        }
        var fullSlippery = [9, 17];
        if (fullSlippery.includes(collision.tile) || (side === Phaser3RPG.TOP_SIDE && collision.tile === 16)) {
            return false;
        }
        return true;
    },

    startEncounter: function () {
        console.log("starting encounter");
        this.scene.pause();
        this.scene.run("EncounterScene", {enemies: [{type: "rat", quantity: 1}]});
        this.scene.bringToTop("EncounterScene");
    },

    // Can you break this tile?
    tileIsDestructable: function (tileIndex) {
        "use strict";
        return [12, 15].includes(tileIndex);
    },
});
