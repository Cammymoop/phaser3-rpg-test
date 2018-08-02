import Phaser from "./phaser-module.js";
import constants from "./constants.js";

import UIBox from "./ui-box.js";
import UIText from "./ui-text.js";
import UIVerticalMenu from "./ui-vertical-menu.js";

import Character from "./character.js";

export default class EncounterScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EncounterScene' });
    }

    create(data) {
        this.cameras.main.setBackgroundColor('#00000');
        this.cameras.main.zoom = 6;

        this.background = this.add.image(0, 0, 'encounter-background').setOrigin(0);
        this.cameras.main.centerOn(this.background.getCenter().x, this.background.getCenter().y);

        this.queuedEvents = [];
        this.await = 0;

        this.player = this.registry.get('player-character');

        let menuX = 132;
        let menuY = 40;

        let menuItems = ["attack", "item", "run"];
        this.actionMenu = new UIVerticalMenu(this, menuX, menuY, menuItems, 15);
        this.activeMenu = this.actionMenu;

        this.playerMenuActive = true;
        this.actionMenu.showCursor();

        this.playerHealthDisplay = new UIText(this, menuX + 6, menuY - 9, 'HP-', null, 20);

        this.enemies = [];
        if (data.hasOwnProperty('enemies')) {
            for (let enemy of data.enemies) {
                if (enemy.type === "rat") {
                    for (let i = 0; i < enemy.quantity; i++) {
                        var spr = this.add.sprite(12 + (i * 22), 118 - (i * 6), 'rat', 0);
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
            if (!this.activeMenu) {
                return;
            }
            this.activeMenu.moveCursor(true);
        }, this);

        this.input.keyboard.on("keydown_UP", function () {
            if (!this.activeMenu) {
                return;
            }
            this.activeMenu.moveCursor(false);
        }, this);

        // select menu option
        this.input.keyboard.on("keydown_SPACE", function () {
            if (!this.activeMenu) {
                return;
            }
            if (this.activeMenu === this.actionMenu) {
                if (this.actionMenu.getCursorIndex() === 0) { // ATTACK
                    this.attackEnemy(this.enemies[0], this.player.getStandardAttackDamage());
                    this.endPlayerTurn();
                } else if (this.actionMenu.getCursorIndex() === 1) { // ITEM
                    this.makeSubMenu(this.player.getInventoryList().concat(['cancel']));
                    this.activeMenu.menuType = "items menu";
                } else if (this.actionMenu.getCursorIndex() === 2) { // RUN
                    this.leaveEncounter();
                }
            } else if (this.activeMenu.menuType === "items menu") {
                let itemIndex = this.activeMenu.getCursorIndex();
                if (this.activeMenu.getMenuItemText(itemIndex).toLowerCase() !== "cancel") {
                    let item = this.player.getInventoryItem(itemIndex);
                    let actions = ['drop', 'cancel'];
                    if (item.usable) {
                        actions.unshift('use');
                    }
                    if (item.equipable) {
                        actions.unshift((this.player.isEquiped(itemIndex) ? 'un' : '') + 'equip');
                    }
                    this.makeSubMenu(actions);
                    this.activeMenu.menuType = "item use menu";
                } else {
                    this.setActiveMenu(this.activeMenu.prevMenu);
                }
            } else if (this.activeMenu.menuType === "item use menu") {
                let action = this.activeMenu.getMenuItemText(this.activeMenu.getCursorIndex()).toLowerCase();
                this.setActiveMenu(this.activeMenu.prevMenu); // return to item list menu
                let itemIndex = this.activeMenu.getCursorIndex();
                let modified = false;
                if (action === 'equip' || action === 'unequip') {
                    this.player.toggleEquipItem(itemIndex);
                    modified = true;
                } else if (action === 'drop') {
                    this.player.dropInventoryItem(itemIndex);
                    modified = true;
                }
                if (modified) {
                    // regenerate item list menu
                    this.setActiveMenu(this.activeMenu.prevMenu);
                    this.makeSubMenu(this.player.getInventoryList().concat(['cancel']));
                    this.activeMenu.menuType = "items menu";
                }
            } else if (this.activeMenu.temporary) {
                this.setActiveMenu(this.activeMenu.prevMenu);
            }
        }, this);

        this.input.keyboard.on("keydown_ESC", function () {
            if (!this.activeMenu) {
                return;
            }
            if (this.activeMenu.temporary) {
                this.setActiveMenu(this.activeMenu.prevMenu);
            }
        });

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

    showDamage(target, damage) {
        this.damageAnimation(target);
        let text = new UIText(this, target.getCenter().x, target.getBounds().top + 3, '-' + damage, 'red').setOrigin(0.5, 1);
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

    setActiveMenu(menu, leaveOpen) {
        if (this.activeMenu) {
            if (this.activeMenu.temporary && !leaveOpen) {
                this.activeMenu.destroy();
            } else if (!leaveOpen) {
                this.activeMenu.hideCursor();
            }
        }
        this.activeMenu = menu;
        if (this.activeMenu) {
            this.activeMenu.showCursor();
        }
    }

    closeSubMenu() {
        this.setActiveMenu(this.activeMenu.prevMenu);
    }

    makeSubMenu(list) {
        let parentMenu = this.activeMenu;
        let subMenuX = parentMenu.x + 4;
        let subMenuY = parentMenu.y + 4 + (parentMenu.getCursorIndex() * 10);

        this.setActiveMenu(new UIVerticalMenu(this, subMenuX, subMenuY, list, parentMenu.depth + 5), true);
        let right = this.activeMenu.x + this.activeMenu.width;
        if (right > this.background.getBounds().right - 1) {
            this.activeMenu.moveMenu(this.background.getBounds().right - 1 - right, 0);
        }
        this.activeMenu.temporary = true;
        this.activeMenu.prevMenu = parentMenu;
    }

    playerTurn() {
        this.actionMenu.setVisible(true);
        if (!this.player.isAlive()) {
            this.actionMenu.hideCursor();
            return; // show only the menu if you're dead
        }
        this.setActiveMenu(this.actionMenu);
        this.actionMenu.resetCursor();
    }

    endPlayerTurn() {
        this.setActiveMenu(false);
        this.actionMenu.setVisible(false);

        this.queueEvent(() => this.time.addEvent({delay: 200, callback: this.takeEnemyTurn, callbackScope: this}));
    }

    damagePlayer(damage) {
        this.player.damage(damage);
        if (!this.player.isAlive()) {
            this.time.addEvent({delay: 1000, callback: function () {
                this.playerSprite.y -= this.playerSprite.height - 4;
                this.playerSprite.x -= 3;
                this.playerSprite.rotation = (3 * Math.PI)/2;
                this.playerSprite.setFrame(3);

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
