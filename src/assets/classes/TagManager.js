import { BandBook } from './BandBook.js';
import { Tag } from './Tag.js';

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

	constructor(bandbook) {
		this.bandbook = bandbook;

		// Check db for existing tags
		bandbook.syncManager.getTags().then(existingTags => {
			if (existingTags && Array.isArray(existingTags)) {
				this.tags = existingTags;
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

	setFilterView(filterSlug) {
		this.filterView = filterSlug || null
	}
}