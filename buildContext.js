module.exports = function buildContext({
  projectConfig,
  network,
  networkConfig,
  directory,
  verbose
}) {
  const context = {}

  context.logp = function (promise) {
    promise.then(console.log).catch(console.error)
  }
  
  context.ethers = require('ethers')
  
  const ProxyAdminJson = require('@openzeppelin/upgrades/build/contracts/ProxyAdmin.json')
  
  function loadProjectConfig() {
    if (verbose) console.log(chalk.green(`Using project file ${projectConfig}`))
    try {
      return JSON.parse(fs.readFileSync(projectConfig))
    } catch (e) {
      throw new Error(`Could not load project file: ${projectConfig}`)
    }
  }
  
  context.projectConfig = loadProjectConfig()
  
  let knownNetwork = ethers.utils.getNetwork(network);
  if (!knownNetwork) {
    context.provider = new ethers.providers.JsonRpcProvider(network)
  } else {
    context.provider = new ethers.getDefaultProvider(network)
  }
  
  function loadNetworkConfig() {
    let networkConfigPath
    if (networkConfig) {
      networkConfigPath = networkConfig
    } else if (!knownNetwork) {
      const matches = glob.sync('./.openzeppelin/dev-*.json')
      if (matches.length) {
        networkConfigPath = matches[matches.length - 1]
      } else {
        throw new Error('Cannot find dev-* network config file for custom network')
      }
    } else {
      networkConfigPath = `./.openzeppelin/${network}.json`
    }
  
    if (verbose) console.log(chalk.green(`Using network config ${networkConfigPath}...`))
    try {
      return JSON.parse(fs.readFileSync(networkConfigPath))
    } catch (e) {
      throw new Error(`Could not load network config file: ${networkConfigPath}`)
    }
  }
  
  context.networkConfig = loadNetworkConfig()
  context.loadNetworkConfig = loadNetworkConfig
  
  context.artifacts = {
    ProxyAdmin: {
      abi: ProxyAdminJson.abi,
      address: context.networkConfig.proxyAdmin.address
    }
  }
  
  context.interfaces = {
    ProxyAdmin: new ethers.utils.Interface(context.artifacts.ProxyAdmin.abi)
  }
  
  context.contracts = {
    ProxyAdmin: new ethers.Contract(context.artifacts.ProxyAdmin.address, context.artifacts.ProxyAdmin.abi, provider)
  }
  
  const artifactsDir = directory
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
  
  Object.keys(projectConfig.contracts).forEach(proxyName => {
    const contractName = projectConfig.contracts[proxyName]
    if (verbose) console.log(chalk.green(`Setting up proxy ${proxyName} for contract ${contractName}`))
    const artifact = artifacts[contractName]
    const proxyPath = `${context.projectConfig.name}/${proxyName}`
    const proxies = context.networkConfig.proxies[proxyPath]
    const lastProxy = proxies[proxies.length - 1]
    context.contracts[proxyName] = new ethers.Contract(lastProxy.address, artifact.abi, provider)
  })
  
  return context
}


