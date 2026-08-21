const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src/app/features');

function resolveAddAddConflict(featureName) {
    const featurePath = path.join(srcDir, featureName);
    const newFeatureName = `${featureName}-v2`;
    const newFeaturePath = path.join(srcDir, newFeatureName);

    if (!fs.existsSync(newFeaturePath)) {
        fs.mkdirSync(newFeaturePath, { recursive: true });
    }

    const files = ['.component.ts', '.component.html', '.component.scss'];

    for (const ext of files) {
        const oldFile = path.join(featurePath, `${featureName}${ext}`);
        if (!fs.existsSync(oldFile)) continue;

        const content = fs.readFileSync(oldFile, 'utf8');

        // Extract HEAD
        const headRegex = /<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n/g;
        let headContent = '';
        let headMatch = headRegex.exec(content);
        if (headMatch) {
            headContent = headMatch[1];
        }

        // Extract main
        const mainRegex = /=======\r?\n([\s\S]*?)>>>>>>> main\r?\n?/g;
        let mainContent = '';
        let mainMatch = mainRegex.exec(content);
        if (mainMatch) {
            mainContent = mainMatch[1];
        }

        // If it's the TS file, we also need to get the stuff outside the conflict markers
        // Actually, for add/add conflict, the whole file content is usually duplicated if they added it entirely separately,
        // OR it's just the parts that conflict.
        // Let's check how the add/add conflict looks in TS.
        // In pencil-matching.component.ts, it was mostly shared imports at the top, then conflict, then shared `}` at bottom?
        // Wait, looking at the pencil-matching.component.ts I viewed, the conflict was:
        // Imports: `<<<<<<< HEAD ... ======= ... >>>>>>> main`
        // Component decorator: `<<<<<<< HEAD ... ======= ... >>>>>>> main`
        // Class content: `<<<<<<< HEAD ... ======= ... >>>>>>> main`
        
        // This is complex to parse via regex generically if there are multiple markers.
        // Let's just do it manually for the files.
    }
}
