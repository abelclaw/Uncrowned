import Phaser from 'phaser';
import { NavMesh } from 'navmesh';

/**
 * Navigation system that validates walkable points and finds paths
 * using a polygon-based navigation mesh.
 */
export class NavigationSystem {
    private navMesh: NavMesh | null;
    private walkablePolygon: Phaser.Geom.Polygon;

    constructor(walkablePoints: Array<{ x: number; y: number }>) {
        // Phaser polygon for point-containment checks
        this.walkablePolygon = new Phaser.Geom.Polygon(walkablePoints);

        // Create navmesh from the walkable polygon
        // For simple convex polygons, pass as a single-element array
        this.navMesh = new NavMesh([
            walkablePoints.map(p => ({ x: p.x, y: p.y })),
        ]);
    }

    /**
     * Check if a point is inside the walkable area.
     */
    isPointWalkable(x: number, y: number): boolean {
        return Phaser.Geom.Polygon.Contains(this.walkablePolygon, x, y);
    }

    /**
     * Find a path between two points within the walkable area.
     * Returns an array of waypoints, or null if no path exists
     * or the target is outside the walkable area.
     */
    findPath(
        from: { x: number; y: number },
        to: { x: number; y: number }
    ): Array<{ x: number; y: number }> | null {
        if (!this.isPointWalkable(to.x, to.y)) {
            return null;
        }

        if (!this.navMesh) {
            return null;
        }

        const path = this.navMesh.findPath(from, to);
        return path;
    }

    /**
     * Clean up navmesh resources.
     */
    destroy(): void {
        this.navMesh = null;
    }
}
