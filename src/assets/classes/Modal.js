export class Modal {
	/**
	 * Creates a new modal
	 * @param {string} title - The title of the modal
	 * @param {HTMLElement} content - The content of the modal
	*/
	constructor(title, content) {
		this.title = title
		this.content = content
		
		this.init()
	}

	/**
	 * Initializes the modal
	*/
	init() {
		this.element = this.getModalElement()
		console.log('Modal init', {el:this.element})
		document.body.appendChild(this.element)
	}

	/**
	 * Gets the modal element
	 * @returns {HTMLDialogElement} - A dialog element
	*/
	getModalElement() {
		const dialog = document.createElement('dialog')
		dialog.classList.add('modal')
		dialog.appendChild(this.getModalContent())
		return dialog
	}

	/**
	 * Gets the modal content
	 * @returns {HTMLDivElement} - A div element
	*/
	getModalContent() {
		const div = document.createElement('div')
		div.classList.add('modal-content')
		div.appendChild(this.getModalHeader())
		div.appendChild(this.content)
		return div
	}

	/**
	 * Gets the modal header
	 * @returns {HTMLElement} - A header element
	*/
	getModalHeader() {
		const header = document.createElement('header')
		header.classList.add('modal-header')
		header.appendChild(this.getTitle())
		header.appendChild(this.getCloseButton())
		return header
	}

	/**
	 * Returns the title element
	 * @returns {HTMLHeadingElement} - A heading element
	*/
	getTitle() {
		const title = document.createElement('h2')
		title.textContent = this.title
		return title
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
	*/
	remove() {
		this.element.remove()
		delete this
	}
}
