import { secondsToFormattedTime } from '../utils.js'

/**
 * Represents a marker
*/
export class Marker {
	/**
	 * @constructor
	 * @param {number} time - A time in seconds
	 * @param {Song} song - A Song instance
	 * @returns {Marker} - A new Marker instance
	*/
	constructor(time, song) {
		this.time = time
		this.song = song
	}

	/**
	 * Returns a formatted time string for the marker
	 * @returns {string} - A formatted time string (HH:MM:SS)
	*/
	getFormattedTime() {
		return secondsToFormattedTime(this.time)
	}
}