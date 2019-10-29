# OpenZeppelin Ethers

Provides an Ethers.js console to interact with your contracts.

## Usage

```
Usage: oze [options] [command]

Provides a convenient console to interact with your deployed OpenZeppelin SDK contracts. Run this command in your project root.

Options:
  -n, --network <network>  selects network via ethers.getDefaultProvider(network).  "local" will be interpreted as http://localhost:8545 (default: "mainnet")
  -h, --help               shows this help

Commands:
  console                  Launches a node repl
  
    Includes global variables:
  
    artifacts: Every project contract discovered, including ProxyAdmin
    interfaces: An Ethers interface for each artifact discovered
    contracts: An Ethers contract for each *deployed* artifact.  Includes ProxyAdmin.
    provider: an ethers provider
    ethers: the ethers lib
```