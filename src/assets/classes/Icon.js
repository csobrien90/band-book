

export class Icon {
	constructor(name, width = 24, height = 24) {
		this.name = name;
		this.width = width;
		this.height = height;
	}

	getImg() {
		const img = document.createElement('img');
		img.src = `./assets/icons/${this.name}.svg`;
		img.width = this.width;
		img.height = this.height;
		img.alt = `${this.name} icon`;
		return img;
	}
}
