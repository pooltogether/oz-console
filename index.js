#!/usr/bin/env node
const program = require('commander')
const chalk = require('chalk')
const repl = require('repl')
const stubber = require('async-repl/stubber');
const fs = require('fs')
const path = require('path')
const glob = require('glob')



program
  .option('-n, --network <network>', 'selects network.  "localhost" will be interpreted as http://localhost:8545', 'mainnet')
  .helpOption('-h, --help', 'shows this help')

program
  .command('console')
  .description(
    `Launches a node repl

  Includes global variables:

  artifacts: Every project contract discovered, including ProxyAdmin
  interfaces: An Ethers interface for each artifact discovered
  provider: an ethers provider
  ethers: the ethers lib
`
  )
  .action(function (env, options) {
    
    global.logp = function (promise) {
      promise.then(console.log).catch(console.error)
    }
    
    global.ethers = require('ethers')
    
    const ProxyAdminJson = require('@openzeppelin/upgrades/build/contracts/ProxyAdmin.json')
    
    let projectFile = JSON.parse(fs.readFileSync('./.openzeppelin/project.json'))

    let ozContractFile
    if (program.network === 'localhost') {
      global.provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')
      const matches = glob.sync('./openzeppelin/dev-*.json')
      if (matches.length) {
        ozContractFile = matches[matches.length - 1]
      } else {
        console.error(chalk.red('Cannot find contract file for localhost'))
      }
    } else {
      global.provider = new ethers.getDefaultProvider(program.network)
      ozContractFile = `./.openzeppelin/${program.network}.json`
    }
    
    console.log(chalk.green(`Using ${ozContractFile}...`))
    let ozContracts = JSON.parse(fs.readFileSync(ozContractFile))

    global.artifacts = {
      ProxyAdmin: {
        abi: ProxyAdminJson.abi,
        address: ozContracts.proxyAdmin.address
      }
    }

    global.interfaces = {}

    global.ProxyAdmin = new ethers.Contract(global.artifacts.ProxyAdmin.address, global.artifacts.ProxyAdmin.abi, provider)

    const artifactsDir = './build/contracts'
    const artifactNames = fs.readdirSync(artifactsDir)
    artifactNames.map(artifactName => {
      const artifact = JSON.parse(fs.readFileSync(path.join(artifactsDir, artifactName)))
      global.artifacts[artifact.contractName] = {
        abi: artifact.abi,
        bytecode: artifact.bytecode
      }

      const proxyName = `${projectFile.name}/${artifact.contractName}`

      if (ozContracts.proxies[proxyName]) {
        const proxies = ozContracts.proxies[proxyName]
        const lastProxy = proxies[proxies.length - 1]
        global.artifacts[artifact.contractName].address = lastProxy.address
        global[artifact.contractName] = new ethers.Contract(lastProxy.address, artifact.abi, provider)
        global.interfaces[artifact.contractName] = new ethers.utils.Interface(artifact.abi)
      }
    })
    
    const instance = repl.start({
      useGlobal: true,
      prompt: 'oze> '
    })    

    stubber(instance);
  })

// when bad command
program
  .on('command:*', function(){
    program.help()
  });

program.parse(process.argv)

// error on unknown commands
var NO_COMMAND_SPECIFIED = program.args.length === 0;

if (NO_COMMAND_SPECIFIED) {
  program.help()
}
