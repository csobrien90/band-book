import { secondsToFormattedTime as format, isIOS } from '../utils.js'
import { Icon } from './Icon.js'

export class Player {
	/**
	 * @constructor
	 * @param {ArrayBuffer} src - The URL to the audio file
	 * @param {string} srcType - The type of the audio file
	 * @param {Song} song - The song instance
	 * @returns {Player} - A new Player
	*/
	constructor(src, srcType, song) {
		this.src = src
		this.srcType = srcType
		this.song = song
		this.init()
	}

	/**
	 * Initializes the Player instance
	 * @returns {void}
	*/
	init() {
		this.createAudioElement(this.src)

		this.volumeIcon = new Icon('volume').getImg()
		this.mutedIcon = new Icon('muted').getImg()
	}

	/**
	 * Creates an audio element
	 * @param {ArrayBuffer} src - The URL to the audio file
	 * @returns {void}
	*/
	createAudioElement(src) {
		const audio = document.createElement('audio')
		const songBlob = new Blob([src], { type: this.srcType })
		const songUrl = URL.createObjectURL(songBlob)
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
		return this?.audioElement
	}

	/**
	 * Returns the player element
	 * @returns {HTMLDivElement} - A div element
	*/
	getPlayerElement() {
		const playerElement = document.createElement('div')
		playerElement.className = 'player'
		this.song.bandbook.wrapper.classList.add('bandbook-loading')

		this.getWaveform().then(waveform => {
			/* Top Row */
			const topRow = document.createElement('div')
			topRow.className = 'top-row'
			topRow.appendChild(this.getPlayPauseButton())

			const { currentTimeElement, durationElement } = this.getTimeElements()
			const seekingWrapper = document.createElement('div')
			seekingWrapper.className = 'seeking-wrapper'
			seekingWrapper.appendChild(currentTimeElement)
			seekingWrapper.appendChild(this.getSeekingElement(waveform))
			seekingWrapper.appendChild(durationElement)

			topRow.appendChild(seekingWrapper)
			
			topRow.appendChild(this.getVolumeControl())

			/* Bottom Row */
			const bottomRow = document.createElement('div')
			bottomRow.className = 'bottom-row'
			bottomRow.appendChild(this.getSkipButtons())
			bottomRow.appendChild(this.getSpeedControl())
			bottomRow.appendChild(this.getDowloadButton())

			/* Append everything to the player element */
			playerElement.appendChild(topRow)
			playerElement.appendChild(bottomRow)
		}).catch(error => {
			console.error('Error creating waveform:', error)
		}).finally(() => {
			this.song.bandbook.wrapper.classList.remove('bandbook-loading')
		})

		this.playerElement = playerElement
		return playerElement
	}

	/**
	 * Returns the time elements
	 * @returns {{ currentTimeElement: HTMLSpanElement, durationElement: HTMLSpanElement }} - An object containing current time and duration elements
	*/
	getTimeElements() {
		const timeElement = document.createElement('p')
		timeElement.className = 'time'

		const currentTimeElement = document.createElement('span')
		currentTimeElement.className = 'current-time'
		currentTimeElement.textContent = format(this?.audioElement.currentTime) || format(0)

		const durationElement = document.createElement('span')
		durationElement.className = 'duration'
		durationElement.textContent = format(this?.audioElement.duration) || format(0)

		this?.audioElement.addEventListener('loadedmetadata', () => {
			durationElement.textContent = format(this?.audioElement.duration)
		})

		this?.audioElement.addEventListener('timeupdate', () => {
			currentTimeElement.textContent = format(this?.audioElement.currentTime)
			durationElement.textContent = format(this?.audioElement.duration)
			const currentTimeRatio = this?.audioElement.currentTime / this?.audioElement.duration
			const roundedCurrentTimeRatio = currentTimeRatio.toFixed(4)
			this.playerElement.style.setProperty('--current-time-ratio', roundedCurrentTimeRatio)
		})

		return { currentTimeElement, durationElement }
	}

	/**
	 * Returns the progress bar element
	 * @returns {HTMLDivElement} - A progress element
	*/
	getSeekingElement(waveformElement) {
		const seekingInput = document.createElement('input')
		seekingInput.type = 'range'
		seekingInput.min = 0
		seekingInput.max = this?.audioElement.duration || 0
		seekingInput.value = this?.audioElement.currentTime || 0
		seekingInput.step = 1
		seekingInput.id = 'seeking-input'
		seekingInput.addEventListener('input', () => {
			this.audioElement.currentTime = seekingInput.value
		})

		this?.audioElement.addEventListener('loadedmetadata', () => {
			seekingInput.max = this?.audioElement.duration
		})

		this?.audioElement.addEventListener('timeupdate', () => {
			const current = this?.audioElement.currentTime
			seekingInput.value = current
			const markers = this?.song?.markerList?.markers

			// Find which segment marker should be active
			const activeMarker = markers?.findLast(m => m.time < current)

			// If the current time is before any marker (or there aren't any markers)
			if (!activeMarker) {
				// Deactivate active markers, refresh the display, and return
				markers.forEach(marker => marker.setSegmentIsActive(false))
				this?.song?.markerList?.renderMarkersList()
				return
			}

			// If the discovered active marker is already active, return
			if (activeMarker.segmentIsActive) return
			else {
				// Update all markers to reflect new active/inactive status
				markers.forEach(marker => marker.setSegmentIsActive(marker === activeMarker))

				// Refresh the marker list display to reflect newly active marker
				this?.song?.markerList?.renderMarkersList()
			}

		})

		if (waveformElement) {
			waveformElement.appendChild(seekingInput)
			return waveformElement
		} else {
			const seekingElement = document.createElement('div')
			seekingElement.className = 'seeking-element'
			seekingElement.appendChild(seekingInput)
			return seekingElement
		}
	}

	/**
	 * Returns the play/pause button
	 * @returns {HTMLButtonElement} - A button element
	*/
	getPlayPauseButton() {
		const button = document.createElement('button')
		button.className = 'play-pause'
		button.textContent = 'Play'

		this?.audioElement.addEventListener('play', () => {
			button.textContent = 'Pause'
		})

		this?.audioElement.addEventListener('pause', () => {
			button.textContent = 'Play'
		})

		button.addEventListener('click', () => {
			if (this?.audioElement.paused) {
				this?.audioElement.play()
			} else {
				this?.audioElement.pause()
			}
		})

		return button
	}

	/**
	 * Returns the skip buttons
	 * @returns {HTMLDivElement} - A div element
	*/
	getSkipButtons() {
		const skipButtonsWrapper = document.createElement('div')
		skipButtonsWrapper.className = 'skip-button-wrapper'

		const skipTimes = this.song.bandbook.settingsManager.getSkipTimes().sort((a, b) => a - b)

		skipTimes.forEach(time => {
			const skipButton = document.createElement('button')
			skipButton.className = time < 0 ? 'skip-backward' : 'skip-forward'
			skipButton.textContent = `${time < 0 ? '<< ' : '>> '}${Math.abs(time)}s`
			skipButton.addEventListener('click', () => {
				this.audioElement.currentTime += time
			})
			skipButtonsWrapper.appendChild(skipButton)
		})

		return skipButtonsWrapper
	}

	/**
	 * Updates the skip buttons in the player element
	 * @returns {void}
	*/
	updateSkipButtons() {
		const skipButtons = this.playerElement.querySelector('.skip-button-wrapper')
		if (!skipButtons) return

		const newskipButtonsWrapper = this.getSkipButtons()
		skipButtons.replaceChildren(...newskipButtonsWrapper.children)
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
		const isMuted = this?.audioElement.muted || false
		muteButton.ariaLabel = isMuted ? 'Unmute' : 'Mute'
		muteButton.appendChild(isMuted ? this.mutedIcon : this.volumeIcon)

		const volumeSliderWrapper = document.createElement('div')
		volumeSliderWrapper.className = 'volume-slider-wrapper'

		const volumeInput = document.createElement('input')
		volumeInput.id = 'volume-input'
		volumeInput.type = 'range'
		volumeInput.min = 0
		volumeInput.max = 1
		volumeInput.step = 0.01
		volumeInput.value = this?.audioElement.volume || 1

		const volumeLabel = document.createElement('label')
		volumeLabel.textContent = `Volume: ${Math.round(volumeInput.value * 100)}%`
		volumeLabel.className = 'sr-only'
		volumeLabel.htmlFor = 'volume-input'

		muteButton.addEventListener('click', () => {
			this.audioElement.muted = !this?.audioElement.muted
			muteButton.ariaLabel = this?.audioElement.muted ? 'Unmute' : 'Mute'
			muteButton.replaceChildren(this?.audioElement.muted ? this.mutedIcon : this.volumeIcon)
			volumeInput.value = this?.audioElement.muted ? 0 : this?.audioElement.volume
			volumeLabel.textContent = `Volume: ${Math.round(volumeInput.value * 100)}%`
		})

		volumeInput.addEventListener('input', () => {
			this.audioElement.volume = volumeInput.value
			volumeLabel.textContent = `Volume: ${Math.round(volumeInput.value * 100)}%`
			if (volumeInput.value === '0' || this?.audioElement.muted) {
				muteButton.replaceChildren(this.mutedIcon)
			} else {
				muteButton.replaceChildren(this.volumeIcon)
			}
		})

		volumeControl.appendChild(muteButton)
		volumeSliderWrapper.appendChild(volumeLabel)
		volumeSliderWrapper.appendChild(volumeInput)
		volumeControl.appendChild(volumeSliderWrapper)

		return volumeControl
	}

	/**
	 * Returns the speed control element
	 * @returns {HTMLDivElement} - A div element
	*/
	getSpeedControl() {
		const speedControl = document.createElement('div')
		speedControl.className = 'speed-control'

		// Create a select element with preset options
		const presetSpeedOptions = ['0.5', '0.75', '1', '1.25', '1.5']
		const speedSelect = document.createElement('select')
		speedSelect.className = 'speed-select'

		presetSpeedOptions.forEach(option => {
			const speedOption = document.createElement('option')
			speedOption.value = option
			speedOption.textContent = `${option}x`
			speedSelect.appendChild(speedOption)
		})

		const customOption = document.createElement('option')
		customOption.value = 'custom'
		customOption.textContent = 'Custom'
		speedSelect.appendChild(customOption)
		speedSelect.value = this?.audioElement.playbackRate || "1"

		const speedInput = document.createElement('input')
		speedInput.style.display = speedSelect.value === 'custom' ? 'block' : 'none'
		speedInput.type = 'number'
		speedInput.min = 0.5
		speedInput.max = 2
		speedInput.step = 0.01
		speedInput.value = this?.audioElement.playbackRate || "1"

		const speedLabel = document.createElement('label')
		speedLabel.textContent = 'Speed:'
		speedLabel.className = 'sr-only'

		speedSelect.addEventListener('change', () => {
			if (speedSelect.value === 'custom') {
				speedInput.style.display = 'block'
			} else {
				speedInput.style.display = 'none'
			}
			this.audioElement.playbackRate = speedSelect.value
			speedInput.value = speedSelect.value
		})

		speedInput.addEventListener('input', () => {
			this.audioElement.playbackRate = speedInput.value
		})

		speedControl.appendChild(speedLabel)
		speedControl.appendChild(speedSelect)
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

		// Create a blob from the source and set the href attribute
		const srcBlob = new Blob([this.src], { type: this.srcType })
		const srcUrl = URL.createObjectURL(srcBlob)
		button.href = srcUrl

		// Set the download attribute based on the file type
		let type = this.srcType.split('/')[1]
		switch (type) {
			case 'x-m4a':
				type = 'm4a'
				break
			case 'mpeg':
				type = 'mp3'
				break
			default:
				break
		}

		button.download = `${this.song.title}.${type}`

		return button
	}

	/**
	 * Returns the current time of the audio element
	 * @returns {number} - The current time of the audio element
	*/
	getCurrentTime() {
		return this?.audioElement.currentTime
	}



// TODO: Make async/await


	/**
	 * Make waveform display
	 * @returns {HTMLDivElement} - A div element wrapping the waveform
	 * @returns {null} - If the audio decoding times out, returns null to use backup seeking element
	*/
	getWaveform() {
		return new Promise(async (resolve, reject) => {
			if (this.song.bandbook.settingsManager.isPerformanceMode()) return resolve(null);
			try {
				const wrapper = document.createElement('div')
				const waveformElement = document.createElement('div')
				waveformElement.className = 'waveform'
				
				try {
					if (isIOS() && this.song.src.byteLength > 10000000) {
						console.warn('iOS does not support waveform display for large files at this time')
						throw new Error('iOS does not support waveform display for large files at this time')
					}
					const averages = await this.getAverageVolumesArray()
					for (let i = 0; i < averages.length; i++) {
						const bar = document.createElement('div')
						bar.className = 'bar'
						// Set the height via CSS custom properties
						bar.style.setProperty('--bar-height', `${averages[i]}%`)
						waveformElement.appendChild(bar)
					}
		
					wrapper.appendChild(waveformElement)
					resolve(wrapper)
				} catch (error) {
					// If the audio decoding times out or otherwise fails, return null
					resolve(null)
				}
			} catch (error) {
				reject(error)
			}
		})
	}

	/**
	 * Get an array of average volumes for each 1/100th of the audio
	*/
	async getAverageVolumesArray() {
		if (this.song.waveformVolumes.length > 0) return this.song.waveformVolumes

		const clonedSrc = this.src.slice(0)
		return new Promise((resolve, reject) => {
			try {
				const audioContext = new AudioContext()
				audioContext.decodeAudioData(clonedSrc, async buffer => {
					// Get the average volume for 1/100th of the audio
					const bufferLength = buffer.length
					const samples = buffer.getChannelData(0)
					const sampleSize = bufferLength / 100
		
					// Create an array of averages for each segment of the audio
					const averages = []
		
					for (let i = 0; i < bufferLength; i += sampleSize) {
						const segment = samples.slice(i, i + sampleSize)
						const sum = segment.reduce((a, b) => a + Math.abs(b), 0)
						averages.push((sum / sampleSize) * 100)
					}

					// Normalize the averages to a 3-100% range
					const min = Math.min(...averages)
					const max = Math.max(...averages)
					const range = max - min

					const normalizedAverages = averages.map(average => {
						return ((average - min) / range) * 97 + 3
					})
					
					await this.song.setWaveformVolumes(normalizedAverages)
					resolve(normalizedAverages)
				})

				audioContext.close().catch(error => {
					console.error('Error closing audio context:', error)
				})
			} catch (error) {
				reject(error)
			}
		})
	}
}