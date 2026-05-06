import { Song } from './Song.js'

export class SegmentManager {
	/**
	 * @typedef {Object} Bounds
	 * @property {number} start
	 * @property {number} end
	 */

	/** @type {boolean} */
	active = false

	/** @type {Bounds|null} */
	bounds = null

	/** @type {Song|null} */
	song = null

	/** @type {Function|null} */
	eventCallback = null

	/**
	 * @param {Bounds} bounds
	 */
	constructor(bounds) {
		this.active = false
		this.start = bounds?.start ?? null
		this.end = bounds?.end ?? null
	}

	/**
	 * Updates the loop listener
	 * @returns {void}
	 */
	updateLoopListener() {
		if (!this.song) return

		const audio = this.song.player.getAudioElement()

		// Remove existing listener safely
		if (this.eventCallback) {
			audio.removeEventListener('timeupdate', this.eventCallback)
		}

		this.eventCallback = () => {
			if (this.active && this.end != null && audio.currentTime >= this.end) {
				audio.currentTime = this.start ?? 0
			}
		}

		if (this.active) {
			audio.addEventListener('timeupdate', this.eventCallback)
		}
	}

	/**
	 * Toggles the loop on or off
	 * @returns {boolean}
	 */
	toggleLoop() {
		this.active = !this.active
		this.updateLoopListener()
		return this.active
	}

	/**
	 * Sets the loop bounds
	 * @param {number|null} start
	 * @param {number|null} end
	 * @returns {void}
	 */
	setBounds(start, end) {
		this.start = start
		this.end = end
	}

	/**
	 * Sets the associated song
	 * @param {Song} song
	 * @returns {void}
	 */
	setSong(song) {
		this.song = song
	}

	/**
	 * Cleans up event listeners
	 * @returns {void}
	 */
	destroy() {
		if (!this.song || !this.eventCallback) return

		const audio = this.song.player.getAudioElement()
		audio.removeEventListener('timeupdate', this.eventCallback)

		this.eventCallback = null
	}
}
