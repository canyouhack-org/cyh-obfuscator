// Java Obfuscator - Hardcore with array encoding, control flow, string encryption
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class JavaObfuscator extends BaseObfuscator {
    private reserved = new Set([
        'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch',
        'char', 'class', 'const', 'continue', 'default', 'do', 'double',
        'else', 'enum', 'extends', 'final', 'finally', 'float', 'for',
        'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface',
        'long', 'native', 'new', 'package', 'private', 'protected', 'public',
        'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized',
        'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile',
        'while', 'true', 'false', 'null', 'String', 'System', 'out', 'println',
        'print', 'main', 'args', 'Object', 'Integer', 'Double', 'Float',
        'Boolean', 'Character', 'Byte', 'Short', 'Long', 'Math', 'Arrays',
        'Base64', 'getDecoder', 'decode', 'format', 'length'
    ]);

    obfuscate(code: string): string {
        let result = code;

        // Step 1: Remove comments
        if (this.options.removeComments) {
            result = this.removeMultiLineComments(result, '/*', '*/');
            result = this.removeSingleLineComments(result, '//');
        }

        // Step 2: Store strings
        const strings: { original: string; placeholder: string }[] = [];
        let strIdx = 0;
        result = result.replace(/"(?:[^"\\]|\\.)*"/g, (m) => {
            const ph = `__JAVASTR${strIdx}__`;
            strings.push({ original: m, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Step 3: Rename variables
        if (this.options.renameVariables) {
            result = this.renameIdentifiers(result);
        }

        // Step 4: Restore and encode strings
        for (const { original, placeholder } of strings) {
            let replacement = original;
            const content = original.slice(1, -1);

            if (content.length > 0 && content.length < 100) {
                if (this.options.base64Strings) {
                    // UTF-8 safe base64 encoding using StandardCharsets to avoid checked exception
                    const utf8Bytes = Array.from(new TextEncoder().encode(content));
                    const b64 = btoa(String.fromCharCode(...utf8Bytes));
                    replacement = `new String(java.util.Base64.getDecoder().decode("${b64}"),java.nio.charset.StandardCharsets.UTF_8)`;
                } else if (this.options.hexEncoding && this.options.encodeStrings) {
                    // XOR-based string encryption like JObfuscator
                    replacement = this.encryptString(content);
                } else if (this.options.unicodeEscape && this.options.encodeStrings) {
                    // Use proper Unicode escaping for full UTF-8 support
                    const unicode = [...content].map(c => {
                        const code = c.codePointAt(0) || 0;
                        if (code > 0xFFFF) {
                            // Surrogate pair for characters outside BMP
                            const h = Math.floor((code - 0x10000) / 0x400) + 0xD800;
                            const l = ((code - 0x10000) % 0x400) + 0xDC00;
                            return `\\u${h.toString(16).padStart(4, '0')}\\u${l.toString(16).padStart(4, '0')}`;
                        }
                        return `\\u${code.toString(16).padStart(4, '0')}`;
                    }).join('');
                    replacement = `"${unicode}"`;
                }
            }
            result = result.replace(placeholder, replacement);
        }

        // Step 5: Dead code injection
        if (this.options.deadCodeInjection) {
            result = this.injectDeadCode(result);
        }

        // Step 6: Apply complexity based on intensity
        const intensity = this.options.intensity;

        if (intensity === 'extreme' || intensity === 'high' || this.options.minify) {
            result = this.minifyCode(result);
        }

        return result;
    }

    private encryptString(str: string): string {
        // XOR-based string encryption similar to JObfuscator
        const key = Math.floor(Math.random() * 100) + 1;
        const chars = str.split('').map((c, i) => {
            const encrypted = c.charCodeAt(0) ^ (key + i);
            return `0x${encrypted.toString(16).padStart(4, '0').toUpperCase()}`;
        });

        const varName = this.generateConfusingName();
        const arrName = this.generateConfusingName();
        const loopVar = this.generateConfusingName();
        const tempVar = this.generateConfusingName();

        // Generate inline decryption
        return `((java.util.function.Supplier<String>)()->{int[] ${arrName}={${chars.join(',')}};StringBuilder ${varName}=new StringBuilder();for(int ${loopVar}=0;${loopVar}<${arrName}.length;${loopVar}++){int ${tempVar}=${arrName}[${loopVar}];${tempVar}^=${key}+${loopVar};${varName}.append((char)(${tempVar}&0xFF));}return ${varName}.toString();}).get()`;
    }

    private renameIdentifiers(code: string): string {
        const varMap = new Map<string, string>();
        const varRegex = /(int|long|short|byte|float|double|char|boolean|String|var|final)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        let match;

        while ((match = varRegex.exec(code)) !== null) {
            const name = match[2];
            if (!this.reserved.has(name) && !varMap.has(name)) {
                varMap.set(name, this.generateConfusingName());
            }
        }

        let result = code;
        varMap.forEach((newName, oldName) => {
            result = result.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
        });
        return result;
    }

    private generateConfusingName(): string {
        // Generate names like JObfuscator: _KhlYbJNlonwV_I_OOZKAb_
        const chars = 'O0Il1_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let name = '_';
        for (let i = 0; i < 8; i++) {
            name += chars[Math.floor(Math.random() * chars.length)];
        }
        return name + Math.random().toString(36).substr(2, 4);
    }

    private injectDeadCode(code: string): string {
        const lines = code.split('\n');
        const result: string[] = [];
        const deadSnippets = [
            'if(false){}',
            'if(1==0){}',
        ];

        for (const line of lines) {
            result.push(line);
            const trimmed = line.trim();
            // Don't add dead code after return, throw, break, continue - causes unreachable statement
            const hasTerminator = /\b(return|throw|break|continue)\b/.test(trimmed);
            if (Math.random() < 0.1 && trimmed.endsWith(';') && !hasTerminator) {
                result.push(deadSnippets[Math.floor(Math.random() * deadSnippets.length)]);
            }
        }
        return result.join('\n');
    }

    private minifyCode(code: string): string {
        let result = code;
        // Always remove inline comments before minifying - they break single-line output
        result = result.replace(/\/\/.*$/gm, '');
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        // Remove extra whitespace
        result = result.replace(/  +/g, ' ');
        result = result.replace(/\n\s*/g, ' ');
        // Remove space around operators (careful with keywords)
        result = result.replace(/\s*([{};,()=+\-*/<>!&|?:])\s*/g, '$1');
        // Add back necessary spaces after keywords
        result = result.replace(/\b(public|private|protected|static|final|void|int|long|double|float|boolean|char|byte|short|class|interface|extends|implements|new|return|throw|throws|if|else|for|while|do|switch|case|break|continue|try|catch|finally|import|package)\b(?=[^\s])/g, '$1 ');
        // Clean up
        result = result.replace(/;+/g, ';');
        result = result.replace(/\s+/g, ' ');
        return result.trim();
    }
}
