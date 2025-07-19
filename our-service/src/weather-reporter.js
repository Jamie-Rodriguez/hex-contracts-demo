/**
 * @template T
 * @typedef {import('./error-types.js').Option<T>} Option
 */

/**
 * @typedef {Object} WeatherReportData
 * @property {number} temperature
 * @property {string} units
 * @property {string} comment
 */

/**
 * @typedef {Object} WeatherReporter
 * @property {(weatherData: WeatherReportData) => Promise<Option<string>>} getWeatherReport
 */

/**
 * @param {boolean} [shouldFail=false]
 * @returns {WeatherReporter}
 */
export const useInMemoryWeatherReporter = (shouldFail = false) => {
    /**
     * @param {WeatherReportData} weatherData
     * @returns {Promise<Option<string>>}
     */
    const getWeatherReport = async weatherData => {
        if (shouldFail) return { type: 'none' }

        if (weatherData.temperature < -30 || weatherData.temperature > 50)
            return { type: 'none' }

        if (!['celsius', 'fahrenheit'].includes(weatherData.units))
            return { type: 'none' }

        const html = `
        <html>
            <body>
                <h1>Weather Report</h1>
                <p>Temperature: ${weatherData.temperature}°${weatherData.units}</p>
                <p>Comment: ${weatherData.comment}</p>
                <p>Date: ${new Date().toISOString().split('T')[0]}</p>
            </body>
        </html>
        `

        return { type: 'some', value: html }
    }

    return { getWeatherReport }
}

/**
 * @param {string} weatherReporterUrl - The *base* URL of the weather station API
 * @returns {WeatherReporter}
 */
export const useRemoteWeatherReporter = weatherReporterUrl => {
    /**
     * @param {WeatherReportData} weatherData
     * @returns {Promise<Option<string>>}
     */
    const getWeatherReport = async weatherData => {
        try {
            const response = await fetch(`${weatherReporterUrl}/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(weatherData)
            })

            if (!response.ok) return { type: 'none' }

            return { type: 'some', value: await response.text() }
        } catch (error) {
            console.error('Failed to fetch weather report:', error)

            return { type: 'none' }
        }
    }

    return { getWeatherReport }
}
