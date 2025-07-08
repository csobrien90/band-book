import { Modal } from './Modal.js'

/**
 * @typedef {Object} Settings
 * @property {"light" | "dark"} theme - The theme of the application
*/

export class SettingsManager {
	/** * Default settings for the application
	 * @type {Settings}
	*/
	DEFAULT_SETTINGS = {
		theme: 'light'
	}

	constructor(bandbook) {
		this.bandbook = bandbook

		// Get all settings from the sync manager
		this.bandbook.syncManager.loadSettings().then(settings => {
			this.settings = { ...this.DEFAULT_SETTINGS, ...settings }

			// Apply settings
			this.setTheme(this.settings.theme, false)
		}).catch(() => {
			// If there was an error loading settings, use the default settings
			this.settings = { ...this.DEFAULT_SETTINGS }
			this.bandbook.syncManager.saveSettings(this.DEFAULT_SETTINGS)
		})
	}

	/**
	 * Saves the current settings
	 * @returns {void}
	*/
	saveSettings() {
		this.bandbook.syncManager.saveSettings(this.settings)
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
		settingsContent.appendChild(this.getTagManagerButton())
		return settingsContent
	}

	/**
	 * Returns the theme toggle button
	 * @returns {HTMLButtonElement} - A button element
	*/
	getThemeToggle() {
		const button = document.createElement('button')
		button.textContent = this.settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'
		button.addEventListener('click', () => {
			const oldTheme = this.settings.theme
			const newTheme = oldTheme === 'dark' ? 'light' : 'dark'
			button.textContent = `${oldTheme.charAt(0).toUpperCase() + oldTheme.slice(1)} Mode`

			this.setTheme(newTheme)
			button.blur()
		})
		return button
	}

	/**
	 * Returns the tag manager button
	 * @returns {HTMLButtonElement} - A button element
	 */
	getTagManagerButton() {
		const button = document.createElement('button')
		button.textContent = 'Tag Manager'
		button.addEventListener('click', () => {
			this.bandbook.tagManager.openTagManagerModal()
			button.blur()
		})
		return button
	}

	/**
	 * Resets all settings to their defaults
	 * @returns {void}
	 */
	restoreAllDefaults() {
		this.setTheme(this.DEFAULT_SETTINGS.theme)
	}

	/**
	 * Resets the given setting to its default value
	 * @param {string | undefined} setting (optional) - The setting to reset. If not provided, all settings will be reset.
	 */
	restoreDefault(setting) {
		switch(setting) {
			case 'theme':
				this.setTheme(this.DEFAULT_SETTINGS.theme)
				break
			default:
				this.restoreAllDefaults()
				break
		}
	}

	/**
	 * Sets the theme
	 * @param {"light" | "dark"} theme - The theme to set
	 * @param {boolean} [save=true] - Whether to save the settings after changing the theme
	 */
	setTheme(theme, save = true) {
		this.settings.theme = theme
		this.bandbook.wrapper.classList.remove('light', 'dark')
		this.bandbook.wrapper.classList.add(theme)
		if (save) this.saveSettings()
	}
}
