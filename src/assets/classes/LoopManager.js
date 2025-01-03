import { Song } from './Song.js'

export class LoopManager {
	/**
	 * @typedef {Object} LoopBounds
	 * @property {number} start - The start time in seconds
	 * @property {number} end - The end time in seconds
	*/

	/** @type {boolean} */
	active = false;
	/** @type {LoopBounds|null} */
	loopBounds = null;
	/** @type {Song|null} */
	song = null;

	/**
	 * @constructor
	 * @param {LoopBounds} loopBounds - The loop bounds
	 * @returns {LoopManager} - A new LoopManager instance
	*/
	constructor(loopBounds) {
		this.active = false
		this.start = loopBounds?.start
		this.end = loopBounds?.end
	}

	/**
	 * Toggles the loop on or off
	 * Note: If the loop is toggled off, the loop bounds are reset
	 * @returns {void}
	*/
	toggleLoop() {
		this.active = !this.active

		if (!this.active) {
			this.setLoopBounds(null, null)
		} else {
			this.song.player.getAudioElement().addEventListener('timeupdate', () => {
				if (this.active && this.song.player.getAudioElement().currentTime >= this.end) {
					this.song.player.getAudioElement().currentTime = this.start
				}
			})
		}
	}

	/**
	 * Sets the loop bounds
	 * @param {number|null} start - The start time in seconds
	 * @param {number|null} end - The end time in seconds
	 * @returns {void}
	*/
	setLoopBounds(start, end) {
		this.start = start
		this.end = end
	}

	/**
	 * Set the song
	 * @param {Song} song - The song
	 * @returns {void}
	*/
	setSong(song) {
		this.song = song
	}
}