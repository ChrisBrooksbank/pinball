import { formatScore } from '@render/dmd';

interface HudState {
    phase: 'attract' | 'plunger' | 'play' | 'bonus' | 'gameOver';
    score: number;
    ball: number;
    message: string;
    muted: boolean;
}

interface Hud {
    update(state: HudState): void;
    /** Show the initials entry card, or hide it with `null`. */
    showEntry(card: { score: number; initials: string } | null): void;
}

const BALLS_PER_GAME = 3;

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    parent: HTMLElement,
    text = ''
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    parent.appendChild(node);
    return node;
}

/** Styled heads-up display: score and ball pips, message ticker, title card and touch hints. */
export function createHud(onMute: () => void): Hud {
    const root = el('div', 'hud', document.body);
    const top = el('div', 'hud-top', root);
    const scoreBox = el('div', 'hud-score', top);
    el('span', 'hud-label', scoreBox, 'SCORE');
    const score = el('span', 'hud-value', scoreBox, '0');
    const ballBox = el('div', 'hud-balls', top);
    el('span', 'hud-label', ballBox, 'BALL');
    const pips = Array.from({ length: BALLS_PER_GAME }, () => el('i', 'hud-pip', ballBox));
    const mute = el('button', 'hud-mute', top, 'SOUND ON');
    mute.type = 'button';
    mute.addEventListener('click', onMute);
    mute.addEventListener('pointerdown', e => e.stopPropagation());
    const message = el('div', 'hud-message', root);

    const title = el('div', 'hud-title', root);
    el('h1', '', title, 'NEON KNIGHT');
    el('p', 'hud-prompt', title, 'PRESS START');
    const help = el('p', 'hud-help', title);
    help.innerHTML =
        '<b>Z</b> / <b>/</b> flippers &nbsp; <b>SPACE</b> plunger &nbsp; <b>ENTER</b> start ' +
        '&nbsp; <b>M</b> mute<span class="hud-touch-help"><br />Touch: tap lower halves to flip, ' +
        'top strip to start / plunge</span>';

    const zones = el('div', 'hud-zones', root);
    el('span', '', zones, 'LEFT FLIPPER');
    el('span', '', zones, 'RIGHT FLIPPER');

    const entry = el('div', 'hud-entry', root);

    return {
        update(state) {
            const attract = state.phase === 'attract';
            score.textContent = formatScore(state.score);
            pips.forEach((pip, i) => {
                const mark = i + 1 === state.ball ? ' on' : i < state.ball ? ' used' : '';
                pip.className = `hud-pip${mark}`;
            });
            mute.textContent = state.muted ? 'SOUND OFF' : 'SOUND ON';
            title.style.display = attract ? 'flex' : 'none';
            top.style.visibility = attract ? 'hidden' : 'visible';
            zones.style.opacity = attract ? '0' : '';
            message.textContent = attract ? '' : state.message;
            message.style.opacity = !attract && state.message ? '1' : '0';
        },
        showEntry(card) {
            entry.style.display = card ? 'flex' : 'none';
            if (!card) return;
            entry.replaceChildren();
            el('h2', '', entry, 'NEW HIGH SCORE');
            el('div', 'hud-entry-score', entry, formatScore(card.score));
            el('div', 'hud-entry-initials', entry, card.initials);
            el('p', '', entry, 'FLIPPERS: CHANGE   START: OK');
        },
    };
}
