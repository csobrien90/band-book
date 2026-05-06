import { Song } from './Song.js'

export class Workspace {
	/**
	 * The parent element for the workspace
	 * @type {HTMLElement}
	 * @default null
	*/
	parentElement = null

	/**
	 * The workspace wrapper element
	 * @type {HTMLElement}
	 * @default null
	*/
	wrapper = null

	/**
	 * @constructor
	 * @param {HTMLElement} parentElement - The parent element for the workspace
	*/
	constructor(parentElement) {
		this.parentElement = parentElement
		this.init()
	}

	/**
	 * Initializes the Workspace instance
	 * @returns {void}
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
	 * @param {Song} song - A Song instance to be rendered in the workspace
	 * @return {void}
	*/
	setSongWorkspace(song) {
		// Reset workspace
		this.reset()
		if (!song || !(song instanceof Song)) return

		// Append song header to workspace
		this.wrapper.appendChild(song.getHeader())

		// Create player wrapper
		const playerWrapper = document.createElement('div')
		playerWrapper.className = 'player-wrapper'
		playerWrapper.appendChild(song.player.getPlayerElement())
		playerWrapper.appendChild(song.markerList.getAddMarkerButton())

		// Append player wrapper and marker list to workspace
		this.wrapper.appendChild(playerWrapper)
		this.wrapper.appendChild(song.markerList.renderMarkersList())
	}

	/**
	 * Reset the workspace
	 * @returns {void}
	*/
	reset() {
		this.wrapper.innerHTML = ''
	}
}
