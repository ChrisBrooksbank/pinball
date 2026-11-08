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

/** Landscape view shows this fraction of the table length and scrolls vertically with the ball. */
const LANDSCAPE_VISIBLE = 0.55;

/**
 * Camera framing for any viewport aspect. Portrait fits the whole table (and backglass).
 * Landscape zooms in and centres on `focusZ` (world z of the ball) when given, clamped to the table.
 */
export function computeCameraFraming(
    aspect: number,
    table: FramingTable,
    focusZ?: number
): CameraFraming {
    const portrait = aspect < 1;
    if (!portrait && focusZ !== undefined) {
        const pitch = (PITCH_LANDSCAPE * Math.PI) / 180;
        const tanHalf = Math.tan((FOV * Math.PI) / 360);
        const span = table.height * LANDSCAPE_VISIBLE;
        const dist =
            Math.max((span * Math.sin(pitch)) / 2 / tanHalf, table.width / 2 / (tanHalf * aspect)) *
                MARGIN *
                1.1 +
            span * 0.25 * Math.cos(pitch);
        const half = (table.height - span) / 2;
        const targetZ = Math.max(-half, Math.min(half, focusZ));
        return {
            fov: FOV,
            target: [0, 0, targetZ],
            position: [0, Math.sin(pitch) * dist, targetZ + Math.cos(pitch) * dist],
        };
    }
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
    table: FramingTable,
    focusZ?: number
): void {
    const f = computeCameraFraming(aspect, table, focusZ);
    camera.fov = f.fov;
    camera.aspect = aspect;
    camera.position.set(...f.position);
    camera.lookAt(...f.target);
    camera.updateProjectionMatrix();
}
