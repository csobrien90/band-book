import { Song } from "./Song.js"
import { Workspace } from "./Workspace.js"
import { SyncManager } from "./SyncManager.js"
import { Notification } from "./Notification.js"
import { Modal } from "./Modal.js"
import { SettingsManager } from "./SettingsManager.js"
import { TagManager } from "./TagManager.js"

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
  tagManager = new TagManager()

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
   * @constructor
   * @param {HTMLElement} wrapperElement - An HTML element to render the workspace
   */
  constructor(wrapperElement) {
    // DOM management
    wrapperElement.id = "bandbook"
    this.wrapper = wrapperElement
    this.wrapper.classList.add("bandbook-loading")
    this.addFeedbackButton()

    // Initialize dependencies
    this.workspace = new Workspace(wrapperElement)
    this.syncManager = new SyncManager(this)
    this.settingsManager = new SettingsManager(this)

    // Load the BandBook
    this.syncManager
      .loadBandBook()
      .then((data) => {
        this.init(data)
      })
      .catch((error) => {
        this.wrapper.classList.remove("bandbook-loading")
        console.error("Error loading BandBook:", error)
      })
  }

  /**
   * Initializes the BandBook instance
   * @param {SongData} songData - An object containing song data
   * @returns {void}
   */
  async init(songData) {
    if (!this.id) this.id = this.createId

    // Create an array of Song instances from the song data
    this.songs = songData ? songData.map((song) => new Song(song, this)) : []

    // Set the active song
    this.setActiveSong(this.activeSong || this.songs[0])
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
   * Renders the song navigation
   * @returns {void}
   */
  renderSongNavigation() {
    // Set/reset the navigation element
    if (this.navElement) this.navElement.remove()
    const navigation = document.createElement("nav")
    navigation.classList.add("song-navigation")

    // Create a list element for the songs
    const list = document.createElement("ul")
    list.classList.add("song-nav-list")

    // Create a button for each song
    this.songs.forEach((song) => this.makeSongButton(song, list))

    navigation.appendChild(list)

    // Add a separator if there are songs
    if (this.songs?.length > 0) navigation.appendChild(document.createElement("hr"))

    // Add the BandBook controls
    navigation.appendChild(this.getCreateSongButton())
    navigation.appendChild(this.getImportButton())
    navigation.appendChild(this.getExportButton())
    navigation.appendChild(this.settingsManager.getSettingsNavItem())

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
   * Creates a song
   * @param {File} file - A file object
   * @param {string} fileType - The file type
   * @param {string} name - The file name
   * @returns {void}
   */
  createSong(file, fileType, name) {
    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      // Read the file as an ArrayBuffer
      const arrayBuffer = readerEvent.target.result

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
    }
    reader.readAsArrayBuffer(file)
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
  }

  /**
   * Adds a feedback button
   * @returns {void}
   */
  addFeedbackButton() {
    const button = document.createElement("button")
    button.classList.add("feedback")
    button.innerHTML = `
			<svg xmlns="http://www.w3.org/2000/svg" style="width: 2rem height: 2rem vertical-align: middle fill: currentColor" viewBox="0 0 1024 1024" version="1.1">
				<path d="M339.626667 788.48c-0.948148 0-1.896296-0.094815-3.887407-0.948148-12.61037-5.878519-15.265185-14.317037-15.265185-18.204444L320.474074 667.306667l-40.011852 0c-31.099259 0-45.605926-14.601481-45.605926-46.648889L234.856296 291.65037c0-32.047407 13.558519-46.648889 45.605926-46.648889l463.075556 0c31.099259 0 45.605926 14.601481 45.605926 46.648889l0 328.154074c0 32.047407-13.558519 46.648889-45.605926 46.648889L449.422222 666.453333 346.453333 785.540741C344.746667 787.247407 342.565926 788.48 339.626667 788.48L339.626667 788.48zM277.617778 279.608889c-5.499259 0-7.205926 1.327407-7.205926 8.248889l0 331.946667c0 6.731852 7.395556 12.98963 16.687407 12.98963l53.57037 0c5.783704 0 9.671111 3.887407 9.671111 9.671111l0 88.367407 88.367407-96.047407c1.896296-1.896296 4.835556-2.939259 6.826667-2.939259l302.838519 0c4.456296 0 7.205926-1.042963 7.205926-8.248889L755.579259 287.857778c0-6.352593-4.171852-8.248889-7.205926-8.248889L277.617778 279.608889 277.617778 279.608889z"/><path d="M348.634074 404.859259l326.637037 0c10.42963 0 18.962963-8.533333 18.962963-18.962963s-8.533333-18.962963-18.962963-18.962963L348.634074 366.933333c-10.42963 0-18.962963 8.533333-18.962963 18.962963S338.204444 404.859259 348.634074 404.859259z"/><path d="M675.365926 493.037037 348.634074 493.037037c-10.42963 0-18.962963 8.533333-18.962963 18.962963s8.533333 18.962963 18.962963 18.962963l326.637037 0c10.42963 0 18.962963-8.533333 18.962963-18.962963S685.795556 493.037037 675.365926 493.037037z"/>
			</svg>
		`
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
