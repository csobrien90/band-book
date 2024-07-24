import { Song } from './Song.js'

/**
 * Represents a collection of songs
*/
export class BandBook {
	/**
	 * @constructor
	 * @param {Array} songData - An array of song data objects
	 * @param {HTMLElement} wrapperElement - An HTML element to render the workspace
	 * @returns {BandBook} - A new BandBook instance
	*/
	constructor(songData = [], wrapperElement) {
		if (songData.length === 0) songData = JSON.parse(localStorage.getItem('bandbook')) || []
		this.songData = songData
		this.wrapper = wrapperElement
		this.init()
	}

	/**
	 * Initializes the BandBook instance
	 * @returns {void}
	*/
    init() {
		// Create an array of Song instances from the song data
        this.songs = this.songData.map(song => {
			return new Song(song, () => this.sync())
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
		const navigation = document.createElement('nav')
		navigation.classList.add('song-navigation')

		this.songs.forEach(song => {
			const button = document.createElement('button')
			button.textContent = song.title
			button.addEventListener('click', () => this.setWorkspace(song))
			navigation.appendChild(button)
		})

		this.wrapper.parentElement.insertBefore(navigation, this.wrapper)
	}

	/**
	 * Sets the workspace
	 * @param {Song} song - A Song instance
	 * @returns {void}
	*/
	setWorkspace(song) {
		this.wrapper.innerHTML = ''
		if (song) this.wrapper.appendChild(song.getWorkspace())
	}

	/**
	 * Sync the BandBook instance with localStorage
	 */
	sync() {
		if (!this.songs || !this.songs.length) return
		const data = this.songs.map(song => song.getData())
		localStorage.setItem('bandbook', JSON.stringify(data))
	}

	/**
	 * Load the BandBook instance from localStorage
	 */
	load() {
		const data = JSON.parse(localStorage.getItem('bandbook'))
		if (data) {
			this.songData = data
			this.init()
		}
	}
}
