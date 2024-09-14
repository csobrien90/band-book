# Band Book

*A sandbox of tools for ear musicians*

## Setup

- `git clone`
- open `src/index.html` in your browser

## Usage and Features

- upload, delete, and edit metadata of audio files
- play, pause, and seek audio
- create, title, and delete formal markers
- formal markers link to audio time
- import and export data to JSON
- all data is stored locally

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

### Contributors

- (Chad O'Brien)[http://github.com/csobrien90]

## Deployment

```bash
aws s3 sync ./src s3://bandbook --acl public-read
aws s3 cp favicon.ico s3://bandbook --acl public-read
```
