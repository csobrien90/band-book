import { Song } from './Song.js'
import { Marker } from './Marker.js'

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
		// console.log('SyncManager initialized')
	}

	/**
	 * Create all records when a BandBook is imported
	 * @param {object} bandBookJSON - A BandBook JSON object
	*/
	importBandBook(bandBookJSON) {
		let bandBookObj
		try {
			bandBookObj = JSON.parse(bandBookJSON)
		} catch (e) {
			console.error('Error parsing JSON', e)
			return
		}

		try {
			// Remove the existing BandBook record
			this.deleteBandBookRecord()

			// Create a new BandBook record
			this.bandbook.id = bandBookObj.id
			this.createNewBandBookRecord()

			// Create song records
			bandBookObj.songs.forEach(song => {
				const newSong = new Song(song, this.bandbook)
				this.createSong(newSong)

				// Create marker records
				song.markers.forEach(marker => {
					const newMarker = new Marker(marker.time, newSong, marker.title, marker.id)
					this.createMarker(newMarker)
				})

				this.bandbook.addSong(newSong)
			})
			


			this.bandbook.id = bandBookObj.id
			this.bandbook.init(bandBookObj.songs)
		} catch (e) {
			console.error('Error creating BandBook record', e)
		}
	}

	/**
	 * Load the data and reinitialize the BandBook instance
	 * @returns {void}
	*/
	loadBandBook() {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['books'], 'readwrite')
				const store = transaction.objectStore('books')
				
				const all = store.getAll()
				
				all.onsuccess = async (e) => {
					try {
						const { id, songs } = e.target.result[0]

						if (id) {
							this.bandbook.id = id							
							if (songs) {
								const songIdArray = JSON.parse(songs)
								const songData = await Promise.all(songIdArray.map(async (songId) => {
									const song = await this.getSongData(songId)
									return song
								}))

								resolve(songData)
							} else {
								resolve([])
							}
						} else {
							this.createNewBandBookRecord()
							resolve([])
						}
						
					} catch {
						this.createNewBandBookRecord()
						resolve([])
					}
				}
				
				all.onerror = (e) => {
					this.createNewBandBookRecord()
					resolve([])
				}

			})
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
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['books'], 'readwrite')
				const store = transaction.objectStore('books')

				const request = store.add({ id: this.bandbook.id, songs: null })
				request.onsuccess = () => resolve()
				request.onerror = (e) => reject(e)
			})
		})
	}

	/**
	 * Delete the BandBook record from indexedDB
	*/
	deleteBandBookRecord() {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['books'], 'readwrite')
				const store = transaction.objectStore('books')

				const request = store.delete(this.bandbook.id)
				request.onsuccess = () => resolve()
				request.onerror = (e) => reject(e)

			})
		})
	}

	/**
	 * Create a new song in indexedDB
	 * @param {Song} song - A Song instance
	*/
	createSong(song) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const request = store.add({ id: song.slug, data: JSON.stringify(song.getMetadata()) })
				request.onsuccess = () => {
					// Save src data
					const srcStore = db.transaction(['songSrcs'], 'readwrite').objectStore('songSrcs')
					const srcRequest = srcStore.add({ id: song.slug, src: song.src })

					srcRequest.onsuccess = () => {
						// Update the BandBook record
						const booksTransaction = db.transaction(['books'], 'readwrite')
						const booksStore = booksTransaction.objectStore('books')

						const existing = booksStore.get(this.bandbook.id)
						existing.onsuccess = (e) => {
							const record = e.target.result
							if (record) {
								const songs = record.songs ? JSON.parse(record.songs) : []
								songs.push(song.slug)
								record.songs = JSON.stringify(songs)
								booksStore.put(record)
							}
						}

						existing.onerror = (e) => reject(e)

						resolve()
					}

					srcRequest.onerror = (e) => reject(e)
				}

				request.onerror = (e) => reject(e)
			})
		})
	}

	/**
	 * Get song data from indexedDB
	 * @param {string} songId - A song ID
	 * @returns {object} - The song data
	 * @returns {undefined} - If no song is found
	*/
	getSongData(songId) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				try {

					const transaction = db.transaction(['songs'], 'readwrite')
					const store = transaction.objectStore('songs')
					
					const existing = store.get(songId)
					
					let songData
					existing.onsuccess = (e) => {
						const record = e.target.result

						if (!record) {
							// Remove the song from the BandBook record
							const booksTransaction = db.transaction(['books'], 'readwrite')
							const booksStore = booksTransaction.objectStore('books')

							const existing = booksStore.get(this.bandbook.id)
							existing.onsuccess = (e) => {
								const record = e.target.result
								if (record) {
									const songs = JSON.parse(record.songs)
									const updatedSongs = songs.filter(s => s !== songId)
									record.songs = JSON.stringify(updatedSongs)
									booksStore.put(record)
								}
							}

							resolve(undefined)
						}

						songData = JSON.parse(record.data)

						// Get src data
						const srcStore = db.transaction(['songSrcs'], 'readwrite').objectStore('songSrcs')
						const srcExisting = srcStore.get(songId)
						srcExisting.onsuccess = (e) => {
							const srcRecord = e.target.result
							if (srcRecord) songData.src = srcRecord.src

							// Get marker data
							if (songData.markers) {
								const markerStore = db.transaction(['markers'], 'readwrite').objectStore('markers')
								const markerData = songData.markers.map((markerId) => {
									return new Promise((resolve, reject) => {
										const markerExisting = markerStore.get(markerId)
										markerExisting.onsuccess = (e) => {
											const markerRecord = e.target.result
											if (markerRecord) {
												resolve(JSON.parse(markerRecord.data))
											} else {
												resolve(undefined)
											}
										}
									})
								})

								Promise.all(markerData).then((markers) => {
									songData.markers = markers
									resolve(songData)
								})

							} else {
								resolve(songData)
							}
						}

					}
				} catch (e) {
					console.error('Error getting song data', e)
					reject(e)
				}
			})
		})
	}

	/**
	 * Delete a song from indexedDB
	 * @param {Song} song - A Song instance
	*/
	deleteSong(song) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const request = store.delete(song.slug)
				request.onsuccess = () => {
					// Delete src data
					const srcStore = db.transaction(['songSrcs'], 'readwrite').objectStore('songSrcs')
					const srcRequest = srcStore.delete(song.slug)
	
					srcRequest.onsuccess = () => {
						// Delete markers
						const markerStore = db.transaction(['markers'], 'readwrite').objectStore('markers')
						song.markerList.markers.forEach(marker => {
							const markerRequest = markerStore.delete(marker.id)
							markerRequest.onsuccess = () => {
								console.log(`Marker (id: ${marker.id}) deleted successfully`)
							}
							markerRequest.onerror = (e) => {
								console.error('Error deleting marker', e)
							}
						})
	
						// Update the BandBook record
						const booksTransaction = db.transaction(['books'], 'readwrite')
						const booksStore = booksTransaction.objectStore('books')
	
						const existing = booksStore.get(this.bandbook.id)
						existing.onsuccess = (e) => {
							const record = e.target.result
							if (record) {
								const songs = JSON.parse(record.songs)
								const updatedSongs = songs.filter(s => s !== song.slug)
								record.songs = JSON.stringify(updatedSongs)
								booksStore.put(record)
							}
						}
	
						resolve()
					}
	
					srcRequest.onerror = (e) => reject(e)
				}
				request.onerror = (e) => reject(e)
			})
		})
	}

	/**
	 * Update a song title in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} title - A new title
	*/
	updateSongTitle(song, title) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const existing = store.get(song.slug)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)
						data.title = title
						store.put({ id: song.slug, data: JSON.stringify(data) })
						resolve()
					}
				}
			})
		})
	}

	/**
	 * Update a song composer in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} composer - A new composer
	*/
	updateSongComposer(song, composer) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const existing = store.get(song.slug)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)
						data.composer = composer
						store.put({ id: song.slug, data: JSON.stringify(data) })
						resolve()
					}
				}
			})
		})
	}

	/**
	 * Update a song tempo in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {number} tempo - A new tempo
	*/
	updateSongTempo(song, tempo) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const existing = store.get(song.slug)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)
						data.tempo = tempo
						store.put({ id: song.slug, data: JSON.stringify(data) })
						resolve()
					}
				}
			})
		})
	}

	/**
	 * Update a song key in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} key - A new key
	*/
	updateSongKey(song, key) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const existing = store.get(song.slug)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)
						data.key = key
						store.put({ id: song.slug, data: JSON.stringify(data) })
						resolve()
					}
				}
			})
		})
	}

	/**
	 * Update a song time signature in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} timeSignature - A new time signature
	*/
	updateSongTimeSignature(song, timeSignature) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const existing = store.get(song.slug)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)
						data.timeSignature = timeSignature
						store.put({ id: song.slug, data: JSON.stringify(data) })
						resolve()
					}
				}
			})
		})
	}

	/**
	 * Update a song notes in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} notes - New notes
	*/
	updateSongNotes(song, notes) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const existing = store.get(song.slug)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)
						data.notes = notes
						store.put({ id: song.slug, data: JSON.stringify(data) })
						resolve()
					}
				}
			})
		})
	}

	/**
	 * Create a new marker in indexedDB
	 * @param {Marker} marker - A Marker instance
	*/
	createMarker(marker) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['markers'], 'readwrite')
				const store = transaction.objectStore('markers')

				const request = store.add({ id: marker.id, data: JSON.stringify(marker.getData()) })
				request.onsuccess = () => {
					// Update the song record
					const songTransaction = db.transaction(['songs'], 'readwrite')
					const songStore = songTransaction.objectStore('songs')

					const existing = songStore.get(marker.song.slug)
					existing.onsuccess = (e) => {
						const record = e.target.result
						if (record) {
							const data = JSON.parse(record.data)
							data.markers.push(marker.id)
							songStore.put({ id: marker.song.slug, data: JSON.stringify(data) })
						}
					}

					resolve()
				}
				request.onerror = (e) => {
					console.error('Error adding marker', e)
					reject(e)
				}
			})
		})
	}

	/**
	 * Get marker data from indexedDB
	 * @param {string} markerId - A marker ID
	 * @returns {object} - The marker data
	 * @returns {undefined} - If no marker is found
	*/
	getMarkerData(markerId) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['markers'], 'readwrite')
				const store = transaction.objectStore('markers')

				const existing = store.get(markerId)
				existing.onsuccess = (e) => {
					const record = e.target.result
					if (record) {
						resolve(JSON.parse(record.data))
					} else {
						resolve(undefined)
					}
				}
			})
		})
	}

	/**
	 * Delete a marker from indexedDB
	 * @param {Marker} marker - A Marker instance
	*/
	deleteMarker(marker) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['markers'], 'readwrite')
				const store = transaction.objectStore('markers')

				const request = store.delete(marker.id)
				request.onsuccess = () => {
					// Update the song record
					const songTransaction = db.transaction(['songs'], 'readwrite')
					const songStore = songTransaction.objectStore('songs')

					const existing = songStore.get(marker.song.slug)
					existing.onsuccess = (e) => {
						const record = e.target.result
						if (record) {
							const data = JSON.parse(record.data)
							const updatedMarkers = data.markers.filter(m => m !== marker.id)
							data.markers = updatedMarkers
							songStore.put({ id: marker.song.slug, data: JSON.stringify(data) })
						}
					}

					resolve()
				}
				request.onerror = (e) => reject(e)
			})
		})
	}

	/**
	 * Update a marker title in indexedDB
	 * @param {Marker} marker - A Marker instance
	 * @param {string} title - A new title
	*/
	updateMarkerTitle(marker, title) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['markers'], 'readwrite')
				const store = transaction.objectStore('markers')

				const existing = store.get(marker.id)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)
						data.title = title
						store.put({ id: marker.id, data: JSON.stringify(data) })
						resolve()
					}
				}
			})
		})
	}

	/**
	 * Save the theme to indexedDB
	 * @param {string} theme - The theme to save
	*/
	saveTheme(theme) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['theme'], 'readwrite')
				const store = transaction.objectStore('theme')

				const request = store.put({ id: 'theme', data: theme })
				request.onsuccess = () => resolve()
				request.onerror = (e) => reject(e)
			})
		})
	}

	/**
	 * Load the theme from indexedDB
	 * @returns {Promise} - A promise that resolves with the theme
	 * @returns {Promise} - A promise that rejects with an error
	*/
	loadTheme() {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['theme'], 'readwrite')
				const store = transaction.objectStore('theme')

				const existing = store.get('theme')
				existing.onsuccess = (e) => {
					const record = e.target.result
					if (record) {
						this.bandbook.wrapper.classList.toggle('dark', record.data === 'dark')
						resolve(record.data)
					}
					this.bandbook.wrapper.classList.remove('bandbook-loading')
				}

				existing.onerror = (e) => {
					this.bandbook.wrapper.classList.remove('bandbook-loading')
					reject(e)
				}
			})
		})
	}
}
