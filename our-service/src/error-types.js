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
