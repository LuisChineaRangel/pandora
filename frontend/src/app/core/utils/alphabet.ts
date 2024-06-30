export const languages : { [key: string]: string } = {
    "english": "abcdefghijklmnopqrstuvwxyz",
    "spanish": "abcdefghijklmnñopqrstuvwxyz",
    "catalan": "abcçdefghijklmnopqrstuvwxyz",
    "german": "abcdefghijklmnopqrstuvwxyzäöü",
    "french": "abcdefghijklmnopqrstuvwxyzàâæçéèêëîïôœùûü",
    "italian": "abcdefghijklmnopqrstuvwxyzàèéìîòóù",
    "portuguese": "abcdefghijklmnopqrstuvwxyzàáâãçéêíóôõú",
    "russian": "абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
    "greek": "αβγδεζηθικλμνξοπρστυφχψω",
    "hebrew": "אבגדהוזחטיכלמנסעפצקרשת",
    "arabic": "ابتثجحخدذرزسشصضطظعغفقكلمنهوي",
    "hindi": "अआइईउऊऋएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह",
    "japanese_hiragana": "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん",
    "japanese_katakana": "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン",
    "korean": "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ",
    "base64": "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
    "ascii": " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~",
    "utf-8": " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ",
}

export const options = {
    "case-insensitive": false,
    "alphanumeric": false,
    "uppercase": false,
    "lower-upper": false,
}

export const string_format : { [key: string]: number } = {
    "binary": 2,
    "octal": 8,
    "decimal": 10,
}

export const special : { [key: string]: string } = {
    "hexadecimal": "0123456789ABCDEF",
    "roman": "IVXLCDM",
}

/**
 * Abstract class for the alphabet
 * @class BasicAlphabet
 * @abstract
 */
abstract class BasicAlphabet {
    protected _characters: Set<string> = new Set();

    constructor() {
        if (new.target === BasicAlphabet) {
            throw new Error("Cannot instantiate abstract class");
        }
    }

    toString(): string {
        return this.characters.join("");
    }

    abstract get characters(): string[];
}


/**
 * Class for the alphabet
 * @class Alphabet
 * @extends BasicAlphabet
 * @param {string} characters Characters of the alphabet
 * @param {string} language Language of the alphabet
 */
export class Alphabet extends BasicAlphabet {

    static readonly languages = languages;
    options = options;

    /**
     * Constructor of the class
     * @constructor
     * @param {string} characters Characters of the alphabet. It can be a language
     */
    constructor(characters = "") {
        super();
        if (characters in Alphabet.languages)
            this.language = characters;
        else
            this._characters = new Set(Array.from(characters));
    }

    /**
     * Get the characters of the alphabet
     * @returns {Array} Characters of the alphabet. If the option "alphanumeric" is enabled, it will return the characters of the alphabet plus the characters of the numeric system
     */
    get characters() {
        let characters: Array<string> = Array.from(this._characters);
        if (this.options["uppercase"])
            characters = Array.from(new Set(characters.map(c => c.toUpperCase())));
        if (this.options["lower-upper"])
            characters = Array.from(new Set(characters.concat(characters.map(c => c.toUpperCase()))));
        if (this.options["alphanumeric"])
            characters = Array.from(new Set(characters.concat(Array.from(new NumericSystem().characters))));
        return characters;
    }

    set language(language: string) {
        if (language in Alphabet.languages)
            this._characters = new Set(Array.from(Alphabet.languages[language]));
    }
}

/**
 * Class for the numeric system
 * @class NumericSystem
 * @extends BasicAlphabet
 * @param {number} base Base of the numeric system
 * @param {string} string_format String format of the numeric system
 * @param {string} special Special numeric system
 */
export class NumericSystem extends BasicAlphabet {
    protected _base: number | string = Number();
    static readonly string_format = string_format;
    static readonly special = special;

    /**
     * Constructor of the class
     * @constructor
     * @param {number} base Base of the numeric system. It can be a number, a string format or a special numeric system
     */
    constructor(base : number | string = 10) {
        super();
        this.base = base;
    }

    /**
     * Get the base of the numeric system
     * @returns {number} Base of the numeric system
     */
    get base() {
        return this._base;
    }

    /**
     * Set the base of the numeric system
     * @param {number} base Base of the numeric system. It can be a number, a string format or a special numeric system
     * @throws {Error} Invalid base
     */
    set base(base : number | string) {
        if (typeof base !== 'number' && !(base in NumericSystem.string_format) && !(base in NumericSystem.special))
            throw new Error("Invalid base");
        if (base in NumericSystem.string_format)
            this._base = NumericSystem.string_format[base];
        else
            this._base = base;
        console.log(this.toString());
    }

    /**
     * Get the characters of the numeric system
     * @returns {Array} Characters of the numeric system
     */
    get characters() {
        if (this._base in NumericSystem.special)
            return Array.from(NumericSystem.special[this._base]);
        return Array.from({ length: this._base as number }, (_, i) => i.toString());
    }
}
