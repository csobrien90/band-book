import { Song } from './Song.js'
import { Workspace } from './Workspace.js'
import { SyncManager } from './SyncManager.js'

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
		this.syncManager = new SyncManager(this)
		this.navElement = null
		this.songData = []
		this.syncManager.load()
		
		this.init()
	}

	/**
	 * Initializes the BandBook instance
	 * @returns {void}
	*/
    init() {		
		// Create an array of Song instances from the song data
        this.songs = this.songData.map(song => {
			return new Song(song, this)
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
		this.syncManager.sync()
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
		navigation.appendChild(this.getImportButton())
		navigation.appendChild(this.getExportButton())

		this.navElement = navigation

		this.wrapper.parentElement.insertBefore(navigation, this.wrapper)
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

				const song = new Song(songData, this)
				this.addSong(song)
				this.renderSongNavigation()
				this.syncManager.sync()
			}
			reader.readAsDataURL(e.target.files[0])
		})

		return upload
	}

	/**
	 * Returns the import button
	 * @returns {HTMLButtonElement} - A button element
	*/
	getImportButton() {
		const button = document.createElement('button')
		button.textContent = 'Import'
		button.classList.add('btn')
		button.addEventListener('click', () => {
			const data = prompt('Paste the exported data here:')
			if (data) {
				const importedData = JSON.parse(data)
				this.songData = importedData
				this.init()
				this.syncManager.sync()
			}
		})
		return button
	}

	/**
	 * Returns the export button
	 * @returns {HTMLButtonElement} - A button element
	*/
	getExportButton() {
		const button = document.createElement('button')
		button.textContent = 'Export'
		button.classList.add('btn')
		button.addEventListener('click', () => {
			const data = JSON.stringify(this.songData)
			const blob = new Blob([data], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = 'bandbook.json'
			document.body.appendChild(a)
			a.click()
			a.remove()
		})
		return button
	}

	/**
	 * Creates a unique ID
	 * @returns {string} - A unique ID
	*/
	get createId() {
		return crypto.randomUUID()
	}

	/**
	 * Refreshes the DOM
	*/
	refresh(activeSong = null) {
		this.renderSongNavigation()
		if (activeSong) this.workspace.setSongWorkspace(activeSong)
	}
}
