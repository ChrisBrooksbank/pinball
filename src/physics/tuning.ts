import { createMaterials, type SurfaceType } from './materials';
import type { Sandbox } from './sandbox';

interface TuningParam {
    id: string;
    label: string;
    min: number;
    max: number;
    step: number;
    get(): number;
    set(value: number): void;
}

/**
 * Live-tunable feel parameters for a sandbox. Restitution and friction are scales applied to the
 * default per-surface materials (restitution clamped to 1), so one slider moves every surface.
 */
export function createTuningParams(sandbox: Sandbox): TuningParam[] {
    const { world } = sandbox;
    const defaults = createMaterials();
    const surfaces = Object.keys(defaults) as SurfaceType[];
    let restitutionScale = 1;
    let frictionScale = 1;

    return [
        {
            id: 'flipperStrength',
            label: 'Flipper strength (rad/s)',
            min: 10,
            max: 80,
            step: 1,
            get: () => sandbox.left.config.swingUpSpeed,
            set: v => {
                sandbox.left.config.swingUpSpeed = v;
                sandbox.right.config.swingUpSpeed = v;
            },
        },
        {
            id: 'restitution',
            label: 'Restitution scale',
            min: 0,
            max: 2,
            step: 0.05,
            get: () => restitutionScale,
            set: v => {
                restitutionScale = v;
                for (const s of surfaces) {
                    world.materials[s].restitution = Math.min(1, defaults[s].restitution * v);
                }
            },
        },
        {
            id: 'friction',
            label: 'Friction scale',
            min: 0,
            max: 3,
            step: 0.05,
            get: () => frictionScale,
            set: v => {
                frictionScale = v;
                for (const s of surfaces) {
                    world.materials[s].friction = defaults[s].friction * v;
                }
            },
        },
        {
            id: 'tilt',
            label: 'Tilt angle (deg)',
            min: 1,
            max: 15,
            step: 0.1,
            get: () => world.config.tiltDegrees,
            set: v => {
                world.config.tiltDegrees = v;
            },
        },
    ];
}
