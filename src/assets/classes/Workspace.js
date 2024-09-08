import { Song } from './Song.js'

export class Workspace {
	/**
	 * @constructor
	 * @param {HTMLElement} parentElement - The parent element for the workspace
	 * @returns {Workspace} - A new Workspace instance
	*/
	constructor(parentElement) {
		this.parentElement = parentElement
		this.init()
	}

	/**
	 * Initializes the Workspace instance
	*/
	init() {
		// Create workspace section element and append to parent element
		const workspaceSectionElement = document.createElement('section')
		workspaceSectionElement.id = 'workspace'
		this.wrapper = workspaceSectionElement
		this.parentElement.appendChild(workspaceSectionElement)
	}

	/**
	 * Appends song components to workspace
	 * @param {Song} song - A Song instance
	*/
	setSongWorkspace(song) {
		// Reset workspace
		this.reset()
		this.wrapper.appendChild(song.getHeader())

		// Create player wrapper
		const playerWrapper = document.createElement('div')
		playerWrapper.className = 'player-wrapper'
		playerWrapper.appendChild(song.player.getAudioElement())
		playerWrapper.appendChild(song.markerList.getAddMarkerButton())

		// Append player wrapper and marker list to workspace
		this.wrapper.appendChild(playerWrapper)
		this.wrapper.appendChild(song.markerList.renderMarkersList())
	}

	/**
	 * Reset the workspace
	*/
	reset() {
		this.wrapper.innerHTML = ''
	}
}
