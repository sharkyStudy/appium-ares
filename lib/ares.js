import _ from 'lodash';
import methods from './tools/index.js';
import {DEFAULT_ARES_EXEC_TIMEOUT} from '../lib/tools/system-calls';

const DEFAULT_ARES_PORT = 9922;
const DEFAULT_OPTS = {
  aresRoot: null,
  udid: null,
  executable: {path: 'ares', defaultArgs: []},
  executableGenerate: {path: 'ares-generate', defaultArgs: []},
  executablePackage: {path: 'ares-package', defaultArgs: []},
  executableSetup: {path: 'ares-setup-device', defaultArgs: []},
  executableInstall: {path: 'ares-install', defaultArgs: []},
  executableLaunch: {path: 'ares-launch', defaultArgs: []},
  executableInspect: {path: 'ares-inspect', defaultArgs: []},
  executableServer: {path: 'ares-server', defaultArgs: []},
  executableNovacom: {path: 'ares-novacom', defaultArgs: []},
  executableDevice: {path: 'ares-device-info', defaultArgs: []},
  curDeviceId: null,
  emulatorPort: null,
  binaries: {},
  suppressKillServer: null,
  aresPort: DEFAULT_ARES_PORT,
  aresExecTimeout: DEFAULT_ARES_EXEC_TIMEOUT,
};

class ARES {
  constructor (opts = {}) {
    if (_.isUndefined(opts.aresRoot)) {
      opts.aresRoot = process.env.ARES_HOME || '';
    }

    Object.assign(this, opts);
    _.defaultsDeep(this, _.cloneDeep(DEFAULT_OPTS));

    if (opts.remoteAresPort) {
      this.aresPort = opts.remoteAresPort;
    }

    this.inspectionProcesses = {};

    this.forwards = {};

    this.get = function (prop) {
      // eslint-disable-next-line no-undef
      return (typeof this[prop] == 'undefined') ? emptyValue : this[prop];
    };
    this.set = function (prop, value) {
      this[prop] = value;
    };
  }
}

ARES.createARES = async function createARES (opts) {
  let ares = new ARES(opts);
  await ares.getAresWithCorrectAresPath();
  return ares;
};

// add all the methods to the Ares prototype
for (let [fnName, fn] of _.toPairs(methods)) {
  ARES.prototype[fnName] = fn;
}

export default ARES;
export {ARES, DEFAULT_ARES_PORT};