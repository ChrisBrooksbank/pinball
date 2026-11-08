export type SurfaceType =
    'playfield' | 'wall' | 'rubber' | 'flipper' | 'bumper' | 'target' | 'plunger';

export interface SurfaceMaterial {
    /** Normal bounce coefficient: 0 = dead stop, 1 = perfectly elastic. */
    restitution: number;
    /** Coulomb friction coefficient for tangential contact. */
    friction: number;
    /** Rolling resistance as a fraction of speed lost per second while in contact. */
    rollingDamping: number;
}

export type Materials = Record<SurfaceType, SurfaceMaterial>;

const DEFAULTS: Materials = {
    playfield: { restitution: 0.1, friction: 0.15, rollingDamping: 0.05 },
    wall: { restitution: 0.5, friction: 0.2, rollingDamping: 0.05 },
    rubber: { restitution: 0.75, friction: 0.6, rollingDamping: 0.1 },
    flipper: { restitution: 0.4, friction: 0.5, rollingDamping: 0.1 },
    bumper: { restitution: 0.6, friction: 0.2, rollingDamping: 0.05 },
    plunger: { restitution: 0.2, friction: 0.3, rollingDamping: 0.05 },
    target: { restitution: 0.3, friction: 0.3, rollingDamping: 0.05 },
};

/** Fresh, mutable copy of the default materials so each world can be tuned independently. */
export function createMaterials(): Materials {
    const out = {} as Materials;
    for (const key of Object.keys(DEFAULTS) as SurfaceType[]) {
        out[key] = { ...DEFAULTS[key] };
    }
    return out;
}
