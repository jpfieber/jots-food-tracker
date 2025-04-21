export function createDiv(options?: { cls?: string; text?: string }): HTMLDivElement {
    const div = document.createElement('div');
    if (options?.cls) {
        div.className = options.cls;
    }
    if (options?.text) {
        div.textContent = options.text;
    }
    return div;
}

export function isTruthy(value: any): boolean {
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
    }
    return Boolean(value);
}