import { Song } from "./Song.js"
import { MarkerList } from "./MarkerList.js"
import { Modal } from "./Modal.js"
import { Notification } from "./Notification.js"
import { formattedTimeToSeconds, secondsToFormattedTime } from "../utils.js"

/**
 * Represents a specific point in time in a song
 */
export class Marker {
  /**
   * @typedef {import('./Song.js').MarkerData} MarkerData
   */

  /**
   * The time of the marker in seconds
   * @type {number}
   */
  time

  /**
   * The song instance
   * @type {Song}
   */
  song

	/**
	 * The title of the marker
	 * @type {string}
	 * @default "New Marker"
	*/
	title = "New Marker"

  /**
   * The notes for the marker
   * @type {string}
   * @default ""
   */
  notes = ""

  /**
   * Whether the modal is active
   * @type {Modal}
   * @default null
   */
  activeModal = null

  /**
   * @constructor
   * @param {number} time - A time in seconds
   * @param {Song} song - A Song instance
   * @param {string} [title=""] - A title for the marker
   * @param {string} [notes=""] - Notes for the marker
   * @param {string} [id] - An optional id for the marker
   * @returns {Marker} - A new Marker instance
   */
  constructor(time, song, title = "", notes, id) {
    this.id = id ?? crypto.randomUUID()
    this.time = time
    this.song = song

    this.setTitle(title)
    this.setNotes(notes)
  }

  /**
   * Sets the title of the marker
   * @param {string} title - A title for the marker
   * @returns {void}
   */
  setTitle(title) {
    this.title = title
    this.song.bandbook.syncManager.updateMarkerTitle(this, title)
  }

  /**
   * Returns the title of the marker
   * @returns {string} - The title of the marker
   */
  getTitle() {
    return this.title
  }

  /**
   * Sets the notes for the marker
   * @param {string} notes - Notes for the marker
   * @returns {void}
   */
  setNotes(notes) {
    this.notes = notes
    this.song.bandbook.syncManager.updateMarkerNotes(this, notes)
  }

  /**
   * Returns the notes for the marker
   * @returns {string} - The notes for the marker
   */
  getNotes() {
    return this.notes ?? ""
  }

  /**
   * Sets the time of the marker
   * @param {number} time - A time in seconds
   * @returns {void}
   * @throws {Error} - Throws an error if the time is less than 0 or greater than the song duration
   */
  setTime(time) {
    if (time < 0 || time > this.song.getDuration()) throw new Error("Invalid time")
    this.time = time
    this.song.bandbook.syncManager.updateMarkerTime(this, time)
  }

  /**
   * Returns the time of the marker
   * @returns {number} - The time of the marker in seconds
   */
  getTime() {
    return this.time
  }

  /**
   * Returns a formatted time string for the marker
   * @returns {string} - A formatted time string (HH:MM:SS)
   */
  getFormattedTime() {
    return secondsToFormattedTime(this.time)
  }

  /**
   * Renders the marker as a list item
   * @param {MarkerList} markerList - The parent marker list
   * @returns {HTMLLIElement} - A list item element
   */
  renderAsListItem(markerList) {
    const item = document.createElement("li")

		// Append all elements to the item
		// const loopCheckbox = this.getLoopCheckbox(markerList)
		// item.appendChild(loopCheckbox)
		// item.appendChild(this.getLoopProxy(loopCheckbox, markerList))
		item.appendChild(this.getSegmentCheckbox(markerList))
		item.appendChild(this.getButton())
		item.appendChild(this.getInput())
		item.appendChild(this.getEditMarkerButton(markerList))
		item.appendChild(this.getDeleteButton(markerList))

		return item
	}

  /**
   * Returns a checkbox to group markers into segments
   * @param {MarkerList} markerList - The parent marker list
   * @returns {HTMLInputElement} - An input element
   */
  getSegmentCheckbox(markerList) {
	const checkbox = document.createElement("input")
	checkbox.type = "checkbox"
	checkbox.classList.add("segment-checkbox")
	checkbox.checked = false
	checkbox.dataset.time = this.time

	checkbox.addEventListener("change", (e) => {
		e.preventDefault()

		// Handle segment selection
		const selected = markerList.handleSelectMarker(this)

		// Update segment checkboxes based on return selected markers
		document.querySelectorAll(".segment-checkbox").forEach((checkbox) => {
			const timeIsInSelected = [...selected].some((m) => m.time === Number(checkbox.dataset.time))
			checkbox.checked = timeIsInSelected
		})
	})
	return checkbox
  }

  /**
   * Returns an edit marker button
   * @param {MarkerList} markerList - The parent marker list
   * @returns {HTMLButtonElement} - A button element
   */
  getEditMarkerButton(markerList) {
    const button = document.createElement("button")
    button.textContent = "Edit"
    button.addEventListener("click", () => {
      const modalHeader = document.createElement("h2")
      modalHeader.textContent = this.title

      // Append buttons to modal header and get edit form content
      modalHeader.appendChild(this.getEditTitleButton(modalHeader))
      modalHeader.appendChild(this.getDeleteButton(markerList))
      const modalContent = this.getEditMarkerForm()

      // Open modal
      this.activeModal = new Modal(modalHeader, modalContent, {
        useForm: true,
      })
    })
    return button
  }

  /**
   * Returns an edit title button for the marker
   * @param {HTMLHeadingElement} modalHeader - A heading element
   * @returns {HTMLButtonElement} - A button element
   */
  getEditTitleButton(modalHeader) {
    const button = document.createElement("button")
    button.classList.add("edit-asset-title")
    button.innerHTML = "&#9998"
    button.ariaLabel = "Edit title"
    button.addEventListener("click", () => {
      modalHeader.innerHTML = ""
      const titleInput = document.createElement("input")
      titleInput.type = "text"
      titleInput.value = this.getTitle()

      const saveButton = document.createElement("button")
      saveButton.textContent = "Save"
      saveButton.addEventListener("click", (e) => {
        e.preventDefault()
        this.setTitle(titleInput.value)
        this.song.bandbook.syncManager.updateMarkerTitle(this, titleInput.value)
        this.song.bandbook.refresh()

        // Update modal header
        modalHeader.textContent = this.title
        modalHeader.appendChild(this.getEditTitleButton(modalHeader))
        modalHeader.appendChild(this.getDeleteButton())
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
  getEditMarkerForm() {
    const hiddenInputChange = (e) => {
      const time = e.target.value
      this.setTime(time)
      this.song.bandbook.refresh()
    }

    const div = document.createElement("div")
    div.classList.add("edit-asset")

    // time input
    const timeInput = document.createElement("input")
    timeInput.type = "number"
    timeInput.step = "1"
    timeInput.value = Math.floor(this.time)
    timeInput.hidden = true
    timeInput.addEventListener("change", hiddenInputChange)
    div.appendChild(timeInput)

    // time proxy
    const timeProxyWrapper = document.createElement("div")
    timeProxyWrapper.classList.add("time-proxy-wrapper")
    const timeProxy = document.createElement("input")
    timeProxy.type = "text"
    // Smart HH:MM:SS format
    timeProxy.pattern = "^(?:(?:1[0-1]|[1-9]):)?(?:[0-5][0-9]:)?[0-5]?[0-9]$|^[0-9]+$"
    timeProxy.value = this.getFormattedTime()
    timeProxy.addEventListener("change", () => {
      const previousTime = this.getFormattedTime()

      // Validate
      if (!timeProxy.value.match(timeProxy.pattern)) {
        const error = new Notification(
          "Time must be in valid format: SS, MM:SS, or HH:MM:SS",
          "error",
          true,
          5000,
          true
        )
        timeProxyWrapper.insertAdjacentElement("afterend", error.element)
        timeProxy.value = previousTime
        return
      }

      const time = formattedTimeToSeconds(timeProxy.value)

      if (time < 0 || time > this.song.getDuration()) {
        const error = new Notification("That is not a valid time for this song", "error", true, 5000, true)
        timeProxyWrapper.insertAdjacentElement("afterend", error.element)
        timeProxy.value = previousTime
        return
      }

      hiddenInputChange({ target: { value: time } })
      timeProxy.value = secondsToFormattedTime(time)
    })

    const upOneSecond = document.createElement("button")
    upOneSecond.innerHTML = "&#9650"
    upOneSecond.addEventListener("click", (e) => {
      e.preventDefault()
      const time = formattedTimeToSeconds(timeProxy.value) + 1
      hiddenInputChange({ target: { value: time } })
      timeProxy.value = secondsToFormattedTime(time)
    })
    const downOneSecond = document.createElement("button")
    downOneSecond.innerHTML = "&#9660"
    downOneSecond.addEventListener("click", (e) => {
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
    const notesLabel = document.createElement("label")
    notesLabel.htmlFor = "marker-notes"
    const notesSpan = document.createElement("span")
    notesSpan.textContent = "Notes"
    const notesInput = document.createElement("textarea")
    notesInput.value = this.getNotes()
    notesInput.id = "marker-notes"
    notesInput.name = "marker-notes"
    notesInput.rows = 4
    notesInput.addEventListener("change", () => {
      this.setNotes(notesInput.value)
    })
    notesLabel.appendChild(notesSpan)
    notesLabel.appendChild(notesInput)

    div.appendChild(notesLabel)

    return div
  }

  /**
   * Returns a delete button for the marker
   * @param {MarkerList} markerList - The parent marker list
   * @returns {HTMLButtonElement} - A button element
   */
  getDeleteButton(markerList) {
    const deleteButton = document.createElement("button")
    deleteButton.textContent = "Delete"
    deleteButton.addEventListener("click", () => {
      if (confirm(`Are you sure you want to delete ${this.title}?`)) {
        markerList.removeMarker(this)
        this.song.bandbook.syncManager.deleteMarker(this)
        this.song.bandbook.refresh()
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
      } else {
        return
      }
    })
    return deleteButton
  }

  /**
   * Returns a button for the marker to skip to that time
   * @returns {HTMLButtonElement} - A button element
   */
  getButton() {
    const button = document.createElement("button")
    button.textContent = this.getFormattedTime()
    button.addEventListener("click", () => {
      const audioEl = this.song.player.getAudioElement()
      audioEl.currentTime = this.time
      audioEl.play()
    })
    return button
  }

  /**
   * Returns an input for the marker to set the title
   * @returns {HTMLInputElement} - An input element
   */
  getInput() {
    const input = document.createElement("input")
    input.type = "text"
    input.value = this.getTitle()
    input.addEventListener("input", () => {
      this.setTitle(input.value)
    })
    return input
  }

  /**
   * Returns the data of the marker
   * @returns {MarkerData} - The data of the marker for serialization
   */
  getData() {
    return {
      id: this.id,
      time: this.time,
      notes: this.notes,
      title: this.title,
    }
  }
}
