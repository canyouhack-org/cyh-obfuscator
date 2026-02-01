// Bash/Shell Obfuscator - Fixed string interpolation, comments, and minification
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class BashObfuscator extends BaseObfuscator {
    private reserved = new Set([
        'if', 'then', 'else', 'elif', 'fi', 'case', 'esac', 'for', 'while', 'until',
        'do', 'done', 'in', 'function', 'select', 'time', 'coproc', 'echo', 'printf',
        'read', 'exit', 'return', 'break', 'continue', 'declare', 'local', 'export',
        'readonly', 'unset', 'shift', 'set', 'trap', 'eval', 'exec', 'source', 'true', 'false'
    ]);

    private varMap = new Map<string, string>();

    obfuscate(code: string): string {
        let result = code;
        this.varMap.clear();

        // Preserve shebang
        let shebang = '';
        if (result.startsWith('#!')) {
            const idx = result.indexOf('\n');
            shebang = result.slice(0, idx + 1);
            result = result.slice(idx + 1);
        }

        // Step 1: Extract strings FIRST to protect $ and # inside strings
        const strings: { original: string; placeholder: string }[] = [];
        let strIdx = 0;

        // Extract single-quoted strings (no interpolation)
        result = result.replace(/'[^']*'/g, (m) => {
            const ph = `___BASHSTR_${strIdx}_PLACEHOLDER___`;
            strings.push({ original: m, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Extract double-quoted strings (has interpolation)
        result = result.replace(/"(?:[^"\\]|\\.)*"/g, (m) => {
            const ph = `___BASHSTR_${strIdx}_PLACEHOLDER___`;
            strings.push({ original: m, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Step 2: Remove comments (now safe - strings are protected)
        if (this.options.removeComments) {
            // Remove single-line comments # (but not shebang which is already extracted)
            result = result.replace(/(?<![_a-zA-Z0-9])#[^\n]*/g, '');
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
        for (const { original, placeholder } of strings) {
            let replacement = original;
            const quote = original[0];
            const content = original.slice(1, -1);
            const hasInterpolation = quote === '"' && /\$[a-zA-Z_{]/.test(content);

            if (hasInterpolation && this.options.renameVariables) {
                // Rename variables inside interpolation $var and ${var}
                replacement = replacement.replace(/\$\{?([a-zA-Z_][a-zA-Z0-9_]*)\}?/g, (match, varName) => {
                    const newName = this.varMap.get(varName);
                    if (newName) {
                        return match.includes('{') ? `\${${newName}}` : `$${newName}`;
                    }
                    return match;
                });
            } else if (!hasInterpolation && content.length > 0 && content.length < 100 && quote === '"') {
                // Only encode if NO interpolation
                if (this.options.base64Strings) {
                    const utf8Bytes = Array.from(new TextEncoder().encode(content));
                    const b64 = btoa(String.fromCharCode(...utf8Bytes));
                    replacement = `$(echo '${b64}'|base64 -d)`;
                } else if (this.options.hexEncoding && this.options.encodeStrings) {
                    const hex = content.split('').map(c => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
                    replacement = `$'${hex}'`;
                }
            }
            result = result.split(placeholder).join(replacement);
        }

        return shebang + result;
    }

    private renameIdentifiers(code: string): string {
        const varRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)=/g;
        let match;

        while ((match = varRegex.exec(code)) !== null) {
            const name = match[1];
            if (!this.reserved.has(name) && !this.varMap.has(name)) {
                this.varMap.set(name, '_' + this.generateConfusingName());
            }
        }

        let result = code;
        this.varMap.forEach((newName, oldName) => {
            result = result.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
            result = result.replace(new RegExp(`\\$\\{?${oldName}\\}?`, 'g'), `$${newName}`);
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
            if (Math.random() < 0.1 && line.trim() && !line.trim().startsWith('#')) {
                result.push(':');
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
            // Keywords that need special handling
            const needsNewline = /\b(then|do|else|elif)\s*$/.test(line) || line.endsWith('{');

            if (isFullLineComment || hasInlineComment || nextIsComment) {
                // Lines with comments need newline separation
                resultParts.push(line + '\n');
            } else if (i === lines.length - 1) {
                resultParts.push(line);
            } else if (needsNewline) {
                resultParts.push(line + '\n');
            } else {
                resultParts.push(line + ';');
            }
        }

        let result = resultParts.join('');

        // Compress spaces but NOT inside comments
        const finalLines = result.split('\n');
        const processedLines: string[] = [];
        for (const line of finalLines) {
            if (line.trim().startsWith('#')) {
                processedLines.push(line);
            } else {
                const commentIdx = line.indexOf(' #');
                if (commentIdx > 0) {
                    const codePart = line.substring(0, commentIdx);
                    const commentPart = line.substring(commentIdx);
                    processedLines.push(codePart + commentPart);
                } else {
                    processedLines.push(line);
                }
            }
        }

        result = processedLines.join('\n');
        result = result.replace(/;+/g, ';').replace(/;\s*$/g, '');

        return result.trim();
    }
}
