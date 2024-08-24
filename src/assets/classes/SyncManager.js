export class SyncManager {
	/**
	 * @constructor
	 * @param {BandBook} bandbook - A BandBook instance
	 * @returns {SyncManager} - A new SyncManager instance
	*/
	constructor(bandbook) {
		this.bandbook = bandbook
		this.init()
	}

	/**
	 * Initializes the SyncManager instance
	 * @returns {void}
	*/
	init() {
		this.loadBandBook()
	}

	/**
	 * Create all records when a BandBook is imported
	 * @param {object} bandBookJSON - A BandBook JSON object
	*/
	importBandBook(bandBookJSON) {
		this.connectToBandbookDB((db) => {

			let bandBookObj
			try {
				bandBookObj = JSON.parse(bandBookJSON)
			} catch (e) {
				console.error('Error parsing JSON', e)
				return
			}

			const transaction = db.transaction(['books', 'songs', 'songSrcs', 'markers'], 'readwrite')
			const booksStore = transaction.objectStore('books')
			const songsStore = transaction.objectStore('songs')
			const songSrcsStore = transaction.objectStore('songSrcs')
			const markersStore = transaction.objectStore('markers')

			// Add the BandBook record
			booksStore.add({ id: bandBookObj.id, songs: JSON.stringify(bandBookObj.songs.map(song => song.slug)) })

			// Add the songs
			bandBookObj.songs.forEach(song => {
				songsStore.add({ id: song.slug, data: JSON.stringify(song.getMetaData()) })
				songSrcsStore.add({ id: song.slug, src: song.src })

				// Add the markers
				song.markers.forEach(marker => {
					markersStore.add({ id: marker.id, data: JSON.stringify(marker) })
				})
			})
		})
	}

	/**
	 * Load the data and reinitialize the BandBook instance
	 * @returns {void}
	*/
	loadBandBook() {
		this.connectToBandbookDB((db) => {
			const transaction = db.transaction(['books'], 'readwrite')
			const store = transaction.objectStore('books')

			const all = store.getAll()

			all.onsuccess = (e) => {
				try {
					const { id, songs } = e.target.result[0]

					if (id) {
						this.bandbook.id = id

						if (songs) {
							const songIdArray = JSON.parse(songs)
	
							const songs = songIdArray.map(songId => {
								return this.getSongData(songId)
							})
	
							this.bandbook.songData = songs
						}
					} else {
						this.createNewBandBookRecord()
					}
					
				} catch {
					this.createNewBandBookRecord()
				}
			}
			
			all.onerror = (e) => {
				this.createNewBandBookRecord()
			}
		})
	}

	/**
	 * Runs on upgradeneeded event
	*/
	onUpgradeNeeded(e) {
		const db = e.target.result

		const books = db.createObjectStore('books', { keyPath: 'id' })
		books.createIndex('id', 'id', { unique: true })

		const songs = db.createObjectStore('songs', { keyPath: 'id' })
		songs.createIndex('id', 'id', { unique: true })

		const songSrcs = db.createObjectStore('songSrcs', { keyPath: 'id' })
		songSrcs.createIndex('id', 'id', { unique: true })

		const markers = db.createObjectStore('markers', { keyPath: 'id' })
		markers.createIndex('id', 'id', { unique: true })

		const theme = db.createObjectStore('theme', { keyPath: 'id' })
		theme.createIndex('id', 'id', { unique: true })
	}

	connectToBandbookDB(onSuccess, onError = null) {
		const request = indexedDB.open('bandbook', 1)

		request.onupgradeneeded = (e) => this.onUpgradeNeeded(e)

		request.onerror = (e) => {
			console.error('Error opening indexedDB', e)
			if(onError) onError(e)
		}

		request.onsuccess = (e) => {
			const db = e.target.result
			onSuccess(db)
		}
	}

	/**
	 * Create a new BandBook record in indexedDB
	*/
	createNewBandBookRecord() {
		this.connectToBandbookDB((db) => {
			const transaction = db.transaction(['books'], 'readwrite')
			const store = transaction.objectStore('books')

			store.add({ id: this.bandbook.id, songs: null })
		})		
	}

	/**
	 * Create a new song in indexedDB
	 * @param {Song} song - A Song instance
	*/
	createSong(song) {
		this.connectToBandbookDB((db) => {
			// Save song data
			const dataStore = db.transaction(['songs'], 'readwrite').objectStore('songs')
			const dataRequest = dataStore.add({ id: song.slug, data: JSON.stringify(song.getData()) })
			dataRequest.onsuccess = (e) => {
				const songId = e.target.result
				console.log('Song added successfully', songId)
			}
			dataRequest.onerror = (e) => {
				console.error('Error adding song', e)
			}

			// Save src data
			const srcStore = db.transaction(['songSrcs'], 'readwrite').objectStore('songSrcs')
			const srcRequest = srcStore.add({ id: song.slug, src: song.src })

			srcRequest.onsuccess = () => {
				console.log('Song src added successfully')
			}
			srcRequest.onerror = (e) => {
				console.error('Error adding song src', e)
			}
		})
	}

	/**
	 * Get song data from indexedDB
	 * @param {string} songId - A song ID
	 * @returns {object} - The song data
	 * @returns {undefined} - If no song is found
	*/
	getSongData(songId) {
		this.connectToBandbookDB((db) => {
			try {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')
	
				const existing = store.get(songId)
				existing.onsuccess = (e) => {
					const record = e.target.result
					if (!record) return undefined
					
					const songData = JSON.parse(record.data)

					// Get src data
					const srcStore = db.transaction(['songSrcs'], 'readwrite').objectStore('songSrcs')
					const srcExisting = srcStore.get(songId)
					srcExisting.onsuccess = (e) => {
						const srcRecord = e.target.result
						if (srcRecord) songData.src = srcRecord.src
					}

					// Get marker data
					const markerStore = db.transaction(['markers'], 'readwrite').objectStore('markers')
					const markerRequest = markerStore.getAll()
					markerRequest.onsuccess = (e) => {
						const markers = e.target.result
						songData.markers = markers.filter(marker => marker.songId === songId)
					}
					
					return songData					
				}
			} catch (e) {
				console.error('Error getting song data', e)
				return undefined
			}
		})
	}

	/**
	 * Delete a song from indexedDB
	 * @param {Song} song - A Song instance
	*/
	deleteSong(song) {
		this.connectToBandbookDB((db) => {
			const transaction = db.transaction(['songs'], 'readwrite')
			const store = transaction.objectStore('songs')

			const request = store.delete(song.slug)
			request.onsuccess = () => {
				console.log('Song deleted successfully')
			}
			request.onerror = (e) => {
				console.error('Error deleting song', e)
			}

			// Delete src data
			const srcStore = db.transaction(['songSrcs'], 'readwrite').objectStore('songSrcs')
			const srcRequest = srcStore.delete(song.slug)

			srcRequest.onsuccess = () => {
				console.log('Song src deleted successfully')
			}

			srcRequest.onerror = (e) => {
				console.error('Error deleting song src', e)
			}
		})
	}

	/**
	 * Update a song title in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} title - A new title
	*/
	updateSongTitle(song, title) {
		this.connectToBandbookDB((db) => {
			const transaction = db.transaction(['songs'], 'readwrite')
			const store = transaction.objectStore('songs')

			const existing = store.get(song.slug)
			existing.onsuccess = () => {
				const record = existing.result
				if (record) {
					record.title = title
					store.put(record)
				}
			}
		})
	}

	/**
	 * Create a new marker in indexedDB
	 * @param {Marker} marker - A Marker instance
	*/
	createMarker(marker) {
		this.connectToBandbookDB((db) => {
			const transaction = db.transaction(['markers'], 'readwrite')
			const store = transaction.objectStore('markers')

			const request = store.add({ id: marker.id, data: JSON.stringify(marker.getData()) })
			request.onsuccess = () => {
				console.log('Marker added successfully')
			}
			request.onerror = (e) => {
				console.error('Error adding marker', e)
			}
		})
	}

	/**
	 * Get marker data from indexedDB
	 * @param {string} markerId - A marker ID
	 * @returns {object} - The marker data
	 * @returns {undefined} - If no marker is found
	*/
	getMarkerData(markerId) {
		this.connectToBandbookDB((db) => {
			const transaction = db.transaction(['markers'], 'readwrite')
			const store = transaction.objectStore('markers')

			const existing = store.get(markerId)
			existing.onsuccess = (e) => {
				const record = e.target.result
				if (record) {
					return JSON.parse(record.data)
				}
			}
		})
	}

	/**
	 * Delete a marker from indexedDB
	 * @param {Marker} marker - A Marker instance
	*/
	deleteMarker(marker) {
		this.connectToBandbookDB((db) => {
			const transaction = db.transaction(['markers'], 'readwrite')
			const store = transaction.objectStore('markers')

			const request = store.delete(marker.id)
			request.onsuccess = () => {
				console.log('Marker deleted successfully')
			}
			request.onerror = (e) => {
				console.error('Error deleting marker', e)
			}
		})
	}

	/**
	 * Update a marker title in indexedDB
	 * @param {Marker} marker - A Marker instance
	 * @param {string} title - A new title
	*/
	updateMarkerTitle(marker, title) {
		this.connectToBandbookDB((db) => {
			const transaction = db.transaction(['markers'], 'readwrite')
			const store = transaction.objectStore('markers')

			const existing = store.get(marker.id)
			existing.onsuccess = () => {
				const record = existing.result
				if (record) {
					record.title = title
					store.put(record)
				}
			}
		})
	}

	/**
	 * Save the theme to indexedDB
	 * @param {string} theme - The theme to save
	*/
	saveTheme(theme) {
		this.connectToBandbookDB((db) => {
			const transaction = db.transaction(['theme'], 'readwrite')
			const store = transaction.objectStore('theme')

			store.put({ id: 'theme', data: theme })
		})
	}

	/**
	 * Load the theme from indexedDB
	 * @returns {string} - The theme
	*/
	loadTheme() {
		this.connectToBandbookDB((db) => {
			const transaction = db.transaction(['theme'], 'readwrite')
			const store = transaction.objectStore('theme')

			const existing = store.get('theme')
			existing.onsuccess = (e) => {
				const record = e.target.result
				if (record) {
					this.bandbook.wrapper.classList.toggle('dark', record.data === 'dark')
				}
			}
		})
	}
}
