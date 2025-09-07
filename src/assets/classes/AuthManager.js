import { BandBook } from "./BandBook.js"
import { Notification } from "./Notification.js"
import { AUTH_API_BASE } from "../../secrets.js"
import { Modal } from "./Modal.js"

export class AuthManager {
	/**
	 * The BandBook instance
	 * @type {BandBook}
	*/
	bandbook = null

	/**
	 * The constructor for the AuthManager class
	 * @param {BandBook} bandbook - The BandBook instance
	 */
	constructor(bandbook) {
		this.bandbook = bandbook

		this.isLoggedIn = this.attemptRefresh()
		this.user = null
		this.authButton = null

		this.init()
	}

	init() {
		this.authButton = this.getAuthButton()
	}

	attemptRefresh() {
		// If the user does not have a "refresh" cookie return false
		if (!document.cookie.split("; ").find(row => row.startsWith("refresh="))) return false

		// Simulate an API call to check if the user is logged in
		fetch(`${AUTH_API_BASE}/refresh`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include"
		}).then((response) => {
			if (!response.ok) throw new Error("Failed to refresh token")
			else return true
		}).catch(() => {
			return false
		})
	}

	getAuthButton() {
		if (this.authButton) return this.authButton

		const button = document.createElement("button")
		button.classList.add("bb-button", "bb-nav-button")
		button.innerHTML = this.isLoggedIn ? "Logout" : "Login"
		button.addEventListener("click", () => this.isLoggedIn ? this.logout() : this.login())
		return button
	}

	login() {
		const titleEl = document.createElement("h2")
		titleEl.innerText = "Login"
		
		const content = document.createElement("div")
		content.classList.add("bb-login-modal")

		// Email input
		const emailLabel = document.createElement("label")
		emailLabel.setAttribute("for", "bb-login-email")

		const emailSpan = document.createElement("span")
		emailSpan.innerText = "Email"
		emailLabel.appendChild(emailSpan)

		const emailInput = document.createElement("input")
		emailInput.setAttribute("type", "text")
		emailInput.setAttribute("autocomplete", "email")
		emailInput.setAttribute("id", "bb-login-email")
		emailInput.setAttribute("name", "email")
		emailInput.setAttribute("required", "true")

		emailLabel.appendChild(emailInput)
		content.appendChild(emailLabel)

		// Password input
		const passwordLabel = document.createElement("label")
		passwordLabel.setAttribute("for", "bb-login-password")

		const passwordSpan = document.createElement("span")
		passwordSpan.innerText = "Password"
		passwordLabel.appendChild(passwordSpan)

		const passwordInput = document.createElement("input")
		passwordInput.setAttribute("type", "password")
		passwordInput.setAttribute("autocomplete", "current-password")
		passwordInput.setAttribute("id", "bb-login-password")
		passwordInput.setAttribute("name", "password")
		passwordInput.setAttribute("required", "true")

		passwordLabel.appendChild(passwordInput)
		content.appendChild(passwordLabel)

		// Submit button
		const submitButton = document.createElement("button")
		submitButton.setAttribute("type", "submit")
		submitButton.classList.add("bb-button", "bb-submit-button")
		submitButton.innerText = "Login"

		// Error message
		const errorMessage = document.createElement("p")
		errorMessage.classList.add("bb-error-message")
		content.appendChild(errorMessage)
		content.appendChild(submitButton)
		
		const loginModal = new Modal(titleEl, content, {useForm: true})

		submitButton.addEventListener("click", async (e) => {
			e.preventDefault()
			submitButton.disabled = true
			errorMessage.innerText = ""
			
			const email = emailInput.value.trim()
			const password = passwordInput.value

			if (!email || !password) {
				errorMessage.innerText = "Please fill in all fields"
				submitButton.disabled = false
				return
			}

			fetch(`${AUTH_API_BASE}/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ email, password }),
				credentials: "include"
			}).then(async (response) => {
				const body = await response.text();
				return [response.ok, body];
			}).then(([ok, body]) => {
				if (!ok) {
					throw new Error(body || "Login failed");
				} else {
					this.isLoggedIn = true;
					this.updateAuthButton();
					loginModal.remove();
					new Notification("Successfully Logged In", "success");
				}
			}).catch((error) => {
				errorMessage.innerText = `Login failed: ${error.message}`;
			}).finally(() => {
				submitButton.disabled = false;
			});

		})
		emailInput.focus()
	}

	logout() {
		fetch(`${AUTH_API_BASE}/logout`, {
			method: "POST",
			credentials: "include"
		}).finally(() => {
			this.isLoggedIn = false
			this.user = null
			this.updateAuthButton()

			new Notification("Successfully Logged Out", "success")
		})
	}

	updateAuthButton() {
		if (!this.authButton) return
		this.authButton.innerHTML = this.isLoggedIn ? "Logout" : "Login"
	}
}