/**
 * @template T
 * @typedef {Object} Ok
 * @property {true} ok
 * @property {T} value
 */

/**
 * @template E
 * @typedef {Object} Err
 * @property {false} ok
 * @property {E} error
 */

/**
 * @template T
 * @template E
 * @typedef {Ok<T> | Err<E>} Result
 */

/**
 * @typedef {Object} None
 * @property {'none'} type
 */

/**
 * @template T
 * @typedef {Object} Some
 * @property {'some'} type
 * @property {T} value
 */

/**
 * @template T
 * @typedef {None | Some<T>} Option
 */
