import Phaser from "./phaser-module.js";

export default class EncounterScene extends Phaser.Scene {
    constructor() {
        "use strict";
        super({ key: 'EncounterScene' });
    }

    create(data) {
        "use strict";
        this.cameras.main.setBackgroundColor('#00000');
        this.cameras.main.zoom = 6;

        let background = this.add.image(0, 0, 'encounter-background').setOrigin(0);
        this.cameras.main.centerOn(background.getCenter().x, background.getCenter().y);

        this.playerMenu = this.add.image(0, 0, 'player-battle-menu').setOrigin(0);
        this.playerMenu.depth = 10;

        this.menuPositions = [
            {x: 140, y: 46},
            {x: 140, y: 56},
            {x: 140, y: 66},
        ];
        //this.menuCursor = this.add.sprite(this.menuPositions[0].x, this.menuPositions[0].y, 'symbols', 10).setOrigin(0);
        this.menuCursor = this.makeText(this.menuPositions[0].x, this.menuPositions[0].y, '>', 'red');
        this.menuCursor.menuPosition = 0;
        this.menuCursor.depth = 10;

        this.playerMenuActive = true;

        this.playerHealthDisplay = this.makeText(164, 30, '');

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

        this.player = this.add.sprite(180, 118, 'player-character', 1);
        this.player.setOrigin(1, 1);
        this.player.depth = 20;

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
                this.enemies[0].health -= 2;
                this.showDamage(this.enemies[0], 2);
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

    makeText(x, y, text, tint) {
        "use strict";
        let textObject = this.add.bitmapText(x, y, 'basic-font', text).setOrigin(0).setLetterSpacing(1);
        if (tint === "red") {
            textObject.setTintFill(0xff004d);
        }
        return textObject;
    }

    showDamage(target, damage) {
        "use strict";
        this.damageAnimation(target);
        let text = this.makeText(target.getCenter().x, target.getBounds().top - 4, '-' + damage, 'red').setOrigin(0.5, 1);
        this.time.addEvent({delay: 500, callback: (() => text.destroy()) });
    }

    damageAnimation(target) {
        "use strict";
        target.setTintFill(0xfff1e8);
        this.time.addEvent({delay: 70, callback: (() => target.clearTint()) });
    }

    update() {
        "use strict";
        let playerHealthString = this.registry.get('player-health') + '';
        this.playerHealthDisplay.text = this.registry.get('player-health');
    }

    takeEnemyTurn() {
        "use strict";
        this.damagePlayer(3);
        this.showDamage(this.player, 3);

        this.time.addEvent({delay: 200, callback: this.playerTurn, callbackScope: this });
    }

    playerTurn() {
        "use strict";
        this.playerMenu.visible = true;
        if (this.registry.get('player-health') <= 0) {
            return; // show only the menu if you're dead
        }
        this.menuCursor.visible = true;
        this.playerMenuActive = true;

        this.menuCursor.menuPosition = 0;
        this.menuCursor.setPosition(this.menuPositions[0].x, this.menuPositions[0].y);
    }

    endPlayerTurn() {
        this.playerMenuActive = false;
        this.playerMenu.visible = false;
        this.menuCursor.visible = false;

        this.time.addEvent({delay: 1900, callback: this.takeEnemyTurn, callbackScope: this});
    }

    damagePlayer(damage) {
        this.registry.set('player-health', this.registry.get('player-health') - damage);
        if (this.registry.get('player-health') < 0) {
            this.registry.set('player-health', 0);
        }
        if (this.registry.get('player-health') < 1) {
            this.playerMenuActive = false;
            this.time.addEvent({delay: 1000, callback: function () {
                this.player.y -= this.player.height;
                this.player.rotation = (3 * Math.PI)/2;

                this.time.addEvent({delay: 1200, callback: this.gameOver, callbackScope: this});
            }, callbackScope: this});
        }
    }

    gameOver() {
        let gameOverSplash = this.add.image(0, 0, 'game-over').setOrigin(0);
        gameOverSplash.depth = 9001;
        this.time.addEvent({delay: 3200, callback: function () {
            this.registry.set('player-health', 22);
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
