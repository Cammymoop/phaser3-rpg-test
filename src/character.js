import Phaser from "./phaser-module.js";
import constants from "./constants.js";

export default class Character {
    constructor(maxHealth) {
        let max = Math.round(maxHealth);
        this.maxHealth = max;
        this.revive();

        this.baseAttack = 1;
        this.level = 1;
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
        return this.baseAttack;
    }
}
