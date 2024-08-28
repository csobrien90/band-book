# Band Book

*A sandbox of tools for ear musicians*

## Setup

- `git clone`
- open `src/demo.html` in your browser

## Usage and Features

- upload, delete, and edit metadata of audio files
- play, pause, and seek audio
- create, title, and delete formal markers
- formal markers link to audio time
- import and export data to JSON
- all data is stored locally

## Contributing

- open or claim an issue
- fork and clone the repo
- create a branch
- make your changes
- submit a pull request

## Deployment

```bash
aws s3 sync ./src s3://bandbook --acl public-read
aws s3 cp favicon.ico s3://bandbook --acl public-read
```

## Release Notes

### 8/27/24 - v0.1.0

**Persist everything locally**

- sync/load to indexedDB ✅
- import/export to JSON ✅
- save only the changes for improved performance ✅

**Audio file management**

- upload ✅
- save ✅
- delete ✅
- local storage ✅
- rename ✅

**Player controls/features**

- loop ✅
- abstract player controls to Player class ✅

**UX/UI design**

- basic design (colors, fonts, primitive components, etc.) ✅
- basic layout (spacing, responsive, etc.) ✅

**Miscellaneous**

- build out README to include usage and contribution guidelines ✅
- modularize the code and make classes more reusable ✅
	- SyncManager ✅
	- Workspace ✅
	- MarkerList ✅
- Deployment to S3 ✅