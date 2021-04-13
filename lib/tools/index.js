import methods from './ares-commands.js';
import systemCallMethods from './system-calls.js';
import ipkUtilsMethods from './ipk-utils.js';

Object.assign(methods, systemCallMethods, ipkUtilsMethods);

export default methods;
