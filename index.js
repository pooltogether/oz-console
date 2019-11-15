#!/usr/bin/env node
const program = require('commander')
const chalk = require('chalk')
const repl = require('repl')
const stubber = require('async-repl/stubber')
const fs = require('fs')
const path = require('path')
const glob = require('glob')
const vm = require('vm');
const createRequire = require('./createRequire')

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
  .helpOption('-h, --help', 'shows this help')

program.parse(process.argv)

global.logp = function (promise) {
  promise.then(console.log).catch(console.error)
}

global.ethers = require('ethers')

const ProxyAdminJson = require('@openzeppelin/upgrades/build/contracts/ProxyAdmin.json')

if (program.verbose) console.log(chalk.green(`Using project file ${program.projectConfig}`))

try {
  global.projectConfig = JSON.parse(fs.readFileSync(program.projectConfig))
} catch (e) {
  console.error(chalk.red(`Could not load project file: ${program.projectConfig}`))
  program.help()
  process.exit(1)
}

let knownNetwork = ethers.utils.getNetwork(program.network);
if (!knownNetwork) {
  global.provider = new ethers.providers.JsonRpcProvider(program.network)
} else {
  global.provider = new ethers.getDefaultProvider(program.network)
}

let ozContractFile
if (program.networkConfig) {
  ozContractFile = program.networkConfig
} else if (!knownNetwork) {
  const matches = glob.sync('./.openzeppelin/dev-*.json')
  if (matches.length) {
    ozContractFile = matches[matches.length - 1]
  } else {
    console.error(chalk.red('Cannot find dev-* network config file for custom network'))
    program.help()
    process.exit(1)
  }
} else {
  ozContractFile = `./.openzeppelin/${program.network}.json`
}

if (program.verbose) console.log(chalk.green(`Using network config ${ozContractFile}...`))
try {
  global.networkConfig = JSON.parse(fs.readFileSync(ozContractFile))
} catch (e) {
  console.error(chalk.red(`Could not load network config file: ${ozContractFile}`))
  program.help()
  process.exit(1)
}

global.artifacts = {
  ProxyAdmin: {
    abi: ProxyAdminJson.abi,
    address: global.networkConfig.proxyAdmin.address
  }
}

global.interfaces = {
  ProxyAdmin: new ethers.utils.Interface(global.artifacts.ProxyAdmin.abi)
}

global.contracts = {
  ProxyAdmin: new ethers.Contract(global.artifacts.ProxyAdmin.address, global.artifacts.ProxyAdmin.abi, provider)
}

const artifactsDir = program.directory
const artifactNames = fs.readdirSync(artifactsDir)
artifactNames.map(artifactName => {
  const artifactPath = path.join(artifactsDir, artifactName)
  if (program.verbose) console.log(`Reading artifact ${artifactPath}...`)
  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath))
    global.artifacts[artifact.contractName] = {
      abi: artifact.abi,
      bytecode: artifact.bytecode
    }

    const proxyName = `${global.projectConfig.name}/${artifact.contractName}`

    if (global.networkConfig.proxies[proxyName]) {
      const proxies = global.networkConfig.proxies[proxyName]
      const lastProxy = proxies[proxies.length - 1]
      global.artifacts[artifact.contractName].address = lastProxy.address
      global.contracts[artifact.contractName] = new ethers.Contract(lastProxy.address, artifact.abi, provider)
      global.interfaces[artifact.contractName] = new ethers.utils.Interface(artifact.abi)
    }
  } catch (e) {
    console.warn(chalk.red(`Could not load ${artifactPath}: ${e.message}`), e)
  }
})

if (program.exec) {
  
  const Module = require("module");
  const file = path.join('.', program.exec)
  const data = fs.readFileSync(file);

  const normalizedFile = path.resolve(program.exec)
  const dir = path.dirname(normalizedFile)

  const context = vm.createContext({
    Buffer: Buffer,
    __dirname: path.dirname(file),
    __filename: file,
    clearImmediate: clearImmediate,
    clearInterval: clearInterval,
    clearTimeout: clearTimeout,
    console: console,
    exports: exports,
    ...global,
    module: new Module(file),
    process: process,
    require: createRequire(dir)
  })
  const script = vm.createScript(data, file);
  script.runInNewContext(context);

} else {

  const instance = repl.start({
    useGlobal: true,
    prompt: 'oz-console> '
  })    
  
  stubber(instance);
}
