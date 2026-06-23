export interface BadgeDefinition {
    id: string; // unique slug, e.g. 'founder'
    name: string;
    description?: string;
    iconUrl?: string;
    colorHex?: string;
    type: 'ADMINISTRATIVE' | 'ACHIEVEMENT' | 'SYSTEM_INTERNAL';
    visibility: 'PUBLIC' | 'PRIVATE_MEMBER' | 'INTERNAL_STAFF';
}
