// Perl Obfuscator - Fixed string interpolation, comments, and minification
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class PerlObfuscator extends BaseObfuscator {
    private reserved = new Set([
        'if', 'elsif', 'else', 'unless', 'while', 'until', 'for', 'foreach', 'do',
        'last', 'next', 'redo', 'goto', 'return', 'sub', 'my', 'our', 'local', 'use',
        'no', 'require', 'package', 'BEGIN', 'END', 'print', 'say', 'die', 'warn',
        'open', 'close', 'read', 'write', 'push', 'pop', 'shift', 'unshift', 'chomp',
        'chop', 'split', 'join', 'sort', 'reverse', 'map', 'grep', 'scalar', 'ref',
        'defined', 'undef', 'exists', 'delete', 'keys', 'values', 'each', 'length'
    ]);

    private varMap = new Map<string, string>();

    obfuscate(code: string): string {
        let result = code;
        this.varMap.clear();

        // Step 1: Extract strings FIRST to protect $ and # inside strings
        const strings: { original: string; placeholder: string }[] = [];
        let strIdx = 0;

        // Extract single-quoted strings (no interpolation)
        result = result.replace(/'(?:[^'\\]|\\.)*'/g, (m) => {
            const ph = `___PLSTR_${strIdx}_PLACEHOLDER___`;
            strings.push({ original: m, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Extract double-quoted strings (has interpolation)
        result = result.replace(/"(?:[^"\\]|\\.)*"/g, (m) => {
            const ph = `___PLSTR_${strIdx}_PLACEHOLDER___`;
            strings.push({ original: m, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Step 2: Remove comments (now safe - strings are protected)
        if (this.options.removeComments) {
            // Remove single-line comments - but not on lines that are just placeholders
            result = result.replace(/(?<![_a-zA-Z0-9])#[^\n]*/g, '');
            // Remove POD documentation
            result = result.replace(/^=\w+[\s\S]*?^=cut\s*$/gm, '');
        }

        // Step 3: Rename variables
        if (this.options.renameVariables) {
            result = this.renameIdentifiers(result);
        }

        // Step 4: Dead code injection
        if (this.options.deadCodeInjection) {
            result = this.injectDeadCode(result);
        }

        // Step 5: Minify
        if (this.options.minify || this.options.intensity === 'high' || this.options.intensity === 'extreme') {
            result = this.minifyCode(result);
        }

        // Step 6: Restore strings with interpolation variable renaming
        let needsBase64Module = false;
        for (const { original, placeholder } of strings) {
            let replacement = original;
            const quote = original[0];
            const content = original.slice(1, -1);
            const hasInterpolation = quote === '"' && /\$[a-zA-Z_]/.test(content);

            if (hasInterpolation && this.options.renameVariables) {
                // Rename variables inside interpolation $var
                replacement = replacement.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, varName) => {
                    const newName = this.varMap.get(varName);
                    return newName ? `$${newName}` : match;
                });
            } else if (!hasInterpolation && content.length > 0 && content.length < 100 && quote === '"') {
                // Only encode if NO interpolation
                if (this.options.base64Strings) {
                    const utf8Bytes = Array.from(new TextEncoder().encode(content));
                    const b64 = btoa(String.fromCharCode(...utf8Bytes));
                    replacement = `decode_base64('${b64}')`;
                    needsBase64Module = true;
                } else if (this.options.hexEncoding && this.options.encodeStrings) {
                    const hex = content.split('').map(c => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
                    replacement = `"${hex}"`;
                }
            }
            result = result.split(placeholder).join(replacement);
        }

        // Add MIME::Base64 import if needed
        if (needsBase64Module) {
            result = "use MIME::Base64;\n" + result;
        }

        return result;
    }

    private renameIdentifiers(code: string): string {
        const myRegex = /\bmy\s+\$([a-zA-Z_][a-zA-Z0-9_]*)/g;
        const subRegex = /\bsub\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let match;

        while ((match = subRegex.exec(code)) !== null) {
            const name = match[1];
            if (!this.reserved.has(name) && !this.varMap.has(name)) {
                this.varMap.set(name, '_' + this.generateConfusingName());
            }
        }
        while ((match = myRegex.exec(code)) !== null) {
            const name = match[1];
            if (!this.reserved.has(name) && !this.varMap.has(name)) {
                this.varMap.set(name, '_' + this.generateConfusingName());
            }
        }

        let result = code;
        this.varMap.forEach((newName, oldName) => {
            result = result.replace(new RegExp(`\\$${oldName}\\b`, 'g'), `$${newName}`);
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
            if (Math.random() < 0.1 && line.trim().endsWith(';') && !line.trim().startsWith('#')) {
                result.push('1;');
            }
        }
        return result.join('\n');
    }

    private minifyCode(code: string): string {
        // Remove blank lines and extra whitespace
        const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Join carefully - handle comments properly
        const resultParts: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].replace(/\s+/g, ' ');
            const isFullLineComment = line.startsWith('#');
            // Check for inline comment (code followed by #)
            const hasInlineComment = !isFullLineComment && /\s#/.test(line);
            const nextLine = lines[i + 1];
            const nextIsComment = nextLine && nextLine.trim().startsWith('#');
            const endsWithBrace = line.endsWith('}') || line.endsWith('{');

            if (isFullLineComment || hasInlineComment || nextIsComment || endsWithBrace) {
                // Lines with comments or braces need newline separation
                resultParts.push(line + '\n');
            } else if (i === lines.length - 1) {
                resultParts.push(line);
            } else {
                resultParts.push(line + ' ');
            }
        }

        let result = resultParts.join('');

        // Compress spaces but NOT inside comments
        // Process line by line to avoid breaking comments
        const finalLines = result.split('\n');
        const processedLines: string[] = [];
        for (const line of finalLines) {
            if (line.trim().startsWith('#')) {
                // Keep comment lines as-is
                processedLines.push(line);
            } else {
                // Check for inline comment
                const commentIdx = line.search(/\s#/);
                if (commentIdx > 0) {
                    // Split code and comment
                    const codePart = line.substring(0, commentIdx);
                    const commentPart = line.substring(commentIdx);
                    // Compress only the code part - but keep space before {
                    let compressed = codePart.replace(/\s*([;,=])\s*/g, '$1');
                    compressed = compressed.replace(/\b(sub|my|if|else|for|foreach|while|return|use)\b(?=[^\s])/g, '$1 ');
                    processedLines.push(compressed + commentPart);
                } else {
                    // No comment, compress normally - but keep space before {
                    let compressed = line.replace(/\s*([;,=])\s*/g, '$1');
                    compressed = compressed.replace(/\b(sub|my|if|else|for|foreach|while|return|use)\b(?=[^\s])/g, '$1 ');
                    processedLines.push(compressed);
                }
            }
        }

        return processedLines.join('\n').trim();
    }
}
