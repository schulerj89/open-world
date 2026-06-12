import * as THREE from "three";

type TextureSet = {
  grassColor: THREE.Texture;
  foliageColor: THREE.Texture;
  foliageOpacity: THREE.Texture;
  rockColor: THREE.Texture;
  townRoad: THREE.Texture;
  townRoof: THREE.Texture;
  townStone: THREE.Texture;
  townWall: THREE.Texture;
  townWood: THREE.Texture;
};

let assets: TextureSet | undefined;

export function getTextureAssets(): TextureSet {
  if (assets) {
    return assets;
  }

  const loader = new THREE.TextureLoader();
  assets = {
    grassColor: loadRepeating(loader, "/assets/textures/grass_color.jpg", 10),
    foliageColor: loadRepeating(loader, "/assets/textures/foliage_color.jpg", 1),
    foliageOpacity: loadRepeating(loader, "/assets/textures/foliage_opacity.jpg", 1),
    rockColor: loadRepeating(loader, "/assets/textures/rock_color.jpg", 7),
    townRoad: createPatternTexture(["#bda875", "#d0bc88", "#97845d", "#7f735b"], 8),
    townRoof: createPatternTexture(["#874a35", "#a95d42", "#5f3028", "#c27a52"], 5),
    townStone: createPatternTexture(["#9c9688", "#b4ab99", "#746f67", "#d0c5ae"], 7),
    townWall: createPatternTexture(["#b8794f", "#cf9263", "#8d5b3d", "#e1a878"], 4),
    townWood: createPatternTexture(["#735036", "#8b6040", "#4b3428", "#a7744a"], 3)
  };

  return assets;
}

function loadRepeating(loader: THREE.TextureLoader, url: string, repeat: number): THREE.Texture {
  const texture = loader.load(url);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createPatternTexture(colors: [string, string, string, string] | string[], repeat: number): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.Texture();
  }

  context.fillStyle = colors[0];
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 16) {
    for (let x = 0; x < canvas.width; x += 24) {
      const offset = y % 32 === 0 ? 0 : 12;
      context.fillStyle = colors[(x / 24 + y / 16) % 2 === 0 ? 1 : 0];
      context.fillRect(x + offset, y, 22, 14);
      context.strokeStyle = colors[2];
      context.lineWidth = 1;
      context.strokeRect(x + offset + 0.5, y + 0.5, 21, 13);
    }
  }

  for (let i = 0; i < 90; i += 1) {
    const shade = i % 3 === 0 ? colors[2] : colors[3];
    context.fillStyle = shade;
    context.globalAlpha = i % 3 === 0 ? 0.16 : 0.12;
    context.fillRect((i * 37) % canvas.width, (i * 19) % canvas.height, 2 + (i % 5), 1 + (i % 3));
  }
  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
