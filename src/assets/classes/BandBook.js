import { Song } from "./Song.js"
import { Workspace } from "./Workspace.js"
import { SyncManager } from "./SyncManager.js"
import { Notification } from "./Notification.js"
import { Modal } from "./Modal.js"
import { SettingsManager } from "./SettingsManager.js"
import { TagManager } from "./TagManager.js"
import { Icon } from "./Icon.js"

/**
 * Represents a collection of songs
 */
export class BandBook {
  /**
   * @typedef {import('./Song.js').SongData} SongData
   */

  /**
   * The workspace for the BandBook instance
   * @type {Workspace}
   * @default null
   */
  workspace = null

  /**
   * The sync manager for the BandBook instance
   * @type {SyncManager}
   * @default null
   */
  syncManager = null

  /**
   * The settings manager for the BandBook instance
   * @type {SettingsManager}
   * @default null
   */
  settingsManager = null

  /** @type {TagManager} */
  tagManager = null

  /**
   * The navigation element for the BandBook instance
   * @type {HTMLElement}
   * @default null
   */
  navElement = null

  /**
   * An array of Song instances
   * @type {Song[]}
   * @default []
   */
  songs = []

  /**
   * The current version of the BandBook app
   * @type {string}
   */
  version = CURRENT_VERSION

  /**
   * @constructor
   * @param {HTMLElement} wrapperElement - An HTML element to render the workspace
   */
  constructor(wrapperElement) {
    // DOM management
    wrapperElement.id = "bandbook"
    this.wrapper = wrapperElement
    this.addFeedbackButton()
	this.addDragAndDropListeners()

    // Initialize dependencies
    this.workspace = new Workspace(wrapperElement)
    this.syncManager = new SyncManager(this)
    this.settingsManager = new SettingsManager(this)

    // Load the BandBook
    this.syncManager
      .loadBandBook()
      .then((data) => this.init(data))
      .catch((error) => console.error("Error loading BandBook:", error))
	  .finally(() => this.wrapper.classList.remove("bandbook-loading"))
  }

  /**
   * Initializes the BandBook instance
   * @param {SongData} songData - An object containing song data
   * @returns {void}
   */
  async init(songData) {
    if (!this.id) this.id = this.createId

	this.tagManager = new TagManager(this, songData)
	
    // Create an array of Song instances from the song data
    this.songs = songData ? songData.map((song) => new Song(song, this)) : []
	
    // Set the active song
    this.setActiveSong(this.activeSong || this.songs[0])

	this.checkForUploadedAudio()
  }

  /**
   * Checks for uploaded audio files
   * @returns {void}
   */
  checkForUploadedAudio() {
	fetch("/get-uploaded-audio")
	.then(res => {
		if (!res.ok) throw res;
		return res.json();
	})
	.then(files => {
		files.forEach(file => {
			const audioBlob = new Blob([new Uint8Array(file.data)], { type: file.type })
			this.createSong(audioBlob, file.type, file.name)
		});
	}).catch(err => {
		// If not found, this is not an error, just no files uploaded
		if (err.status === 404 || err.status === 403) return;

		console.error("Error fetching uploaded audio files:", err)
		new Notification("Error adding audio file(s). Refresh and try again.", "error", true)
	});
  }

  /**
   * Adds a song to the BandBook instance
   * @param {Song} song - A Song instance
   * @returns {void}
   */
  addSong(song) {
    this.songs.push(song)
    this.setActiveSong(song)
    new Notification("Song added successfully", "success")
  }

  /**
   * Removes a song from the BandBook instance
   * @param {Song} song - A Song instance
   * @returns {void}
   */
  removeSong(song) {
    this.songs = this.songs.filter((s) => s.title !== song.title)
    this.setActiveSong(this.songs[0] || null)
    this.renderSongNavigation()
    this.syncManager.deleteSong(song)
  }

  /**
   * Returns a Song instance given a slug
   * @param {string} slug - A song slug
   * @returns {Song|undefined} - A Song instance or undefined if no song is found
   */
  getSongBySlug(slug) {
    return this.songs.find((song) => song.slug === slug)
  }

  /**
   * Returns a Marker instance given an id
   * @param {string} id - A marker id
   * @returns {Marker|undefined} - A Marker instance or undefined if no marker is found
   */
	getMarkerById(id) {
		for (const song of this.songs) {
		const marker = song.markerList.markers.find((marker) => marker.id === id)
		if (marker) return marker
		}
		return undefined
	}
	

  /**
   * Renders the song navigation
   * @returns {void}
   */
  renderSongNavigation() {
    // Set/reset the navigation element
    if (this.navElement) this.navElement.remove()
    const navigation = document.createElement("nav")
    navigation.classList.add("song-navigation")

	// Create a header for the navigation
	const header = document.createElement("header")
	// const logo = new Icon("logo", 50, 50).getImg()
	const logo = document.createElement("p")
	logo.textContent = "BandBook"
	header.appendChild(logo)

	const navToggle = document.createElement("label")
	navToggle.classList.add("nav-toggle")
	navToggle.htmlFor = "nav-toggle"
	const toggleCheckbox = document.createElement("input")
	toggleCheckbox.type = "checkbox"
	toggleCheckbox.id = "nav-toggle"
	navToggle.appendChild(toggleCheckbox)
	header.appendChild(navToggle)
	navigation.appendChild(header)

	navigation.appendChild(document.createElement("hr"))

    // Create a list element for the songs
    const list = document.createElement("ul")
    list.classList.add("song-nav-list")

    // Create a button for each song
    this.songs.forEach((song) => this.makeSongButton(song, list))

    navigation.appendChild(list)

    // Add a separator if there are songs
    if (this.songs?.length > 0) navigation.appendChild(document.createElement("hr"))

    // Add the BandBook controls
	const navButtonWrapper = document.createElement("div")
	navButtonWrapper.classList.add("nav-button-wrapper")

    navButtonWrapper.appendChild(this.getCreateSongButton())
	if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
		// Only show the record button if the browser supports getUserMedia
		navButtonWrapper.appendChild(this.getRecordSongButton())
	}
    navButtonWrapper.appendChild(this.getImportButton())
    navButtonWrapper.appendChild(this.getExportButton())
    navButtonWrapper.appendChild(this.settingsManager.getSettingsNavItem())

	navigation.appendChild(navButtonWrapper)

    // Deploy the new navigation element
    this.navElement = navigation
    this.wrapper.parentElement.insertBefore(navigation, this.wrapper)
  }

  /**
   * Creates a song button
   * @param {Song} song - A Song instance to create a button for
   * @param {HTMLElement} navigation - The navigation element to append the button to
   * @returns {void}
   */
  makeSongButton(song, navigation) {
    const item = document.createElement("li")
    item.classList.add("song-nav-item")

    const button = document.createElement("button")
    button.textContent = song.title
    if (song === this.activeSong) button.classList.add("active")
    button.addEventListener("click", () => {
      this.activeSong.player.getAudioElement().pause()
      this.setActiveSong(song)
    })

	const titleHeader = document.createElement("h3")
    const editTitleButton = song.getEditTitleButton(titleHeader)
    const deleteButton = song.getDeleteSongButton(false)

    item.appendChild(button)
	item.appendChild(titleHeader)
    item.appendChild(editTitleButton)
    item.appendChild(deleteButton)
    navigation.appendChild(item)
  }

  /**
   * Sets the active song
   * @param {Song} song - A Song instance
   * @returns {void}
   */
  setActiveSong(song) {
    this.activeSong = song
    this.refresh()
  }

  /**
   * Returns the add song button
   * @returns {HTMLButtonElement} - A button element
   */
  getCreateSongButton() {
    // Create an upload input element
    const upload = document.createElement("input")
    upload.type = "file"
    upload.accept = "*"
    upload.classList.add("btn")
    upload.addEventListener("change", (e) => {
      const {
        target: { files },
      } = e
      const { type: fileType, name } = files[0]

      // Confirm the file type is audio before proceeding
      if (!fileType.includes("audio")) {
        new Notification("Please upload a valid file type (e.g. mp3, wav, etc.)", "error", true)
        upload.value = ""
        return
      }

      // Get the file name without the extension
      const title = name.split(".").slice(0, -1).join(".")

      this.createSong(files[0], fileType, title)
    })

    // Return a button element to trigger the hidden upload input
    const button = document.createElement("button")
    button.textContent = "Add Song"
    button.addEventListener("click", () => upload.click())
    return button
  }

  /**
   * Returns the record song button
   * @returns {HTMLButtonElement} - A button element
   */
  getRecordSongButton() {
	const button = document.createElement("button")
	button.textContent = "Record New Song"
	button.addEventListener("click", () => this.getRecorderModal())
	return button
  }

  /**
   * Creates a modal for recording a new song
   * @returns {void}
   */
  getRecorderModal() {
	const modalHeader = document.createElement("h2")
	modalHeader.textContent = "Record New Song"

	const modalContent = document.createElement("div")

	const recordingCopy = document.createElement("p")
	recordingCopy.textContent = "Click \"Record\" to use your microphone to record live audio as a new song. This is a new feature and has not been thoroughly tested. Please report any issues, submmitting feedback via the button in the bottom right corner."
	modalContent.appendChild(recordingCopy)

	navigator.mediaDevices.getUserMedia({ audio: true })
	.then((stream) => {
		const mediaRecorder = new MediaRecorder(stream)
		const audioChunks = []

		mediaRecorder.addEventListener("dataavailable", (event) => {
			audioChunks.push(event.data)
		})

		const recordButton = document.createElement("button")
		recordButton.textContent = "Record"
		recordButton.addEventListener("click", () => {
			mediaRecorder.start()
			recordButton.textContent = "Recording..."
			recordButton.disabled = true
			stopButton.disabled = false
		})

		const stopButton = document.createElement("button")
		stopButton.textContent = "Stop"
		stopButton.disabled = true
		stopButton.addEventListener("click", () => {
			mediaRecorder.stop()
			recordButton.textContent = "Record"
			recordButton.disabled = false
			stopButton.disabled = true
		})

		mediaRecorder.addEventListener("stop", () => {
			const audioBlob = new Blob(audioChunks, { type: "audio/wav" })
			const fileName = "recorded-audio.wav"
			this.createSong(audioBlob, "audio/wav", fileName)
		})

		modalContent.appendChild(recordButton)
		modalContent.appendChild(stopButton)

		new Modal(modalHeader, modalContent, { useForm: false })
	})
	.catch((error) => {
		new Notification("Error accessing microphone: " + error.message, "error", true)
	})
  }

  /**
   * Creates a song
   * @param {File} file - A file object
   * @param {string} fileType - The file type
   * @param {string} name - The file name
   * @returns {void}
   */
  createSong(file, fileType, name) {
	// Read the file as an ArrayBuffer
	file.arrayBuffer().then((arrayBuffer) => {

		// Create song data
		const songData = {
			src: arrayBuffer,
			srcType: fileType,
			title: name,
			slug: name.replace(/\s/g, "-").toLowerCase() + "-" + new Date().getTime(),
			composer: "Unknown",
			tempo: 120,
			key: "C",
			timeSignature: "4/4",
			notes: "",
		}

		// Create a new Song instance, add it to BandBook, and sync
		const song = new Song(songData, this)
		this.addSong(song)
		this.renderSongNavigation()
		this.syncManager.createSong(song)
	}).catch((error) => {
		new Notification("Error reading file: " + error.message, "error", true)
	})
  }

  /**
   * Returns the import button
   * @returns {HTMLButtonElement} - A button element
   */
  getImportButton() {
    const button = document.createElement("button")
    button.textContent = "Import"
    button.addEventListener("click", () => {
      // Create a temporary input to accept JSON files (never appended to the DOM)
      const input = document.createElement("input")
      input.type = "file"
      input.accept = "application/json"
      input.addEventListener("change", (e) => {
        const file = e.target.files[0]
        const reader = new FileReader()
        reader.onload = (readerEvent) => {
          this.syncManager.importBandBook(readerEvent.target.result)
        }
        reader.readAsText(file)
      })

      // Immediately trigger the hidden input on button click
      input.click()
    })

    return button
  }

  /**
   * Returns the export button
   * @returns {HTMLButtonElement} - A button element
   */
  getExportButton() {
    const button = document.createElement("button")
    button.textContent = "Export"
    button.addEventListener("click", () => this.export())
    return button
  }

  /**
   * Export the BandBook instance as a JSON object
   * @returns {Promise<Object>} - A JSON object representing the BandBook instance
   */
  async export() {
    // Get the data for each song
    let songData = []
    for (let i = 0; i < this.songs.length; i++) {
      const song = this.songs[i]
      const songDataItem = await song.getData()
      songData.push(songDataItem)
    }

    // Create an object and stringify it for download
    const data = {
      id: this.id,
      songs: songData,
    }
    const stringifiedData = JSON.stringify(data, null, 2)

    // Create a Blob to download the JSON file
    const blob = new Blob([stringifiedData], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    // Create a temporary anchor element to download the JSON file
    const a = document.createElement("a")
    a.href = url
    a.download = "bandbook.json"
    a.click()

	URL.revokeObjectURL(url)
	a.remove()
  }

  /**
   * Adds a feedback button
   * @returns {void}
   */
  addFeedbackButton() {
    const button = document.createElement("button")
    button.classList.add("feedback")
    button.ariaLabel = "Feedback"
	button.title = "Feedback"
	button.appendChild(new Icon("feedback", 50, 50).getImg())
    button.addEventListener("click", () => {
      const modalHeader = document.createElement("h2")
      modalHeader.textContent = "Let us know what you think!"

      const modalContent = document.createElement("div")
      modalContent.classList.add("feedback-form")

      const emailLabel = document.createElement("label")
      emailLabel.htmlFor = "email"

      const emailSpan = document.createElement("span")
      emailSpan.textContent = "Email (optional)"
      emailLabel.appendChild(emailSpan)

      const emailInput = document.createElement("input")
      emailInput.id = "email"
      emailInput.type = "email"
      emailInput.name = "email"
      emailLabel.appendChild(emailInput)

      const label = document.createElement("label")
      label.htmlFor = "feedback"

      const span = document.createElement("span")
      span.textContent = "Feedback"
      label.appendChild(span)

      const textarea = document.createElement("textarea")
      textarea.id = "feedback"
      textarea.name = "feedback"
      textarea.rows = 6
      textarea.required = true
      label.appendChild(textarea)

      modalContent.appendChild(emailLabel)
      modalContent.appendChild(label)

      const submit = document.createElement("button")
      submit.type = "submit"
      submit.textContent = "Send"
      modalContent.appendChild(submit)

      const modal = new Modal(modalHeader, modalContent, { useForm: true })

      submit.addEventListener("click", async (e) => {
        e.preventDefault()
        document.body.classList.add("active-loading")
        const email = emailInput.value
        const message = textarea.value

        if (message) {
          const data = { message, email }

          // Send feedback to the serverless function
          const submitFeedbackResponse = await fetch("https://bb-feedback-function.deno.dev/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          })

          document.body.classList.remove("active-loading")

          if (!submitFeedbackResponse.ok) {
            new Notification("There was an error submitting your feedback. Refresh the page and try again.", "error")
            return
          } else {
            new Notification("Thank you for your feedback!", "success")
            modal.remove()
          }
        } else {
          new Notification("Please enter some feedback", "error")
        }
      })
    })
    this.wrapper.parentElement.appendChild(button)
  }

  /**
   * Adds an event listener to make the <body> a droppable area for new songs
   */
  addDragAndDropListeners() {
	const body = document.querySelector('body')
	body.addEventListener('dragover', e => this.newSongDragListener(e))
	body.addEventListener('drop', e => this.newSongDropListener(e))
  }

  newSongDragListener(event) {
	event.preventDefault()
	// console.log("drag", {event})
  }

  newSongDropListener(event) {
	event.preventDefault()
	const files = event.dataTransfer.files
	if (!files) return

	for (const file of files) {
		this.processAndCreateSong(file)
	}
  }

  processAndCreateSong(file) {
	if (!file.type.includes("audio")) {
		new Notification("Upload failed. Please upload a valid audio file (e.g. mp3, wav, etc.)", "error", true)
		return
	}
	
	// Get the file name without the extension
	const title = file.name.split(".").slice(0, -1).join(".")

	this.createSong(file, file.type, title)
  }

  /**
   * Alerts the user if the BandBook version is outdated
   * @returns {void}
   */
  alertUserOfNewVersion() {
	new Notification(
		`A new version of BandBook is available! Continue using this version or clear your cache and refresh the page to access the most up-to-date features.`,
		"info",
		false
	)
  }

  /**
   * Creates a unique ID
   * @returns {string} - A unique ID
   */
  get createId() {
    return crypto.randomUUID()
  }

  /**
   * Refreshes the DOM
   * @returns {void}
   */
  refresh() {
    this.renderSongNavigation()
    if (this.activeSong) {
      this.workspace.reset()
      this.workspace.setSongWorkspace(this.activeSong)
    } else {
      this.workspace.reset()
    }
  }
}
