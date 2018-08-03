import UIBox from "./ui-box.js";
import UIText from "./ui-text.js";

export default class UIVerticalMenu {
    constructor(scene, x, y, menuItems, depth) {
        this.scene = scene;
        this.depth = depth;

        this.x = x;
        this.y = y;

        this.menuItems = [];
        let xOffset = 6;
        let yOffset = 5;
        let maxWidth = 12;
        if (menuItems.length < 1) {
            menuItems = ['E'];
        }
        for (let itemName of menuItems) {
            let menuItem = new UIText(this.scene, x + xOffset, y + yOffset, ' ' + itemName, null, this.depth + 1);
            maxWidth = Math.max(maxWidth, 12 + menuItem.width);
            this.menuItems.push(menuItem);
            yOffset += 10;
        }
        this.width = Math.min(maxWidth, 200);
        this.height = 10 + (this.menuItems.length * 10) - 3;

        this.menuBox = new UIBox(this.scene, x, y, this.width, this.height);
        this.menuBox.setDepth(this.depth);


        this.cursorIndex = 0;
        this.maxIndex = this.menuItems.length - 1;

        this.cursor = new UIText(this.scene, this.menuItems[0].x, this.menuItems[0].y, '>', 'red', this.depth + 2);
        this.cursor.visible = false;
    }
    setDepth(depth) {
        this.depth = depth;
        this.menuBox.setDepth(depth);
        for (let menuItem of this.menuItems) {
            menuItem.depth = depth + 1;
        }
        this.cursor.depth = depth + 2;
    }
    setVisible(vis) {
        this.menuBox.setVisible(vis);
        for (let menuItem of this.menuItems) {
            menuItem.visible = vis;
        }
        this.cursor.visible = vis;
    }

    moveMenu(xDelta, yDelta) {
        this.x += xDelta;
        this.y += yDelta;
        this.menuBox.setPosition(this.x, this.y);
        for (let menuItem of this.menuItems) {
            menuItem.x += xDelta;
            menuItem.y += yDelta;
        }
        this.cursor.x += xDelta;
        this.cursor.y += yDelta;
    }

    showCursor() {
        this.cursor.visible = true;
    }
    hideCursor() {
        this.cursor.visible = false;
    }
    moveCursor(direction) {
        if (direction !== "down" && direction !== "up") {
            return;
        }
        this.cursorIndex += direction === "down" ? 1 : -1;
        if (this.cursorIndex < 0) {
            this.cursorIndex = this.maxIndex;
        } else if (this.cursorIndex > this.maxIndex) {
            this.cursorIndex = 0;
        }
        let menuItem = this.menuItems[this.cursorIndex];
        this.cursor.y = menuItem.y;
    }
    getCursorIndex() {
        return this.cursorIndex;
    }
    getMenuItemText(index) {
        return this.menuItems[index].text.trim();
    }
    resetCursor() {
        this.cursorIndex = 0;
        this.cursor.y = this.menuItems[0].y;
    }

    destroy() {
        this.menuBox.destroy();
        for (let t of this.menuItems) {
            t.destroy();
        }
        this.cursor.destroy();
    }
}
