let methods = {};

methods.getAresCommands = async function getAresCommands () {
  return await this.getAresCommands();
};

methods.getAresWithCorrectAresPath = async function getAresWithCorrectAresPath () {
  this.executable.path = await this.getAresBinaryPath('ares');
  this.binaries.ares = this.executable.path;
  return this.ares;
};

methods.isDeviceConnected = async function isDeviceConnected (device = this.udid) {
  return await this.isDeviceCreated(device);
};

methods.getAresPath = function getAresPath () {
  return this.executable.path;
};

methods.isValidClass = function isValidClass (classString) {
  return new RegExp(/^[a-zA-Z0-9./_]+$/).exec(classString);
};

export default methods;
