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

		this.setTitle("")
	}

	/**
	 * Sets the title of the marker
	 * @param {string} title - A title for the marker
	*/
	setTitle(title) {
		this.title = title
	}

	/**
	 * Returns the title of the marker
	 * @returns {string} - The title of the marker
	*/
	getTitle() {
		return this.title
	}

	/**
	 * Returns a formatted time string for the marker
	 * @returns {string} - A formatted time string (HH:MM:SS)
	*/
	getFormattedTime() {
		return secondsToFormattedTime(this.time)
	}

	/**
	 * Returns the time of the marker
	 * @returns {number} - The time of the marker in seconds
	*/
	getTime() {
		return this.time
	}
}
