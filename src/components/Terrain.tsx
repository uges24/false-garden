import * as THREE from 'three/webgpu'
import { useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import {
    Fn,
    mix,
    vec3,
    vec2,
    vec4,
    float,
    positionLocal,
    modelWorldMatrix,
    step,
    length,
    smoothstep,
    mx_fractal_noise_float,
} from 'three/tsl'
import { DEFAULT_GRASS_AREA_SIZE } from './grass/core/config'
import { getTerrainHeight } from '../core/shaders/terrainHelpers'
import { uTerrainAmp, uTerrainFreq, uTerrainSeed, uTerrainColor, uTime } from '../core/shaders/uniforms'
import { useGridSnapping } from '../core/utils/gridSnapping'


export function Terrain({
    grassAreaSize = DEFAULT_GRASS_AREA_SIZE,
    cullCamera
}: {
    grassAreaSize?: number
    cullCamera?: THREE.PerspectiveCamera
}) {
    const { camera: defaultCamera } = useThree()
    const cameraToUse = cullCamera || defaultCamera
    
    const meshRef = useRef<THREE.Mesh>(null)
    
    // Use grid snapping hook
    useGridSnapping({
        camera: cameraToUse,
        grassAreaSize,
        onSnap: ({ snappedX, snappedZ }) => {
            if (meshRef.current) {
                meshRef.current.position.set(snappedX, 0, snappedZ)
                meshRef.current.updateMatrixWorld(true)
            }
        },
    })

    // Create material with terrain functions (uses global uniforms from core/shaders/uniforms)
    const material = useMemo(() => {
        const terrainHeight = getTerrainHeight(uTerrainAmp, uTerrainFreq, uTerrainSeed)

        const mat = new THREE.MeshBasicNodeMaterial()
        mat.side = THREE.DoubleSide
        mat.colorNode = Fn(() => {
            const dist = length(positionLocal.xy)
            const radius = float(grassAreaSize * 0.5)

            const centerFade = float(1.0).sub(
                smoothstep(radius.mul(0.3), radius, dist)
            )

            const causticUv = positionLocal.xy.mul(0.18)
            const causticA = mx_fractal_noise_float(
                causticUv.add(vec2(uTime.mul(0.08), uTime.mul(-0.06)))
            ).add(1.0).mul(0.5)
            const causticB = mx_fractal_noise_float(
                causticUv.mul(1.9).add(vec2(uTime.mul(-0.12), uTime.mul(0.1)))
            ).add(1.0).mul(0.5)

            const shimmerMask = smoothstep(
                float(0.58),
                float(0.95),
                causticA.mul(causticB).add(causticA.mul(0.25))
            ).mul(centerFade)

            const coolShimmer = vec3(0.12, 0.36, 0.34).mul(shimmerMask.mul(0.22))
            const warmShimmer = vec3(0.24, 0.2, 0.12).mul(shimmerMask.mul(0.07))
            const shimmerTint = mix(coolShimmer, warmShimmer, causticA)

            return vec4(uTerrainColor.add(shimmerTint), float(1.0))
        })()
        mat.alphaTest = 0.5

        mat.positionNode = Fn(() => {
            const localPos = positionLocal
            const worldPos = modelWorldMatrix.mul(vec4(localPos, float(1.0))).xyz
            const h = terrainHeight(worldPos.xz)
            const displacedPos = vec3(localPos.x, localPos.y, localPos.z.add(h))
            return vec4(displacedPos, float(1.0))
        })()

        mat.opacityNode = Fn(() => {
            const dist = length(positionLocal.xy)
            const radius = float(grassAreaSize * 0.5)
            return float(1.0).sub(step(radius, dist))
        })()

        return mat
    }, [])

    return (
        // High segment count is needed for smooth FBM terrain to match grass density
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[grassAreaSize, grassAreaSize, 128, 128]} />
            <primitive object={material} />
        </mesh>
    )
}

