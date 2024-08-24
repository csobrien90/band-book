import { secondsToFormattedTime } from '../utils.js'

/**
 * Represents a marker
*/
export class Marker {
	/**
	 * @constructor
	 * @param {number} time - A time in seconds
	 * @param {Song} song - A Song instance
	 * @param {string} title - A title for the marker
	 * @returns {Marker} - A new Marker instance
	*/
	constructor(time, song, title = "") {
		this.id = crypto.randomUUID()
		this.time = time
		this.song = song

		this.setTitle(title)
	}

	/**
	 * Sets the title of the marker
	 * @param {string} title - A title for the marker
	*/
	setTitle(title) {
		this.title = title
		if (this.title.length > 0) this.song.bandbook.syncManager.updateMarkerTitle(this, title)
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

	getData() {
		return {
			id: this.id,
			time: this.time,
			title: this.title
		}
	}
}
