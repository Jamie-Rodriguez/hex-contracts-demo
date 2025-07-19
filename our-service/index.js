import { useRemoteWeatherStation } from './src/weather-station.js'
import { useRemoteWeatherReporter } from './src/weather-reporter.js'
import { waitForService } from './utils.js'
import { syncWeatherReport } from './src/commentator.js'

/**
 * @typedef {import('./utils.js').Process} Process
 */

// This is just a workaround because TypeScript does not understand the global
// `process` variable, nor does it inherently understand the shape of the
// `globalThis` object...
/** @type {Process} */
const process = /** @type {any} */ (globalThis).process

export const startWeatherCommentator = async () => {
    if (
        !process.env.REMOTE_WEATHER_STATION_URL
        || !process.env.REMOTE_WEATHER_REPORTER_URL
    )
        throw new Error(
            'Environment variables REMOTE_WEATHER_STATION_URL and REMOTE_WEATHER_REPORTER_URL must be set.'
        )

    console.log('Waiting for remote services to become available...')
    const weatherStation = useRemoteWeatherStation(
        process.env.REMOTE_WEATHER_STATION_URL
    )
    const weatherReporter = useRemoteWeatherReporter(
        process.env.REMOTE_WEATHER_REPORTER_URL
    )

    await waitForService(process.env.REMOTE_WEATHER_STATION_URL + '/readyz')
    await waitForService(process.env.REMOTE_WEATHER_REPORTER_URL + '/readyz')

    while (true) {
        const result = await syncWeatherReport(weatherStation, weatherReporter)

        if (result.type === 'none')
            console.log(
                `[${new Date().toISOString()}] No weather report available at this time.`
            )
        else
            console.log(
                `[${new Date().toISOString()}] Weather Report received:\n`,
                result.value
            )

        await new Promise(resolve => setTimeout(resolve, 5000))
    }
}

startWeatherCommentator().catch(err => {
    console.error('Failed to start Weather Commentator:', err)
    process.exit(1)
})
