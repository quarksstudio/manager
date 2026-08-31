export interface UserData {
    id: string;
    email: string;
    displayName: string;
    photoURL: string;
    providers: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface UserInterface extends UserData {
    parent?: string;
}
