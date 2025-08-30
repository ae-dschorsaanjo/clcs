/**
 * Command-Line Calculator [in Java]Script.
 * 
 * Copyright © 2025 ae-dschorsaanjo
 * 
 * This work is free. You can redistribute it and/or modify it under the
 * terms of the Do What The Fuck You Want To Public License, Version 2,
 * as published by Sam Hocevar. See http://www.wtfpl.net/ for more details.
 */

/**
 * Random number generator
 * 
 * @param {number} a Min or max (if b is undefined)
 * @param {number} b Max (optional)
 * @returns Random number in range [a, b] or [1, a] if b is undefined
 */
function customRandom(a, b) {
    if (typeof b === "undefined") {
        b = a;
        a = 1;
    }
    if (a > b) [a, b] = [b, a];
    return Math.floor(Math.random() * (b - a + 1)) + a;
}

/**
 * Rounds a number to a specified number of decimal places.
 * Used internally to ensure consistent rounding.
 * 
 * @param {number} n Number to round
 * @param {number} d Number of digits
 * @returns Rounded number
 */
function unifiedRounding(n, d = 3) {
    const factor = 10 ** Math.trunc(d);
    return Math.round(n * factor) / factor;
}

/**
 * Converts the input to a number and rounds it.
 * 
 * @param {any} input 
 * @param {string} token Last operator token
 * @returns {number}
 * @see {unifiedRounding}
 */
function toNumber(input, token) {
    try {
        input = Number(input);
    }
    catch {
        // disregard unparseable input
        input = ["+", "-"].includes(token) ? 0 : 1;
    }

    return unifiedRounding(input);
}

/**
 * @callback Operation
 * @param {number} a First argument
 * @param {...number} args Rest of the arguments
 * @returns {number}
 */

/**
 * @type {Object<string, Operation>}
 */
const ops = Object.freeze({
    "+": (a, ...args) => args.reduce((acc, curr) => acc + curr, a),
    "-": (a, ...args) => args.reduce((acc, curr) => acc - curr, a),
    "*": (a, ...args) => args.reduce((acc, curr) => acc * curr, a),
    "/": (a, ...args) => args.reduce((acc, curr) => (curr != 0 ? acc / curr : 0), a),
    "^": (a, ...args) => args.reduce((acc, curr) => acc ** curr, a),
    "\\": (a, ...args) => args.reduce((acc, curr) => (curr != 0 ? Math.trunc(acc / curr) : 0), a),
    "%": (a, ...args) => args.reduce((acc, curr) => (curr != 0 ? acc % curr : 0), a),
    "r": (a, ...args) => args.reduce((acc, curr) => customRandom(acc, curr), a)
});

const ansDefault = 0;

/**
 * @class
 * @classdesc Stores the current answer value.
 * @property {number} value Current answer value
 * @property {string} name Name of the answer variable (always "ans")
 */
const ans = new (class Ans {
    #value = ansDefault;
    get value() { return this.#value; }
    set value(value) { this.#value = (unifiedRounding(value)); }
    get name() { return "ans"; }
})();

/**
 * @type {Object<string, number>}
 */
const consts = Object.freeze({
    "pi": Math.PI,
    "e": Math.E,
    "ans": ans.value,
});

/**
 * @type {Set<string>}
 */
const symbols = new Set(
    [
        ...Object.keys(ops),
        ...Object.keys(consts).flatMap(key => [...key])
    ]
);

/**
 * A set of all symbols accepted by the calculator.
 * @type {Set<string>}
 */
export const usedSymbols = symbols.union(new Set([
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    ".", " ", "(", ")", //"[", "]", "{", "}", "<", ">"
]));

export class NotationError extends Error {
    /**
     * @param {string} message
     */
    constructor(message = "The given input is not valid notation!") {
        super(message);
        this.name = "NotationError";
    }
}

/**
 * @param {string} input Input calculation. The function expects the input to only contain valid characters, and it only has minimal checks in place.
 * @returns {number} The result of the calculation. It is also stored in `Ans`.
 * @throws {NotationError}
 */
export function clcs(input) {
    input = input.replace(",", ".").replace(/\s{2,}/g, " ").trim();
    if (input.length === 0) throw new NotationError("Empty input!");

    input = input.replace(/\((.+?)\)/g, (match, p1) => clcs(p1));
    // TODO: add support for nested parentheses

    const tokens = input.split(" ");

    if (!symbols.has(tokens[0])) {
        throw new NotationError(`Invalid symbol (${tokens[0]})!`);
    }

    const operator = tokens.shift();
    const operands = [];

    while (tokens.length > 0) {
        let token = tokens.shift();

        if (symbols.has(token)) {
            operands.push(clcs(`${token} ${tokens.join(" ")}`));
            break;
        }

        if (Object.hasOwn(consts, token)) {
            token = consts[token];
        }
        else if (token === ans.name) {
            token = ans.value;
        }
        operands.push(toNumber(token, operator));
    }

    if (operands.length === 0) {
        throw new NotationError("No valid operands found!");
    }
    else if (operands.length === 1) {
        operands.unshift(ans.value);
    }

    const result = ops[operator](...operands);
    ans.value = result;

    return ans.value;
}

/** 
 * A simple expression to reset `ans` to its original value.
 * This is needed due to the lack of a dedicated assignment operator.
 * The last value is read from `ansDefault`.
 */
export const ansResetter = `+ (- 1 1) ${ansDefault}`;
