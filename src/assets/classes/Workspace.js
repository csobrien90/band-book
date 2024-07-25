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
		this.wrapper.appendChild(song.getDeleteSongButton())
		this.wrapper.appendChild(song.getAudioElement())
		this.wrapper.appendChild(song.getAddMarkerButton())
		this.wrapper.appendChild(song.renderMarkersList())
	}

	/**
	 * Resets the workspace
	 */
	reset() {
		this.wrapper.innerHTML = ''
	}
}