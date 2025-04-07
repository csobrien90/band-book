import { BandBook } from './BandBook.js';
import { Tag } from './Tag.js';
import { Modal } from './Modal.js';

export class TagManager {
	/**
	 * The BandBook instance
	 * @type {BandBook}
	*/
	bandbook

	/**
	 * Whether the TagManager is ready
	 * @type {boolean}
	 * @default false
	*/
	ready = false

	/**
	 * An array of all Tags
	 * @type {Tag[]}
	 * @default []
	*/
	tags = []

	/**
	 * The filter view (if active)
	 * @type {string | null}
	 * @default null
	*/
	filterView = null

	/**
	 * A map of all tags and their applications
	 * @type {Map<Tag, Marker[]>}
	 */
	tagMap = new Map()

	/**
	 * The constructor for the TagManager class
	 * @param {BandBook} bandbook - The BandBook instance
	 * @param {SongData} songData - The song data
	 * @returns {void}
	*/
	constructor(bandbook, songData) {
		this.bandbook = bandbook;

		// Check db for existing tags
		bandbook.syncManager.getTags().then(existingTags => {
			if (existingTags && Array.isArray(existingTags)) {
				this.tags = existingTags;
				
				// Calculate the tag map from the song data
				songData.forEach(song => {
					song.markers.forEach(marker => {
						if (marker.tags && Array.isArray(marker.tags)) {
							marker.tags.forEach(tagName => {
								const tag = this.tags.find(tag => tag.name === tagName);
								if (tag) {
									this.applyTag(tag, marker);
								}
							});
						}
					});
				})
			}
		}).catch(err => {
			console.log("Error getting tags from db", err);
		}).finally(() => {
			this.ready = true;
		})
	}

	createTag(name) {
		// Create new tag
		const newTag = new Tag(name)
		this.tags.push(newTag);
		this.tagMap.set(newTag, []);

		// Save in db
		this.bandbook.syncManager.addTag(name).then(() => {
			// Do nothing on success
		}).catch(err => {
			console.log("Error adding tag to db", err);
		});
		
		return newTag;
	}

	getTag(name) {
		// If not ready, wait
		if (!this.ready) {
			return new Promise((resolve, reject) => {
				const interval = setInterval(() => {
					if (this.ready) {
						clearInterval(interval);
						resolve(this.getTag(name));
					}
				}, 100);
			});
		}

		const existingTag = this.tags.find(tag => tag.name === name);

		if (existingTag) {
			return existingTag;
		} else {
			return this.createTag(name);
		}
	}

	getTags() {
		return this.tags;
	}

	applyTag(tag, marker) {
		if (this.tagMap.has(tag)) {
			this.tagMap.get(tag).push(marker);
		} else {
			this.tagMap.set(tag, [marker]);
		}
	}

	removeTag(tag, marker) {
		if (this.tagMap.has(tag)) {
			const markers = this.tagMap.get(tag);
			const index = markers.indexOf(marker);
			if (index > -1) {
				markers.splice(index, 1);
			}
		}
	}

	deleteTag(tag) {
		// Short circuit if tag does not exist
		if (!this.tags.includes(tag)) return

		this.tags = this.tags.filter(t => t !== tag)
		
		// Remove from all mapped markers
		this.tagMap.get(tag).forEach(markerData => {
			const marker = this.bandbook.getMarkerById(markerData.id)
			if (!marker) return

			// Remove tag from marker
			marker.deleteTag(tag)
			marker.updateTagDisplay()
			this.removeTag(tag, marker);
		})

		this.tagMap.delete(tag)

		// Remove from db
		this.bandbook.syncManager.removeTag(tag.name).then(() => {
			// Do nothing on success
		}).catch(err => {
			console.log("Error removing tag from db", err);
		});
	}

	getCounts() {
		const counts = new Map();
		this.tagMap.forEach((markers, tag) => {
			counts.set(tag, markers.length);
		});
		return counts;
	}

	setFilterView(filterSlug) {
		this.filterView = filterSlug || null
	}

	openTagManagerModal() {
		const tagManagerHeader = document.createElement('h2')
		tagManagerHeader.textContent = 'Tag Manager'
		new Modal(tagManagerHeader, this.getTagManagerContent())
	}

	/**
	 * Returns the tag manager modal content
	 * @returns {HTMLDivElement} - A div element
	*/
	getTagManagerContent() {
		const tagManagerContent = document.createElement('div')
		tagManagerContent.classList.add('tag-manager-content')

		const tagList = document.createElement('ul')
		tagList.classList.add('tag-list')

		const counts = this.getCounts()

		this.tags.forEach(tag => {
			const tagItem = document.createElement('li')
			
			// Tag name, number of applications, and delete button
			const tagName = document.createElement('span')
			tagName.textContent = tag.name
			tagItem.appendChild(tagName)

			const tagCount = document.createElement('span')
			tagCount.textContent = `    ${counts.get(tag) || 0}    `
			tagItem.appendChild(tagCount)

			const deleteButton = document.createElement('button')
			deleteButton.textContent = 'Delete'
			deleteButton.addEventListener('click', () => {
				// Check if tag is in use
				if (counts.get(tag) > 0) {
					if (!confirm(`Are you sure you want to delete the tag "${tag.name}"? It is currently applied to ${counts.get(tag)} markers.`)) {
						return
					}
				}

				this.deleteTag(tag)

				tagList.removeChild(tagItem)
			})
			tagItem.appendChild(deleteButton)

			tagList.appendChild(tagItem)
		})

		tagManagerContent.appendChild(tagList)

		return tagManagerContent
	}
}
