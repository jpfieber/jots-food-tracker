export function debounce(func: (...args: any[]) => void, wait: number) {
    let timeout: number | null = null;
    return (...args: any[]) => {
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = window.setTimeout(() => func(...args), wait);
    };
}