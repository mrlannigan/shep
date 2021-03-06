import AWS from './'
import merge from 'lodash.merge'

export function putFunction (config, ZipFile, envVars) {
  const lambda = new AWS.Lambda()

  validateConfig(config)

  const FunctionName = config.FunctionName
  const Publish = true
  const lambdaConfig = merge(config, { Environment: { Variables: envVars } })

  return lambda.getFunction({ FunctionName }).promise()
  .then(() => lambda.updateFunctionConfiguration(lambdaConfig).promise())
  .then(() => lambda.updateFunctionCode({ ZipFile, FunctionName, Publish }).promise())
  .catch({ code: 'ResourceNotFoundException' }, () => {
    const params = merge(config, { Publish, Code: { ZipFile } })
    return lambda.createFunction(params).promise()
  })
}

export function getAliasVersion ({ functionName, aliasName }) {
  const lambda = new AWS.Lambda()

  const params = {
    FunctionName: functionName,
    Name: aliasName
  }

  return lambda.getAlias(params).promise()
  .get('FunctionVersion')
}

export function setAlias ({ Version, FunctionName }, Name) {
  const lambda = new AWS.Lambda()

  let params = {
    FunctionName,
    Name
  }

  return lambda.getAlias(params).promise()
  .then(() => {
    params.FunctionVersion = Version
    return lambda.updateAlias(params).promise()
  })
  .catch({ code: 'ResourceNotFoundException' }, () => {
    params.FunctionVersion = Version
    return lambda.createAlias(params).promise()
  })
}

export function setPermission ({ name, region, env, apiId, accountId }) {
  const lambda = new AWS.Lambda()

  let params = {
    Action: 'lambda:InvokeFunction',
    Qualifier: env,
    FunctionName: name,
    Principal: 'apigateway.amazonaws.com',
    StatementId: `api-gateway-${apiId}`,
    SourceArn: `arn:aws:execute-api:${region}:${accountId}:${apiId}/*`
  }

  return lambda.addPermission(params).promise()
  .catch((err) => {
    // Swallow errors if permission already exists
    if (err.code !== 'ResourceConflictException') { throw err }
  })
}

function validateConfig (config) {
  if (!config.Role) {
    throw new Error('You need to specify a valid Role for your lambda functions. See the shep README for details.')
  }
}
