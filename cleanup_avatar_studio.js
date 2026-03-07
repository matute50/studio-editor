const fs = require('fs');
const path = 'f:/GEMINI-CLI/SALADILLOVIVO_NEXT/editor saladillovivo/studio-editor/pages/AvatarStudio.tsx';
const content = fs.readFileSync(path, 'utf8').split(/\r?\n/);

// We want to delete the block that was starting at 651 in the original file.
// After some deletions, the line numbers shifted.
// Let's find the closing brace of the redundant obtenerPromptPorMotor.
// The new closure is at index 648 (line 649).
// We want to keep lines 1-649 (indices 0-648).
// We want to delete from line 650 down to the next occurrences of logic that we don't need.
// Let's find the line that starts the OracionValidada interface.

const interfaceLineIndex = content.findIndex(line => line.includes('interface OracionValidada'));

if (interfaceLineIndex !== -1) {
    const keepBefore = content.slice(0, 649);
    const keepAfter = content.slice(interfaceLineIndex - 2); // Keep from 2 lines before the interface
    const newContent = keepBefore.concat(keepAfter);
    fs.writeFileSync(path, newContent.join('\n'), 'utf8');
    console.log('Cleanup successful. Interface at index:', interfaceLineIndex);
} else {
    console.log('Could not find interface line');
}
