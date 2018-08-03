import Item from "./item.js";

export default class Character {
    constructor(cache, charId) {
        this.charId = charId;
        this.cache = cache;

        let charData = this.cache.json.get('character-data');
        if (!charData.hasOwnProperty(charId)) {
            this.data = {};
        } else {
            this.data = charData[charId];
        }

        // set up initial stats
        this.maxHealth = this.getDataProp('maxHealth', 5);
        this.baseAttack = this.getDataProp('baseAttack', 1);
        this.level = this.getDataProp('startingLevel', 1);

        // set health and alive status
        this.revive();

        this.inventory = [];
        this.equippedItem = null;
        for (let itemId of this.getDataProp("starting_inventory", [])) {
            let startingItem = new Item(this.cache, itemId);
            if (!this.equippedItem && startingItem.equipable) {
                this.equippedItem = startingItem;
            }
            this.inventory.push(startingItem);
        }

        this.spriteKey = this.getDataProp('sprite_key', 'rat');
        this.battleSprite = false;
    }
    getDataProp(prop, defaultVal) {
        if (typeof defaultVal === "undefined") {
            defaultVal = null;
        }
        if (this.data.hasOwnProperty(prop)) {
            return this.data[prop];
        }
        return defaultVal;
    }

    setBattleSprite(sprite) {
        this.battleSprite = sprite;
    }
    getBattleSprite(sprite) {
        return this.battleSprite;
    }
    cleanupBattleData() {
        this.battleSprite = false;
    }

    revive() {
        this.alive = true;
        this.health = this.maxHealth;
    }

    // Health Related Functions
    isAlive() {
        return this.alive;
    }
    getHealth() {
        return this.health;
    }

    getMaxHealth() {
        return this.maxHealth;
    }
    setMaxHealth(newMax) {
        this.maxHealth = newMax;
    }

    damage(damage) {
        this.health = Math.max(0, this.health - Math.round(damage));
        if (this.health === 0) {
            this.alive = false;
        }

        if (this.battleSprite) {
            this.battleSprite.scene.showDamage(this.battleSprite, damage);
        }
    }
    heal(heal) {
        this.health = Math.min(this.maxHealth, this.health + Math.round(heal));

        if (this.battleSprite) {
            this.battleSprite.scene.showHeal(this.battleSprite, heal);
        }
    }

    // Attack Related Functions
    standardAttack(target) {
        let damage = this.getStandardAttackDamage();
        target.damage(damage);
    }
    getStandardAttackDamage() {
        let damage = this.baseAttack;
        if (this.equippedItem) {
            damage += this.equippedItem.getDamageModifier();
        }
        return damage;
    }

    // Inventory related functions
    getInventoryList() {
        return this.inventory.map((item) => { return item.displayName + (this.equippedItem === item ? '*' : ' '); });
    }
    getInventoryItem(index) {
        if (index < 0 || index >= this.inventory.length) {
            console.log('inventory index out of range');
            return false;
        }
        return this.inventory[index];
    }

    giveInventoryItem(itemId) {
        this.inventory.push(new Item(this.cache, itemId));
    }

    useInventoryItem(index, target) {
        let item = this.getInventoryItem(index);
        item.useOn(target);
        if (item.consumable) {
            this.dropInventoryItem(index);
        }
    }

    dropInventoryItem(index) {
        if (this.isEquiped(index)) {
            this.equippedItem = false;
        }
        this.inventory = this.inventory.filter((_, i) => index !== i);
    }
    toggleEquipItem(index) {
        let item = this.getInventoryItem(index);
        if (this.equippedItem === item) {
            this.equippedItem = false;
        } else {
            this.equippedItem = item;
        }
    }

    isEquiped(index) {
        return this.getInventoryItem(index) === this.equippedItem;
    }
}
