/**
 * Script to add new hotspots for objects mentioned in room descriptions
 * but not currently interactable. Data sourced from per-room agent analysis.
 *
 * Each new hotspot has full verb coverage (look, take, use, talk, open, push, pull)
 * with sardonic dark comedy responses matching the game's tone.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOMS_DIR = join(import.meta.dirname, '..', 'public', 'assets', 'data', 'rooms');

// ============================================================================
// NEW HOTSPOTS BY ROOM
// ============================================================================

const NEW_HOTSPOTS = {
    // ---- VILLAGE SQUARE ----
    village_square: [
        {
            id: "stone-figures",
            name: "Stone Figures",
            zone: { x: 410, y: 355, width: 80, height: 40 },
            interactionPoint: { x: 450, y: 420 },
            responses: {
                look: "Three stone figures atop the fountain: a king, a knight, and what appears to be a badger wearing a tiny crown. They're frozen mid-dance, which raises more questions than it answers. The king's expression suggests he was having a wonderful time. The badger's suggests it was not.",
                take: "They're part of the fountain. Chiseled from the same stone. Even if you could pry one loose, explaining why you're carrying a petrified dancing badger would be socially complex.",
                use: "You're not sure what you'd use stone figures for. Bookends? Conversation starters? They're ornamental, and their ornamental days are behind them.",
                talk: "You address the stone king. He stares back with the fixed grin of someone caught mid-waltz for all eternity. The badger's expression has not improved.",
                open: "Stone figures don't open. They are solid stone. The king, the knight, and the badger are all equally unopenable.",
                push: "You push one of the figures. It doesn't move. It has been dancing with the same partner for decades and is not about to change now.",
                pull: "You try to pull the badger free. It clings to its position with the determination of something that never wanted to be here but refuses to leave."
            }
        },
    ],

    // ---- VILLAGE PATH ----
    village_path: [
        {
            id: "cart-tracks",
            name: "Cart Tracks",
            zone: { x: 200, y: 460, width: 200, height: 40 },
            interactionPoint: { x: 300, y: 460 },
            responses: {
                look: "Deep ruts in the dirt, left by cart wheels that passed this way when the path still saw regular traffic. The tracks are old enough to have developed their own ecosystem of weeds. They lead north toward the village and south into uncertainty.",
                take: "You can't take cart tracks. They're impressions in dirt. This is not the kind of treasure you were hoping for.",
                use: "You follow the cart tracks with your eyes. They don't lead anywhere you aren't already going.",
                talk: "You address the cart tracks. They lie there silently, being tracks. If they could speak, they'd probably complain about the traffic. Or the lack thereof.",
                open: "Cart tracks don't open. They're grooves in the ground. Your expectations of the ground continue to be unrealistic.",
                push: "You stomp on the cart tracks. The dirt compresses slightly. You've altered history's record by approximately nothing.",
                pull: "You can't pull tracks out of the ground. They're not tracks in the removable sense. They're geological autobiography."
            }
        },
        {
            id: "wildflowers",
            name: "Wildflowers",
            zone: { x: 50, y: 400, width: 120, height: 50 },
            interactionPoint: { x: 110, y: 430 },
            responses: {
                look: "Scraggly wildflowers line the path, doing their best to be cheerful in a kingdom where the ground itself is slowly turning to stone. Some are genuinely colourful. Others have given up and gone grey at the edges, like optimism in its final stage.",
                take: "You pick a wildflower. It wilts immediately in your hand, as though freedom was the one thing it couldn't survive. You feel slightly guilty.",
                use: "You sniff a wildflower. It smells faintly of earth and resignation. Not unpleasant, but not exactly a perfume you'd bottle.",
                talk: "You compliment the wildflowers on their persistence. They sway in the breeze, which you choose to interpret as modest acknowledgment.",
                open: "Flowers don't open on command. They open on their own schedule, which is more than can be said for most doors in this kingdom.",
                push: "You push through the wildflowers. They bend and spring back, unbothered. Plants have a resilience you frankly envy.",
                pull: "You uproot a wildflower. The earth releases it with a small sigh. Now you have a dying flower and a tiny hole. Achievement unlocked."
            }
        },
    ],

    // ---- CAVE ENTRANCE ----
    cave_entrance: [
        {
            id: "cave-mouth",
            name: "Cave Mouth",
            zone: { x: 400, y: 200, width: 160, height: 180 },
            interactionPoint: { x: 480, y: 420 },
            responses: {
                look: "The cave entrance yawns wide in the hillside like a mouth that's been screaming for centuries and finally got tired. Moss clings to the upper lip of rock. Darkness fills the interior like a held breath. A faint breeze emerges, carrying the smell of damp stone and regret.",
                take: "You can't take a cave entrance. It's a hole in a mountain. Even your adventuring ambitions have to acknowledge geological limitations.",
                use: "You're already using it -- as an entrance. That's what it's for. It's performing its function admirably.",
                talk: "You shout into the cave mouth. Your echo returns, distorted and unimpressed. The cave has heard better.",
                open: "The cave is already open. It's been open since the hill formed. You didn't need to help.",
                push: "You push the rock face around the cave entrance. The mountain does not move. Mountains rarely do.",
                pull: "You tug at a stalactite near the entrance. It holds firm. The cave is not interested in being redecorated."
            }
        },
    ],

    // ---- FOREST BRIDGE ----
    forest_bridge: [
        {
            id: "bridge-planks",
            name: "Bridge Planks",
            zone: { x: 300, y: 440, width: 300, height: 40 },
            interactionPoint: { x: 450, y: 450 },
            responses: {
                look: "The bridge planks are old, weathered, and making sounds that planks shouldn't make when you step on them. Several are cracked. One has a suspicious bounce. The nails holding them are rusty and appear to be losing their argument with gravity.",
                take: "You pry at a plank. It's the only thing between you and the gorge below. Removing structural supports while standing on them is the kind of plan that ends stories rather than advancing them.",
                use: "You're standing on them. They're a bridge. You're using them right now. The planks would appreciate less scrutiny and more forward momentum.",
                talk: "You address the planks reassuringly. They creak back. This is either structural feedback or a plea for retirement.",
                open: "Bridge planks don't open. If they did, you'd fall through, which defeats the purpose of a bridge.",
                push: "You stomp on a plank. It bows alarmingly and then springs back. The gorge below suggests you stop testing the bridge's patience.",
                pull: "You pull at a loose plank. It comes up slightly, revealing the dizzying drop beneath. You push it back immediately. Some knowledge is best unlearned."
            }
        },
        {
            id: "gorge-river",
            name: "River Below",
            zone: { x: 350, y: 490, width: 200, height: 30 },
            interactionPoint: { x: 450, y: 460 },
            responses: {
                look: "Far below the bridge, a river churns through the gorge with the kind of enthusiasm that suggests it would very much enjoy pulling you under. The water is dark and fast-moving, flecked with white foam where it smashes against rocks. It's scenic, in the way that things that could kill you often are.",
                take: "The river is thirty feet below you and moving at a speed that suggests it has places to be. You cannot take it. It would take you.",
                use: "Using the river from up here would require jumping, which would require a death wish. You have one of those, but not that specifically.",
                talk: "You shout down to the river. It roars back, louder and with considerably more conviction. You lose this argument.",
                open: "You can't open a river. Rivers are permanently open. That's rather the problem.",
                push: "You can't push a river from a bridge. The river, however, could push you. It seems eager to demonstrate.",
                pull: "You lean over to reach the water. The bridge sways. Common sense, which you possess in trace amounts, pulls you back."
            }
        },
    ],

    // ---- MIRROR HALL ----
    mirror_hall: [
        {
            id: "stone-walls",
            name: "Stone Walls",
            zone: { x: 800, y: 300, width: 100, height: 80 },
            interactionPoint: { x: 850, y: 420 },
            responses: {
                look: "Cold stone walls, barely visible between all the mirrors. What little wall you can see is ancient masonry, worn smooth by centuries. The stone doesn't reflect anything. In this room, that makes it the most trustworthy surface available.",
                take: "You can't take a wall. This is fundamental architecture, not a souvenir shop.",
                use: "You lean against the wall. It's solid, cold, and refreshingly honest. In a room full of lying mirrors, the wall is the only thing that is exactly what it appears to be.",
                talk: "You mutter at the stonework. Unlike everything else in this room, it doesn't talk back, show you alternate timelines, or judge your life choices.",
                push: "You push against the wall. It pushes back with the quiet confidence of something that has stood for centuries.",
                pull: "You claw at the mortar between stones. Nothing comes loose. The wall was built by professionals.",
                open: "You tap the stones, listening for a hollow compartment. Solid all the way through. Not every wall hides a secret room."
            }
        },
        {
            id: "gold-frames",
            name: "Gold Frames",
            zone: { x: 100, y: 330, width: 80, height: 70 },
            interactionPoint: { x: 140, y: 420 },
            responses: {
                look: "Ornate gold frames surround the larger mirrors, carved with ivy patterns and small faces that might be cherubs or might be gargoyles. Hard to tell -- the artist clearly had strong opinions about the boundary between cute and horrifying.",
                take: "The gold frames are bolted, screwed, and possibly cursed into place. Prying one off would require tools you don't have and a moral flexibility you'd rather not examine.",
                use: "You run your fingers along the gilded carvings. The metalwork is cold and intricate. Beautiful craftsmanship, wasted on holding mirrors that show you futures where you made better decisions.",
                talk: "You address the tiny carved faces on the frames. They stare back with the fixed expressions of creatures who were never alive and are mildly offended you thought otherwise.",
                open: "You feel around the edges of a frame for a hidden hinge or latch. Nothing. They're frames, not safes.",
                push: "You press against a frame. It shifts half an inch and the mirror behind it wobbles. You stop immediately.",
                pull: "You tug at an ornate frame. It groans but holds firm. The small carved faces seem to frown at you."
            }
        },
    ],

    // ---- FORGE CHAMBER ----
    forge_chamber: [
        {
            id: "fire-pit",
            name: "Fire Pit",
            zone: { x: 370, y: 380, width: 80, height: 40 },
            interactionPoint: { x: 410, y: 420 },
            responses: {
                look: "A deep fire pit at the heart of the forge, lined with heat-cracked stone. It hasn't held a proper fire in centuries, though the stone still radiates a ghost of warmth. Or perhaps that's the spectral dwarven smith's lingering influence.",
                take: "You can't take a pit. That's not how pits work. They're defined by their absence, not their presence.",
                use: "The fire pit is cold and empty. Without fuel and a working bellows, it's just a fancy hole in the ground.",
                talk: "You peer into the fire pit and call down. Your voice echoes off heat-scarred stone. No one answers. The last fire here died centuries ago.",
                open: "It's a pit. It's already open. That's the defining characteristic of pits.",
                push: "You push at the stones lining the pit. They're fused together by centuries of heat. Even cooled, they remember being molten.",
                pull: "You pull at a fire pit stone. It doesn't budge. These stones survived dwarven forge-heat. Your fingers are not a compelling argument."
            }
        },
        {
            id: "forge-chimney",
            name: "Chimney",
            zone: { x: 390, y: 50, width: 70, height: 120 },
            interactionPoint: { x: 425, y: 420 },
            responses: {
                look: "A chimney cut into the rock above the forge, disappearing into darkness. It was designed to vent smoke from the forge fire up through the mountain itself. Soot still cakes its walls. A faint breeze trickles down -- it still connects to the outside air, somewhere far above.",
                take: "You can't take a chimney. It's a vertical shaft through solid rock. Your pockets are not that deep.",
                use: "Without a fire below, the chimney is just a very tall, very narrow, very dark hole. It vents a thin breeze. That's all it does now.",
                talk: "You shout up the chimney. Your voice echoes for an impressively long time, bouncing off soot-covered walls. No response comes back.",
                open: "The chimney is already open. It's a shaft through rock. The dwarves built it open because smoke, unlike some adventurers, knows which way to go.",
                push: "You push the walls of the chimney. Soot rains down on your head. The chimney is unimpressed. You are now filthy.",
                pull: "You reach up into the chimney and pull. Soot. More soot. A dead bat. And your dignity, falling like flakes of carbon."
            }
        },
    ],

    // ---- WAITING ROOM ----
    waiting_room: [
        {
            id: "ticket",
            name: "Queue Ticket",
            zone: { x: 480, y: 420, width: 40, height: 30 },
            interactionPoint: { x: 500, y: 445 },
            responses: {
                look: "Your queue ticket reads 847 in faded ink. The paper is thin, slightly warm, and vibrates faintly as though aware of its own insignificance. Below the number, in microscopic print: 'Your patience is mandatory.'",
                take: "You already have it. It's in your hand. It's been in your hand since you arrived. Letting go of it would be like letting go of hope -- technically possible but practically unthinkable.",
                use: "You hold up the ticket. Nothing happens. Queue position is non-negotiable, non-transferable, and apparently non-functional.",
                talk: "You whisper to the ticket: 'When will it be our turn?' The ticket, being paper, offers no comfort. Being number 847 when they're serving 3 is comfort enough.",
                open: "It's a slip of paper. It's already as open as paper gets. What were you expecting inside -- a smaller, more optimistic ticket?",
                push: "You press the ticket flat. It was already flat. Paper tends to be. Your contribution to its flatness is negligible.",
                pull: "You tug at the ticket's edges. The paper stretches slightly but doesn't tear. It's sturdier than it looks, which is the minimum requirement for something that has to outlast bureaucracy."
            }
        },
        {
            id: "tally-marks",
            name: "Tally Marks",
            zone: { x: 100, y: 350, width: 80, height: 60 },
            interactionPoint: { x: 140, y: 420 },
            responses: {
                look: "Thousands of tally marks are scratched into the walls, layered over each other in increasingly desperate handwriting. The earliest ones are neat and orderly. The later ones are wild, carved deep into the stone with what appears to be fingernails. One section reads 'Gerald was here. Day 12,045. Still waiting.' Below it, in different handwriting: 'Gerald left. Day 12,046. Nobody noticed.'",
                take: "You can't take scratches out of a wall. They're part of the wall now, the way despair is part of the waiting experience.",
                use: "You add your own tally mark to the wall. It looks small and hopeful next to the thousands already there. Give it time.",
                talk: "You read the tally marks aloud. The numbers are staggering. Someone waited twelve thousand days. Someone else gave up at forty. You feel seen.",
                open: "Tally marks don't open. They're scratches. They tell a story, but not the kind with a door in it.",
                push: "You press your hand against the tally marks. The scratches are deep enough to feel under your fingers. Each one represents someone who believed their wait would end.",
                pull: "You trace the deepest scratches with your fingernails. Someone carved these with desperate force. The wall endured it all, patient as bureaucracy itself."
            }
        },
    ],

    // ---- CAVERN ENTRANCE HALL ----
    cavern_entrance_hall: [
        {
            id: "filing-cabinets",
            name: "Filing Cabinets",
            zone: { x: 770, y: 360, width: 80, height: 60 },
            interactionPoint: { x: 810, y: 420 },
            responses: {
                look: "Rows of stone filing cabinets line the walls, their drawers labeled with categories ranging from 'Applications A-D' to 'Complaints About the Nature of Time.' One drawer appears to be breathing. You decide not to investigate.",
                take: "Each cabinet is carved from solid rock and weighs roughly the same as a small horse. They are not leaving this room. Neither, it seems, are you.",
                use: "You try to open a drawer. It's locked. The next one is also locked. The third one opens but is empty except for a note reading 'SEE DRAWER 1.' You close it.",
                talk: "You address the filing cabinets. They say nothing, though one drawer rattles. Whether this is a response or a structural issue is anyone's guess.",
                open: "Every drawer you try is either locked, empty, or contains a form requesting permission to open other drawers. The bureaucracy is recursive.",
                push: "You shove a cabinet. It doesn't move. It was carved from the cavern floor itself. Filing here is permanent in every sense.",
                pull: "You pull a drawer handle. It comes off in your hand. The drawer remains closed. You now have a handle and no drawer to use it on. Peak bureaucracy."
            }
        },
        {
            id: "velvet-rope",
            name: "Velvet Rope",
            zone: { x: 30, y: 400, width: 60, height: 50 },
            interactionPoint: { x: 60, y: 430 },
            responses: {
                look: "A burgundy velvet rope strung between polished brass stanchions, the universal symbol of 'you aren't important enough.' It glows faintly. Even the crowd control is enchanted. This kingdom takes its queues very seriously.",
                take: "You reach for the rope. It shimmers and your hand passes through. Enchanted crowd control. Because a regular rope would have been too easy to circumvent, and the kingdom can't have that.",
                use: "You try to unhook the rope from its stanchion. It reattaches itself. You unhook it again. It reattaches. The rope has more determination than you do.",
                talk: "You address the velvet rope. It sways slightly, which is either acknowledgment or a draft. In bureaucratic spaces, it's hard to tell the difference.",
                open: "The rope doesn't open. It sections. It divides. It creates an invisible hierarchy between those who may pass and those who may not. You are in the latter category.",
                push: "You push through the rope. It pushes back. Gently, but with the institutional authority of something that has denied passage to thousands.",
                pull: "You yank the rope. It stretches, glows brighter, and snaps back to position. The enchantment holds. Whoever spelled this rope was deeply committed to access control."
            }
        },
    ],

    // ---- OLD WATCHTOWER ----
    old_watchtower: [
        {
            id: "observation-platform",
            name: "Observation Platform",
            zone: { x: 100, y: 380, width: 760, height: 30 },
            interactionPoint: { x: 480, y: 420 },
            responses: {
                look: "The observation platform is a generous name for what is essentially a flat stone surface with ambitions. Flagstones are cracked and uneven, with weeds pushing through the gaps. It creaks when you shift your weight, which is not the reassurance you were hoping for from the thing between you and a fatal drop.",
                take: "You consider prying up a flagstone. But removing pieces of the floor while standing on said floor ranks among the worse ideas you've had today.",
                use: "You're standing on it. That's the primary function of a platform. You're already using it to its full potential.",
                talk: "You address the platform, thanking it for its continued structural support. A flagstone shifts slightly underfoot.",
                open: "There's no trapdoor in the platform. You checked. Twice. Solid stone all the way down.",
                push: "You stomp on the flagstones experimentally. They hold. One wobbles. You stop stomping.",
                pull: "You try to lift a flagstone. It doesn't budge. The mortar between the stones is the only thing in this tower doing its job properly."
            }
        },
        {
            id: "do-not-lean-sign",
            name: "Warning Sign",
            zone: { x: 730, y: 400, width: 50, height: 30 },
            interactionPoint: { x: 755, y: 430 },
            responses: {
                look: "A weathered wooden sign that once read 'DO NOT LEAN' in stern capital letters. It has itself fallen over and now lies on the platform, face-up, delivering its warning to the sky. The irony is so thick you could lean on it.",
                take: "You pick up the sign, consider it briefly, then put it back down. Carrying around a 'DO NOT LEAN' sign feels like a cry for help you're not ready to make.",
                use: "You prop the sign back up against the railing. It immediately falls over again. The sign has made its philosophical position on standing upright quite clear.",
                talk: "You read the sign aloud: 'DO NOT LEAN.' Sound advice for the railing, the tower, the kingdom, and frankly, your life choices.",
                open: "It's a sign, not a book. Although given the state of literacy in this kingdom, the distinction may be academic.",
                push: "You nudge the fallen sign with your foot. It slides across the flagstones. It now reads 'DO NOT LEAN' to a slightly different audience of no one.",
                pull: "You pull the sign toward you. The wood is soft with rot and a corner breaks off in your hand. The sign now reads 'DO NOT LEA.' Still good advice."
            }
        },
        {
            id: "village-below",
            name: "Village Below",
            zone: { x: 80, y: 300, width: 200, height: 60 },
            interactionPoint: { x: 180, y: 410 },
            responses: {
                look: "The village sprawls below the watchtower like a collection of boxes a giant child abandoned mid-tantrum. Thatched roofs, cobbled streets, and the occasional plume of chimney smoke suggest life continues down there, oblivious to the curse slowly turning everything grey.",
                take: "You can't take an entire village. You can barely take responsibility for your own actions. One thing at a time.",
                use: "The village is below you. To use it, you'd need to go down there. This isn't a complicated logistics problem.",
                talk: "You shout down to the village. A dog barks in response. A door slams. The village has heard enough from people shouting from towers.",
                open: "You can't open a village. It's already there. It's been there for centuries.",
                push: "You can't push a village from up here. Gravity works in one direction, and the village didn't do anything to deserve being pushed.",
                pull: "You can't pull the village closer. It's exactly as far away as the bottom of the tower."
            }
        },
    ],

    // ---- PETRIFIED FOREST ----
    petrified_forest: [
        {
            id: "stone-ground",
            name: "Stone Ground",
            zone: { x: 200, y: 460, width: 500, height: 40 },
            interactionPoint: { x: 450, y: 470 },
            responses: {
                look: "The grass crunches underfoot -- not with the soft give of vegetation, but with the brittle snap of stone. Every blade has been petrified where it stood, creating a carpet of grey needles that prickle through your boots. Small stone insects lie scattered among the blades, frozen mid-crawl.",
                take: "You snap off a blade of stone grass. It's sharp, brittle, and utterly useless. You now have a stone blade of grass. Your inventory expands in the most disappointing way possible.",
                use: "You walk carefully across the stone ground. Each step crunches. The sound is deeply unpleasant, like walking on a graveyard made of china.",
                talk: "You address the petrified ground. It crunches under your feet in response. This is the most hostile floor you've ever stood on.",
                open: "You can't open the ground. It's solid petrified earth all the way down.",
                push: "You stamp on the stone grass. Brittle blades snap under your boot. You've destroyed several hundred years of petrification in a square foot. Well done.",
                pull: "You pull at a clump of stone grass. It snaps off at the roots with a crystalline crack. Underneath is more grey stone. It's stone all the way down."
            }
        },
        {
            id: "stone-canopy",
            name: "Stone Canopy",
            zone: { x: 150, y: 100, width: 600, height: 100 },
            interactionPoint: { x: 450, y: 420 },
            responses: {
                look: "Above you, the petrified branches interlock to form a canopy of grey stone. What were once leaves are now thin sheets of mineral, filtering the light into a pale, colourless wash. It should be oppressive, but there's an eerie beauty to it -- like a cathedral designed by entropy.",
                take: "You reach up for a stone branch. Even the lowest ones are well above your head, and climbing a stone tree seems like an excellent way to add yourself to the sculpture collection.",
                use: "The stone canopy filters the light above you. You can't use it for anything. It's already using itself -- as a monument to the curse's thoroughness.",
                talk: "You call up to the canopy. Your voice echoes off stone branches and comes back flat and grey, like everything else here.",
                open: "You can't open a canopy. Especially not one made of stone. It would take a geological event to change this overhead situation.",
                push: "You can't reach the canopy to push it. Which is fortunate, because pushing a ceiling made of stone branches would likely result in a very elaborate burial.",
                pull: "You jump and grab at a low stone branch. It holds your weight briefly, then snaps. You land in a shower of grey fragments. The canopy barely notices."
            }
        },
    ],

    // ---- CLOCK TOWER ----
    clock_tower: [
        {
            id: "pendulum",
            name: "Pendulum",
            zone: { x: 150, y: 200, width: 80, height: 200 },
            interactionPoint: { x: 190, y: 430 },
            responses: {
                look: "The pendulum hangs motionless, a massive weight suspended on a rod of polished steel. It should be swinging. Instead it hangs there like a condemned man's final argument -- still, heavy, and deeply unsettling. When the mechanism runs again, this will be the heartbeat of the tower.",
                take: "The pendulum weighs more than you do and is bolted to the mechanism with fittings designed to survive centuries of oscillation. It is not coming home with you.",
                use: "The pendulum can't be set swinging manually -- it's driven by the clock mechanism. Fix the mechanism, and the pendulum will do its job.",
                talk: "You speak to the pendulum. It hangs in judgment. Silent, heavy judgment. You've had worse conversations with actual people.",
                open: "It's a weight on a rod. There is nothing to open. Your creativity is admirable; your grasp of mechanical engineering, less so.",
                push: "You shove the pendulum. It sways half an inch and stops dead. Without the mechanism driving it, your push is just a suggestion it's perfectly comfortable ignoring.",
                pull: "You pull the pendulum toward you. It resists, then swings back to center with gravitational inevitability."
            }
        },
        {
            id: "main-spring",
            name: "Main Spring",
            zone: { x: 400, y: 350, width: 80, height: 60 },
            interactionPoint: { x: 440, y: 420 },
            responses: {
                look: "The main spring is seized -- a coil of tempered steel wound so tight by the curse that it's cracked in three places. This is the heart of the problem. Without a replacement spring, the mechanism is a very elaborate paperweight.",
                take: "The seized spring crumbles when you touch it, flaking into rust and regret. You need a replacement -- something like a gear spring.",
                use: "The main spring is seized beyond repair. You need a new spring entirely. Perhaps something from a wizard's collection of mechanical curiosities.",
                talk: "'I'll find you a replacement,' you promise the seized spring. It says nothing. It's a spring. But the promise feels oddly important.",
                open: "Springs don't open. They coil and uncoil. This one does neither, on account of being catastrophically seized.",
                push: "You press on the seized spring. A piece of corroded steel snaps off. You've made the situation marginally worse, which is your special talent.",
                pull: "You try to pull the seized spring free. It's fused to the mechanism by centuries of rust and magical stasis."
            }
        },
        {
            id: "clock-hands",
            name: "Clock Hands",
            zone: { x: 620, y: 360, width: 60, height: 40 },
            interactionPoint: { x: 650, y: 420 },
            responses: {
                look: "The hour and minute hands are frozen at 3:47 -- the exact moment the wizard's parking dispute became everyone's problem. They're made of iron, blackened with age. The minute hand points accusingly at the 9, as if blaming it for the whole mess.",
                take: "The hands are riveted to the clock face mechanism. Removing them would require tools you don't have and a disregard for the kingdom's future.",
                use: "You can't move the hands manually. They're driven by the mechanism behind them. Fix the mechanism, and the hands will move on their own.",
                talk: "'Move,' you command the frozen clock hands. They do not. Time has been ignoring commands from people with delusions of authority since long before this curse.",
                open: "Clock hands don't open. They point. Currently they point at 3:47, which points at the kingdom's failure, which points at a parking dispute. It's pointers all the way down.",
                push: "You push the minute hand. It doesn't budge. The curse has welded time itself in place.",
                pull: "You pull on the hour hand. Iron groans but nothing moves. The hands will turn again when the mechanism is repaired -- and not a moment sooner."
            }
        },
    ],

    // ---- CRYSTAL CHAMBER ----
    crystal_chamber: [
        {
            id: "warning-signs",
            name: "Warning Signs",
            zone: { x: 280, y: 390, width: 70, height: 50 },
            interactionPoint: { x: 315, y: 430 },
            responses: {
                look: "Fourteen warning signs in fourteen languages. You can read three of them. They all say 'DO NOT TOUCH THE BARRIER.' The Dwarven one adds 'SERIOUSLY.' The Elvish one is more poetic but arrives at the same conclusion. The fourteenth is in a language composed entirely of alarmed punctuation marks.",
                take: "You try to pry a sign loose. It's bolted to the stone with the conviction of someone who really, really wanted you to read it first.",
                use: "The signs are already in use. They are warning you. That is their purpose. They are fulfilling it admirably, even if you refuse to listen.",
                talk: "You read the signs aloud. The echo adds gravitas. 'DO NOT TOUCH THE BARRIER' sounds even more authoritative bouncing off ancient stone.",
                open: "The signs are not books. They have one message, and it is not hidden. It is, in fact, the opposite of hidden.",
                push: "You push a sign. It doesn't budge. Whoever installed these was not interested in them being removable.",
                pull: "You pull at a sign. The bolts hold. These signs were installed by someone who understood that the kind of person who ignores warnings is also the kind who removes them."
            }
        },
        {
            id: "pedestal-symbols",
            name: "Pedestal Symbols",
            zone: { x: 435, y: 400, width: 50, height: 20 },
            interactionPoint: { x: 460, y: 420 },
            responses: {
                look: "The symbols carved into the pedestal match the ones you saw in the Guardian Chamber -- angular dwarven script interlocked with something older. They pulse faintly with blue energy. You can't read them, but they radiate the quiet confidence of text that knows it's important.",
                take: "They're carved into stone. You'd need a chisel, several hours, and a complete disregard for archaeological preservation.",
                use: "You trace the symbols with your finger. They're cool and smooth, worn by centuries of other fingers doing exactly what you're doing now. Nothing happens, but there's a certain solidarity in the gesture.",
                talk: "You try reading the symbols aloud. The sounds you produce are not words in any language you know. The echo sounds vaguely offended.",
                open: "They're carvings, not buttons. The distinction is important to anyone who values their fingertips.",
                push: "You press the symbols. Nothing happens. They're decorative, not interactive. Not everything responds to poking.",
                pull: "You can't pull carvings out of stone. Well, you can, but then they're just rubble, and rubble tells no tales."
            }
        },
    ],

    // ---- ECHO CHAMBER ----
    echo_chamber: [
        {
            id: "cavern-dome",
            name: "Cavern Dome",
            zone: { x: 200, y: 20, width: 400, height: 80 },
            interactionPoint: { x: 400, y: 420 },
            responses: {
                look: "The dome-shaped cavern arches high above, its acoustics shaped by millennia of water erosion. Every sound bounces off the curved ceiling and returns multiplied, layered, harmonized. It's beautiful and deeply unsettling -- like being inside a stone instrument that's always listening.",
                take: "You can't take a dome. It's the ceiling. Removing it would be architecturally catastrophic and acoustically tragic.",
                use: "The dome is already in use -- as the world's most elaborate echo chamber. It amplifies everything. Your voice, your footsteps, your growing sense of unease.",
                talk: "You call up to the dome. Your voice cascades back in waves, each echo slightly different. For a moment, you're having a conversation with every version of yourself that ever spoke in this room.",
                open: "You can't open a dome. It's already open on the underside. That's rather the point of domes -- they're architectural bowls, inverted.",
                push: "You can't reach the dome to push it. Which is fortunate. Pushing a geological formation rarely improves it.",
                pull: "The dome is far above your head and weighs approximately a mountain's worth of stone. You are not pulling it anywhere."
            }
        },
        {
            id: "dripping-water",
            name: "Dripping Water",
            zone: { x: 350, y: 350, width: 60, height: 40 },
            interactionPoint: { x: 380, y: 420 },
            responses: {
                look: "Water drips from somewhere high in the dome, each drop hitting stone with a crystalline plip that the acoustics turn into a gentle rhythm. It's been doing this for centuries. The stalactites above are both the source and the result -- water building stone one patient drop at a time.",
                take: "You cup your hands under the drip. Cold water pools in your palms. It tastes of minerals and deep time. You let it go. Some things aren't meant to be kept.",
                use: "The dripping water isn't something you use. It's something you listen to. It's the heartbeat of the cavern, counting geological seconds.",
                talk: "You speak in rhythm with the drips. Plip. 'Hello.' Plip. 'Is anyone.' Plip. 'There?' The cave answers with more drips. It's always been better at this conversation than you.",
                open: "You can't open water. It's already in its most open state -- falling, one drop at a time, through air and into silence.",
                push: "You wave your hand through a falling drop. It splatters on your fingers. You've disrupted a process that's been continuous for millennia. The cave will recover. Your conscience might not.",
                pull: "You can't pull water upward. Gravity has opinions about this. Strong ones."
            }
        },
    ],

    // ---- TREASURY ----
    treasury: [
        {
            id: "treasury-cobwebs",
            name: "Cobwebs",
            zone: { x: 100, y: 200, width: 100, height: 80 },
            interactionPoint: { x: 150, y: 420 },
            responses: {
                look: "Cobwebs connect the remaining items like a network of neglect. The spiders responsible have long since moved on to more profitable locations. These webs are archaeological artifacts now -- monuments to creatures with better financial sense than the treasury's former administrators.",
                take: "You gather a handful of cobweb. It sticks to your fingers, your sleeve, your dignity. You now have cobweb. It has no value. Like most things in this treasury.",
                use: "You brush through the cobwebs. They cling to you with the desperation of things that haven't been touched in years. Rather like the treasury's accounting books.",
                talk: "You address the cobwebs. No spiders answer. The occupants have left. The webs remain, a forwarding address to nowhere.",
                open: "Cobwebs don't open. They cling. It's their defining characteristic and their only skill.",
                push: "You sweep cobwebs aside. They reform behind you almost immediately. The cobwebs have a stronger work ethic than the treasury's former staff.",
                pull: "You pull at a cobweb strand. It stretches, snaps, and sticks to your other hand. You are now more tangled than before. The cobwebs win every encounter."
            }
        },
    ],

    // ---- UNDERGROUND POOL ----
    underground_pool: [
        {
            id: "submerged-bones",
            name: "Submerged Bones",
            zone: { x: 350, y: 430, width: 80, height: 30 },
            interactionPoint: { x: 390, y: 430 },
            responses: {
                look: "Pale shapes rest at the bottom of the pool -- bones, bleached white by mineral-rich water. They could be animal. They could be human. The water's surface distorts them just enough to maintain ambiguity. Perhaps that's a mercy.",
                take: "The bones are at the bottom of a pool that kills anyone who touches its water. Getting them would require dying first, which rather defeats the purpose.",
                use: "You can't use bones at the bottom of a cursed pool. Even if you could reach them, 'wet bones from a death pool' is not a useful inventory category.",
                talk: "You address the bones. They say nothing. They've been silent since whatever put them there, and they have no intention of breaking that streak.",
                open: "Bones don't open. They're already in their most open state -- separated, scattered, and thoroughly done with being a skeleton.",
                push: "You can't reach the bones without touching the water. The water is not safe to touch. This is a problem without a solution you'd survive.",
                pull: "The bones are beyond your reach unless you fancy joining them. Which you don't. Presumably."
            }
        },
    ],

    // ---- UNDERGROUND RIVER ----
    underground_river: [
        {
            id: "shore-debris",
            name: "Shore Debris",
            zone: { x: 200, y: 450, width: 100, height: 30 },
            interactionPoint: { x: 250, y: 450 },
            responses: {
                look: "Various debris has washed up on the rocky shore: sticks, smooth stones, and the occasional bit of cloth or leather. The river brings gifts from upstream, though 'gifts' is generous for what amounts to a curated collection of garbage.",
                take: "You sift through the debris. Sticks, stones, a waterlogged boot with no partner. Nothing useful. The river's offerings are generous in quantity but disappointing in quality.",
                use: "You poke through the shore debris. There's nothing of practical use -- just the flotsam and jetsam of a kingdom that's slowly coming apart. Literally.",
                talk: "You address the pile of washed-up junk. It has no opinions, no feelings, and no useful information. Rather like most advisory councils.",
                open: "You can't open debris. It's already in its most chaotic state. Entropy has done its work here.",
                push: "You kick at the debris. Sticks scatter. Stones roll. The pile reforms downstream. The river will just bring more.",
                pull: "You drag a waterlogged branch from the pile. It's heavy, soggy, and entirely useless. You put it back. The pile accepts it without comment."
            }
        },
        {
            id: "river-mist",
            name: "River Mist",
            zone: { x: 300, y: 300, width: 200, height: 60 },
            interactionPoint: { x: 400, y: 420 },
            responses: {
                look: "A fine mist rises from where the waterfall meets the river, catching the dim light and creating a perpetual haze. It's refreshing on your face and makes the cavern smell of clean stone and wild water. It's the freshest thing in this entire underground complex.",
                take: "You wave your hands through the mist. It swirls around your fingers and reforms. You can't take mist. It's water that hasn't committed to a direction yet.",
                use: "You stand in the mist for a moment. It's cool and refreshing. For a brief instant, you almost forget you're in a cursed underground cavern beneath a dying kingdom. Almost.",
                talk: "You whisper into the mist. Your words dissolve into droplets. The mist is the best listener you've met -- it absorbs everything and judges nothing.",
                open: "You can't open mist. It's already as diffuse as matter gets while still being visible. This is peak openness.",
                push: "You sweep your arm through the mist. It parts, swirls, and closes behind you. Mist is patient. Mist always wins.",
                pull: "You try to gather the mist in your hands. It escapes between your fingers. Mist cannot be held. Neither can most things worth having."
            }
        },
    ],

    // ---- DUNGEON ----
    dungeon: [
        {
            id: "dungeon-chains",
            name: "Wall Chains",
            zone: { x: 100, y: 300, width: 60, height: 80 },
            interactionPoint: { x: 130, y: 420 },
            responses: {
                look: "Rusted chains hang from iron rings embedded in the dungeon walls. They're old enough to have their own patina and heavy enough to make you reconsider your life choices. Some still have manacles attached. The occupants are long gone, but the chains remember.",
                take: "The chains are bolted into the stone walls with hardware that was designed to hold very determined prisoners. Your determination is insufficient.",
                use: "You rattle a chain. It clinks mournfully in the darkness. The sound echoes off stone walls with the kind of resonance that makes you glad you're a visitor and not a resident.",
                talk: "You address the chains. They clink in the draft. It's not conversation, but it's more response than most things in this dungeon offer.",
                open: "The manacles are rusted shut. Even if you could open them, there's no one inside to free. The dungeon's hospitality ended long ago.",
                push: "You push a chain against the wall. It swings back. Physics continues to function, even in dungeons.",
                pull: "You pull a chain. The iron ring holds firm in the stone. These were built to hold people who very much wanted to leave. Your casual tugging doesn't register."
            }
        },
    ],

    // ---- ROYAL KITCHEN ----
    royal_kitchen: [
        {
            id: "kitchen-hearth",
            name: "Kitchen Hearth",
            zone: { x: 600, y: 300, width: 120, height: 100 },
            interactionPoint: { x: 660, y: 420 },
            responses: {
                look: "A massive stone hearth dominates one wall, its mouth blackened by decades of cooking fires. Iron hooks hang from the lintel for suspending pots over the flames. The fire is cold now. Ash and cold coals sit in the grate like the remains of better days.",
                take: "You can't take a hearth. It's built into the wall. It IS the wall, in a very real structural sense.",
                use: "The hearth is cold. Without fuel, flint, and something to cook, it's just a large decorative hole in the wall. Impressive, but currently useless.",
                talk: "You address the cold hearth. No warmth responds. The kitchen's heart has stopped beating. It's a grim metaphor you'd rather not dwell on.",
                open: "The hearth is already open. It's a fireplace. The opening is literally the point.",
                push: "You push against the hearth stones. They're solid, heat-tempered masonry. The kitchen was built around this hearth. It's not going anywhere.",
                pull: "You pull at an iron hook hanging from the lintel. It holds firm. These hooks survived years of heavy pots and angry cooks. Your pulling is trivial."
            }
        },
    ],

    // ---- THRONE ROOM ----
    throne_room: [
        {
            id: "throne-dais",
            name: "Throne Dais",
            zone: { x: 350, y: 400, width: 200, height: 40 },
            interactionPoint: { x: 450, y: 430 },
            responses: {
                look: "A raised stone platform supporting the throne, its steps worn smooth by centuries of petitioners approaching the seat of power. The dais elevates the throne just enough to make everyone else feel shorter. Classic power architecture.",
                take: "It's a raised section of floor. You can't take a floor. Not this floor, not any floor. Floors are non-portable by definition.",
                use: "You step up onto the dais. It's three steps higher than the rest of the room. You feel marginally more important. The feeling passes.",
                talk: "You address the dais. Stone steps are not conversationalists. They are, however, excellent at making knees ache.",
                open: "You search the dais for a hidden compartment or secret passage. The stones are solid. Not every raised platform hides a treasure vault. Just most of them.",
                push: "You push against the dais steps. They are part of the floor, which is part of the castle, which is part of the mountain. You are pushing a mountain.",
                pull: "You can't pull a dais. It's built into the floor. The floor is built into the earth. You're outmatched."
            }
        },
    ],

    // ---- CASTLE COURTYARD ----
    castle_courtyard: [
        {
            id: "courtyard-walls",
            name: "Castle Walls",
            zone: { x: 0, y: 100, width: 50, height: 300 },
            interactionPoint: { x: 75, y: 420 },
            responses: {
                look: "High stone walls enclose the courtyard, their surfaces grey and ancient. Arrow slits punctuate the upper reaches, and the stone shows the telltale smoothness of the petrification curse -- not just age, but active transformation. The walls are turning to something harder and deader than regular stone.",
                take: "You can't take a castle wall. The castle would object, structurally if not verbally.",
                use: "You lean against the wall. It's cold and unyielding. The wall performs its function with stolid indifference to your needs.",
                talk: "You address the castle walls. They tower above you in grim silence. If walls could talk, these ones would probably file a complaint.",
                open: "The walls are solid stone. No secret passages present themselves. The castle architects valued security over dramatic reveals.",
                push: "You push against the castle wall. The castle does not budge. Castles, as a rule, do not.",
                pull: "You try to pull a stone from the wall. It holds firm. The mortar has had centuries to set. Your afternoon is not sufficient."
            }
        },
    ],

    // ---- WIZARD TOWER ----
    wizard_tower: [
        {
            id: "tower-window",
            name: "Tower Window",
            zone: { x: 800, y: 200, width: 60, height: 80 },
            interactionPoint: { x: 830, y: 420 },
            responses: {
                look: "A narrow window set into the curved tower wall, offering a dizzying view of the kingdom below. The glass is thick, old, and slightly warped, making the outside world look like it's melting. Given the curse, it might actually be.",
                take: "You can't take a window. Even if you could remove the glass, what would you do with a warped medieval window pane? Start a very niche antique collection?",
                use: "You peer through the warped glass. The landscape outside bends and shifts like a dream. It's disorienting, which is par for the course in a wizard's tower.",
                talk: "You speak to the window. Light passes through it indifferently. Windows are transparent in every sense.",
                open: "The window is sealed shut, possibly by magic, possibly by centuries of paint. It has no intention of opening.",
                push: "You push against the glass. It flexes slightly and makes a sound that suggests pushing harder would be a mistake.",
                pull: "You pull at the window frame. It's embedded in the stone wall. The window was here before you and will be here after you."
            }
        },
    ],

    // ---- CASTLE GARDEN ----
    castle_garden: [
        {
            id: "stone-hedges",
            name: "Petrified Hedges",
            zone: { x: 100, y: 380, width: 150, height: 40 },
            interactionPoint: { x: 175, y: 420 },
            responses: {
                look: "Once-manicured hedges, now turned to grey stone by the curse. They retain their precise geometric shapes -- the gardener's last masterwork, preserved in mineral. Every leaf, every twig, frozen in place. It's beautiful in the way that taxidermy is beautiful: technically impressive and deeply wrong.",
                take: "You try to snap off a stone branch. It crumbles in your hand. Petrified shrubbery makes poor souvenirs.",
                use: "The hedges are decorative. They were decorative when alive, and they're decorative now that they're stone. Their function hasn't changed. Only their material.",
                talk: "You address the petrified hedges. They stand in rigid silence. They were probably better listeners when they were alive. Or at least they swayed in the breeze, which felt more responsive.",
                open: "Hedges don't open. Even stone ones. They're barriers, not doors.",
                push: "You push against a petrified hedge. It's solid stone. The curse has given these bushes more structural integrity than most buildings.",
                pull: "You pull at a stone hedge branch. It snaps off with a mineral crack. A piece of someone's careful gardening is now rubble. Progress."
            }
        },
    ],
};


// ============================================================================
// MAIN SCRIPT
// ============================================================================

function processRoom(filePath, roomId) {
    const raw = readFileSync(filePath, 'utf8');
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.error(`  SKIP (invalid JSON): ${filePath}`);
        return { modified: false };
    }

    const newHotspots = NEW_HOTSPOTS[roomId];
    if (!newHotspots || newHotspots.length === 0) {
        return { modified: false };
    }

    if (!data.hotspots) data.hotspots = [];

    // Only add hotspots that don't already exist
    let added = 0;
    for (const hotspot of newHotspots) {
        const exists = data.hotspots.some(h => h.id === hotspot.id);
        if (!exists) {
            data.hotspots.push(hotspot);
            added++;
        }
    }

    if (added > 0) {
        writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n');
        console.log(`  ${added} new hotspots added`);
    } else {
        console.log(`  all hotspots already present`);
    }

    return { modified: added > 0, added };
}

// Process all room files
const roomFiles = readdirSync(ROOMS_DIR).filter(f => f.endsWith('.json'));
let totalAdded = 0;
let modifiedFiles = 0;

for (const file of roomFiles) {
    const roomId = file.replace('.json', '');
    const hotspotsForRoom = NEW_HOTSPOTS[roomId];
    if (hotspotsForRoom) {
        console.log(`Processing ${file}...`);
        const result = processRoom(join(ROOMS_DIR, file), roomId);
        if (result.modified) {
            totalAdded += result.added;
            modifiedFiles++;
        }
    }
}

console.log(`\nDone! Added ${totalAdded} new hotspots across ${modifiedFiles} files.`);
console.log(`Rooms with new hotspots: ${Object.keys(NEW_HOTSPOTS).join(', ')}`);
