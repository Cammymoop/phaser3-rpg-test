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
    }
    heal(heal) {
        this.health = Math.min(this.maxHealth, this.health + Math.round(heal));
    }

    // Attack Related Functions
    getStandardAttackDamage() {
        let damage = this.baseAttack;
        if (this.equippedItem) {
            damage += this.equippedItem.getDamageModifier();
        }
        return damage;
    }
}
