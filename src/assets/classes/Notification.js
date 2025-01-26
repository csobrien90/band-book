export class Notification {
	/**
	 * Creates a new notification
	 * @param {string} message - The message to display
	 * @param {'success' | 'error' | 'info' | 'warning'} type - The type of notification
	 * @param {boolean} [isTimed = true] - Whether the notification should disappear after a certain amount of time (default: true)
	 * @param {number} [duration = 5000] - The duration in milliseconds (default: 5000)
	 * @param {boolean} [isInline = false] - Whether the notification should be inline or not (default: false)
	*/
	constructor(message, type, isTimed = true, duration = 5000, isInline = false) {
		this.message = message
		this.type = type
		this.isTimed = isTimed
		this.duration = duration
		this.isInline = isInline

		this.init()
	}

	/**
	 * Initializes the notification
	 * @returns {void}
	*/
	init() {
		if (!this.isInline) {
			// Create notification element and add classes
			this.element = document.createElement('div')
			this.element.classList.add('notification')
		}

		// Create paragraph element, add message, and append to notification element
		const p = document.createElement('p')
		p.textContent = this.message

		if (this.isInline) {
			this.element = p
			this.element.classList.add('inline-notification')
		} else this.element.appendChild(p)

		this.element.classList.add(this.type, 'off-screen')

		// If the notification is timed, remove it after the duration
		if (this.isTimed) {
			setTimeout(() => {
				this.remove()
			}, this.duration)
		} else {
			// If the notification is not inline, and is not timed, add a close button
			if (!this.isInline) {
				const close = document.createElement('button')
				close.classList.add('close')
				close.textContent = '✖'
				close.addEventListener('click', () => this.remove())
				this.element.appendChild(close)
			}
		}

		// Append the notification to the body
		if (!this.isInline) document.body.appendChild(this.element)

		// Remove the off-screen class after a short delay to animate the notification on screen
		setTimeout(() => {
			this.element.classList.remove('off-screen')
		}, 100)
	}

	/**
	 * Removes the notification
	 * @returns {void}
	*/
	remove() {
		this.element.classList.add('off-screen')
		setTimeout(() => {
			this.element.remove()
			delete this
		}, 500)
	}
}