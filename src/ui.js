import { ansResetter, clcs, usedSymbols } from "./clcs.js";

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
 * 
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

const cls = Object.freeze({
    io: "io",
    input: "input",
    current: "current",
    result: "hi",
    error: "err",
    hidden: "hidden",
    help: "help"
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
Ctrl + Shift +
      r : Hard reset
`);

function toggleHelp(dryrun = false) {
    const ccl = container.classList;
    const hcl = help.classList;
    if (!dryrun) {
        ccl.toggle(cls.hidden);
        if (ccl.contains(cls.hidden) === hcl.contains(cls.hidden)) {
            hcl.toggle(cls.hidden);
        }
    }
    return hcl.contains(cls.hidden);
}

function scrollToBottom() {
    document.body.scrollTop = document.body.scrollHeight;
    document.documentElement.scrollTop = document.documentElement.scrollHeight;
}

function guiBuilder() {
    MAIN.appendChild(container);
    MAIN.appendChild(help);

    currentInput = divBuilder([cls.input, cls.current]);

    container.appendChild(currentInput);

    document.addEventListener('click', () => currentInput.focus());

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            return;
        }
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
            }
            else if (colorScheme.available.has(e.key)) {
                colorScheme.setScheme(e.key);
            }
            e.preventDefault();
            return;
        }

        if (lastError !== null) {
            container.removeChild(lastError);
            lastError = null;
            if (!currentInput.textContent.endsWith(" ")) {
                currentInput.appendChild(document.createTextNode(" "));
                scrollToBottom();
            }
        }

        if (usedSymbols.has(e.key)) {
            if (!(currentInput.textContent.endsWith(" ") && e.key === " ")) {
                currentInput.appendChild(document.createTextNode(e.key));
            }
        }
        else if (e.key === "Backspace") {
            const lastChild = currentInput.lastChild;

            if (lastChild) {
                currentInput.removeChild(lastChild);
            }
        }
        else if (e.key === "Enter") {
            const inputStr = currentInput.textContent.trim();
            let ans;
            try {
                ans = clcs(inputStr);
            } catch (error) {
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
            currentInput = divBuilder([cls.input, cls.current]);
            container.appendChild(currentInput);
        }
        else if (e.key === "ArrowUp") {
            const inputStr = currentInput.textContent.trim();
            currentInput.innerHTML = "";
            currentInput.appendChild(document.createTextNode(inputHistory.previous(inputStr)));
        }
        else if (e.key === "ArrowDown") {
            const inputStr = currentInput.textContent.trim();
            currentInput.innerHTML = "";
            currentInput.appendChild(document.createTextNode(inputHistory.next(inputStr)));
        }
        else if (e.key === "Escape") {
            toggleHelp();
        }
        else if (/^F\d{1,2}$/.test(e.key)) {
            return;
        }
        e.preventDefault();
        scrollToBottom();
    });
}

guiBuilder();
