const cond = require('lodash/cond')
const coreModules = require('resolve/lib/core')
const { join } = require('path')

const resolve = require('eslint-module-utils/resolve').default

function constant(value) {
  return () => value
}

function baseModule(name) {
  if (isScoped(name)) {
    const [scope, pkg] = name.split('/')
    return `${scope}/${pkg}`
  }
  const [pkg] = name.split('/')
  return pkg
}

function isAbsolute(name) {
  return name.indexOf('/') === 0
}

function isBuiltIn(name, settings) {
  const base = baseModule(name)
  const extras = (settings && settings['import/core-modules']) || []
  return coreModules[base] || extras.indexOf(base) > -1
}

function isExternalPath(path, name, settings) {
  const folders = (settings && settings["import/external-module-folders"]) || ["node_modules"];
  const externalPackages = (settings && settings["import/external-packages"]) || [];
  return (
    !path ||
    folders.some((folder) => -1 < path.indexOf(join(folder, name))) ||
    externalPackages.some((package) => path.includes(package))
  );
}

const externalModuleRegExp = /^\w/
function isExternalModule(name, settings, path) {
  return externalModuleRegExp.test(name) && isExternalPath(path, name, settings)
}

const externalModuleMainRegExp = /^[\w]((?!\/).)*$/
function isExternalModuleMain(name, settings, path) {
  return externalModuleMainRegExp.test(name) && isExternalPath(path, name, settings)
}

const scopedRegExp = /^@[^/]+\/[^/]+/
function isScoped(name) {
  return scopedRegExp.test(name)
}

const scopedMainRegExp = /^@[^/]+\/?[^/]+$/
function isScopedMain(name) {
  return scopedMainRegExp.test(name)
}

function isInternalModule(name, settings, path) {
  return externalModuleRegExp.test(name) && !isExternalPath(path, name, settings)
}

function isRelativeToParent(name) {
  return name.indexOf('../') === 0
}

const indexFiles = ['.', './', './index', './index.js']
function isIndex(name) {
  return indexFiles.indexOf(name) !== -1
}

function isRelativeToSibling(name) {
  return name.indexOf('./') === 0
}

const typeTest = cond([
  [isAbsolute, constant('absolute')],
  [isBuiltIn, constant('builtin')],
  [isExternalModule, constant('external')],
  [isScoped, constant('external')],
  [isInternalModule, constant('internal')],
  [isRelativeToParent, constant('parent')],
  [isIndex, constant('index')],
  [isRelativeToSibling, constant('sibling')],
  [constant(true), constant('unknown')],
])

function resolveImportType(name, context) {
  return typeTest(name, context.settings, resolve(name, context))
}

module.exports = resolveImportType;
