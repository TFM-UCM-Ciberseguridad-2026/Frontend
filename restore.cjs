const fs = require('fs');

const transcriptPath = 'c:\\Users\\Lord\\.gemini\\antigravity-ide\\brain\\36612c76-4f86-47b9-b831-cb88fb800fd7\\.system_generated\\logs\\transcript_full.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

for (const line of lines) {
    if (!line.trim()) continue;
    const step = JSON.parse(line);
    if (step.step_index === 1170 && step.tool_calls && step.tool_calls[0].name === 'write_to_file') {
        const codeContent = step.tool_calls[0].args.CodeContent;
        fs.writeFileSync('c:\\Users\\Lord\\Desktop\\PruebaJulve\\Orquestador\\Frontend\\src\\presentation\\pages\\TtpsPage.jsx', codeContent);
        console.log('Restored TtpsPage.jsx successfully!');
        break;
    }
}
