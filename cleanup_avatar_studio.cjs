const fs = require('fs');
const path = 'f:/GEMINI-CLI/SALADILLOVIVO_NEXT/editor saladillovivo/studio-editor/pages/AvatarStudio.tsx';

// Read the file and handle both \r\n and \n line endings
const fileContent = fs.readFileSync(path, 'utf8');
const lines = fileContent.split(/\r?\n/);

console.log('Total lines:', lines.length);

// We want to keep lines up to line 649 (index 648)
// Indices 0-648 keep everything up to the closing brace of the new obtenerPromptPorMotor
const keepBefore = lines.slice(0, 649);

// Find where the interface OracionValidada starts to keep everything else
const interfaceLineIndex = lines.findIndex(line => line.includes('interface OracionValidada'));

if (interfaceLineIndex !== -1) {
    // Keep from 1-2 lines before the interface to preserve spacing
    const keepAfter = lines.slice(interfaceLineIndex - 2);
    const newContent = keepBefore.concat(keepAfter).join('\n');
    fs.writeFileSync(path, newContent, 'utf8');
    console.log('Cleanup successful. Interface found at original line:', interfaceLineIndex + 1);
    console.log('New total lines:', keepBefore.length + keepAfter.length);
} else {
    console.error('CRITICAL ERROR: Could not find "interface OracionValidada" line. No changes made.');
    process.exit(1);
}
