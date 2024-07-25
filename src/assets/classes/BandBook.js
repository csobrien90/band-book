import { Song } from './Song.js'
import { Workspace } from './Workspace.js'

/**
 * Represents a collection of songs
*/
export class BandBook {
	/**
	 * @constructor
	 * @param {HTMLElement} wrapperElement - An HTML element to render the workspace
	 * @returns {BandBook} - A new BandBook instance
	*/
	constructor(wrapperElement) {
		this.wrapper = wrapperElement
		this.workspace = new Workspace(wrapperElement)
		this.navElement = null
		this.songData = []
		this.load()
		
		this.init()
	}

	/**
	 * Initializes the BandBook instance
	 * @returns {void}
	*/
    init() {		
		// Create an array of Song instances from the song data
        this.songs = this.songData.map(song => {
			return new Song(song, () => this.sync(), () => this.removeSong(song))
		})

		// Render the song navigation
		this.renderSongNavigation()
    }

	/**
	 * Adds a song to the BandBook instance
	 * @param {Song} song - A Song instance
	 * @returns {void}
	*/
	addSong(song) {
		this.songs.push(song)
	}

	/**
	 * Removes a song from the BandBook instance
	 * @param {Song} song - A Song instance
	 */
	removeSong(song) {
		this.songs = this.songs.filter(s => s.title !== song.title)
		this.renderSongNavigation()
		this.workspace.reset()
		this.sync()
	}

	/**
	 * Returns a Song instance given a slug
	 * @param {string} slug - A song slug
	 * @returns {Song} - A Song instance
	 * @returns {undefined} - If no song is found
	*/
	getSongBySlug(slug) {
		return this.songs.find(song => song.slug === slug)
	}

	/**
	 * Renders the song navigation
	 * @returns {void}
	*/
	renderSongNavigation() {
		if (this.navElement) this.navElement.remove()
		const navigation = document.createElement('nav')
		navigation.classList.add('song-navigation')

		this.songs.forEach(song => {
			const button = document.createElement('button')
			button.textContent = song.title
			button.addEventListener('click', () => this.workspace.setSongWorkspace(song))
			navigation.appendChild(button)
		})

		navigation.appendChild(this.getAddSongButton())

		this.navElement = navigation

		this.wrapper.parentElement.insertBefore(navigation, this.wrapper)
	}

	/**
	 * Sync the BandBook instance with indexedDB
	 */
	sync() {
		const data = this.songs.map(song => song.getData())
		const request = indexedDB.open('bandbook', 1)

		request.onupgradeneeded = (e) => {
			const db = e.target.result
			const store = db.createObjectStore('books', { keyPath: 'id' })
			store.createIndex('id', 'id', { unique: true })
		}

		request.onerror = (e) => {
			console.error('Error opening indexedDB', e)
		}

		request.onsuccess = (e) => {
			const db = e.target.result
			const transaction = db.transaction(['books'], 'readwrite')
			const store = transaction.objectStore('books')

			// If the data is empty, delete the record
			if (!data.length) {
				const request = store.delete(this.id)
				request.onsuccess = () => {
					// console.log('Data deleted successfully')
				}
				request.onerror = (e) => {
					console.error('Error deleting data', e)
				}

				return
			}

			if (this.id) {
				// Otherwise, update the record
				const existing = store.get(this.id)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						record.data = JSON.stringify(data)
						store.put(record)
					} else {
						store.add({ id: this.id, data: JSON.stringify(data) })
					}
				}
			} else {
				// If there is no ID, make one
				if (!this.id) this.id = this.createId
				store.add({ id: this.id, data: JSON.stringify(data) })
			}
		}
	}

	/**
	 * Load the BandBook instance from indexedDB
	 */
	load() {
		const request = indexedDB.open('bandbook', 1)

		request.onupgradeneeded = (e) => {
			const db = e.target.result
			const store = db.createObjectStore('books', { keyPath: 'id' })
			store.createIndex('id', 'id', { unique: true })
		}

		request.onerror = (e) => {
			console.error('Error opening indexedDB', e)
		}

		request.onsuccess = async (e) => {
			const db = e.target.result
			const transaction = db.transaction(['books'], 'readwrite')
			const store = transaction.objectStore('books')


			if (this?.id) {
				const existing = store.get(this.id)
				existing.onsuccess = (e) => {
					const record = e.target.result
					if (record) {
						const data = JSON.parse(record.data)
						if (data) this.songData = data
						this.init()
					}
				}
			} else {
				const all = store.getAll()
	
				all.onsuccess = (e) => {
					let data
					try {
						data = JSON.parse(e.target.result[0]?.data)
					} catch (e) {
						data = null
					}

					if (data) {
						this.songData = data
						this.id = e.target.result[0]?.id
					} else {
						// If there is no ID, make one
						if (!this.id) this.id = this.createId
					}
					this.init()
				}
				
				all.onerror = (e) => {
					console.error('Error loading data', e)
				}
			}
		}
	}

	/**
	 * Returns the add song button
	 * @returns {HTMLButtonElement} - A button element
	*/
	getAddSongButton() {
		const upload = document.createElement('input')
		upload.type = 'file'
		upload.accept = 'audio/*'
		upload.classList.add('btn')
		upload.addEventListener('change', (e) => {
			// Validate the file type
			const fileType = e.target.files[0].type
			if (!fileType.includes('audio')) {
				// Alert the user if the file type is invalid
				alert('Please upload a valid file type (e.g. mp3, wav)')

				// Reset the input and return
				upload.value = ''
				return
			}

			// base64 encode the file
			const reader = new FileReader()
			reader.onload = (readerEvent) => {
				const base64 = readerEvent.target.result
				const songData = {
					src: base64,
					title: e.target.files[0].name,
					composer: 'Unknown'
				}

				const song = new Song(songData, () => this.sync(), () => this.removeSong(song))
				this.addSong(song)
				this.renderSongNavigation()
				this.sync()
			}
			reader.readAsDataURL(e.target.files[0])
		})

		return upload
	}

	/**
	 * Creates a unique ID
	 * @returns {string} - A unique ID
	*/
	get createId() {
		return crypto.randomUUID()
	}
}
