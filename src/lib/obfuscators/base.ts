// Base obfuscator class with common utilities

import type { ObfuscationOptions } from './types';

export abstract class BaseObfuscator {
    protected options: ObfuscationOptions;
    protected variableMap: Map<string, string> = new Map();
    protected counter: number = 0;

    constructor(options: ObfuscationOptions) {
        this.options = options;
    }

    abstract obfuscate(code: string): string;

    // Generate unreadable variable names
    protected generateVarName(): string {
        const chars = ['_', '$', 'O', '0', 'l', 'I', '1'];
        const intensity = this.getIntensityMultiplier();
        let name = '';

        // First character must be valid identifier start
        name += chars[Math.floor(Math.random() * 2)]; // _ or $

        // Generate confusing name
        const length = 4 + Math.floor(Math.random() * intensity * 4);
        for (let i = 0; i < length; i++) {
            name += chars[Math.floor(Math.random() * chars.length)];
        }

        this.counter++;
        return name + this.counter.toString(36);
    }

    // Generate extremely confusing variable names using unicode
    protected generateUnicodeVarName(): string {
        const confusingChars = [
            '\u0430', // Cyrillic 'а' looks like Latin 'a'
            '\u0435', // Cyrillic 'е' looks like Latin 'e'  
            '\u043E', // Cyrillic 'о' looks like Latin 'o'
            '\u0440', // Cyrillic 'р' looks like Latin 'p'
            '\u0441', // Cyrillic 'с' looks like Latin 'c'
            '\u0443', // Cyrillic 'у' looks like Latin 'y'
            '\u0445', // Cyrillic 'х' looks like Latin 'x'
            '\u0456', // Cyrillic 'і' looks like Latin 'i'
        ];

        let name = '_';
        const length = 5 + Math.floor(Math.random() * 5);
        for (let i = 0; i < length; i++) {
            name += confusingChars[Math.floor(Math.random() * confusingChars.length)];
        }

        this.counter++;
        return name + this.counter;
    }

    protected getIntensityMultiplier(): number {
        switch (this.options.intensity) {
            case 'low': return 1;
            case 'medium': return 2;
            case 'high': return 3;
            case 'extreme': return 5;
            default: return 1;
        }
    }

    // Encode string to hex
    protected toHex(str: string): string {
        return str.split('').map(c => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    }

    // Encode string to unicode escape
    protected toUnicode(str: string): string {
        return str.split('').map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join('');
    }

    // Encode string to base64
    protected toBase64(str: string): string {
        return btoa(unescape(encodeURIComponent(str)));
    }

    // Generate dead code that looks realistic
    protected generateDeadCode(): string {
        const deadCodeTemplates = [
            'if(false){console.log("");}',
            'for(let _=0;_<0;_++){}',
            'while(false){break;}',
            'try{}catch(_){}',
            '(function(){})();',
            'void 0;',
            'undefined&&(()=>{})();',
            '0&&console.log("");',
        ];

        const count = this.getIntensityMultiplier();
        let deadCode = '';
        for (let i = 0; i < count; i++) {
            deadCode += deadCodeTemplates[Math.floor(Math.random() * deadCodeTemplates.length)];
        }
        return deadCode;
    }

    // Remove single-line comments
    protected removeSingleLineComments(code: string, commentChar: string = '//'): string {
        const lines = code.split('\n');
        return lines.map(line => {
            const idx = line.indexOf(commentChar);
            if (idx !== -1) {
                // Check if inside string
                const beforeComment = line.substring(0, idx);
                const singleQuotes = (beforeComment.match(/'/g) || []).length;
                const doubleQuotes = (beforeComment.match(/"/g) || []).length;
                if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0) {
                    return line.substring(0, idx).trimEnd();
                }
            }
            return line;
        }).filter(line => line.trim() !== '').join('\n');
    }

    // Remove multi-line comments
    protected removeMultiLineComments(code: string, start: string = '/*', end: string = '*/'): string {
        let result = code;
        let startIdx = result.indexOf(start);
        while (startIdx !== -1) {
            const endIdx = result.indexOf(end, startIdx);
            if (endIdx !== -1) {
                result = result.substring(0, startIdx) + result.substring(endIdx + end.length);
            } else {
                break;
            }
            startIdx = result.indexOf(start);
        }
        return result;
    }

    // Shuffle array using Fisher-Yates
    protected shuffle<T>(array: T[]): T[] {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // Compress whitespace
    protected compressWhitespace(code: string): string {
        return code
            .replace(/\s+/g, ' ')
            .replace(/\s*([{}\[\]();,:])\s*/g, '$1')
            .replace(/\s*([=+\-*/<>!&|])\s*/g, '$1')
            .trim();
    }

    // Reserved words - to be overridden by subclasses
    protected reservedWords: string[] = [];

    // Check if word is reserved
    protected isReserved(word: string): boolean {
        return this.reservedWords.some(r =>
            r.toLowerCase() === word.toLowerCase()
        );
    }
}

