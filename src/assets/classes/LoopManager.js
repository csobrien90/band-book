export class LoopManager {
	/**
	 * @constructor
	 * @param {Object} loopBounds - An object containing start and end times (optional)
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
	 * @param {number} start - The start time in seconds
	 * @param {number} end - The end time in seconds
	*/
	setLoopBounds(start, end) {
		this.start = start
		this.end = end
	}

	/**
	 * Set the song
	*/
	setSong(song) {
		this.song = song
	}
}