import { describe, beforeAll, test, expect } from 'vitest'
import { waitForService } from '../../utils.js'
import {
    useInMemoryWeatherStation,
    useDeterministicWeatherStation,
    useRemoteWeatherStation
} from '../../src/weather-station.js'

/**
 * @typedef {import('../../utils.js').Process} Process
 * @typedef {import('../../src/weather-station.js').WeatherStation} WeatherStation
 */

// This is just a workaround because TypeScript does not understand the global
// `process` variable, nor does it inherently understand the shape of the
// `globalThis` object...
/** @type {Process} */
const process = /** @type {any} */ (globalThis).process

/**
 * @param {string} name
 * @param {() => Promise<WeatherStation>} createWeatherStation
 */
const runWeatherStationContractTests = (name, createWeatherStation) => {
    describe(name, () => {
        /** @type {WeatherStation} */
        let weatherStation

        beforeAll(async () => {
            weatherStation = await createWeatherStation()
        })

        test('should return temperature data when successful', async () => {
            const temperatureData = await weatherStation.getWeatherData()

            expect(temperatureData).toEqual({
                type: expect.stringContaining('some'),
                value: {
                    temperature: expect.any(Number),
                    units: expect.stringMatching(/^(celsius|fahrenheit)$/)
                }
            })
        })
    })
}

describe('Weather Station Contract Tests', () => {
    runWeatherStationContractTests('In-Memory Weather Station', async () =>
        useInMemoryWeatherStation()
    )

    runWeatherStationContractTests('Deterministic Weather Station', async () =>
        useDeterministicWeatherStation({
            type: 'some',
            value: { temperature: 20, units: 'celsius' }
        })
    )

    runWeatherStationContractTests('Remote Weather Station', async () => {
        const url = process.env.REMOTE_WEATHER_STATION_URL

        if (!url)
            throw new Error(
                'REMOTE_WEATHER_STATION_URL environment variable is required'
            )

        await waitForService(`${url}/readyz`, 30000)
        return useRemoteWeatherStation(url)
    })
})
