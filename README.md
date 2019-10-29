# OpenZeppelin Ethers

Provides an Ethers.js console to interact with your contracts.

## Usage

```
Usage: oze [options] [command]

Options:
  -n, --network <network>  selects network.  "localhost" will be interpreted as http://localhost:8545 (default: "mainnet")
  -h, --help               shows this help

Commands:
  console                  Launches a repl console
  
  Includes global variables:
  
  contracts: Every project contract discovered, including ProxyAdmin
  provider: an ethers provider
  ethers: the ethers lib
```