import * as THREE from 'three';
import type { WorldMode } from '../store/worldStore';

export const worldThemes: Record<
  WorldMode,
  {
    background: string;
    fog: string;
    fogNear: number;
    fogFar: number;
    sun: string;
    sunCore: string;
    grassA: string;
    grassB: string;
    grassTip: string;
    marbleGlow: string;
    beam: string;
    ambient: number;
    directional: number;
    snake: number;
    bloom: number;
  }
> = {
  'Golden Day': {
    background: '#092c2b',
    fog: '#0c4338',
    fogNear: 8,
    fogFar: 74,
    sun: '#ffc34f',
    sunCore: '#fff1a8',
    grassA: '#045b47',
    grassB: '#0aa37e',
    grassTip: '#8debc7',
    marbleGlow: '#6ff6ff',
    beam: '#52f5ff',
    ambient: 0.48,
    directional: 2.8,
    snake: 0.3,
    bloom: 0.65,
  },
  'Blood Sunset': {
    background: '#210d18',
    fog: '#4d1726',
    fogNear: 7,
    fogFar: 66,
    sun: '#ff7a2f',
    sunCore: '#ffd27a',
    grassA: '#063b37',
    grassB: '#0c7b63',
    grassTip: '#f3a75a',
    marbleGlow: '#ff68d4',
    beam: '#a75cff',
    ambient: 0.32,
    directional: 1.7,
    snake: 0.55,
    bloom: 0.9,
  },
  'Deep Night': {
    background: '#02091c',
    fog: '#03152d',
    fogNear: 6,
    fogFar: 58,
    sun: '#6d78ff',
    sunCore: '#c6f7ff',
    grassA: '#021f25',
    grassB: '#035957',
    grassTip: '#5ef4ff',
    marbleGlow: '#b86dff',
    beam: '#45eaff',
    ambient: 0.18,
    directional: 0.8,
    snake: 1,
    bloom: 1.15,
  },
  Eclipse: {
    background: '#010207',
    fog: '#080b18',
    fogNear: 5,
    fogFar: 48,
    sun: '#1a1322',
    sunCore: '#f6c455',
    grassA: '#011b19',
    grassB: '#044541',
    grassTip: '#9ffff1',
    marbleGlow: '#8b5cff',
    beam: '#7ff7ff',
    ambient: 0.12,
    directional: 0.45,
    snake: 1.25,
    bloom: 1.35,
  },
};

export function colorFor(mode: WorldMode, key: keyof (typeof worldThemes)['Golden Day']) {
  return new THREE.Color(worldThemes[mode][key] as string);
}
