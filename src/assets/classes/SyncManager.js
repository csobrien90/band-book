export class SyncManager {
	/**
	 * @constructor
	 * @param {BandBook} bandbook - A BandBook instance
	 * @returns {SyncManager} - A new SyncManager instance
	*/
	constructor(bandbook) {
		this.bandbook = bandbook
	}

	/**
	 * Runs on upgradeneeded event
	*/
	onUpgradeNeeded(e) {
		const db = e.target.result

		const books = db.createObjectStore('books', { keyPath: 'id' })
		books.createIndex('id', 'id', { unique: true })

		const theme = db.createObjectStore('theme', { keyPath: 'id' })
		theme.createIndex('id', 'id', { unique: true })
	}

	/**
	 * Sync the BandBook instance with indexedDB
	*/
	sync() {
		const data = this.bandbook.songs.map(song => song.getData())
		const request = indexedDB.open('bandbook', 1)

		request.onupgradeneeded = (e) => this.onUpgradeNeeded(e)

		request.onerror = (e) => {
			console.error('Error opening indexedDB', e)
		}

		request.onsuccess = (e) => {
			const db = e.target.result
			const transaction = db.transaction(['books'], 'readwrite')
			const store = transaction.objectStore('books')

			// If the data is empty, delete the record
			if (!data.length) {
				const request = store.delete(this.bandbook.id)
				request.onsuccess = () => {
					// console.log('Data deleted successfully')
				}
				request.onerror = (e) => {
					console.error('Error deleting data', e)
				}

				return
			}

			if (this.bandbook.id) {
				// Otherwise, update the record
				const existing = store.get(this.bandbook.id)
				existing.onsuccess = () => {
					const record = existing.result
					if (record) {
						record.data = JSON.stringify(data)
						store.put(record)
					} else {
						store.add({ id: this.bandbook.id, data: JSON.stringify(data) })
					}
				}
			} else {
				// If there is no ID, make one
				if (!this.bandbook.id) this.bandbook.id = this.bandbook.createId
				store.add({ id: this.bandbook.id, data: JSON.stringify(data) })
			}
		}
	}

	/**
	 * Load the BandBook instance from indexedDB
	*/
	load() {
		const request = indexedDB.open('bandbook', 1)

		request.onupgradeneeded = (e) => this.onUpgradeNeeded(e)

		request.onerror = (e) => {
			console.error('Error opening indexedDB', e)
		}

		request.onsuccess = async (e) => {
			const db = e.target.result
			const transaction = db.transaction(['books'], 'readwrite')
			const store = transaction.objectStore('books')


			if (this.bandbook?.id) {
				const existing = store.get(this.bandbook.id)
				existing.onsuccess = (e) => {
					const record = e.target.result
					if (record) {
						const data = JSON.parse(record.data)
						if (data) this.bandbook.songData = data
						this.bandbook.init()
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
						this.bandbook.songData = data
						this.bandbook.id = e.target.result[0]?.id
					} else {
						// If there is no ID, make one
						if (!this.bandbook.id) this.bandbook.id = this.bandbook.createId
					}
					this.bandbook.init()
				}
				
				all.onerror = (e) => {
					console.error('Error loading data', e)
				}
			}
		}
	}

	/**
	 * Save the theme to indexedDB
	 * @param {string} theme - The theme to save
	*/
	saveTheme(theme) {
		const request = indexedDB.open('bandbook', 1)

		request.onupgradeneeded = (e) => this.onUpgradeNeeded(e)

		request.onerror = (e) => {
			console.error('Error opening indexedDB', e)
		}

		request.onsuccess = (e) => {
			const db = e.target.result
			const transaction = db.transaction(['theme'], 'readwrite')
			const store = transaction.objectStore('theme')

			store.put({ id: 'theme', data: theme })
		}
	}

	/**
	 * Load the theme from indexedDB
	 * @returns {string} - The theme
	*/
	loadTheme() {
		const request = indexedDB.open('bandbook', 1)

		request.onupgradeneeded = (e) => this.onUpgradeNeeded(e)

		request.onerror = (e) => {
			console.error('Error opening indexedDB', e)
		}

		request.onsuccess = (e) => {
			const db = e.target.result
			const transaction = db.transaction(['theme'], 'readwrite')
			const store = transaction.objectStore('theme')

			const existing = store.get('theme')
			existing.onsuccess = (e) => {
				const record = e.target.result
				if (record) {
					this.bandbook.wrapper.classList.toggle('dark', record.data === 'dark')
				}
			}
		}
	}
}