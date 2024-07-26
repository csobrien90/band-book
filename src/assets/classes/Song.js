import { Marker } from './Marker.js'
import { MarkerList } from './MarkerList.js'

/**
 * Represents a song
*/
export class Song {
	/**
	 * @constructor
	 * @param {string} slug - The song slug
	 * @param {string} src - The URL to the song audio file
	 * @param {string} title - The title for the song
	 * @param {string} composer - The composer for the song
	 * @param {Array} markers - An array of markers for the song
	 * @param {Bandbook} bandbook - A Bandbook instance
	 * @returns {Song} - A new Song instance
	*/
	constructor({slug, src, title, composer, markers = []}, bandbook) {
		// Assign properties
		this.slug = slug
		this.src = src
		this.title = title
		this.composer = composer
		this.markerData = markers
		this.bandbook = bandbook

		// Initialize the Song instance
		this.init()
	}

	/**
	 * Initializes the Song instance
	 * @returns {void}
	*/
	init() {
		this.markerList = new MarkerList()
		this.markerList.song = this
		this.markerData.forEach(marker => {
			this.markerList.addMarker(new Marker(marker.time, this, marker.title))
		})
	}

	/**
	 * Returns a title element for the song
	 * @returns {HTMLHeadingElement} - A heading element
	*/
	getTitleElement() {
		const titleElement = document.createElement('h2')
		titleElement.textContent = this.title
		titleElement.appendChild(this.getEditTitleButton())
		return titleElement
	}

	/**
	 * Returns an edit title button
	 * @returns {HTMLButtonElement} - A button element
	*/
	getEditTitleButton() {
		const button = document.createElement('button')
		button.textContent = 'Edit Title'
		button.addEventListener('click', () => {
			const newTitle = prompt('Enter a new title:', this.title)
			if (newTitle) {
				this.setTitle(newTitle)
				this.bandbook.syncManager.sync()
				this.bandbook.refresh()
				this.bandbook.workspace.setSongWorkspace(this)
			}
		})
		return button
	}

	/**
	 * Sets the title of the song
	*/
	setTitle(title) {
		this.title = title
	}

	/**
	 * Returns a delete song button
	 */
	getDeleteSongButton() {
		const button = document.createElement('button')
		button.textContent = 'Delete Song'
		button.addEventListener('click', () => {
			this.bandbook.removeSong(this)
			this.bandbook.syncManager.sync()
		})
		return button
	}

	/**
	 * Returns an audio element for the song
	 * @returns {HTMLAudioElement} - An audio element
	 * Note: element is created only once and cached for future calls
	*/
	getAudioElement() {
		if (this.audio) return this.audio

		const audio = document.createElement('audio')
		audio.src = this.src
		audio.controls = true
		audio.preload = 'metadata'

		this.audio = audio
		return audio
	}

	/**
	 * Returns the current time of the song
	 * @returns {number} - The current time of the song
	*/
	getCurrentTime() {
		return this.getAudioElement().currentTime
	}

	/**
	 * Get song data for serialization
	 */
	getData() {
		return {
			slug: this.slug,
			src: this.src,
			title: this.title,
			composer: this.composer,
			markers: this.markerList.markers.map(marker => {
				return {
					time: marker.time,
					title: marker.title
				}
			})
		}
	}
}
