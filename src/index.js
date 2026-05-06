import { BandBook } from './assets/classes/BandBook.js'

/**
 * Register the service worker for offline support.
 * This is intentionally non-blocking and does not prevent app initialization.
 */
function registerServiceWorker() {
	if (!('serviceWorker' in navigator)) return

	navigator.serviceWorker
		.register('pwa-worker.js')
		.then((registration) => {
			console.info('Service worker registered:', registration?.scope)
		})
		.catch((error) => {
			console.error('Service worker registration failed:', error)
		})
}

registerServiceWorker()

export { BandBook }