import PubSub from "pubsub-js";

import mapJson from "assets/map/frogger.json";
import { SQUARE_WIDTH } from "features/game/lib/constants";
import { SPAWNS } from "features/world/lib/spawn";
import { SceneId } from "features/world/mmoMachine";
import { BaseScene } from "features/world/scenes/BaseScene";
import { SUNNYSIDE } from "assets/sunnyside";
import { CROP_LIFECYCLE } from "features/island/plots/lib/plant";

const PLANK_VELOCITY = [-10, 20, -20, 10]; // Adjust the velocity as needed
const PLANK_ROW_Y = [34.5, 33.5, 32.5, 31.5]; // Adjust the velocity as needed

export class FroggerScene extends BaseScene {
  sceneId: SceneId = "frogger";

  // Rows of planks
  planks: Phaser.GameObjects.Sprite[][] = [[], [], [], []];

  constructor() {
    super({
      name: "frogger",
      map: { json: mapJson },
      audio: { fx: { walk_key: "dirt_footstep" } },
    });
  }

  preload() {
    super.preload();

    this.load.spritesheet("chicken", "world/chicken_walking.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.image("pumpkin", CROP_LIFECYCLE.Pumpkin.crop);

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

    const pumpkin = this.add.sprite(231, 588, "pumpkin");

    this.physics.world.enable([pumpkin]);

    if (pumpkin.body) {
      pumpkin.body.setImmovable(true).setCollideWorldBounds(true);

      this.physics.add.collider(
        this.currentPlayer,
        pumpkin,
        () => {
          this.win();
        },
        null,
        this
      );
    }

    const chicken = this.add.sprite(322, 568, "chicken");
    // turtle.setScale(-1, 1);
    const animation = this.anims.create({
      key: "chicken_anim",
      frames: this.anims.generateFrameNumbers("chicken", {
        start: 0,
        end: 9,
      }),
      repeat: -1,
      frameRate: 10,
    }) as Animation;

    // Set up callback for the 4th frame
    chicken.on("animationupdate", (animation, frame) => {
      if (!chicken.body) {
        return;
      }

      console.log({ frame, animation });
      if (frame.index === 4) {
        chicken.body.velocity.x = -10;
      }

      if (frame.index === 8) {
        chicken.body.velocity.x = 0;
      }
    });

    chicken.play("chicken_anim", true);

    chicken.setSize(SQUARE_WIDTH, SQUARE_WIDTH);

    this.physics.world.enable([chicken]);

    if (chicken.body) {
      chicken.body
        .setOffset(0, 0)
        .setImmovable(true)
        .setCollideWorldBounds(true);

      this.physics.add.collider(
        this.currentPlayer,
        chicken,
        () => {
          console.log("COLLIDED");
          this.gameover();
        },
        null,
        this
      );

      // chicken.body.velocity.x = -10;

      // // Function to make the chicken hop
      // const hop = () => {
      //   // Pause X position by setting velocity to 0
      //   chicken.body.velocity.x = 0;

      //   // Wait for a short duration before resuming X position movement
      //   setTimeout(() => {
      //     chicken.body.velocity.x = -10;

      //     // Call hop again after a delay to create pauses between hops
      //     setTimeout(hop, 1000); // Adjust the delay between hops as needed
      //   }, 500); // Adjust the pause duration as needed
      // };

      // // Start the hopping motion
      // hop();
    }
  }

  updatePlanks(row: number) {
    const direction = row % 2 === 0 ? -1 : 1;

    const PLANK_WIDTH = 20;
    const PLANK_BUFFER = 50;

    const sceneWidthInPixels = this.map.widthInPixels;

    const firstRow = this.planks[row]; // Assuming ROW is the row index

    const planks = firstRow.length;
    const lastPlankX = firstRow[planks - 1]?.x ?? 0;
    const lastPlankY = firstRow[planks - 1]?.y ?? 0;

    // Grab the last plank and check if x is far enough
    let hasRoomForPlank = planks === 0;

    if (direction === 1 && lastPlankX > PLANK_WIDTH + PLANK_BUFFER) {
      hasRoomForPlank = true;
    }

    if (
      direction === -1 &&
      sceneWidthInPixels - lastPlankX > PLANK_WIDTH + PLANK_BUFFER
    ) {
      hasRoomForPlank = true;
    }

    // If there is room for another plank - let's add one
    if (hasRoomForPlank) {
      const x =
        direction === 1
          ? sceneWidthInPixels - planks * (PLANK_WIDTH + PLANK_BUFFER)
          : 0 + planks * (PLANK_WIDTH + PLANK_BUFFER);
      const plank = this.add.sprite(
        x,
        PLANK_ROW_Y[row] * SQUARE_WIDTH,
        "plank_2"
      );
      this.planks[row].push(plank);

      this.physics.world.enable([plank]);
      plank.body.velocity.x = PLANK_VELOCITY[row]; // Adjust the velocity as needed
    }

    // // Remove any off screen planks
    // firstRow.forEach((plank, index) => {
    //   // Check if the plank is off the screen on the right side
    //   if (plank.x > sceneWidthInPixels) {
    //     plank.destroy();
    //     // this.physics.world.remove(plank);
    //     firstRow.splice(index, 1);
    //   }
    // });
  }

  crossTheRiver() {
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

    if (playerIsOnRiver) {
      // Check if they are overlapping with a plank collision box

      // Check if they are standing on a plank.
      const playerIsOnPlank = this.planks.some((plank) => {
        return this.physics.overlap(this.currentPlayer, plank);
      });

      if (!playerIsOnPlank) {
        this.gameover();
      }
      // If they are not standing on a plank = game over
    }
  }

  gameover() {
    if (!this.currentPlayer) {
      return;
    }

    // GAME OVER
    PubSub.publish("GAME_OVER");
    this.currentPlayer.x = SPAWNS.frogger.default.x;
    this.currentPlayer.y = SPAWNS.frogger.default.y;
  }

  win() {
    PubSub.publish("WIN");
  }

  updateChickens() {}

  update() {
    this.updatePlayer();
    this.updateOtherPlayers();
    this.crossTheRiver();
    this.updateChickens();

    // this.updatePlanks(0);
    this.planks.forEach((_, row) => {
      this.updatePlanks(row);
    });
  }
}
