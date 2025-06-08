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

/**
 * Get journal path information
 * @param settings The plugin settings
 * @returns Object containing root folder, folder pattern, and file pattern
 */
export function getJournalPathInfo(settings: any) {
    if (isJotsAssistantAvailable()) {
        const jotsInfo = window.JotsAssistant?.api.getJournalPathInfo();
        if (!jotsInfo) {
            throw new Error('Failed to get journal path info from JOTS Assistant');
        }
        return jotsInfo;
    }

    // Use local settings
    return {
        rootFolder: settings.journalRootFolder,
        folderPattern: settings.journalFolderPattern,
        filePattern: settings.journalFilePattern
    };
}

/**
 * Format a date using the given pattern
 * @param date The date to format
 * @param pattern The pattern to use
 * @returns The formatted date string
 */
function formatDateWithPattern(date: Date, pattern: string): string {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return pattern
        .replace('YYYY', date.getFullYear().toString())
        .replace('MM', (date.getMonth() + 1).toString().padStart(2, '0'))
        .replace('DD', date.getDate().toString().padStart(2, '0'))
        .replace('ddd', dayNames[date.getDay()]);
}

/**
 * Get the full journal path for a given date
 * @param date The date to get the journal path for
 * @param settings The plugin settings
 * @returns The full journal path
 */
export function getJournalPath(date: Date, settings: any): string {
    const pathInfo = getJournalPathInfo(settings);
    const folder = formatDateWithPattern(date, pathInfo.folderPattern);
    const file = formatDateWithPattern(date, pathInfo.filePattern);
    
    return `${pathInfo.rootFolder}/${folder}/${file}.md`;
}
