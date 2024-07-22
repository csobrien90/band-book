import { Marker } from './Marker.js'

/**
 * Represents a song
*/
export class Song {
	/**
	 * @constructor
	 * @param {string} slug - A song slug
	 * @param {string} src - A URL to the song audio file
	 * @returns {Song} - A new Song instance
	*/
	constructor(slug, src) {
		this.slug = slug
		this.src = src
		this.markers = []
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
	 * Returns a button to add a marker to the song
	 * @returns {HTMLButtonElement} - A button element
	*/
	getAddMarkerButton() {
		const button = document.createElement('button')
		button.textContent = 'Add Marker'
		button.addEventListener('click', this.createMarker.bind(this))
		return button
	}

	/**
	 * Creates a marker for the song
	 * @returns {void}
	*/
	createMarker() {
		this.markers.push(new Marker(this.getCurrentTime(), this))
		this.renderMarkersList()
	}

	/**
	 * Returns the current time of the song
	 * @returns {number} - The current time of the song
	*/
	getCurrentTime() {
		return this.getAudioElement().currentTime
	}

	/**
	 * Renders a list of markers for the song
	 * @returns {HTMLDivElement} - A div element containing a list of markers
	*/
	renderMarkersList() {
		this.setOrResetMarkersListWrapper()
		const list = this.createMarkersList()
		this.markersListWrapper.appendChild(list)
		return this.markersListWrapper
	}

	/**
	 * Creates a list of markers for the song
	 * @returns {HTMLUListElement} - A list element containing marker items
	 * Note: markers are sorted by time and, when clicked, skip to that time
	*/
	createMarkersList() {
		const list = document.createElement('ul')
		list.classList.add('markers-list')
		this.markers.sort((a,b) => {
			return a.time - b.time
		}).forEach(marker => {
			const item = document.createElement('li')
			const button = document.createElement('button')
			button.textContent = marker.getFormattedTime()
			button.addEventListener('click', () => {
				this.getAudioElement().currentTime = marker.time
				this.getAudioElement().play()
			})
			item.appendChild(button)
			list.appendChild(item)
		})
		return list
	}

	/**
	 * Sets or resets the markers list wrapper
	 * @returns {void}
	*/
	setOrResetMarkersListWrapper() {
		if (this.markersListWrapper) {
			this.markersListWrapper.innerHTML = ''
		} else {
			this.markersListWrapper = document.createElement('div')
			this.markersListWrapper.classList.add('markers-list-wrapper')
		}
	}

	/**
	 * Returns the workspace for the song
	 * @returns {HTMLDivElement} - A div element containing the audio element, add marker button, and markers list
	*/
	getWorkspace() {
		const workspace = document.createElement('section')
		workspace.classList.add('workspace')
		workspace.appendChild(this.getAudioElement())
		workspace.appendChild(this.getAddMarkerButton())
		workspace.appendChild(this.renderMarkersList())
		return workspace
	}
}