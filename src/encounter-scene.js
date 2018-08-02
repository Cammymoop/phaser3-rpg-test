import Phaser from "./phaser-module.js";
import constants from "./constants.js";

import Character from "./character.js";

export default class EncounterScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EncounterScene' });
    }

    create(data) {
        this.cameras.main.setBackgroundColor('#00000');
        this.cameras.main.zoom = 6;

        let background = this.add.image(0, 0, 'encounter-background').setOrigin(0);
        this.cameras.main.centerOn(background.getCenter().x, background.getCenter().y);

        this.playerMenu = this.add.image(0, 0, 'player-battle-menu').setOrigin(0);
        this.playerMenu.depth = 10;

        this.queuedEvents = [];
        this.await = 0;

        this.player = this.registry.get('player-character');

        this.menuPositions = [
            {x: 140, y: 46, text: "ATTACK"},
            {x: 140, y: 56, text: "MAGIC"},
            {x: 140, y: 66, text: "RUN"},
        ];
        this.menuText = [];
        for (let mi of this.menuPositions) {
            this.menuText.push(this.makeText(mi.x + 6, mi.y, mi.text));
        }
        //this.menuCursor = this.add.sprite(this.menuPositions[0].x, this.menuPositions[0].y, 'symbols', 10).setOrigin(0);
        this.menuCursor = this.makeText(this.menuPositions[0].x, this.menuPositions[0].y, '>', 'red');
        this.menuCursor.menuPosition = 0;
        this.menuCursor.depth = 10;

        this.playerMenuActive = true;

        this.playerHealthDisplay = this.makeText(146, 30, 'HP-');

        this.enemies = [];
        if (data.hasOwnProperty('enemies')) {
            for (let enemy of data.enemies) {
                if (enemy.type === "rat") {
                    for (let i = 0; i < enemy.quantity; i++) {
                        console.log("spawning rat: " + (12 + (i * 6)) + ", " + (118 - (i * 6)));
                        var spr = this.add.sprite(12 + (i * 6), 118 - (i * 6), 'rat', 0);
                        spr.depth = 20 - i;
                        spr.setOrigin(0, 1);
                        spr.health = 10;
                        this.enemies.push(spr);
                    }
                }
            }
        }

        this.playerSprite = this.add.sprite(180, 118, 'player-character', 1);
        this.playerSprite.setOrigin(1, 1);
        this.playerSprite.depth = 20;

        this.input.keyboard.on("keydown_DOWN", function () {
            if (!this.playerMenuActive) {
                return;
            }
            let newPos = this.menuCursor.menuPosition + 1;
            if (newPos > this.menuPositions.length - 1) {
                newPos = 0;
            }
            this.menuCursor.setPosition(this.menuPositions[newPos].x, this.menuPositions[newPos].y);
            this.menuCursor.menuPosition = newPos;
        }, this);

        this.input.keyboard.on("keydown_UP", function () {
            if (!this.playerMenuActive) {
                return;
            }
            let newPos = this.menuCursor.menuPosition - 1;
            if (newPos < 0) {
                newPos = this.menuPositions.length - 1;
            }
            this.menuCursor.setPosition(this.menuPositions[newPos].x, this.menuPositions[newPos].y);
            this.menuCursor.menuPosition = newPos;
        }, this);

        // select menu option
        this.input.keyboard.on("keydown_SPACE", function () {
            if (!this.playerMenuActive) {
                return;
            }
            if (this.menuCursor.menuPosition === 0) { // ATTACK
                //this.enemies[0].health -= 2;
                //this.showDamage(this.enemies[0], 2);
                this.attackEnemy(this.enemies[0], 2);
                this.endPlayerTurn();
            } else if (this.menuCursor.menuPosition === 1) { // MAGIC
                this.endPlayerTurn();
            } else if (this.menuCursor.menuPosition === 2) { // RUN
                this.leaveEncounter();
            }
        }, this);

        this.input.keyboard.on("keydown_ZERO", function () {
            this.leaveEncounter();
        }, this);
        console.log("encounter started");
    }

    update() {
        this.playerHealthDisplay.text = 'HP-' + this.player.getHealth();

        while (this.await < 1 && this.queuedEvents.length > 0) {
            if (typeof this.queuedEvents[0] === "function") {
                this.queuedEvents[0].call();
            } else {
                console.log("queued event was not a function");
            }
            this.queuedEvents.shift();
        }
    }

    addBlockingEvent(delay, callback) {
        if (typeof callback !== "function") {
            console.log("tryed to add a blocking event, but it's not callable");
            return;
        }
        this.await++;
        this.time.addEvent({delay: delay, callback: () => { callback.call(); this.await--; }});
    }

    attackEnemy(target, damage) {
        target.health -= damage;
        this.showDamage(target, damage);
        if (target.health <= 0) {
            target.health = 0;
            this.addBlockingEvent(600, () => this.enemyDeath(target));
        }
    }

    enemyDeath(target) {
        target.setTintFill(constants.colors.DARK_BLUE);
        this.await++;
        let cropper = { // object with setter to enable tweening the crop of a sprite
            cropProgress: 0,
            set progress(val) { this.cropProgress = val; this.updateCrop(); },
            get progress() { return this.cropProgress; },
            updateCrop: function () {
                // crop off the top ending with no height
                let height = Math.round(this.target.height - (this.target.height * this.cropProgress));
                this.target.setCrop(0, this.target.height - height, this.target.width, height);
            },
            target: target,
        };
        this.tweens.add({
            targets: cropper,
            progress: 1, // tween this
            duration: 1200,
            delay: 100,
            onComplete: () => { this.removeEnemy(target); this.await--; },
        });
    }

    removeEnemy(target) {
        this.enemies = this.enemies.filter(function (en) {
            return en !== target;
        });
        target.destroy();
        console.log(this.enemies.length + ' enemies left');
        if (this.enemies.length <= 0) {
            console.log('Encoutner Won');
            this.addBlockingEvent(2500, () => this.leaveEncounter());
        }
    }

    queueEvent(callback) {
        this.queuedEvents.push(callback);
    }

    makeText(x, y, text, tint) {
        let textObject = this.add.bitmapText(x, y, 'basic-font', text).setOrigin(0).setLetterSpacing(1);
        textObject.depth = 200;
        if (tint === "red") {
            textObject.setTintFill(constants.colors.RED);
        } else if (tint === "green") {
            textObject.setTintFill(constants.colors.GREEN);
        }
        return textObject;
    }

    showDamage(target, damage) {
        this.damageAnimation(target);
        let text = this.makeText(target.getCenter().x, target.getBounds().top + 3, '-' + damage, 'red').setOrigin(0.5, 1);
        this.tweens.add({
            targets: text,
            y: text.y - 8, // tween this
            duration: 500,
            onComplete: () => { text.destroy(); },
        });
        //this.time.addEvent({delay: 500, callback: (() => text.destroy()) });
    }

    damageAnimation(target) {
        target.setTintFill(constants.colors.WHITE);
        this.time.addEvent({delay: 70, callback: (() => target.clearTint()) });
    }

    takeEnemyTurn() {
        this.damagePlayer(3);
        this.showDamage(this.playerSprite, 3);

        //this.time.addEvent({delay: 200, callback: this.playerTurn, callbackScope: this });
        this.queueEvent(() => this.playerTurn());
    }

    setPlayerMenuVisible(visibility) {
        for (let mt of this.menuText) {
            mt.visible = visibility;
        }
        this.playerMenu.visible = visibility;
    }

    playerTurn() {
        this.setPlayerMenuVisible(true);
        if (!this.player.isAlive()) {
            return; // show only the menu if you're dead
        }
        this.menuCursor.visible = true;
        this.playerMenuActive = true;

        this.menuCursor.menuPosition = 0;
        this.menuCursor.setPosition(this.menuPositions[0].x, this.menuPositions[0].y);
    }

    endPlayerTurn() {
        this.playerMenuActive = false;
        this.setPlayerMenuVisible(false);
        this.menuCursor.visible = false;

        this.queueEvent(() => this.time.addEvent({delay: 200, callback: this.takeEnemyTurn, callbackScope: this}));
    }

    damagePlayer(damage) {
        this.player.damage(damage);
        if (!this.player.isAlive()) {
            this.playerMenuActive = false;
            this.time.addEvent({delay: 1000, callback: function () {
                this.playerSprite.y -= this.playerSprite.height;
                this.playerSprite.rotation = (3 * Math.PI)/2;

                this.time.addEvent({delay: 1200, callback: this.gameOver, callbackScope: this});
            }, callbackScope: this});
        }
    }

    gameOver() {
        let gameOverSplash = this.add.image(0, 0, 'game-over').setOrigin(0);
        gameOverSplash.depth = 9001;
        this.time.addEvent({delay: 3200, callback: function () {
            this.player.setMaxHealth(this.player.getMaxHealth() + 8);
            this.player.revive();

            this.scene.stop("OverheadMapScene");
            this.scene.stop();
            this.scene.start("OverheadMapScene");
        }, callbackScope: this});
    }

    leaveEncounter() {
        console.log("encounter finished");
        this.scene.stop();
        this.scene.get("OverheadMapScene").resume();
    }
}
