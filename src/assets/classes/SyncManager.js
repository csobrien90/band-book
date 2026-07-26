import { BandBook } from './BandBook.js'
import { Song } from './Song.js'
import { Marker } from './Marker.js'
import { SettingsManager } from './SettingsManager.js'


export class SyncManager {
	/**
	 * @typedef {import('./Song.js').SongData} SongData
	 * @typedef {import('./Song.js').MarkerData} MarkerData
	 * @typedef {import('./SettingsManager.js').Settings} Settings
	*/

	/**
	 * @constructor
	 * @param {BandBook} bandbook - A BandBook instance
	 * @returns {SyncManager} - A new SyncManager instance
	*/
	constructor(bandbook) {
		this.bandbook = bandbook
		this.init()

		/** @type {IDBDatabase|null} */
		this.db = null;

		/** @type {Promise<IDBDatabase>|null} */
		this.dbPromise = null;
	}

	/**
	 * Initializes the SyncManager instance
	 * @returns {void}
	*/
	init() {}

	/**
	 * Checks the app version
	 * @returns {void}
	 */
	checkAppVersion() {
		// Get version from localStorage
		const version = localStorage.getItem('bandbookVersion')

		
		// If the version is not set, update it and return
		if (!version) {
			localStorage.setItem('bandbookVersion', this.bandbook.version)
			return
		}
		
		// If the version is the exact same as the current BandBook version, do nothing
		if (version === this.bandbook.version) return
		
		// If the first or second version number is different, alert the user
		const [storedMajor, storedMinor, storedFeature] = version.split('.').map(Number)
		const [currentMajor, currentMinor, currentFeature] = this.bandbook.version.split('.').map(Number)

		if (
			storedMajor < currentMajor ||
			storedMinor < currentMinor ||
			(
				this.bandbook.settingsManager.isExperimentalFeaturesEnabled()
				&& storedFeature < currentFeature 
			)
		) {
			this.bandbook.alertUserOfNewVersion()
		}
	}

	/**
	 * Gets a cached IndexedDB connection, opening one if necessary.
	 *
	 * @returns {Promise<IDBDatabase>}
	 */
	async getDB() {
		// Already connected
		if (this.db) return this.db;

		// Already opening
		if (this.dbPromise) return this.dbPromise;

		this.dbPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open("bandbook", 1);

			request.onupgradeneeded = (e) => this.onUpgradeNeeded(e);

			request.onerror = () => {
				this.dbPromise = null;
				reject(request.error);
			};

			request.onsuccess = () => {
				const db = request.result;

				// Another tab upgraded the database.
				// Close our connection and force a reopen next time.
				db.onversionchange = () => {
					db.close();
					if (this.db === db) {
						this.db = null;
						this.dbPromise = null;
					}
				};

				// Supported in Chromium, harmless elsewhere.
				if ("onclose" in db) {
					db.onclose = () => {
						if (this.db === db) {
							this.db = null;
							this.dbPromise = null;
						}
					};
				}

				this.db = db;
				resolve(db);
			};
		});

		return this.dbPromise;
	}

	/**
	 * Opens a transaction on a single object store and passes the store to a callback.
	 *
	 * If the cached database connection is in the process of closing, the connection
	 * is discarded, reopened, and the transaction is retried once automatically.
	 *
	 * @template T
	 * @param {string} storeName - The name of the object store.
	 * @param {"readonly"|"readwrite"} mode - The transaction mode.
	 * @param {(store: IDBObjectStore, transaction: IDBTransaction) => T | Promise<T>} callback
	 *        Function that performs work against the object store.
	 * @returns {Promise<T>} Resolves with the value returned by the callback.
	 * @throws {Error} If the transaction cannot be created after one retry, or if the callback throws.
	 */
	async withStore(storeName, mode, callback) {
		for (let attempt = 0; attempt < 2; attempt++) {
			const db = await this.getDB();

			try {
				const transaction = db.transaction([storeName], mode);
				const store = transaction.objectStore(storeName);

				return await callback(store, transaction);
			} catch (e) {
				const isRetryable =
					e instanceof DOMException &&
					e.name === "InvalidStateError" &&
					attempt === 0 &&
					this.db === db;

				if (!isRetryable) {
					throw e;
				}

				// The cached connection became invalid. Clear it so the next
				// iteration reopens the database.
				this.db = null;
				this.dbPromise = null;
			}
		}

		// Should never be reached.
		throw new Error("Failed to create IndexedDB transaction.");
	}

	/**
	 * Wraps an IndexedDB request in a Promise.
	 *
	 * @template T
	 * @param {IDBRequest<T>} request
	 * @returns {Promise<T>}
	 */
	request(request) {
		return new Promise((resolve, reject) => {
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
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
			Sentry.captureException(error)
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
			Sentry.captureException(error)
			console.error('Error creating BandBook record', e)
		}
	}


	/**
	 * Load the data and reinitialize the BandBook instance
	 * @returns {Promise<SongData>} A promise that resolves with the song data (or an empty array)
	 * @throws {Error} If there is an error loading the BandBook record
	 */
	loadBandBook() {
		return this.withStore("books", "readwrite", (store) => {
			return new Promise((resolve) => {
				const all = store.getAll();

				all.onsuccess = async (e) => {
					try {
						const { id, songs } = e.target.result[0];

						if (id) {
							this.bandbook.id = id;

							if (songs) {
								const songIdArray = JSON.parse(songs);

								const songData = await Promise.all(
									songIdArray.map((songId) => this.getSongData(songId))
								);

								resolve(songData.filter((song) => song !== undefined));
							} else {
								resolve([]);
							}
						} else {
							this.createNewBandBookRecord();
							resolve([]);
						}
					} catch {
						this.createNewBandBookRecord();
						resolve([]);
					}
				};

				all.onerror = () => {
					this.createNewBandBookRecord();
					resolve([]);
				};
			});
		});
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

		const settings = db.createObjectStore('settings', { keyPath: 'id' })
		settings.createIndex('id', 'id', { unique: true })
	}

	/**
	 * Create a new BandBook record in indexedDB
	 * @returns {Promise<Boolean>} - A promise that resolves when the record is created
	 * @returns {Promise<Error>} - A promise that rejects with an error
	 */
	createNewBandBookRecord() {
		return this.withStore("books", "readwrite", (store) => {
			return new Promise((resolve, reject) => {
				const request = store.add({ id: this.bandbook.id, songs: null });
				request.onsuccess = () => resolve(true);
				request.onerror = (e) => reject(e);
			});
		});
	}

	/**
	 * Delete the BandBook record from indexedDB
	 * @returns {Promise<Boolean>} - A promise that resolves when the record is created
	 * @returns {Promise<Error>} - A promise that rejects with an error
	 */
	deleteBandBookRecord() {
		return this.withStore("books", "readwrite", (store) => {
			return new Promise((resolve, reject) => {
				const request = store.delete(this.bandbook.id);
				request.onsuccess = () => resolve(true);
				request.onerror = (e) => reject(e);
			});
		});
	}

	/**
	 * Reorder the songs in indexedDB
	 * @param {Array<string>} songIds - An array of Song ids
	 * @returns {Promise<Boolean>} - A promise that resolves when the songs are reordered
	 * @returns {Promise<Error>} - A promise that rejects with an error
	 */
	reorderSongs(songIds) {
		return this.withStore("books", "readwrite", (store) => {
			return new Promise((resolve, reject) => {
				// Get book by id
				const existing = store.get(this.bandbook.id);

				existing.onsuccess = (e) => {
					const record = e.target.result;

					if (record) {
						// Update the songs array
						record.songs = JSON.stringify(songIds);
						store.put(record);
						resolve(true);
					}
				};

				existing.onerror = (e) => reject(e);
			});
		});
	}

	/**
	 * Create a new song in indexedDB
	 * @param {Song} song - A Song instance
	 * @returns {Promise<Boolean>} - A promise that resolves when the record is created
	 * @returns {Promise<Error>} - A promise that rejects with an error
	 */
	createSong(song) {
		return new Promise(async (resolve, reject) => {
			const db = await this.getDB();

			try {
				const transaction = db.transaction(
					["songs", "songSrcs", "books"],
					"readwrite"
				);

				const songStore = transaction.objectStore("songs");
				const srcStore = transaction.objectStore("songSrcs");
				const booksStore = transaction.objectStore("books");

				const songRequest = songStore.add({
					id: song.id,
					data: JSON.stringify(song.getMetadata())
				});

				songRequest.onerror = (e) => reject(e);

				songRequest.onsuccess = () => {
					srcStore.add({
						id: song.id,
						src: song.src
					});

					const existing = booksStore.get(this.bandbook.id);

					existing.onerror = (e) => reject(e);

					existing.onsuccess = (e) => {
						const record = e.target.result;

						if (record) {
							const songs = record.songs
								? JSON.parse(record.songs)
								: [];

							songs.push(song.id);
							record.songs = JSON.stringify(songs);

							booksStore.put(record);
						}
					};
				};

				transaction.oncomplete = () => resolve(true);
				transaction.onerror = (e) => reject(e);
				transaction.onabort = (e) => reject(e);
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * Get song data from indexedDB
	 * @param {string} songId - A song ID
	 * @returns {Promise<SongData>} - A promise that resolves with the song data
	 * @returns {Promise<undefined>} - A promise that resolves with undefined if no song is found
	 * @returns {Promise<Error>} - A promise that rejects with an error
	*/
	getSongData(songId) {
		return new Promise(async (resolve, reject) => {
			const db = await this.getDB()

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
				Sentry.captureException(error)
				console.error('Error getting song data', e)
				reject(e)
			}
		})
	}

	/**
	 * Delete a song from indexedDB
	 * @param {Song} song - A Song instance
	 * @returns {Promise<Boolean>} - A promise that resolves when the song is deleted
	 * @returns {Promise<Error>} - A promise that rejects with an error
	 */
	deleteSong(song) {
		return new Promise(async (resolve, reject) => {
			const db = await this.getDB();

			try {
				const transaction = db.transaction(
					["songs", "songSrcs", "markers", "books"],
					"readwrite"
				);

				const songStore = transaction.objectStore("songs");
				const srcStore = transaction.objectStore("songSrcs");
				const markerStore = transaction.objectStore("markers");
				const booksStore = transaction.objectStore("books");

				const deleteRequest = songStore.delete(song.id);

				deleteRequest.onerror = (e) => reject(e);

				deleteRequest.onsuccess = () => {
					srcStore.delete(song.id);

					song.markerList.markers.forEach((marker) => {
						markerStore.delete(marker.id);
					});

					const existing = booksStore.get(this.bandbook.id);

					existing.onerror = (e) => reject(e);

					existing.onsuccess = (e) => {
						const record = e.target.result;

						if (record) {
							const songs = JSON.parse(record.songs);
							record.songs = JSON.stringify(
								songs.filter((s) => s !== song.id)
							);

							booksStore.put(record);
						}
					};
				};

				transaction.oncomplete = () => resolve(true);
				transaction.onerror = (e) => reject(e);
				transaction.onabort = (e) => reject(e);
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * Update a song title in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} title - A new title
	 * @returns {Promise<Boolean>} - A promise that resolves when the title is updated
	 */
	updateSongTitle(song, title) {
		return this.withStore("songs", "readwrite", (store) => {
			return new Promise((resolve) => {
				const existing = store.get(song.id);

				existing.onsuccess = () => {
					const record = existing.result;

					if (record) {
						const data = JSON.parse(record.data);
						data.title = title;
						store.put({ id: song.id, data: JSON.stringify(data) });
						resolve(true);
					}
				};
			});
		});
	}

	/**
	 * Update a song composer in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} composer - A new composer
	 * @returns {Promise<Boolean>} - A promise that resolves when the composer is updated
	 */
	updateSongComposer(song, composer) {
		return this.withStore("songs", "readwrite", (store) => {
			return new Promise((resolve) => {
				const existing = store.get(song.id);

				existing.onsuccess = () => {
					const record = existing.result;

					if (record) {
						const data = JSON.parse(record.data);
						data.composer = composer;
						store.put({ id: song.id, data: JSON.stringify(data) });
						resolve(true);
					}
				};
			});
		});
	}

	/**
	 * Update a song tempo in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {number} tempo - A new tempo
	 * @returns {Promise<Boolean>} - A promise that resolves when the tempo is updated
	 */
	updateSongTempo(song, tempo) {
		return this.withStore("songs", "readwrite", (store) => {
			return new Promise((resolve) => {
				const existing = store.get(song.id);

				existing.onsuccess = () => {
					const record = existing.result;

					if (record) {
						const data = JSON.parse(record.data);
						data.tempo = tempo;
						store.put({ id: song.id, data: JSON.stringify(data) });
						resolve(true);
					}
				};
			});
		});
	}

	/**
	 * Update a song key in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} key - A new key
	 * @returns {Promise<Boolean>} - A promise that resolves when the key is updated
	 */
	updateSongKey(song, key) {
		return this.withStore("songs", "readwrite", (store) => {
			return new Promise((resolve) => {
				const existing = store.get(song.id);

				existing.onsuccess = () => {
					const record = existing.result;

					if (record) {
						const data = JSON.parse(record.data);
						data.key = key;
						store.put({ id: song.id, data: JSON.stringify(data) });
						resolve(true);
					}
				};
			});
		});
	}

	/**
	 * Update a song time signature in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} timeSignature - A new time signature
	 * @returns {Promise<Boolean>} - A promise that resolves when the time signature is updated
	 */
	updateSongTimeSignature(song, timeSignature) {
		return this.withStore("songs", "readwrite", (store) => {
			return new Promise((resolve) => {
				const existing = store.get(song.id);

				existing.onsuccess = () => {
					const record = existing.result;

					if (record) {
						const data = JSON.parse(record.data);
						data.timeSignature = timeSignature;
						store.put({ id: song.id, data: JSON.stringify(data) });
						resolve(true);
					}
				};
			});
		});
	}

	/**
	 * Update a song notes in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} notes - New notes
	 * @returns {Promise<Boolean>} - A promise that resolves when the notes are updated
	 */
	updateSongNotes(song, notes) {
		return this.withStore("songs", "readwrite", (store) => {
			return new Promise((resolve) => {
				const existing = store.get(song.id);

				existing.onsuccess = () => {
					const record = existing.result;

					if (record) {
						const data = JSON.parse(record.data);
						data.notes = notes;
						store.put({ id: song.id, data: JSON.stringify(data) });
						resolve(true);
					}
				};
			});
		});
	}

	/**
	 * Update a song waveform volumes in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {Array<number>} waveformVolumes - The waveform volume data
	 * @returns {Promise<Boolean>} - A promise that resolves when the waveform volumes are updated
	 */
	updateSongWaveformVolumes(song, waveformVolumes) {
		return this.withStore("songs", "readwrite", (store) => {
			return new Promise((resolve) => {
				const existing = store.get(song.id);

				existing.onsuccess = () => {
					const record = existing.result;

					if (record) {
						const data = JSON.parse(record.data);
						data.waveformVolumes = waveformVolumes;
						store.put({ id: song.id, data: JSON.stringify(data) });
						resolve(true);
					}
				};
			});
		});
	}

	/**
	 * Update a song src in indexedDB
	 * @param {Song} song - A Song instance
	 * @param {string} src - A new src
	 * @returns {Promise<Boolean>} - A promise that resolves when the src is updated
	 * @returns {Promise<Error>} - A promise that rejects with an error
	 */
	updateSongSrc(song, src) {
		return this.withStore("songSrcs", "readwrite", (store) => {
			return new Promise((resolve, reject) => {
				const request = store.put({ id: song.id, src });

				request.onsuccess = () => resolve(true);
				request.onerror = (e) => reject(e);
			});
		});
	}

	/**
	 * Create a new marker in indexedDB
	 * @param {Marker} marker - A Marker instance
	 * @returns {Promise<Boolean>} - A promise that resolves when the marker is created
	 * @returns {Promise<Error>} - A promise that rejects with an error
	 */
	createMarker(marker) {
		return new Promise(async (resolve, reject) => {
			const db = await this.getDB();

			try {
				const transaction = db.transaction(["markers", "songs"], "readwrite");
				const markerStore = transaction.objectStore("markers");
				const songStore = transaction.objectStore("songs");

				const addRequest = markerStore.add({
					id: marker.id,
					data: JSON.stringify(marker.getData())
				});

				addRequest.onerror = (e) => {
					console.error("Error adding marker", e);
					reject(e);
				};

				addRequest.onsuccess = () => {
					const existing = songStore.get(marker.song.id);

					existing.onerror = (e) => reject(e);

					existing.onsuccess = (e) => {
						const record = e.target.result;

						if (record) {
							const data = JSON.parse(record.data);
							data.markers.push(marker.id);

							songStore.put({
								id: marker.song.id,
								data: JSON.stringify(data)
							});
						}
					};
				};

				transaction.oncomplete = () => resolve(true);
				transaction.onerror = (e) => reject(e);
				transaction.onabort = (e) => reject(e);
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * Get marker data from indexedDB
	 * @param {string} markerId - A marker ID
	 * @returns {Promise<MarkerData>} - A promise that resolves with the marker data
	 * @returns {Promise<undefined>} - A promise that resolves with undefined if no marker is found
	 */
	getMarkerData(markerId) {
		return this.withStore("markers", "readwrite", (store) => {
			return new Promise((resolve) => {
				const existing = store.get(markerId);

				existing.onsuccess = (e) => {
					const record = e.target.result;

					if (record) {
						resolve(JSON.parse(record.data));
					} else {
						resolve(undefined);
					}
				};
			});
		});
	}

	/**
	 * Delete a marker from indexedDB
	 * @param {Marker} marker - A Marker instance
	 * @returns {Promise<Boolean>} - A promise that resolves when the marker is deleted
	 * @returns {Promise<Error>} - A promise that rejects with an error
	 */
	deleteMarker(marker) {
		return new Promise(async (resolve, reject) => {
			const db = await this.getDB();

			try {
				const transaction = db.transaction(["markers", "songs"], "readwrite");
				const markerStore = transaction.objectStore("markers");
				const songStore = transaction.objectStore("songs");

				const deleteRequest = markerStore.delete(marker.id);

				deleteRequest.onerror = (e) => reject(e);

				deleteRequest.onsuccess = () => {
					const existing = songStore.get(marker.song.id);

					existing.onerror = (e) => reject(e);

					existing.onsuccess = (e) => {
						const record = e.target.result;

						if (record) {
							const data = JSON.parse(record.data);
							data.markers = data.markers.filter((m) => m !== marker.id);

							songStore.put({
								id: marker.song.id,
								data: JSON.stringify(data)
							});
						}
					};
				};

				transaction.oncomplete = () => resolve(true);
				transaction.onerror = (e) => reject(e);
				transaction.onabort = (e) => reject(e);
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * Update a marker title in indexedDB
	 * @param {Marker} marker - A Marker instance
	 * @param {string} title - A new title
	 * @returns {Promise<Boolean>} - A promise that resolves when the title is updated
	 */
	updateMarkerTitle(marker, title) {
		return this.withStore("markers", "readwrite", (store) => {
			return new Promise((resolve) => {
				const existing = store.get(marker.id);

				existing.onsuccess = () => {
					const record = existing.result;

					if (record) {
						const data = JSON.parse(record.data);
						data.title = title;
						store.put({ id: marker.id, data: JSON.stringify(data) });
						resolve(true);
					}
				};
			});
		});
	}

	/**
	 * Update a marker notes in indexedDB
	 * @param {Marker} marker - A Marker instance
	 * @param {string} notes - New notes
	 * @returns {Promise<Boolean>} - A promise that resolves when the notes are updated
	 * @returns {Promise<Error>} - A promise that rejects with an error
	 */
	updateMarkerNotes(marker, notes) {
		return this.withStore("markers", "readwrite", (store) => {
			return new Promise((resolve, reject) => {
				const existing = store.get(marker.id);

				existing.onsuccess = () => {
					const record = existing.result;

					if (record) {
						const data = JSON.parse(record.data);
						data.notes = notes;
						store.put({ id: marker.id, data: JSON.stringify(data) });
						resolve(true);
					}
				};

				existing.onerror = (e) => reject(e);
			});
		});
	}

	/**
	 * Update a marker time in indexedDB
	 * @param {Marker} marker - A Marker instance
	 * @param {number} time - A new time
	 * @returns {Promise<Boolean>} - A promise that resolves when the time is updated
	 * @returns {Promise<Error>} - A promise that rejects with an error
	 */
	updateMarkerTime(marker, time) {
		return this.withStore("markers", "readwrite", (store) => {
			return new Promise((resolve, reject) => {
				const existing = store.get(marker.id);

				existing.onsuccess = () => {
					const record = existing.result;

					if (record) {
						const data = JSON.parse(record.data);
						data.time = time;
						store.put({ id: marker.id, data: JSON.stringify(data) });
						resolve(true);
					}
				};

				existing.onerror = (e) => reject(e);
			});
		});
	}

	/**
	 * Update a marker's tags in indexedDB
	 * @param {Marker} marker - A Marker instance
	 * @param {Tag[] | string[]} tags - An array of tags
	 * @returns {Promise<Boolean>} - A promise that resolves when the tags are updated
	 * @returns {Promise<Error>} - A promise that rejects with an error
	 */
	updateMarkerTags(marker, tags) {
		return this.withStore("markers", "readwrite", (store) => {
			return new Promise((resolve, reject) => {
				const existing = store.get(marker.id);

				existing.onsuccess = () => {
					const record = existing.result;

					if (record) {
						const data = JSON.parse(record.data);

						if (typeof tags[0] !== "string") {
							tags = tags.map((tag) => tag.name);
						}

						data.tags = tags;
						store.put({ id: marker.id, data: JSON.stringify(data) });
						resolve(true);
					}
				};

				existing.onerror = (e) => reject(e);
			});
		});
	}

	/**
	 * Get all tags from indexedDB
	 * @returns {Promise<string[]>} - A promise that resolves with an array of tags
	 * @returns {Promise<Error>} - A promise that rejects with an error
	 */
	getTags() {
		return this.withStore("tags", "readwrite", (store) => {
			return new Promise((resolve, reject) => {
				const all = store.getAll();

				all.onsuccess = (e) => resolve(e.target.result);
				all.onerror = (e) => reject(e);
			});
		});
	}

	/**
	 * Add a tag to indexedDB
	 * @param {string} tag - A tag to add
	 * @returns {Promise<Boolean>} - A promise that resolves when the tag is added
	 * @returns {Promise<Error>} - A promise that rejects with an error
	 */
	addTag(tag) {
		return this.withStore("tags", "readwrite", (store) => {
			return new Promise((resolve, reject) => {
				// Check if the tag already exists
				const existing = store.get(tag);

				existing.onsuccess = (e) => {
					const record = e.target.result;

					if (record) {
						resolve(true);
					} else {
						const request = store.add({ name: tag });

						request.onsuccess = () => resolve(true);
						request.onerror = (e) => reject(e);
					}
				};
			});
		});
	}

	/**
	 * Remove a tag from indexedDB
	 * @param {string} tag - A tag to remove
	 * @returns {Promise<Boolean>} - A promise that resolves when the tag is removed
	 * @returns {Promise<Error>} - A promise that rejects with an error
	 */
	removeTag(tag) {
		return this.withStore("tags", "readwrite", (store) => {
			return new Promise((resolve, reject) => {
				const request = store.delete(tag);

				request.onsuccess = () => resolve(true);
				request.onerror = (e) => reject(e);
			});
		});
	}

	/**
	 * Load the settings object from indexedDB
	 * @returns {Promise<Settings>} - A promise that resolves with the settings object
	 * @returns {Promise<Error>} - A promise that rejects with an error
	 */
	loadSettings() {
		return this.withStore("settings", "readwrite", (store) => {
			return new Promise((resolve, reject) => {
				const existing = store.get("settings");

				existing.onsuccess = (e) => {
					const record = e.target.result;

					if (record) {
						resolve(record.data);
					} else {
						resolve({});
					}
				};

				existing.onerror = (e) => reject(e);
			});
		});
	}

	/**
	 * Save the settings object to indexedDB
	 * @param {Settings} settings - The settings object to save
	 * @returns {Promise<Boolean>} - A promise that resolves when the settings are saved
	 * @returns {Promise<Error>} - A promise that rejects with an error
	 */
	saveSettings(settings) {
		return this.withStore("settings", "readwrite", (store) => {
			return new Promise((resolve, reject) => {
				const request = store.put({ id: "settings", data: settings });

				request.onsuccess = () => resolve(true);
				request.onerror = (e) => reject(e);
			});
		});
	}
}
