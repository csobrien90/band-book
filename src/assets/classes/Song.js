import { BandBook } from './BandBook.js'
import { Marker } from './Marker.js'
import { MarkerList } from './MarkerList.js'
import { Player } from './Player.js'
import { Modal } from './Modal.js'
import { Notification } from './Notification.js'
import { Icon } from './Icon.js'

/**
 * @typedef {Object} MarkerData
 * @property {number} time - The time for the marker
 * @property {string} title - The title for the marker
 * @property {string} notes - Additional notes for the marker
 * @property {string} id - The marker ID
*/

/**
 * @typedef {Object} SongMeta
 * @property {string} slug - The unique slug identifier for the song.
 * @property {string} title - The title of the song.
 * @property {string} composer - The name of the composer for the song.
 * @property {number} tempo - The tempo of the song in beats per minute (BPM).
 * @property {string} key - The musical key of the song.
 * @property {string} timeSignature - The time signature of the song (e.g., "4/4").
 * @property {string} notes - Additional notes or lyrics related to the song.
 * @property {Array<string>} markers - An array of marker IDs associated with the song.
*/

/**
 * @typedef {string} src - The URL or binary data for the song audio file.
 * @typedef {SongMeta & src} SongData 
*/

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
	 * @constructor
	 * @param {Object} params - The parameters for the song.
	 * @param {string} params.id - The unique identifier for the song.
	 * @param {string} params.slug - The unique slug identifier for the song.
	 * @param {ArrayBuffer | string} params.src - The URL or binary data for the song audio file.
	 * @param {string} params.srcType - The MIME type of the audio file.
	 * @param {string} params.title - The title of the song.
	 * @param {string} params.composer - The name of the composer for the song.
	 * @param {number} params.tempo - The tempo of the song in BPM.
	 * @param {string} params.key - The musical key of the song.
	 * @param {string} params.timeSignature - The time signature of the song.
	 * @param {string} params.notes - Additional notes or lyrics related to the song.
	 * @param {Array<MarkerData>} [params.markers=[]] - An optional array of markers for the song.
	 * @param {Array<number>} [params.waveformVolumes=[]] - An optional array of average volumes for the song waveform display.
	 * @param {BandBook} bandbook - An instance of the BandBook class.
	 * @returns {Song} - A new Song instance.
	*/
	constructor({id, slug, src, srcType, title, composer, tempo, key, timeSignature, notes, markers = [], waveformVolumes = []}, bandbook) {
		// Assign properties
		this.slug = slug
		
		// If the src is a string, convert it to an ArrayBuffer
		if (typeof src === 'string') {
			try {
				const binary = atob(src.split(',')[1])
				const array = []

				if (binary.length <= 112800000) {
					for (let i = 0; i < binary.length; i++) {
						array.push(binary.charCodeAt(i))
					}
					src = new Uint8Array(array).buffer
				} else {
					throw new Error(`Song source for ${title} is too large`)
					// TODO: fix large src conversion
				}
			} catch (error) {
				new Notification(error, "error")
				src = new ArrayBuffer()
			}
		}

		this.id = id ?? crypto.randomUUID()
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
		this.waveformVolumes = waveformVolumes
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
			if (!marker) {
				console.warn('Invalid marker data:', marker)
				return
			}
			this.markerList?.addMarker(new Marker(marker.time, this, marker.title, marker.notes, marker.tags, marker.id))
		})
	}

	/**
	 * Gets the song duration
	 * @returns {number} - The duration of the song in seconds
	 * @returns {null} - Returns null if the player is not available or the audio does not have a duration
	*/
	getDuration() {
		return this.player?.getAudioElement()?.duration
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
			modalHeader.appendChild(this.getEditTitleButton(modalHeader))
			modalHeader.appendChild(this.getDeleteSongButton())
			const modalContent = this.getEditForm()

			// Open modal
			new Modal(modalHeader, modalContent, { useForm: true })
		})
		return button
	}

	/**
	 * Returns an edit title button
	 * @param {HTMLHeadingElement} modalHeader - The modal header element
	 * @returns {HTMLButtonElement} - A button element
	*/
	getEditTitleButton(modalHeader) {
		const button = document.createElement('button')
		button.classList.add('edit-asset-title')
		button.ariaLabel = 'Edit title'
		button.appendChild(new Icon('edit').getImg())
		button.addEventListener('click', () => {
			modalHeader.innerHTML = ''
			const titleInput = document.createElement('input')
			titleInput.type = 'text'
			titleInput.value = this.title

			const saveButton = document.createElement('button')
			saveButton.textContent = 'Save'
			saveButton.addEventListener('click', (e) => {
				e.preventDefault()
				this.setTitle(titleInput.value)
				this.bandbook.syncManager.updateSongTitle(this, titleInput.value)
				this.bandbook.refresh()

				// Update modal header
				modalHeader.textContent = this.title
				modalHeader.appendChild(this.getEditTitleButton(modalHeader))
				modalHeader.appendChild(this.getDeleteSongButton())
			})

			modalHeader.appendChild(titleInput)
			modalHeader.appendChild(saveButton)
		})
		return button
	}

	/**
	 * Returns an edit form for the song
	 * @returns {HTMLDivElement} - A div wrapper around the form element
	*/
	getEditForm() {
		const div = document.createElement('div')
		div.classList.add('edit-asset')

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
	 * @param {string} title - The title of the song
	 * @returns {void}
	*/
	setTitle(title) {
		this.title = title
	}

	/**
	 * Returns a delete song button
	 * @returns {HTMLButtonElement} - A button element
	 * @param {boolean} [modal=true] - A boolean indicating whether this is in the edit song modal
	 */
	getDeleteSongButton(modal = true) {
		const button = document.createElement('button')
		button.classList.add('delete-song')
		button.ariaLabel = 'Delete song'
		button.appendChild(new Icon('delete').getImg())
		button.addEventListener('click', (e) => {
			e.preventDefault()
			if (confirm(`Are you sure you want to delete ${this.title}?`)) {
				this.bandbook.removeSong(this)
				this.bandbook.refresh()
				if (modal) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
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
	 * Get song data for serialization
	 * @returns {Promise<SongData>} - A promise that resolves with the song data
	 * @throws {Error} - An error if the song data cannot be retrieved
	 * @async
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
			markers: this.getMarkerData().map(marker => marker.id),
			waveformVolumes: this.waveformVolumes
		}
	}

	/**
	 * Get marker data for serialization
	 * @returns {Array<MarkerData>} - An array of marker data objects
	*/
	getMarkerData() {
		return this.markerList?.markers.map(marker => {
			return marker.getData()
		})
	}

	/**
	 * Set the array of average volumes for the song (used for the waveform display)
	 * @param {Array} waveformVolumes 
	 */
	setWaveformVolumes(waveformVolumes) {
		this.waveformVolumes = waveformVolumes
		this.bandbook.syncManager.updateSongWaveformVolumes(this, waveformVolumes)
	}

	/**
	 * Update the src
	 * @param {string | ArrayBuffer} src - The new src for the song
	 * @returns {void}
	*/
	updateSrc(src) {
		this.src = src
		delete this.player
		this.player = new Player(src, this.srcType, this)
	}
}