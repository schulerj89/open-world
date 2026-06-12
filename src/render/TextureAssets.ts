import * as THREE from "three";

type TextureSet = {
  grassColor: THREE.Texture;
  foliageColor: THREE.Texture;
  foliageOpacity: THREE.Texture;
  rockColor: THREE.Texture;
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
    rockColor: loadRepeating(loader, "/assets/textures/rock_color.jpg", 7)
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
