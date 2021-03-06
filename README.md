# mangarack

*MangaRack* is a console line application capable of downloading manga series from popular manga scanlation sites. Each downloaded chapter is stored on your computer as a comic book archive and contains additional embedded meta information. The embedded meta information is compatible with the popular *ComicRack* application suite.

## Prerequisites

* NodeJS >= `6.x` (http://nodejs.org/)
* NPM >= `3.x` (https://www.npmjs.org/)
* GraphicsMagick >= `1.3.x` (http://www.graphicsmagick.org/)

## Supported Sites

* [Batoto](http://bato.to/) support is intended as an incomplete high-quality provider.
* [KissManga](http://kissmanga.com/) support is intended as a back-up provider.
* [MangaFox](http://mangafox.me/) support is intended as a complete medium-quality provider.

## Installation

Use the applicable instructions to install. Is your operating system not listed? Please ask or contribute!

### Debian (Mint, Ubuntu, etc)

1. Run in *Terminal*: `curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -`
2. Run in *Terminal*: `sudo apt-get install nodejs graphicsmagick`
3. Run in *Terminal*: `sudo npm install -g mangarack`

### Mac OS X

1. Install *Homebrew* following the instructions at http://brew.sh/
2. Run in *Terminal*: `brew install node graphicsmagick`
3. Run in *Terminal*: `npm install -g mangarack`

### Windows

1. Install *NodeJS* following the instructions at http://nodejs.org/ (and choose *latest*)
2. Install *GraphicsMagick* following the instructions at http://www.graphicsmagick.org/
3. Run in *Command Prompt*: `npm install -g mangarack`

## Instructions

Use the applicable instructions for the interface of your choice (currently limited to command-line).

### Command-line Interface (`mangarack-cli`)

The [command-line interface](http://en.wikipedia.org/wiki/Command-line_interface) does not have a graphical component and is ideal for automation purposes and headless machines. The interface can run using a sequence of series addresses (the site address containing the chapter listing), or using the [standard input](https://en.wikipedia.org/wiki/Standard_streams#Standard_input_.28stdin.29).

#### Examples

Download *Futari dake* from *MangaFox*:

    mangarack-cli http://mangafox.me/manga/futari_dake/

Download *Futari dake* from *MangaFox* and disable image normalization:

    mangarack-cli --runnable.cli.disableNormalize 1 http://mangafox.me/manga/futari_dake/

Download the series listed in the `MangaRack.txt` file:

    mangarack-cli < MangaRack.txt

#### Switches

* `--component.core.batoto.username <username>` provides a username for *Batoto*.
* `--component.core.batoto.password <password>` provides a password for *Batoto*.
* `--runnable.cli.disableMangafoxHeuristicCrop 1` disables *MangaFox* image cropping.
* `--runnable.cli.disableNormalize 1` disables image normalization.
* `--runnable.cli.metaUnknownVolume 99` overrides unknown volumes in *ComicInfo.xml* ([See #44](https://github.com/Deathspike/mangarack/issues/44)).

## Developers

MangaRack is developed in `TypeScript`, a typed superset of `JavaScript`, and is designed to run in any *JavaScript*-enabled platform, including but not limited to *cordova*, *electron*, and *nodejs*. All code has been split into modules that have been tagged with a specific label:

* `component` modules are environment agnostic and define required services.
* `cordova` modules implement `component`-required services for *cordova*.
* `node` modules implement `component`-required services for *nodejs*.
* `runnable` modules are intended to be executable entry points.

Each module has its own package definition, but none of the modules specify inter-module dependencies. This means that modules do not explicitly depend on each other through their package definition, even thought they might need another module to function properly. If you wish to install a module through `npm`:

1. Install the preferred `component` module and its `component` dependencies.
2. Install the preferred *environment* module and its *environment* dependencies.
3. Use the API (documented through definitions) to use `mangarack` functionality.

If you wish to contribute to this repository:

1. Clone this repository into a folder named `node_modules`.
2. Run `node .ezpz install` in the folder using *Command Prompt*/*Terminal*.
3. Open the folder with *[Visual Studio Code](https://code.visualstudio.com/)*.
4. Press `CTRL+SHIFT+B` to start the compiler. You can edit the code now and test your changes.
5. Press `F5` to start the debugger. You can enter series addresses into the terminal.

Please open an issue for further questions.
