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

/**
 * Returns the number of seconds given a formatted time string
 * @param {string} formattedTime
 * @returns {number} seconds
*/
export const formattedTimeToSeconds = (formattedTime) => {
	const timeArray = formattedTime.split(':').map((unit) => parseInt(unit))
	switch (timeArray.length) {
		case 1:
			return timeArray[0]
		case 2:
			return timeArray[0] * 60 + timeArray[1]
		case 3:
			return timeArray[0] * 3600 + timeArray[1] * 60 + timeArray[2]
		default:
			return 0
	}
}
