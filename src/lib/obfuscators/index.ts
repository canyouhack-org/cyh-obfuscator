// Obfuscator Factory - Main entry point
import type { ObfuscationOptions, SupportedLanguage } from './types';
import { defaultOptions } from './types';
import { JavaScriptObfuscator } from './javascript';
import { PythonObfuscator } from './python';
import { JavaObfuscator } from './java';
import { CppObfuscator } from './cpp';
import { CSharpObfuscator } from './csharp';
import { GoObfuscator } from './go';
import { PhpObfuscator } from './php';
import { RubyObfuscator } from './ruby';
import { RustObfuscator } from './rust';
import { PowerShellObfuscator } from './powershell';
import { BashObfuscator } from './bash';
import { LuaObfuscator } from './lua';
import { PerlObfuscator } from './perl';
import { ScalaObfuscator } from './scala';
import { DartObfuscator } from './dart';
import { GroovyObfuscator } from './groovy';

import { SqlObfuscator } from './sql';
import { HtmlObfuscator } from './html';
import { CssObfuscator } from './css';
import { GenericObfuscator } from './generic';
import { BaseObfuscator } from './base';

export function createObfuscator(language: SupportedLanguage, options: Partial<ObfuscationOptions> = {}): BaseObfuscator {
    const opts: ObfuscationOptions = { ...defaultOptions, ...options };
    const map: Record<string, new (o: ObfuscationOptions) => BaseObfuscator> = {
        javascript: JavaScriptObfuscator,
        python: PythonObfuscator,
        java: JavaObfuscator,
        cpp: CppObfuscator,
        csharp: CSharpObfuscator,
        go: GoObfuscator,
        php: PhpObfuscator,
        ruby: RubyObfuscator,
        rust: RustObfuscator,
        powershell: PowerShellObfuscator,
        bash: BashObfuscator,
        lua: LuaObfuscator,
        perl: PerlObfuscator,
        scala: ScalaObfuscator,
        dart: DartObfuscator,
        groovy: GroovyObfuscator,
        sql: SqlObfuscator,
        html: HtmlObfuscator,
        css: CssObfuscator,
    };
    const Ctor = map[language] || GenericObfuscator;
    return new Ctor(opts);
}

export function obfuscateCode(code: string, language: SupportedLanguage, options: Partial<ObfuscationOptions> = {}): string {
    return createObfuscator(language, options).obfuscate(code);
}

export { defaultOptions, type ObfuscationOptions, type SupportedLanguage } from './types';
export { SUPPORTED_LANGUAGES, presets, LANGUAGE_CATEGORIES } from './types';
