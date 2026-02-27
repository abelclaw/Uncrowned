import type { Verb } from '../types/GameAction.ts';

/**
 * Defines a canonical verb with its synonyms and sentence pattern regexes.
 * Patterns are ordered most-specific-first; the parser tests them in order.
 */
export interface VerbDefinition {
    /** Internal canonical verb name */
    canonical: Verb;
    /** All words that map to this verb (includes the canonical name) */
    synonyms: string[];
    /**
     * Regex patterns for matching sentences with this verb.
     * Capture groups extract noun phrases:
     *   - Group 1 = subject noun
     *   - Group 2 = target noun (for two-noun commands)
     * Patterns are tested in order; first match wins.
     */
    patterns: RegExp[];
}

/**
 * The verb synonym table defines all recognized verbs, their synonyms,
 * and regex patterns for extracting noun phrases from player input.
 *
 * Design notes:
 * - Patterns are case-insensitive (the /i flag)
 * - More specific patterns come first to avoid greedy matching
 * - "use X on Y" patterns capture both subject and target
 * - Bare verb patterns (no noun) come last
 */
export const VERB_TABLE: VerbDefinition[] = [
    // Inventory must come before look since "check" is a synonym for both
    {
        canonical: 'inventory',
        synonyms: ['inventory', 'i', 'items', 'bag', 'pockets'],
        patterns: [
            /^(?:inventory|items|bag|pockets|i)$/i,
            /^(?:check|show|view)\s+(?:my\s+)?(?:inventory|items|bag|pockets)$/i,
        ],
    },
    {
        canonical: 'look',
        synonyms: ['look', 'examine', 'inspect', 'check', 'study', 'read', 'search', 'survey', 'scan', 'sniff', 'smell', 'listen', 'observe', 'watch', 'peer', 'describe', 'l', 'x'],
        patterns: [
            /^(?:look|l)\s+(?:around|here|room)$/i,
            // Bare idioms: "take a look around", "have a look" (must be before capture-group pattern)
            /^(?:take|have)\s+a\s+(?:look|peek|gander)(?:\s+(?:around|here|room))?$/i,
            // Phrase idioms: "take a look at X", "have a peek at X"
            /^(?:take|have)\s+a\s+(?:look|peek|gander)\s+(?:at\s+)?(.+)$/i,
            // Natural language queries: "what is X", "what's X", "tell me about X", "who is X", "describe X"
            /^(?:what(?:'s|\s+is)|who(?:'s|\s+is)|describe|tell\s+me\s+about)\s+(.+)$/i,
            // "search X for Y" → look at X (ignore "for Y")
            /^search\s+(.+?)(?:\s+for\s+.+)?$/i,
            // "listen to X", "smell X", "sniff at X"
            /^(?:listen|hear)\s+(?:to\s+)?(.+)$/i,
            /^(?:smell|sniff)\s+(?:at\s+)?(.+)$/i,
            // Extended look with prepositions: "look in X", "look inside X", "look through X", "peer under X"
            /^(?:look|examine|inspect|check|study|read|search|survey|scan|observe|watch|peer|l|x)\s+(?:at|in|inside|into|through|under|behind|beneath|over|around)\s+(.+)$/i,
            /^(?:look|examine|inspect|check|study|read|search|survey|scan|observe|watch|peer|l|x)\s+(?:at\s+)?(.+)$/i,
            /^(?:look|l|listen|smell|sniff|search)$/i,
        ],
    },
    {
        canonical: 'take',
        synonyms: ['take', 'get', 'grab', 'pick', 'collect', 'acquire', 'snag', 'snatch', 'pluck', 'fetch', 'steal', 'swipe', 'pocket', 'loot', 'nab', 'pilfer'],
        patterns: [
            /^pick\s+up\s+(.+)$/i,
            /^pick\s+(.+?)\s+up$/i,
            // "pluck/snatch/steal X from Y" → take X (ignore "from Y")
            /^(?:pluck|snatch|steal|swipe|nab|pilfer)\s+(.+?)\s+(?:from|off|out\s+of)\s+.+$/i,
            /^(?:take|get|grab|collect|acquire|snag|snatch|pluck|fetch|steal|swipe|pocket|loot|nab|pilfer)\s+(.+)$/i,
            /^(?:take|get|grab|collect|acquire|steal|loot)$/i,
        ],
    },
    {
        canonical: 'use',
        synonyms: ['use', 'apply', 'give', 'show', 'offer', 'hand', 'pour', 'fill', 'set', 'place', 'put', 'drink', 'eat', 'consume', 'light', 'stamp',
            'turn', 'twist', 'rotate', 'flip', 'activate', 'operate', 'touch', 'rub',
            'throw', 'toss', 'cut', 'sit', 'wind', 'crank', 'swim', 'ride', 'wield',
            'dip', 'ring', 'wave', 'play', 'blow', 'stoke', 'insert', 'drop', 'wear',
            'lower', 'feed', 'raise', 'hoist', 'buy', 'purchase', 'trade', 'pay',
            'fix', 'repair', 'mend', 'forge', 'reforge', 'restore', 'heat', 'smelt', 'craft'],
        patterns: [
            // "give/show/offer/hand X to Y" → use X on Y
            /^(?:give|show|offer|hand)\s+(.+?)\s+(?:to)\s+(.+)$/i,
            // "pour/fill X on/into/with/from Y" → use X on Y
            /^(?:pour|fill)\s+(.+?)\s+(?:on|onto|into|with|from|in)\s+(.+)$/i,
            // "set/place/put X on/near/by/in Y" → use X on Y
            /^(?:set|place|put)\s+(.+?)\s+(?:on|near|by|in|at|next\s+to)\s+(.+)$/i,
            // "stamp X with Y" → use X on Y
            /^stamp\s+(.+?)\s+(?:with|on)\s+(.+)$/i,
            // "throw/toss X at/into Y" → use X on Y
            /^(?:throw|toss)\s+(.+?)\s+(?:at|into|to|towards?)\s+(.+)$/i,
            // "cut/chop X with Y" → use Y on X (tool on target)
            /^(?:cut|chop|slice)\s+(.+?)\s+(?:with|using)\s+(.+)$/i,
            // "insert X into/in Y" → use X on Y
            /^(?:insert|stick|slide)\s+(.+?)\s+(?:into|in|through)\s+(.+)$/i,
            // "buy/purchase X from Y" → use X on Y
            /^(?:buy|purchase)\s+(.+?)\s+(?:from|at)\s+(.+)$/i,
            // "pay X for Y" → use X on Y (e.g., "pay merchant for hat")
            /^pay\s+(.+?)\s+(?:for|with)\s+(.+)$/i,
            // "turn/twist/wind X on Y" → use X on Y (e.g., "turn crank on well")
            /^(?:turn|twist|wind|crank)\s+(.+?)\s+(?:on|at)\s+(.+)$/i,
            // "sit on/in X", "ride X", "swim in X" → use X
            /^(?:sit|sleep|rest|lie|lay)\s+(?:on|in|down\s+on|down\s+in)\s+(.+)$/i,
            /^swim\s+(?:in|across|through)\s+(.+)$/i,
            /^ride\s+(?:on\s+)?(.+)$/i,
            // "touch/rub/feel X" → use X
            /^(?:touch|rub|feel|stroke|caress|poke|prod|tap)\s+(.+)$/i,
            // Standard "use/apply X on/with Y"
            /^(?:use|apply)\s+(.+?)\s+(?:on|with)\s+(.+)$/i,
            // "dip X in/into Y" → use X on Y
            /^dip\s+(.+?)\s+(?:in|into)\s+(.+)$/i,
            // "lower/raise/hoist X into/in Y" → use X on Y
            /^(?:lower|raise|hoist)\s+(.+?)\s+(?:into|in|down|up)\s+(.+)$/i,
            // "feed X to Y" → use X on Y
            /^feed\s+(.+?)\s+(?:to)\s+(.+)$/i,
            // "fix/repair/mend X with/on/at Y" → use X on Y
            /^(?:fix|repair|mend|reforge|restore)\s+(.+?)\s+(?:with|on|at|in|using)\s+(.+)$/i,
            // "forge/smelt/craft X on/at/in Y" → use X on Y
            /^(?:forge|reforge|smelt|craft|heat)\s+(.+?)\s+(?:on|at|in|with)\s+(.+)$/i,
            // Bare verb + subject: "drink bottle", "light torch", "turn crank", "ring bell" etc.
            // Excludes give/show/offer/hand (need a target: "give X to Y")
            /^(?:use|apply|pour|fill|drink|eat|consume|light|place|put|turn|twist|rotate|flip|activate|operate|throw|toss|cut|wind|crank|wield|dip|ring|wave|play|blow|stoke|insert|drop|wear|lower|feed|raise|hoist|fix|repair|mend|forge|reforge|restore|heat|smelt|craft)\s+(.+)$/i,
            /^(?:use|apply)$/i,
        ],
    },
    {
        canonical: 'go',
        synonyms: ['go', 'walk', 'move', 'enter', 'exit', 'leave', 'head', 'travel', 'proceed', 'run', 'climb', 'follow',
            'jump', 'leap', 'cross', 'crawl', 'descend', 'ascend', 'sneak', 'tiptoe', 'sprint', 'return'],
        patterns: [
            // "head/proceed north to the hallway" → go north (extract direction, ignore "to X")
            /^(?:go|walk|move|head|travel|proceed|run|follow|sneak|tiptoe|sprint)\s+(north|south|east|west|up|down|n|s|e|w)\b/i,
            // "jump over/across X", "leap across X", "cross X" → go X
            /^(?:jump|leap|hop)\s+(?:over|across|off|down|into)\s+(.+)$/i,
            /^cross\s+(?:over\s+)?(.+)$/i,
            // "crawl through/into X" → go X
            /^(?:crawl|squeeze)\s+(?:through|into|under)\s+(.+)$/i,
            // "climb up/down X" → go X (with direction hint)
            /^climb\s+(?:up|down|over|into|through)\s+(.+)$/i,
            // "descend" / "ascend" as bare directions
            /^descend$/i,
            /^ascend$/i,
            // "go back" / "go through X" / "go to X"
            /^(?:go|walk|move|head|travel|proceed|run|follow|sneak|tiptoe|sprint)\s+(?:back|through|across|over|into|in|to)\s+(.+)$/i,
            /^(?:go|walk|move|head|travel|proceed|run|follow|sneak|tiptoe|sprint|return)\s+(?:to\s+)?(.+)$/i,
            /^(?:enter|exit|leave|climb|jump|leap|cross|crawl|descend|ascend)\s+(?:to\s+)?(.+)$/i,
            /^(?:go|walk|move|head|enter|exit|leave|travel|proceed|run|climb|follow|jump|return)$/i,
        ],
    },
    {
        canonical: 'talk',
        synonyms: ['talk', 'speak', 'say', 'ask', 'chat', 'greet', 'hello', 'call', 'yell', 'shout', 'whisper', 'hail', 'address', 'question', 'interrogate', 'converse', 'tell', 'answer', 'reply', 'respond', 'solve', 'attempt', 'begin'],
        patterns: [
            // "ask X about Y", "question X about Y", "interrogate X about Y"
            /^(?:ask|question|interrogate)\s+(.+?)\s+(?:about|regarding|on)\s+(.+)$/i,
            // "tell X about Y" → talk X (subject=X, target=Y)
            /^tell\s+(.+?)\s+(?:about|regarding)\s+(.+)$/i,
            // "the answer is X", "it's a X", "it is a X" → talk X (for riddle answers)
            /^(?:the\s+answer\s+is|it'?s?\s+(?:a|an)?)\s+(.+)$/i,
            // "talk/speak/chat to/with X"
            /^(?:talk|speak|chat|converse|whisper)\s+(?:to|with)\s+(.+)$/i,
            // "yell/shout/call at/to X"
            /^(?:yell|shout|call|holler)\s+(?:at|to)\s+(.+)$/i,
            /^(?:talk|speak|chat)\s+(.+)$/i,
            /^(?:ask|question|interrogate|address|hail)\s+(.+)$/i,
            /^(?:say|answer|reply|respond|greet|hello|whisper|yell|shout|call)\s+(.+)$/i,
            // "solve/attempt/begin X" → talk X (for riddles, tests, challenges)
            /^(?:solve|attempt|begin|start)\s+(?:the\s+)?(.+)$/i,
            // "say hello" / bare verbs
            /^(?:say\s+(?:hello|hi|hey))$/i,
        ],
    },
    {
        canonical: 'open',
        synonyms: ['open', 'unlock', 'close', 'shut', 'lock'],
        patterns: [
            /^(?:open|unlock)\s+(.+?)\s+(?:with)\s+(.+)$/i,
            /^(?:open|unlock|close|shut|lock)\s+(.+)$/i,
        ],
    },
    {
        canonical: 'push',
        synonyms: ['push', 'press', 'shove', 'kick', 'punch', 'hit', 'strike', 'smash', 'break', 'bash', 'attack', 'fight', 'knock', 'slam', 'stomp', 'bang', 'bump', 'ram', 'destroy'],
        patterns: [
            // "hit/strike/attack X with Y" → push X (target captured but ignored by push handler)
            /^(?:hit|strike|attack|smash|bash)\s+(.+?)\s+(?:with|using)\s+(.+)$/i,
            // "knock on X" → push X
            /^knock\s+(?:on|at)\s+(.+)$/i,
            /^(?:push|press|shove|kick|punch|hit|strike|smash|break|bash|attack|fight|knock|slam|stomp|bang|bump|ram|destroy)\s+(.+)$/i,
        ],
    },
    {
        canonical: 'pull',
        synonyms: ['pull', 'yank', 'tug', 'drag', 'wrench', 'pry', 'rip', 'tear'],
        patterns: [
            // "pry X open/off" → pull X
            /^pry\s+(.+?)(?:\s+(?:open|off|loose|apart|free))?\s*$/i,
            /^(?:pull|yank|tug|drag|wrench|rip|tear)\s+(?:on\s+)?(.+?)(?:\s+(?:open|off|out|down))?\s*$/i,
        ],
    },

    // Phase 4 verbs: save/load, item combination
    {
        canonical: 'combine',
        synonyms: ['combine', 'merge', 'mix', 'attach', 'connect', 'join'],
        patterns: [
            /^(?:combine|merge|mix|attach|connect|join)\s+(.+?)\s+(?:and|with|to|together\s+with)\s+(.+)$/i,
            /^(?:combine|merge|mix|attach|connect|join)\s+(\S+)\s+(\S+)$/i,
        ],
    },
    {
        canonical: 'hint',
        synonyms: ['hint', 'help', 'stuck', 'clue', 'think'],
        patterns: [
            /^(?:hint|help|stuck|clue|think)$/i,
            /^(?:give\s+me\s+a\s+)?(?:hint|help|clue)$/i,
            /^(?:i'?m?\s+)?stuck$/i,
            /^what\s+(?:do\s+i\s+do|should\s+i\s+do|now)$/i,
            // "how do I ..." / "I need help" / "I don't know"
            /^how\s+do\s+i\s+.+$/i,
            /^i\s+(?:need|want)\s+(?:a\s+)?(?:hint|help|clue)$/i,
            /^i\s+don'?t\s+know\s+(?:what\s+to\s+do)?$/i,
            /^what\s+(?:am\s+i\s+)?(?:supposed|meant)\s+to\s+do$/i,
        ],
    },
    {
        canonical: 'save',
        synonyms: ['save', 'savegame'],
        patterns: [
            /^save\s+(?:game\s+)?(\d+)$/i,
            /^save(?:\s+game)?$/i,
        ],
    },
    {
        canonical: 'load',
        synonyms: ['load', 'restore', 'loadgame'],
        patterns: [
            /^(?:load|restore)\s+(?:game\s+)?(\d+)$/i,
            /^(?:load|restore)(?:\s+game)?$/i,
        ],
    },
];

/**
 * Direction shortcut map. Single letters and full words that represent
 * compass directions. These are handled as implicit "go" commands.
 */
export const DIRECTION_SHORTCUTS: Record<string, string> = {
    'north': 'north', 'n': 'north',
    'south': 'south', 's': 'south',
    'east': 'east', 'e': 'east',
    'west': 'west', 'w': 'west',
    'up': 'up', 'u': 'up',
    'down': 'down', 'd': 'down',
    'ascend': 'up', 'descend': 'down',
    'upstairs': 'up', 'downstairs': 'down',
    'back': 'back', 'forward': 'north', 'forwards': 'north',
    'left': 'west', 'right': 'east',
    'outside': 'out', 'inside': 'in', 'out': 'out', 'in': 'in',
};
