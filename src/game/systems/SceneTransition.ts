import Phaser from 'phaser';

/**
 * Scene transition helper supporting fade and slide effects.
 * Handles input disabling and double-trigger prevention.
 *
 * Transition types:
 * - fade: camera fadeOut -> scene start -> camera fadeIn
 * - slide-left: camera pans left (entering from right)
 * - slide-right: camera pans right (entering from left)
 */
export class SceneTransition {
    /**
     * Transition to a new room using the specified transition type.
     * Disables input and delegates to the appropriate transition method.
     */
    static transitionToRoom(
        scene: Phaser.Scene,
        roomId: string,
        spawnPoint: { x: number; y: number },
        transition: 'fade' | 'slide-left' | 'slide-right' = 'fade',
        duration: number = 500
    ): void {
        scene.input.enabled = false;

        switch (transition) {
            case 'slide-left':
            case 'slide-right':
                SceneTransition.slideToRoom(scene, roomId, spawnPoint, transition, duration);
                break;
            case 'fade':
            default:
                SceneTransition.fadeToRoom(scene, roomId, spawnPoint, duration);
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
        // slide-left: exiting screen to the left (player walks left to exit)
        //   -> camera pans so viewport moves left (scrollX decreases)
        // slide-right: exiting screen to the right (player walks right to exit)
        //   -> camera pans so viewport moves right (scrollX increases)
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
}
