/**
 * Type definitions for JOTS Assistant integration
 */

export interface JotsApi {
    addJotsToJournal(journalName: string): Promise<void>;
    getSettings(): any;
    getJournalPathInfo(): {
        rootFolder: string;       // e.g., "Chronological/Journals"
        folderPattern: string;    // e.g., "YYYY/YYYY-MM"
        filePattern: string;      // e.g., "YYYY-MM-DD_ddd"
    };
}

export interface JotsAssistant {
    api: JotsApi;
}

declare global {
    interface Window {
        JotsAssistant?: JotsAssistant;
    }
}
