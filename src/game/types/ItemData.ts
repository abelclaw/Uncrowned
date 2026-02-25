/**
 * Definition for an item in the master item registry.
 * Items are referenced by ID throughout the game state and puzzle system.
 */
export interface ItemDefinition {
    id: string;
    name: string;
    description: string;
    /** Whether item can be combined with others */
    combinable?: boolean;
    /** Alternative names the player might use to refer to this item */
    aliases?: string[];
}
