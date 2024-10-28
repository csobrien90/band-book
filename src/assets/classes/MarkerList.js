import { Marker } from './Marker.js'
import { Modal } from './Modal.js'
import { LoopManager } from './LoopManager.js'
import { Song } from './Song.js'
import { Notification } from './Notification.js'
import { formattedTimeToSeconds, secondsToFormattedTime } from '../utils.js'

export class MarkerList {
	/**
	 * @typedef {Object} Marker
	 * @property {number} time - A time in seconds
	 * @property {Song} song - A Song instance
	 * @property {string} title - A title for the marker
	*/

	/** @type {Song} */
	song;
	/** @type {Marker[]} */
	markers = [];
	/** @type {HTMLDivElement} */
	markersListWrapper = null;
	/** @type {LoopManager} */
	loopManager = new LoopManager();

	/**
	 * @constructor
	 * @param {Song} song - A Song instance
	 * @returns {MarkerList} - A new MarkerList instance
	*/
	constructor(song) {
		this.song = song
		this.setOrResetMarkersListWrapper()
	}

	/**
	 * Adds a marker to the song
	 * @param {Marker} marker - A Marker instance
	 * @returns {void}
	*/
	addMarker(marker) {
		if (this.markers.length === 0) {
			this.loopManager.setSong(marker.song)
		}
		this.markers.push(marker)
	}

	/**
	 * Removes a marker from the song
	 * @param {Marker} marker - A Marker instance
	 * @returns {void}
	*/
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
		const newMarker = new Marker(this.song.player.getCurrentTime(), this.song)
		this.addMarker(newMarker)
		this.renderMarkersList()
		this.song.bandbook.syncManager.createMarker(newMarker)
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

			// Append all elements to the item
			const loopCheckbox = this.getLoopCheckbox(marker)
			item.appendChild(loopCheckbox)
			item.appendChild(this.getLoopProxy(loopCheckbox, marker))
			item.appendChild(this.getButton(marker))
			item.appendChild(this.getInput(marker))
			item.appendChild(this.getEditMarkerButton(marker))

			// Append the item to the list
			list.appendChild(item)
		})

		return list
	}

	/**
	 * Returns a loop checkbox for the marker
	 * @param {Marker} marker - A Marker instance
	 * @returns {HTMLInputElement} - An input element
	*/
	getLoopCheckbox(marker) {
		const loopCheckbox = document.createElement('input')
		loopCheckbox.type = 'checkbox'
		loopCheckbox.classList.add('loop-checkbox')
		loopCheckbox.checked = this.loopManager.active && this.loopManager.start === marker.time
		loopCheckbox.dataset.time = marker.time
		return loopCheckbox
	}

	/**
	 * Returns a loop proxy button for the marker
	 * @param {HTMLInputElement} loopCheckbox - An input element
	 * @param {Marker} marker - A Marker instance
	 * @returns {HTMLButtonElement} - A button element
	*/
	getLoopProxy(loopCheckbox, marker) {
		const loopProxy = document.createElement('button')
		loopProxy.classList.add('loop-proxy')
		loopProxy.textContent = 'Loop'
		loopProxy.addEventListener('click', () => {
			loopCheckbox.checked = !loopCheckbox.checked

			// Uncheck all other loop checkboxes
			document.querySelectorAll('.loop-checkbox').forEach(checkbox => {
				if (checkbox !== loopCheckbox) {
					checkbox.checked = false
				}
			})

			this.loopManager.toggleLoop()
			const nextMarkerTime = this.markers.find(m => m.time > marker.time)?.time
			const endTime = nextMarkerTime || this.song.player.getAudioElement().duration
			this.loopManager.setLoopBounds(marker.time, endTime)

			loopProxy.blur()
		})
		return loopProxy
	}

	/**
	 * Returns an edit marker button
	 * @param {Marker} marker - A Marker instance
	 * @returns {HTMLButtonElement} - A button element
	*/
	getEditMarkerButton(marker) {
		const button = document.createElement('button')
		button.textContent = 'Edit Marker'
		button.addEventListener('click', () => {
			const modalHeader = document.createElement('h2')
			modalHeader.textContent = marker.title

			// Append buttons to modal header and get edit form content
			modalHeader.appendChild(this.getEditTitleButton(marker, modalHeader))
			modalHeader.appendChild(this.getDeleteButton(marker))
			const modalContent = this.getEditMarkerForm(marker)

			// Open modal
			this.activeModal = new Modal(modalHeader, modalContent, { useForm: true })
		})
		return button
	}

	/**
	 * Returns an edit title button for the marker
	 * @param {Marker} marker - A Marker instance
	 * @param {HTMLHeadingElement} modalHeader - A heading element
	 * @returns {HTMLButtonElement} - A button element
	*/
	getEditTitleButton(marker, modalHeader) {
		const button = document.createElement('button')
		button.classList.add('edit-asset-title')
		button.innerHTML = '&#9998;'
		button.ariaLabel = 'Edit title'
		button.addEventListener('click', () => {
			modalHeader.innerHTML = ''
			const titleInput = document.createElement('input')
			titleInput.type = 'text'
			titleInput.value = marker.getTitle()

			const saveButton = document.createElement('button')
			saveButton.textContent = 'Save'
			saveButton.addEventListener('click', (e) => {
				e.preventDefault()
				marker.setTitle(titleInput.value)
				marker.song.bandbook.syncManager.updateMarkerTitle(marker, titleInput.value)
				marker.song.bandbook.refresh()

				// Update modal header
				modalHeader.textContent = marker.title
				modalHeader.appendChild(this.getEditTitleButton(marker, modalHeader))
				modalHeader.appendChild(this.getDeleteButton(marker))
			})

			modalHeader.appendChild(titleInput)
			modalHeader.appendChild(saveButton)
		})
		return button
	}
		

	/**
	 * Returns an edit form for the marker
	 * @returns {HTMLDivElement} - A div wrapper around the form element
	*/
	getEditMarkerForm(marker) {
		const hiddenInputChange = (e) => {
			const time = e.target.value
			marker.setTime(time)
			marker.song.bandbook.refresh()
		}

		const div = document.createElement('div')
		div.classList.add('edit-asset')

		// time input
		const timeInput = document.createElement('input')
		timeInput.type = 'number'
		timeInput.step = "1"
		timeInput.value = Math.floor(marker.time)
		timeInput.hidden = true
		timeInput.addEventListener('change', hiddenInputChange)
		div.appendChild(timeInput)

		// time proxy
		const timeProxyWrapper = document.createElement('div')
		timeProxyWrapper.classList.add('time-proxy-wrapper')
		const timeProxy = document.createElement('input')
		timeProxy.type = 'text'
		// Smart HH:MM:SS format
		timeProxy.pattern = "^(?:(?:1[0-1]|[1-9]):)?(?:[0-5][0-9]:)?[0-5][0-9]$"
		timeProxy.value = marker.getFormattedTime()
		timeProxy.addEventListener('change', () => {
			const previousTime = marker.getFormattedTime()

			// Validate
			if (!timeProxy.value.match(timeProxy.pattern)) {
				const error = new Notification('Time must be in valid format: SS, MM:SS, or HH:MM:SS', 'error', true, 5000, true)
				timeProxyWrapper.insertAdjacentElement('afterend', error.element)
				timeProxy.value = previousTime
				return
			}
			
			const time = formattedTimeToSeconds(timeProxy.value)

			if (time < 0 || time > marker.song.getDuration()) {
				const error = new Notification('That is not a valid time for this song', 'error', true, 5000, true)
				timeProxyWrapper.insertAdjacentElement('afterend', error.element)
				timeProxy.value = previousTime
				return
			}

			hiddenInputChange({ target: { value: time } })
		})

		const upOneSecond = document.createElement('button')
		upOneSecond.innerHTML = '&#9650;'
		upOneSecond.addEventListener('click', (e) => {
			e.preventDefault()
			const time = formattedTimeToSeconds(timeProxy.value) + 1
			hiddenInputChange({ target: { value: time } })
			timeProxy.value = secondsToFormattedTime(time)
		})
		const downOneSecond = document.createElement('button')
		downOneSecond.innerHTML = '&#9660;'
		downOneSecond.addEventListener('click', (e) => {
			e.preventDefault()
			const time = formattedTimeToSeconds(timeProxy.value) - 1
			hiddenInputChange({ target: { value: time } })
			timeProxy.value = secondsToFormattedTime(time)
		})
		
		timeProxyWrapper.appendChild(timeProxy)
		timeProxyWrapper.appendChild(upOneSecond)
		timeProxyWrapper.appendChild(downOneSecond)
		div.appendChild(timeProxyWrapper)

		// notes input
		const notesLabel = document.createElement('label')
		notesLabel.htmlFor = 'marker-notes'
		const notesSpan = document.createElement('span')
		notesSpan.textContent = 'Notes'
		const notesInput = document.createElement('textarea')
		notesInput.value = marker.getNotes()
		notesInput.id = 'marker-notes'
		notesInput.name = 'marker-notes'
		notesInput.rows = 4
		notesInput.addEventListener('change', () => {
			marker.setNotes(notesInput.value)
		})
		notesLabel.appendChild(notesSpan)
		notesLabel.appendChild(notesInput)

		div.appendChild(notesLabel)

		return div
	}

	/**
	 * Returns a delete button for the marker
	 * @param {Marker} marker - A Marker instance
	 * @returns {HTMLButtonElement} - A button element
	*/
	getDeleteButton(marker) {
		const deleteButton = document.createElement('button')
		deleteButton.textContent = 'Delete'
		deleteButton.addEventListener('click', () => {
			if (confirm(`Are you sure you want to delete ${marker.title}?`)) {
				this.removeMarker(marker)
				this.song.bandbook.syncManager.deleteMarker(marker)
				this.song.bandbook.refresh()
				document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
			} else {
				return
			}
		})
		return deleteButton
	}

	/**
	 * Returns a button for the marker to skip to that time
	 * @param {Marker} marker - A Marker instance
	 * @returns {HTMLButtonElement} - A button element
	*/
	getButton(marker) {
		const button = document.createElement('button')
		button.textContent = marker.getFormattedTime()
		button.addEventListener('click', () => {
			const audioEl = this.song.player.getAudioElement()
			audioEl.currentTime = marker.time
			audioEl.play()
		})
		return button
	}

	/**
	 * Returns an input for the marker to set the title
	 * @param {Marker} marker - A Marker instance
	 * @returns {HTMLInputElement} - An input element
	*/
	getInput(marker) {
		const input = document.createElement('input')
		input.type = 'text'
		input.value = marker.getTitle()
		input.addEventListener('input', () => {
			marker.setTitle(input.value)
		})
		return input
	}
}