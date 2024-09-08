/**
 * Returns a readable time string given a number of seconds
 * @param {number} seconds 
 * @returns {string} formattedTime (HH:MM:SS)
 */
export const secondsToFormattedTime = (seconds) => {
	seconds = Math.floor(seconds)

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    let timeArray = [ hours, minutes, remainingSeconds ]
		.map((unit) => String(unit).padStart(2, '0'))
		.filter((unit, index) => unit !== '00' || index > 0)
	
	// The first unit should not be zero-padded
	timeArray[0] = +timeArray[0].toString()

	return timeArray.join(':')
}