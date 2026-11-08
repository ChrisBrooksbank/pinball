import type { FlipperConfig } from '../physics/flipper';
import { vec2 } from '../physics/vec2';
import type {
    DropTargetBankDef,
    LampDef,
    LaneDef,
    ScriptedPathDef,
    SlingshotDef,
    TableDef,
    TargetDef,
    WallDef,
} from './types';

/** The playfield is symmetric about this x; the plunger lane sits to its right. */
const MIRROR_X = 0.88;
const mx = (x: number): number => MIRROR_X - x;

const LANE_X = 0.93;
const PLUNGER_REST_Y = 1.9;
const BALL_RADIUS = 0.027;

const flipperBase = {
    length: 0.15,
    baseRadius: 0.03,
    tipRadius: 0.02,
    // Lowered from 40/20 so tip speed (omega x length) matches the pre-rescale feel.
    swingUpSpeed: 21,
    swingDownSpeed: 11,
};

const LEFT_FLIPPER: FlipperConfig = {
    ...flipperBase,
    pivot: vec2(0.23, 1.8),
    restAngle: 0.5,
    upAngle: -0.5,
};

const RIGHT_FLIPPER: FlipperConfig = {
    ...flipperBase,
    pivot: vec2(mx(0.23), 1.8),
    restAngle: Math.PI - 0.5,
    upAngle: Math.PI + 0.5,
};

/** Upper-playfield flipper (left button); feeds the bumper cluster and the right-hand shots. */
const UPPER_LEFT_FLIPPER: FlipperConfig = {
    ...flipperBase,
    pivot: vec2(0.09, 0.6),
    restAngle: 0.5,
    upAngle: -0.5,
};

/** x positions of the dividers that form the three top rollover lanes (A-B-C). */
const ROLLOVER_DIVIDERS = [0.17, 0.35, 0.53, 0.71];

/** Walls on the left half as [id, x1, y1, x2, y2]; mirrored to build the right half. */
const SIDE_WALLS: readonly (readonly [string, number, number, number, number])[] = [
    // Outlane/inlane divider and the slope that feeds the flipper.
    // Lane guide extended upward so the in/outlane channels read as distinct return lanes.
    ['guide-top', 0.14, 1.3, 0.14, 1.4],
    ['guide', 0.14, 1.4, 0.14, 1.58],
    ['guide-slope', 0.14, 1.58, 0.2, 1.77],
    // Slingshot housing (the kicking face is a separate slingshot element).
    ['sling-back', 0.26, 1.38, 0.26, 1.58],
    ['sling-base', 0.26, 1.58, 0.35, 1.58],
];

function buildWalls(): WallDef[] {
    const walls: WallDef[] = [
        // Left outer wall (outlane drains straight down) and plunger-lane walls.
        { id: 'wall-left', a: vec2(0.02, 0.51), b: vec2(0.02, 2) },
        { id: 'wall-lane-divider', a: vec2(0.86, 0.64), b: vec2(0.86, 2) },
        { id: 'wall-right', a: vec2(1.0, 0.51), b: vec2(1.0, 2) },
    ];
    for (const [id, x1, y1, x2, y2] of SIDE_WALLS) {
        walls.push({ id: `${id}-l`, a: vec2(x1, y1), b: vec2(x2, y2) });
        walls.push({ id: `${id}-r`, a: vec2(mx(x1), y1), b: vec2(mx(x2), y2) });
    }
    ROLLOVER_DIVIDERS.forEach((x, i) =>
        walls.push({ id: `rollover-divider-${i + 1}`, a: vec2(x, 0.19), b: vec2(x, 0.31) })
    );
    return walls;
}

const SLINGSHOTS: SlingshotDef[] = [
    { id: 'sling-left', a: vec2(0.26, 1.38), b: vec2(0.35, 1.58) },
    { id: 'sling-right', a: vec2(mx(0.26), 1.38), b: vec2(mx(0.35), 1.58) },
];

const TARGETS: TargetDef[] = [0, 1, 2].map(i => ({
    id: `target-${i + 1}`,
    a: vec2(0.072, 0.92 + i * 0.12),
    b: vec2(0.072, 1.0 + i * 0.12),
    lampId: `lamp-target-${i + 1}`,
}));

/** Mid-playfield drop-target banks (3 each), mirrored about the centre line. */
const DROP_BANKS: DropTargetBankDef[] = (['left', 'right'] as const).map(side => {
    const x = side === 'left' ? 0.2 : mx(0.2);
    return {
        id: `dropbank-${side}`,
        resetDelay: 1,
        targets: [0, 1, 2].map(i => ({
            id: `droptarget-${side}-${i + 1}`,
            a: vec2(x, 1.0 + i * 0.1),
            b: vec2(x, 1.08 + i * 0.1),
            lampId: `lamp-droptarget-${side}-${i + 1}`,
        })),
    };
});

const RAW_LANES: Omit<LaneDef, 'lampId'>[] = [
    { id: 'outlane-left', kind: 'outlane', a: vec2(0.02, 1.48), b: vec2(0.14, 1.48) },
    { id: 'inlane-left', kind: 'inlane', a: vec2(0.14, 1.48), b: vec2(0.26, 1.48) },
    { id: 'inlane-right', kind: 'inlane', a: vec2(mx(0.26), 1.48), b: vec2(mx(0.14), 1.48) },
    { id: 'outlane-right', kind: 'outlane', a: vec2(mx(0.14), 1.48), b: vec2(0.86, 1.48) },
    ...['a', 'b', 'c'].map((name, i) => ({
        id: `rollover-${name}`,
        kind: 'rollover' as const,
        a: vec2(ROLLOVER_DIVIDERS[i]!, 0.25),
        b: vec2(ROLLOVER_DIVIDERS[i + 1]!, 0.25),
    })),
];
const LANES: LaneDef[] = RAW_LANES.map(lane => ({ ...lane, lampId: `lamp-${lane.id}` }));

const PATHS: ScriptedPathDef[] = [
    {
        // Right orbit: up the right side, over the top, and back down the left side.
        id: 'orbit-right',
        kind: 'orbit',
        entry: { a: vec2(0.76, 0.9), b: vec2(0.85, 0.9) },
        entryDirection: vec2(0, -1),
        minSpeed: 1.5,
        points: [
            vec2(0.81, 0.9),
            vec2(0.8, 0.6),
            vec2(0.44, 0.1),
            vec2(0.08, 0.6),
            vec2(0.07, 0.86),
        ],
        speed: 3,
        exitSpeed: 1.5,
    },
    {
        // Left orbit: up the left side, over the top, and back down the right side.
        id: 'orbit-left',
        kind: 'orbit',
        entry: { a: vec2(0.03, 0.84), b: vec2(0.12, 0.84) },
        entryDirection: vec2(0, -1),
        minSpeed: 1.5,
        points: [
            vec2(0.07, 0.84),
            vec2(0.08, 0.6),
            vec2(0.44, 0.1),
            vec2(0.8, 0.6),
            vec2(0.82, 1.0),
        ],
        speed: 3,
        exitSpeed: 1.5,
    },
    {
        // Centre ramp: shot up the middle, delivered to the top of the playfield.
        id: 'ramp-centre',
        kind: 'ramp',
        entry: { a: vec2(0.36, 1.2), b: vec2(0.52, 1.2) },
        entryDirection: vec2(0, -1),
        minSpeed: 2,
        points: [vec2(0.44, 1.2), vec2(0.44, 0.8), vec2(0.44, 0.4)],
        speed: 2.5,
        exitSpeed: 0.8,
    },
];

const BUMPER_POSITIONS = [vec2(0.4, 0.62), vec2(0.62, 0.62), vec2(0.51, 0.8)];

const LAMPS: LampDef[] = [
    ...BUMPER_POSITIONS.map((p, i) => ({
        id: `lamp-bumper-${i + 1}`,
        pos: vec2(p.x, p.y + 0.09),
        color: '#ff2bd6',
    })),
    ...TARGETS.map((t, i) => ({
        id: `lamp-target-${i + 1}`,
        pos: vec2(0.14, (t.a.y + t.b.y) / 2),
        color: '#00f0ff',
    })),
    ...DROP_BANKS.flatMap(bank =>
        bank.targets.map(t => ({
            id: t.lampId!,
            pos: vec2(t.a.x + (t.a.x < MIRROR_X / 2 ? 0.07 : -0.07), (t.a.y + t.b.y) / 2),
            color: '#39ff14',
        }))
    ),
    ...LANES.map(lane => ({
        id: `lamp-${lane.id}`,
        pos: vec2((lane.a.x + lane.b.x) / 2, lane.a.y + 0.06),
        color: { inlane: '#ffe600', outlane: '#ff3b30', rollover: '#00f0ff' }[lane.kind],
    })),
];

/** The one original table: two lower flippers, an upper flipper, slingshots, 3 pop bumpers, drop banks, rollovers, a spinner. */
export const PLAYFIELD: TableDef = {
    name: 'Neon Orbit',
    bounds: { width: 1.04, height: 2.16 },
    ballRadius: BALL_RADIUS,
    walls: buildWalls(),
    // Top arch that turns a plunged ball toward the playfield.
    arcs: [
        {
            id: 'arch',
            center: vec2(0.51, 0.51),
            radius: 0.49,
            startAngle: Math.PI,
            sweepAngle: Math.PI,
        },
    ],
    flippers: [
        { id: 'flipper-left', side: 'left', config: LEFT_FLIPPER },
        { id: 'flipper-right', side: 'right', config: RIGHT_FLIPPER },
        { id: 'flipper-upper-left', side: 'left', level: 'upper', config: UPPER_LEFT_FLIPPER },
    ],
    bumpers: BUMPER_POSITIONS.map((center, i) => ({
        id: `bumper-${i + 1}`,
        center,
        radius: 0.07,
        lampId: `lamp-bumper-${i + 1}`,
    })),
    slingshots: SLINGSHOTS,
    targets: TARGETS,
    dropBanks: DROP_BANKS,
    spinners: [{ id: 'spinner-1', a: vec2(0.78, 0.6), b: vec2(0.78, 0.72) }],
    paths: PATHS,
    lanes: LANES,
    plungerLane: {
        id: 'plunger-lane',
        plunger: {
            x: LANE_X,
            restY: PLUNGER_REST_Y,
            halfWidth: 0.06,
            maxPull: 0.16,
            pullSpeed: 0.3,
            maxReleaseSpeed: 5,
        },
        ballStart: vec2(LANE_X, PLUNGER_REST_Y - BALL_RADIUS - 1e-4),
    },
    drain: { id: 'drain', y: 2.1 },
    lamps: LAMPS,
};
