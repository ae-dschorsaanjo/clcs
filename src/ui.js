import { ansResetter, clcs, DIGITS, OPERATIONS, precisionDefault, usedSymbols } from "./clcs.js";

const MAIN = document.getElementById("main");

function setFontSize(size) {
    document.documentElement.style.setProperty('--font-size', size + "px");
    return size;
}

function getFontSize() {
    return parseFloat(getComputedStyle(document.documentElement).fontSize) / 12;
}

const fontSize = new (class {
    #size = 3;
    #fontBase = 12;
    constructor() {
        setFontSize(this.#size * this.#fontBase);
    }
    increase() {
        return setFontSize(++this.#size * this.#fontBase);
    }
    decrease() {
        if (this.#size > 1) return setFontSize(--this.#size * this.#fontBase);
        return getFontSize();
    }
    getOneSmaller() {
        return this.#size > 1 ? (this.#size - 1) * this.#fontBase : this.#fontBase;
    }
})();

const precision = new (class {
    #precision = precisionDefault;
    #precisionMinimum = 0;
    #precisionMaximum = 9;
    #precisionPossible = [];
    constructor() {
        for (let i = this.#precisionMinimum; i <= this.#precisionMaximum; i++) {
            if (i === precisionDefault) continue;
            this.#precisionPossible.push(this.className(i));
        }
    }
    className(number) {
        return `p${number}`;
    }
    get value() {
        return this.#precision;
    }
    get minimum() {
        return this.#precisionMinimum;
    }
    get maximum() {
        return this.#precisionMaximum;
    }
    get possibles() {
        return this.#precisionPossible;
    }
    increase() {
        if (this.#precision < this.#precisionMaximum) this.#precision++;
        return this.#precision;
    }
    decrease() {
        if (this.#precision > this.#precisionMinimum) this.#precision--;
        return this.#precision;
    }
    reset() {
        this.#precision = precisionDefault;
    }
})();

/** @type {Boolean} */
let useVerbose = null;

/**
 * Creates a div with given content
 * 
 * @param {string|string[]} class_ 
 * @param {any} content 
 * @returns {HTMLDivElement}
 */
function divBuilder(class_, content) {
    const div = document.createElement("div");

    if (typeof class_ === "string") {
        div.classList.add(class_);
    }
    else {
        div.classList.add(...class_);
    }

    if (content !== null && content !== undefined) {
        div.appendChild(document.createTextNode(content));
    }

    return div;
}

/**
 * @type {HTMLDivElement}
 */
let currentInput;

/**
 * @type {HTMLDivElement?}
 */
let lastError = null;

/**
 * @class A class to manage the history of user inputs.
 */
const inputHistory = new (class InputHistory {
    /** @type {string[]} */
    #inputs = [ansResetter];
    /** @type {number?} */
    #currentIndex = null;
    /** @type {string?} */
    #currentInput = null;
    /** @param {string} input */
    constructor() {
        this.resetHistory();
    }
    /** @param {string} input New input */
    add(input) {
        this.#currentIndex = null;
        const inputIndex = this.#inputs.indexOf(input);
        if (inputIndex === this.#inputs.length - 1) {
            return;
        }
        else if (inputIndex !== -1 && inputIndex !== this.#inputs.length - 1) {
            this.#inputs.splice(inputIndex, 1);
        }
        this.#inputs.push(input);
    }
    /** @return {boolean} Whether currentIndex was set */
    #stepCommon(input) {
        if (this.#currentInput === null) {
            this.#currentInput = input || "";
        }
        if (this.#currentIndex === null) {
            this.#currentIndex = this.#inputs.length - 1;
            return true;
        }
        return false;
    }
    /**
     * @param {string} input Current live input
     * @returns {string}
     */
    previous(input) {
        const didSet = this.#stepCommon(input);

        if (didSet || this.#currentIndex === 0) {
            return this.#inputs[this.#currentIndex];
        }
        return this.#inputs[--this.#currentIndex];
    }
    /** 
     * @param {string} input
     * @returns {string}
     */
    next(input) {
        const didSet = this.#stepCommon(input);

        if (didSet) {
            return this.#inputs[this.#currentIndex];
        }

        if (this.#currentIndex === this.#inputs.length - 1) {
            this.#currentIndex++;
            return this.#currentInput;
        }
        else if (this.#currentIndex >= this.#inputs.length) {
            return this.#currentInput;
        }

        return this.#inputs[++this.#currentIndex];
    }
    resetInput() {
        this.#currentIndex = null;
        this.#currentInput = null;
    }
    resetHistory() {
        this.#inputs = [ansResetter];
        this.resetInput();
    }
    toString() {
        return `currentIndex: ${this.#currentIndex}
currentInput: "${this.#currentInput}"
inputs: ${this.#inputs.join(",\n        ")}`;
    }
})();

/**
 * CSS class names
 * @type {Object<string, string>}
 */
const cls = Object.freeze({
    current: "current",
    cursor: "cursor",
    error: "err",
    help: "help",
    result: "hi",
    hidden: "hidden",
    input: "input",
    io: "io",
    verbose: "verbose",
});

/**
 * Represents a key with an associated name.
 */
class Key {
    #key;
    #name;
    #display;
    /**
     * @param {string} key as understood by code.
     * @param {string} name as displayed to user.
     * @param {boolean} display on 3 characters (right aligned).
     */
    constructor(key, name, display = false) {
        this.#key = key;
        this.#name = name;
        this.#display = display;
    }

    /**
     * Gets the key value.
     * @type {string}
     */
    get key() {
        return this.#key;
    }

    /**
     * Gets the name associated with the key.
     * @type {string}
     */
    get name() {
        if (this.#display) {
            return this.#name.padStart(3, " ");
        }
        return this.#name;
    }
}

/**
 * Keyboard keys and names
 * @type {Object<string, Key>}
 */
const keys = Object.freeze({
    esc: new Key("Escape", "Esc", true),
    up: new Key("ArrowUp", "↑", true),
    down: new Key("ArrowDown", "↓", true),
    tab: new Key("Tab", "Tab"),
    enter: new Key("Enter", "Enter"),
    backspace: new Key("Backspace", "Backspace"),
    plus: new Key("+", "+", true),
    minus: new Key("-", "-", true),
    equal: new Key("=", "=", true),
    p: new Key("p", "p", true),
    o: new Key("o", "o", true),
    one: new Key("1", "1", true),
    two: new Key("2", "2", true),
    three: new Key("3", "3", true),
    four: new Key("4", "4", true),
    g: new Key("g", "g", true),
    r: new Key("r", "r", true),
    v: new Key("v", "v", true),
    ctrl: new Key("Control", "Ctrl"),
    shift: new Key("Shift", "Shift"),
    alt: new Key("Alt", "Alt"),
    meta: new Key("Meta", "Meta"),
    parOpen: new Key("(", "("),
    parClose: new Key(")", ")"),
    bar: new Key("|", "|"),
    barBroken: new Key("¦", "¦"),
    space: new Key(" ", "Space"),
    comma: new Key(",", ","),
    period: new Key(".", "."),
});

const replaceKeys = Object.freeze({
    [keys.comma.key]: keys.period.key,
    [keys.tab.key]: keys.space.key,
});

const colorScheme = new (class Colors {
    #current = null;
    #available = new Set([keys.one.key, keys.two.key, keys.three.key, keys.four.key]);
    constructor() {
        this.setScheme(keys.one.key);
    }
    setScheme(scheme) {
        if (this.#current) {
            document.documentElement.classList.remove(this.#current);
        }
        this.#current = `c${scheme}`;
        document.documentElement.classList.add(this.#current);
    }
    get available() {
        return this.#available;
    }
})();

/** @type {HTMLDivElement} */
const container = divBuilder(cls.io);

/** @type {HTMLDivElement} */
const help = divBuilder([cls.help, cls.hidden], `The following keys have functions:

    ${keys.esc.name} : Toggle help
    ${keys.up.name} : Previous input
    ${keys.down.name} : Next input

${keys.alt.name} + 
    ${keys.equal.name} : Increase font size
    ${keys.minus.name} : Decrease font size
    ${keys.p.name} : Increase precision
    ${keys.o.name} : Decrease precision
    ${keys.one.name} : Color Scheme Classic
    ${keys.two.name} : Color Scheme Matrix
    ${keys.three.name} : Color Scheme Snow
    ${keys.four.name} : Color Scheme Wood
    ${keys.g.name} : Open on GitHub
    ${keys.r.name} : Soft reset (may not work with
                      Nvidia GPUs)
    ${keys.v.name} : Toggle verbose mode

${keys.ctrl.name} + ${keys.shift.name} +
    ${keys.r.name} : Hard reset
`);

/** Toggles the help overlay. */
function toggleHelp() {
    const ccl = container.classList;
    const hcl = help.classList;
    ccl.toggle(cls.hidden);
    if (ccl.contains(cls.hidden) === hcl.contains(cls.hidden)) {
        hcl.toggle(cls.hidden);
    }
    return hcl.contains(cls.hidden);
}

function scrollToBottom() {
    document.body.scrollTop = document.body.scrollHeight;
    document.documentElement.scrollTop = document.documentElement.scrollHeight;
}

/**
 * Counts the occurences of `char` in `input`.
 * 
 * If an empty string is given as `char`, the function will always return 0.
 * 
 * @param {string} input Haystack
 * @param {string} char Needle (single character; if longer, only the first character is used)
 * @returns {number}
 */
function occurences(input, char) {
    if (char === "") return 0;
    char = char.charAt(0);
    return [...input].filter(c => c === char).length;
}

/**
 * Appends a new text node containing `str` to `currentInput` and scrolls to bottom.
 * 
 * @param {HTMLDivElement} currentInput 
 * @param {string} str
 */
function appendTextNode(currentInput, str) {
    if (str.length === 0) return;
    currentInput.appendChild(document.createTextNode(str));
    scrollToBottom();
}

/**
 * 
 * @param {HTMLDivElement} element 
 * @param {string} class_ 
 * @param {string[]} possibles 
 */
function classNumberUpdate(element, class_, possibles) {
    element.classList.remove(...possibles);
    class_ = precision.className(class_);
    if (possibles.includes(class_)) {
        element.classList.add(class_);
    }
}

function getCursorChar(verbose) {
    if (verbose) {
        return keys.bar.key;
    }
    return keys.barBroken.key
}

function errorMessage(error) {
    if (!error.message) return;

    lastError = divBuilder(cls.error, error.message);

    if (currentInput.textContent === "") {
        currentInput.classList.add(cls.hidden);
    }

    container.appendChild(lastError);
    scrollToBottom();
}

function guiBuilder() {
    MAIN.appendChild(container);
    MAIN.appendChild(help);

    currentInput = divBuilder([cls.input, cls.current]);

    const cursor = divBuilder([cls.cursor], getCursorChar(useVerbose));
    container.appendChild(cursor);

    container.appendChildPreCursor = function (newNode) {
        this.insertBefore(newNode, cursor);
    }
    container.appendChildPreCursor(currentInput);

    document.addEventListener('click', () => currentInput.focus());

    const AFTER_DIGIT_OK = [...DIGITS, keys.parClose.key, keys.period.key, keys.comma.key];

    document.addEventListener('keydown', (e) => {
        const key = replaceKeys[e.key] || e.key;

        // Prevent overriding browser shortcuts
        if (e.ctrlKey || e.metaKey || (e.shiftKey && key === keys.shift.key)) {
            return;
        }
        // Keyboard shortcuts
        else if (e.altKey) {
            if (key === keys.equal.key || key === keys.plus.key) {
                fontSize.increase();
                scrollToBottom();
            }
            else if (key === keys.minus.key) {
                fontSize.decrease();
            }
            else if (key === keys.p.key) {
                classNumberUpdate(cursor, precision.increase().toString(), precision.possibles);
            }
            else if (key === keys.o.key) {
                classNumberUpdate(cursor, precision.decrease().toString(), precision.possibles);
            }
            else if (key === keys.g.key) {
                window.open('https://github.com/ae-dschorsaanjo/clcs', '_blank');
            }
            else if (key === keys.r.key) {
                inputHistory.resetHistory();
                clcs(ansResetter);
                while (container.childNodes.length > 2) {
                    container.removeChild(container.firstChild);
                }
                currentInput.innerHTML = "";
                lastError = null;
                useVerbose = false;
                cursor.textContent = getCursorChar(useVerbose);
                precision.reset();
                classNumberUpdate(cursor, precision.className(precision.value), precision.possibles);
            }
            else if (key === keys.v.key) {
                useVerbose = !useVerbose;
                cursor.textContent = getCursorChar(useVerbose);
                currentInput.classList.toggle(cls.verbose, useVerbose);
            }
            else if (colorScheme.available.has(key)) {
                colorScheme.setScheme(key);
            }
            // Prevent overriding (other than explicitly overriden) browser shortcuts
            else {
                return;
            }
            e.preventDefault();
            return;
        }

        if (lastError !== null) {
            container.removeChild(lastError);
            currentInput.classList.remove(cls.hidden);
            lastError = null;
        }

        const citc = currentInput.textContent;
        const lastChar = citc.length > 0 ? citc[citc.length - 1] : "";
        const noop = occurences(citc, keys.parOpen.key);
        const nocp = occurences(citc, keys.parClose.key);
        let inputStr = citc.trim();

        if (usedSymbols.has(key)) {
            const doubleSpace = key === keys.space.key && citc.endsWith(keys.space.key);
            const consecutiveParClose = (key === keys.parClose.key) && (noop <= nocp);
            const nestedParOpen = (key === keys.parOpen.key) && (noop !== nocp);
            const operationRequired = !OPERATIONS.has(key) && (citc.endsWith(keys.parOpen.key) || (citc === ""));
            const spaceRequired = citc.length && key !== keys.space.key
                && ((OPERATIONS.has(lastChar)
                    && (citc.length === 1 || (lastChar !== keys.minus.key || !DIGITS.includes(key))))
                    || (DIGITS.includes(lastChar) && !AFTER_DIGIT_OK.includes(key))
                    || (lastChar === keys.parClose.key));

            // Prevent (most of the) invalid inputs with custom error messages
            let errorMsg = null;
            if (doubleSpace) {
                errorMsg = " ";
            }
            else if (consecutiveParClose) {
                errorMsg = "There are no open parentheses.";
            }
            else if (nestedParOpen) {
                errorMsg = "Unmatched opening parenthesis exists.";
            }
            else if (operationRequired) {
                errorMsg = "An operation is required.";
            }

            if (spaceRequired) {
                inputStr += " ";
                appendTextNode(currentInput, " ");
            }

            if (errorMsg) {
                errorMessage({ message: errorMsg.trim() });
                e.preventDefault();
                return;
            }
            else {
                appendTextNode(currentInput, key);
            }
        }
        else if (key === keys.backspace.key) {
            const lastChild = currentInput.lastChild;

            if (lastChild) {
                currentInput.removeChild(lastChild);
            }
        }
        else if (key === keys.enter.key) {
            let ans;
            try {
                if (noop > nocp) {
                    const addText = keys.parClose.key.repeat(noop - nocp);
                    inputStr += addText;
                    appendTextNode(currentInput, addText);
                }
                ans = clcs(inputStr, useVerbose ? [] : null, precision.value);
                if (typeof ans === "object") {
                    ans.steps.forEach(step => container.appendChildPreCursor(divBuilder(cls.verbose, step)));
                    ans = ans.result;
                }
            }
            catch (error) {
                errorMessage(error);
                e.preventDefault();
                return;
            }
            container.appendChildPreCursor(divBuilder(cls.result, ans));
            inputHistory.resetInput();
            inputHistory.add(inputStr);
            currentInput.classList.remove(cls.current);
            const classes = [cls.input, cls.current];
            if (useVerbose) classes.push(cls.verbose);
            currentInput = divBuilder(classes);
            container.appendChildPreCursor(currentInput);
        }
        else if (key === keys.up.key) {
            currentInput.innerHTML = "";
            Array.from(inputHistory.previous(inputStr)).forEach(letter => {
                appendTextNode(currentInput, letter);
            });
        }
        else if (key === keys.down.key) {
            currentInput.innerHTML = "";
            Array.from(inputHistory.next(inputStr)).forEach(letter => {
                appendTextNode(currentInput, letter);
            });
        }
        else if (key === keys.esc.key) {
            toggleHelp();
        }
        // Allow function keys
        else if (/^F\d{1,2}$/.test(key)) {
            return;
        }
        e.preventDefault();
        // Probably redundant
        scrollToBottom();
    });
}

guiBuilder();
