const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const ethers = require('ethers')

const ProjectFile = require('@openzeppelin/cli/lib/models/files/ProjectFile').default
const NetworkFile = require('@openzeppelin/cli/lib/models/files/NetworkFile').default
const ConfigManager = require("@openzeppelin/cli/lib/models/config/ConfigManager").default

module.exports = async function buildContext({
  projectConfig,
  network,
  verbose,
  address
}) {
  const context = {}

  context.logp = function (promise) {
    promise.then(console.log).catch(console.error)
  }
  
  context.ethers = ethers
  
  const ProxyAdminJson = require('@openzeppelin/upgrades/build/contracts/ProxyAdmin.json')
  
  const projectFile = new ProjectFile(projectConfig || '.openzeppelin/project.json')
  context.projectFile = projectFile

  context.networkConfig = await ConfigManager.initNetworkConfiguration({
    network
  });

  const { provider } = await ConfigManager.config.loadNetworkConfig(network)

  if (typeof provider === 'string') {
    context.provider = new ethers.providers.JsonRpcProvider(provider)
  } else {
    context.provider = new ethers.providers.Web3Provider(provider)
  }

  context.signer = context.provider.getSigner(address || context.networkConfig.txParams.from)

  function loadNetworkFile() {
    let networkFile = new NetworkFile(projectFile, context.networkConfig.network)
    if (verbose) console.log(chalk.green(`Using network config ${networkFile.filePath}...`))
    return networkFile
  }
  
  context.networkFile = loadNetworkFile()
  context.loadNetworkFile = loadNetworkFile
  
  context.artifacts = {
    ProxyAdmin: {
      abi: ProxyAdminJson.abi
    }
  }
  
  context.interfaces = {
    ProxyAdmin: new ethers.utils.Interface(context.artifacts.ProxyAdmin.abi)
  }

  if (context.networkFile && context.networkFile.proxyAdmin && context.networkFile.proxyAdmin.address) {
    context.contracts = {
      ProxyAdmin: new ethers.Contract(context.networkFile.proxyAdmin.address, context.artifacts.ProxyAdmin.abi, context.signer || context.provider)
    }
  } else {
    context.contracts = {}
  }
  
  const compilerOptions = projectFile.compilerOptions

  const artifactsDir = compilerOptions.outputDir
  const artifactNames = fs.readdirSync(artifactsDir)
  artifactNames.map(artifactName => {
    const artifactPath = path.join(artifactsDir, artifactName)
    if (verbose) console.log(`Reading artifact ${artifactPath}...`)
    try {
      const artifact = JSON.parse(fs.readFileSync(artifactPath))
      context.artifacts[artifact.contractName] = {
        abi: artifact.abi,
        bytecode: artifact.bytecode
      }
      context.interfaces[artifact.contractName] = new ethers.utils.Interface(artifact.abi)
    } catch (e) {
      console.warn(chalk.red(`Could not load ${artifactPath}: ${e.message}`), e)
    }
  })

  Object.keys(context.projectFile.contracts).forEach(contractName => {
    if (verbose) console.log(chalk.green(`Setting up proxy for contract ${contractName}`))
    const artifact = context.artifacts[contractName]
    const fullName = `${context.projectFile.name}/${contractName}`
    const proxies = context.networkFile.data.proxies[fullName]
    const proxy = (proxies && proxies.length) ? proxies[proxies.length - 1] : null
    if (proxy) {
      if (verbose) { console.log(chalk.dim(`Found proxy at ${proxy.address} for contract ${fullName}`))}
      context.contracts[contractName] = new ethers.Contract(proxy.address, artifact.abi, context.signer || context.provider)
    }
  })

  return context
}
