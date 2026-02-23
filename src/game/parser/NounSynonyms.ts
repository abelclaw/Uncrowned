/**
 * Noun synonym table for resolving player vocabulary to canonical game nouns.
 *
 * Maps alternate words players might type → words that appear in hotspot/item names.
 * Used by NounResolver to expand player input before matching against room entities.
 *
 * Structure: { playerWord: canonicalWord }
 * - playerWord: lowercase word the player might type
 * - canonicalWord: lowercase word that appears in a hotspot or item name
 *
 * Only single-word → single-word mappings. Multi-word phrases are handled
 * by the word-overlap scoring in NounResolver.
 */
export const NOUN_SYNONYMS: Record<string, string> = {
    // --- Torch / fire ---
    'flame': 'torch',
    'lantern': 'torch',
    'fire': 'torch',
    'brand': 'torch',
    'flambeau': 'torch',

    // --- Chalice / cup ---
    'goblet': 'chalice',
    'cup': 'chalice',
    'grail': 'chalice',
    'glass': 'chalice',
    'vessel': 'chalice',

    // --- Rope ---
    'cord': 'rope',
    'string': 'rope',
    'line': 'rope',
    'twine': 'rope',
    'cable': 'rope',

    // --- Key ---
    'lockpick': 'key',

    // --- Forge / smithy ---
    'smithy': 'forge',
    'furnace': 'forge',
    'hearth': 'forge',
    'kiln': 'forge',

    // --- Anvil ---
    'hammer': 'anvil',

    // --- Crystal ---
    'gem': 'crystal',
    'jewel': 'crystal',
    'gemstone': 'crystal',

    // --- Mushroom ---
    'fungus': 'mushroom',
    'fungi': 'mushroom',
    'toadstool': 'mushroom',
    'shroom': 'mushroom',

    // --- Seal / stamp ---
    'sigil': 'seal',
    'emblem': 'seal',
    'crest': 'seal',
    'insignia': 'seal',

    // --- Coal ---
    'ember': 'coal',
    'charcoal': 'coal',
    'cinder': 'coal',

    // --- Throne ---
    'chair': 'throne',
    'seat': 'throne',

    // --- Sage (herb) ---
    'herb': 'sage',
    'herbs': 'sage',
    'plant': 'sage',
    'leaves': 'sage',

    // --- Stick ---
    'branch': 'stick',
    'twig': 'stick',
    'staff': 'stick',
    'pole': 'stick',
    'rod': 'stick',

    // --- Planks / wood ---
    'boards': 'planks',
    'lumber': 'planks',
    'timber': 'planks',
    'plank': 'planks',

    // --- Boat ---
    'ship': 'boat',
    'raft': 'boat',
    'canoe': 'boat',
    'skiff': 'boat',

    // --- Bottle ---
    'flask': 'bottle',
    'vial': 'bottle',
    'jar': 'bottle',
    'potion': 'bottle',
    'elixir': 'bottle',

    // --- Flour ---
    'grain': 'flour',
    'meal': 'flour',
    'powder': 'flour',

    // --- Ink ---
    'dye': 'ink',
    'pigment': 'ink',

    // --- Decree / document ---
    'document': 'decree',
    'parchment': 'decree',
    'edict': 'decree',
    'proclamation': 'decree',
    'writ': 'decree',
    'order': 'decree',

    // --- Contract ---
    'agreement': 'contract',
    'pact': 'contract',

    // --- Form (bureaucratic) ---
    'paperwork': 'form',
    'application': 'form',
    'paper': 'form',

    // --- Ticket ---
    'pass': 'ticket',
    'permit': 'ticket',
    'authorization': 'ticket',

    // --- Well ---
    'fountain': 'well',
    'spring': 'well',

    // --- Door ---
    'gate': 'door',
    'entrance': 'door',
    'doorway': 'door',
    'hatch': 'door',

    // --- Chest ---
    'box': 'chest',
    'trunk': 'chest',
    'coffer': 'chest',
    'strongbox': 'chest',
    'crate': 'chest',

    // --- Bridge ---
    'crossing': 'bridge',
    'span': 'bridge',
    'overpass': 'bridge',

    // --- Bookshelf / shelves ---
    'bookcase': 'bookshelves',
    'bookshelf': 'bookshelves',
    'shelf': 'shelves',
    'rack': 'shelves',

    // --- Desk ---
    'table': 'desk',
    'counter': 'desk',
    'workbench': 'desk',

    // --- Stove ---
    'oven': 'stove',
    'range': 'stove',
    'cooker': 'stove',
    'fireplace': 'stove',

    // --- Telescope ---
    'scope': 'telescope',
    'spyglass': 'telescope',
    'lens': 'telescope',

    // --- Portrait ---
    'painting': 'portrait',
    'picture': 'portrait',
    'artwork': 'portrait',

    // --- Banner ---
    'flag': 'banner',
    'pennant': 'banner',
    'tapestry': 'banner',

    // --- Mirror ---
    'reflection': 'mirror',
    'looking-glass': 'mirror',

    // --- Stump ---
    'log': 'stump',
    'crevice': 'crack',

    // --- Bones ---
    'skeleton': 'bones',
    'remains': 'bones',
    'skull': 'bones',

    // --- Beehive ---
    'hive': 'beehive',
    'bees': 'beehive',
    'nest': 'beehive',

    // --- Bush ---
    'shrub': 'bush',
    'berries': 'bush',
    'berry': 'bush',

    // --- Gorge ---
    'ravine': 'gorge',
    'chasm': 'gorge',
    'cliff': 'gorge',
    'canyon': 'gorge',
    'abyss': 'gorge',

    // --- Pool ---
    'pond': 'pool',
    'lake': 'pool',
    'water': 'pool',

    // --- Pedestal ---
    'plinth': 'pedestal',
    'stand': 'pedestal',
    'platform': 'pedestal',
    'altar': 'pedestal',

    // --- Guardian ---
    'golem': 'guardian',
    'sentinel': 'guardian',
    'statue': 'guardian',

    // --- Railing ---
    'banister': 'railing',
    'balustrade': 'railing',
    'handrail': 'railing',

    // --- Carvings ---
    'engravings': 'carvings',
    'etchings': 'carvings',
    'inscriptions': 'carvings',
    'runes': 'carvings',

    // --- Stalactites ---
    'stalagmites': 'stalactites',
    'formations': 'stalactites',

    // --- Signpost ---
    'sign': 'signpost',
    'signs': 'signpost',
    'notice': 'signpost',
    'directions': 'signpost',

    // --- Carpet ---
    'rug': 'carpet',
    'mat': 'carpet',

    // --- Cabinets ---
    'drawers': 'cabinets',
    'cabinet': 'cabinets',
    'locker': 'cabinets',

    // --- Ghost / ghost king ---
    'spirit': 'ghost',
    'specter': 'ghost',
    'spectre': 'ghost',
    'phantom': 'ghost',
    'apparition': 'ghost',
    'wraith': 'ghost',

    // --- Clerk ---
    'bureaucrat': 'clerk',
    'official': 'clerk',
    'administrator': 'clerk',
    'registrar': 'clerk',

    // --- Cook / Martha ---
    'chef': 'cook',
    'martha': 'cook',

    // --- Wizard ---
    'mage': 'wizard',
    'sorcerer': 'wizard',
    'marlowe': 'wizard',

    // --- Toll booth ---
    'booth': 'toll',
    'tollgate': 'toll',

    // --- Hedges ---
    'hedge': 'hedges',
    'bushes': 'hedges',

    // --- Rat ---
    'mouse': 'rat',
    'vermin': 'rat',
    'rodent': 'rat',

    // --- Trap ---
    'snare': 'trap',

    // --- Oil ---
    'lubricant': 'oil',
    'grease': 'oil',

    // --- Dais ---
    'stage': 'dais',
    'podium': 'dais',

    // --- Circle (rite circle) ---
    'ritual': 'circle',
    'rite': 'circle',

    // --- Spire ---
    'tower': 'spire',
    'turret': 'spire',

    // --- Parapet ---
    'wall': 'parapet',
    'battlement': 'parapet',
    'ledge': 'parapet',
    'edge': 'parapet',

    // --- Scenery: Trees / forest ---
    'tree': 'trees',
    'trees': 'trees',
    'oak': 'trees',
    'forest': 'trees',
    'woods': 'trees',

    // --- Scenery: Ferns / ground cover ---
    'fern': 'ferns',
    'grass': 'ferns',
    'weeds': 'ferns',

    // --- Scenery: Sky / sunlight ---
    'sky': 'sunset',
    'sun': 'sunset',
    'sunlight': 'sunset',
    'clouds': 'sunset',
    'stars': 'sunset',

    // --- Scenery: Path / road ---
    'path': 'path',
    'road': 'path',
    'trail': 'path',

    // --- Scenery: Vines / ivy ---
    'ivy': 'vines',
    'vine': 'vines',

    // --- Scenery: Moss ---
    'moss': 'moss',

    // --- Scenery: Arch / archway ---
    'arch': 'archway',
    'arches': 'archway',
    'archway': 'archway',

    // --- Scenery: Columns / pillars ---
    'column': 'columns',
    'pillar': 'columns',
    'pillars': 'columns',

    // --- Scenery: Curtains / drapes ---
    'curtain': 'curtains',
    'drapes': 'curtains',

    // --- Scenery: Chandelier ---
    'chandelier': 'chandelier',

    // --- Scenery: Sconces / torches (wall) ---
    'candle': 'sconces',
    'sconce': 'sconces',
    'torches': 'sconces',

    // --- Scenery: Beds ---
    'bed': 'beds',
    'beds': 'beds',
    'bunk': 'beds',
    'bunkbed': 'beds',

    // --- Scenery: Window ---
    'window': 'window',
    'pane': 'window',

    // --- Scenery: Pots / cooking ---
    'pot': 'pots',
    'pan': 'pots',
    'pans': 'pots',
    'utensils': 'pots',
    'cookware': 'pots',

    // --- Scenery: Gears / clockwork ---
    'gears': 'gears',
    'gear': 'gears',
    'mechanism': 'gears',
    'clockwork': 'gears',
    'cogs': 'gears',

    // --- Scenery: River / water (flowing) ---
    'river': 'water',
    'stream': 'water',
    'creek': 'water',
    'current': 'water',

    // --- Scenery: Waterfall ---
    'waterfall': 'waterfall',
    'falls': 'waterfall',
    'cascade': 'waterfall',

    // --- Scenery: Hills / landscape ---
    'hills': 'hills',
    'hill': 'hills',
    'valley': 'hills',
    'landscape': 'hills',
    'vista': 'hills',

    // --- Scenery: Mountains ---
    'mountain': 'mountains',
    'mountains': 'mountains',
    'peaks': 'mountains',

    // --- Scenery: Mist / fog ---
    'mist': 'mist',
    'fog': 'mist',
    'haze': 'mist',

    // --- Scenery: Ceiling / dome ---
    'ceiling': 'ceiling',
    'dome': 'ceiling',
    'roof': 'ceiling',

    // --- Scenery: Floor / ground ---
    'floor': 'floor',
    'ground': 'floor',
    'cobblestones': 'cobblestones',
    'cobblestone': 'cobblestones',
    'stones': 'cobblestones',
};
