export class Notification {
	/**
	 * Creates a new notification
	 * @param {string} message - The message to display
	 * @param {'success' | 'error' | 'info' | 'warning'} type - The type of notification
	 * @param {boolean} isTimed - Whether the notification should disappear after a certain amount of time
	 * @param {number} duration - The duration in milliseconds (default: 5000)
	*/
	constructor(message, type, isTimed = true, duration = 5000) {
		this.message = message
		this.type = type
		this.isTimed = isTimed
		this.duration = duration

		this.init()
	}

	/**
	 * Initializes the notification
	*/
	init() {
		// Create notification element and add classes
		this.element = document.createElement('div')
		this.element.classList.add('notification', this.type, 'off-screen')

		// Create paragraph element, add message, and append to notification element
		const p = document.createElement('p')
		p.textContent = this.message
		this.element.appendChild(p)

		// If the notification is timed, remove it after the duration
		if (this.isTimed) {
			setTimeout(() => {
				this.remove()
			}, this.duration)
		} else {
			// If the notification is not timed, add a close button
			const close = document.createElement('button')
			close.classList.add('close')
			close.textContent = '✖'
			close.addEventListener('click', () => this.remove())
			this.element.appendChild(close)
		}

		// Append the notification to the body
		document.body.appendChild(this.element)

		// Remove the off-screen class after a short delay to animate the notification on screen
		setTimeout(() => {
			this.element.classList.remove('off-screen')
		}, 100)
	}

	/**
	 * Removes the notification
	*/
	remove() {
		this.element.classList.add('off-screen')
		setTimeout(() => {
			this.element.remove()
		}, 500)
	}
}