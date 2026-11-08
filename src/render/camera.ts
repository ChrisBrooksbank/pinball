import type { PerspectiveCamera } from 'three';

interface CameraFraming {
    readonly fov: number;
    readonly position: readonly [number, number, number];
    readonly target: readonly [number, number, number];
}

interface FramingTable {
    readonly width: number;
    readonly height: number;
}

const FOV = 45;
/** Elevation above the horizon (degrees): steeper (more top-down) in portrait, shallower in landscape. */
const PITCH_PORTRAIT = 68;
const PITCH_LANDSCAPE = 55;
const MARGIN = 1.08;
/** Backglass rises above the far edge; include it in the vertical extent. */
const BACKGLASS_ALLOWANCE = 0.12;

/** Fixed camera framing that fits the whole table (and backglass) for any viewport aspect. */
export function computeCameraFraming(aspect: number, table: FramingTable): CameraFraming {
    const portrait = aspect < 1;
    const pitch = ((portrait ? PITCH_PORTRAIT : PITCH_LANDSCAPE) * Math.PI) / 180;
    const tanHalf = Math.tan((FOV * Math.PI) / 360);

    const vExtent = table.height * Math.sin(pitch) + BACKGLASS_ALLOWANCE * Math.cos(pitch) * 2;
    const hExtent = table.width;
    const dist =
        Math.max(vExtent / 2 / tanHalf, hExtent / 2 / (tanHalf * aspect)) * MARGIN * 1.1 +
        table.height * 0.25 * Math.cos(pitch);

    // Aim slightly toward the far end so the backglass is included.
    const targetZ = -table.height * 0.03;
    return {
        fov: FOV,
        target: [0, 0, targetZ],
        position: [0, Math.sin(pitch) * dist, targetZ + Math.cos(pitch) * dist],
    };
}

export function applyCameraFraming(
    camera: PerspectiveCamera,
    aspect: number,
    table: FramingTable
): void {
    const f = computeCameraFraming(aspect, table);
    camera.fov = f.fov;
    camera.aspect = aspect;
    camera.position.set(...f.position);
    camera.lookAt(...f.target);
    camera.updateProjectionMatrix();
}
