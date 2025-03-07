import { Tag } from './Tag.js';

export class TagManager {
	/**
	 * An array of all Tags
	 * @type {Tag[]}
	 * @default []
	*/
	tags = []

	constructor() {
	}

	createTag(name) {
		const newTag = new Tag(name)
		this.tags.push(newTag);
		return newTag;
	}

	getTag(name) {
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
}