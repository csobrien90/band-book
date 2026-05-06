/**
 * Utility class for creating icon image elements.
 */
export class Icon {
	/**
	 * @param {string} name - The icon name (corresponds to an SVG file)
	 * @param {number} [width=24] - Width of the icon in pixels
	 * @param {number} [height=24] - Height of the icon in pixels
	 */
	constructor(name, width = 24, height = 24) {
		this.name = name
		this.width = width
		this.height = height
	}

	/**
	 * Creates an <img> element for the icon.
	 * @param {Object} [options]
	 * @param {string} [options.alt] - Accessible label for the icon
	 * @param {boolean} [options.decorative=false] - Whether the icon is purely decorative
	 * @returns {HTMLImageElement}
	 */
	getImg({ alt, decorative = false } = {}) {
		const img = document.createElement('img')
		img.className = 'icon'
		img.src = `./assets/icons/${this.name}.svg`
		img.width = this.width
		img.height = this.height

		if (decorative) {
			img.alt = ''
			img.setAttribute('aria-hidden', 'true')
		} else {
			img.alt = alt || `${this.name} icon`
		}

		return img
	}
}