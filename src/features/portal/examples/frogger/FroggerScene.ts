import PubSub from "pubsub-js";

import mapJson from "assets/map/frogger.json";
import { SQUARE_WIDTH } from "features/game/lib/constants";
import { SPAWNS } from "features/world/lib/spawn";
import { SceneId } from "features/world/mmoMachine";
import { BaseScene } from "features/world/scenes/BaseScene";

export class FroggerScene extends BaseScene {
  sceneId: SceneId = "frogger";

  planks: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super({
      name: "frogger",
      map: { json: mapJson },
      audio: { fx: { walk_key: "dirt_footstep" } },
    });
  }

  preload() {
    super.preload();

    this.load.image("plank_1", "world/plank_1.png");
    this.load.image("plank_2", "world/plank_2.png");
    this.load.image("plank_3", "world/plank_3.png");
    this.load.image("plank_4", "world/plank_4.png");
  }

  async create() {
    this.map = this.make.tilemap({
      key: "frogger",
    });

    super.create();

    this.physics.world.drawDebug = true;

    const plank1 = this.add.sprite(231, 34.5 * SQUARE_WIDTH, "plank_1");
    const plank2 = this.add.sprite(231, 33.5 * SQUARE_WIDTH, "plank_2");
    const plank3 = this.add.sprite(231, 32.5 * SQUARE_WIDTH, "plank_3");
    const plank4 = this.add.sprite(231, 31.5 * SQUARE_WIDTH, "plank_4");

    this.planks.push(plank1);
    this.planks.push(plank2);
    this.planks.push(plank3);
    this.planks.push(plank4);

    // Assuming plank1, plank2, etc. are Phaser.GameObjects.Sprite
    this.physics.world.enable([plank1, plank2, plank3, plank4]);
  }

  update() {
    this.updatePlayer();

    if (!this.currentPlayer) {
      return;
    }

    // this.updateOtherPlayers();

    const riverYStart = 31;
    const riverYEnd = 34;

    // Check if the player is on top of the river
    const playerY = this.currentPlayer?.y ?? 0;
    const playerX = this.currentPlayer?.x ?? 0;
    const playerIsOnRiver =
      playerY > riverYStart * SQUARE_WIDTH &&
      playerY < riverYEnd * SQUARE_WIDTH;
    // console.log({
    //   playerIsOnRiver,
    //   y: this.currentPlayer.y,
    //   x: this.currentPlayer.x,
    // });

    if (playerIsOnRiver) {
      // Check if they are overlapping with a plank collision box

      // Check if they are standing on a plank.
      const playerIsOnPlank = this.planks.some((plank) => {
        return this.physics.overlap(this.currentPlayer, plank);
      });

      if (!playerIsOnPlank) {
        // GAME OVER
        console.log("GAME OVER!");
        PubSub.publish("GAME_OVER");
        this.currentPlayer.x = SPAWNS.frogger.default.x;
        this.currentPlayer.y = SPAWNS.frogger.default.y;
      }
      // If they are not standing on a plank = game over
    }
  }
}
