export function debounce<T extends (...args: any[]) => Promise<void>>(
    func: T,
    wait: number
): T {
    let timeout: NodeJS.Timeout;

    return ((...args: Parameters<T>): Promise<void> => {
        clearTimeout(timeout);
        return new Promise((resolve) => {
            timeout = setTimeout(() => {
                resolve(func(...args));
            }, wait);
        });
    }) as T;
}