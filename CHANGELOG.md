# Change Log

**All notable changes to this project will be documented in this file.** Note: This project is currently unreleased and under active development. Version 1.0.0 will be released when the project is feature complete and stable.


## 9/13/24 - v0.2.0

**UX/UI**

- Modal system
- Initial loading state
- Notification system
- Refactor prompts and alerts as modals and notifications

**Alpha Release Features**

- feedback form modal UI
- add license

**Sync Manager**

- refactor to use promises

**Workspace/Player Features**

- edit song metadata modal (title, key, tempo, time signature, composer, notes)
- custom player element
	- play/pause
	- tracking/seeking
	- forward/backward 10s
	- volume control
	- speed control
	- download

**DevOps**

- add comments and JSDocs
- refactor for better code organization
- Transfer project management to GitHub
	- make CHANGELOG.md
	- flesh out contribution instructions
	- make PR and Issue templates
	- convert v0.3.0 To Do into Projects and Issues
	- add `main` branch protection rules
	- prep repo for Hacktoberfest and tag issues
	- stub out actual docs in Wiki


## 8/27/24 - v0.1.0

**Persist everything locally**

- sync/load to indexedDB
- import/export to JSON
- save only the changes for improved performance

**Audio file management**

- upload
- save
- delete
- local storage
- rename

**Player controls/features**

- loop
- abstract player controls to Player class

**UX/UI design**

- basic design (colors, fonts, primitive components, etc.)
- basic layout (spacing, responsive, etc.)

**Miscellaneous**

- build out README to include usage and contribution guidelines
- modularize the code and make classes more reusable
	- SyncManager
	- Workspace
	- MarkerList
- Deployment to S3