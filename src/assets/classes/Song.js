import { BandBook } from './BandBook.js'
import { Marker } from './Marker.js'
import { MarkerList } from './MarkerList.js'
import { Player } from './Player.js'
import { Modal } from './Modal.js'

/**
 * Represents a song
*/
export class Song {
	/**
	 * @param {Player} player - The player for the song
	 * @default null
	*/
	player = null

	/**
	 * @typedef {Object} MarkerData
	 * @property {number} time - The time for the marker
	 * @property {string} title - The title for the marker
	 * @property {string} id - The marker ID
	*/

	/**
	 * @param {Array<MarkerData>} markerData - An array of markers for the song
	 * @default []
	*/
	markerData = []

	/**
	 * @constructor
	 * @param {string} slug - The song slug
	 * @param {{ArrayBuffer}} src - The URL to the song audio file
	 * @param {string} srcType - The type of the song audio file
	 * @param {string} title - The title for the song
	 * @param {string} composer - The composer for the song
	 * @param {number} tempo - The tempo for the song
	 * @param {string} key - The key for the song
	 * @param {string} timeSignature - The time signature for the song
	 * @param {string} notes - The notes for the song
	 * @param {Array<MarkerData>} markers - An array of markers for the song
	 * @param {BandBook} bandbook - A Bandbook instance
	 * @returns {Song} - A new Song instance
	*/
	constructor({slug, src, srcType, title, composer, tempo, key, timeSignature, notes, markers = []}, bandbook) {
		// Assign properties
		this.slug = slug
		this.src = src
		this.srcType = srcType
		this.player = new Player(src, srcType, this)
		this.title = title
		this.composer = composer
		this.tempo = tempo
		this.key = key
		this.timeSignature = timeSignature
		this.notes = notes
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
	 * Returns an edit song button
	 * @returns {HTMLButtonElement} - A button element
	*/
	getEditSongButton() {
		const button = document.createElement('button')
		button.textContent = 'Edit Song'
		button.addEventListener('click', () => {
			const modalHeader = document.createElement('h2')
			modalHeader.textContent = this.title

			// Append buttons to modal header and get edit form content
			modalHeader.appendChild(this.getEditTitleButton())
			modalHeader.appendChild(this.getDeleteSongButton())
			const modalContent = this.getEditForm()

			// Open modal
			new Modal(modalHeader, modalContent, { useForm: true })
		})
		return button
	}

	/**
	 * Returns an edit title button
	 * @returns {HTMLButtonElement} - A button element
	*/
	getEditTitleButton() {
		const button = document.createElement('button')
		button.classList.add('edit-song-title')
		button.innerHTML = '&#9998;'
		button.ariaLabel = 'Edit title'
		button.addEventListener('click', () => {
			const newTitle = prompt('Enter a new title:', this.title)
			if (newTitle) {
				this.setTitle(newTitle)
				this.bandbook.syncManager.updateSongTitle(this, newTitle)
				this.bandbook.refresh()
				this.bandbook.workspace.setSongWorkspace(this)
			}
		})
		return button
	}

	/**
	 * Returns an edit form for the song
	 * @returns {HTMLDivElement} - A div wrapper around the form element
	*/
	getEditForm() {
		const div = document.createElement('div')
		div.classList.add('edit-song')

		// composer
		const composerLabel = document.createElement('label')
		const composerSpan = document.createElement('span')
		composerSpan.textContent = 'Composer'
		const composerInput = document.createElement('input')
		composerInput.type = 'text'
		composerInput.value = this.composer
		composerInput.addEventListener('change', () => {
			this.composer = composerInput.value
			this.bandbook.syncManager.updateSongComposer(this, composerInput.value)
		})
		composerLabel.appendChild(composerSpan)
		composerLabel.appendChild(composerInput)
		div.appendChild(composerLabel)

		// tempo
		const tempoLabel = document.createElement('label')
		const tempoSpan = document.createElement('span')
		tempoSpan.textContent = 'Tempo'
		const tempoInput = document.createElement('input')
		tempoInput.type = 'number'
		tempoInput.value = this.tempo
		tempoInput.addEventListener('change', () => {
			this.tempo = tempoInput.value
			this.bandbook.syncManager.updateSongTempo(this, tempoInput.value)
		})
		tempoLabel.appendChild(tempoSpan)
		tempoLabel.appendChild(tempoInput)
		div.appendChild(tempoLabel)

		// key
		const keyLabel = document.createElement('label')
		const keySpan = document.createElement('span')
		keySpan.textContent = 'Key'
		const keyInput = document.createElement('input')
		keyInput.type = 'text'
		keyInput.value = this.key
		keyInput.addEventListener('change', () => {
			this.key = keyInput.value
			this.bandbook.syncManager.updateSongKey(this, keyInput.value)
		})
		keyLabel.appendChild(keySpan)
		keyLabel.appendChild(keyInput)
		div.appendChild(keyLabel)

		// time signature
		const timeSignatureLabel = document.createElement('label')
		const timeSignatureSpan = document.createElement('span')
		timeSignatureSpan.textContent = 'Time Signature'
		const timeSignatureInput = document.createElement('input')
		timeSignatureInput.type = 'text'
		timeSignatureInput.value = this.timeSignature
		timeSignatureInput.addEventListener('change', () => {
			this.timeSignature = timeSignatureInput.value
			this.bandbook.syncManager.updateSongTimeSignature(this, timeSignatureInput.value)
		})
		timeSignatureLabel.appendChild(timeSignatureSpan)
		timeSignatureLabel.appendChild(timeSignatureInput)
		div.appendChild(timeSignatureLabel)

		// notes (text area)
		const notesLabel = document.createElement('label')
		notesLabel.htmlFor = 'song-notes'
		const notesSpan = document.createElement('span')
		notesSpan.textContent = 'Notes'
		const notesInput = document.createElement('textarea')
		notesInput.value = this.notes
		notesInput.id = 'song-notes'
		notesInput.name = 'song-notes'
		notesInput.rows = 4
		notesInput.addEventListener('change', () => {
			this.notes = notesInput.value
			this.bandbook.syncManager.updateSongNotes(this, notesInput.value)
		})
		notesLabel.appendChild(notesSpan)
		notesLabel.appendChild(notesInput)
		div.appendChild(notesLabel)

		return div
	}

	/**
	 * Sets the title of the song
	*/
	setTitle(title) {
		this.title = title
	}

	/**
	 * Returns a delete song button
	 * @returns {HTMLButtonElement} - A button element
	 */
	getDeleteSongButton() {
		const button = document.createElement('button')
		button.classList.add('delete-song')
		button.innerHTML = '&#128465;'
		button.addEventListener('click', () => {
			if (confirm(`Are you sure you want to delete ${this.title}?`)) {
				this.bandbook.removeSong(this)
			} else {
				return
			}
		})
		return button
	}

	/**
	 * Gets the wrapper element with the song action buttons
	 * @returns {HTMLDivElement} - A div element
	*/
	getActionButtons() {
		const wrapper = document.createElement('div')
		wrapper.appendChild(this.getEditSongButton())
		return wrapper
	}

	/**
	 * Get workspace header
	 * @returns {HTMLElement} - A header element
	*/
	getHeader() {
		const header = document.createElement('header')
		header.classList.add('song-header')
		header.appendChild(this.getTitleElement())
		header.appendChild(this.getActionButtons())
		return header
	}

	/**
	 * @typedef {Object} SongMeta
	 * @property {string} slug - The song slug
	 * @property {string} title - The title for the song
	 * @property {string} composer - The composer for the song
	 * @property {number} tempo - The tempo for the song
	 * @property {string} key - The key for the song
	 * @property {string} timeSignature - The time signature for the song
	 * @property {string} notes - The notes for the song
	 * @property {Array<string>} markers - An array of marker IDs for the song
	*/

	/**
	 * Get song data for serialization
	 * @returns {Object} - A song object
	 * @extends {SongMeta}
	 * @property {string} src - The URL to the song audio file
	 * @property {Array<MarkerData>} markers - An array of markers for the song
	*/
	async getData() {
		return new Promise(async (resolve, reject) => {
			try {
				const stringifiedSrc = await this.getStringifiedSrc()
				const data = {
					...this.getMetadata(),
					src: stringifiedSrc,
					markers: this.getMarkerData()
				}

				resolve(data)
			} catch (error) {
				reject(error)
			}
		})
	}

	/**
	 * Get the stringified song src
	 * @returns {Promise<string>} - A base64 string of the song src
	 * @throws {Error} - An error if the song src cannot be stringified
	 * @async
	*/
	getStringifiedSrc() {
		return new Promise((resolve, reject) => {
			// Convert ArrayBuffer to audio file and then to base64 string
			const blob = new Blob([this.src], { type: this.srcType })
			const reader = new FileReader()
			reader.readAsDataURL(blob)
			reader.onloadend = () => {
				resolve(reader.result)
			}

			reader.onerror = () => {
				reject(new Error('Failed to convert song src to base64 string'))
			}
		})
	}

	/**
	 * Get song metadata for serialization
	 * @returns {SongMeta} - A song metadata object
	*/
	getMetadata() {
		return {
			slug: this.slug,
			title: this.title,
			srcType: this.srcType,
			composer: this.composer,
			tempo: this.tempo,
			key: this.key,
			timeSignature: this.timeSignature,
			notes: this.notes,
			markers: this.getMarkerData().map(marker => marker.id)
		}
	}

	/**
	 * Get marker data for serialization
	 * @returns {Array<Object>} - An array of marker data
	 * @property {number} time - The time for the marker
	 * @property {string} title - The title for the marker
	 * @property {string} id - The marker ID
	*/
	getMarkerData() {
		return this.markerList.markers.map(marker => {
			return marker.getData()
		})
	}

	/**
	 * Get song src data for serialization
	 * @returns {Object} - A song src object
	 * @property {string} id - The song slug
	 * @property {string} src - The URL to the song audio file
	*/
	getSrcData() {
		return {
			id: this.slug,
			src: this.src,
			srcType: this.srcType
		}
	}
}