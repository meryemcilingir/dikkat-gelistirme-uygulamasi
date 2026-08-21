const fs = require('fs');
const path = require('path');

const featuresDir = path.join(__dirname, 'src', 'app', 'features');
const comps = [
    "water-capacity", "box-coloring", "elderly-people", "find-different",
    "find-reversed-e", "finding-green-lines", "flower-coloring", "fruit-size-ranking",
    "grid-coloring", "incorrect-numbers", "letter-grid", "longest-rope",
    "not-in-word", "pattern-matching-two", "shape-coloring", "triangle-size"
];

for (const c of comps) {
    const htmlPath = path.join(featuresDir, c, `${c}.component.html`);
    if (fs.existsSync(htmlPath)) {
        let content = fs.readFileSync(htmlPath, 'utf8');

        const topStart = content.indexOf('<div class="frame-top">');
        const midStart = content.indexOf('<div class="frame-middle">');

        if (topStart !== -1 && midStart !== -1) {
            const frameTopSection = content.substring(topStart, midStart);

            let icons = '';
            const iconsMatch = frameTopSection.match(/aria-hidden="true"[^>]*>([\s\S]*?)<\/(div|span)>/) || frameTopSection.match(/class="instruction-icons?"[^>]*>([\s\S]*?)<\/(div|span)>/);
            if (iconsMatch) {
                icons = iconsMatch[1].trim().replace(/\s+/g, ' ').replace(/"/g, '&quot;');
            }

            let instruction = '';
            const instMatch = frameTopSection.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
            if (instMatch) {
                instruction = instMatch[1].trim().replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ').replace(/"/g, '&quot;');
            }

            if (instruction) {
                const newHeader = `<div class="frame-top">\n    <app-activity-header icons="${icons}" instruction="${instruction}"></app-activity-header>\n  </div>\n\n  `;
                const newHtml = content.substring(0, topStart) + newHeader + content.substring(midStart);
                fs.writeFileSync(htmlPath, newHtml, 'utf8');
                console.log(`Fixed ${c}`);
            } else {
                console.log(`Could not extract instruction for ${c}`);
            }
        } else {
            console.log(`Could not find frame-top or frame-middle in ${c}`);
        }
    }
}
