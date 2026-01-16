export interface TutorialStep {
    title: string;
    content: string;
    image?: string; // Optional image URL
    icon?: string; // Optional icon name
}

export interface TutorialDef {
    id: string;
    title: string;
    steps: TutorialStep[];
}
