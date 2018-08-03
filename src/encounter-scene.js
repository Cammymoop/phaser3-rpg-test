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

        this.ATTACK_OFFSET = 14;

        this.background = this.add.image(0, 0, 'encounter-background').setOrigin(0);
        this.cameras.main.centerOn(this.background.getCenter().x, this.background.getCenter().y);

        this.queuedEvents = [];
        this.await = 0;

        this.player = this.registry.get('player-character');

        let menuX = 132;
        let menuY = 40;

        let menuItems = ["attack", "item", "run"];
        this.actionMenu = new UIVerticalMenu(this, menuX, menuY, menuItems, 15);
        this.actionMenu.menuType = "action menu";
        this.activeMenu = this.actionMenu;

        this.playerMenuActive = true;
        this.actionMenu.showCursor();

        this.playerHealthDisplay = new UIText(this, menuX + 6, menuY - 9, 'HP-', null, 20);

        this.battleSprites = [];
        this.enemies = [];
        let charData = this.cache.json.get('character-data');
        let currIndex = 0;
        if (data.hasOwnProperty('enemies')) {
            for (let enemy of data.enemies) {
                if (!charData.hasOwnProperty(enemy.type)) {
                    console.log("character entry for: " + enemy.type + " not found");
                    continue;
                }
                for (let i = 0; i < enemy.quantity; i++) {
                    let enemyChar = new Character(this.cache, enemy.type); 
                    let enemySprite = this.add.sprite(12 + (currIndex * 22), 118 - (currIndex * 6), enemyChar.spriteKey, 0);
                    enemyChar.setBattleSprite(enemySprite);
                    enemySprite.character = enemyChar;
                    enemySprite.depth = 14 - currIndex;
                    enemySprite.setOrigin(0, 1);
                    //enemySprite.health = 10;
                    this.enemies.push(enemySprite);
                    this.battleSprites.push(enemySprite);
                    currIndex++;
                }
            }
        }
        this.defaultEnemyTarget = this.enemies[0];


        this.playerSprite = this.add.sprite(180, 118, 'player-character', 1);
        this.playerSprite.setOrigin(1, 1);
        this.playerSprite.depth = 20;
        this.playerSprite.character = this.player;

        this.player.setBattleSprite(this.playerSprite);

        this.battleSprites.push(this.playerSprite);
        this.battleSprites.sort((a, b) => a.x - b.x);

        this.input.keyboard.on("keydown_DOWN", function () {
            if (this.activeMenu) {
                this.activeMenu.moveCursor("down");
            }
        }, this);
        this.input.keyboard.on("keydown_UP", function () {
            if (this.activeMenu) {
                this.activeMenu.moveCursor("up");
            }
        }, this);
        this.input.keyboard.on("keydown_LEFT", function () {
            if (this.activeMenu) {
                this.activeMenu.moveCursor("left");
            }
            if (this.battleCursor) {
                this.moveBattleCursor("left");
            }
        }, this);
        this.input.keyboard.on("keydown_RIGHT", function () {
            if (this.activeMenu) {
                this.activeMenu.moveCursor("right");
            }
            if (this.battleCursor) {
                this.moveBattleCursor("right");
            }
        }, this);

        // select menu option
        this.input.keyboard.on("keydown_SPACE", function () {
            if (this.battleCursor) {
                this.selectBattleCursor();
            } else if (this.activeMenu) {
                this.selectMenuItem();
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

        if (!this.player.isAlive()) {
            this.hideMenuStack();
            this.playerHealthDisplay.visible = false;
            this.addBLockingEvent(1000, () => {
                this.playerSprite.y -= this.playerSprite.height - 4;
                this.playerSprite.x -= 3;
                this.playerSprite.rotation = (3 * Math.PI)/2;
                this.playerSprite.setFrame(3);

                this.addBlockingEvent(1200, () => this.gameOver());
            });
        }
        let killEnemy = (enemy) => this.addBlockingEvent(600, () => this.enemyDeath(enemy));
        for (let enemy of this.enemies) {
            if (!enemy.dying && !enemy.character.isAlive()) {
                enemy.dying = true;
                killEnemy(enemy);
            }
        }
    }

    makeBattleCursor(target, callback, targetList) {
        if (typeof targetList === "undefined") {
            targetList = this.battleSprites;
        }
        if (!targetList.includes(target)) {
            console.log('invalid battle cursor target.');
            return;
        }
        this.battleCursor = this.add.sprite(0, 0, 'battle-cursor');
        this.battleCursor.depth = 80;
        this.battleCursor.targetList = targetList;
        this.battleCursor.targetIndex = targetList.indexOf(target);
        this.battleCursor.target = target;
        this.updateBattleCursorPosition();

        this.hideMenuStack();
        this.battleCursor.callback = (target) => { 
            this.showMenuStack();
            this.battleCursor.destroy();
            this.battleCursor = false;
            callback(target.character); 
        };
    }

    moveBattleCursor(direction) {
        if (direction !== "left" && direction !== "right") {
            return;
        }
        let delta = direction === "right" ? 1 : -1;
        this.battleCursor.targetIndex += delta;
        let lastIndex = this.battleCursor.targetList.length - 1;
        if (this.battleCursor.targetIndex < 0) {
            this.battleCursor.targetIndex = lastIndex;
        } else if (this.battleCursor.targetIndex > lastIndex) {
            this.battleCursor.targetIndex = 0;
        }
        this.battleCursor.target = this.battleCursor.targetList[this.battleCursor.targetIndex];
        this.updateBattleCursorPosition();
    }

    updateBattleCursorPosition() {
        this.battleCursor.x = this.battleCursor.target.getCenter().x;
        this.battleCursor.y = this.battleCursor.target.getBounds().top - 8;
    }

    selectBattleCursor() {
        this.battleCursor.callback(this.battleCursor.target);
    }

    addBlockingEvent(delay, callback) {
        if (typeof callback !== "function") {
            console.log("tryed to add a blocking event, but it's not callable");
            return;
        }
        this.await++;
        this.time.addEvent({delay: delay, callback: () => { callback.call(); this.await--; }});
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
        this.battleSprites = this.battleSprites.filter(function (en) {
            return en !== target;
        });
        target.destroy();
        if (this.enemies.length <= 0) {
            console.log('Encoutner Won');
            this.scene.get("OverheadMapScene").removeEncounter();
            this.addBlockingEvent(1800, () => this.leaveEncounter());
            return;
        }
        if (this.defaultEnemyTarget === target) {
            this.defaultEnemyTarget = this.enemies[0];
        }
    }

    queueEvent(callback) {
        this.queuedEvents.push(callback);
    }


    showHeal(target, hp) {
        this.quickFlash(target, constants.colors.GREEN);
        let text = new UIText(this, target.getCenter().x, target.getBounds().top + 3, '+' + hp, 'green').setOrigin(0.5, 1);
        this.tweens.add({
            targets: text,
            y: text.y - 8, // tween this
            duration: 500,
            onComplete: () => { text.destroy(); },
        });
        this.addBlockingEvent(250, () => {});
    }

    showDamage(target, damage) {
        this.quickFlash(target);
        let text = new UIText(this, target.getCenter().x, target.getBounds().top + 3, '-' + damage, 'red').setOrigin(0.5, 1);
        this.tweens.add({
            targets: text,
            y: text.y - 8, // tween this
            duration: 500,
            onComplete: () => { text.destroy(); },
        });
        this.addBlockingEvent(250, () => {});
    }

    quickFlash(target, color) {
        if (typeof color === "undefined") {
            color = constants.colors.WHITE;
        }
        target.setTintFill(color);
        this.time.addEvent({delay: 90, callback: (() => target.clearTint()) });
    }

    takeEnemyTurn() {
        let actualAttack = (a, b) => { a.character.standardAttack(b); a.x -= this.ATTACK_OFFSET; this.addBlockingEvent(400, () => {}); };
        let queueAttack = (attacker, attackee) => this.queueEvent(() => { attacker.x += this.ATTACK_OFFSET; this.addBlockingEvent(600, () => actualAttack(attacker, attackee)); });
        for (let enemy of this.enemies) {
            queueAttack(enemy, this.player);
        }

        this.queueEvent(() => this.playerTurn());
    }

    selectMenuItem() {
        if (!this.activeMenu) {
            return;
        }
        if (this.activeMenu === this.actionMenu) {
            if (this.actionMenu.getCursorIndex() === 0) { // ATTACK
                this.makeBattleCursor(this.defaultEnemyTarget, (target) => {
                    this.defaultEnemyTarget = target.getBattleSprite();
                    this.playerSprite.x -= this.ATTACK_OFFSET;
                    this.addBlockingEvent(400, () => { this.player.standardAttack(target); this.playerSprite.x += this.ATTACK_OFFSET; });
                    this.endPlayerTurn();
                }, this.enemies);
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
            } else if (action === 'use') {
                this.makeBattleCursor(this.playerSprite, (target) => {
                    this.player.useInventoryItem(itemIndex, target);
                    this.endPlayerTurn();
                });
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

    dismisMenuStack() {
        while (this.activeMenu) {
            this.closeSubMenu(this.activeMenu.prevMenu || false);
        }
    }

    menuStackVisibility(vis) {
        let menu = this.activeMenu;
        while (menu) {
            menu.setVisible(vis);
            menu = menu.prevMenu;
        }
    }
    showMenuStack() {
        this.menuStackVisibility(true);
    }
    hideMenuStack() {
        this.menuStackVisibility(false);
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
        console.log('player turn');
        let enemiesLeft = false;
        for (let enemy of this.enemies) {
            if (!enemy.dying) {
                enemiesLeft = true;
            }
        }
        if (!enemiesLeft) {
            return;
        }
        this.actionMenu.setVisible(true);
        if (!this.player.isAlive()) {
            this.actionMenu.hideCursor();
            return; // show only the menu if you're dead
        }
        this.setActiveMenu(this.actionMenu);
        this.actionMenu.resetCursor();
    }

    endPlayerTurn() {
        this.dismisMenuStack();
        this.actionMenu.setVisible(false);

        this.queueEvent(() => this.time.addEvent({delay: 200, callback: this.takeEnemyTurn, callbackScope: this}));
    }

    cleanup() {
        this.player.cleanupBattleData();
    }

    gameOver() {
        let gameOverSplash = this.add.image(0, 0, 'game-over').setOrigin(0);
        gameOverSplash.depth = 9001;
        this.time.addEvent({delay: 3200, callback: function () {
            this.cleanup();
            this.player.setMaxHealth(this.player.getMaxHealth() + 8);
            this.player.giveInventoryItem('potion');
            this.player.revive();

            this.scene.stop("OverheadMapScene");
            this.scene.stop();
            this.scene.start("OverheadMapScene");
        }, callbackScope: this});
    }

    leaveEncounter() {
        console.log("encounter finished");
        this.cleanup();
        this.scene.stop();
        this.scene.get("OverheadMapScene").resume();
    }
}
