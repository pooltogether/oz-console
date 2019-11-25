#!/usr/bin/env node
const program = require('commander')
const chalk = require('chalk')
const repl = require('repl')
const stubber = require('async-repl/stubber')
const fs = require('fs')
const path = require('path')
const vm = require('vm');
const createRequire = require('./createRequire')
const buildContext = require('./buildContext')

program
  .description(`\
Provides an Ethers.js based console to interact with your OpenZeppelin SDK project.  Supports await syntax.  Includes global variables:
  
  artifacts: Every project contract discovered, including ProxyAdmin
  interfaces: An Ethers interface for each artifact discovered
  contracts: An Ethers contract for each *deployed* artifact.  Includes ProxyAdmin.
  provider: an ethers provider
  ethers: the ethers lib`)
  .option('-n, --network <network name or JSON RPC URL>', 'selects network via ethers.getDefaultProvider(network) or uses the network as a JSON RPC URLs such as http://localhost:8545', 'mainnet')
  .option('-c, --networkConfig <oz network config path>', 'set the network config path.  Defaults to the config corresponding to the network.')
  .option('-p, --projectConfig <oz project config path>', 'sets the project config path', './.openzeppelin/project.json')
  .option('-d, --directory <compiled artifacts directory>', 'sets the directory containing the compiled artifacts.', './build/contracts')
  .option('-v, --verbose', 'enable verbose logging.  useful for diagnosing errors', () => true)
  .option('-e, --exec <js file path>', 'executes a javascript file instead of running a REPL')
  .option('-m, --mnemonic <hd_wallet_mnemonic>', 'use the mnemonic as the signatory')
  .helpOption('-h, --help', 'shows this help')

program.parse(process.argv)

let context
try {
  context = buildContext(program)
} catch (e) {
  console.error(chalk.red(e.message))
  program.help()
  process.exit(1)
}

if (program.exec) {
  
  const Module = require("module");
  const file = path.join('.', program.exec)
  const data = fs.readFileSync(file);

  const normalizedFile = path.resolve(program.exec)
  const dir = path.dirname(normalizedFile)

  const scriptContext = vm.createContext({
    Buffer: Buffer,
    __dirname: path.dirname(file),
    __filename: file,
    clearImmediate: clearImmediate,
    clearInterval: clearInterval,
    clearTimeout: clearTimeout,
    console: console,
    exports: exports,
    ...context,
    module: new Module(file),
    process: process,
    require: createRequire(dir)
  })
  const script = vm.createScript(data, file);
  script.runInNewContext(scriptContext);

} else {

  const instance = repl.start({
    useGlobal: true,
    prompt: 'oz-console> '
  })
  
  Object.keys(context).forEach(key => {
    global[key] = context[key]
  })
  
  stubber(instance);
}
