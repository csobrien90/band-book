import { secondsToFormattedTime as format } from '../utils.js'

export class Player {
	/**
	 * @constructor
	 * @param {ArrayBuffer} src - The URL to the audio file
	 * @param {Song} song - The song instance
	 * @returns {Player} - A new Player
	*/
	constructor(src, song) {
		this.src = src
		this.song = song
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
		const songBlob = new Blob([src], { type: "audio/mp3" });
		const songUrl = URL.createObjectURL(songBlob);
		audio.src = songUrl
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
	 * Returns the player element
	 * @returns {HTMLDivElement} - A div element
	*/
	getPlayerElement() {
		const playerElement = document.createElement('div')
		playerElement.className = 'player'

		playerElement.appendChild(this.getTimeElement())
		playerElement.appendChild(this.getSeekingElement())
		playerElement.appendChild(this.getPlayPauseButton())
		playerElement.appendChild(this.getVolumeControl())
		playerElement.appendChild(this.getSpeedControl())
		playerElement.appendChild(this.getDowloadButton())

		return playerElement
	}

	/**
	 * Returns the time element
	 * @returns {HTMLSpanElement} - A span element
	*/
	getTimeElement() {
		const timeElement = document.createElement('p')
		timeElement.className = 'time'

		const currentTime = document.createElement('span')
		currentTime.className = 'current-time'
		currentTime.textContent = format(this.audioElement.currentTime) || 0

		const durationElement = document.createElement('span')
		durationElement.className = 'duration'

		this.audioElement.addEventListener('loadedmetadata', () => {
			durationElement.textContent = format(this.audioElement.duration)
		})

		this.audioElement.addEventListener('timeupdate', () => {
			currentTime.textContent = format(this.audioElement.currentTime)
			durationElement.textContent = format(this.audioElement.duration)
		})

		timeElement.appendChild(currentTime)
		timeElement.appendChild(document.createTextNode(' / '))
		timeElement.appendChild(durationElement)

		return timeElement
	}

	/**
	 * Returns the progress bar element
	 * @returns {HTMLProgressElement} - A progress element
	*/
	getSeekingElement() {
		const seekingElement = document.createElement('div')
		seekingElement.className = 'seeking'

		const seekingInput = document.createElement('input')
		seekingInput.type = 'range'
		seekingInput.min = 0
		seekingInput.max = this.audioElement.duration || 0
		seekingInput.value = this.audioElement.currentTime || 0
		seekingInput.step = 1
		seekingInput.className = 'seeking-input'
		seekingInput.addEventListener('input', () => {
			this.audioElement.currentTime = seekingInput.value
		})

		this.audioElement.addEventListener('loadedmetadata', () => {
			seekingInput.max = this.audioElement.duration
		})

		this.audioElement.addEventListener('timeupdate', () => {
			seekingInput.value = this.audioElement.currentTime
		})

		seekingElement.appendChild(seekingInput)

		return seekingElement
	}

	/**
	 * Returns the play/pause button
	 * @returns {HTMLButtonElement} - A button element
	*/
	getPlayPauseButton() {
		const button = document.createElement('button')
		button.className = 'play-pause'
		button.textContent = 'Play'

		this.audioElement.addEventListener('play', () => {
			button.textContent = 'Pause'
		})

		this.audioElement.addEventListener('pause', () => {
			button.textContent = 'Play'
		})

		button.addEventListener('click', () => {
			if (this.audioElement.paused) {
				this.audioElement.play()
			} else {
				this.audioElement.pause()
			}
		})

		return button
	}

	/**
	 * Returns the volume control element
	 * @returns {HTMLDivElement} - A div element
	*/
	getVolumeControl() {
		const volumeControl = document.createElement('div')
		volumeControl.className = 'volume-control'

		const muteButton = document.createElement('button')
		muteButton.className = 'mute'
		muteButton.textContent = 'Mute'

		const volumeInput = document.createElement('input')
		volumeInput.type = 'range'
		volumeInput.min = 0
		volumeInput.max = 1
		volumeInput.step = 0.01
		volumeInput.value = this.audioElement.volume || 1

		const volumeLabel = document.createElement('label')
		volumeLabel.textContent = `Volume: ${Math.round(volumeInput.value * 100)}%`

		muteButton.addEventListener('click', () => {
			this.audioElement.muted = !this.audioElement.muted
			muteButton.textContent = this.audioElement.muted ? 'Unmute' : 'Mute'
			volumeInput.value = this.audioElement.muted ? 0 : this.audioElement.volume
			volumeLabel.textContent = `Volume: ${Math.round(volumeInput.value * 100)}%`
		})

		volumeInput.addEventListener('input', () => {
			this.audioElement.volume = volumeInput.value
			volumeLabel.textContent = `Volume: ${Math.round(volumeInput.value * 100)}%`
			if (volumeInput.value === '0' || this.audioElement.muted) {
				muteButton.textContent = 'Unmute'
			} else {
				muteButton.textContent = 'Mute'
			}
		})

		volumeControl.appendChild(muteButton)
		volumeControl.appendChild(volumeLabel)
		volumeControl.appendChild(volumeInput)

		return volumeControl
	}

	/**
	 * Returns the speed control element
	 * @returns {HTMLDivElement} - A div element
	*/
	getSpeedControl() {
		const speedControl = document.createElement('div')
		speedControl.className = 'speed-control'

		const speedInput = document.createElement('input')
		speedInput.type = 'range'
		speedInput.min = 0.5
		speedInput.max = 2
		speedInput.step = 0.01
		speedInput.value = this.audioElement.playbackRate || 1

		const speedLabel = document.createElement('label')
		speedLabel.textContent = `Speed: ${speedInput.value}x`

		speedInput.addEventListener('input', () => {
			this.audioElement.playbackRate = speedInput.value
			speedLabel.textContent = `Speed: ${speedInput.value}x`
		})

		speedControl.appendChild(speedLabel)
		speedControl.appendChild(speedInput)

		return speedControl
	}

	/**
	 * Returns the download button
	 * @returns {HTMLAnchorElement} - An anchor element
	*/
	getDowloadButton() {
		const button = document.createElement('a')
		button.className = 'btn'
		button.textContent = 'Download'
	
		const srcBlob = new Blob([this.src], { type: "audio/mp3" });
		const srcUrl = URL.createObjectURL(srcBlob);

		button.href = srcUrl
		button.download = `${this.song.title}.mp3`

		return button
	}

	/**
	 * Returns the current time of the audio element
	 * @returns {number} - The current time of the audio element
	*/
	getCurrentTime() {
		return this.audioElement.currentTime
	}
}