export class Modal {
	/**
	 * Creates a new modal
	 * @param {HTMLElement} title - The title of the modal
	 * @param {HTMLElement} content - The content of the modal
	 * @param {Object} [options={}] - The options for the modal
	 * @param {boolean} [options.useForm=false] - Whether or not to use a form element
	 * @returns {Modal} - A new Modal instance
	*/
	constructor(title, content, options = {}) {
		this.title = title
		this.content = content
		this.options = options
		
		this.init()
	}

	/**
	 * Initializes the modal
	 * @returns {void}
	*/
	init() {
		this.element = this.getModalElement()
		document.body.appendChild(this.element)
		this.element.showModal()
	}

	/**
	 * Gets the modal element
	 * @returns {HTMLDialogElement} - A dialog element
	*/
	getModalElement() {
		const dialog = document.createElement('dialog')
		dialog.classList.add('modal')
		dialog.appendChild(this.getModalContent())

		// If user clicks outside of the modal, close it
		dialog.addEventListener('click', e => {
			if (e.target === dialog) this.remove()
		})

		// If user presses the escape key, close the modal
		document.addEventListener('keydown', e => {
			if (e.key === 'Escape') this.remove()
		})

		return dialog
	}

	/**
	 * Gets the modal content
	 * @returns {HTMLDivElement|HTMLFormElement} - A div element
	*/
	getModalContent() {
		const contentWrapper = this.options?.useForm ?
			document.createElement('form') : document.createElement('div')
		contentWrapper.classList.add('modal-content')
		contentWrapper.appendChild(this.getModalHeader())
		contentWrapper.appendChild(this.content)
		return contentWrapper
	}

	/**
	 * Gets the modal header
	 * @returns {HTMLElement} - A header element
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
	 * @returns {HTMLButtonElement} - A button element
	*/
	getCloseButton() {
		const button = document.createElement('button')
		button.classList.add('close')
		button.textContent = '✖'
		button.addEventListener('click', () => this.remove())
		return button
	}

	/**
	 * Removes the modal
	 * @returns {void}
	*/
	remove() {
		this.element.close()
		this.element.remove()
		delete this
	}
}
