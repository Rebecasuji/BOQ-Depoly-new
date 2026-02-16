import fs from 'fs';
const content = fs.readFileSync('server/routes.ts', 'utf-8');
const lines = content.split('\n');
let tryStack = [];
let inString = false;
let stringChar = '';
let inBlockComment = false;

for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
        const char = line[charIdx];
        const nextChar = line[charIdx + 1];

        if (inBlockComment) {
            if (char === '*' && nextChar === '/') {
                inBlockComment = false;
                charIdx++;
            }
            continue;
        }
        if (inString) {
            if (char === stringChar && line[charIdx - 1] !== '\\') {
                inString = false;
            }
            continue;
        }
        if (char === '/' && nextChar === '/') break;
        if (char === '/' && nextChar === '*') {
            inBlockComment = true;
            charIdx++;
            continue;
        }
        if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringChar = char;
            continue;
        }

        // Check for "try {" pattern
        if (line.substring(charIdx).startsWith('try {')) {
            tryStack.push({ line: lineIdx + 1, level: tryStack.length });
        }
        // Check for "} catch" pattern
        if (line.substring(charIdx).startsWith('} catch')) {
            if (tryStack.length > 0) {
                tryStack.pop();
            } else {
                console.log(`Error: catch without try at line ${lineIdx + 1}`);
            }
        }
    }
}

if (tryStack.length > 0) {
    console.log('Unclosed try blocks:');
    tryStack.forEach(t => console.log(`Line ${t.line}`));
} else {
    console.log('All try blocks closed.');
}
