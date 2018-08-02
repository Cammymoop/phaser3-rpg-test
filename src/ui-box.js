

export default class UIBox {
    constructor(scene, x, y, width, height) {
        this.scene = scene;
        this.renderTexture = this.scene.add.renderTexture(x, y, width, height);

        this.drawSelf();
    }

    drawSelf() {
        let width = this.renderTexture.width;
        let height = this.renderTexture.height;
        if (width < 8 || height < 8) {
            return; // dont try to draw too small
        }

        let brush = this.scene.textures.getFrame('single-pixel');
        let black = 0x000000;

        for (let horiz = 0; horiz < width; horiz++) {
            if (horiz > 1 && width - horiz > 2) {
                this.renderTexture.draw(brush.texture, brush, horiz, 0, black);
                this.renderTexture.draw(brush.texture, brush, horiz, 1);

                this.renderTexture.draw(brush.texture, brush, horiz, height - 2);
                this.renderTexture.draw(brush.texture, brush, horiz, height - 1, black);
            } else if (horiz === 1 || width - horiz === 2) {
                this.renderTexture.draw(brush.texture, brush, horiz, 1, black);
                this.renderTexture.draw(brush.texture, brush, horiz, height - 2, black);
            }
        }
        for (let vert = 2; vert < height - 2; vert++) {
            this.renderTexture.draw(brush.texture, brush, 0, vert, black);
            this.renderTexture.draw(brush.texture, brush, 1, vert);

            for (let horiz = 2; horiz < width - 2; horiz++) {
                this.renderTexture.draw(brush.texture, brush, horiz, vert, black);
            }

            this.renderTexture.draw(brush.texture, brush, width - 2, vert);
            this.renderTexture.draw(brush.texture, brush, width - 1, vert, black);
        }
    }

    setPosition(x, y) {
        this.renderTexture.setPosition(x, y);
    }
    getPosition(x, y) {
        return this.renderTexture.getPosition();
    }
    setVisible(vis) {
        this.renderTexture.visible = vis;
    }
    setDepth(depth) {
        this.renderTexture.depth = depth;
    }

    // todo figure out how to update the texture size of a render texture maybe?
    // setSize(width, height) {}

    destroy() {
        this.renderTexture.destroy();
    }
}
