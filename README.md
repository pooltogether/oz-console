# OpenZeppelin Ethers Console

Provides an Ethers.js based console to interact with your contracts.

Fairly simple at the moment; does not use the OpenZeppelin SDK network configuration (yet!).

## Installation

```
npm install oz-console
```

## Usage

`oz-console` can be used from the command line or programmatically.

### CLI

```
Usage: oz-console [options]

Provides an Ethers.js based console to interact with your OpenZeppelin SDK project.  Supports await syntax.  Includes global variables:
  
  artifacts: Every project contract discovered, including ProxyAdmin
  interfaces: An Ethers interface for each artifact discovered
  contracts: An Ethers contract for each *deployed* artifact.  Includes ProxyAdmin.
  provider: an ethers provider
  ethers: the ethers lib

Options:
  -n, --network <network name>                  selects the openzeppelin network to use (default: "mainnet")
  -p, --projectConfig <oz project config path>  sets the project config path (default: ".openzeppelin/project.json")
  -v, --verbose                                 enable verbose logging.  useful for diagnosing errors
  -e, --exec <js file path>                     executes a javascript file instead of running a REPL
  -a, --address <from address>                  use the address as the signer
  -h, --help                                    shows this help

```

### JS

Use the Ethers.js setup programmatically

```javascript
const { buildContext } = require('oz-console')

const context = buildContext({
  network: 'mainnet'
})

// Ethers
context.ethers
// OpenZeppelin CLI ProjectFile object
context.projectFile
// Artifact JSON blobs
context.artifacts
// Ethers Interfaces for each artifact
context.interfaces
// Ethers Contract for each deployed contract
context.contracts
// Ethers provider
context.provider
// Ethers signer for the OZ 'from' address
context.signer
// OpenZeppelin CLI NetworkFile object
context.networkFile
// OpenZeppelin CLi NetworkConfig object
context.networkConfig
```