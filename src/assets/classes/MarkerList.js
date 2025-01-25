import { secondsToFormattedTime } from '../utils.js'
import { Marker } from './Marker.js'
import { SegmentManager } from './SegmentManager.js'
import { Song } from './Song.js'

export class MarkerList {
	/**
	 * @typedef {Object} Marker
	 * @property {number} time - A time in seconds
	 * @property {Song} song - A Song instance
	 * @property {string} title - A title for the marker
	*/

	/** @type {Song} */
	song
	/** @type {Marker[]} */
	markers = []
	/** @type {HTMLDivElement} */
	markersListWrapper = null
	/** @type {SegmentManager} */
	segmentManager = new SegmentManager()
	/** @type {Set<Marker>} */
	selectedMarkers = new Set()

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
			this.segmentManager.setSong(marker.song)
		}
		this.markers.push(marker)
	}

	/**
	 * Selects a marker
	 * @param {Marker} marker - A Marker instance
	 * @returns {Set<Marker>} - A set of selected markers
	 */
	handleSelectMarker(marker) {
		// If the marker is not already selected, add it to the set
		if (!this.selectedMarkers.has(marker)) {
			// If no markers are selected, add the marker
			if (this.selectedMarkers.size === 0) {
				this.selectedMarkers.add(marker)
			} else {
				// If the selected markers are contiguous, add the current marker
				const selectedMarkersArray = Array.from(this.selectedMarkers)
				const firstSelectedMarkerIndex = this.markers.indexOf(selectedMarkersArray[0])
				const lastSelectedMarkerIndex = this.markers.indexOf(selectedMarkersArray[selectedMarkersArray.length - 1])
				const currentMarkerIndex = this.markers.indexOf(marker)

				if (currentMarkerIndex - lastSelectedMarkerIndex === 1 || currentMarkerIndex - firstSelectedMarkerIndex === -1) {
					this.selectedMarkers.add(marker)
				} else {
					// Otherwise, clear the set and add the current marker
					this.selectedMarkers.clear()
					this.selectedMarkers.add(marker)
				}
			}
		} else {
			// If the marker is at the beginning or end of the selected markers, remove it
			const selectedMarkersArray = Array.from(this.selectedMarkers)
			const firstSelectedMarker = selectedMarkersArray[0]
			const lastSelectedMarker = selectedMarkersArray[selectedMarkersArray.length - 1]
			if (marker === firstSelectedMarker || marker === lastSelectedMarker) {
				this.selectedMarkers.delete(marker)
			} else {
				// If the marker is in the middle of the selected markers, clear the set and add the current marker
				this.selectedMarkers.clear()
				this.selectedMarkers.add(marker)
			}

		}

		// Sort the selected markers by time
		this.selectedMarkers = new Set([...this.selectedMarkers].sort((a, b) => a.time - b.time))

		// Update the loop event listener
		const currentBounds = this.getSegmentTimeBounds()
		this.segmentManager.setBounds(...currentBounds)
		this.updateSegmentBoundsDisplay(...currentBounds)
		this.segmentManager.updateLoopListener()

		// Return the set of selected markers
		return this.selectedMarkers
	}

	/**
	 * Updates the segment bounds display
	 * @param {number} start - The start time in seconds
	 * @param {number} end - The end time in seconds
	 * @returns {void}
	*/
	updateSegmentBoundsDisplay(start, end) {
		this.segmentBoundsDisplay.textContent = `Selected Segment: ${secondsToFormattedTime(start)} - ${secondsToFormattedTime(end)}`
	}

	/**
	 * Get segment time bounds
	 * @returns {Array<number>} - An array of segment time bounds
	*/
	getSegmentTimeBounds() {
		let start, end
		const selectedMarkersArray = Array.from(this.selectedMarkers)

		// If no markers are selected, return the start and end times of the song
		if (selectedMarkersArray.length === 0) {
			return [0, this.song.getDuration()]
		}
			
		// If one marker is selected, the start time is the time of the marker
		start = selectedMarkersArray[0].time

		// If only one marker is selected, the end time is the end of the song
		if (selectedMarkersArray.length === 1) {
			end = this.song.getDuration()
		} else {
			// If multiple markers are selected, the end time is the time of the last marker
			end = selectedMarkersArray[selectedMarkersArray.length - 1].time
		}

		return [start, end]
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
		button.classList.add('add-marker-button')
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
		this.markersListWrapper.appendChild(this.addSegmentControls())
		this.markersListWrapper.appendChild(list)
		return this.markersListWrapper
	}

	/**
	 * Creates segment controls for the song
	 * @returns {HTMLDivElement} - A div element containing segment controls
	*/
	addSegmentControls() {
		const markerListControls = document.createElement('div')
		markerListControls.classList.add('segment-controls')

		// Selected segment bounds display
		const segmentBounds = document.createElement('p')
		segmentBounds.id = 'selected-segment-bounds'
		this.segmentBoundsDisplay = segmentBounds
		markerListControls.appendChild(segmentBounds)

		// Download segment button
		const downloadSegmentButton = document.createElement('button')
		downloadSegmentButton.textContent = 'Download Segment'
		downloadSegmentButton.addEventListener('click', () => {
			const bounds = this.getSegmentTimeBounds()
			this.song.downloadSegment(...bounds)
		})

		markerListControls.appendChild(downloadSegmentButton)

		// Loop checkbox and label
		const toggleLoop = () => {
			const active = this.segmentManager.toggleLoop()
			loopCheckbox.checked = active
		}

		const loopLabel = document.createElement('label')
		loopLabel.htmlFor = 'loop-checkbox'
		const loopIcon = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32" xml:space="preserve"><path d="M24.6,11.5c-0.3-0.5-0.9-0.6-1.4-0.3c-0.5,0.3-0.6,0.9-0.3,1.4c0.7,1,1,2.2,1,3.4c0,3.3-2.7,6-6,6h-4c-3.3,0-6-2.7-6-6  s2.7-6,6-6h3v1.4c0,0.4,0.2,0.7,0.6,0.9c0.1,0.1,0.3,0.1,0.4,0.1c0.2,0,0.4-0.1,0.6-0.2l3-2.4C21.9,9.6,22,9.3,22,9  s-0.1-0.6-0.4-0.8l-3-2.4c-0.3-0.2-0.7-0.3-1.1-0.1C17.2,5.9,17,6.2,17,6.6V8h-3c-4.4,0-8,3.6-8,8s3.6,8,8,8h4c4.4,0,8-3.6,8-8  C26,14.4,25.5,12.8,24.6,11.5z"/></svg>`
		loopLabel.innerHTML = loopIcon
		loopLabel.tabIndex = 0
		loopLabel.title = 'Toggle Loop'

		const loopCheckbox = document.createElement('input')
		loopCheckbox.type = 'checkbox'
		loopCheckbox.id = 'loop-checkbox'
		loopCheckbox.addEventListener('change', () => toggleLoop())
		loopLabel.addEventListener('keydown', e => {
			e.preventDefault()
			if (e.key === 'Enter' || e.key === ' ') {
				toggleLoop()
			}
		})
		loopLabel.appendChild(loopCheckbox)
		markerListControls.appendChild(loopLabel)

		const instructions = document.createElement('p')
		instructions.textContent = 'Loop function currently under construction - until complete, select one marker to loop from there to end of song, multiple markers to define loop bounds'
		markerListControls.appendChild(instructions) 
		return markerListControls
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
			const item = marker.renderAsListItem(this)
			list.appendChild(item)
		})

		return list
	}
}
