import { BandBook } from './assets/classes/BandBook.js'

if ('serviceWorker' in navigator) {
   navigator.serviceWorker.register("pwa-worker.js");
}

export { BandBook }