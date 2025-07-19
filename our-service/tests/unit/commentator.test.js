import { describe, test, expect } from 'vitest'
import {
    useInMemoryWeatherStation,
    useDeterministicWeatherStation
} from '../../src/weather-station.js'
import { useInMemoryWeatherReporter } from '../../src/weather-reporter.js'
import { commentOnWeather, syncWeatherReport } from '../../src/commentator.js'

describe('commentOnWeather', () => {
    test('should return cold comment for low temperature', () => {
        expect(
            commentOnWeather({ temperature: 5, units: 'celsius' })
        ).toContain('cold')
        expect(
            commentOnWeather({ temperature: 40, units: 'fahrenheit' })
        ).toContain('cold')
    })

    test('should return hot comment for high temperature', () => {
        expect(
            commentOnWeather({ temperature: 40, units: 'celsius' })
        ).toContain('hot')
        expect(
            commentOnWeather({ temperature: 100, units: 'fahrenheit' })
        ).toContain('hot')
    })

    test('should return pleasant comment for moderate temperature', () => {
        expect(
            commentOnWeather({ temperature: 20, units: 'celsius' })
        ).toContain('pleasant')
        expect(
            commentOnWeather({ temperature: 70, units: 'fahrenheit' })
        ).toContain('pleasant')
    })
})

describe('syncWeatherReport', () => {
    test('should return weather report when both services succeed', async () => {
        const weatherStation = useInMemoryWeatherStation()
        const weatherReporter = useInMemoryWeatherReporter()

        const result = await syncWeatherReport(weatherStation, weatherReporter)

        expect(result).toEqual({
            type: 'some',
            value: expect.stringContaining('html')
        })
    })

    test('should return none when weather station returns none', async () => {
        const weatherStation = useDeterministicWeatherStation({ type: 'none' })
        const weatherReporter = useInMemoryWeatherReporter()

        const result = await syncWeatherReport(weatherStation, weatherReporter)

        expect(result).toEqual({ type: 'none' })
    })

    test('should return none when weather reporter returns none', async () => {
        const weatherStation = useInMemoryWeatherStation()
        const weatherReporter = useInMemoryWeatherReporter(true)

        const result = await syncWeatherReport(weatherStation, weatherReporter)

        expect(result).toEqual({ type: 'none' })
    })
})
