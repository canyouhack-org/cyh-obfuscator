// Rust Obfuscator - Fixed string handling, comments, and minification
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class RustObfuscator extends BaseObfuscator {
    private reserved = new Set([
        'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else',
        'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop',
        'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static',
        'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while',
        'i8', 'i16', 'i32', 'i64', 'i128', 'isize', 'u8', 'u16', 'u32', 'u64', 'u128',
        'usize', 'f32', 'f64', 'bool', 'char', 'str', 'String', 'Vec', 'Option', 'Result',
        'Some', 'None', 'Ok', 'Err', 'println', 'print', 'format', 'main'
    ]);

    private varMap = new Map<string, string>();

    obfuscate(code: string): string {
        let result = code;
        this.varMap.clear();

        // Step 1: Extract strings FIRST to protect content inside strings
        const strings: { original: string; placeholder: string }[] = [];
        let strIdx = 0;

        // Extract raw strings r"..." and r#"..."#
        result = result.replace(/r#*"[\s\S]*?"#*/g, (m) => {
            const ph = `___RUSTSTR_${strIdx}_PLACEHOLDER___`;
            strings.push({ original: m, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Extract regular strings
        result = result.replace(/"(?:[^"\\]|\\.)*"/g, (m) => {
            const ph = `___RUSTSTR_${strIdx}_PLACEHOLDER___`;
            strings.push({ original: m, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Step 2: Remove comments (now safe - strings are protected)
        if (this.options.removeComments) {
            // Remove multi-line comments /* ... */
            result = result.replace(/\/\*[\s\S]*?\*\//g, '');
            // Remove single-line comments //
            result = result.replace(/\/\/[^\n]*/g, '');
        }

        // Step 3: Rename variables
        if (this.options.renameVariables) {
            result = this.renameIdentifiers(result);
        }

        // Step 4: Dead code injection
        if (this.options.deadCodeInjection) {
            result = this.injectDeadCode(result);
        }

        // Step 5: Restore strings with optional encoding
        for (const { original, placeholder } of strings) {
            let replacement = original;

            // Only encode regular strings (not raw strings)
            if (!original.startsWith('r')) {
                const content = original.slice(1, -1);
                if (content.length > 0 && content.length < 100) {
                    if (this.options.hexEncoding && this.options.encodeStrings) {
                        const hex = content.split('').map(c => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
                        replacement = `"${hex}"`;
                    }
                }
            }
            result = result.split(placeholder).join(replacement);
        }

        // Step 6: Minify (AFTER string restoration)
        if (this.options.minify || this.options.intensity === 'high' || this.options.intensity === 'extreme') {
            result = this.minifyCode(result);
        }

        return result;
    }

    private renameIdentifiers(code: string): string {
        const letRegex = /\blet\s+(mut\s+)?([a-z_][a-zA-Z0-9_]*)/g;
        const fnRegex = /\bfn\s+([a-z_][a-zA-Z0-9_]*)/g;
        let match;

        while ((match = fnRegex.exec(code)) !== null) {
            const name = match[1];
            if (!this.reserved.has(name) && !this.varMap.has(name)) {
                this.varMap.set(name, '_' + this.generateConfusingName());
            }
        }
        while ((match = letRegex.exec(code)) !== null) {
            const name = match[2];
            if (!this.reserved.has(name) && !this.varMap.has(name)) {
                this.varMap.set(name, '_' + this.generateConfusingName());
            }
        }

        let result = code;
        this.varMap.forEach((newName, oldName) => {
            result = result.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
        });
        return result;
    }

    private generateConfusingName(): string {
        const chars = 'O0Il1_';
        let name = '';
        for (let i = 0; i < 8; i++) {
            name += chars[Math.floor(Math.random() * chars.length)];
        }
        return name + Math.random().toString(36).substr(2, 4);
    }

    private injectDeadCode(code: string): string {
        const lines = code.split('\n');
        const result: string[] = [];
        for (const line of lines) {
            result.push(line);
            if (Math.random() < 0.1 && line.trim().endsWith(';')) {
                result.push('let _ = 0;');
            }
        }
        return result.join('\n');
    }

    private minifyCode(code: string): string {
        // Remove blank lines and extra whitespace
        const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Join carefully - handle comments and braces properly
        const resultParts: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].replace(/\s+/g, ' ');
            const isFullLineComment = line.startsWith('//');
            const hasInlineComment = !isFullLineComment && /\s\/\//.test(line);
            const nextLine = lines[i + 1];
            const nextIsComment = nextLine && nextLine.trim().startsWith('//');
            const endsWithBrace = line.endsWith('}') || line.endsWith('{');

            if (isFullLineComment || hasInlineComment || nextIsComment) {
                resultParts.push(line + '\n');
            } else if (endsWithBrace) {
                resultParts.push(line + '\n');
            } else if (i === lines.length - 1) {
                resultParts.push(line);
            } else {
                resultParts.push(line + ' ');
            }
        }

        let result = resultParts.join('');

        // Compress spaces around operators but NOT inside comments
        const finalLines = result.split('\n');
        const processedLines: string[] = [];
        for (const line of finalLines) {
            if (line.trim().startsWith('//')) {
                processedLines.push(line);
            } else {
                const commentIdx = line.indexOf(' //');
                if (commentIdx > 0) {
                    const codePart = line.substring(0, commentIdx);
                    const commentPart = line.substring(commentIdx);
                    let compressed = codePart.replace(/\s*([;,=])\s*/g, '$1');
                    compressed = compressed.replace(/\b(fn|let|mut|if|else|for|while|return|pub|struct|impl|use)\b(?=[^\s])/g, '$1 ');
                    processedLines.push(compressed + commentPart);
                } else {
                    let compressed = line.replace(/\s*([;,=])\s*/g, '$1');
                    compressed = compressed.replace(/\b(fn|let|mut|if|else|for|while|return|pub|struct|impl|use)\b(?=[^\s])/g, '$1 ');
                    processedLines.push(compressed);
                }
            }
        }

        return processedLines.join('\n').trim();
    }
}
