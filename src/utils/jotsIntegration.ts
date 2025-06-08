import type { JotsAssistant } from '../types/jotsAssistant';

/**
 * Check if JOTS Assistant is available
 * @returns True if JOTS Assistant is installed and active
 */
export function isJotsAssistantAvailable(): boolean {
    console.debug('JOTS Food Tracker: Checking JOTS Assistant availability:', {
        windowObject: !!window,
        jotsAssistant: !!window.JotsAssistant,
        api: !!window.JotsAssistant?.api,
        fullObject: window.JotsAssistant
    });
    return window.JotsAssistant?.api !== undefined;
}

/**
 * Add JOTS to a journal using JOTS Assistant
 * @param journalName The name of the journal to add JOTS to
 * @returns Promise that resolves when the operation is complete
 */
export async function addJotsToJournal(journalName: string): Promise<void> {
    console.debug('JOTS Food Tracker: Attempting to add JOTS to journal:', journalName);

    if (!isJotsAssistantAvailable()) {
        console.error('JOTS Food Tracker: JOTS Assistant is not available');
        throw new Error('JOTS Assistant is not available');
    }

    try {
        console.debug('JOTS Food Tracker: Calling JOTS Assistant API');
        await window.JotsAssistant!.api.addJotsToJournal(journalName);
        console.debug('JOTS Food Tracker: Successfully called JOTS Assistant API');
    } catch (error) {
        console.error('JOTS Food Tracker: Failed to add JOTS to journal:', error);
        throw error;
    }
}
