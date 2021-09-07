# Server

This directory contains the server part of audapolis.
The server provides functionality that was either to annoying to implement in javascript or deemed too costly to perform only in the app.

Currently the main functionality it will provide is transcription:
With `vosk`, a great python-library for transcribing audio exists.
However running the speech-to-text on a normal computer takes a lot of time.
This can be speed up a by running the task on a machine with more computing power.
It might also be possible to speed it up by running it on a GPU.

Therefore we decided to create a small server that provides transcription.
This can either be run on the same host as the app or hosted somewhere else.

## Installation & Usage

### Docker

We provide a Dockerfile for easy setup.

To build the container, simply run
```sh
docker build --tag audapolis-server .
```

After that you can start the container using
```sh
docker run -p 80:80 audapolis-server
```

### Manually

We use [poetry](https://python-poetry.org/) for dependency management.
Either install poetry using your system package manager or by running

```sh
pip install poetry
```

After that you can install the needed dependencies by running

```sh
poetry install
```

After installing the dependencies you can start the server by running

```sh
uvicorn main:app --reload
```