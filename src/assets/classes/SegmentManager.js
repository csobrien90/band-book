import { Song } from './Song.js'

export class SegmentManager {
	/**
	 * @typedef {Object} Bounds
	 * @property {number} start - The start time in seconds
	 * @property {number} end - The end time in seconds
	*/

	/** @type {boolean} */
	active = false
	/** @type {Bounds|null} */
	bounds = null
	/** @type {Song|null} */
	song = null

	/**
	 * @constructor
	 * @param {Bounds} bounds - The segment's time bounds
	 * @returns {SegmentManager} - A new SegmentManager instance
	*/
	constructor(bounds) {
		this.active = false
		this.start = bounds?.start
		this.end = bounds?.end
	}

	/**
	 * Updates the loop listener
	*/
	updateLoopListener() {
		this.song.player.getAudioElement().removeEventListener('timeupdate', this.eventCallback)

		this.eventCallback = () => {
			if (this.active && this.song.player.getAudioElement().currentTime >= this.end) {
				this.song.player.getAudioElement().currentTime = this.start
			}
		}

		if (this.active) {
			this.song.player.getAudioElement().addEventListener('timeupdate', this.eventCallback)
		}
	}

	/**
	 * Toggles the loop on or off
	 * Note: If the loop is toggled off, the loop bounds are reset
	 * @returns {boolean} - The active state of the loop
	*/
	toggleLoop() {
		this.active = !this.active		
		this.updateLoopListener()
		return this.active
	}

	/**
	 * Sets the loop bounds
	 * @param {number|null} start - The start time in seconds
	 * @param {number|null} end - The end time in seconds
	 * @returns {void}
	*/
	setBounds(start, end) {
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