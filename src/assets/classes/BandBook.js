import { Song } from './Song.js'

/**
 * Represents a collection of songs
*/
export class BandBook {
	/**
	 * @constructor
	 * @param {Array} songData - An array of song data objects
	 * @returns {BandBook} - A new BandBook instance
	*/
	constructor(songData = []) {
		this.songData = songData
		this.init()
	}

	/**
	 * Initializes the BandBook instance
	 * @returns {void}
	*/
    init() {
		// Create an array of Song instances from the song data
        this.songs = this.songData.map(song => {
			const { slug, src } = song
			return new Song(slug, src)
		})
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
}
