import { Modal } from './Modal.js'

export class SettingsManager {
	constructor(bandbook) {
		this.bandbook = bandbook

		// Get the theme from the sync manager
		this.bandbook.syncManager.loadTheme().then(theme => {
			this.bandbook.wrapper.classList.add(theme)
		})
	}

	/**
	 * Opens the settings modal
	 * @returns {void}
	*/
	getSettingsNavItem() {
		const settingsNavButton = document.createElement('button')
		settingsNavButton.textContent = 'Settings'
		settingsNavButton.addEventListener('click', () => {
			this.openSettingsModal()
		})

		return settingsNavButton
	}

	/**
	 * Opens the settings modal
	*/
	openSettingsModal() {
		const settingsModalHeader = document.createElement('h2')
		settingsModalHeader.textContent = 'Settings'
		new Modal(settingsModalHeader, this.getSettingsContent())
	}

	/**
	 * Returns the settings modal content
	 * @returns {HTMLDivElement} - A div element
	*/
	getSettingsContent() {
		const settingsContent = document.createElement('div')
		settingsContent.classList.add('settings-content')
		settingsContent.appendChild(this.getThemeToggle())
		return settingsContent
	}

	/**
	 * Returns the theme toggle button
	 * @returns {HTMLButtonElement} - A button element
	*/
	getThemeToggle() {
		const button = document.createElement('button')
		button.textContent = this.bandbook.wrapper.classList.contains('dark') ? 'Light Mode' : 'Dark Mode'
		button.addEventListener('click', () => {
			this.bandbook.wrapper.classList.toggle('dark')
			button.textContent = this.bandbook.wrapper.classList.contains('dark') ? 'Light Mode' : 'Dark Mode'
			this.bandbook.syncManager.saveTheme(this.bandbook.wrapper.classList.contains('dark') ? 'dark' : 'light')
			button.blur()
		})
		return button
	}
}