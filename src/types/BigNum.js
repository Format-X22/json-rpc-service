const BigNumber = require('bignumber.js');

/**
 * Wrapper over the library bignumber.js , available
 * methods should be viewed in the relevant documentation.
 * Only the methods necessary for redefinition have been redefined.
 *
 * Unlike the original, it uses a more flexible
 * constructor and calls to arithmetic methods,
 * allowing you to pass not supported in the original
 * number of similar values, for example containing a postfix
 * of the type '1000 coin'. Using parseFloat distorts
 * original value for very large numbers,
 * but this wrapper allows you to work with them without loss.
 */
class BigNum extends BigNumber {
    static clone(config) {
        const original = BigNum;
        const result = class BigNum extends original {};

        if (config) {
            result.config(config);
        }

        return result;
    }

    static maximum(...args) {
        return new BigNum(super.maximum(...args));
    }

    static max(...args) {
        return new BigNum(super.max(...args));
    }

    static minimum(...args) {
        return new BigNum(super.minimum(...args));
    }

    static min(...args) {
        return new BigNum(super.min(...args));
    }

    static random(...args) {
        return new BigNum(super.random(...args));
    }

    /**
     * Constructor that returns the proxy nat bignumber.js .
     * @param {number|string|BigInt|BigNumber} value Any number like
     * value, including values with prefixes and postfixes.
     * @param {number} [base] The number system (from 2 to 36).
     */
    constructor(value, base) {
        super(); // create context only
        super.constructor(this._convertValue(value), base);
    }

    absoluteValue() {
        return new BigNum(super.absoluteValue());
    }

    abs() {
        return new BigNum(super.abs());
    }

    decimalPlaces(...args) {
        const result = super.decimalPlaces(...args);

        if (typeof result === 'number') {
            return result;
        } else {
            return new BigNum(result);
        }
    }

    dp(...args) {
        const result = super.dp(...args);

        if (typeof result === 'number') {
            return result;
        } else {
            return new BigNum(result);
        }
    }

    dividedBy(...args) {
        return new BigNum(super.dividedBy(...args));
    }

    div(...args) {
        return new BigNum(super.div(...args));
    }

    dividedToIntegerBy(...args) {
        return new BigNum(super.dividedToIntegerBy(...args));
    }

    idiv(...args) {
        return new BigNum(super.idiv(...args));
    }

    exponentiatedBy(...args) {
        return new BigNum(super.exponentiatedBy(...args));
    }

    pow(...args) {
        return new BigNum(super.pow(...args));
    }

    integerValue(...args) {
        return new BigNum(super.integerValue(...args));
    }

    minus(...args) {
        return new BigNum(super.minus(...args));
    }

    modulo(...args) {
        return new BigNum(super.modulo(...args));
    }

    mod(...args) {
        return new BigNum(super.mod(...args));
    }

    multipliedBy(...args) {
        return new BigNum(super.multipliedBy(...args));
    }

    times(...args) {
        return new BigNum(super.times(...args));
    }

    negated() {
        return new BigNum(super.negated());
    }

    plus(...args) {
        return new BigNum(super.plus(...args));
    }

    precision(...args) {
        return new BigNum(super.precision(...args));
    }

    sd(...args) {
        return new BigNum(super.sd(...args));
    }

    shiftedBy(...args) {
        return new BigNum(super.shiftedBy(...args));
    }

    squareRoot() {
        return new BigNum(super.squareRoot());
    }

    sqrt() {
        return new BigNum(super.sqrt());
    }

    /**
     * @returns {string} Значение, пригодное для BSON.
     */
    toBSON() {
        return this.toString();
    }

    _convertValue(value) {
        if (value instanceof BigNumber) {
            return value;
        }

        if (typeof value === 'number') {
            return new BigNumber(value);
        }

        if (typeof value === 'string') {
            value = value.trim();

            const original = new BigNumber(value);

            if (!original.isNaN()) {
                return original;
            }

            const hex = '0x\\d+|-0x\\d+';
            const octal = '0o\\d+|-0o\\d+';
            const binary = '0b\\d+|-0b\\d+';
            const decimal = '\\.\\d*|-\\.\\d*|\\d+\\.\\d*|-\\d+\\.\\d*|\\d+|-\\d+';
            const check = [hex, octal, binary, decimal].join('|');
            const matched = value.match(new RegExp(check));

            if (matched) {
                return new BigNumber(matched[0]);
            } else {
                return original;
            }
        }

        return new BigNumber(value);
    }
}

module.exports = BigNum;
