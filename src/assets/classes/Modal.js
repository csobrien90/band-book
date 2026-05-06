export class Modal {
	/**
	 * Creates a new modal
	 * @param {HTMLElement} title - The title of the modal
	 * @param {HTMLElement} content - The content of the modal
	 * @param {Object} [options={}] - The options for the modal
	 * @param {boolean} [options.useForm=false] - Whether to use a form element
	 * @param {Function} [options.onFormSubmit] - Callback for form submission
	 * @param {Function|null} [onClose=null] - Callback when modal is closed
	 */
	constructor(title, content, options = {}, onClose = null) {
		this.title = title
		this.content = content
		this.options = options
		this.onClose = onClose

		/** @type {(e: KeyboardEvent) => void} */
		this.keydownHandler = null

		this.init()
	}

	/**
	 * Initializes and displays the modal
	 */
	init() {
		this.element = this.getModalElement()
		document.body.appendChild(this.element)

		if (this.element.showModal) {
			this.element.showModal()
		}
	}

	/**
	 * Gets the modal element
	 * @returns {HTMLDialogElement}
	 */
	getModalElement() {
		const dialog = document.createElement('dialog')
		dialog.classList.add('modal')

		const content = this.getModalContent()
		dialog.appendChild(content)

		// Click outside to close
		dialog.addEventListener('click', (e) => {
			if (e.target === dialog) this.remove()
		})

		// Keyboard handling (stored for cleanup)
		this.keydownHandler = (e) => {
			if (
				e.key === "Enter" &&
				e.target.tagName !== "TEXTAREA" &&
				!e.target.classList.contains('close')
			) {
				e.preventDefault()
				if (this.options?.useForm && this.options?.onFormSubmit) {
					this.options.onFormSubmit({ target: content })
				}
			}

			if (e.key === 'Escape') {
				this.remove()
			}
		}

		document.addEventListener('keydown', this.keydownHandler)

		return dialog
	}

	/**
	 * Gets the modal content
	 * @returns {HTMLDivElement|HTMLFormElement}
	 */
	getModalContent() {
		const div = document.createElement('div')
		const form = document.createElement('form')

		if (this.options?.useForm && this.options?.onFormSubmit) {
			form.addEventListener('submit', (e) => {
				e.preventDefault()
				this.options.onFormSubmit(e)
			})
		}

		const contentWrapper = this.options?.useForm ? form : div
		contentWrapper.classList.add('modal-content')

		contentWrapper.appendChild(this.getModalHeader())
		contentWrapper.appendChild(this.content)

		return contentWrapper
	}

	/**
	 * Gets the modal header
	 * @returns {HTMLElement}
	 */
	getModalHeader() {
		const header = document.createElement('header')
		header.classList.add('modal-header')

		header.appendChild(this.title)
		header.appendChild(this.getCloseButton())

		return header
	}

	/**
	 * Returns the close button
	 * @returns {HTMLButtonElement}
	 */
	getCloseButton() {
		const button = document.createElement('button')
		button.classList.add('close')
		button.textContent = '✖'

		button.addEventListener('click', () => this.remove())

		return button
	}

	/**
	 * Closes and removes the modal, cleaning up event listeners
	 */
	remove() {
		if (this.keydownHandler) {
			document.removeEventListener('keydown', this.keydownHandler)
		}

		this.element.close()

		if (this.onClose) this.onClose()

		this.element.remove()
	}
}
