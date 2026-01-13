/**
 * @template T
 * @typedef {import('./error-types.js').Option<T>} Option
 */

/**
 * @typedef {Object} WeatherStationData
 * @property {number} temperature
 * @property {'celsius'|'fahrenheit'} units
 */

/**
 * @typedef {Object} WeatherStation
 * @property {() => Promise<Option<WeatherStationData>>} getWeatherData
 */

/**
 * @returns {WeatherStation}
 */
export const useInMemoryWeatherStation = () => {
    /**
     * @returns {Promise<Option<WeatherStationData>>}
     */
    const getWeatherData = async () => {
        const minTemp = -20
        const maxTemp = 50

        const temperature = Math.random() * (maxTemp + minTemp) - minTemp

        const units = 'celsius'

        return { type: 'some', value: { temperature, units } }
    }

    return { getWeatherData }
}

/**
 * @param {Option<WeatherStationData>} predefinedWeatherData
 * @returns {WeatherStation}
 */
export const useDeterministicWeatherStation = predefinedWeatherData => {
    /**
     * @returns {Promise<Option<WeatherStationData>>}
     */
    const getWeatherData = async () => predefinedWeatherData

    return { getWeatherData }
}

/**
 * @param {string} weatherStationUrl The *base* URL of the weather station API
 * @returns {WeatherStation}
 */
export const useRemoteWeatherStation = weatherStationUrl => {
    /**
     * @returns {Promise<Option<WeatherStationData>>}
     */
    const getWeatherData = async () => {
        try {
            const response = await fetch(`${weatherStationUrl}/weather`)

            if (!response.ok) return { type: 'none' }

            /** @type {WeatherStationData} */
            const temperatureData = await response.json()

            return { type: 'some', value: temperatureData }
        } catch (error) {
            console.error('Failed to fetch weather data:', error)

            return { type: 'none' }
        }
    }

    return { getWeatherData }
}
