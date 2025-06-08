/**
 * Type definitions for JOTS Assistant integration
 */

export interface JotsApi {
    addJotsToJournal(journalName: string): Promise<void>;
    getSettings(): any;
}

export interface JotsAssistant {
    api: JotsApi;
}

declare global {
    interface Window {
        JotsAssistant?: JotsAssistant;
    }
}
