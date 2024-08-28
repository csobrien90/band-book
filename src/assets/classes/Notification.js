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
		this.element = document.createElement('div')
		this.element.classList.add('notification', this.type, 'off-screen')

		const p = document.createElement('p')
		p.textContent = this.message
		this.element.appendChild(p)
		
		if (this.isTimed) {
			setTimeout(() => {
				this.remove()
			}, this.duration)
		} else {
			const close = document.createElement('button')
			close.classList.add('close')
			close.textContent = '✖'
			close.addEventListener('click', () => this.remove())
			this.element.appendChild(close)
		}

		document.body.appendChild(this.element)
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