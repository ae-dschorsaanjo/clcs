/**
 * Command-Line Calculator [in java]Script.
 * 
 * Copyright © 2025 ae-dschorsaanjo
 * 
 * This work is free. You can redistribute it and/or modify it under the
 * terms of the Do What The Fuck You Want To Public License, Version 2,
 * as published by Sam Hocevar. See http://www.wtfpl.net/ for more details.
 */

class NotationError extends Error {
    /**
     * @param {string} message
     */
    constructor(message = "The given input is not valid notation!") {
        super(message);
        this.name = "NotationError";
    }
}

class NumberError extends Error {
    /**
     * @param {string} message
     */
    constructor(message = "The given input is not a valid number!") {
        super(message);
        this.name = "NumberError";
    }
}

/**
 * Random number generator
 * 
 * @param {number} a Min or max (if b is undefined)
 * @param {number} b Max (optional)
 * @returns Random number in range [a, b] or [1, a] if b is undefined
 */
function customRandom(a, b) {
    a = Math.trunc(a);
    if (typeof b === "undefined") {
        b = a;
        a = 1;
    }
    else {
        b = Math.trunc(b);
    }
    if (a == b) return a;

    if (a > b) [a, b] = [b, a];
    return Math.floor(Math.random() * (b - a + 1)) + a;
}

export const precisionDefault = 3;

/**
 * Rounds a number to a specified number of decimal places.
 * Used internally to ensure consistent rounding.
 * 
 * @param {number} n Number to round
 * @param {number} d Number of digits
 * @returns Rounded number
 */
function unifiedRounding(n, d = precisionDefault) {
    if (d < 0) d = 0;
    const factor = 10 ** Math.trunc(d);
    return Math.round(n * factor) / factor;
}

/**
 * Converts the input to a number and rounds it.
 * 
 * @param {any} input 
 * @param {string} token Last operator token
 * @param {number} precision Number of decimal places
 * @returns {number}
 * @see {unifiedRounding}
 */
function toNumber(input, token, precision = precisionDefault) {
    let parsedInput = Number(input);

    if (isNaN(parsedInput)) {
        throw new NumberError(`'${input}' is not a valid number!`);
        parsedInput = ["+", "-"].includes(token) ? 0 : 1;
    }

    return unifiedRounding(parsedInput, precision);
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
    set value(value) { this.#value = value; }
    get name() { return "ans"; }
    valueOf() { return this.#value; }
})();

/**
 * @type {Object<string, number>}
 */
const consts = Object.freeze({
    "pi": Math.PI,
    "e": Math.E,
    "ans": ans,
});

/**
 * @type {Set<string>}
 */
export const operations = new Set(Object.keys(ops));

/**
 * A set of all symbols accepted by the calculator.
 * @type {Set<string>}
 */
export const usedSymbols = operations.union(new Set(
    Object.keys(consts).flatMap(key => [...key])
)).union(new Set([
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    ".", ",", " ", "(", ")", //"[", "]", "{", "}", "<", ">"
]));

function inputBuilder(operator, operands) {
    return `${operator} ${operands.join(" ")}`;
}

const parentheses = new RegExp(/\((.+?)\)/g);

/**
 * @param {string} input Input calculation. The function expects the input to only contain valid characters, and it only has minimal checks in place.
 * @param {Array<string>?} verbose If truthy, the function will return an object containing both the result and the step-by-step breakdown of the calculation.
 * @param {number} precision Number of decimal places to round to. Defaults to `precisionDefault`.
 * @returns {number|Object{result: number, steps: Array<string>}} The result of the calculation. It is also stored in `Ans`. If verbose is truthy, the value is stored in an object containing the `result` and the `steps` to get it.
 * @throws {NotationError}
 */
export function clcs(input, verbose, precision = precisionDefault) {
    input = input.replace(",", ".").replace(/\s{2,}/g, " ").trim();
    if (input.length === 0) throw new NotationError("Empty input!");

    let m = input.match(parentheses);
    if (m?.length > 0) {
        m.forEach(match => {
            const inner = match.startsWith("(") && match.endsWith(")")
                ? match.slice(1, -1)
                : match;
            const innerResult = clcs(inner, verbose, precision);
            if (verbose) verbose = innerResult.steps;
            input = input.replace(match, innerResult.result ?? innerResult);
        });
    }

    const tokens = input.split(" ");

        if (!operations.has(tokens[0])) {
            throw new NotationError(`Invalid symbol (${tokens[0]})!`);
        }

        const operator = tokens.shift();
        const operands = [];

        while (tokens.length > 0) {
            let token = tokens.shift();

            if (operations.has(token)) {
                const innerResult = clcs(inputBuilder(token, tokens), verbose, precision);
                if (verbose) verbose = innerResult.steps;
                operands.push(innerResult.result ?? innerResult);
                break;
            }

            if (Object.hasOwn(consts, token)) {
                token = consts[token];
            }
            operands.push(toNumber(token, operator, precision));
        }

        if (operands.length === 0) {
            throw new NotationError(`No valid operands found after '${operator}'!`);
        }
        else if (operands.length === 1) {
            operands.unshift(ans.value);
        }

        const result = ops[operator](...operands);

        if (isNaN(result)) {
            throw new NotationError(`Invalid operands ('${operands.join("', '")}') resulted in NaN!`);
        }

        if (!isFinite(result)) {
            throw new NotationError(`Invalid operands ('${operands.join("', '")}') resulted in Infinity!`);
        }

        ans.value = unifiedRounding(result, precision);

        if (verbose) {
            verbose.push(inputBuilder(operator, operands));
            return {
                result: ans.value,
                steps: verbose
            };
        }

        return ans.value;
    }

    /** 
     * A simple expression to reset `ans` to its original value.
     * This is needed due to the lack of a dedicated assignment operator.
     * The last value is read from `ansDefault`.
     */
    export const ansResetter = `+ (- 1 1) ${ansDefault}`;
