import { describe, beforeAll, test, expect } from 'vitest'
import { waitForService } from '../../utils.js'
import {
    useInMemoryWeatherReporter,
    useRemoteWeatherReporter
} from '../../src/weather-reporter.js'

/**
 * @template T
 * @typedef {import('../../src/error-types.js').Option<T>} Option
 */

/**
 * @template T
 * @typedef {import('../../src/error-types.js').Some<T>} Some
 */

/**
 * @typedef {import('../../utils.js').Process} Process
 * @typedef {import('../../src/weather-reporter.js').WeatherReporter} WeatherReporter
 */

// This is just a workaround because TypeScript does not understand the global
// `process` variable, nor does it inherently understand the shape of the
// `globalThis` object...
/** @type {Process} */
const process = /** @type {any} */ (globalThis).process

/**
 * @param {string} name
 * @param {() => Promise<WeatherReporter>} createWeatherReporter
 */
const runWeatherReporterContractTests = (name, createWeatherReporter) => {
    describe(name, () => {
        /** @type {WeatherReporter} */
        let weatherReporter

        beforeAll(async () => {
            weatherReporter = await createWeatherReporter()
        })

        test('should return weather report when successful', async () => {
            const temperature = 25
            const comment = "Lovely weather we're having!"

            const weatherData = { temperature, comment, units: 'celsius' }
            const weatherReport = /** @type {Some<string>} */ (
                await weatherReporter.getWeatherReport(weatherData)
            )

            expect(weatherReport).toEqual({
                type: expect.stringContaining('some'),
                value: expect.any(String)
            })
            expect(weatherReport.value).toContain(temperature)
            expect(weatherReport.value).toContain(comment)
        })

        test('should not accept unrealistic temperatures', async () => {
            const temperature = 100
            const comment = 'We are melting!'

            const weatherData = { temperature, comment, units: 'celsius' }
            const weatherReport =
                await weatherReporter.getWeatherReport(weatherData)

            expect(weatherReport).toEqual({
                type: expect.stringContaining('none')
            })
        })

        test('should not accept invalid temperature units', async () => {
            const temperature = 25
            const comment = 'What units are these??'

            const weatherData = { temperature, comment, units: 'volts' }
            const weatherReport =
                await weatherReporter.getWeatherReport(weatherData)

            expect(weatherReport).toEqual({
                type: expect.stringContaining('none')
            })
        })
    })
}

describe('Weather Reporter Contract Tests', () => {
    runWeatherReporterContractTests('In-Memory Weather Reporter', async () =>
        useInMemoryWeatherReporter()
    )

    runWeatherReporterContractTests('Remote Weather Reporter', async () => {
        const url = process.env.REMOTE_WEATHER_REPORTER_URL

        if (!url)
            throw new Error(
                'REMOTE_WEATHER_REPORTER_URL environment variable is required'
            )

        await waitForService(`${url}/readyz`, 30000)
        return useRemoteWeatherReporter(url)
    })
})
