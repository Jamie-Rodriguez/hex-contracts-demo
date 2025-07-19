/**
 * @typedef {import('../utils.js').Process} Process
 * @typedef {import('./weather-station.js').WeatherStationData} WeatherStationData
 * @typedef {import('./weather-station.js').WeatherStation} WeatherStation
 * @typedef {import('./weather-reporter.js').WeatherReporter} WeatherReporter
 */

/**
 * @template T
 * @typedef {import('./error-types.js').Option<T>} Option
 */

/**
 * @typedef {Object} Commentator
 * @property {(weatherStationData: WeatherStationData) => Promise<Option<string>>} commentOnWeather
 */

/**
 * @param {number} fahrenheit
 * @returns {number}
 */
const fahrenheitToCelsius = fahrenheit => ((fahrenheit - 32) * 5) / 9

/**
 * @param {WeatherStationData} data
 * @returns {string}
 */
export const commentOnWeather = data => {
    if (
        (data.units === 'celsius' && data.temperature < 10)
        || (data.units === 'fahrenheit' && data.temperature < 50)
    )
        return "It's freezing cold!"

    if (
        (data.units === 'celsius' && data.temperature > 35)
        || (data.units === 'fahrenheit' && data.temperature > 95)
    )
        return "It's scorching hot!"

    return 'The weather is quite pleasant!'
}

/**
 * @param {WeatherStation} weatherStation Retrieves weather data
 * @param {WeatherReporter} weatherReporter Generates weather reports
 * @returns {Promise<Option<string>>}
 */
export const syncWeatherReport = async (weatherStation, weatherReporter) => {
    const currentWeatherData = await weatherStation.getWeatherData()

    if (currentWeatherData.type === 'none') return { type: 'none' }

    const comment = commentOnWeather(currentWeatherData.value)

    // Always force temperature to Celsius
    const temperature =
        currentWeatherData.value.units === 'fahrenheit'
            ? fahrenheitToCelsius(currentWeatherData.value.temperature)
            : currentWeatherData.value.temperature

    const units =
        currentWeatherData.value.units === 'fahrenheit'
            ? 'celsius'
            : currentWeatherData.value.units

    const weatherReport = await weatherReporter.getWeatherReport({
        temperature,
        units,
        comment
    })

    if (weatherReport.type === 'none') return { type: 'none' }

    return { type: 'some', value: weatherReport.value }
}
