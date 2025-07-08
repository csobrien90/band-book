import { Modal } from './Modal.js'

/**
 * @typedef {Object} Settings
 * @property {"light" | "dark"} theme - The theme of the application
 * @property {number[]} skipTimes - The times to add skip buttons for in the player controls (in seconds)
 * @property {number} markerTimeAdjustment - The time adjustment for markers (in seconds)
*/

export class SettingsManager {
	/** * Default settings for the application
	 * @type {Settings}
	*/
	DEFAULT_SETTINGS = {
		theme: 'light',
		skipTimes: [-10, -2, 2, 10],
		markerTimeAdjustment: 0
	}

	constructor(bandbook) {
		this.bandbook = bandbook

		// Get all settings from the sync manager
		this.bandbook.syncManager.loadSettings().then(settings => {
			this.settings = { ...this.DEFAULT_SETTINGS, ...settings }

			// Apply settings
			this.applyTheme()
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
		settingsContent.appendChild(this.getThemeSection())
		settingsContent.appendChild(this.getSkipTimesSection())
		settingsContent.appendChild(this.getMarkerTimeAdjustmentSection())
		settingsContent.appendChild(this.getTagManagerSection())
		settingsContent.appendChild(this.getRestoreDefaultsSection())
		return settingsContent
	}

	/**
	 * Returns the theme section
	 * @returns {HTMLDivElement} - A div element
	*/
	getThemeSection() {
		const themeSection = document.createElement('div')
		themeSection.classList.add('theme-section')

		const themeHeader = document.createElement('h3')
		themeHeader.textContent = 'Theme'
		themeSection.appendChild(themeHeader)

		themeSection.appendChild(this.getThemeToggle())
		return themeSection
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
	 * Returns the tag manager section
	 * @returns {HTMLDivElement} - A div element
	 */
	getTagManagerSection() {
		const tagManagerSection = document.createElement('div')
		tagManagerSection.classList.add('tag-manager-section')

		const tagManagerHeader = document.createElement('h3')
		tagManagerHeader.textContent = 'Tag Manager'
		tagManagerSection.appendChild(tagManagerHeader)

		tagManagerSection.appendChild(this.getTagManagerButton())

		return tagManagerSection
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
		this.settings = { ...this.DEFAULT_SETTINGS }
		this.saveSettings()
		this.applyTheme(this.DEFAULT_SETTINGS.theme)
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
	 */
	setTheme(theme) {
		this.settings.theme = theme
		this.applyTheme()
		this.saveSettings()
	}

	/**
	 * Applies the current theme to the application
	 * @returns {void}
	 */
	applyTheme() {
		this.bandbook.wrapper.classList.remove('light', 'dark')
		this.bandbook.wrapper.classList.add(this.settings.theme)
	}

	/**
	 * Returns the skip times for the player controls
	 * @returns {number[]} - The skip times in seconds
	 */
	getSkipTimes() {
		return this.settings.skipTimes || this.DEFAULT_SETTINGS.skipTimes
	}

	/**
	 * Sets the skip times for the player controls
	 * @param {number[]} skipTimes - The skip times in seconds
	 */
	setSkipTimes(skipTimes) {
		this.settings.skipTimes = skipTimes
		this.saveSettings()
	}

	/**
	 * Returns the skip times section
	 * @returns {HTMLDivElement} - A div element containing the skip times section
	 */
	getSkipTimesSection() {
		const skipTimesSection = document.createElement('formgroup')
		skipTimesSection.classList.add('skip-times')

		const skipTimesHeader = document.createElement('h3')
		skipTimesHeader.textContent = 'Skip Times'
		skipTimesSection.appendChild(skipTimesHeader)

		const skipTimes = this.getSkipTimes().sort((a, b) => a - b)

		for (let i = 0; i < 4; i++) {
			const skipTime = skipTimes[i]
			const input = document.createElement('input')
			input.type = 'number'
			input.value = skipTime || ""
			input.min = -90
			input.max = 90
			input.step = 1

			input.addEventListener('input', (e) => {
				const value = parseInt(e.target.value, 10)
				if (value === 0) {
					e.target.value = ''
				} else if (isNaN(value)) {
					e.target.value = ''
				} else if (value < -90 || value > 90) {
					e.target.value = skipTime // Reset to previous value if out of bounds
				} else {
					const newSkipTimes = this.getSkipTimes()
					newSkipTimes[i] = value
					this.setSkipTimes(newSkipTimes)
				}

				// Update the button text in the player controls
				this.bandbook.activeSong.player.updateSkipButtons()
			})
			skipTimesSection.appendChild(input)
		}

		return skipTimesSection
	}

	/**
	 * Returns the marker time adjustment value
	 * @returns {number} - The marker time adjustment value in seconds
	*/
	getMarkerTimeAdjustment() {
		return this.settings.markerTimeAdjustment || this.DEFAULT_SETTINGS.markerTimeAdjustment
	}

	/**
	 * Returns the marker time adjustment section
	 * @returns {HTMLDivElement} - A div element containing the marker time adjustment section
	 */
	getMarkerTimeAdjustmentSection() {
		const section = document.createElement('div')
		section.classList.add('marker-time-adjustment')

		const header = document.createElement('h3')
		header.textContent = 'Adjust Add Marker Timing'
		section.appendChild(header)

		const desc = document.createElement('p')
		const small = document.createElement('small')
		small.textContent = 'Subtract this number of seconds when adding a new marker. This can be useful for compensating for response time, latency, and other delays.'
		desc.appendChild(small)
		section.appendChild(desc)

		const input = document.createElement('input')
		input.type = 'number'
		input.value = this.settings.markerTimeAdjustment || this.DEFAULT_SETTINGS.markerTimeAdjustment
		input.min = 0
		input.max = 10
		input.step = 1
		input.addEventListener('input', (e) => {
			const value = parseInt(e.target.value, 10)
			if (value < 0 || value > 10 || isNaN(value)) {
				// Reset to previous value if out of bounds
				e.target.value = this.settings.markerTimeAdjustment
			} else {
				this.settings.markerTimeAdjustment = value
				this.saveSettings()
			}
		})
		section.appendChild(input)

		return section
	}

	/**
	 * Returns a section containing a button to restore all settings to their defaults
	 * @returns {HTMLDivElement} - A div element containing the button
	 */
	getRestoreDefaultsSection() {
		const section = document.createElement('div')
		section.classList.add('restore-defaults')

		const header = document.createElement('h3')
		header.textContent = 'Restore Defaults'
		section.appendChild(header)

		const button = this.getRestoreDefaultsButton()
		section.appendChild(button)

		return section
	}

	/**
	 * Returns a button to restore all settings to their defaults
	 * @returns {HTMLButtonElement} - A button element
	 */
	getRestoreDefaultsButton() {
		const button = document.createElement('button')
		button.textContent = 'Restore Defaults'
		button.addEventListener('click', () => {
			this.restoreAllDefaults()
			button.blur()
		})
		return button
	}
}
