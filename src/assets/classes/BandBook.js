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
		wrapperElement.id = 'bandbook'
		this.wrapper = wrapperElement
		this.workspace = new Workspace(wrapperElement)
		this.syncManager = new SyncManager(this)
		this.navElement = null
		this.songData = []
		this.syncManager.loadBandBook()
		this.init()
	}

	/**
	 * Initializes the BandBook instance
	 * @returns {void}
	*/
    init() {
		if (!this.id) this.id = this.createId

		// Create an array of Song instances from the song data
        this.songs = this.songData.map(song => {
			return new Song(song, this)
		})

		// Get the theme from the sync manager
		const theme = this.syncManager.loadTheme()
		if (theme) this.wrapper.classList.add(theme)

		// Set the active song
		this.setActiveSong(this.songs[0])
    }

	/**
	 * Adds a song to the BandBook instance
	 * @param {Song} song - A Song instance
	 * @returns {void}
	*/
	addSong(song) {
		this.songs.push(song)
		this.setActiveSong(song)
	}	

	/**
	 * Removes a song from the BandBook instance
	 * @param {Song} song - A Song instance
	 */
	removeSong(song) {
		this.songs = this.songs.filter(s => s.title !== song.title)
		this.setActiveSong(this.songs[0] || null)
		this.renderSongNavigation()
		this.syncManager.deleteSong(song)
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
			if (song === this.activeSong) button.classList.add('active')
			button.addEventListener('click', () => this.setActiveSong(song))
			navigation.appendChild(button)
		})

		navigation.appendChild(document.createElement('hr'))

		navigation.appendChild(this.getAddSongButton())
		navigation.appendChild(this.getImportButton())
		navigation.appendChild(this.getExportButton())
		navigation.appendChild(this.getThemeToggle())

		this.navElement = navigation

		this.wrapper.parentElement.insertBefore(navigation, this.wrapper)
	}

	/**
	 * Sets the active song
	*/
	setActiveSong(song) {
		this.activeSong = song
		this.refresh()
	}

	/**
	 * Returns the add song button
	 * @returns {HTMLButtonElement} - A button element
	*/
	getAddSongButton() {
		// Create an upload input element
		const upload = document.createElement('input')
		upload.type = 'file'
		upload.accept = '*'
		upload.classList.add('btn')
		upload.addEventListener('change', (e) => {
			// Validate the file type
			const { target: { files } } = event
			const { type: fileType, name } = files[0]
			if (!fileType.includes('audio')) {
				// Alert the user if the file type is invalid
				alert('Please upload a valid file type (e.g. mp3, wav, etc.)')

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
					title: name,
					composer: 'Unknown'
				}

				const song = new Song(songData, this)
				this.addSong(song)
				this.renderSongNavigation()
				this.syncManager.createSong(song)
			}
			reader.readAsDataURL(event.target.files[0])
		})

		// Create a button element
		const button = document.createElement('button')
		button.textContent = 'Add Song'
		button.addEventListener('click', () => upload.click())

		return button
	}

	/**
	 * Returns the import button
	 * @returns {HTMLButtonElement} - A button element
	*/
	getImportButton() {
		const button = document.createElement('button')
		button.textContent = 'Import'
		button.addEventListener('click', () => {
			const input = document.createElement('input')
			input.type = 'file'
			input.accept = 'application/json'
			input.addEventListener('change', (e) => {
				const file = e.target.files[0]
				const reader = new FileReader()
				reader.onload = (readerEvent) => {
					const data = JSON.parse(readerEvent.target.result)
					this.id = data.id
					this.songData = data.songs
					this.init()
				}
				reader.readAsText(file)
			})
			input.click()
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
		button.addEventListener('click', () => {
			const data = JSON.stringify({
				id: this.id,
				songs: this.songs.map(song => song.getData())
			})
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
	 * Returns the theme toggle button
	*/
	getThemeToggle() {
		const button = document.createElement('button')
		button.textContent = this.wrapper.classList.contains('dark') ? 'Light Mode' : 'Dark Mode'
		button.addEventListener('click', () => {
			this.wrapper.classList.toggle('dark')
			button.textContent = this.wrapper.classList.contains('dark') ? 'Light Mode' : 'Dark Mode'
			this.syncManager.saveTheme(this.wrapper.classList.contains('dark') ? 'dark' : 'light')
			button.blur()
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
	refresh() {
		this.renderSongNavigation()
		if (this.activeSong) {
			this.workspace.reset()
			this.workspace.setSongWorkspace(this.activeSong)
		} else {
			this.workspace.reset()
		}
	}
}
