export type InputState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  lookLeft: boolean;
  lookRight: boolean;
  lookUp: boolean;
  lookDown: boolean;
  pointerLocked: boolean;
  dragLook: boolean;
  mouseDx: number;
  mouseDy: number;
};

export type InputActions = {
  targetNext: boolean;
  slot1: boolean;
  slot2: boolean;
  toggleDebug: boolean;
  resetEncounter: boolean;
  warpTown: boolean;
  warpSlimes: boolean;
  equipDebug: boolean;
  backToMenu: boolean;
  jump: boolean;
  warpCollision: boolean;
};

export class InputController {
  readonly state: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    lookLeft: false,
    lookRight: false,
    lookUp: false,
    lookDown: false,
    pointerLocked: false,
    dragLook: false,
    mouseDx: 0,
    mouseDy: 0
  };

  private readonly canvas: HTMLCanvasElement;
  private readonly onEscape: () => void;
  private readonly pressedUntil = new Map<string, number>();
  private readonly actions = new Set<keyof InputActions>();

  constructor(canvas: HTMLCanvasElement, onEscape: () => void) {
    this.canvas = canvas;
    this.onEscape = onEscape;
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener("blur", this.handleWindowBlur);
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    document.addEventListener("pointerlockchange", this.handlePointerLock);
  }

  requestPointerLock(): void {
    void this.canvas.requestPointerLock().catch(() => {
      this.state.pointerLocked = false;
    });
  }

  consumeMouse(): { dx: number; dy: number } {
    this.applyPressedGraceWindow();
    const mouse = { dx: this.state.mouseDx, dy: this.state.mouseDy };
    this.state.mouseDx = 0;
    this.state.mouseDy = 0;
    return mouse;
  }

  consumeActions(): InputActions {
    const actions: InputActions = {
      targetNext: this.actions.has("targetNext"),
      slot1: this.actions.has("slot1"),
      slot2: this.actions.has("slot2"),
      toggleDebug: this.actions.has("toggleDebug"),
      resetEncounter: this.actions.has("resetEncounter"),
      warpTown: this.actions.has("warpTown"),
      warpSlimes: this.actions.has("warpSlimes"),
      equipDebug: this.actions.has("equipDebug"),
      backToMenu: this.actions.has("backToMenu"),
      jump: this.actions.has("jump"),
      warpCollision: this.actions.has("warpCollision")
    };
    this.actions.clear();
    return actions;
  }

  dispose(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("blur", this.handleWindowBlur);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    document.removeEventListener("pointerlockchange", this.handlePointerLock);
  }

  private readonly handlePointerLock = (): void => {
    this.state.pointerLocked = document.pointerLockElement === this.canvas;
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.state.pointerLocked && !this.state.dragLook) {
      return;
    }

    this.state.mouseDx += event.movementX;
    this.state.mouseDy += event.movementY;
  };

  private readonly handleMouseDown = (): void => {
    if (!this.state.pointerLocked) {
      this.state.dragLook = true;
    }
  };

  private readonly handleMouseUp = (): void => {
    this.state.dragLook = false;
  };

  private readonly handleWindowBlur = (): void => {
    this.state.dragLook = false;
    for (const code of this.pressedUntil.keys()) {
      this.setKey(code, false);
    }
    this.pressedUntil.clear();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const code = this.normalizeKeyCode(event);
    this.pressedUntil.delete(code);
    this.setKey(code, true);
    this.queueAction(code);

    if (this.isGameKey(code)) {
      event.preventDefault();
    }

    if (code === "Escape") {
      this.onEscape();
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const code = this.normalizeKeyCode(event);
    this.pressedUntil.set(code, performance.now() + 180);

    if (this.isGameKey(code)) {
      event.preventDefault();
    }
  };

  private applyPressedGraceWindow(): void {
    const now = performance.now();

    for (const [code, until] of this.pressedUntil) {
      if (until > now) {
        this.setKey(code, true);
      } else {
        this.pressedUntil.delete(code);
        this.setKey(code, false);
      }
    }
  }

  private setKey(code: string, active: boolean): void {
    switch (code) {
      case "KeyW":
      case "ArrowUp":
        this.state.forward = active;
        break;
      case "KeyS":
      case "ArrowDown":
        this.state.backward = active;
        break;
      case "KeyA":
      case "ArrowLeft":
        this.state.left = active;
        break;
      case "KeyD":
      case "ArrowRight":
        this.state.right = active;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.state.sprint = active;
        break;
      case "Space":
      case "KeyJ":
        this.state.jump = active;
        break;
      case "KeyQ":
        this.state.lookLeft = active;
        break;
      case "KeyE":
        this.state.lookRight = active;
        break;
      case "KeyR":
        this.state.lookUp = active;
        break;
      case "KeyF":
        this.state.lookDown = active;
        break;
    }
  }

  private queueAction(code: string): void {
    switch (code) {
      case "Tab":
        this.actions.add("targetNext");
        break;
      case "Digit1":
        this.actions.add("slot1");
        break;
      case "Digit2":
        this.actions.add("slot2");
        break;
      case "KeyT":
        this.actions.add("toggleDebug");
        break;
      case "Digit6":
        this.actions.add("resetEncounter");
        break;
      case "Digit7":
        this.actions.add("warpTown");
        break;
      case "Digit8":
        this.actions.add("warpSlimes");
        break;
      case "Digit9":
        this.actions.add("equipDebug");
        break;
      case "Digit0":
        this.actions.add("warpCollision");
        break;
      case "KeyM":
        this.actions.add("backToMenu");
        break;
      case "Space":
      case "KeyJ":
        this.actions.add("jump");
        break;
    }
  }

  private normalizeKeyCode(event: KeyboardEvent): string {
    if (event.code) {
      return event.code;
    }

    switch (event.key) {
      case "w":
      case "W":
        return "KeyW";
      case "a":
      case "A":
        return "KeyA";
      case "s":
      case "S":
        return "KeyS";
      case "d":
      case "D":
        return "KeyD";
      case "q":
      case "Q":
        return "KeyQ";
      case "e":
      case "E":
        return "KeyE";
      case "r":
      case "R":
        return "KeyR";
      case "f":
      case "F":
        return "KeyF";
      case "t":
      case "T":
        return "KeyT";
      case "j":
      case "J":
        return "KeyJ";
      case "1":
        return "Digit1";
      case "2":
        return "Digit2";
      case "7":
        return "Digit7";
      case "6":
        return "Digit6";
      case "8":
        return "Digit8";
      case "9":
        return "Digit9";
      case "0":
        return "Digit0";
      case "m":
      case "M":
        return "KeyM";
      case " ":
      case "Space":
      case "Spacebar":
        return "Space";
      default:
        return event.key;
    }
  }

  private isGameKey(code: string): boolean {
    return [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "KeyQ",
      "KeyE",
      "KeyR",
      "KeyF",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ShiftLeft",
      "ShiftRight",
      "Space",
      "KeyJ",
      "Tab",
      "Digit1",
      "Digit2",
      "KeyT",
      "Digit6",
      "Digit7",
      "Digit8",
      "Digit9",
      "Digit0",
      "KeyM"
    ].includes(code);
  }
}
