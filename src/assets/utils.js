/**
 * Returns a readable time string given a number of seconds
 * @param {number} seconds 
 * @returns {string} formattedTime (HH:MM:SS)
 */
export const secondsToFormattedTime = (seconds) => {
	seconds = Math.floor(seconds)

	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const remainingSeconds = seconds % 60

	let timeArray = [ hours, minutes, remainingSeconds ]
		.map((unit) => String(unit).padStart(2, '0'))
		.filter((unit, index) => unit !== '00' || index > 0)
	
	// The first unit should not be zero-padded
	timeArray[0] = +timeArray[0].toString()

	return timeArray.join(':')
}

/**
 * Returns the number of seconds given a formatted time string
 * @param {string} formattedTime
 * @returns {number} seconds
*/
export const formattedTimeToSeconds = (formattedTime) => {
	const timeArray = formattedTime.split(':').map((unit) => parseInt(unit))
	switch (timeArray.length) {
		case 1:
			return timeArray[0]
		case 2:
			return timeArray[0] * 60 + timeArray[1]
		case 3:
			return timeArray[0] * 3600 + timeArray[1] * 60 + timeArray[2]
		default:
			return 0
	}
}

/**
 * Converts an AudioBuffer to a Blob
 * @param {AudioBuffer} audioBuffer
 * @param {string} type
 * @returns {Blob}
 */
export const audioBufferToBlob = (audioBuffer, type) => {
	const numberOfChannels = audioBuffer.numberOfChannels;
	const sampleRate = audioBuffer.sampleRate;
	const length = audioBuffer.length;
	const interleaved = new Float32Array(length * numberOfChannels);
	for (let channel = 0; channel < numberOfChannels; channel++) {
		const channelData = audioBuffer.getChannelData(channel);
		for (let i = 0; i < length; i++) {
			interleaved[i * numberOfChannels + channel] = channelData[i];
		}
	}
	const dataView = encodeWAV(interleaved, numberOfChannels, sampleRate);
	const blob = new Blob([dataView], { type: type });
	return blob;
}


const encodeWAV = (samples, channels, sampleRate) => {
	const buffer = new ArrayBuffer(44 + samples.length * 2);
	const view = new DataView(buffer);
	writeString(view, 0, "RIFF");
	view.setUint32(4, 36 + samples.length * 2, true);
	writeString(view, 8, "WAVE");
	writeString(view, 12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, channels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * channels * 2, true);
	view.setUint16(32, channels * 2, true);
	view.setUint16(34, 16, true);
	writeString(view, 36, "data");
	view.setUint32(40, samples.length * 2, true);
	floatTo16BitPCM(view, 44, samples);
	return view;
}

const floatTo16BitPCM = (output, offset, input) => {
	for (let i = 0; i < input.length; i++, offset += 2) {
		const s = Math.max(-1, Math.min(1, input[i]));
		output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
	}
}

const writeString = (view, offset, string) => {
	for (let i = 0; i < string.length; i++) {
	  	view.setUint8(offset + i, string.charCodeAt(i));
	}
}