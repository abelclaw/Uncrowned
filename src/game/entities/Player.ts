import Phaser from 'phaser';

/**
 * Player character entity with idle, walk, and interact animations.
 * Moves along waypoint paths using tween chains.
 */
export class Player {
    private sprite: Phaser.GameObjects.Sprite;
    private scene: Phaser.Scene;
    private currentTween: Phaser.Tweens.TweenChain | null = null;
    private _isWalking: boolean = false;
    private _isDirectMoving: boolean = false;
    private static readonly SPEED = 120; // pixels per second

    /** Whether the player is currently walking along a path. */
    get isWalking(): boolean {
        return this._isWalking;
    }

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;
        this.sprite = scene.add.sprite(x, y, 'player');
        this.sprite.setDepth(50);

        // Create animations from the player spritesheet
        if (!scene.anims.exists('player-idle')) {
            scene.anims.create({
                key: 'player-idle',
                frames: scene.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
                frameRate: 4,
                repeat: -1,
            });
        }

        if (!scene.anims.exists('player-walk')) {
            scene.anims.create({
                key: 'player-walk',
                frames: scene.anims.generateFrameNumbers('player', { start: 4, end: 11 }),
                frameRate: 8,
                repeat: -1,
            });
        }

        if (!scene.anims.exists('player-interact')) {
            scene.anims.create({
                key: 'player-interact',
                frames: scene.anims.generateFrameNumbers('player', { start: 12, end: 15 }),
                frameRate: 6,
                repeat: 0,
            });
        }

        this.sprite.play('player-idle');
    }

    /**
     * Update player position from arrow key input. Called every frame from RoomScene.update().
     * Returns true if the player is actively moving via arrow keys.
     */
    updateDirectMovement(
        delta: number,
        cursors: Phaser.Types.Input.Keyboard.CursorKeys,
        isPointWalkable: (x: number, y: number) => boolean
    ): boolean {
        let dx = 0;
        let dy = 0;
        if (cursors.left.isDown)  dx -= 1;
        if (cursors.right.isDown) dx += 1;
        if (cursors.up.isDown)    dy -= 1;
        if (cursors.down.isDown)  dy += 1;

        if (dx === 0 && dy === 0) {
            if (this._isDirectMoving) {
                this._isDirectMoving = false;
                this._isWalking = false;
                this.sprite.play('player-idle');
            }
            return false;
        }

        // Cancel any active tween movement when arrow keys take over
        if (!this._isDirectMoving) {
            if (this.currentTween) {
                this.currentTween.stop();
                this.currentTween = null;
            }
            this.scene.tweens.killTweensOf(this.sprite);
        }

        // Normalize diagonal movement
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;

        const speed = Player.SPEED * (delta / 1000);
        const candidateX = this.sprite.x + dx * speed;
        const candidateY = this.sprite.y + dy * speed;

        // Try combined movement, then axis-aligned sliding
        if (isPointWalkable(candidateX, candidateY)) {
            this.sprite.x = candidateX;
            this.sprite.y = candidateY;
        } else {
            if (isPointWalkable(candidateX, this.sprite.y)) this.sprite.x = candidateX;
            if (isPointWalkable(this.sprite.x, candidateY)) this.sprite.y = candidateY;
        }

        if (!this._isDirectMoving || !this._isWalking) {
            this.sprite.play('player-walk', true);
            this._isWalking = true;
            this._isDirectMoving = true;
        }

        if (dx < 0) this.sprite.flipX = true;
        else if (dx > 0) this.sprite.flipX = false;

        return true;
    }

    /**
     * Move the player along a series of waypoints.
     * Stops any current movement before starting the new path.
     */
    walkTo(path: Array<{ x: number; y: number }>, onComplete?: () => void): void {
        if (path.length === 0) return;
        this._isDirectMoving = false;

        // Stop any existing movement
        if (this.currentTween) {
            this.currentTween.stop();
            this.currentTween = null;
        }
        this.scene.tweens.killTweensOf(this.sprite);

        // Play walk animation (true = ignore if already playing)
        this.sprite.play('player-walk', true);
        this._isWalking = true;

        // Build tween configs for each waypoint
        const tweenConfigs = path.map((point, index) => {
            const from = index === 0
                ? { x: this.sprite.x, y: this.sprite.y }
                : path[index - 1];

            const distance = Phaser.Math.Distance.Between(from.x, from.y, point.x, point.y);
            const speed = 120; // pixels per second
            const duration = (distance / speed) * 1000;

            return {
                targets: this.sprite,
                x: point.x,
                y: point.y,
                ease: 'Linear',
                duration: Math.max(duration, 1), // minimum 1ms to avoid zero-duration tweens
                onStart: () => {
                    // Flip sprite to face movement direction
                    this.sprite.flipX = point.x < this.sprite.x;
                },
            };
        });

        this.currentTween = this.scene.tweens.chain({
            tweens: tweenConfigs,
            onComplete: () => {
                this._isWalking = false;
                this.sprite.play('player-idle');
                this.currentTween = null;
                if (onComplete) onComplete();
            },
        });
    }

    /**
     * Play the interaction animation, then return to idle.
     */
    playInteraction(): void {
        this.sprite.play('player-interact');
        this.sprite.chain('player-idle');
    }

    /**
     * Get the player's current world position.
     */
    getPosition(): { x: number; y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    /**
     * Get the underlying Phaser sprite (for camera follow, etc.).
     */
    getSprite(): Phaser.GameObjects.Sprite {
        return this.sprite;
    }

    /**
     * Stop any active movement and return to idle.
     */
    stopMovement(): void {
        if (this.currentTween) {
            this.currentTween.stop();
            this.currentTween = null;
        }
        this.scene.tweens.killTweensOf(this.sprite);
        this._isWalking = false;
        this._isDirectMoving = false;
        this.sprite.play('player-idle');
    }

    /**
     * Clean up resources.
     */
    destroy(): void {
        if (this.currentTween) {
            this.currentTween.stop();
            this.currentTween = null;
        }
        this.scene.tweens.killTweensOf(this.sprite);
        this.sprite.destroy();
    }
}
