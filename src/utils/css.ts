export function injectCSS(settings) {
    const prefix = settings.stringPrefixLetter;
    const svg = settings.stringSVG;
    const css = `
        input[data-task="${prefix}"]:checked,
        li[data-task="${prefix}"]>input:checked,
        li[data-task="${prefix}"]>p>input:checked {
            --checkbox-marker-color: transparent;
            border: none;
            border-radius: 0;
            background-image: none;
            background-color: currentColor;
            pointer-events: none;
            -webkit-mask-size: var(--checkbox-icon);
            -webkit-mask-position: 50% 50%;
            color: black;
            margin-left: -48px;
            -webkit-mask-image: url("${svg}");
        }

        body [data-task="${prefix}"]>.dataview.inline-field>.dataview.inline-field-key::after {
            content: "=";
            color: black;
        }
    `;

    removeCSS(); // Ensure any existing styles are removed

    const style = document.createElement('style');
    style.id = 'FoodTracker-dynamic-css';
    style.textContent = css;
    document.head.appendChild(style);
}

export function removeCSS() {
    const style = document.getElementById('FoodTracker-dynamic-css');
    if (style) {
        style.remove();
    }
}