import { describe, test, expect, beforeAll } from 'vitest'
import {
    useInMemoryWeatherStation,
    useDeterministicWeatherStation
} from '../../src/weather-station.js'
import { useContainerizedWeatherStation } from './container-helpers.js'

/**
 * @typedef {import('../../src/weather-station.js').WeatherStation} WeatherStation
 */

/**
 * @param {string} name
 * @param {() => Promise<WeatherStation>} createWeatherStation
 */
const runWeatherStationContractTests = (name, createWeatherStation) => {
    describe(name, () => {
        /** @type {WeatherStation} */
        let weatherStation

        beforeAll(async () => weatherStation = await createWeatherStation())

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

describe('Weather Station Contract Tests', async () => {
    runWeatherStationContractTests('In-Memory Weather Station',
        async () => useInMemoryWeatherStation()
    )

    runWeatherStationContractTests('Deterministic Weather Station',
        async () => useDeterministicWeatherStation({
            type: 'some',
            value: { temperature: 20, units: 'celsius' }
        })
    )

    runWeatherStationContractTests('Remote Weather Station',
        async () => useContainerizedWeatherStation()
    )
})
