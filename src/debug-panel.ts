import type { Sandbox } from '@physics/sandbox';
import { createTuningParams } from '@physics/tuning';

/**
 * Hidden debug overlay with live tuning sliders and ball readout. Toggle with the backquote key.
 * `update` should be called once per rendered frame.
 */
export function createDebugPanel(sandbox: Sandbox): { update(): void } {
    const root = document.createElement('div');
    root.id = 'debug-panel';
    root.hidden = true;
    root.style.cssText =
        'position:fixed;top:8px;right:8px;z-index:10;padding:8px 10px;background:rgba(11,6,24,.85);' +
        'color:#35f0ff;font:12px monospace;border:1px solid #35f0ff;min-width:220px';

    const readout = document.createElement('pre');
    readout.style.cssText = 'margin:0 0 6px';
    root.appendChild(readout);

    for (const param of createTuningParams(sandbox)) {
        const label = document.createElement('label');
        label.style.display = 'block';
        const text = document.createElement('span');
        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(param.min);
        input.max = String(param.max);
        input.step = String(param.step);
        input.value = String(param.get());
        input.style.cssText = 'display:block;width:100%';
        const show = (): void => {
            text.textContent = `${param.label}: ${param.get().toFixed(2)}`;
        };
        input.addEventListener('input', () => {
            param.set(Number(input.value));
            show();
        });
        show();
        label.append(text, input);
        root.appendChild(label);
    }
    document.body.appendChild(root);

    window.addEventListener('keydown', e => {
        if (e.code === 'Backquote') root.hidden = !root.hidden;
    });

    return {
        update(): void {
            if (root.hidden) return;
            const b = sandbox.world.balls[0];
            readout.textContent = b
                ? `ball x ${b.pos.x.toFixed(3)} y ${b.pos.y.toFixed(3)}\n` +
                  `speed ${Math.hypot(b.vel.x, b.vel.y).toFixed(2)} m/s`
                : 'no ball';
        },
    };
}
