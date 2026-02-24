import Phaser from 'phaser';
import { GameState } from '../state/GameState';
import { SaveManager } from '../state/SaveManager';
import type { TransitionType } from '../types/RoomData';

/**
 * Scene transition helper supporting themed visual effects.
 * Handles input disabling and double-trigger prevention.
 * Auto-saves before every room transition.
 *
 * Transition types:
 * - fade: camera fadeOut -> scene start -> camera fadeIn
 * - slide-left: camera pans left (entering from right)
 * - slide-right: camera pans right (entering from left)
 * - wipe-left: black rectangle sweeps from right to left
 * - wipe-right: black rectangle sweeps from left to right
 * - pixelate: camera pixelates then fades to black
 * - iris: vignette closes to black (used for act boundaries)
 */
export class SceneTransition {
    /** Room-to-act mapping for act-boundary detection */
    private static readonly ACT_ROOMS: Record<string, number> = {
        // Act 1a: forest rooms
        forest_clearing: 1, cave_entrance: 1, village_path: 1, village_square: 1,
        castle_garden: 1, old_watchtower: 1, castle_courtyard: 1,
        // Act 1b: expanded forest/castle
        forest_bridge: 1, petrified_forest: 1, wizard_tower: 1, rooftop: 1,
        royal_kitchen: 1, servants_quarters: 1, throne_room: 1,
        // Act 2: caverns
        cavern_entrance_hall: 2, cavern_library: 2, cavern_east_wing: 2,
        cavern_west_wing: 2, cavern_balcony: 2, underground_pool: 2,
        underground_river: 2, echo_chamber: 2, crystal_chamber: 2,
        forge_chamber: 2, guardian_chamber: 2, dungeon: 2,
        // Act 3: return + climax
        castle_courtyard_act3: 3, castle_hallway: 3, royal_archive: 3,
        mirror_hall: 3, clock_tower: 3, treasury: 3,
        waiting_room: 3, filing_room: 3, throne_room_act3: 3,
    };

    /**
     * Detect whether two rooms are in different acts.
     */
    static isActChange(fromRoom: string, toRoom: string): boolean {
        const fromAct = SceneTransition.ACT_ROOMS[fromRoom];
        const toAct = SceneTransition.ACT_ROOMS[toRoom];
        return fromAct !== undefined && toAct !== undefined && fromAct !== toAct;
    }

    /**
     * Transition to a new room using the specified transition type.
     * Auto-saves to the DESTINATION room before the transition begins,
     * so death in the new room restores to room-entry state.
     *
     * Act-boundary crossings automatically override to an iris transition
     * with cinematic 1500ms duration for dramatic effect.
     */
    static transitionToRoom(
        scene: Phaser.Scene,
        roomId: string,
        spawnPoint: { x: number; y: number },
        transition: TransitionType = 'fade',
        duration: number = 500
    ): void {
        // Read current room BEFORE auto-save overwrites it
        const state = GameState.getInstance();
        const currentRoom = state.getData().currentRoom;

        // Auto-save before leaving the current room
        // Record DESTINATION room so loading auto-save starts at the room we're heading to
        (state.getData() as { currentRoom: string }).currentRoom = roomId;
        // NOTE: Do NOT markRoomVisited here — RoomScene.create handles it after
        // entry narration, so isFirstVisit and narrator_history work correctly.
        SaveManager.autoSave(state);

        scene.input.enabled = false;

        // Act-boundary override: cinematic iris transition
        const actChange = SceneTransition.isActChange(currentRoom, roomId);
        const effectiveDuration = actChange ? 1500 : duration;
        const effectiveTransition: TransitionType = actChange ? 'iris' : transition;

        switch (effectiveTransition) {
            case 'slide-left':
            case 'slide-right':
                SceneTransition.slideToRoom(scene, roomId, spawnPoint, effectiveTransition, effectiveDuration);
                break;
            case 'wipe-left':
            case 'wipe-right':
                SceneTransition.wipeToRoom(scene, roomId, spawnPoint, effectiveTransition, effectiveDuration);
                break;
            case 'pixelate':
                SceneTransition.pixelateToRoom(scene, roomId, spawnPoint, effectiveDuration);
                break;
            case 'iris':
                SceneTransition.irisToRoom(scene, roomId, spawnPoint, effectiveDuration);
                break;
            case 'fade':
            default:
                SceneTransition.fadeToRoom(scene, roomId, spawnPoint, effectiveDuration);
                break;
        }
    }

    /**
     * Fade-to-black transition: fadeOut current scene, start new scene, fadeIn.
     */
    static fadeToRoom(
        scene: Phaser.Scene,
        roomId: string,
        spawnPoint: { x: number; y: number },
        duration: number = 500
    ): void {
        scene.input.enabled = false;
        scene.cameras.main.fadeOut(duration, 0, 0, 0);

        scene.cameras.main.once(
            Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
            () => {
                scene.scene.start('RoomScene', { roomId, spawnPoint });
            }
        );
    }

    /**
     * Slide transition: pans the camera in the specified direction, then starts
     * the new scene. slide-left means exiting left (camera pans right to reveal
     * the edge, then new scene loads). slide-right is the reverse.
     */
    static slideToRoom(
        scene: Phaser.Scene,
        roomId: string,
        spawnPoint: { x: number; y: number },
        direction: 'slide-left' | 'slide-right',
        duration: number = 500
    ): void {
        scene.input.enabled = false;

        const camera = scene.cameras.main;
        const panDistance = camera.width;

        // Determine pan target based on direction
        const targetX = direction === 'slide-right'
            ? camera.scrollX + panDistance
            : camera.scrollX - panDistance;

        // Stop following the player during the pan
        camera.stopFollow();

        scene.tweens.add({
            targets: camera,
            scrollX: targetX,
            ease: 'Cubic.easeInOut',
            duration,
            onComplete: () => {
                scene.scene.start('RoomScene', {
                    roomId,
                    spawnPoint,
                    transitionFrom: direction,
                });
            },
        });
    }

    /**
     * Wipe transition: a black rectangle sweeps across the screen.
     * wipe-right: rectangle grows from left to right.
     * wipe-left: rectangle grows from right to left.
     */
    static wipeToRoom(
        scene: Phaser.Scene,
        roomId: string,
        spawnPoint: { x: number; y: number },
        direction: 'wipe-left' | 'wipe-right',
        duration: number = 500
    ): void {
        scene.input.enabled = false;

        const rect = scene.add.rectangle(0, 0, 0, 540, 0x000000)
            .setDepth(1000)
            .setScrollFactor(0)
            .setOrigin(0, 0);

        if (direction === 'wipe-right') {
            // Wipe from left to right: rect at x=0, width grows from 0 to 960
            rect.setPosition(0, 0);
            scene.tweens.add({
                targets: rect,
                width: 960,
                ease: 'Linear',
                duration,
                onComplete: () => {
                    scene.scene.start('RoomScene', {
                        roomId,
                        spawnPoint,
                        transitionFrom: direction,
                    });
                },
            });
        } else {
            // Wipe from right to left: rect at x=960 with origin(1,0), width grows from 0 to 960
            rect.setPosition(960, 0).setOrigin(1, 0);
            scene.tweens.add({
                targets: rect,
                width: 960,
                ease: 'Linear',
                duration,
                onComplete: () => {
                    scene.scene.start('RoomScene', {
                        roomId,
                        spawnPoint,
                        transitionFrom: direction,
                    });
                },
            });
        }
    }

    /**
     * Pixelate transition: camera pixelates, then fades to black.
     * Creates a retro "dissolve into pixels" effect.
     */
    static pixelateToRoom(
        scene: Phaser.Scene,
        roomId: string,
        spawnPoint: { x: number; y: number },
        duration: number = 500
    ): void {
        scene.input.enabled = false;

        // Add pixelate PostFX starting at 1 (no pixelation)
        const fx = scene.cameras.main.postFX.addPixelate(1);

        // Phase 1: pixelate grows over first half of duration
        scene.tweens.add({
            targets: fx,
            amount: 20,
            ease: 'Power2',
            duration: duration * 0.5,
            onComplete: () => {
                // Phase 2: fade to black over second half
                scene.cameras.main.fadeOut(duration * 0.5, 0, 0, 0);
                scene.cameras.main.once(
                    Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
                    () => {
                        scene.cameras.main.postFX.remove(fx);
                        scene.scene.start('RoomScene', {
                            roomId,
                            spawnPoint,
                            transitionFrom: 'pixelate',
                        });
                    }
                );
            },
        });
    }

    /**
     * Iris transition: vignette closes to black, creating a classic
     * "iris close" effect. Used automatically for act-boundary crossings.
     */
    static irisToRoom(
        scene: Phaser.Scene,
        roomId: string,
        spawnPoint: { x: number; y: number },
        duration: number = 500
    ): void {
        scene.input.enabled = false;

        // Vignette PostFX: starts with no darkening (strength 0), ramps to full (strength 1)
        // Parameters: x, y, radius, strength
        const fx = scene.cameras.main.postFX.addVignette(0.5, 0.5, 0.0, 1.0);
        // Start with zero strength (fully visible)
        fx.strength = 0;

        scene.tweens.add({
            targets: fx,
            strength: 1.0,
            ease: 'Cubic.easeIn',
            duration,
            onComplete: () => {
                scene.cameras.main.postFX.remove(fx);
                scene.scene.start('RoomScene', {
                    roomId,
                    spawnPoint,
                    transitionFrom: 'iris',
                });
            },
        });
    }
}
