/**
 * Returns a readable time string given a number of seconds
 * @param {number} seconds 
 * @returns {string} formattedTime (HH:MM:SS)
 */
export const secondsToFormattedTime = (seconds) => {
	seconds = Math.floor(seconds)

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return [
        hours,
        minutes,
        remainingSeconds
    ].map((unit) => String(unit).padStart(2, '0'))
    .join(':');
}