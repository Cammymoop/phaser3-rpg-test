import Phaser from "./phaser-module.js";
import constants from "./constants.js";

export default class TileEntity extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, tileIndex, orientation) {
        "use strict";
        super(scene, 0, 0, 'tiles', tileIndex - 1);
        this.entityInit(x, y, tileIndex, orientation);
    }

    entityInit(tileX, tileY, tileIndex, orientation) {
        "use strict";
        this.depth = -10;

        this.tilePosition = new Phaser.Geom.Point(tileX, tileY);
        this.setPosition((this.tilePosition.x * constants.TILE_SIZE) + constants.TILE_SIZE/2, (this.tilePosition.y * constants.TILE_SIZE) + constants.TILE_SIZE/2);

        this.isSolid = true;
        this.collisionBox = new Phaser.Geom.Rectangle(this.x + this.width/2, this.y + this.height/2, this.width, this.height);

        this.falls = true;

        this.name = "scaffold";

        this.collisionOffset = new Phaser.Geom.Point(0, 0);
        if (tileIndex === 19 || tileIndex === 20) { // shootable buttons
            var width = (orientation === 0 || orientation === 2) ? 16 : 5;
            var height = (orientation === 0 || orientation === 2) ? 16 : 5;
            this.collisionBox.setSize(width, height);

            var offset = (orientation === 0 || orientation === 3) ? -10 : 10;
            this.collisionOffset.x = (orientation === 0 || orientation === 2) ? 0 : offset;
            this.collisionOffset.y = (orientation === 1 || orientation === 3) ? 0 : offset;

            this.pushed = tileIndex === 19 ? false : true;
            this.onProjectileHit = function () {
                if (!this.pushed) {
                    this.scene.buttonShot(this.tilePosition.x, this.tilePosition.y);
                    this.setFrame(19);
                    this.pushed = true;
                }
            };

            this.name = "shoot-button";
            this.falls = false;
        } else if (tileIndex === 18) { // launcher
            this.LAUNCH_VELOCITY = 2.8;
            this.launch = function (entity) {
                this.setFrame(30);
                entity.setState("suspended");
                entity.y += 2;
                this.delayedLaunch = this.scene.time.addEvent({ delay: 500, callback: function () {
                    this.setFrame(17);
                    entity.y -= 2;
                    entity.setState("falling", {initialVelocity: -this.LAUNCH_VELOCITY});
                }, callbackScope: this});
            };

            this.name = "launcher";
            this.falls = false;
        } else { // scaffold
            this.sideIsSolid = function (side, collisionType) {
                if (collisionType !== 'projectile') {
                    return true;
                }
                if (this.orientation === 0 || this.orientation === 2){
                    return side === constants.TOP_SIDE || side === constants.BOTTOM_SIDE;
                } else {
                    return side === constants.LEFT_SIDE || side === constants.RIGHT_SIDE;
                }
            };
        }

        this.orientation = orientation;
        this.rotation = Math.PI/2 * orientation;

        // state stuff
        this.state = "stationary";
        this.stateData = {};

        // Constants
        this.FALL_SPEED = 0.09;

        this.scene.events.on('update', this.update, this);
        this.scene.add.existing(this);
    }

    sideIsSolid(side) {
        return true;
    }

    onProjectileHit(side) { // stub
        return;
    }

    intersects(x, y) {
        return Phaser.Geom.Rectangle.CenterOn(this.collisionBox, this.x + this.collisionOffset.x, this.y + this.collisionOffset.y).contains(x, y);
    }

    setState(stateName, data) {
        "use strict";
        this.state = stateName;
        switch (stateName) {
            case "falling":
                this.stateData = {
                    nextCheckY: this.y + constants.TILE_SIZE,
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
            // nothing here
        }
    }
    update(time, delta) {
        "use strict";
        if (!this.scene) {
            return; // why is it calling update after it removes the scene while it's restarting?
        }
        var sd = this.stateData;
        if (this.state === "stationary") {
            if (this.falls) {
                var tileBelow = this.getCollisionNextTo(0, 1);
                if (!tileBelow) {
                    this.setState("falling");
                    return;
                }
            }
        } else if (this.state === "falling") {
            this.y += this.FALL_SPEED * delta;
            this.updateTilePosition();
            if (this.y >= sd.nextCheckY) {
                var tileUnder = this.getCollisionNextTo(0, 1, constants.TOP_SIDE);
                if (tileUnder) {
                    this.y = sd.nextCheckY;
                    this.setState("stationary");
                } else {
                    // Continue falling
                    sd.nextCheckY += constants.TILE_SIZE;
                }
            }
        }
    }

    canMove(direction, axis) {
        "use strict";
        if (this.state !== "stationary") {
            return false;
        }

        axis = axis.toLowerCase();
        var checkX = axis === 'x' ? direction : 0;
        var checkY = axis === 'y' ? direction : 0;
        return !this.getCollisionNextTo(checkX, checkY);
    }

    updateTilePosition() {
        "use strict";
        this.tilePosition = this.scene.getTilePosFromWorldPos(this.x, this.y);
    }
    getCollisionNextTo(xDelta, yDelta, side) {
        "use strict";
        return this.scene.collisionCheckIncludingEntities(this.tilePosition.x + xDelta, this.tilePosition.y + yDelta, side);
    }
    getTileNextTo(xDelta, yDelta) {
        "use strict";
        return this.scene.getCollisionTileAt(this.tilePosition.x + xDelta, this.tilePosition.y + yDelta);
    }

    die() {
        this.scene.events.off('update', this.update);
        this.destroy();
    }
}
