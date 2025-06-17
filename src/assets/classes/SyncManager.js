import { BandBook } from './BandBook.js'
import { Song } from './Song.js'
import { Marker } from './Marker.js'


export class SyncManager {
	/**
	 * @typedef {import('./Song.js').SongData} SongData
	 * @typedef {import('./Song.js').MarkerData} MarkerData
	*/

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
		this.checkAppVersion()
	}

	/**
	 * Checks the app version
	 * @returns {void}
	 */
	checkAppVersion() {
		// Get version from localStorage
		const version = localStorage.getItem('bandbookVersion')

		// If the version is the same as the current BandBook version, do nothing
		if (version === this.bandbook.version) return

		// If the version is different, update the BandBook version
		localStorage.setItem('bandbookVersion', this.bandbook.version)

		// If the version was not set, stop here
		if (!version) return

		this.bandbook.alertUserOfNewVersion()
	}

	/**
	 * Create all records when a BandBook is imported
	 * @param {string} bandBookJSON - A stringified BandBook JSON object
	 * @returns {void}
	 * @throws {SyntaxError} - If the JSON is invalid
	 * @throws {Error} - If there is an error creating the BandBook record
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
					const newMarker = new Marker(marker.time, newSong, marker.title, marker.notes, marker.tags, marker.id)
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
	 * @returns {Promise<SongData>} - A promise that resolves with the song data (or an empty array)
	 * @throws {Error} - If there is an error loading the BandBook record
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

								const filteredSongData = songData.filter(song => song !== undefined)

								resolve(filteredSongData)
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
	 * @param {Event} e - The event object
	 * @returns {void}
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

		const tags = db.createObjectStore('tags', { keyPath: 'name' })
		tags.createIndex('name', 'name', { unique: true })

		const theme = db.createObjectStore('theme', { keyPath: 'id' })
		theme.createIndex('id', 'id', { unique: true })
	}

	/**
	 * Connect to the BandBook indexedDB
	 * @param {function} onSuccess - A callback function to run on success
	 * @param {function} [onError = null] - A callback function to run on error
	 * @returns {void}
	 * @throws {Error} - If there is an error opening the indexedDB
	*/
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
	 * @returns {Promise<Boolean>} - A promise that resolves when the record is created
	 * @returns {Promise<Error>} - A promise that rejects with an error
	*/
	createNewBandBookRecord() {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['books'], 'readwrite')
				const store = transaction.objectStore('books')

				const request = store.add({ id: this.bandbook.id, songs: null })
				request.onsuccess = () => resolve(true)
				request.onerror = (e) => reject(e)
			})
		})
	}

	/**
	 * Delete the BandBook record from indexedDB
	 * @returns {Promise<Boolean>} - A promise that resolves when the record is created
	 * @returns {Promise<Error>} - A promise that rejects with an error
	*/
	deleteBandBookRecord() {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['books'], 'readwrite')
				const store = transaction.objectStore('books')

				const request = store.delete(this.bandbook.id)
				request.onsuccess = () => resolve(true)
				request.onerror = (e) => reject(e)

			})
		})
	}

	/**
	 * Create a new song in indexedDB
	 * @param {Song} song - A Song instance
	 * @returns {Promise<Boolean>} - A promise that resolves when the record is created
	 * @returns {Promise<Error>} - A promise that rejects with an error
	*/
	createSong(song) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const request = store.add({ id: song.id, data: JSON.stringify(song.getMetadata()) })
				request.onsuccess = () => {
					// Save src data
					const srcStore = db.transaction(['songSrcs'], 'readwrite').objectStore('songSrcs')
					const srcRequest = srcStore.add({ id: song.id, src: song.src })

					srcRequest.onsuccess = () => {
						// Update the BandBook record
						const booksTransaction = db.transaction(['books'], 'readwrite')
						const booksStore = booksTransaction.objectStore('books')

						const existing = booksStore.get(this.bandbook.id)
						existing.onsuccess = (e) => {
							const record = e.target.result
							if (record) {
								const songs = record.songs ? JSON.parse(record.songs) : []
								songs.push(song.id)
								record.songs = JSON.stringify(songs)
								booksStore.put(record)
							}
						}

						existing.onerror = (e) => reject(e)

						resolve(true)
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
	 * @returns {Promise<SongData>} - A promise that resolves with the song data
	 * @returns {Promise<undefined>} - A promise that resolves with undefined if no song is found
	 * @returns {Promise<Error>} - A promise that rejects with an error
	*/
	getSongData(songId) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				try {
					const transaction = db.transaction(['songs'], 'readwrite')
					const store = transaction.objectStore('songs')
					
					const existing = store.get(songId)
					
					/** @type {SongData} */
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
						}

						songData = record ? JSON.parse(record.data) : undefined
						if (!songData) resolve(undefined)
						
						// Add the song ID to the song data
						songData.id = songId

						// Get src data
						const srcStore = db.transaction(['songSrcs'], 'readwrite').objectStore('songSrcs')
						const srcExisting = srcStore.get(songId)
						srcExisting.onsuccess = (e) => {
							const srcRecord = e.target.result
							if (srcRecord) songData.src = srcRecord.src

							// Get marker data
							if (songData?.markers) {
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
									// Remove duplicate markers (by id)
									const uniqueMarkers = markers.filter(
										(marker, index, self) => self.findIndex(m => m?.id === marker?.id) === index
									)

									songData.markers = uniqueMarkers
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
	 * @returns {Promise<Boolean>} - A promise that resolves when the song is deleted
	 * @returns {Promise<Error>} - A promise that rejects with an error
	*/
	deleteSong(song) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const request = store.delete(song.id)
				
				request.onsuccess = () => {
					// Delete src data
					const srcStore = db.transaction(['songSrcs'], 'readwrite').objectStore('songSrcs')
					const srcRequest = srcStore.delete(song.id)
	
					srcRequest.onsuccess = () => {
						// Delete markers
						const markerStore = db.transaction(['markers'], 'readwrite').objectStore('markers')
						song.markerList.markers.forEach(marker => {
							const markerRequest = markerStore.delete(marker.id)
							markerRequest.onsuccess = () => {
								// Do nothing on success
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
								const updatedSongs = songs.filter(s => s !== song.id)
								record.songs = JSON.stringify(updatedSongs)
								booksStore.put(record)
							}
						}
	
						resolve(true)
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
	 * @returns {Promise<Boolean>} - A promise that resolves when the title is updated
	*/
	updateSongTitle(song, title) {
		return new Promise((resolve) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const existing = store.get(song.id)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)
						data.title = title
						store.put({ id: song.id, data: JSON.stringify(data) })
						resolve(true)
					}
				}
			})
		})
	}

	/**
	 * Update a song composer in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} composer - A new composer
	 * @returns {Promise<Boolean>} - A promise that resolves when the composer is updated
	*/
	updateSongComposer(song, composer) {
		return new Promise((resolve) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const existing = store.get(song.id)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)
						data.composer = composer
						store.put({ id: song.id, data: JSON.stringify(data) })
						resolve(true)
					}
				}
			})
		})
	}

	/**
	 * Update a song tempo in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {number} tempo - A new tempo
	 * @returns {Promise<Boolean>} - A promise that resolves when the tempo is updated
	*/
	updateSongTempo(song, tempo) {
		return new Promise((resolve) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const existing = store.get(song.id)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)
						data.tempo = tempo
						store.put({ id: song.id, data: JSON.stringify(data) })
						resolve(true)
					}
				}
			})
		})
	}

	/**
	 * Update a song key in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} key - A new key
	 * @returns {Promise<Boolean>} - A promise that resolves when the key is updated
	*/
	updateSongKey(song, key) {
		return new Promise((resolve) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const existing = store.get(song.id)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)
						data.key = key
						store.put({ id: song.id, data: JSON.stringify(data) })
						resolve(true)
					}
				}
			})
		})
	}

	/**
	 * Update a song time signature in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} timeSignature - A new time signature
	 * @returns {Promise<Boolean>} - A promise that resolves when the time signature is updated
	*/
	updateSongTimeSignature(song, timeSignature) {
		return new Promise((resolve) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const existing = store.get(song.id)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)
						data.timeSignature = timeSignature
						store.put({ id: song.id, data: JSON.stringify(data) })
						resolve(true)
					}
				}
			})
		})
	}

	/**
	 * Update a song notes in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} notes - New notes
	 * @returns {Promise<Boolean>} - A promise that resolves when the notes are updated
	*/
	updateSongNotes(song, notes) {
		return new Promise((resolve) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const existing = store.get(song.id)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)
						data.notes = notes
						store.put({ id: song.id, data: JSON.stringify(data) })
						resolve(true)
					}
				}
			})
		})
	}

	updateSongWaveformVolumes(song, waveformVolumes) {
		return new Promise((resolve) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['songs'], 'readwrite')
				const store = transaction.objectStore('songs')

				const existing = store.get(song.id)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)
						data.waveformVolumes = waveformVolumes
						store.put({ id: song.id, data: JSON.stringify(data) })
						resolve(true)
					}
				}
			})
		})
	}

	/**
	 * Update a song src in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} src - A new src
	 * @returns {Promise<Boolean>} - A promise that resolves when the src is updated
	 * @returns {Promise<Error>} - A promise that rejects with an error
	*/
	updateSongSrc(song, src) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const srcStore = db.transaction(['songSrcs'], 'readwrite').objectStore('songSrcs')
				const srcRequest = srcStore.put({ id: song.id, src: src })

				srcRequest.onsuccess = () => resolve(true)
				srcRequest.onerror = (e) => reject(e)
			})
		})
	}

	/**
	 * Create a new marker in indexedDB
	 * @param {Marker} marker - A Marker instance
	 * @returns {Promise<Boolean>} - A promise that resolves when the marker is created
	 * @returns {Promise<Error>} - A promise that rejects with an error
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

					const existing = songStore.get(marker.song.id)
					existing.onsuccess = (e) => {
						const record = e.target.result
						if (record) {
							const data = JSON.parse(record.data)
							data.markers.push(marker.id)
							songStore.put({ id: marker.song.id, data: JSON.stringify(data) })
						}
					}

					resolve(true)
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
	 * @returns {Promise<MarkerData>} - A promise that resolves with the marker data
	 * @returns {Promise<undefined>} - A promise that resolves with undefined if no marker is found
	*/
	getMarkerData(markerId) {
		return new Promise((resolve) => {
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
	 * @returns {Promise<Boolean>} - A promise that resolves when the marker is deleted
	 * @returns {Promise<Error>} - A promise that rejects with an error
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

					const existing = songStore.get(marker.song.id)
					existing.onsuccess = (e) => {
						const record = e.target.result
						if (record) {
							const data = JSON.parse(record.data)
							const updatedMarkers = data.markers.filter(m => m !== marker.id)
							data.markers = updatedMarkers
							songStore.put({ id: marker.song.id, data: JSON.stringify(data) })
						}
					}

					resolve(true)
				}
				request.onerror = (e) => reject(e)
			})
		})
	}

	/**
	 * Update a marker title in indexedDB
	 * @param {Marker} marker - A Marker instance
	 * @param {string} title - A new title
	 * @returns {Promise<Boolean>} - A promise that resolves when the title is updated`
	*/
	updateMarkerTitle(marker, title) {
		return new Promise((resolve) => {
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
						resolve(true)
					}
				}
			})
		})
	}

	/**
	 * Update a marker notes in indexedDB
	 * @param {Marker} marker - A Marker instance
	 * @param {string} notes - New notes
	 * @returns {Promise<Boolean>} - A promise that resolves when the notes are updated
	 * @returns {Promise<Error>} - A promise that rejects with an error
	*/
	updateMarkerNotes(marker, notes) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['markers'], 'readwrite')
				const store = transaction.objectStore('markers')

				const existing = store.get(marker.id)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)
						data.notes = notes
						store.put({ id: marker.id, data: JSON.stringify(data) })
						resolve(true)
					}
				}
				existing.onerror = (e) => reject(e)
			})
		})
	}

	/**
	 * Update a marker time in indexedDB
	 * @param {Marker} marker - A Marker instance
	 * @param {number} time - A new time
	 * @returns {Promise<Boolean>} - A promise that resolves when the time is updated
	 * @returns {Promise<Error>} - A promise that rejects with an error
	*/
	updateMarkerTime(marker, time) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['markers'], 'readwrite')
				const store = transaction.objectStore('markers')

				const existing = store.get(marker.id)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)
						data.time = time
						store.put({ id: marker.id, data: JSON.stringify(data) })
						resolve(true)
					}
				}
				existing.onerror = (e) => reject(e)
			})
		})
	}

	/**
	 * Update a marker's tags in indexedDB
	 * @param {Marker} marker - A Marker instance
	 * @param {Tag[] | string[]} tags - An array of tags
	 * @returns {Promise<Boolean>} - A promise that resolves when the tags are updated
	 * @returns {Promise<Error>} - A promise that rejects with an error
	*/
	updateMarkerTags(marker, tags) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['markers'], 'readwrite')
				const store = transaction.objectStore('markers')

				const existing = store.get(marker.id)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						const data = JSON.parse(record.data)

						if (typeof tags[0] !== 'string') {
							tags = tags.map(tag => tag.name)
						}

						data.tags = tags
						store.put({ id: marker.id, data: JSON.stringify(data) })
						resolve(true)
					}
				}
				existing.onerror = (e) => reject(e)
			})
		})
	}

	/**
	 * Get all tags from indexedDB
	 * @returns {Promise<string[]>} - A promise that resolves with an array of tags
	 * @returns {Promise<Error>} - A promise that rejects with an error
	*/
	getTags() {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['tags'], 'readwrite')
				const store = transaction.objectStore('tags')

				const all = store.getAll()
				all.onsuccess = (e) => {
					resolve(e.target.result)
				}
				all.onerror = (e) => reject(e)
			})
		})
	}

	/**
	 * Add a tag to indexedDB
	 * @param {string} tag - A tag to add
	 * @returns {Promise<Boolean>} - A promise that resolves when the tag is added
	 * @returns {Promise<Error>} - A promise that rejects with an error
	*/
	addTag(tag) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['tags'], 'readwrite')
				const store = transaction.objectStore('tags')

				// Check if the tag already exists
				const existing = store.get(tag)
				existing.onsuccess = (e) => {
					const record = e.target.result
					if (record) {
						resolve(true)
					} else {
						const request = store.add({ name: tag })
						request.onsuccess = () => resolve(true)
						request.onerror = (e) => reject(e)
					}
				}
			})
		})
	}

	/**
	 * Remove a tag from indexedDB
	 * @param {string} tag - A tag to remove
	 * @returns {Promise<Boolean>} - A promise that resolves when the tag is removed
	 * @returns {Promise<Error>} - A promise that rejects with an error
	*/
	removeTag(tag) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['tags'], 'readwrite')
				const store = transaction.objectStore('tags')

				const request = store.delete(tag)
				request.onsuccess = () => resolve(true)
				request.onerror = (e) => reject(e)
			})
		})
	}

	/**
	 * Save the theme to indexedDB
	 * @param {string} theme - The theme to save
	 * @returns {Promise<Boolean>} - A promise that resolves when the theme is saved
	 * @returns {Promise<Error>} - A promise that rejects with an error
	*/
	saveTheme(theme) {
		return new Promise((resolve, reject) => {
			this.connectToBandbookDB((db) => {
				const transaction = db.transaction(['theme'], 'readwrite')
				const store = transaction.objectStore('theme')

				const request = store.put({ id: 'theme', data: theme })
				request.onsuccess = () => resolve(true)
				request.onerror = (e) => reject(e)
			})
		})
	}

	/**
	 * Load the theme from indexedDB
	 * @returns {Promise<'light' | 'dark'>} - A promise that resolves with the theme
	 * @returns {Promise<Error>} - A promise that rejects with an error
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
					} else {
						resolve('light')
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
