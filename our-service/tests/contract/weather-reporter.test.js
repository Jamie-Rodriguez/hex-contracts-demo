import { describe, beforeAll, test, expect } from 'vitest'
import { useInMemoryWeatherReporter } from '../../src/weather-reporter.js'
import { useContainerizedWeatherReporter } from './container-helpers.js'

/**
 * @template T
 * @typedef {import('../../src/error-types.js').Option<T>} Option
 */

/**
 * @template T
 * @typedef {import('../../src/error-types.js').Some<T>} Some
 */

/**
 * @typedef {import('../../src/weather-reporter.js').WeatherReporter} WeatherReporter
 */

/**
 * @param {string} name
 * @param {() => Promise<WeatherReporter>} createWeatherReporter
 */
const runWeatherReporterContractTests = (name, createWeatherReporter) => {
    describe(name, () => {
        /** @type {WeatherReporter} */
        let weatherReporter

        beforeAll(async () => weatherReporter = await createWeatherReporter())

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
    runWeatherReporterContractTests('In-Memory Weather Reporter',
        async () => useInMemoryWeatherReporter()
    )

    runWeatherReporterContractTests('Remote Weather Reporter',
        async () => useContainerizedWeatherReporter()
    )
})
