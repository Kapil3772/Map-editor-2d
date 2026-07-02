class Rect {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
  top() {
    return this.y;
  }
  bottom() {
    return this.y + this.h;
  }
  right() {
    return this.x + this.w;
  }
  left() {
    return this.x;
  }
  centerX() {
    return this.x + this.w / 2.0;
  }
  centerY() {
    return this.y + this.h / 2.0;
  }
}
class PhysicsRect extends Rect {
  constructor(x, y, w, h) {
    super(x, y, w, h);
    this.prevX = x;
    this.prevY = y;
    this.gridX = 0;
    this.gridY = 0;
  }
  intersects(rect) {
    return (
      this.right() > rect.left() &&
      this.bottom() > rect.top() &&
      this.left() < rect.right() &&
      this.top() < rect.bottom()
    );
  }
  intersectsPoint(x, y) {
    return (
      this.right() > x && this.left() < x && y > this.top() && y < this.bottom()
    );
  }
}

class GameImage {
  loadImage(path) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = path;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  }
  async loadImagesFromFolder(path, count) {
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(
        this.loadImage(path + i + ".png").catch((err) => {
          console.log("Cannot load: " + path + i + ".png");
          return null;
        }),
      );
    }
    return (await Promise.all(promises)).filter(Boolean);
  }
}

class GameButton extends Rect {
  constructor(game, x, y, w, h, text) {
    super(x, y, w, h);
    this.game = game;
    this.text = text;
    this.bgColor = "#369E56";
    this.hoverColor = "#46C26A";
    this.textColor = "white";
    this.borderColor = "white";
    this.hovered = false;
  }
  containsPoint(x, y) {
    return (
      x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h
    );
  }
  update() {
    this.hovered = this.containsPoint(
      this.game.globalInputs.mouseX,
      this.game.globalInputs.mouseY,
    );
  }
  isClicked() {
    return this.game.globalInputs.attackPressed && this.hovered;
  }
  render(ctx) {
    ctx.fillStyle = this.hovered ? this.hoverColor : this.bgColor;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.borderColor;
    ctx.strokeRect(this.x, this.y, this.w, this.h);
    ctx.fillStyle = this.textColor;
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.text, this.x + this.w / 2, this.y + this.h / 2);
  }
}

class Tile extends PhysicsRect {
  constructor(x, y, w, h, camera, img) {
    super(x, y, w, h);
    this.camera = camera;
    this.img = img;
  }
  update(dt) {}
  render(ctx) {
    if (this.img != null) {
      ctx.drawImage(
        this.img,
        this.x + this.camera.camOffsetX,
        this.y + this.camera.camOffsetY,
        this.w,
        this.h,
      );
      //debug
      // ctx.strokeStyle = "cyan";
      // ctx.strokeRect(
      //   this.x + this.camera.camOffsetX,
      //   this.y + this.camera.camOffsetY,
      //   this.w,
      //   this.h,
      // );
    } else {
      ctx.strokeStyle = "cyan";
      ctx.strokeRect(
        this.x + this.camera.camOffsetX,
        this.y + this.camera.camOffsetY,
        this.w,
        this.h,
      );
    }
  }
}
class Decor extends PhysicsRect {
  constructor(x, y, w, h, camera, img) {
    super(x, y, w, h);
    this.camera = camera;
    this.img = img;
  }
  update(dt) {}
  render(ctx) {
    if (this.img != null) {
      ctx.drawImage(
        this.img,
        this.x + this.camera.camOffsetX,
        this.y + this.camera.camOffsetY,
        this.w,
        this.h,
      );
    } else {
      ctx.strokeStyle = "red";
      ctx.strokeRect(
        this.x + this.camera.camOffsetX,
        this.y + this.camera.camOffsetY,
        this.w,
        this.h,
      );
    }
  }
}
class TileMap {
  constructor(game, tileW, tileH, camera) {
    this.game = game;
    this.camera = camera;
    this.tileW = tileW;
    this.tileH = tileH;
    this.ongridTilesData = null;
    this.offGridTilesData = null;
    this.onGridTiles = new Map();
    this.offGridTiles = new Map();
    this.onGridTilesData = new Map();
    this.offGridTilesData = new Map();
    // for (let i = 0; i < 20; i++) {
    //   this.onGridTiles.set(
    //     "" + i + ",6",
    //     new Tile(0 + i * 32, 6 * 32, 32, 32, this.camera, null),
    //   );
    // }
    this.onScreenTiles = [];
    this.visibleLeft = 0;
    this.visibleRight = 0;
    this.visibleTop = 0;
    this.visibleBottom = 0;

    this.waveData = null;
  }
  async loadTileMap(path) {
    const res = await fetch(path);
    const data = await res.json();
    this.tileW = data.tileW;
    this.tileH = data.tileH;
    const onGridTilesData = data.onGridTiles;
    const offGridTilesData = data.offGridTiles || [];
    for (const tile of onGridTilesData) {
      const tileType = tile.type;
      const tileVariant = tile.variant;
      const img = this.game.tileVariantRegistry[tileType][tileVariant];
      if (!img) {
        console.log(
          "Couldn't find tile " +
            tileType +
            "variant " +
            tileVariant +
            "in the registry",
        );
      }
      this.onGridTiles.set(
        tile.gridX + "," + tile.gridY,
        new Tile(
          tile.gridX * this.tileW,
          tile.gridY * this.tileH,
          this.tileW,
          this.tileH,
          this.game.currentMode.camera,
          img,
        ),
      );
    }
    //this.tileSize = data.tile_size || 16;
  }
  async loadTileMap2(path) {
    const res = await fetch(path);
    const data = await res.json();

    this.tileW = data.tileW;
    this.tileH = data.tileH;
    const onGridTilesData = data.tileMap;
    const offGridTilesData = data.offGridTiles || [];
    this.waveData = data.waveData;

    for (const tile of Object.values(onGridTilesData)) {
      const tileType = tile.type;
      const tileVariant = tile.variant;
      const img = this.game.tileVariantRegistry[tileType]?.[tileVariant];
      if (!img) {
        console.log(
          "Couldn't find tile " +
            tileType +
            "variant " +
            tileVariant +
            "in the registry",
        );
      }
      if (tileType == "decor") {
        this.offGridTiles.set(
          tile.pos[0] + "," + tile.pos[1],
          new Decor(
            tile.pos[0] * this.tileW,
            tile.pos[1] * this.tileH,
            img.width * 2,
            img.height * 2,
            this.game.currentMode.camera,
            img,
          ),
        );
      } else {
        this.onGridTiles.set(
          tile.pos[0] + "," + tile.pos[1],
          new Tile(
            tile.pos[0] * this.tileW,
            tile.pos[1] * this.tileH,
            this.tileW,
            this.tileH,
            this.game.currentMode.camera,
            img,
          ),
        );
      }
    }
    for (const tile of Object.values(offGridTilesData)) {
      const tileType = tile.type;
      const tileVariant = tile.variant;
      const img = this.game.tileVariantRegistry[tileType]?.[tileVariant];
      if (!img) {
        console.log(
          "Couldn't find tile " +
            tileType +
            "variant " +
            tileVariant +
            "in the registry",
        );
        continue;
      }
      this.offGridTiles.set(
        tile.pos[0] + "," + tile.pos[1],
        new Decor(
          tile.pos[0] * 2,
          tile.pos[1] * 2,
          img.width * 2,
          img.height * 2,
          this.game.currentMode.camera,
          img,
        ),
      );
    }
    //this.tileSize = data.tile_size || 16;
  }

  update(dt) {
    this.updateOnScreenTile();
  }
  renderTiles(ctx) {
    for (const tile of this.onScreenTiles.values()) {
      tile.render(ctx);
    }
  }
  renderDecors(ctx) {
    for (const decor of this.offGridTiles.values()) {
      decor.render(ctx);
    }
  }
  checkForPhysicsTile(gridx, gridy) {
    return this.onGridTiles.has(gridx + "," + gridy);
  }
  updateOnScreenTile() {
    this.onScreenTiles = [];
    this.visibleLeft = Math.floor(
      (this.camera.x - this.game.vCanvasW / 2) / this.tileW,
    );
    this.visibleRight = Math.ceil(
      (this.camera.x + this.game.vCanvasW / 2) / this.tileW,
    );
    this.visibleTop = Math.floor(
      (this.camera.y - this.game.vCanvasH / 2) / this.tileH,
    );
    this.visibleBottom = Math.ceil(
      (this.camera.y + this.game.vCanvasH / 2) / this.tileH,
    );
    for (let i = this.visibleLeft; i <= this.visibleRight; i++) {
      for (let j = this.visibleTop; j <= this.visibleBottom; j++) {
        const tile = this.onGridTiles.get(i + "," + j);
        if (tile) {
          this.onScreenTiles.push(tile);
        }
      }
    }
  }
  getOngridTile(x, y) {
    return this.onGridTiles.get(x + "," + y);
  }
}
class TileCollisionHandeler {
  constructor(entity, tileW, tileH) {
    this.entity = entity;
    this.tileW = tileW;
    this.tileH = tileH;
    this.physicsRectAround = [];
  }
  resolveHorizontalCollision() {
    for (const tile of this.physicsRectAround) {
      if (tile.intersects(this.entity)) {
        //horisontal resolve
        if (this.entity.prevX + this.entity.w <= tile.left()) {
          // Came from left
          this.entity.x = tile.left() - this.entity.w;
        } else if (this.entity.prevX >= tile.right()) {
          // Came from right
          this.entity.x = tile.right();
        }
      }
    }
  }
  resolveVerticalCollision() {
    for (const tile of this.physicsRectAround) {
      if (tile.intersects(this.entity)) {
        //vertical resolve
        if (this.entity.yVelocity > 0) {
          this.entity.y = tile.top() - this.entity.h;
          this.entity.yVelocity = 0;
        } else if (this.entity.yVelocity < 0) {
          this.entity.y = tile.bottom();
          this.entity.yVelocity = 0;
        }
      }
    }
  }
  updatePhysicsTilesAround() {
    this.physicsRectAround = [];
    let gridLeft = Math.floor(this.entity.left() / this.tileW);
    let gridRight = Math.ceil(this.entity.right() / this.tileW);
    let gridTop = Math.floor(this.entity.top() / this.tileH);
    let gridBottom = Math.ceil(this.entity.bottom() / this.tileH);
    for (let i = gridLeft; i <= gridRight; i++) {
      for (let j = gridTop; j <= gridBottom; j++) {
        const tile = this.entity.game.tileMap.onGridTiles.get(`${i},${j}`);
        if (tile != null) {
          this.physicsRectAround.push(tile);
        }
      }
    }
  }
}

class Player extends PhysicsRect {
  constructor(game, x, y, w, h) {
    super(x, y, w, h);
    this.game = game;
    this.init();
  }
  init() {
    this.xDirection = 0;
    this.yDirection = 0;
    this.baseVelocity = 250;
    this.xVelocity = this.baseVelocity; //px per second
    this.yVelocity = this.baseVelocity; //px per second

    //visuals
    this.img = null;
    this.flip = false;
  }
  update(dt) {
    // horizontal movement
    let left = this.game.globalInputs.leftPressed ? 1 : 0;
    let right = this.game.globalInputs.rightPressed ? 1 : 0;
    let bottom = this.game.globalInputs.downPressed ? 1 : 0;
    let up = this.game.globalInputs.upPressed ? 1 : 0;
    this.xDirection = right - left;
    this.yDirection = bottom - up;
    if (this.xDirection != 0 && this.yDirection != 0) {
      this.xVelocity = Math.cos(Math.PI / 4) * this.baseVelocity;
      this.yVelocity = Math.sin(Math.PI / 4) * this.baseVelocity;
    } else {
      this.xVelocity = this.baseVelocity;
      this.yVelocity = this.baseVelocity;
    }
    if (this.xDirection != 0) {
      this.flip = this.xDirection == 1 ? true : false; //true means player is facing right
    }

    this.x = this.x + this.xVelocity * dt * this.xDirection;

    this.y = this.y + this.yVelocity * dt * this.yDirection;

    this.prevX = this.x;
    this.prevY = this.y;
  }

  render(ctx) {
    const camera = this.game.camera;

    ctx.fillStyle = "cyan";
    ctx.fillRect(
      this.x + camera.camOffsetX,
      this.y + camera.camOffsetY,
      this.w,
      this.h,
    );
  }
  reset() {}
}

class Camera extends Rect {
  constructor(x, y, w, h, game, relativeEntity) {
    super(x, y, w, h);
    this.game = game;
    this.entity = relativeEntity; // entity where thr camera focuses
    this.camOffsetX = 0;
    this.camOffsetY = 0;
    this.xSmoothnessFactor = 4;
    this.ySmoothnessFactor = 4;
  }
  update(dt) {
    this.x += (this.entity.centerX() - this.x) * dt * this.xSmoothnessFactor;
    this.y += (this.entity.centerY() - this.y) * dt * this.ySmoothnessFactor;
    this.camOffsetX = this.game.vCanvasW / 2 - this.x;
    this.camOffsetY = this.game.vCanvasH / 2 - this.y;

    this.game.gameRenderingRect.x = this.x - this.game.gameRenderingRect.w / 2;
    this.game.gameRenderingRect.y = this.y - this.game.gameRenderingRect.h / 2;
  }
  render(ctx) {
    ctx.fillStyle = "green";
    ctx.fillRect(
      this.x - this.w / 2 + this.camOffsetX,
      this.y - this.h / 2 + this.camOffsetY,
      this.w,
      this.h,
    );
  }
}

class GameInputs {
  constructor() {
    this.leftPressed = false;
    this.rightPressed = false;
    this.upPressed = false;
    this.jumpHandeled = false;
    this.downPressed = false;
    this.enterPressed = false;
    this.shiftPressed = false;
    this.leftClickPressed = false;
    this.rightClickPressed = false;
    this.holdUpdate = false;
    this.gridModePressed = false;
    this.gridModePressHandeled = false;
    this.addedOffGridTile = false;
    this.mouseX = 0;
    this.mouseY = 0;
  }
  reset() {
    this.leftPressed = false;
    this.rightPressed = false;
    this.upPressed = false;
    this.jumpHandeled = false;
    this.downPressed = false;
    this.enterPressed = false;
    this.shiftPressed = false;
    this.leftClickPressed = false;
    this.rightClickPressed = false;
    this.holdUpdate = false;
  }
}

class Pointer {
  constructor(game, x, y, camera) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.gridX = 0;
    this.gridY = 0;
    this.camera = camera;
    this.tileW = this.game.tileMap.tileW;
    this.tileH = this.game.tileMap.tileH;

    //states
    this.onGrid = false;
  }
  update(dt) {
    this.x = this.game.globalInputs.mouseX - this.camera.camOffsetX;
    this.y = this.game.globalInputs.mouseY - this.camera.camOffsetY;

    this.gridX = Math.floor(this.x / this.tileW);
    this.gridY = Math.floor(this.y / this.tileH);
    this.onGrid = this.game.globalInputs.gridModePressed;

    if (this.game.globalInputs.leftClickPressed) {
      if (this.onGrid) {
        this.addOngridTile();
      } else {
        if (!this.game.globalInputs.addedOffGridTile) {
          this.game.globalInputs.addedOffGridTile = true;
          this.addOffGridTile();
        }
      }
    }
  }
  render(ctx) {
    ctx.fillStyle = "rgba(0,255,255,0.4)";
    if (this.onGrid) {
      ctx.fillRect(
        this.gridX * this.tileW + this.camera.camOffsetX,
        this.gridY * this.tileH + this.camera.camOffsetY,
        this.tileW,
        this.tileH,
      );
    } else {
      ctx.fillRect(
        this.x + this.camera.camOffsetX,
        this.y + this.camera.camOffsetY,
        this.tileW,
        this.tileH,
      );
    }
  }
  addOngridTile() {
    this.game.tileMap.onGridTiles.set(
      this.gridX + "," + this.gridY,
      new Tile(
        this.gridX * this.tileW,
        this.gridY * this.tileH,
        this.tileW,
        this.tileH,
        this.camera,
        null,
      ),
    );
  }
  addOffGridTile() {
    this.game.tileMap.offGridTiles.set(
      this.x + "," + this.y,
      new Tile(this.x, this.y, this.tileW, this.tileH, this.camera, null),
    );
  }
}

class Editor {
  constructor() {
    this.canvas = document.getElementById("editor");
    this.canvasW = 1080;
    this.canvasH = 720;
    this.canvas.width = this.canvasW;
    this.canvas.height = this.canvasH;
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    this.vCanvas = document.createElement("canvas");
    this.vCanvasW = this.canvasW / 2;
    this.vCanvasH = this.canvasH / 2;
    this.vCanvas.width = this.vCanvasW;
    this.vCanvas.height = this.vCanvasH;
    this.vCtx = this.vCanvas.getContext("2d");
    this.vCtx.imageSmoothingEnabled = false;
    this.init();
  }
  async init() {
    //game inputs
    this.gameRenderingRect = new Rect(
      -50,
      -50,
      this.vCanvasW + 100,
      this.vCanvasH + 100,
    );
    this.globalInputs = new GameInputs();
    this.bindInputs();

    //Entities
    this.playerW = 16;
    this.playerH = 42;
    this.player = new Player(this, 0, 0, this.playerW, this.playerH);
    //Camera
    this.camera = new Camera(0, 0, 5, 5, this, this.player);

    //TILEMAP
    this.tileMap = new TileMap(this, 32, 32, this.camera);

    //Pointer
    this.pointer = new Pointer(this, 0, 0, this.camera);

    //main loop dependenciesa
    this.nowMs = performance.now();
    this.prevMs = this.nowMs;
    this.deltaTime = 0;
    this.gameloop();

    //asset loading
    await this.loadAssets();
    this.assetLoaded = true;
  }
  bindInputs() {
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.globalInputs.mouseX = mouseX * (this.vCanvasW / rect.width);

      this.globalInputs.mouseY = mouseY * (this.vCanvasH / rect.height);
    });
    window.addEventListener("blur", () => {
      this.globalInputs.reset();
    });
    window.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
    window.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        this.globalInputs.leftClickPressed = true;
      } else if (e.button === 2) {
        this.globalInputs.rightClickPressed = true;
      }
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        this.globalInputs.leftClickPressed = false;
        this.globalInputs.addedOffGridTile = false;
      } else if (e.button === 2) {
        this.globalInputs.rightClickPressed = false;
      }
    });
    window.addEventListener("keydown", (e) => {
      switch (e.code) {
        case "KeyA":
          this.globalInputs.leftPressed = true;
          break;
        case "KeyD":
          this.globalInputs.rightPressed = true;
          break;
        case "KeyW":
          this.globalInputs.upPressed = true;
          break;
        case "KeyS":
          this.globalInputs.downPressed = true;
          break;
        case "KeyG":
          if (!this.globalInputs.gridModePressHandeled) {
            console.log("pressed");
            this.globalInputs.gridModePressHandeled = true;
            this.globalInputs.gridModePressed =
              !this.globalInputs.gridModePressed;
          }
          break;

        case "Enter":
          this.globalInputs.enterPressed = true;
          break;
        case "ShiftLeft":
          break;
        case "ShiftRight":
          this.globalInputs.shiftPressed = true;
          break;
      }
    });

    window.addEventListener("keyup", (e) => {
      switch (e.code) {
        case "KeyA":
          this.globalInputs.leftPressed = false;
          break;
        case "KeyD":
          this.globalInputs.rightPressed = false;
          break;
        case "KeyW":
          this.globalInputs.upPressed = false;
          this.globalInputs.jumpHandeled = false;
          break;
        case "KeyS":
          this.globalInputs.downPressed = false;
          break;
        case "KeyG":
          this.globalInputs.gridModePressHandeled = false;
          break;

        case "Enter":
          this.globalInputs.enterPressed = false;
          break;
        case "ShiftLeft":
          break;
        case "ShiftRight":
          this.globalInputs.shiftPressed = false;
          break;
      }
    });
  }
  async loadAssets() {
    this.loader = new GameImage();
    const [grass, stone, decor, largeDecor] = await Promise.all([
      this.loader.loadImagesFromFolder("assets/tiles/grass/", 9),
      this.loader.loadImagesFromFolder("assets/tiles/stone/", 9),
      this.loader.loadImagesFromFolder("assets/tiles/decor/", 4),
      this.loader.loadImagesFromFolder("assets/tiles/largeDecor/", 3),
    ]);
    this.tileVariantRegistry = {
      grass: grass,
      stone: stone,
      decor: decor,
      largeDecor: largeDecor,
    };
  }
  gameloop() {
    //delta time calculation
    this.nowMs = performance.now();
    this.deltaTime = (this.nowMs - this.prevMs) / 1000;
    this.deltaTime = Math.min(this.deltaTime, 0.05);
    this.prevMs = this.nowMs;

    this.update(this.deltaTime);
    this.render(this.vCtx);

    requestAnimationFrame(() => this.gameloop());
  }
  update(dt) {
    if (!this.assetLoaded) {
      return;
    }
    this.player.update(dt);
    this.camera.update(dt);
    this.tileMap.update(dt);
    this.pointer.update(dt);
  }
  render(ctx) {
    ctx.clearRect(0, 0, this.vCanvasW, this.vCanvasH);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, this.vCanvasW, this.vCanvasH);

    if (!this.assetLoaded) {
      return;
    }
    this.renderWorldAxis(ctx);
    this.player.render(ctx);
    this.camera.render(ctx);
    this.pointer.render(ctx);
    this.tileMap.renderTiles(ctx);
    this.tileMap.renderDecors(ctx);
    this.renderWorldUi(ctx);
    //rendering vCtx into ctx
    this.ctx.clearRect(0, 0, this.canvasW, this.canvasH);
    this.ctx.drawImage(this.vCanvas, 0, 0, this.canvasW, this.canvasH);
  }
  renderWorldAxis(ctx) {
    ctx.strokeStyle = "cyan";
    const vx = this.camera.camOffsetX;
    const vy = this.camera.camOffsetY;
    ctx.beginPath();
    ctx.moveTo(vx, vy - 5000);
    ctx.lineTo(vx, vy + 10000);
    ctx.stroke();
    ctx.closePath();
    ctx.beginPath();
    ctx.moveTo(vx - 5000, vy);
    ctx.lineTo(vx + 10000, vy);
    ctx.stroke();
    ctx.closePath();
  }
  renderWorldUi(ctx) {
    ctx.fillStyle = "rgba(0,255,255,1)";
    ctx.font = "10px bold";
    const pointerMode = this.pointer.onGrid ? "grid" : "off-grid";
    ctx.fillText("Pointer Mode : " + pointerMode, 10, this.vCanvasH - 10);
    ctx.fillText(
      "x : " +
        Math.floor(this.pointer.x) +
        " y : " +
        Math.floor(this.pointer.y),
      115,
      this.vCanvasH - 10,
    );
    ctx.fillText(
      "gx : " + this.pointer.gridX + " gy : " + this.pointer.gridY,
      185,
      this.vCanvasH - 10,
    );
  }
}

const editor = new Editor();
