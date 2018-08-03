
export default class Item {
    constructor(cache, itemId) {
        this.itemId = itemId;
        this.cache = cache;

        let itemData = this.cache.json.get('item-data');
        if (!itemData.hasOwnProperty(itemId)) {
            this.data = {};
        } else {
            this.data = itemData[itemId];
        }
        this.data = itemData[itemId];

        this.displayName = this.getDataProp("display_name", "mystery item");
        this.equipable = this.getDataProp("equipable", false);
        this.usable = this.getDataProp("usable", false);
        this.consumable = this.getDataProp("consumable", this.usable);

        this.damageModifier = this.getDataProp("damage_modifier", 0);
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

    useOn(target) {
        if (this.getDataProp("heals")) {
            target.heal(this.getDataProp("heals"));
        }
        if (this.getDataProp("damages")) {
            target.damage(this.getDataProp("damages"));
        }
    }

    getDamageModifier() {
        return this.damageModifier;
    }
}
