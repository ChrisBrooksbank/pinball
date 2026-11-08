import type { FlipperConfig } from '../physics/flipper';
import { vec2 } from '../physics/vec2';
import type {
    LampDef,
    LaneDef,
    ScriptedPathDef,
    SlingshotDef,
    TableDef,
    TargetDef,
    WallDef,
} from './types';

/** The playfield is symmetric about this x; the plunger lane sits to its right. */
const MIRROR_X = 0.44;
const mx = (x: number): number => MIRROR_X - x;

const LANE_X = 0.465;
const PLUNGER_REST_Y = 0.95;
const BALL_RADIUS = 0.027;

const flipperBase = {
    length: 0.08,
    baseRadius: 0.015,
    tipRadius: 0.009,
    swingUpSpeed: 40,
    swingDownSpeed: 20,
};

const LEFT_FLIPPER: FlipperConfig = {
    ...flipperBase,
    pivot: vec2(0.11, 0.9),
    restAngle: 0.5,
    upAngle: -0.5,
};

const RIGHT_FLIPPER: FlipperConfig = {
    ...flipperBase,
    pivot: vec2(mx(0.11), 0.9),
    restAngle: Math.PI - 0.5,
    upAngle: Math.PI + 0.5,
};

/** Walls on the left half as [id, x1, y1, x2, y2]; mirrored to build the right half. */
const SIDE_WALLS: readonly (readonly [string, number, number, number, number])[] = [
    // Outlane/inlane divider and the slope that feeds the flipper.
    ['guide', 0.07, 0.7, 0.07, 0.79],
    ['guide-slope', 0.07, 0.79, 0.1, 0.885],
    // Slingshot housing (the kicking face is a separate slingshot element).
    ['sling-back', 0.13, 0.69, 0.13, 0.79],
    ['sling-base', 0.13, 0.79, 0.175, 0.79],
];

function buildWalls(): WallDef[] {
    const walls: WallDef[] = [
        // Left outer wall (outlane drains straight down) and plunger-lane walls.
        { id: 'wall-left', a: vec2(0.01, 0.255), b: vec2(0.01, 1) },
        { id: 'wall-lane-divider', a: vec2(0.43, 0.32), b: vec2(0.43, 1) },
        { id: 'wall-right', a: vec2(0.5, 0.255), b: vec2(0.5, 1) },
    ];
    for (const [id, x1, y1, x2, y2] of SIDE_WALLS) {
        walls.push({ id: `${id}-l`, a: vec2(x1, y1), b: vec2(x2, y2) });
        walls.push({ id: `${id}-r`, a: vec2(mx(x1), y1), b: vec2(mx(x2), y2) });
    }
    return walls;
}

const SLINGSHOTS: SlingshotDef[] = [
    { id: 'sling-left', a: vec2(0.13, 0.69), b: vec2(0.175, 0.79) },
    { id: 'sling-right', a: vec2(mx(0.13), 0.69), b: vec2(mx(0.175), 0.79) },
];

const TARGETS: TargetDef[] = [0, 1, 2].map(i => ({
    id: `target-${i + 1}`,
    a: vec2(0.036, 0.46 + i * 0.06),
    b: vec2(0.036, 0.5 + i * 0.06),
    lampId: `lamp-target-${i + 1}`,
}));

const RAW_LANES: Omit<LaneDef, 'lampId'>[] = [
    { id: 'outlane-left', kind: 'outlane', a: vec2(0.01, 0.74), b: vec2(0.07, 0.74) },
    { id: 'inlane-left', kind: 'inlane', a: vec2(0.07, 0.74), b: vec2(0.13, 0.74) },
    { id: 'inlane-right', kind: 'inlane', a: vec2(mx(0.13), 0.74), b: vec2(mx(0.07), 0.74) },
    { id: 'outlane-right', kind: 'outlane', a: vec2(mx(0.07), 0.74), b: vec2(0.43, 0.74) },
];
const LANES: LaneDef[] = RAW_LANES.map(lane => ({ ...lane, lampId: `lamp-${lane.id}` }));

const PATHS: ScriptedPathDef[] = [
    {
        // Left orbit: up the left side, over the top, and back down the right side.
        id: 'orbit-left',
        kind: 'orbit',
        entry: { a: vec2(0.015, 0.42), b: vec2(0.06, 0.42) },
        entryDirection: vec2(0, -1),
        minSpeed: 1.5,
        points: [
            vec2(0.035, 0.42),
            vec2(0.04, 0.3),
            vec2(0.22, 0.05),
            vec2(0.4, 0.3),
            vec2(0.41, 0.5),
        ],
        speed: 3,
        exitSpeed: 1.5,
    },
    {
        // Centre ramp: shot up the middle, delivered to the top of the playfield.
        id: 'ramp-centre',
        kind: 'ramp',
        entry: { a: vec2(0.18, 0.6), b: vec2(0.26, 0.6) },
        entryDirection: vec2(0, -1),
        minSpeed: 2,
        points: [vec2(0.22, 0.6), vec2(0.22, 0.4), vec2(0.22, 0.2)],
        speed: 2.5,
        exitSpeed: 0.8,
    },
];

const BUMPER_POSITIONS = [vec2(0.15, 0.36), vec2(0.29, 0.36), vec2(0.22, 0.45)];

const LAMPS: LampDef[] = [
    ...BUMPER_POSITIONS.map((p, i) => ({
        id: `lamp-bumper-${i + 1}`,
        pos: vec2(p.x, p.y + 0.045),
        color: '#ff2bd6',
    })),
    ...TARGETS.map((t, i) => ({
        id: `lamp-target-${i + 1}`,
        pos: vec2(0.07, (t.a.y + t.b.y) / 2),
        color: '#00f0ff',
    })),
    ...LANES.map(lane => ({
        id: `lamp-${lane.id}`,
        pos: vec2((lane.a.x + lane.b.x) / 2, lane.a.y + 0.03),
        color: lane.kind === 'inlane' ? '#ffe600' : '#ff3b30',
    })),
];

/** The one original table: two flippers, slingshots, 3 pop bumpers, a target bank, a spinner. */
export const PLAYFIELD: TableDef = {
    name: 'Neon Orbit',
    bounds: { width: 0.52, height: 1 },
    ballRadius: BALL_RADIUS,
    walls: buildWalls(),
    // Top arch that turns a plunged ball toward the playfield.
    arcs: [
        {
            id: 'arch',
            center: vec2(0.255, 0.255),
            radius: 0.245,
            startAngle: Math.PI,
            sweepAngle: Math.PI,
        },
    ],
    flippers: [
        { id: 'flipper-left', side: 'left', config: LEFT_FLIPPER },
        { id: 'flipper-right', side: 'right', config: RIGHT_FLIPPER },
    ],
    bumpers: BUMPER_POSITIONS.map((center, i) => ({
        id: `bumper-${i + 1}`,
        center,
        radius: 0.03,
        lampId: `lamp-bumper-${i + 1}`,
    })),
    slingshots: SLINGSHOTS,
    targets: TARGETS,
    spinners: [{ id: 'spinner-1', a: vec2(0.36, 0.4), b: vec2(0.36, 0.46) }],
    paths: PATHS,
    lanes: LANES,
    plungerLane: {
        id: 'plunger-lane',
        plunger: {
            x: LANE_X,
            restY: PLUNGER_REST_Y,
            halfWidth: 0.03,
            maxPull: 0.08,
            pullSpeed: 0.15,
            maxReleaseSpeed: 5,
        },
        ballStart: vec2(LANE_X, PLUNGER_REST_Y - BALL_RADIUS - 1e-4),
    },
    drain: { id: 'drain', y: 1.02 },
    lamps: LAMPS,
};
