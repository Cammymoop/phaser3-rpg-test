import Phaser from "./phaser-module.js";
import constants from "./constants.js";

export default class UIText extends Phaser.GameObjects.BitmapText {
    constructor(scene, x, y, text, tint, depth) {
        text = text.toUpperCase();

        super(scene, x, y, 'basic-font', text);
        this.setOrigin(0).setLetterSpacing(1);
        this.depth = typeof depth === "undefined" ? 200 : depth;

        if (tint === "red") {
            this.setTintFill(constants.colors.RED);
        } else if (tint === "green") {
            this.setTintFill(constants.colors.GREEN);
        }

        this.scene.add.existing(this); // auto add myself, thats usually what I want
    }
}
