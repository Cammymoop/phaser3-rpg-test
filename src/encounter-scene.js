
Phaser3RPG.EncounterScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
        "use strict";
        Phaser.Scene.call(this, { key: 'EncounterScene' });
    },

    create: function (data) {
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
        this.menuCursor = this.add.sprite(this.menuPositions[0].x, this.menuPositions[0].y, 'symbols', 10).setOrigin(0);
        this.menuCursor.menuPosition = 0;
        this.menuCursor.depth = 10;

        this.playerMenuActive = true;

        this.playerHealthX = 164;
        this.playerHealthY = 30;
        this.healthNumerals = [];

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
                this.playerMenuActive = false;
                this.playerMenu.visible = false;
                this.menuCursor.visible = false;
                let target = this.enemies[0];
                target.health -= 2;
                let minus = this.add.image(target.getCenter().x, target.getCenter().y - target.height/2 - 7, 'minus-two');
                this.time.addEvent({delay: 500, callback: (() => minus.destroy()) });

                this.time.addEvent({delay: 1900, callback: this.takeEnemyTurn, callbackScope: this});
            } else if (this.menuCursor.menuPosition === 1) { // MAGIC
                this.playerMenuActive = false;
                this.playerMenu.visible = false;
                this.menuCursor.visible = false;
                this.time.addEvent({delay: 1900, callback: this.takeEnemyTurn, callbackScope: this});
            } else if (this.menuCursor.menuPosition === 2) { // RUN
                this.leaveEncounter();
            }
        }, this);

        this.input.keyboard.on("keydown_ZERO", function () {
            this.leaveEncounter();
        }, this);
        console.log("encounter started");
    },

    update: function () {
        let playerHealthString = this.registry.get('player-health') + '';
        for (let i = 0; i < 6; i++) {
            if (i < playerHealthString.length) {
                if (!this.healthNumerals[i]) {
                    this.healthNumerals[i] = this.add.sprite(this.playerHealthX + (i * 6), this.playerHealthY, 'symbols', Number.parseInt(playerHealthString[i])).setOrigin(0);
                } else {
                    this.healthNumerals[i].setFrame(Number.parseInt(playerHealthString[i]));
                }
            } else if (i < this.healthNumerals.length) {
                this.healthNumerals[i].destroy();
            }
        }
        this.healthNumerals.length = playerHealthString.length; // truncate
    },

    takeEnemyTurn: function () {
        this.damagePlayer(3);
        let target = this.player;
        let minus = this.add.image(target.getCenter().x, target.getCenter().y - target.height/2 - 7, 'minus-three');
        this.time.addEvent({delay: 500, callback: (() => minus.destroy()) });

        this.time.addEvent({delay: 200, callback: this.playerTurn, callbackScope: this });
    },

    playerTurn: function () {
        this.playerMenu.visible = true;
        if (this.registry.get('player-health') <= 0) {
            return; // only show the menu if you're dead
        }
        this.menuCursor.visible = true;
        this.playerMenuActive = true;

        this.menuCursor.menuPosition = 0;
        this.menuCursor.setPosition(this.menuPositions[0].x, this.menuPositions[0].y);
    },

    damagePlayer: function (damage) {
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
    },

    gameOver: function () {
        let gameOverSplash = this.add.image(0, 0, 'game-over').setOrigin(0);
        gameOverSplash.depth = 9001;
        this.time.addEvent({delay: 3200, callback: function () {
            this.registry.set('player-health', 22);
            this.scene.stop("OverheadMapScene");
            this.scene.stop();
            this.scene.start("OverheadMapScene");
        }, callbackScope: this});
    },

    leaveEncounter: function () {
        console.log("encounter finished");
        this.scene.stop();
        this.scene.resume("OverheadMapScene");
        this.scene.bringToTop("OverheadMapScene");
    },
});
