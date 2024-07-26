import { Marker } from './Marker.js'
import { LoopManager } from './LoopManager.js'

export class MarkerList {
	constructor() {
		this.markers = []
		this.markersListWrapper = null
		this.loopManager = new LoopManager()
		this.init()
	}

	init() {
		this.setOrResetMarkersListWrapper()
	}

	addMarker(marker) {
		if (this.markers.length === 0) {
			this.loopManager.setSong(marker.song)
		}
		this.markers.push(marker)
	}

	removeMarker(marker) {
		this.markers = this.markers.filter(m => m !== marker)
	}

	/**
	 * Returns a button to add a marker to the song
	 * @returns {HTMLButtonElement} - A button element
	*/
	getAddMarkerButton() {
		const button = document.createElement('button')
		button.textContent = 'Add Marker'
		button.addEventListener('click', this.createMarker.bind(this))
		return button
	}

	/**
	 * Creates a marker for the song
	 * @returns {void}
	*/
	createMarker() {
		this.addMarker(new Marker(this.song.getCurrentTime(), this.song))
		this.renderMarkersList()
		this.song.bandbook.syncManager.sync()
	}

	/**
	 * Sets or resets the markers list wrapper
	 * @returns {void}
	*/
	setOrResetMarkersListWrapper() {
		if (this.markersListWrapper) {
			this.markersListWrapper.innerHTML = ''
		} else {
			this.markersListWrapper = document.createElement('div')
			this.markersListWrapper.classList.add('markers-list-wrapper')
		}
	}

	/**
	 * Renders a list of markers for the song
	 * @returns {HTMLDivElement} - A div element containing a list of markers
	*/
	renderMarkersList() {
		this.setOrResetMarkersListWrapper()
		const list = this.createMarkersList()
		this.markersListWrapper.appendChild(list)
		return this.markersListWrapper
	}

	/**
	 * Creates a list of markers for the song
	 * @returns {HTMLUListElement} - A list element containing marker items
	 * Note: markers are sorted by time and, when clicked, skip to that time
	*/
	createMarkersList() {
		const list = document.createElement('ul')
		list.classList.add('markers-list')
		this.markers.sort((a,b) => {
			return a.time - b.time
		}).forEach(marker => {
			const item = document.createElement('li')

			// Create a loop checkbox for each marker
			const loopCheckbox = document.createElement('input')
			loopCheckbox.type = 'checkbox'
			loopCheckbox.classList.add('loop-checkbox')
			loopCheckbox.checked = this.loopManager.active && this.loopManager.start === marker.time
			loopCheckbox.addEventListener('change', () => {
				if (!loopCheckbox.checked && this.loopManager.active) {
					this.loopManager.toggleLoop()
				} else if (loopCheckbox.checked) {
					if (!this.loopManager.active) {
						this.loopManager.toggleLoop()
					} else {
						// Uncheck all other loop checkboxes
						const checkboxes = document.querySelectorAll('.loop-checkbox')
						checkboxes.forEach(checkbox => {
							if (checkbox !== loopCheckbox) checkbox.checked = false
						})
					}

					const nextMarkerTime = this.markers.find(m => m.time > marker.time)?.time
					const endTime = nextMarkerTime || this.song.getAudioElement().duration
					this.loopManager.setLoopBounds(marker.time, endTime)
				}
			})

			// Create a delete button for each marker
			const deleteButton = document.createElement('button')
			deleteButton.textContent = 'Delete'
			deleteButton.addEventListener('click', () => {
				this.removeMarker(marker)
				this.renderMarkersList()
				this.song.bandbook.syncManager.sync()
			})

			// Create a button for each marker to skip to that time
			const button = document.createElement('button')
			button.textContent = marker.getFormattedTime()
			button.addEventListener('click', () => {
				const audioEl = this.song.getAudioElement()
				audioEl.currentTime = marker.time
				audioEl.play()
			})

			// Create an input for each marker to set the title
			const input = document.createElement('input')
			input.type = 'text'
			input.value = marker.getTitle()
			input.addEventListener('input', () => {
				marker.setTitle(input.value)
			})

			// Append all elements to the list
			item.appendChild(loopCheckbox)
			item.appendChild(deleteButton)
			item.appendChild(button)
			item.appendChild(input)
			list.appendChild(item)
		})

		return list
	}
}