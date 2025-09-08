import { ansResetter, clcs, operations, usedSymbols } from "./clcs.js";

const MAIN = document.getElementById("main");

function setFontSize(size) {
    document.documentElement.style.fontSize = size + "px";
    return size;
}

function getFontSize() {
    return parseFloat(getComputedStyle(document.documentElement).fontSize) / 12;
}

const fontSize = new (class {
    #size = 2;
    constructor() {
        setFontSize(this.#size * 12);
    }
    increase() {
        return setFontSize(++this.#size * 12);
    }
    decrease() {
        if (this.#size > 1) return setFontSize(--this.#size * 12);
        return getFontSize();
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
 */
const cls = Object.freeze({
    io: "io",
    input: "input",
    current: "current",
    result: "hi",
    error: "err",
    hidden: "hidden",
    help: "help",
    verbose: "verbose"
});

const colorScheme = new (class Colors {
    #current = null;
    #available = new Set(["1", "2", "3"]);
    constructor() {
        this.setScheme("1");
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

    Esc : Toggle help
      ↑ : Previous input
      ↓ : Next input

Alt + 
      = | Increase font size
      + | 
      - : Decrease font size
      1 : Color Scheme Classic
      2 : Color Scheme Matrix
      3 : Color Scheme Snow
      g : Open on GitHub
      r : Soft reset (may not work with
                      Nvidia GPUs)
      v : Toggle verbose mode
      
Ctrl + Shift +
      r : Hard reset
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

function guiBuilder() {
    MAIN.appendChild(container);
    MAIN.appendChild(help);

    currentInput = divBuilder([cls.input, cls.current]);

    container.appendChild(currentInput);

    document.addEventListener('click', () => currentInput.focus());

    document.addEventListener('keydown', (e) => {
        // Prevent overriding browser shortcuts
        if (e.ctrlKey || e.metaKey) {
            return;
        }
        // Keyboard shortcuts
        else if (e.altKey) {
            if (e.key === "=" || e.key === "+") {
                fontSize.increase();
                scrollToBottom();
            }
            else if (e.key === "-") {
                fontSize.decrease();
            }
            else if (e.key === 'g') {
                window.open('https://github.com/ae-dschorsaanjo/clcs', '_blank');
            }
            else if (e.key === 'r') {
                inputHistory.resetHistory();
                clcs(ansResetter);
                while (container.childNodes.length > 1) {
                    container.removeChild(container.firstChild);
                }
                currentInput.innerHTML = "";
                lastError = null;
                useVerbose = false;
            }
            else if (e.key === 'v') {
                useVerbose = !useVerbose;
                currentInput.classList.toggle(cls.verbose, useVerbose);
            }
            else if (colorScheme.available.has(e.key)) {
                colorScheme.setScheme(e.key);
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
            lastError = null;
            // if (!currentInput.textContent.endsWith(" ")) {
            //     appendTextNode(currentInput, " ");
            // }
        }

        const citc = currentInput.textContent;
        const noop = occurences(citc, "(");
        const nocp = occurences(citc, ")");
        let inputStr = citc.trim();

        if (usedSymbols.has(e.key)) {
            // Prevent (most of the) invalid inputs
            if (
                (e.key === " " && citc.endsWith(" "))
                || ((e.key === ")") && (noop <= nocp))
                || ((e.key === "(") && (noop !== nocp))
                || (!operations.has(e.key) && (citc.endsWith("(") || (citc === "")))
            ) {
                e.preventDefault();
                return;
            }
            else {
                appendTextNode(currentInput, e.key);
            }
        }
        else if (e.key === "Backspace") {
            const lastChild = currentInput.lastChild;

            if (lastChild) {
                currentInput.removeChild(lastChild);
            }
        }
        else if (e.key === "Enter") {
            let ans;
            try {
                if (noop > nocp) {
                    const addText = ")".repeat(noop - nocp);
                    inputStr += addText;
                    appendTextNode(currentInput, addText);
                }
                ans = clcs(inputStr, useVerbose ? [] : null);
                if (typeof ans === "object") {
                    ans.steps.forEach(step => container.appendChild(divBuilder(cls.verbose, step)));
                    ans = ans.result;
                }
            }
            catch (error) {
                lastError = divBuilder(cls.error, error.message);
                container.appendChild(lastError);
                scrollToBottom();
                e.preventDefault();
                return;
            }
            container.appendChild(divBuilder(cls.result, ans));
            inputHistory.resetInput();
            inputHistory.add(inputStr);
            currentInput.classList.remove(cls.current);
            const classes = [cls.input, cls.current];
            if (useVerbose) classes.push(cls.verbose);
            currentInput = divBuilder(classes);
            container.appendChild(currentInput);
        }
        else if (e.key === "ArrowUp") {
            currentInput.innerHTML = "";
            Array.from(inputHistory.previous(inputStr)).forEach(letter => {
                appendTextNode(currentInput, letter);
            });
        }
        else if (e.key === "ArrowDown") {
            currentInput.innerHTML = "";
            Array.from(inputHistory.next(inputStr)).forEach(letter => {
                appendTextNode(currentInput, letter);
            });
        }
        else if (e.key === "Escape") {
            toggleHelp();
        }
        // Allow function keys
        else if (/^F\d{1,2}$/.test(e.key)) {
            return;
        }
        e.preventDefault();
        // Probably redundant
        scrollToBottom();
    });
}

guiBuilder();
