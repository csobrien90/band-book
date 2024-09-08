export class Player {
	/**
	 * @constructor
	 * @param {string} src - The URL to the audio file
	 * @returns {Player} - A new Player
	*/
	constructor(src) {
		this.src = src
		this.init()
	}

	/**
	 * Initializes the Player instance
	*/
	init() {
		this.createAudioElement(this.src)
	}

	/**
	 * Creates an audio element
	 * @param {string} src - The URL to the audio file
	 * @returns {void}
	*/
	createAudioElement(src) {
		const audio = document.createElement('audio')
		audio.src = src
		audio.controls = true
		audio.preload = 'metadata'

		this.audioElement = audio
	}

	/**
	 * Returns the audio element
	 * @returns {HTMLAudioElement} - An audio element
	*/
	getAudioElement() {
		return this.audioElement
	}

	/**
	 * Returns the current time of the audio element
	 * @returns {number} - The current time of the audio element
	*/
	getCurrentTime() {
		return this.audioElement.currentTime
	}
}