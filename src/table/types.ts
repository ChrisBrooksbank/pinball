import type { FlipperConfig } from '../physics/flipper';
import type { PlungerConfig } from '../physics/plunger';
import type { SurfaceType } from '../physics/materials';
import type { Vec2 } from '../physics/vec2';

/** Typed, data-only description of a table; consumed by physics (colliders) and render (meshes). */
export interface WallDef {
    id: string;
    a: Vec2;
    b: Vec2;
    surface?: SurfaceType;
}

export interface ArcDef {
    id: string;
    center: Vec2;
    radius: number;
    startAngle: number;
    sweepAngle: number;
    surface?: SurfaceType;
}

export interface FlipperDef {
    id: string;
    side: 'left' | 'right';
    /** Playfield level; omitted means the lower playfield. Upper flippers share the side's button. */
    level?: 'lower' | 'upper';
    config: FlipperConfig;
}

export interface BumperDef {
    id: string;
    center: Vec2;
    radius: number;
    kick?: number;
    lampId?: string;
}

export interface SlingshotDef {
    id: string;
    a: Vec2;
    b: Vec2;
    kick?: number;
}

export interface TargetDef {
    id: string;
    a: Vec2;
    b: Vec2;
    lampId?: string;
}

/** A bank of drop targets: a hit drops a target; clearing the bank resets all after a delay. */
export interface DropTargetBankDef {
    id: string;
    targets: { id: string; a: Vec2; b: Vec2; lampId?: string }[];
    /** Seconds after the bank is cleared before it resets (default 1). */
    resetDelay?: number;
}

/** A kickout saucer (hole): captures a slow ball until the rules eject it. */
export interface SaucerDef {
    id: string;
    center: Vec2;
    radius: number;
    lampId?: string;
}

export interface SpinnerDef {
    id: string;
    a: Vec2;
    b: Vec2;
}

/** A lane (inlane, outlane, top rollover) detected by a trigger region the ball passes through. */
export interface LaneDef {
    id: string;
    kind: 'inlane' | 'outlane' | 'rollover';
    a: Vec2;
    b: Vec2;
    lampId?: string;
}

/**
 * A scripted ball path (orbit or ramp). A ball crossing the entry trigger fast enough, in the
 * entry direction, is carried along `points` at `speed` ignoring playfield collisions, then
 * released from the last point with `exitSpeed` along the final path segment.
 */
export interface ScriptedPathDef {
    id: string;
    kind: 'orbit' | 'ramp';
    /** Entry trigger segment. */
    entry: { a: Vec2; b: Vec2 };
    /** Ball must be moving with a positive component along this direction to enter. */
    entryDirection: Vec2;
    /** Minimum ball speed (m/s) to enter. */
    minSpeed: number;
    /** Path waypoints (at least two); the ball is carried along the polyline. */
    points: Vec2[];
    /** Travel speed along the path (m/s). */
    speed: number;
    /** Speed (m/s) at which the ball leaves the last point. */
    exitSpeed: number;
}

export interface PlungerLaneDef {
    id: string;
    plunger: PlungerConfig;
    /** Where a fresh ball is placed on the plunger. */
    ballStart: Vec2;
}

/** Balls whose centre passes below `y` have drained. */
export interface DrainDef {
    id: string;
    y: number;
}

/** An insert light, controllable by id. */
export interface LampDef {
    id: string;
    pos: Vec2;
    color: string;
}

export interface TableDef {
    name: string;
    /** Playfield extents in metres. */
    bounds: { width: number; height: number };
    ballRadius: number;
    walls: WallDef[];
    arcs: ArcDef[];
    flippers: FlipperDef[];
    bumpers: BumperDef[];
    slingshots: SlingshotDef[];
    targets: TargetDef[];
    spinners: SpinnerDef[];
    dropBanks?: DropTargetBankDef[];
    saucers?: SaucerDef[];
    paths: ScriptedPathDef[];
    lanes: LaneDef[];
    plungerLane: PlungerLaneDef;
    drain: DrainDef;
    lamps: LampDef[];
}
