// This is just a workaround because TypeScript does not understand the global
// `process` variable for some reason...
/**
 * @typedef {Object} ProcessEnv
 * @property {string} [REMOTE_WEATHER_STATION_URL]
 * @property {string} [REMOTE_WEATHER_REPORTER_URL]
 *
 * @typedef {Object} Process
 * @property {ProcessEnv} env
 * @property {(code?: number) => never} exit
 */

/**
 * Waits for a service to become available by polling its health check endpoint.
 * @param {string} healthcheckUrl
 * @param {number} [timeoutMs=60000]
 * @returns {Promise<boolean>} Promise that resolves to true when service is available
 * @throws {Error} Throws an error if the service doesn't become available within the timeout period
 */
export const waitForService = async (healthcheckUrl, timeoutMs = 60000) => {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
        try {
            const response = await fetch(healthcheckUrl)

            if (response.ok) return true
        } catch (error) {
            // Service not ready yet, continue waiting
            console.debug(
                `Waiting for service at ${healthcheckUrl}: ${error instanceof Error ? error.message : String(error)}`
            )
        }

        await new Promise(resolve => setTimeout(resolve, 500))
    }

    throw new Error(
        `Service at ${healthcheckUrl} did not become available within ${timeoutMs}ms`
    )
}
