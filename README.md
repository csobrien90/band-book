# Band Book

*A sandbox of tools for ear musicians*

## Setup

- `git clone`
- open `src/index.html` in your browser

## Usage and Features

Full user guide can found in [this repositorys wiki](https://github.com/csobrien90/band-book/wiki/User-Guide)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

### Contributors

- [Chad O'Brien](http://github.com/csobrien90)

## Deployment

```bash
aws s3 sync ./src s3://bandbook --acl public-read
aws s3 cp favicon.ico s3://bandbook --acl public-read
```
