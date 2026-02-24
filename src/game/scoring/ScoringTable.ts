type FlagEntry = { flag: string; points: number };
type AnyOfEntry = { anyOf: string[]; points: number };
type ScoreEntry = FlagEntry | AnyOfEntry;

const SCORING_TABLE: ScoreEntry[] = [
    // ── Act 1 — Forest & Village (100 pts) ──
    { flag: 'rusty-key-taken', points: 5 },
    { flag: 'door-unlocked', points: 10 },
    { flag: 'bottle-safe', points: 10 },
    { anyOf: [
        'puzzle-solved:combine-stick-mushroom',
        'puzzle-solved:combine-mushroom-stick',
        'puzzle-solved:use-stick-on-mushroom',
    ], points: 15 },
    { flag: 'riddle_answered', points: 15 },
    { flag: 'toll_paid', points: 10 },
    { flag: 'seen_castle', points: 10 },
    { flag: 'knows_about_curse', points: 10 },
    { flag: 'crystal_shown_to_guards', points: 15 },

    // ── Act 2 — Screaming Caverns (200 pts) ──
    { flag: 'form_filled', points: 10 },
    { flag: 'registered_with_clerk', points: 15 },
    { flag: 'vip_stamped', points: 15 },
    { flag: 'clerk-satisfied', points: 20 },
    { flag: 'knows_mushroom_pattern', points: 10 },
    { flag: 'mushroom_pattern_solved', points: 15 },
    { flag: 'knows_guardian_answers', points: 10 },
    { flag: 'guardian-defeated', points: 25 },
    { flag: 'echo_puzzle_solved', points: 15 },
    { flag: 'crystal_barrier_down', points: 15 },
    { flag: 'crystal_taken', points: 15 },
    { flag: 'boat_repaired', points: 10 },
    { flag: 'forge_lit', points: 10 },
    { flag: 'seal_repaired', points: 15 },

    // ── Act 3 — Castle & Endgame (200 pts) ──
    { flag: 'wizard_explored', points: 10 },
    { flag: 'found_curse_contract', points: 15 },
    { flag: 'mirror_truth_revealed', points: 10 },
    { flag: 'rats_caught', points: 5 },
    { flag: 'cook_befriended', points: 5 },
    { flag: 'clock-fixed', points: 20 },
    { flag: 'chalice-filled', points: 5 },
    { flag: 'spirit-brew-made', points: 15 },
    { flag: 'met_ghost_king', points: 10 },
    { flag: 'ghost_approved_decree', points: 10 },
    { flag: 'decree-sealed', points: 15 },
    { flag: 'treasury_opened', points: 10 },
    { anyOf: ['clerk_remembers', 'clerk_outwitted'], points: 20 },
    { flag: 'rite_prepared', points: 15 },
    { flag: 'curse-broken', points: 35 },
];

/** Maximum achievable score (500). */
export const MAX_SCORE = 500;

/**
 * Calculate the current score from game state flags.
 * Pure function — no side effects.
 */
export function calculateScore(flags: Record<string, boolean | string>): number {
    let score = 0;
    for (const entry of SCORING_TABLE) {
        if ('flag' in entry) {
            if (flags[entry.flag]) score += entry.points;
        } else {
            if (entry.anyOf.some(f => !!flags[f])) score += entry.points;
        }
    }
    return score;
}
