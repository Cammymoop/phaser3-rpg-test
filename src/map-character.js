import Phaser from "./phaser-module.js";
import constants from "./constants.js";
import OverheadMapScene from "./overhead-map-scene.js";

export default class MapCharacter extends Phaser.GameObjects.Sprite {
    constructor(scene, spritesheet, x, y) {
        "use strict";
        super(scene, 0, 0, spritesheet, 0);
        this.create(x, y);
    }

    create(tileX, tileY) {
        "use strict";
        this.depth = 20;

        this.isSolid = true;

        this.tilePosition = new Phaser.Geom.Point(tileX, tileY);
        this.setPosition((this.tilePosition.x * constants.TILE_SIZE) + constants.TILE_SIZE/2, (this.tilePosition.y * constants.TILE_SIZE) + constants.TILE_SIZE/2);

        // state stuff
        this.state = "stationary";
        this.stateData = {};

        // Constants
        this.WALK_SPEED = 0.12;

        // SFX
        this.buzzSfx = this.scene.sound.add('remove');
        this.laserSfx = this.scene.sound.add('lasor');

        this.downKey = this.scene.input.keyboard.addKey('DOWN');

        // stub
        this.scene.input.keyboard.on('keydown_Z', function (e) { if (e.repeat) { return; } }, this);

        //this.scene.events.on('update', this.update, this);
    }

    sideIsSolid(side) {
        return true;
    }

    setState(stateName, data) {
        "use strict";
        this.state = stateName;
        if (!data) {
            data = {};
        }
        switch (stateName) {
            case "walking":
                this.stateData = {
                    progress: 0,
                    walkDir: data.direction,
                    walkAxis: data.axis,
                    targetPos: this[data.axis] + (constants.TILE_SIZE * data.direction),
                };
                break;
            default:
                this.stateData = {};
        }
        this.onStateChange();
    }
    onStateChange() {
        "use strict";
        if (this.state === "stationary") {
            var tileHere = this.getTileNextTo(0, 0);
            if (tileHere === 14) {
                this.scene.goToNextLevel();
            }
            let key = OverheadMapScene.coordinateKey(this.tilePosition);
            if (this.scene.staticEncounters.has(key)) {
                this.scene.startEncounter(this.scene.staticEncounters.get(key));
                console.log(this.scene.staticEncounters.get(key));
            }
        } else if (this.state === "walking") {
            this.faceDirection(this.stateData.walkDir, this.stateData.walkAxis);
        }
    }
    update(time, delta) {
        "use strict";
        if (!this.scene) {
            return; // why is it calling update after it removes the scene while it's restarting?
        }
        var sd = this.stateData;
        if (this.state === "stationary") {
        } else if (this.state === "suspended") {
            // do nothing
        } else if (this.state === "walking") {
            this[sd.walkAxis] += sd.walkDir * this.WALK_SPEED * delta;
            if (this[sd.walkAxis] * sd.walkDir >= sd.targetPos * sd.walkDir) {
                this[sd.walkAxis] = sd.targetPos;
                this.setState("stationary");
            } else {
                sd.progress = (this.x - sd.originalX)/(sd.targetX - sd.originalX);
            }
            this.updateTilePosition();
        }

        var tileHere = this.getTileNextTo(0, 0);
        var fgTileHere = this.getFGTileNextTo(0, 0);
        if (tileHere === 7 || fgTileHere === 7) { // red lines tile
            // nothing
        }
    }

    // direction = positive or negative
    // axis = walking horizontally (x) or vertically (y)
    startWalk(direction, axis) {
        "use strict";
        if (this.state !== "stationary") {
            return false;
        }

        if (this.canMove(direction, axis)) {
            this.setState("walking", {direction: direction, axis: axis});
        } else {
            this.faceDirection(direction, axis);
        }
    }

    // direction = positive or negative
    // axis = walking horizontally (x) or vertically (y)
    canMove(direction, axis) {
        "use strict";
        if (this.state !== "stationary") {
            return false;
        }

        axis = axis.toLowerCase();
        var checkX = axis === 'x' ? direction : 0;
        var checkY = axis === 'y' ? direction : 0;

        return !this.getCollisionNextTo(checkX, checkY, null, "walk");
    }
    
    faceDirection(direction, axis) {
        if (direction === 1) {
            if (axis === 'x') {
                this.setFrame(0);
            } else {
                this.setFrame(2);
            }
        } else {
            if (axis === 'x') {
                this.setFrame(1);
            } else {
                this.setFrame(3);
            }
        }
    }

    updateTilePosition() {
        "use strict";
        this.tilePosition = this.scene.getTilePosFromWorldPos(this.x, this.y);
    }
    getCollisionNextTo(xDelta, yDelta, side, type) {
        "use strict";
        return this.scene.collisionCheckIncludingEntities(this.tilePosition.x + xDelta, this.tilePosition.y + yDelta, side, type);
    }
    getFGTileNextTo(xDelta, yDelta) {
        "use strict";
        return this.scene.getForegroundTileAt(this.tilePosition.x + xDelta, this.tilePosition.y + yDelta);
    }
    getTileNextTo(xDelta, yDelta) {
        "use strict";
        if (this.tilePosition.x !== 0 && !this.tilePosition.x) {
            console.log(this.tilePosition);
        }
        return this.scene.getCollisionTileAt(this.tilePosition.x + xDelta, this.tilePosition.y + yDelta);
    }

    die() {
        this.scene.events.off('update', this.update);
        this.destroy();
    }
}
