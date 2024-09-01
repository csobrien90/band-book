import { Marker } from './Marker.js'
import { MarkerList } from './MarkerList.js'
import { Player } from './Player.js'
import { Modal } from './Modal.js'

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
		this.player = new Player(src)
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
		this.markerList = new MarkerList(this)
		this.markerData.forEach(marker => {
			this.markerList.addMarker(new Marker(marker.time, this, marker.title, marker.id))
		})
	}

	/**
	 * Returns a title element for the song
	 * @returns {HTMLHeadingElement} - A heading element
	*/
	getTitleElement() {
		const titleElement = document.createElement('h2')
		titleElement.textContent = this.title
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
			const modalContent = document.createElement('p')
			modalContent.textContent = 'Song modal content!!!'
			const modal = new Modal('Edit Song Title', modalContent)



			// const newTitle = prompt('Enter a new title:', this.title)
			// if (newTitle) {
			// 	this.setTitle(newTitle)
			// 	this.bandbook.syncManager.updateSongTitle(this, newTitle)
			// 	this.bandbook.refresh()
			// 	this.bandbook.workspace.setSongWorkspace(this)
			// }
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
		})
		return button
	}

	/**
	 * Gets the wrapper element with the song action buttons
	*/
	getActionButtons() {
		const wrapper = document.createElement('div')
		wrapper.appendChild(this.getEditTitleButton())
		wrapper.appendChild(this.getDeleteSongButton())
		return wrapper
	}

	/**
	 * Get workspace header
	*/
	getHeader() {
		const header = document.createElement('header')
		header.classList.add('song-header')
		header.appendChild(this.getTitleElement())
		header.appendChild(this.getActionButtons())
		return header
	}

	/**
	 * Get song data for serialization
	*/
	getData() {
		return {
			slug: this.slug,
			title: this.title,
			composer: this.composer,
			src: this.src,
			markers: this.getMarkerData()
		}
	}

	/**
	 * Get song metadata for serialization
	*/
	getMetadata() {
		return {
			slug: this.slug,
			title: this.title,
			composer: this.composer,
			markers: this.getMarkerData().map(marker => marker.id)
		}
	}

	/**
	 * Get marker data for serialization
	*/
	getMarkerData() {
		return this.markerList.markers.map(marker => {
			return marker.getData()
		})
	}

	/**
	 * Get song src data for serialization
	*/
	getSrcData() {
		return {
			id: this.slug,
			src: this.src
		}
	}
}