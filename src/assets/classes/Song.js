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
	 * @param {number} tempo - The tempo for the song
	 * @param {string} key - The key for the song
	 * @param {string} timeSignature - The time signature for the song
	 * @param {string} notes - The notes for the song
	 * @param {Array} markers - An array of markers for the song
	 * @param {Bandbook} bandbook - A Bandbook instance
	 * @returns {Song} - A new Song instance
	*/
	constructor({slug, src, title, composer, tempo, key, timeSignature, notes, markers = []}, bandbook) {
		// Assign properties
		this.slug = slug
		this.src = src
		this.player = new Player(src)
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

			modalHeader.appendChild(this.getEditTitleButton())
			modalHeader.appendChild(this.getDeleteSongButton())

			const modalContent = this.getEditForm()
			const modal = new Modal(modalHeader, modalContent, { useForm: true })
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
	 * @returns {HTMLFormElement} - A form element
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
	*/
	getActionButtons() {
		const wrapper = document.createElement('div')
		wrapper.appendChild(this.getEditSongButton())
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
			...this.getMetadata(),
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
			tempo: this.tempo,
			key: this.key,
			timeSignature: this.timeSignature,
			notes: this.notes,
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