export class Workspace {
	/**
	 * @constructor
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
		this.reset()
		this.wrapper.appendChild(song.getHeader())
		this.wrapper.appendChild(song.player.getAudioElement())
		this.wrapper.appendChild(song.markerList.getAddMarkerButton())
		this.wrapper.appendChild(song.markerList.renderMarkersList())
	}

	/**
	 * Resets the workspace
	 */
	reset() {
		this.wrapper.innerHTML = ''
	}
}
