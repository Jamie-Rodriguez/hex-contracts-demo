import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { GenericContainer, Wait } from 'testcontainers'
import { afterAll } from 'vitest'
import { useRemoteWeatherStation } from '../../src/weather-station.js'
import { useRemoteWeatherReporter } from '../../src/weather-reporter.js'

// This is just so that we can call
//     await execAsync(`docker images -q ${config.imageName}`)
// and any exception thrown is caught in the `catch` block
// This is cleaner than using the callback-approach in `exec`
// as we need to know if there is an existing image before proceeding further
const execAsync = promisify(exec)

const PROJECT_ROOT = path.resolve(__dirname, '../../..')

/** @typedef {import("testcontainers").StartedTestContainer} StartedTestContainer */
/** @typedef {import('../../src/weather-station.js').WeatherStation} WeatherStation */
/** @typedef {import('../../src/weather-reporter.js').WeatherReporter} WeatherReporter */

/**
 * @typedef {Object} ContainerConfig
 * @property {string} imageName        The Docker image name and tag
 * @property {string} dockerfile       The path to the Dockerfile relative to project root `PROJECT_ROOT`
 * @property {number[]} exposedPorts   Array of ports to expose from the container
 */

/** @type {Record<string, ContainerConfig>} */
const CONTAINER_CONFIGS = {
    'weather-station': {
        imageName: 'weather-station:latest',
        dockerfile: 'containerization/weather-station.dockerfile',
        exposedPorts: [8080]
    },
    'weather-report': {
        imageName: 'weather-report:latest',
        dockerfile: 'containerization/weather-report.dockerfile',
        exposedPorts: [8080]
    }
}

/**
 * @param {string} configKey The key identifying the container configuration
 * @returns {Promise<GenericContainer>} The container instance ready to be started
 * @throws {Error} If the config key is unknown, Docker is unavailable, or the build fails
 */
async function getImage(configKey) {
    const config = CONTAINER_CONFIGS[configKey]

    if (!config)
        throw new Error(`Unknown container config: ${configKey}`)

    try {
        const { stdout } = await execAsync(`docker images -q ${config.imageName}`)

        if (stdout.trim().length > 0) {
            console.log(`Using existing image: ${config.imageName}`)
            return new GenericContainer(config.imageName)
        }
    } catch (error) {
        throw new Error(
            `Failed to check for existing Docker image "${config.imageName}". Is Docker running?`,
            { cause: error }
        )
    }

    console.log(`Building image from: ${config.dockerfile}`)

    try {
        // Note: I've overidden the default policy to delete the image on exit.
        // This way, builds can be cached.
        return await GenericContainer.fromDockerfile(PROJECT_ROOT,
                                                     config.dockerfile)
                                     .build(config.imageName,
                                            { deleteOnExit: false })
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        throw new Error(
            `Failed to build image "${config.imageName}" from ${config.dockerfile}: ${message}`,
            { cause: error }
        )
    }
}

/**
 * @param {string} configKey The key identifying the container configuration
 * @returns {Promise<StartedTestContainer>} The started container instance
 */
async function startContainer(configKey) {
    const config = CONTAINER_CONFIGS[configKey]
    const image = await getImage(configKey)

    let container = image

    for (const port of config.exposedPorts)
        container = container.withExposedPorts(port)

    // Use HTTP wait strategy since these are scratch-based images
    // without shell/networking tools for port detection
    container = container.withWaitStrategy(
        Wait.forHttp('/readyz', 8080)
            .withStartupTimeout(60000)
    )

    return container.start()
}

/**
 * Creates a WeatherStation adapter backed by a containerized service
 * @returns {Promise<WeatherStation>}
 */
export async function useContainerizedWeatherStation() {
    const container = await startContainer('weather-station')
    const host = container.getHost()
    const port = container.getMappedPort(8080)
    const baseUrl = `http://${host}:${port}`

    afterAll(async () => container.stop())

    return useRemoteWeatherStation(baseUrl)
}

/**
 * Creates a WeatherReporter adapter backed by a containerized service
 * @returns {Promise<WeatherReporter>}
 */
export async function useContainerizedWeatherReporter() {
    const container = await startContainer('weather-report')
    const host = container.getHost()
    const port = container.getMappedPort(8080)
    const baseUrl = `http://${host}:${port}`

    afterAll(async () => container.stop())

    return useRemoteWeatherReporter(baseUrl)
}

