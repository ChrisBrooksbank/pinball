/** Events emitted by the physics simulation. Shared with the rules engine, which never imports physics. */
export type PhysicsEvent =
    | { type: 'bumperHit'; id: string; ballId: number; speed: number }
    | { type: 'targetHit'; id: string; ballId: number }
    | { type: 'spinnerSpin'; id: string; ballId: number; angularVelocity: number }
    | { type: 'slingshot'; id: string; ballId: number; speed: number }
    | { type: 'flipperHit'; id: string; ballId: number; speed: number }
    | { type: 'wallHit'; ballId: number; speed: number }
    | { type: 'laneEnter'; id: string; ballId: number }
    | { type: 'drain'; ballId: number }
    | { type: 'tilt' };
