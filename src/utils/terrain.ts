export const TERRAIN_SIZE = 150;

export function terrainHeight(x: number, z: number) {
  const broad = Math.sin(x * 0.055) * Math.cos(z * 0.047) * 2.4;
  const small = Math.sin((x + z) * 0.13) * 0.55 + Math.cos((x - z) * 0.09) * 0.45;
  return broad + small - 1.4;
}

export function seededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function sampledPosition(seed: number, index: number, radius = 52): [number, number, number] {
  const random = seededRandom(seed * 101 + index * 271);
  const angle = random() * Math.PI * 2;
  const distance = 12 + random() * radius;
  const x = Math.cos(angle) * distance;
  const z = Math.sin(angle) * distance;
  return [x, terrainHeight(x, z) + 0.8, z];
}
