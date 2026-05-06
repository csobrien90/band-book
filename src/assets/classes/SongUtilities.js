import { Song } from './Song.js'

/**
 * Represents a song's utilities
*/
export class SongUtilities {
    /**
     * @param {Song} song - The song for which to provide utilities
     * @default null
    */
    song = null

    /**
     * @constructor
     * @param {Song} song - An instance of the Song class.
    */
    constructor(song) {
        // Assign properties
        this.song = song
    }

    /**
     * Creates a button that, when clicked, prints a summary of the song.
     * @returns {HTMLButtonElement} - The button element.
    */
    getPrintSongSummaryButton() {
        const button = document.createElement('button')
        button.textContent = 'Print Song Summary'
        button.addEventListener('click', () => this.printSongSummary())
        return button
    }

    /**
     * Opens a new window and prints a summary of the song, including its title, key, composer, description, and markers.
    */
    printSongSummary() {
        // Open a new window for the summary
        const win = window.open('', '_blank')

        if (!win) {
            alert('Unable to open summary window. Please allow pop-ups for this site.');
            return;
        }

        const doc = win.document
        doc.title = `${this.song.title} - Summary`

        // Add styles
        const style = doc.createElement('style')
        style.textContent = `
            body {
                font-family: Arial, sans-serif;
            }

            ul {
                list-style-type: none;
                padding: 0;
            }
        `
        doc.head.appendChild(style)

        // Header
        const header = doc.createElement('header')
        const title = doc.createElement('h1')
        title.textContent = `${this.song.title} (${this.song.key})`
        const artist = doc.createElement('p')
        artist.textContent = `Artist: ${this.song.composer}`
        const description = doc.createElement('p')
        description.textContent = this.song.description

        header.appendChild(title)
        header.appendChild(artist)
        header.appendChild(description)
        doc.body.appendChild(header)

        // Markers
        if (this.song.markerList.markers.length > 0) {
            const markerList = doc.createElement('ul')

            for (const marker of this.song.markerList.markers) {
                const markerItem = doc.createElement('li')
                const markerTitle = doc.createElement('h2')
                markerTitle.textContent = marker.title
                const markerDescription = doc.createElement('p')
                markerDescription.textContent = marker.notes

                markerItem.appendChild(markerTitle)
                markerItem.appendChild(markerDescription)
                markerList.appendChild(markerItem)
            }

            doc.body.appendChild(markerList)
        }

        // Wait for render, then print
        setTimeout(() => {
            win.focus()
            win.print()
            win.close()
        }, 250)
    }

}