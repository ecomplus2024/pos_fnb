var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// C:/Users/Lenovo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// C:/Users/Lenovo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// C:/Users/Lenovo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// C:/Users/Lenovo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// C:/Users/Lenovo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// C:/Users/Lenovo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// C:/Users/Lenovo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// C:/Users/Lenovo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// C:/Users/Lenovo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// C:/Users/Lenovo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// C:/Users/Lenovo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// C:/Users/Lenovo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// C:/Users/Lenovo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// C:/Users/Lenovo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// C:/Users/Lenovo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// C:/Users/Lenovo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// src/worker.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders
    }
  });
}
__name(json, "json");
async function sha256Hex(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
function generateSessionToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateSessionToken, "generateSessionToken");
function extractToken(request) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}
__name(extractToken, "extractToken");
async function withCache(request, ttlSeconds, swrSeconds, fetcher) {
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) {
    const storedAt = parseInt(cached.headers.get("x-cached-at") || "0", 10);
    const ageMs = Date.now() - storedAt;
    const ttlMs = ttlSeconds * 1e3;
    const swrMs = swrSeconds * 1e3;
    if (ageMs < ttlMs) {
      const h2 = new Headers(cached.headers);
      h2.set("x-cache", "HIT");
      return new Response(cached.body, { status: cached.status, headers: h2 });
    }
    if (swrSeconds > 0 && ageMs < ttlMs + swrMs) {
      const ctx = request.ctx;
      if (ctx) {
        ctx.waitUntil(fetcher().then((r) => cache.put(request, stampCache(r, ttlSeconds))));
      } else {
        fetcher().then((r) => cache.put(request, stampCache(r, ttlSeconds))).catch(() => {
        });
      }
      const h2 = new Headers(cached.headers);
      h2.set("x-cache", "STALE");
      return new Response(cached.body, { status: cached.status, headers: h2 });
    }
    await cache.delete(request);
  }
  const fresh = await fetcher();
  if (fresh.status >= 200 && fresh.status < 300) {
    await cache.put(request, stampCache(fresh.clone(), ttlSeconds));
  }
  const h = new Headers(fresh.headers);
  h.set("x-cache", "MISS");
  return new Response(fresh.body, { status: fresh.status, headers: h });
}
__name(withCache, "withCache");
function stampCache(resp, ttl) {
  const h = new Headers(resp.headers);
  h.set("Cache-Control", `public, max-age=${ttl}, s-maxage=${ttl}`);
  h.set("x-cached-at", String(Date.now()));
  return new Response(resp.body, { status: resp.status, headers: h });
}
__name(stampCache, "stampCache");
async function handleLogin(env2, body) {
  if (!body.username || !body.password) {
    return json({ message: "Thi\u1EBFu t\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u" }, 400);
  }
  const userResult = await env2.DB.prepare(
    "SELECT id, username, password_hash, salt, full_name, role FROM users WHERE username = ?"
  ).bind(body.username).first();
  if (!userResult) return json({ message: "Sai t\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u" }, 401);
  const hashed = await sha256Hex(userResult.salt + body.password);
  if (hashed !== userResult.password_hash) return json({ message: "Sai t\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u" }, 401);
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString();
  await env2.DB.prepare(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
  ).bind(token, userResult.id, expiresAt).run();
  return json({
    access_token: token,
    user: {
      id: userResult.id,
      username: userResult.username,
      full_name: userResult.full_name,
      role: userResult.role
    }
  });
}
__name(handleLogin, "handleLogin");
async function handleVerify(env2, token) {
  const result = await env2.DB.prepare(
    `SELECT u.id, u.username, u.full_name, u.role, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`
  ).bind(token).first();
  if (!result) return json({ valid: false, message: "Token kh\xF4ng h\u1EE3p l\u1EC7" }, 401);
  if (new Date(result.expires_at) < /* @__PURE__ */ new Date()) return json({ valid: false, message: "Token \u0111\xE3 h\u1EBFt h\u1EA1n" }, 401);
  return json({
    valid: true,
    user: { id: result.id, username: result.username, full_name: result.full_name, role: result.role }
  });
}
__name(handleVerify, "handleVerify");
async function handleLogout(env2, token) {
  await env2.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  return json({ success: true });
}
__name(handleLogout, "handleLogout");
async function handleChanges(env2, ctx, unit) {
  if (ctx === "kitchen") {
    const [itemResult, eventResult] = await Promise.all([
      env2.DB.prepare(
        `SELECT oi.id, oi.status FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         JOIN orders o ON o.id = oi.order_id
         WHERE o.status = 'pending' AND p.production_unit = ?
         ORDER BY oi.id`
      ).bind(unit).all(),
      env2.DB.prepare(
        `SELECT MAX(id) as max_id FROM order_item_change_logs
         WHERE production_unit = ? AND created_at >= datetime('now', '-12 hours')`
      ).bind(unit).first()
    ]);
    const itemsSig = (itemResult.results || []).map((r) => `${r.id}:${r.status}`).join(",");
    const maxItemId2 = (itemResult.results || []).reduce((m, r) => Math.max(m, r.id), 0);
    const maxEventId = eventResult?.max_id ?? 0;
    const key2 = `k:${unit}:${maxItemId2}:${maxEventId}:${itemsSig}`;
    return json({ key: key2 });
  }
  const todayStart = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const [tablesResult, ordersResult, itemsResult, callsResult] = await Promise.all([
    env2.DB.prepare(
      `SELECT id, status FROM tables ORDER BY id`
    ).all(),
    env2.DB.prepare(
      `SELECT MAX(id) as max_id FROM orders WHERE created_at >= ?`
    ).bind(todayStart).first(),
    env2.DB.prepare(
      `SELECT MAX(id) as max_id FROM order_items
       WHERE order_id IN (SELECT id FROM orders WHERE status = 'pending')`
    ).first(),
    env2.DB.prepare(
      `SELECT MAX(id) as max_id FROM staff_calls WHERE created_at >= ?`
    ).bind(todayStart).first()
  ]);
  const tableSig = (tablesResult.results || []).map((r) => `${r.id}:${r.status}`).join(",");
  const maxOrderId = ordersResult?.max_id ?? 0;
  const maxItemId = itemsResult?.max_id ?? 0;
  const maxCallId = callsResult?.max_id ?? 0;
  const key = `t:${maxOrderId}:${maxCallId}:${maxItemId}:${tableSig}`;
  return json({ key });
}
__name(handleChanges, "handleChanges");
async function handleMenu(env2) {
  const [categoriesResult, productsResult] = await Promise.all([
    env2.DB.prepare("SELECT id, name, sort_order, production_unit, allow_all_toppings FROM categories ORDER BY sort_order, name").all(),
    env2.DB.prepare(
      `SELECT id, category_id, name, price, image_url, available, is_topping, production_unit FROM products
       WHERE available = 1 ORDER BY name`
    ).all()
  ]);
  const BATCH = 80;
  const productIds = productsResult.results.map((p) => p.id);
  let sizesByProduct = /* @__PURE__ */ new Map();
  for (let i = 0; i < productIds.length; i += BATCH) {
    const chunk = productIds.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const sizesResult = await env2.DB.prepare(
      `SELECT id, product_id, name, price FROM product_sizes WHERE product_id IN (${placeholders}) ORDER BY sort_order, id`
    ).bind(...chunk).all();
    for (const s of sizesResult.results) {
      if (!sizesByProduct.has(s.product_id)) sizesByProduct.set(s.product_id, []);
      sizesByProduct.get(s.product_id).push({ id: s.id, name: s.name, price: s.price });
    }
  }
  const catIds = categoriesResult.results.map((c) => c.id);
  let toppingsByCategory = /* @__PURE__ */ new Map();
  for (let i = 0; i < catIds.length; i += BATCH) {
    const chunk = catIds.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const ctResult = await env2.DB.prepare(
      `SELECT category_id, product_id FROM category_toppings WHERE category_id IN (${placeholders})`
    ).bind(...chunk).all();
    for (const r of ctResult.results) {
      if (!toppingsByCategory.has(r.category_id)) toppingsByCategory.set(r.category_id, []);
      toppingsByCategory.get(r.category_id).push(r.product_id);
    }
  }
  const categories = categoriesResult.results.map((c) => ({
    ...c,
    allowed_toppings: toppingsByCategory.get(c.id) || []
  }));
  const products = productsResult.results.map((p) => ({
    ...p,
    sizes: sizesByProduct.get(p.id) || []
  }));
  return json({ store_name: env2.STORE_NAME, categories, products });
}
__name(handleMenu, "handleMenu");
async function handleTables(env2) {
  const result = await env2.DB.prepare(
    `SELECT id, name, status, current_order_id FROM tables ORDER BY id`
  ).all();
  const ordersResult = await env2.DB.prepare(
    `SELECT id, table_id, table_position, total, created_at FROM orders
     WHERE status = 'pending' AND table_id IS NOT NULL ORDER BY created_at ASC`
  ).all();
  const POSITIONS = ["A", "B", "C", "D"];
  const ordersByTablePos = /* @__PURE__ */ new Map();
  for (const o of ordersResult.results) {
    const pos = (o.table_position || "A").toUpperCase();
    const key = `${o.table_id}:${pos}`;
    if (!ordersByTablePos.has(key)) ordersByTablePos.set(key, []);
    ordersByTablePos.get(key).push(o);
  }
  const itemRows = await env2.DB.prepare(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.price, oi.quantity,
            oi.size_name, oi.note, oi.status, p.image_url
     FROM order_items oi
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id IN (SELECT id FROM orders WHERE status = 'pending' AND table_id IS NOT NULL)
     ORDER BY oi.id ASC`
  ).all();
  const toppingsRows = await env2.DB.prepare(
    `SELECT t.order_item_id, t.product_id, t.price, p.name
     FROM order_item_toppings t LEFT JOIN products p ON p.id = t.product_id
     WHERE t.order_item_id IN (SELECT id FROM order_items
       WHERE order_id IN (SELECT id FROM orders WHERE status = 'pending' AND table_id IS NOT NULL))`
  ).all();
  const toppingsByItem = /* @__PURE__ */ new Map();
  for (const t of toppingsRows.results) {
    if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
    toppingsByItem.get(t.order_item_id).push({ id: t.product_id, name: t.name || "", price: t.price });
  }
  const itemsByOrder = /* @__PURE__ */ new Map();
  for (const it of itemRows.results) {
    if (!itemsByOrder.has(it.order_id)) itemsByOrder.set(it.order_id, []);
    itemsByOrder.get(it.order_id).push({
      id: it.id,
      order_id: it.order_id,
      product_id: it.product_id,
      name: it.product_name,
      quantity: it.quantity,
      price: it.price,
      image_url: it.image_url,
      size_name: it.size_name,
      size: it.size_name ? { name: it.size_name } : null,
      note: it.note,
      toppings: toppingsByItem.get(it.id) || [],
      status: it.status
    });
  }
  const serverTime = (/* @__PURE__ */ new Date()).toISOString();
  const tables = result.results.map((t) => {
    const positions = POSITIONS.map((pos) => {
      const orders = ordersByTablePos.get(`${t.id}:${pos}`) || [];
      const current_order_items = [];
      let revenue = 0;
      let occupiedAt = null;
      for (const o of orders) {
        if (!occupiedAt || o.created_at < occupiedAt) occupiedAt = o.created_at;
        const items = itemsByOrder.get(o.id) || [];
        for (const it of items) {
          const lineTotal = (Number(it.price) + it.toppings.reduce((s, tp) => s + tp.price, 0)) * Number(it.quantity);
          revenue += lineTotal;
          current_order_items.push(it);
        }
      }
      return {
        position: pos,
        status: orders.length > 0 ? "occupied" : "available",
        occupied_at: occupiedAt,
        revenue,
        current_order_items
      };
    });
    const anyOccupied = positions.some((p) => p.status === "occupied");
    const totalRevenue = positions.reduce((s, p) => s + p.revenue, 0);
    const primaryOrder = ordersByTablePos.get(`${t.id}:A`)?.[0] || ordersResult.results.find((o) => o.table_id === t.id);
    const derivedStatus = anyOccupied ? "occupied" : "empty";
    return {
      ...t,
      positions,
      revenue: totalRevenue,
      status: derivedStatus,
      pending_order: primaryOrder ? { id: primaryOrder.id, total: primaryOrder.total, created_at: primaryOrder.created_at } : null
    };
  });
  const staleTableIds = tables.filter((t) => t.status === "empty" && result.results.find((r) => r.id === t.id)?.status === "occupied").map((t) => t.id);
  if (staleTableIds.length > 0) {
    const ph = staleTableIds.map(() => "?").join(",");
    await env2.DB.prepare(`UPDATE tables SET status = 'empty', current_order_id = NULL WHERE id IN (${ph})`).bind(...staleTableIds).run();
  }
  return json({ tables, server_time: serverTime });
}
__name(handleTables, "handleTables");
async function handleGetOrders(env2) {
  const orders = await env2.DB.prepare(
    `SELECT o.id, o.table_id, o.order_type, o.total, o.status,
            o.payment_method, o.customer_name, o.created_at, t.name as table_name
     FROM orders o LEFT JOIN tables t ON t.id = o.table_id
     ORDER BY o.created_at DESC LIMIT 50`
  ).all();
  return json({ orders: orders.results });
}
__name(handleGetOrders, "handleGetOrders");
var menuDataCache = null;
var MENU_CACHE_TTL_MS = 15e3;
async function getMenuData(env2) {
  if (menuDataCache && Date.now() < menuDataCache.expiresAt) return menuDataCache;
  const [productsRes, sizesRes, catsRes, catToppingsRes] = await env2.DB.batch([
    env2.DB.prepare(`SELECT id, price, name, available, category_id, is_topping FROM products`),
    env2.DB.prepare(`SELECT id, name, price, product_id FROM product_sizes`),
    env2.DB.prepare(`SELECT id, allow_all_toppings FROM categories`),
    env2.DB.prepare(`SELECT category_id, product_id FROM category_toppings`)
  ]);
  const productsById = /* @__PURE__ */ new Map();
  const toppingsById = /* @__PURE__ */ new Map();
  for (const p of productsRes.results || []) {
    productsById.set(p.id, p);
    if (p.is_topping === 1 && p.available === 1) {
      toppingsById.set(p.id, { price: p.price, is_topping: p.is_topping, available: p.available });
    }
  }
  const sizesById = /* @__PURE__ */ new Map();
  for (const s of sizesRes.results || []) {
    sizesById.set(s.id, { name: s.name, price: s.price, product_id: s.product_id });
  }
  const allowAllByCategory = /* @__PURE__ */ new Map();
  for (const c of catsRes.results || []) {
    allowAllByCategory.set(c.id, c.allow_all_toppings);
  }
  const allowedToppingsByCategory = /* @__PURE__ */ new Map();
  for (const r of catToppingsRes.results || []) {
    if (!allowedToppingsByCategory.has(r.category_id)) allowedToppingsByCategory.set(r.category_id, /* @__PURE__ */ new Set());
    allowedToppingsByCategory.get(r.category_id).add(r.product_id);
  }
  menuDataCache = {
    productsById,
    sizesById,
    toppingsById,
    allowAllByCategory,
    allowedToppingsByCategory,
    expiresAt: Date.now() + MENU_CACHE_TTL_MS
  };
  return menuDataCache;
}
__name(getMenuData, "getMenuData");
async function handleCreateOrder(env2, body) {
  if (!body.items || body.items.length === 0) return json({ error: "Cart r\u1ED7ng" }, 400);
  const tablePosition = (body.table_position || "A").toUpperCase();
  let orderId = null;
  let reused = false;
  const isTakeawayOrShip = !body.table_id && body.order_type && (body.order_type === "takeaway" || body.order_type === "ship");
  const todayStart = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const prep = [];
  const prepKeys = [];
  if (body.table_id) {
    prepKeys.push("existing");
    prep.push(env2.DB.prepare(
      `SELECT id FROM orders
       WHERE table_id = ? AND status = 'pending' AND (table_position = ? OR table_position IS NULL)
       ORDER BY created_at DESC LIMIT 1`
    ).bind(body.table_id, tablePosition));
  }
  if (isTakeawayOrShip) {
    prepKeys.push("codeCount");
    prep.push(env2.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM orders
       WHERE table_id IS NULL AND order_type = ? AND created_at >= ?`
    ).bind(body.order_type, todayStart));
  }
  const [menuData, prepResults] = await Promise.all([
    getMenuData(env2),
    prep.length > 0 ? env2.DB.batch(prep) : Promise.resolve([])
  ]);
  const prepByKey = {};
  prepKeys.forEach((k, i) => {
    prepByKey[k] = prepResults[i];
  });
  const productsById = menuData.productsById;
  const sizesById = menuData.sizesById;
  const toppingsById = menuData.toppingsById;
  const allowAllByCategory = menuData.allowAllByCategory;
  const allowedToppingsByCategory = menuData.allowedToppingsByCategory;
  if (body.table_id) {
    const existing = prepByKey.existing?.results?.[0];
    if (existing) {
      orderId = existing.id;
      reused = true;
      await env2.DB.prepare(`UPDATE orders SET table_position = ? WHERE id = ? AND table_position IS NULL`).bind(tablePosition, orderId).run();
    }
  }
  if (orderId === null) {
    let displayCode = null;
    if (isTakeawayOrShip) {
      const countRow = prepByKey.codeCount?.results?.[0];
      const prefix = body.order_type === "takeaway" ? "mv" : "ship";
      displayCode = `${prefix}${(countRow?.cnt ?? 0) + 1}`;
    }
    const orderResult = await env2.DB.prepare(
      `INSERT INTO orders (table_id, table_position, order_type, total, status, payment_method, customer_name, display_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
    ).bind(
      body.table_id ?? null,
      body.table_id ? tablePosition : "A",
      body.order_type ?? "dine_in",
      0,
      // total will be recalculated
      "pending",
      body.payment_method ?? null,
      body.customer_name ?? null,
      displayCode
    ).first();
    if (!orderResult) return json({ error: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c \u0111\u01A1n" }, 500);
    orderId = orderResult.id;
  }
  const skippedItems = [];
  const invalidToppings = [];
  let insertedCount = 0;
  const insertedItems = [];
  const validItems = [];
  for (let idx = 0; idx < body.items.length; idx++) {
    const it = body.items[idx];
    const product = productsById.get(it.product_id);
    if (!product) {
      skippedItems.push({ product_id: it.product_id, reason: "not_found" });
      continue;
    }
    if (!product.available) {
      skippedItems.push({ product_id: it.product_id, reason: "unavailable" });
      continue;
    }
    let itemPrice = product.price;
    let sizeName = null;
    if (it.size_id) {
      const size = sizesById.get(it.size_id);
      if (size && size.product_id === product.id) {
        itemPrice = size.price;
        sizeName = size.name;
      }
    }
    validItems.push({ idx, it, product, itemPrice, sizeName });
  }
  const itemStmts = validItems.map(
    (v) => env2.DB.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, status, size_name, note)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?) RETURNING id`
    ).bind(orderId, v.product.id, v.product.name, v.itemPrice, v.it.quantity ?? 1, v.sizeName, (v.it.note ?? "") || null)
  );
  const itemResults = itemStmts.length > 0 ? await env2.DB.batch(itemStmts) : [];
  const toppingStmts = [];
  const toppingFallbacks = [];
  validItems.forEach((v, vi) => {
    const insertRes = itemResults[vi];
    const newItemId = insertRes?.results?.[0]?.id;
    if (!newItemId) return;
    insertedCount++;
    insertedItems.push({ cart_index: v.idx, order_item_id: newItemId });
    const toppingEntries = v.it.toppings ?? [];
    const allowAll = allowAllByCategory.get(v.product.category_id) ?? 0;
    const allowedSet = allowedToppingsByCategory.get(v.product.category_id);
    for (const tEntry of toppingEntries) {
      const tid = typeof tEntry === "number" ? tEntry : tEntry.id;
      const tqty = typeof tEntry === "number" ? 1 : tEntry.quantity || 1;
      const tp = toppingsById.get(tid);
      if (!tp) {
        invalidToppings.push({ product_id: v.product.id, topping_id: tid, reason: "invalid_or_unavailable" });
        continue;
      }
      if (!allowAll && allowedSet && !allowedSet.has(tid)) {
        invalidToppings.push({ product_id: v.product.id, topping_id: tid, reason: "not_allowed_for_category" });
        continue;
      }
      toppingFallbacks.push({ stmtIdx: toppingStmts.length, itemId: newItemId, tid, price: tp.price });
      toppingStmts.push(
        env2.DB.prepare(
          `INSERT INTO order_item_toppings (order_item_id, product_id, price, quantity) VALUES (?, ?, ?, ?)`
        ).bind(newItemId, tid, tp.price, tqty)
      );
    }
  });
  const finalBatch = [];
  if (toppingStmts.length > 0) {
    finalBatch.push(...toppingStmts);
  }
  finalBatch.push(env2.DB.prepare(
    `UPDATE orders SET total = (
      SELECT COALESCE(SUM(oi.price * oi.quantity), 0) +
             COALESCE((SELECT SUM(oit.price * COALESCE(oit.quantity, 1) * oi.quantity)
                       FROM order_item_toppings oit
                       JOIN order_items oi ON oi.id = oit.order_item_id
                       WHERE oi.order_id = ?), 0)
      FROM order_items oi WHERE oi.order_id = ?
    ) WHERE id = ? RETURNING total`
  ).bind(orderId, orderId, orderId));
  if (body.table_id) {
    finalBatch.push(env2.DB.prepare(
      `UPDATE tables SET status = 'occupied', current_order_id = ? WHERE id = ?`
    ).bind(orderId, body.table_id));
  }
  let toppingBatchFailed = false;
  let finalTotal = null;
  const recalcIdx = toppingStmts.length;
  try {
    const batchResults = await env2.DB.batch(finalBatch);
    finalTotal = batchResults?.[recalcIdx]?.results?.[0]?.total ?? null;
  } catch (e) {
    toppingBatchFailed = true;
  }
  if (toppingBatchFailed) {
    for (const fb of toppingFallbacks) {
      try {
        await env2.DB.prepare(
          `INSERT INTO order_item_toppings (order_item_id, product_id, price) VALUES (?, ?, ?)`
        ).bind(fb.itemId, fb.tid, fb.price).run();
      } catch {
      }
    }
    await recalcOrderTotal(env2, orderId);
    if (body.table_id) {
      await env2.DB.prepare(
        `UPDATE tables SET status = 'occupied', current_order_id = ? WHERE id = ?`
      ).bind(orderId, body.table_id).run();
    }
  }
  if (finalTotal === null) {
    finalTotal = (await env2.DB.prepare("SELECT total FROM orders WHERE id = ?").bind(orderId).first())?.total ?? 0;
  }
  return json({
    success: true,
    order_id: orderId,
    reused,
    total: finalTotal,
    items_count: insertedCount,
    inserted_items: insertedItems,
    ...skippedItems.length > 0 ? { skipped_items: skippedItems } : {},
    ...invalidToppings.length > 0 ? { invalid_toppings: invalidToppings } : {}
  });
}
__name(handleCreateOrder, "handleCreateOrder");
async function handlePayTable(env2, tableId, paymentMethod, tablePosition) {
  let order;
  if (tablePosition) {
    const pos = tablePosition.toUpperCase();
    order = await env2.DB.prepare(
      `SELECT id FROM orders WHERE table_id = ? AND table_position = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`
    ).bind(tableId, pos).first();
  } else {
    order = await env2.DB.prepare(
      `SELECT id FROM orders WHERE table_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`
    ).bind(tableId).first();
  }
  if (!order) return json({ error: "Kh\xF4ng c\xF3 order pending cho b\xE0n n\xE0y" }, 404);
  await env2.DB.prepare(`UPDATE orders SET status = 'completed', payment_method = ? WHERE id = ?`).bind(paymentMethod, order.id).run();
  await env2.DB.prepare(`UPDATE order_items SET status = 'completed' WHERE order_id = ? AND status != 'completed'`).bind(order.id).run();
  const remaining = await env2.DB.prepare(
    `SELECT COUNT(*) as cnt FROM orders WHERE table_id = ? AND status = 'pending'`
  ).bind(tableId).first();
  if ((remaining?.cnt ?? 0) === 0) {
    await env2.DB.prepare(`UPDATE tables SET status = 'empty', current_order_id = NULL WHERE id = ?`).bind(tableId).run();
  }
  return json({ success: true, order_id: order.id });
}
__name(handlePayTable, "handlePayTable");
async function buildOrderDisplayName(env2, orderId) {
  const order = await env2.DB.prepare(
    `SELECT o.order_type, o.customer_name, t.name as table_name
     FROM orders o LEFT JOIN tables t ON t.id = o.table_id WHERE o.id = ?`
  ).bind(orderId).first();
  if (!order) return "Unknown";
  if (order.table_name) return order.table_name;
  if (order.order_type === "takeaway") {
    const name = (order.customer_name || "").trim();
    return name ? `MV - ${name}` : "MV";
  }
  if (order.order_type === "ship") {
    const name = (order.customer_name || "").trim();
    return name ? `SHIP - ${name}` : "SHIP";
  }
  return "Mang v\u1EC1";
}
__name(buildOrderDisplayName, "buildOrderDisplayName");
async function logItemChange(env2, orderId, itemId, productName, tableName, action, oldQty, newQty, productionUnit) {
  await env2.DB.prepare(
    `INSERT INTO order_item_change_logs (order_id, order_item_id, product_name, table_name, action, old_quantity, new_quantity, production_unit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(orderId, itemId, productName, tableName, action, oldQty, newQty, productionUnit).run();
}
__name(logItemChange, "logItemChange");
async function handleDeleteCashierItem(env2, orderId, itemId) {
  const item = await env2.DB.prepare(
    `SELECT oi.id, oi.product_name, oi.quantity, oi.status, p.production_unit
     FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.id = ? AND oi.order_id = ?`
  ).bind(itemId, orderId).first();
  if (!item) return json({ message: "Kh\xF4ng t\xECm th\u1EA5y m\xF3n" }, 404);
  const prodUnit = item.production_unit || "kitchen";
  const tableName = await buildOrderDisplayName(env2, orderId);
  await logItemChange(env2, orderId, itemId, item.product_name, tableName, "deleted", item.quantity, 0, prodUnit);
  await env2.DB.prepare(`DELETE FROM order_items WHERE id = ?`).bind(itemId).run();
  const remaining = await env2.DB.prepare(
    `SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ?`
  ).bind(orderId).first();
  if ((remaining?.cnt ?? 0) === 0) {
    const order = await env2.DB.prepare(`SELECT table_id FROM orders WHERE id = ?`).bind(orderId).first();
    await env2.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(orderId).run();
    if (order?.table_id) {
      await env2.DB.prepare(`UPDATE tables SET status = 'empty', current_order_id = NULL WHERE id = ?`).bind(order.table_id).run();
    }
  } else {
    await recalcOrderTotal(env2, orderId);
  }
  return json({ success: true });
}
__name(handleDeleteCashierItem, "handleDeleteCashierItem");
async function handleUpdateCashierItemQuantity(env2, orderId, itemId, body) {
  const item = await env2.DB.prepare(
    `SELECT oi.id, oi.product_name, oi.quantity, oi.status, p.production_unit
     FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.id = ? AND oi.order_id = ?`
  ).bind(itemId, orderId).first();
  if (!item) return json({ message: "Kh\xF4ng t\xECm th\u1EA5y m\xF3n" }, 404);
  const qty = body.quantity ?? 0;
  if (qty <= 0) {
    return await handleDeleteCashierItem(env2, orderId, itemId);
  }
  const prodUnit = item.production_unit || "kitchen";
  const oldQty = item.quantity;
  if (qty < oldQty) {
    const tableName = await buildOrderDisplayName(env2, orderId);
    await logItemChange(env2, orderId, itemId, item.product_name, tableName, "quantity_reduced", oldQty, qty, prodUnit);
  }
  await env2.DB.prepare(`UPDATE order_items SET quantity = ? WHERE id = ?`).bind(qty, itemId).run();
  await recalcOrderTotal(env2, orderId);
  return json({ success: true });
}
__name(handleUpdateCashierItemQuantity, "handleUpdateCashierItemQuantity");
async function handleTransferTable(env2, body) {
  if (!body.old_table_id || !body.new_table_id) {
    return json({ error: "Thi\u1EBFu th\xF4ng tin b\xE0n" }, 400);
  }
  if (body.old_table_id === body.new_table_id) {
    return json({ error: "B\xE0n ngu\u1ED3n v\xE0 b\xE0n \u0111\xEDch gi\u1ED1ng nhau" }, 400);
  }
  const targetTable = await env2.DB.prepare(
    `SELECT id FROM tables WHERE id = ?`
  ).bind(body.new_table_id).first();
  if (!targetTable) return json({ error: "B\xE0n \u0111\xEDch kh\xF4ng t\u1ED3n t\u1EA1i" }, 404);
  const targetOccupied = await env2.DB.prepare(
    `SELECT id FROM orders WHERE table_id = ? AND status = 'pending' LIMIT 1`
  ).bind(body.new_table_id).first();
  if (targetOccupied) {
    return json({ error: "B\xE0n \u0111\xEDch \u0111ang c\xF3 kh\xE1ch" }, 409);
  }
  const order = await env2.DB.prepare(
    `SELECT id FROM orders WHERE table_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`
  ).bind(body.old_table_id).first();
  if (!order) return json({ error: "Kh\xF4ng c\xF3 order pending \u0111\u1EC3 chuy\u1EC3n" }, 404);
  await env2.DB.prepare(`UPDATE orders SET table_id = ? WHERE id = ?`).bind(body.new_table_id, order.id).run();
  await env2.DB.prepare(`UPDATE tables SET status = 'empty', current_order_id = NULL WHERE id = ?`).bind(body.old_table_id).run();
  await env2.DB.prepare(`UPDATE tables SET status = 'occupied', current_order_id = ? WHERE id = ?`).bind(order.id, body.new_table_id).run();
  return json({ success: true, order_id: order.id });
}
__name(handleTransferTable, "handleTransferTable");
async function handleKitchenOrders(env2, unit) {
  const ordersResult = await env2.DB.prepare(
    `SELECT DISTINCT o.id, o.order_type, o.customer_name, o.created_at, t.name as table_name
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products p ON p.id = oi.product_id
     LEFT JOIN tables t ON t.id = o.table_id
     WHERE oi.status != 'completed' AND o.status = 'pending'
       AND (p.production_unit = ? OR (oi.product_id IS NULL AND ? = 'kitchen'))
     ORDER BY o.created_at ASC`
  ).bind(unit, unit).all();
  const orderList = ordersResult.results || [];
  if (orderList.length === 0) return json([]);
  const orderIds = orderList.map((o) => o.id);
  const orderPh = orderIds.map(() => "?").join(",");
  const [allItemsResult, allToppingsResult] = await Promise.all([
    env2.DB.prepare(
      `SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.quantity, oi.note, oi.status, oi.size_name,
              oi.reported_at, p.production_unit
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id IN (${orderPh}) AND oi.status != 'completed'
         AND (p.production_unit = ? OR (oi.product_id IS NULL AND ? = 'kitchen'))`
    ).bind(...orderIds, unit, unit).all(),
    env2.DB.prepare(
      `SELECT oit.order_item_id, p.name FROM order_item_toppings oit
       JOIN products p ON p.id = oit.product_id
       JOIN order_items oi ON oi.id = oit.order_item_id
       WHERE oi.order_id IN (${orderPh})`
    ).bind(...orderIds).all()
  ]);
  const itemsByOrder = /* @__PURE__ */ new Map();
  for (const it of allItemsResult.results || []) {
    if (!itemsByOrder.has(it.order_id)) itemsByOrder.set(it.order_id, []);
    itemsByOrder.get(it.order_id).push(it);
  }
  const toppingsByItem = /* @__PURE__ */ new Map();
  for (const t of allToppingsResult.results || []) {
    if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
    toppingsByItem.get(t.order_item_id).push(t.name);
  }
  const results = [];
  for (const order of orderList) {
    const orderItems = itemsByOrder.get(order.id) || [];
    if (orderItems.length === 0) continue;
    let displayName;
    if (order.table_name) {
      displayName = order.table_name;
    } else if (order.order_type === "takeaway") {
      const code = "MV";
      const name = (order.customer_name || "").trim();
      displayName = name ? `${code} - ${name}` : code;
    } else if (order.order_type === "ship") {
      const code = "SHIP";
      const name = (order.customer_name || "").trim();
      displayName = name ? `${code} - ${name}` : code;
    } else {
      displayName = "Mang v\u1EC1";
    }
    const items = orderItems.map((it) => ({
      id: it.id,
      product_id: it.product_id,
      product_name: it.product_name,
      quantity: it.quantity,
      notes: it.note,
      status: it.status,
      size_name: it.size_name,
      toppings: toppingsByItem.get(it.id) || [],
      is_voice_order: false,
      // Voice orders not supported in Worker yet
      voice_url: null,
      // Mốc đếm thời gian trên màn hình bếp/quầy: thời điểm báo chế biến
      reported_at: it.reported_at || order.created_at
    }));
    results.push({
      id: order.id,
      table_name: displayName,
      order_type: order.order_type,
      display_code: null,
      is_self_order: false,
      status: "pending",
      created_at: order.created_at,
      items
    });
  }
  return json(results);
}
__name(handleKitchenOrders, "handleKitchenOrders");
async function handleKitchenCancellationEvents(env2, unit, hours) {
  hours = Math.max(1, Math.min(hours, 72));
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1e3).toISOString().slice(0, 19).replace("T", " ");
  const result = await env2.DB.prepare(
    `SELECT id, order_id, order_item_id, product_name, table_name, action,
            old_quantity, new_quantity, production_unit, created_at
     FROM order_item_change_logs
     WHERE production_unit = ? AND created_at >= ?
     ORDER BY created_at DESC LIMIT 200`
  ).bind(unit, cutoff).all();
  return json(result.results.map((c) => ({
    event_id: c.id,
    order_id: c.order_id,
    item_id: c.order_item_id,
    action: c.action,
    old_quantity: c.old_quantity,
    new_quantity: c.new_quantity,
    product_name: c.product_name,
    table_name: c.table_name,
    is_self_order: false,
    created_at: c.created_at
  })));
}
__name(handleKitchenCancellationEvents, "handleKitchenCancellationEvents");
async function handleUpdateItemStatus(env2, itemId, newStatus) {
  if (!["pending", "processing", "completed"].includes(newStatus)) {
    return json({ message: "Status invalid" }, 400);
  }
  const item = await env2.DB.prepare(
    `SELECT id, status FROM order_items WHERE id = ?`
  ).bind(itemId).first();
  if (!item) return json({ message: "Item not found" }, 404);
  await env2.DB.prepare(`UPDATE order_items SET status = ? WHERE id = ?`).bind(newStatus, itemId).run();
  return json({ message: "Status updated", itemId, status: newStatus });
}
__name(handleUpdateItemStatus, "handleUpdateItemStatus");
async function handleKitchenBatchSync(env2, changes) {
  if (!Array.isArray(changes)) return json({ message: "changes must be an array" }, 400);
  const results = [];
  for (const change of changes) {
    const { itemId, status } = change;
    if (!itemId || !status) {
      results.push({ itemId, success: false, error: "missing fields" });
      continue;
    }
    if (!["pending", "processing", "completed"].includes(status)) {
      results.push({ itemId, success: false, error: "invalid status" });
      continue;
    }
    try {
      const item = await env2.DB.prepare("SELECT id FROM order_items WHERE id = ?").bind(itemId).first();
      if (!item) {
        results.push({ itemId, success: false, error: "not_found" });
        continue;
      }
      await env2.DB.prepare("UPDATE order_items SET status = ? WHERE id = ?").bind(status, itemId).run();
      results.push({ itemId, success: true, applied: true });
    } catch (err) {
      results.push({ itemId, success: false, error: String(err) });
    }
  }
  return json({ results });
}
__name(handleKitchenBatchSync, "handleKitchenBatchSync");
async function handlePublicMenu(env2, tableId) {
  const tableRow = await env2.DB.prepare("SELECT id, name FROM tables WHERE id = ?").bind(tableId).first();
  if (!tableRow) return json({ message: "B\xE0n kh\xF4ng t\u1ED3n t\u1EA1i" }, 404);
  const categoriesResult = await env2.DB.prepare(
    `SELECT id, name, sort_order, production_unit, allow_all_toppings
     FROM categories ORDER BY
     CASE production_unit WHEN 'counter' THEN 0 WHEN 'kitchen' THEN 1 ELSE 2 END,
     sort_order, id`
  ).all();
  const productsResult = await env2.DB.prepare(
    `SELECT id, category_id, name, price, image_url, available, is_topping, production_unit
     FROM products WHERE available = 1`
  ).all();
  const BATCH = 80;
  const productIds = productsResult.results.map((p) => p.id);
  let sizesByProduct = /* @__PURE__ */ new Map();
  for (let i = 0; i < productIds.length; i += BATCH) {
    const chunk = productIds.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const sizesResult = await env2.DB.prepare(
      `SELECT id, product_id, name, price FROM product_sizes WHERE product_id IN (${placeholders}) ORDER BY sort_order, id`
    ).bind(...chunk).all();
    for (const s of sizesResult.results) {
      if (!sizesByProduct.has(s.product_id)) sizesByProduct.set(s.product_id, []);
      sizesByProduct.get(s.product_id).push({ id: s.id, name: s.name, price: s.price });
    }
  }
  const catIds = categoriesResult.results.map((c) => c.id);
  let toppingsByCategory = /* @__PURE__ */ new Map();
  for (let i = 0; i < catIds.length; i += BATCH) {
    const chunk = catIds.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const ctResult = await env2.DB.prepare(
      `SELECT category_id, product_id FROM category_toppings WHERE category_id IN (${placeholders})`
    ).bind(...chunk).all();
    for (const r of ctResult.results) {
      if (!toppingsByCategory.has(r.category_id)) toppingsByCategory.set(r.category_id, []);
      toppingsByCategory.get(r.category_id).push(r.product_id);
    }
  }
  const categories = categoriesResult.results.map((c) => ({
    ...c,
    allowed_toppings: toppingsByCategory.get(c.id) || []
  }));
  const products = productsResult.results.map((p) => ({
    ...p,
    sizes: sizesByProduct.get(p.id) || []
  }));
  return json({
    store: { name: env2.STORE_NAME },
    table: tableRow,
    categories,
    products
  });
}
__name(handlePublicMenu, "handlePublicMenu");
async function handlePublicTableState(env2, tableId) {
  const pending = await env2.DB.prepare(
    `SELECT customer_session_id FROM orders
     WHERE table_id = ? AND status IN ('pending', 'processing')
     ORDER BY created_at DESC LIMIT 1`
  ).bind(tableId).first();
  const hasPending = !!pending;
  return json({
    table_id: tableId,
    status: hasPending ? "occupied" : "available",
    has_pending_order: hasPending,
    customer_session_id: pending?.customer_session_id ?? null
  });
}
__name(handlePublicTableState, "handlePublicTableState");
async function handlePublicItems(env2, tableId) {
  const result = await env2.DB.prepare(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.price, oi.quantity,
            oi.note, oi.status, oi.size_name, o.created_at AS order_created_at
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.table_id = ? AND o.status IN ('pending', 'processing') AND oi.status IN ('pending', 'processing', 'completed')
     ORDER BY oi.id DESC`
  ).bind(tableId).all();
  const itemIds = result.results.map((r) => r.id);
  let toppingsByItem = /* @__PURE__ */ new Map();
  if (itemIds.length > 0) {
    const placeholders = itemIds.map(() => "?").join(",");
    const tResult = await env2.DB.prepare(
      `SELECT oit.order_item_id, p.name FROM order_item_toppings oit
       JOIN products p ON p.id = oit.product_id
       WHERE oit.order_item_id IN (${placeholders})`
    ).bind(...itemIds).all();
    for (const t of tResult.results) {
      if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
      toppingsByItem.get(t.order_item_id).push(t.name);
    }
  }
  return json(result.results.map((it) => ({
    id: it.id,
    order_id: it.order_id,
    product_id: it.product_id,
    name: it.product_name,
    quantity: it.quantity,
    price: it.price,
    status: it.status,
    size_name: it.size_name,
    notes: it.note,
    toppings: toppingsByItem.get(it.id) || [],
    created_at: isoTs(it.order_created_at)
  })));
}
__name(handlePublicItems, "handlePublicItems");
async function handleCreatePublicOrder(env2, body) {
  if (!body.table_id || !body.items?.length) {
    return json({ message: "Thi\u1EBFu th\xF4ng tin b\xE0n ho\u1EB7c m\xF3n \u0103n" }, 400);
  }
  if (body.request_token) {
    const replayed = await env2.DB.prepare(
      `SELECT id, total, customer_session_id FROM orders
       WHERE request_token = ? AND table_id = ? AND status IN ('pending', 'processing')
       LIMIT 1`
    ).bind(body.request_token, body.table_id).first();
    if (replayed) {
      return json({
        message: "\u0110\u1EB7t m\xF3n th\xE0nh c\xF4ng",
        order_id: replayed.id,
        total_amount: replayed.total,
        customer_session_id: replayed.customer_session_id,
        replayed: true
      }, 200);
    }
    const reusedToken = await env2.DB.prepare(
      `SELECT id FROM orders WHERE request_token = ? LIMIT 1`
    ).bind(body.request_token).first();
    if (reusedToken) {
      return json({ error: "request_token_reused", message: "Token \u0111\xE3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng, vui l\xF2ng th\u1EED l\u1EA1i." }, 409);
    }
  }
  const pending = await env2.DB.prepare(
    `SELECT id, customer_session_id FROM orders
     WHERE table_id = ? AND status IN ('pending', 'processing')
     ORDER BY created_at DESC LIMIT 1`
  ).bind(body.table_id).first();
  let sessionId;
  if (pending) {
    if (!body.customer_session_id) {
      return json({ error: "table_occupied_need_choice", message: "B\xE0n n\xE0y \u0111\xE3 c\xF3 \u0111\u01A1n ch\u01B0a thanh to\xE1n. Vui l\xF2ng ch\u1ECDn ti\u1EBFp t\u1EE5c ho\u1EB7c g\u1ECDi nh\xE2n vi\xEAn." }, 409);
    }
    if (body.customer_session_id !== pending.customer_session_id) {
      return json({ error: "invalid_session", message: "Phi\xEAn \u0111\u1EB7t m\xF3n \u0111\xE3 h\u1EBFt h\u1EA1n ho\u1EB7c kh\xF4ng h\u1EE3p l\u1EC7." }, 403);
    }
    sessionId = pending.customer_session_id;
  } else {
    sessionId = crypto.randomUUID();
  }
  let orderId;
  let isNewOrder = false;
  if (pending) {
    orderId = pending.id;
    if (body.request_token) {
      await env2.DB.prepare(
        `UPDATE orders SET request_token = COALESCE(request_token, ?) WHERE id = ?`
      ).bind(body.request_token, orderId).run();
    }
  } else {
    const insertResult = await env2.DB.prepare(
      `INSERT INTO orders (table_id, order_type, total, status, customer_session_id, request_token, table_position)
       VALUES (?, 'dine_in', 0, 'pending', ?, ?, ?) RETURNING id`
    ).bind(body.table_id, sessionId, body.request_token ?? null, body.table_position ?? "A").first();
    if (!insertResult) return json({ error: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c \u0111\u01A1n" }, 500);
    orderId = insertResult.id;
    isNewOrder = true;
  }
  const mergeDuplicates = !!body.retry_after_failure && !isNewOrder;
  const menuData = await getMenuData(env2);
  let computedTotal = 0;
  for (const it of body.items) {
    const product = menuData.productsById.get(it.product_id);
    if (!product || !product.available) continue;
    let itemPrice = product.price;
    let sizeName = null;
    if (it.size_id) {
      const size = menuData.sizesById.get(it.size_id);
      if (size && size.product_id === product.id) {
        itemPrice = size.price;
        sizeName = size.name;
      }
    }
    const qty = it.quantity ?? 1;
    const notes = it.notes ?? "";
    const toppingEntries = it.toppings ?? [];
    const toppingIds = toppingEntries.map((t) => typeof t === "number" ? t : t.id);
    if (mergeDuplicates) {
      const existingItems = await env2.DB.prepare(
        `SELECT id, price, size_name, note FROM order_items
         WHERE order_id = ? AND product_id = ? AND status = 'pending'`
      ).bind(orderId, product.id).all();
      let merged = false;
      for (const ex of existingItems.results) {
        if ((ex.size_name ?? null) !== sizeName) continue;
        if ((ex.note ?? "") !== notes) continue;
        const exToppings = await env2.DB.prepare(
          `SELECT product_id FROM order_item_toppings WHERE order_item_id = ?`
        ).bind(ex.id).all();
        const exIds = exToppings.results.map((t) => t.product_id).sort((a, b) => a - b);
        const newIds = [...toppingIds].sort((a, b) => a - b);
        if (JSON.stringify(exIds) !== JSON.stringify(newIds)) continue;
        await env2.DB.prepare(`UPDATE order_items SET quantity = quantity + ? WHERE id = ?`).bind(qty, ex.id).run();
        let toppingSum2 = 0;
        for (const tid of toppingIds) {
          const tp2 = menuData.toppingsById.get(tid);
          if (tp2) toppingSum2 += tp2.price;
        }
        computedTotal += (itemPrice + toppingSum2) * qty;
        merged = true;
        break;
      }
      if (merged) continue;
    }
    const inserted = await env2.DB.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, status, size_name, note)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?) RETURNING id`
    ).bind(orderId, product.id, product.name, itemPrice, qty, sizeName, notes || null).first();
    if (!inserted) continue;
    let toppingSum = 0;
    for (const tEntry of toppingEntries) {
      const tid = typeof tEntry === "number" ? tEntry : tEntry.id;
      const tqty = typeof tEntry === "number" ? 1 : tEntry.quantity || 1;
      const tp = menuData.toppingsById.get(tid);
      if (tp) {
        try {
          await env2.DB.prepare(
            `INSERT INTO order_item_toppings (order_item_id, product_id, price, quantity) VALUES (?, ?, ?, ?)`
          ).bind(inserted.id, tid, tp.price, tqty).run();
        } catch {
          await env2.DB.prepare(
            `INSERT INTO order_item_toppings (order_item_id, product_id, price) VALUES (?, ?, ?)`
          ).bind(inserted.id, tid, tp.price).run();
        }
        toppingSum += tp.price * tqty;
      }
    }
    computedTotal += (itemPrice + toppingSum) * qty;
  }
  await recalcOrderTotal(env2, orderId);
  const finalTotal = (await env2.DB.prepare("SELECT total FROM orders WHERE id = ?").bind(orderId).first())?.total ?? 0;
  if (isNewOrder) {
    await env2.DB.prepare(
      `UPDATE tables SET status = 'occupied', current_order_id = ? WHERE id = ?`
    ).bind(orderId, body.table_id).run();
  }
  await caches.default.delete(new Request("https://cache/api/tables", { method: "GET" }));
  return json({
    message: "\u0110\u1EB7t m\xF3n th\xE0nh c\xF4ng",
    order_id: orderId,
    total_amount: finalTotal,
    customer_session_id: sessionId,
    added_items_count: body.items.length
  }, 201);
}
__name(handleCreatePublicOrder, "handleCreatePublicOrder");
async function recalcOrderTotal(env2, orderId) {
  await env2.DB.prepare(
    `UPDATE orders SET total = (
      SELECT COALESCE(SUM(oi.price * oi.quantity), 0) +
             COALESCE((SELECT SUM(oit.price * COALESCE(oit.quantity, 1) * oi.quantity)
                       FROM order_item_toppings oit
                       JOIN order_items oi ON oi.id = oit.order_item_id
                       WHERE oi.order_id = ?), 0)
      FROM order_items oi WHERE oi.order_id = ?
    ) WHERE id = ?`
  ).bind(orderId, orderId, orderId).run();
}
__name(recalcOrderTotal, "recalcOrderTotal");
var ZALO_DEFAULT_API_BASE = "https://bot-api.zaloplatforms.com";
var ZALO_MAX_ATTEMPTS = 3;
var ZALO_RETRY_BACKOFF = [1e3, 2e3, 4e3];
var ZaloBotNotifier = class {
  static {
    __name(this, "ZaloBotNotifier");
  }
  constructor(env2) {
    this.env = env2;
    this.enabled = false;
    this.bot_token = "";
    this.group_chat_id = "";
    this.api_base = ZALO_DEFAULT_API_BASE;
  }
  async _reloadConfig() {
    try {
      const row = await this.env.DB.prepare("SELECT value FROM settings WHERE key = 'zalo_bot'").first();
      if (!row) return;
      const cfg = JSON.parse(row.value);
      this.enabled = Boolean(cfg.enabled);
      this.bot_token = (cfg.bot_token || "").trim();
      this.group_chat_id = (cfg.group_chat_id || "").trim();
      this.api_base = (cfg.api_base || ZALO_DEFAULT_API_BASE).replace(/\/+$/, "");
    } catch (e) {
      console.warn("ZaloBotNotifier: reload config fail:", e);
    }
  }
  isReady() {
    return this.enabled && Boolean(this.bot_token) && Boolean(this.group_chat_id);
  }
  _formatMoney(amount) {
    return Number(amount).toLocaleString("vi-VN") + "\u0111";
  }
  _formatMessage(orderData) {
    const { display_code, customer_name, customer_phone, ship_address, latitude, longitude, items, total_amount, created_at } = orderData;
    const timeStr = created_at ? new Date(created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "";
    const lines = [
      `\u0110\u01A1n ship m\u1EDBi #${display_code || "N/A"}`,
      "",
      `Kh\xE1ch: ${customer_name || "(kh\xF4ng c\xF3)"}`,
      `S\u0110T: ${customer_phone || "(kh\xF4ng c\xF3)"}`,
      `\u0110\u1ECBa ch\u1EC9: ${ship_address || "(kh\xF4ng c\xF3)"}`
    ];
    if (latitude != null && longitude != null) {
      lines.push(`GPS: https://www.google.com/maps?q=${latitude},${longitude}`);
    }
    lines.push("", "M\xF3n:");
    for (const item of items || []) {
      const sizeText = item.size_name ? ` size ${item.size_name}` : "";
      const toppingTotal = (item.toppings || []).reduce((s, t) => s + (t.price || 0), 0);
      const itemTotal = (item.price + toppingTotal) * item.quantity;
      lines.push(`- ${item.quantity} x ${item.product_name}${sizeText} - ${this._formatMoney(itemTotal)}`);
      const toppingNames = (item.toppings || []).filter((t) => t.name).map((t) => t.name);
      if (toppingNames.length) lines.push(`  Topping: ${toppingNames.join(", ")}`);
      if (item.note) lines.push(`  Ghi ch\xFA: ${item.note}`);
    }
    lines.push("", `T\u1ED5ng: ${this._formatMoney(total_amount)}`);
    if (timeStr) lines.push(`Th\u1EDDi gian: ${timeStr}`);
    return lines.join("\n");
  }
  async _sendWithRetry(message) {
    const url = `${this.api_base}/bot${this.bot_token}/sendMessage`;
    const payload = { chat_id: this.group_chat_id, text: message };
    let lastError = null;
    for (let attempt = 1; attempt <= ZALO_MAX_ATTEMPTS; attempt++) {
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        let data;
        try {
          data = await resp.json();
        } catch {
          data = {};
        }
        if (resp.ok && data.ok) {
          return { success: true, attempts: attempt, error: null, message_id: data.result?.message_id };
        }
        if (resp.status >= 400 && resp.status < 500) {
          return { success: false, attempts: attempt, error: `HTTP ${resp.status}: ${data.description || "Unknown"}`, message_id: null };
        }
        lastError = `HTTP ${resp.status}: ${data.description || "Unknown"}`;
      } catch (e) {
        lastError = String(e);
      }
      if (attempt < ZALO_MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, ZALO_RETRY_BACKOFF[attempt - 1]));
      }
    }
    return { success: false, attempts: ZALO_MAX_ATTEMPTS, error: lastError, message_id: null };
  }
  async _log(orderId, success, attempts, errorMessage, messageId) {
    try {
      await this.env.DB.prepare(
        `INSERT INTO zalo_notification_logs (order_id, order_type, success, attempts, error_message, response_message_id)
         VALUES (?, 'ship', ?, ?, ?, ?)`
      ).bind(orderId, success ? 1 : 0, attempts, errorMessage || null, messageId || null).run();
    } catch (e) {
      console.warn("ZaloBotNotifier: log write fail:", e);
    }
  }
  async notifyNewShipOrder(orderData) {
    try {
      await this._reloadConfig();
      if (!this.isReady()) return;
      const message = this._formatMessage(orderData);
      const result = await this._sendWithRetry(message);
      try {
        await this._log(orderData.order_id, result.success, result.attempts, result.error, result.message_id);
      } catch {
      }
    } catch (e) {
      console.warn("ZaloBotNotifier: notify fail:", e);
    }
  }
};
async function handleZaloBotTest(env2) {
  const notifier = new ZaloBotNotifier(env2);
  await notifier._reloadConfig();
  if (!notifier.isReady()) {
    return json({
      ok: false,
      message: "Zalo Bot ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh ho\u1EB7c \u0111\xE3 t\u1EAFt. Vui l\xF2ng b\u1EADt v\xE0 \u0111i\u1EC1n Bot Token + Group Chat ID."
    }, 400);
  }
  const testOrderData = {
    order_id: 0,
    display_code: "TEST",
    customer_name: "Kh\xE1ch th\u1EED",
    customer_phone: "0900000000",
    ship_address: "123 \u0110\u01B0\u1EDDng th\u1EED, Qu\u1EADn 1, TP.HCM",
    latitude: null,
    longitude: null,
    items: [
      { product_name: "C\xE0 ph\xEA \u0111en", price: 25e3, quantity: 2, size_name: null, note: "", toppings: [] },
      { product_name: "Tr\xE0 s\u1EEFa tr\xE2n ch\xE2u", price: 45e3, quantity: 1, size_name: "L", note: "\xEDt \u0111\xE1", toppings: [{ name: "Tr\xE2n ch\xE2u tr\u1EAFng", price: 5e3 }] }
    ],
    total_amount: 95e3,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const message = notifier._formatMessage(testOrderData);
  const result = await notifier._sendWithRetry(message);
  return json({
    ok: result.success,
    message: result.success ? "G\u1EEDi th\u1EED th\xE0nh c\xF4ng! Ki\u1EC3m tra nh\xF3m Zalo." : `G\u1EEDi th\u1EED th\u1EA5t b\u1EA1i: ${result.error}`,
    attempts: result.attempts,
    debug_message: message
  });
}
__name(handleZaloBotTest, "handleZaloBotTest");
async function handleDeletePublicItem(env2, orderId, itemId) {
  const item = await env2.DB.prepare(
    `SELECT id, status FROM order_items WHERE id = ? AND order_id = ?`
  ).bind(itemId, orderId).first();
  if (!item) return json({ message: "Kh\xF4ng t\xECm th\u1EA5y m\xF3n" }, 404);
  if (item.status === "completed") return json({ message: "M\xF3n \u0111\xE3 ho\xE0n th\xE0nh, kh\xF4ng th\u1EC3 x\xF3a" }, 400);
  await env2.DB.prepare(`DELETE FROM order_items WHERE id = ?`).bind(itemId).run();
  const remaining = await env2.DB.prepare(
    `SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ?`
  ).bind(orderId).first();
  if ((remaining?.cnt ?? 0) === 0) {
    const order = await env2.DB.prepare(`SELECT table_id FROM orders WHERE id = ?`).bind(orderId).first();
    await env2.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(orderId).run();
    if (order?.table_id) {
      await env2.DB.prepare(`UPDATE tables SET status = 'empty', current_order_id = NULL WHERE id = ?`).bind(order.table_id).run();
    }
  } else {
    await recalcOrderTotal(env2, orderId);
  }
  return json({ success: true });
}
__name(handleDeletePublicItem, "handleDeletePublicItem");
async function handleUpdatePublicItemQuantity(env2, orderId, itemId, body) {
  const item = await env2.DB.prepare(
    `SELECT id, status FROM order_items WHERE id = ? AND order_id = ?`
  ).bind(itemId, orderId).first();
  if (!item) return json({ message: "Kh\xF4ng t\xECm th\u1EA5y m\xF3n" }, 404);
  if (item.status === "completed") return json({ message: "M\xF3n \u0111\xE3 ho\xE0n th\xE0nh" }, 400);
  const qty = body.quantity ?? 0;
  if (qty <= 0) {
    return await handleDeletePublicItem(env2, orderId, itemId);
  }
  await env2.DB.prepare(`UPDATE order_items SET quantity = ? WHERE id = ?`).bind(qty, itemId).run();
  await recalcOrderTotal(env2, orderId);
  return json({ success: true });
}
__name(handleUpdatePublicItemQuantity, "handleUpdatePublicItemQuantity");
async function handlePublicCallStaff(env2, body) {
  if (!body.table_id) return json({ error: "missing_table_id" }, 400);
  const table3 = await env2.DB.prepare("SELECT id FROM tables WHERE id = ?").bind(body.table_id).first();
  if (!table3) return json({ error: "Table not found" }, 404);
  await env2.DB.prepare(
    `INSERT INTO staff_calls (table_id, reason) VALUES (?, ?)`
  ).bind(body.table_id, body.reason ?? "new_customer").run();
  return json({ ok: true });
}
__name(handlePublicCallStaff, "handlePublicCallStaff");
async function handleGetStaffCalls(env2) {
  const todayStart = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const result = await env2.DB.prepare(
    `SELECT sc.id, sc.table_id, sc.reason, sc.created_at, t.name as table_name
     FROM staff_calls sc
     LEFT JOIN tables t ON t.id = sc.table_id
     WHERE sc.created_at >= ?
     ORDER BY sc.created_at DESC`
  ).bind(todayStart).all();
  return json(result.results.map((r) => ({
    id: r.id,
    table_id: r.table_id,
    table_name: r.table_name,
    reason: r.reason,
    created_at: isoTs(r.created_at)
  })));
}
__name(handleGetStaffCalls, "handleGetStaffCalls");
async function handleResolveStaffCall(env2, callId) {
  const existing = await env2.DB.prepare("SELECT id FROM staff_calls WHERE id = ?").bind(callId).first();
  if (!existing) return json({ message: "Kh\xF4ng t\xECm th\u1EA5y staff call" }, 404);
  await env2.DB.prepare("DELETE FROM staff_calls WHERE id = ?").bind(callId).run();
  return json({ success: true });
}
__name(handleResolveStaffCall, "handleResolveStaffCall");
async function handleCashierTakeawayList(env2, statusParam) {
  const todayStart = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const statusFilter = statusParam === "completed" ? "completed" : "pending";
  const ordersResult = await env2.DB.prepare(
    `SELECT id, order_type, display_code, customer_name, customer_phone, ship_address, latitude, longitude, ship_notes, total, status, payment_method, created_at
     FROM orders
     WHERE table_id IS NULL AND status = ? AND created_at >= ?
     ORDER BY created_at ASC`
  ).bind(statusFilter, todayStart).all();
  const orderIds = ordersResult.results.map((o) => o.id);
  let itemsByOrder = /* @__PURE__ */ new Map();
  if (orderIds.length > 0) {
    const ph = orderIds.map(() => "?").join(",");
    const itemsResult = await env2.DB.prepare(
      `SELECT oi.id, oi.order_id, oi.product_name, oi.quantity, oi.price, oi.status, oi.size_name, oi.note
       FROM order_items oi WHERE oi.order_id IN (${ph}) ORDER BY oi.id ASC`
    ).bind(...orderIds).all();
    const itemIds = itemsResult.results.map((i) => i.id);
    let toppingsByItem = /* @__PURE__ */ new Map();
    if (itemIds.length > 0) {
      const tph = itemIds.map(() => "?").join(",");
      const tResult = await env2.DB.prepare(
        `SELECT oit.order_item_id, p.name FROM order_item_toppings oit
         LEFT JOIN products p ON p.id = oit.product_id
         WHERE oit.order_item_id IN (${tph})`
      ).bind(...itemIds).all();
      for (const t of tResult.results) {
        if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
        if (t.name) toppingsByItem.get(t.order_item_id).push(t.name);
      }
    }
    for (const it of itemsResult.results) {
      if (!itemsByOrder.has(it.order_id)) itemsByOrder.set(it.order_id, []);
      itemsByOrder.get(it.order_id).push({
        id: it.id,
        name: it.product_name,
        quantity: it.quantity,
        price: it.price,
        status: it.status,
        size_name: it.size_name,
        note: it.note,
        toppings: toppingsByItem.get(it.id) || []
      });
    }
  }
  return json(ordersResult.results.map((o) => ({
    id: o.id,
    order_type: o.order_type || "takeaway",
    display_code: o.display_code || `${o.order_type || "mv"}${o.id}`,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    ship_address: o.ship_address,
    latitude: o.latitude,
    longitude: o.longitude,
    ship_notes: o.ship_notes,
    total_amount: o.total,
    status: o.status,
    payment_method: o.payment_method,
    created_at: isoTs(o.created_at),
    items: itemsByOrder.get(o.id) || []
  })));
}
__name(handleCashierTakeawayList, "handleCashierTakeawayList");
async function handleCashierTakeawayComplete(env2, orderId, body) {
  const order = await env2.DB.prepare(
    `SELECT id, table_id, status FROM orders WHERE id = ?`
  ).bind(orderId).first();
  if (!order) return json({ message: "Kh\xF4ng t\xECm th\u1EA5y \u0111\u01A1n h\xE0ng" }, 404);
  if (order.table_id !== null) return json({ message: "\u0110\u01A1n n\xE0y kh\xF4ng ph\u1EA3i \u0111\u01A1n mang v\u1EC1" }, 400);
  const pm = body.payment_method;
  if (pm && !["cash", "transfer"].includes(pm)) {
    return json({ message: "payment_method kh\xF4ng h\u1EE3p l\u1EC7" }, 400);
  }
  if (pm === "transfer") {
    await env2.DB.prepare(`UPDATE orders SET payment_method = ?, payment_status = 'paid', status = 'completed' WHERE id = ?`).bind(pm, orderId).run();
  } else if (pm) {
    await env2.DB.prepare(`UPDATE orders SET payment_method = ?, status = 'completed' WHERE id = ?`).bind(pm, orderId).run();
  } else {
    await env2.DB.prepare(`UPDATE orders SET status = 'completed' WHERE id = ?`).bind(orderId).run();
  }
  await env2.DB.prepare(`UPDATE order_items SET status = 'completed' WHERE order_id = ? AND status != 'completed'`).bind(orderId).run();
  return json({ success: true, message: "\u0110\xE3 ho\xE0n th\xE0nh \u0111\u01A1n mang v\u1EC1" });
}
__name(handleCashierTakeawayComplete, "handleCashierTakeawayComplete");
async function handleGetSettings(env2) {
  const r = await env2.DB.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  for (const row of r.results) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  delete settings.zalo_bot;
  return json(settings);
}
__name(handleGetSettings, "handleGetSettings");
async function handleTakeawayMenu(env2) {
  const categoriesResult = await env2.DB.prepare(
    `SELECT id, name, sort_order, production_unit, allow_all_toppings
     FROM categories ORDER BY
     CASE production_unit WHEN 'counter' THEN 0 WHEN 'kitchen' THEN 1 ELSE 2 END,
     sort_order, id`
  ).all();
  const productsResult = await env2.DB.prepare(
    `SELECT id, category_id, name, price, image_url, available, is_topping, production_unit
     FROM products WHERE available = 1`
  ).all();
  const BATCH = 80;
  const productIds = productsResult.results.map((p) => p.id);
  let sizesByProduct = /* @__PURE__ */ new Map();
  for (let i = 0; i < productIds.length; i += BATCH) {
    const chunk = productIds.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const sizesResult = await env2.DB.prepare(
      `SELECT id, product_id, name, price FROM product_sizes WHERE product_id IN (${placeholders}) ORDER BY sort_order, id`
    ).bind(...chunk).all();
    for (const s of sizesResult.results) {
      if (!sizesByProduct.has(s.product_id)) sizesByProduct.set(s.product_id, []);
      sizesByProduct.get(s.product_id).push({ id: s.id, name: s.name, price: s.price });
    }
  }
  const catIds = categoriesResult.results.map((c) => c.id);
  let toppingsByCategory = /* @__PURE__ */ new Map();
  for (let i = 0; i < catIds.length; i += BATCH) {
    const chunk = catIds.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const ctResult = await env2.DB.prepare(
      `SELECT category_id, product_id FROM category_toppings WHERE category_id IN (${placeholders})`
    ).bind(...chunk).all();
    for (const r of ctResult.results) {
      if (!toppingsByCategory.has(r.category_id)) toppingsByCategory.set(r.category_id, []);
      toppingsByCategory.get(r.category_id).push(r.product_id);
    }
  }
  const categories = categoriesResult.results.map((c) => ({
    ...c,
    allowed_toppings: toppingsByCategory.get(c.id) || []
  }));
  const products = productsResult.results.map((p) => ({
    ...p,
    sizes: sizesByProduct.get(p.id) || []
  }));
  return json({
    store: { name: env2.STORE_NAME },
    categories,
    products
  });
}
__name(handleTakeawayMenu, "handleTakeawayMenu");
async function handleCreateTakeawayOrder(env2, body) {
  if (!body.client_id || !body.items?.length) {
    return json({ message: "Thieu thong tin" }, 400);
  }
  let order = await env2.DB.prepare(
    `SELECT id, display_code, customer_name FROM orders
     WHERE table_id IS NULL AND order_type = 'takeaway' AND client_id = ?
       AND status IN ('pending', 'processing')
     ORDER BY created_at ASC LIMIT 1`
  ).bind(body.client_id).first();
  let isNewOrder = false;
  if (!order) {
    const todayStart = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const countRow = await env2.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM orders
       WHERE table_id IS NULL AND order_type = 'takeaway'
         AND created_at >= ?`
    ).bind(todayStart).first();
    const displayCode = `mv${(countRow?.cnt ?? 0) + 1}`;
    const inserted = await env2.DB.prepare(
      `INSERT INTO orders (table_id, order_type, total, status, client_id, customer_name, display_code, table_position)
       VALUES (NULL, 'takeaway', 0, 'pending', ?, ?, ?, 'A') RETURNING id`
    ).bind(body.client_id, body.customer_name ?? null, displayCode).first();
    if (!inserted) return json({ message: "Khong tao duoc don" }, 500);
    order = { id: inserted.id, display_code: displayCode, customer_name: body.customer_name ?? null };
    isNewOrder = true;
  } else if (body.customer_name) {
    await env2.DB.prepare(`UPDATE orders SET customer_name = ? WHERE id = ?`).bind(body.customer_name, order.id).run();
    order.customer_name = body.customer_name;
  }
  const menuData = await getMenuData(env2);
  const productsById = menuData.productsById;
  const sizesById = menuData.sizesById;
  const toppingsById = menuData.toppingsById;
  const allowAllByCategory = menuData.allowAllByCategory;
  const allowedToppingsByCategory = menuData.allowedToppingsByCategory;
  for (const it of body.items) {
    const product = productsById.get(it.product_id);
    if (!product || !product.available) continue;
    let itemPrice = product.price;
    let sizeName = null;
    if (it.size_id) {
      const size = sizesById.get(it.size_id);
      if (size && size.product_id === product.id) {
        itemPrice = size.price;
        sizeName = size.name;
      }
    }
    const qty = it.quantity ?? 1;
    const notes = it.notes ?? "";
    const inserted = await env2.DB.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, status, size_name, note)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?) RETURNING id`
    ).bind(order.id, product.id, product.name, itemPrice, qty, sizeName, notes || null).first();
    if (!inserted) continue;
    const toppingEntries = it.toppings ?? [];
    const allowAll = allowAllByCategory.get(product.category_id) ?? 0;
    const allowedSet = allowedToppingsByCategory.get(product.category_id);
    for (const tEntry of toppingEntries) {
      const tid = typeof tEntry === "number" ? tEntry : tEntry.id;
      const tqty = typeof tEntry === "number" ? 1 : tEntry.quantity || 1;
      const tp = toppingsById.get(tid);
      if (!tp) continue;
      if (!allowAll && allowedSet && !allowedSet.has(tid)) continue;
      try {
        await env2.DB.prepare(
          `INSERT INTO order_item_toppings (order_item_id, product_id, price, quantity) VALUES (?, ?, ?, ?)`
        ).bind(inserted.id, tid, tp.price, tqty).run();
      } catch {
        await env2.DB.prepare(
          `INSERT INTO order_item_toppings (order_item_id, product_id, price) VALUES (?, ?, ?)`
        ).bind(inserted.id, tid, tp.price).run();
      }
    }
  }
  await recalcOrderTotal(env2, order.id);
  const finalTotal = (await env2.DB.prepare("SELECT total FROM orders WHERE id = ?").bind(order.id).first())?.total ?? 0;
  return json({
    message: "Dat mon thanh cong",
    order_id: order.id,
    total_amount: finalTotal,
    display_code: order.display_code,
    is_new_order: isNewOrder
  }, 201);
}
__name(handleCreateTakeawayOrder, "handleCreateTakeawayOrder");
async function handleTakeawayItems(env2, clientId) {
  const todayStart = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const result = await env2.DB.prepare(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.price, oi.quantity,
            oi.note, oi.status, oi.size_name, o.created_at AS order_created_at
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.client_id = ? AND o.status IN ('pending', 'processing')
       AND o.created_at >= ? AND oi.status IN ('pending', 'processing', 'completed')
     ORDER BY oi.id DESC`
  ).bind(clientId, todayStart).all();
  const itemIds = result.results.map((r) => r.id);
  let toppingsByItem = /* @__PURE__ */ new Map();
  if (itemIds.length > 0) {
    const placeholders = itemIds.map(() => "?").join(",");
    const tResult = await env2.DB.prepare(
      `SELECT oit.order_item_id, p.name FROM order_item_toppings oit
       JOIN products p ON p.id = oit.product_id
       WHERE oit.order_item_id IN (${placeholders})`
    ).bind(...itemIds).all();
    for (const t of tResult.results) {
      if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
      toppingsByItem.get(t.order_item_id).push(t.name);
    }
  }
  return json(result.results.map((it) => ({
    id: it.id,
    order_id: it.order_id,
    product_id: it.product_id,
    name: it.product_name,
    quantity: it.quantity,
    price: it.price,
    status: it.status,
    size_name: it.size_name,
    notes: it.note,
    toppings: toppingsByItem.get(it.id) || [],
    created_at: isoTs(it.order_created_at)
  })));
}
__name(handleTakeawayItems, "handleTakeawayItems");
async function handleDeleteTakeawayItem(env2, orderId, itemId, requestClientId) {
  const order = await env2.DB.prepare(
    `SELECT id, client_id FROM orders WHERE id = ? AND order_type = 'takeaway'`
  ).bind(orderId).first();
  if (!order) return json({ message: "Khong tim thay don hang" }, 404);
  if (order.client_id && requestClientId !== order.client_id) {
    return json({ message: "Khong the xoa mon cua nguoi khac" }, 403);
  }
  const item = await env2.DB.prepare(
    `SELECT id, status FROM order_items WHERE id = ? AND order_id = ?`
  ).bind(itemId, orderId).first();
  if (!item) return json({ message: "Khong tim thay mon" }, 404);
  if (item.status === "completed") return json({ message: "Khong the xoa mon da phuc vu" }, 400);
  await env2.DB.prepare(`DELETE FROM order_item_toppings WHERE order_item_id = ?`).bind(itemId).run();
  await env2.DB.prepare(`DELETE FROM order_items WHERE id = ?`).bind(itemId).run();
  const remaining = await env2.DB.prepare(
    `SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ?`
  ).bind(orderId).first();
  if ((remaining?.cnt ?? 0) === 0) {
    await env2.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(orderId).run();
  } else {
    await recalcOrderTotal(env2, orderId);
  }
  return json({ message: "Da xoa mon" }, 200);
}
__name(handleDeleteTakeawayItem, "handleDeleteTakeawayItem");
async function handleUpdateTakeawayItemQuantity(env2, orderId, itemId, requestClientId, body) {
  const order = await env2.DB.prepare(
    `SELECT id, client_id FROM orders WHERE id = ? AND order_type = 'takeaway'`
  ).bind(orderId).first();
  if (!order) return json({ message: "Khong tim thay don hang" }, 404);
  if (order.client_id && requestClientId !== order.client_id) {
    return json({ message: "Khong the sua mon cua nguoi khac" }, 403);
  }
  const item = await env2.DB.prepare(
    `SELECT id, status FROM order_items WHERE id = ? AND order_id = ?`
  ).bind(itemId, orderId).first();
  if (!item) return json({ message: "Khong tim thay mon" }, 404);
  if (item.status === "completed") return json({ message: "Khong the sua mon da phuc vu" }, 400);
  const qty = body.quantity ?? 0;
  if (qty <= 0) {
    return await handleDeleteTakeawayItem(env2, orderId, itemId, requestClientId);
  }
  await env2.DB.prepare(`UPDATE order_items SET quantity = ? WHERE id = ?`).bind(qty, itemId).run();
  await recalcOrderTotal(env2, orderId);
  const totalRow = await env2.DB.prepare(`SELECT total FROM orders WHERE id = ?`).bind(orderId).first();
  return json({ message: "Da cap nhat so luong", total_amount: totalRow?.total ?? 0 }, 200);
}
__name(handleUpdateTakeawayItemQuantity, "handleUpdateTakeawayItemQuantity");
async function isShipEnabled(env2) {
  const row = await env2.DB.prepare(`SELECT value FROM settings WHERE key = 'ship_enabled'`).first();
  if (!row) return true;
  try {
    return JSON.parse(row.value) !== false;
  } catch {
    return row.value !== "false";
  }
}
__name(isShipEnabled, "isShipEnabled");
async function shipDisabledResponse(env2) {
  const reasonRow = await env2.DB.prepare(`SELECT value FROM settings WHERE key = 'ship_disable_reason'`).first();
  let reason = null;
  if (reasonRow) {
    try {
      reason = JSON.parse(reasonRow.value);
    } catch {
      reason = reasonRow.value;
    }
  }
  const message = reason || "Qu\xE1n \u0111ang t\u1EA1m d\u1EEBng nh\u1EADn \u0111\u01A1n ship";
  return json({
    message: "Qu\xE1n \u0111ang t\u1EA1m d\u1EEBng nh\u1EADn \u0111\u01A1n ship",
    ship_disable_message: message,
    ship_enabled: false
  }, 403);
}
__name(shipDisabledResponse, "shipDisabledResponse");
async function handleShipMenu(env2) {
  const categoriesResult = await env2.DB.prepare(
    `SELECT id, name, sort_order, production_unit, allow_all_toppings
     FROM categories ORDER BY
     CASE production_unit WHEN 'counter' THEN 0 WHEN 'kitchen' THEN 1 ELSE 2 END,
     sort_order, id`
  ).all();
  const productsResult = await env2.DB.prepare(
    `SELECT id, category_id, name, price, image_url, available, is_topping, production_unit
     FROM products WHERE available = 1`
  ).all();
  const BATCH = 80;
  const productIds = productsResult.results.map((p) => p.id);
  let sizesByProduct = /* @__PURE__ */ new Map();
  for (let i = 0; i < productIds.length; i += BATCH) {
    const chunk = productIds.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const sizesResult = await env2.DB.prepare(
      `SELECT id, product_id, name, price FROM product_sizes WHERE product_id IN (${placeholders}) ORDER BY sort_order, id`
    ).bind(...chunk).all();
    for (const s of sizesResult.results) {
      if (!sizesByProduct.has(s.product_id)) sizesByProduct.set(s.product_id, []);
      sizesByProduct.get(s.product_id).push({ id: s.id, name: s.name, price: s.price });
    }
  }
  const catIds = categoriesResult.results.map((c) => c.id);
  let toppingsByCategory = /* @__PURE__ */ new Map();
  for (let i = 0; i < catIds.length; i += BATCH) {
    const chunk = catIds.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const ctResult = await env2.DB.prepare(
      `SELECT category_id, product_id FROM category_toppings WHERE category_id IN (${placeholders})`
    ).bind(...chunk).all();
    for (const r of ctResult.results) {
      if (!toppingsByCategory.has(r.category_id)) toppingsByCategory.set(r.category_id, []);
      toppingsByCategory.get(r.category_id).push(r.product_id);
    }
  }
  const categories = categoriesResult.results.map((c) => ({
    ...c,
    allowed_toppings: toppingsByCategory.get(c.id) || []
  }));
  const products = productsResult.results.map((p) => ({
    ...p,
    sizes: sizesByProduct.get(p.id) || []
  }));
  return json({
    store: { name: env2.STORE_NAME },
    categories,
    products
  });
}
__name(handleShipMenu, "handleShipMenu");
async function handleCreateShipOrder(env2, body, ctx) {
  if (!await isShipEnabled(env2)) return shipDisabledResponse(env2);
  if (!body.client_id || !body.items?.length) {
    return json({ message: "Thieu thong tin" }, 400);
  }
  if (!body.customer_phone) {
    return json({ message: "Thieu so dien thoai" }, 400);
  }
  if (!body.ship_address) {
    return json({ message: "Thieu dia chi giao hang" }, 400);
  }
  let order = await env2.DB.prepare(
    `SELECT id, display_code, customer_name FROM orders
     WHERE table_id IS NULL AND order_type = 'ship' AND client_id = ?
       AND status IN ('pending', 'processing')
     ORDER BY created_at ASC LIMIT 1`
  ).bind(body.client_id).first();
  let isNewOrder = false;
  if (!order) {
    const todayStart = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const countRow = await env2.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM orders
       WHERE table_id IS NULL AND order_type = 'ship'
         AND created_at >= ?`
    ).bind(todayStart).first();
    const displayCode = `ship${(countRow?.cnt ?? 0) + 1}`;
    const inserted = await env2.DB.prepare(
      `INSERT INTO orders (table_id, order_type, total, status, client_id, customer_name, customer_phone,
                           ship_address, latitude, longitude, ship_notes, display_code, table_position)
       VALUES (NULL, 'ship', 0, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, 'A') RETURNING id`
    ).bind(
      body.client_id,
      body.customer_name ?? null,
      body.customer_phone,
      body.ship_address,
      body.latitude ?? null,
      body.longitude ?? null,
      body.ship_notes ?? null,
      displayCode
    ).first();
    if (!inserted) return json({ message: "Khong tao duoc don" }, 500);
    order = { id: inserted.id, display_code: displayCode, customer_name: body.customer_name ?? null };
    isNewOrder = true;
  } else {
    await env2.DB.prepare(
      `UPDATE orders SET
         customer_name = COALESCE(?, customer_name),
         customer_phone = COALESCE(?, customer_phone),
         ship_address = COALESCE(?, ship_address),
         latitude = COALESCE(?, latitude),
         longitude = COALESCE(?, longitude),
         ship_notes = COALESCE(?, ship_notes)
       WHERE id = ?`
    ).bind(
      body.customer_name ?? null,
      body.customer_phone ?? null,
      body.ship_address ?? null,
      body.latitude ?? null,
      body.longitude ?? null,
      body.ship_notes ?? null,
      order.id
    ).run();
    if (body.customer_name) order.customer_name = body.customer_name;
  }
  const menuData = await getMenuData(env2);
  const productsById = menuData.productsById;
  const sizesById = menuData.sizesById;
  const toppingsById = menuData.toppingsById;
  const allowAllByCategory = menuData.allowAllByCategory;
  const allowedToppingsByCategory = menuData.allowedToppingsByCategory;
  for (const it of body.items) {
    const product = productsById.get(it.product_id);
    if (!product || !product.available) continue;
    let itemPrice = product.price;
    let sizeName = null;
    if (it.size_id) {
      const size = sizesById.get(it.size_id);
      if (size && size.product_id === product.id) {
        itemPrice = size.price;
        sizeName = size.name;
      }
    }
    const qty = it.quantity ?? 1;
    const notes = it.notes ?? "";
    const inserted = await env2.DB.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, status, size_name, note)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?) RETURNING id`
    ).bind(order.id, product.id, product.name, itemPrice, qty, sizeName, notes || null).first();
    if (!inserted) continue;
    const toppingEntries = it.toppings ?? [];
    const allowAll = allowAllByCategory.get(product.category_id) ?? 0;
    const allowedSet = allowedToppingsByCategory.get(product.category_id);
    for (const tEntry of toppingEntries) {
      const tid = typeof tEntry === "number" ? tEntry : tEntry.id;
      const tqty = typeof tEntry === "number" ? 1 : tEntry.quantity || 1;
      const tp = toppingsById.get(tid);
      if (!tp) continue;
      if (!allowAll && allowedSet && !allowedSet.has(tid)) continue;
      try {
        await env2.DB.prepare(
          `INSERT INTO order_item_toppings (order_item_id, product_id, price, quantity) VALUES (?, ?, ?, ?)`
        ).bind(inserted.id, tid, tp.price, tqty).run();
      } catch {
        await env2.DB.prepare(
          `INSERT INTO order_item_toppings (order_item_id, product_id, price) VALUES (?, ?, ?)`
        ).bind(inserted.id, tid, tp.price).run();
      }
    }
  }
  await recalcOrderTotal(env2, order.id);
  const finalTotal = (await env2.DB.prepare("SELECT total FROM orders WHERE id = ?").bind(order.id).first())?.total ?? 0;
  if (isNewOrder) {
    const notifier = new ZaloBotNotifier(env2);
    const notifyItems = await env2.DB.prepare(
      `SELECT oi.id, oi.product_name, oi.price, oi.quantity, oi.size_name, oi.note
       FROM order_items oi WHERE oi.order_id = ?`
    ).bind(order.id).all();
    const itemIds = notifyItems.results.map((i) => i.id);
    let toppingsByItem = /* @__PURE__ */ new Map();
    if (itemIds.length > 0) {
      const ph = itemIds.map(() => "?").join(",");
      const tRes = await env2.DB.prepare(
        `SELECT oit.order_item_id, p.name, oit.price FROM order_item_toppings oit
         JOIN products p ON p.id = oit.product_id WHERE oit.order_item_id IN (${ph})`
      ).bind(...itemIds).all();
      for (const t of tRes.results) {
        if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
        toppingsByItem.get(t.order_item_id).push({ name: t.name, price: t.price });
      }
    }
    const notifyData = {
      order_id: order.id,
      display_code: order.display_code,
      customer_name: order.customer_name,
      customer_phone: body.customer_phone,
      ship_address: body.ship_address,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      items: notifyItems.results.map((it) => ({
        product_name: it.product_name,
        price: it.price,
        quantity: it.quantity,
        size_name: it.size_name,
        note: it.note,
        toppings: toppingsByItem.get(it.id) || []
      })),
      total_amount: finalTotal,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(notifier.notifyNewShipOrder(notifyData));
    } else {
      notifier.notifyNewShipOrder(notifyData).catch(() => {
      });
    }
  }
  return json({
    message: "Dat mon thanh cong",
    order_id: order.id,
    total_amount: finalTotal,
    display_code: order.display_code,
    is_new_order: isNewOrder
  }, 201);
}
__name(handleCreateShipOrder, "handleCreateShipOrder");
async function handleShipItems(env2, clientId) {
  const todayStart = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const result = await env2.DB.prepare(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.price, oi.quantity,
            oi.note, oi.status, oi.size_name, o.created_at AS order_created_at
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.client_id = ? AND o.order_type = 'ship'
       AND o.status IN ('pending', 'processing')
       AND o.created_at >= ? AND oi.status IN ('pending', 'processing', 'completed')
     ORDER BY oi.id DESC`
  ).bind(clientId, todayStart).all();
  const itemIds = result.results.map((r) => r.id);
  let toppingsByItem = /* @__PURE__ */ new Map();
  if (itemIds.length > 0) {
    const placeholders = itemIds.map(() => "?").join(",");
    const tResult = await env2.DB.prepare(
      `SELECT oit.order_item_id, p.name FROM order_item_toppings oit
       JOIN products p ON p.id = oit.product_id
       WHERE oit.order_item_id IN (${placeholders})`
    ).bind(...itemIds).all();
    for (const t of tResult.results) {
      if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
      toppingsByItem.get(t.order_item_id).push(t.name);
    }
  }
  return json(result.results.map((it) => ({
    id: it.id,
    order_id: it.order_id,
    product_id: it.product_id,
    name: it.product_name,
    quantity: it.quantity,
    price: it.price,
    status: it.status,
    size_name: it.size_name,
    notes: it.note,
    toppings: toppingsByItem.get(it.id) || [],
    created_at: isoTs(it.order_created_at)
  })));
}
__name(handleShipItems, "handleShipItems");
async function handleDeleteShipItem(env2, orderId, itemId, requestClientId) {
  if (!await isShipEnabled(env2)) return shipDisabledResponse(env2);
  const order = await env2.DB.prepare(
    `SELECT id, client_id FROM orders WHERE id = ? AND order_type = 'ship'`
  ).bind(orderId).first();
  if (!order) return json({ message: "Khong tim thay don hang" }, 404);
  if (order.client_id && requestClientId !== order.client_id) {
    return json({ message: "Khong the xoa mon cua nguoi khac" }, 403);
  }
  const item = await env2.DB.prepare(
    `SELECT id, status FROM order_items WHERE id = ? AND order_id = ?`
  ).bind(itemId, orderId).first();
  if (!item) return json({ message: "Khong tim thay mon" }, 404);
  if (item.status === "completed") return json({ message: "Khong the xoa mon da phuc vu" }, 400);
  await env2.DB.prepare(`DELETE FROM order_item_toppings WHERE order_item_id = ?`).bind(itemId).run();
  await env2.DB.prepare(`DELETE FROM order_items WHERE id = ?`).bind(itemId).run();
  const remaining = await env2.DB.prepare(
    `SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ?`
  ).bind(orderId).first();
  if ((remaining?.cnt ?? 0) === 0) {
    await env2.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(orderId).run();
  } else {
    await recalcOrderTotal(env2, orderId);
  }
  return json({ message: "Da xoa mon" }, 200);
}
__name(handleDeleteShipItem, "handleDeleteShipItem");
async function handleUpdateShipItemQuantity(env2, orderId, itemId, requestClientId, body) {
  if (!await isShipEnabled(env2)) return shipDisabledResponse(env2);
  const order = await env2.DB.prepare(
    `SELECT id, client_id FROM orders WHERE id = ? AND order_type = 'ship'`
  ).bind(orderId).first();
  if (!order) return json({ message: "Khong tim thay don hang" }, 404);
  if (order.client_id && requestClientId !== order.client_id) {
    return json({ message: "Khong the sua mon cua nguoi khac" }, 403);
  }
  const item = await env2.DB.prepare(
    `SELECT id, status FROM order_items WHERE id = ? AND order_id = ?`
  ).bind(itemId, orderId).first();
  if (!item) return json({ message: "Khong tim thay mon" }, 404);
  if (item.status === "completed") return json({ message: "Khong the sua mon da phuc vu" }, 400);
  const qty = body.quantity ?? 0;
  if (qty <= 0) {
    return await handleDeleteShipItem(env2, orderId, itemId, requestClientId);
  }
  await env2.DB.prepare(`UPDATE order_items SET quantity = ? WHERE id = ?`).bind(qty, itemId).run();
  await recalcOrderTotal(env2, orderId);
  const totalRow = await env2.DB.prepare(`SELECT total FROM orders WHERE id = ?`).bind(orderId).first();
  return json({ message: "Da cap nhat so luong", total_amount: totalRow?.total ?? 0 }, 200);
}
__name(handleUpdateShipItemQuantity, "handleUpdateShipItemQuantity");
async function buildShipOrderDetail(env2, orderId) {
  const o = await env2.DB.prepare(
    `SELECT id, display_code, customer_name, customer_phone, ship_address, latitude, longitude,
            ship_notes, ship_voice_url, total, status, created_at
     FROM orders WHERE id = ? AND order_type = 'ship'`
  ).bind(orderId).first();
  if (!o) return null;
  const itemsResult = await env2.DB.prepare(
    `SELECT oi.id, oi.product_name, oi.quantity, oi.price, oi.size_name, oi.note
     FROM order_items oi
     WHERE oi.order_id = ? AND oi.status != 'completed'`
  ).bind(orderId).all();
  const itemIds = itemsResult.results.map((i) => i.id);
  let toppingsByItem = /* @__PURE__ */ new Map();
  if (itemIds.length > 0) {
    const ph = itemIds.map(() => "?").join(",");
    const tResult = await env2.DB.prepare(
      `SELECT oit.order_item_id, p.name FROM order_item_toppings oit
       JOIN products p ON p.id = oit.product_id
       WHERE oit.order_item_id IN (${ph})`
    ).bind(...itemIds).all();
    for (const t of tResult.results) {
      if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
      toppingsByItem.get(t.order_item_id).push(t.name);
    }
  }
  const items = itemsResult.results.map((i) => ({
    id: i.id,
    name: i.product_name,
    quantity: i.quantity,
    price: i.price,
    size_name: i.size_name,
    toppings: toppingsByItem.get(i.id) || [],
    notes: i.note
  }));
  return {
    id: o.id,
    display_code: o.display_code || `ship${o.id}`,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    ship_address: o.ship_address,
    latitude: o.latitude,
    longitude: o.longitude,
    ship_notes: o.ship_notes,
    ship_voice_url: o.ship_voice_url,
    total_amount: o.total,
    status: o.status,
    created_at: isoTs(o.created_at),
    items
  };
}
__name(buildShipOrderDetail, "buildShipOrderDetail");
async function handleGetShipOrders(env2) {
  const todayStart = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const orders = await env2.DB.prepare(
    `SELECT id FROM orders
     WHERE table_id IS NULL AND order_type = 'ship' AND status = 'pending'
       AND created_at >= ?
     ORDER BY created_at ASC`
  ).bind(todayStart).all();
  const results = [];
  for (const o of orders.results) {
    const detail = await buildShipOrderDetail(env2, o.id);
    if (detail) results.push(detail);
  }
  return json(results);
}
__name(handleGetShipOrders, "handleGetShipOrders");
async function handleGetTransferOrders(env2) {
  const todayStart = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const orders = await env2.DB.prepare(
    `SELECT id FROM orders
     WHERE table_id IS NULL AND order_type = 'ship' AND status = 'awaiting_transfer'
       AND created_at >= ?
     ORDER BY created_at ASC`
  ).bind(todayStart).all();
  const results = [];
  for (const o of orders.results) {
    const detail = await buildShipOrderDetail(env2, o.id);
    if (detail) results.push(detail);
  }
  return json(results);
}
__name(handleGetTransferOrders, "handleGetTransferOrders");
async function handlePayCashShipOrder(env2, orderId) {
  const order = await env2.DB.prepare(
    `SELECT id, status FROM orders WHERE id = ? AND order_type = 'ship'`
  ).bind(orderId).first();
  if (!order) return json({ message: "Khong tim thay don hang" }, 404);
  if (order.status !== "pending") {
    return json({ message: "Don khong o trang thai cho xu ly" }, 400);
  }
  await env2.DB.prepare(`UPDATE orders SET status = 'completed' WHERE id = ?`).bind(orderId).run();
  await env2.DB.prepare(`UPDATE order_items SET status = 'completed' WHERE order_id = ? AND status != 'completed'`).bind(orderId).run();
  return json({ message: "Da hoan tat don (tien mat)", order_id: orderId, status: "completed" });
}
__name(handlePayCashShipOrder, "handlePayCashShipOrder");
async function handlePayTransferShipOrder(env2, orderId) {
  const order = await env2.DB.prepare(
    `SELECT id, status FROM orders WHERE id = ? AND order_type = 'ship'`
  ).bind(orderId).first();
  if (!order) return json({ message: "Khong tim thay don hang" }, 404);
  if (order.status !== "pending") {
    return json({ message: "Don khong o trang thai cho xu ly" }, 400);
  }
  await env2.DB.prepare(`UPDATE orders SET status = 'awaiting_transfer' WHERE id = ?`).bind(orderId).run();
  return json({ message: "Da chuyen sang cho chuyen khoan", order_id: orderId, status: "awaiting_transfer" });
}
__name(handlePayTransferShipOrder, "handlePayTransferShipOrder");
async function handleConfirmTransferShipOrder(env2, orderId) {
  const order = await env2.DB.prepare(
    `SELECT id, status FROM orders WHERE id = ? AND order_type = 'ship'`
  ).bind(orderId).first();
  if (!order) return json({ message: "Khong tim thay don hang" }, 404);
  if (order.status !== "awaiting_transfer") {
    return json({ message: "Don khong o trang thai cho chuyen khoan" }, 400);
  }
  await env2.DB.prepare(`UPDATE orders SET status = 'completed' WHERE id = ?`).bind(orderId).run();
  await env2.DB.prepare(`UPDATE order_items SET status = 'completed' WHERE order_id = ? AND status != 'completed'`).bind(orderId).run();
  return json({ message: "Da xac nhan nhan tien chuyen khoan", order_id: orderId, status: "completed" });
}
__name(handleConfirmTransferShipOrder, "handleConfirmTransferShipOrder");
var VALID_PRODUCTION_UNITS = ["counter", "kitchen"];
function requireRole(auth, roles) {
  if (!auth.valid) return auth.error ?? json({ message: "Thi\u1EBFu token" }, 401);
  if (!roles.includes(auth.user.role)) {
    return json({ message: "Kh\xF4ng c\xF3 quy\u1EC1n truy c\u1EADp" }, 403);
  }
  return null;
}
__name(requireRole, "requireRole");
async function hashPassword(password, salt) {
  return sha256Hex(salt + password);
}
__name(hashPassword, "hashPassword");
function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(randomSalt, "randomSalt");
async function handleAdminGetUsers(env2) {
  const result = await env2.DB.prepare(
    `SELECT id, username, role, full_name, hourly_rate,
            CASE WHEN pin IS NOT NULL AND pin != '' THEN 1 ELSE 0 END AS has_pin
     FROM users ORDER BY id`
  ).all();
  return json(result.results.map((u) => ({ ...u, full_name: u.full_name ?? null })));
}
__name(handleAdminGetUsers, "handleAdminGetUsers");
function validPin(pin) {
  return typeof pin === "string" && /^[0-9]{4,6}$/.test(pin.trim());
}
__name(validPin, "validPin");
async function handleAdminAddUser(env2, body) {
  if (!body.username || !body.password) {
    return json({ message: "Username v\xE0 password l\xE0 b\u1EAFt bu\u1ED9c" }, 400);
  }
  const existing = await env2.DB.prepare("SELECT id FROM users WHERE username = ?").bind(body.username).first();
  if (existing) return json({ message: "Username already exists" }, 400);
  const role = body.role ?? "staff";
  const pin = body.pin == null || body.pin === "" ? null : String(body.pin).trim();
  if (pin !== null && !validPin(pin)) {
    return json({ message: "PIN ch\u1EA5m c\xF4ng ph\u1EA3i l\xE0 4-6 ch\u1EEF s\u1ED1" }, 400);
  }
  const salt = randomSalt();
  const passwordHash = await hashPassword(body.password, salt);
  const result = await env2.DB.prepare(
    `INSERT INTO users (username, password_hash, salt, full_name, role, pin, hourly_rate) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    body.username,
    passwordHash,
    salt,
    body.full_name ?? null,
    role,
    pin,
    Math.max(0, Math.round(Number(body.hourly_rate) || 0))
  ).first();
  if (!result) return json({ message: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c ng\u01B0\u1EDDi d\xF9ng" }, 500);
  return json({ message: "User added successful", id: result.id }, 201);
}
__name(handleAdminAddUser, "handleAdminAddUser");
async function handleAdminUpdateDeleteUser(env2, userId, request) {
  const user = await env2.DB.prepare("SELECT id, username, full_name, role FROM users WHERE id = ?").bind(userId).first();
  if (!user) return json({ message: "User not found" }, 404);
  if (request.method === "DELETE") {
    if (user.username === "admin") {
      return json({ message: "Cannot delete main admin" }, 400);
    }
    await env2.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
    await env2.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
    return json({ message: "User deleted" });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const fullName = body.full_name ?? user.full_name;
  const role = body.role ?? user.role;
  let pinSql = "";
  const pinParams = [];
  if (body.pin !== void 0) {
    if (body.pin === null || body.pin === "") {
      pinSql = ", pin = NULL";
    } else {
      const pin = String(body.pin).trim();
      if (!validPin(pin)) return json({ message: "PIN ch\u1EA5m c\xF4ng ph\u1EA3i l\xE0 4-6 ch\u1EEF s\u1ED1" }, 400);
      pinSql = ", pin = ?";
      pinParams.push(pin);
    }
  }
  let rateSql = "";
  const rateParams = [];
  if (body.hourly_rate !== void 0) {
    rateSql = ", hourly_rate = ?";
    rateParams.push(Math.max(0, Math.round(Number(body.hourly_rate) || 0)));
  }
  if (body.password) {
    const salt = randomSalt();
    const passwordHash = await hashPassword(body.password, salt);
    await env2.DB.prepare(`UPDATE users SET full_name = ?, role = ?, password_hash = ?, salt = ?${pinSql}${rateSql} WHERE id = ?`).bind(fullName, role, passwordHash, salt, ...pinParams, ...rateParams, userId).run();
  } else {
    await env2.DB.prepare(`UPDATE users SET full_name = ?, role = ?${pinSql}${rateSql} WHERE id = ?`).bind(fullName, role, ...pinParams, ...rateParams, userId).run();
  }
  return json({ message: "User updated" });
}
__name(handleAdminUpdateDeleteUser, "handleAdminUpdateDeleteUser");
function isoTs(v) {
  if (!v) return null;
  const s = String(v);
  return s.includes("T") ? s : s.replace(" ", "T") + "Z";
}
__name(isoTs, "isoTs");
async function handleAttendanceStaff(env2) {
  const { results } = await env2.DB.prepare(
    `SELECT u.id, u.username, u.full_name, u.role,
            a.check_in_at
     FROM users u
     LEFT JOIN attendance a ON a.user_id = u.id AND a.check_out_at IS NULL
     WHERE COALESCE(u.hidden, 0) = 0
     ORDER BY u.id`
  ).all();
  return json(results.map((r) => ({
    id: r.id,
    name: r.full_name || r.username,
    role: r.role,
    checked_in: !!r.check_in_at,
    check_in_at: isoTs(r.check_in_at)
  })));
}
__name(handleAttendanceStaff, "handleAttendanceStaff");
async function handleAttendanceCheck(env2, body) {
  const userId = Number(body?.user_id);
  const action = body?.action;
  if (!userId || action !== "in" && action !== "out") {
    return json({ message: "Thi\u1EBFu user_id/action" }, 400);
  }
  const user = await env2.DB.prepare(
    "SELECT id, username, full_name FROM users WHERE id = ?"
  ).bind(userId).first();
  if (!user) return json({ message: "Kh\xF4ng t\xECm th\u1EA5y nh\xE2n vi\xEAn" }, 404);
  const open = await env2.DB.prepare(
    "SELECT id, check_in_at FROM attendance WHERE user_id = ? AND check_out_at IS NULL ORDER BY check_in_at DESC LIMIT 1"
  ).bind(userId).first();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const name = user.full_name || user.username;
  if (action === "in") {
    if (open) {
      return json({ message: `${name} \u0111ang trong ca t\u1EEB ${open.check_in_at}` }, 400);
    }
    await env2.DB.prepare(
      "INSERT INTO attendance (user_id, check_in_at, note) VALUES (?, ?, ?)"
    ).bind(userId, now, body.note ?? null).run();
    return json({ ok: true, status: "in", name, check_in_at: now });
  }
  if (!open) {
    return json({ message: `${name} ch\u01B0a v\xE0o ca` }, 400);
  }
  await env2.DB.prepare(
    "UPDATE attendance SET check_out_at = ?, synced_at = NULL WHERE id = ?"
  ).bind(now, open.id).run();
  const hours = (new Date(now) - new Date(open.check_in_at)) / 36e5;
  return json({
    ok: true,
    status: "out",
    name,
    check_in_at: open.check_in_at,
    check_out_at: now,
    hours: Math.round(hours * 100) / 100
  });
}
__name(handleAttendanceCheck, "handleAttendanceCheck");
async function handleAdminAttendance(env2, from, to) {
  const params = [];
  let where = "1=1";
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    where += " AND a.check_in_at >= ?";
    params.push(from + "T00:00:00");
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    where += " AND a.check_in_at <= ?";
    params.push(to + "T23:59:59.999");
  }
  const { results } = await env2.DB.prepare(
    `SELECT a.id, a.user_id, a.check_in_at, a.check_out_at, a.note,
            COALESCE(u.full_name, u.username) AS name
     FROM attendance a LEFT JOIN users u ON u.id = a.user_id
     WHERE ${where}
     ORDER BY a.check_in_at DESC LIMIT 1000`
  ).bind(...params).all();
  return json(results.map((r) => ({
    ...r,
    check_in_at: isoTs(r.check_in_at),
    check_out_at: isoTs(r.check_out_at)
  })));
}
__name(handleAdminAttendance, "handleAdminAttendance");
async function handleAdminAttendanceMutate(env2, attId, request) {
  const id = parseInt(attId, 10);
  if (!id) return json({ message: "id kh\xF4ng h\u1EE3p l\u1EC7" }, 400);
  const row = await env2.DB.prepare("SELECT id FROM attendance WHERE id = ?").bind(id).first();
  if (!row) return json({ message: "Kh\xF4ng t\xECm th\u1EA5y b\u1EA3n ghi" }, 404);
  if (request.method === "DELETE") {
    await env2.DB.prepare("DELETE FROM attendance WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parseDT = /* @__PURE__ */ __name((v) => {
    if (v === void 0) return void 0;
    if (v === null || v === "") return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? "INVALID" : d.toISOString();
  }, "parseDT");
  const ci = parseDT(body.check_in_at);
  if (ci === null || ci === "INVALID") return json({ message: "Gi\u1EDD v\xE0o kh\xF4ng h\u1EE3p l\u1EC7" }, 400);
  const co = parseDT(body.check_out_at);
  if (co === "INVALID") return json({ message: "Gi\u1EDD ra kh\xF4ng h\u1EE3p l\u1EC7" }, 400);
  const sets = [];
  const params = [];
  if (ci !== void 0) {
    sets.push("check_in_at = ?");
    params.push(ci);
  }
  if (co !== void 0) {
    sets.push("check_out_at = ?");
    params.push(co);
  }
  if (body.note !== void 0) {
    sets.push("note = ?");
    params.push(String(body.note ?? ""));
  }
  if (!sets.length) return json({ message: "kh\xF4ng c\xF3 g\xEC \u0111\u1EC3 s\u1EEDa" }, 400);
  sets.push("synced_at = NULL");
  params.push(id);
  await env2.DB.prepare(`UPDATE attendance SET ${sets.join(", ")} WHERE id = ?`).bind(...params).run();
  return json({ ok: true });
}
__name(handleAdminAttendanceMutate, "handleAdminAttendanceMutate");
async function handleAdminAttendanceCreate(env2, body) {
  const userId = Number(body?.user_id);
  const ci = body?.check_in_at ? new Date(body.check_in_at) : null;
  if (!userId || !ci || isNaN(ci.getTime())) {
    return json({ message: "c\u1EA7n user_id + check_in_at h\u1EE3p l\u1EC7" }, 400);
  }
  const user = await env2.DB.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first();
  if (!user) return json({ message: "Kh\xF4ng t\xECm th\u1EA5y nh\xE2n vi\xEAn" }, 404);
  let co = null;
  if (body.check_out_at) {
    const d = new Date(body.check_out_at);
    if (!isNaN(d.getTime())) co = d.toISOString();
  }
  const r = await env2.DB.prepare(
    "INSERT INTO attendance (user_id, check_in_at, check_out_at, note) VALUES (?, ?, ?, ?) RETURNING id"
  ).bind(userId, ci.toISOString(), co, body.note ?? "nh\u1EADp tay").first();
  return json({ ok: true, id: r?.id }, 201);
}
__name(handleAdminAttendanceCreate, "handleAdminAttendanceCreate");
async function handleAdminPayrollList(env2, period) {
  const useFilter = period && /^\d{4}-\d{2}$/.test(period);
  const { results } = await env2.DB.prepare(
    `SELECT * FROM payroll ${useFilter ? "WHERE period = ?" : ""} ORDER BY id DESC LIMIT 300`
  ).bind(...useFilter ? [period] : []).all();
  return json(results.map((r) => ({ ...r, created_at: isoTs(r.created_at) })));
}
__name(handleAdminPayrollList, "handleAdminPayrollList");
async function handleAdminPayrollCreate(env2, body) {
  const name = String(body?.user_name || "").trim();
  const period = String(body?.period || "").trim();
  if (!name || !/^\d{4}-\d{2}$/.test(period)) {
    return json({ message: "c\u1EA7n user_name + period d\u1EA1ng YYYY-MM" }, 400);
  }
  const r = await env2.DB.prepare(
    `INSERT INTO payroll (user_name, period, hours, rate, bonus, penalty, total, note)
     VALUES (?,?,?,?,?,?,?,?) RETURNING id`
  ).bind(
    name,
    period,
    Number(body.hours) || 0,
    Math.round(Number(body.rate) || 0),
    Math.round(Number(body.bonus) || 0),
    Math.round(Number(body.penalty) || 0),
    Math.round(Number(body.total) || 0),
    body.note ?? null
  ).first();
  return json({ ok: true, id: r?.id }, 201);
}
__name(handleAdminPayrollCreate, "handleAdminPayrollCreate");
async function handleAdminPayrollDelete(env2, id) {
  await env2.DB.prepare("DELETE FROM payroll WHERE id = ?").bind(Number(id)).run();
  return json({ ok: true });
}
__name(handleAdminPayrollDelete, "handleAdminPayrollDelete");
async function handleAdminAddProduct(env2, body) {
  if (!body.name || body.price === void 0 || body.price === null || !body.category_id) {
    return json({ message: "name, price, category_id l\xE0 b\u1EAFt bu\u1ED9c" }, 400);
  }
  const category = await env2.DB.prepare("SELECT id FROM categories WHERE id = ?").bind(body.category_id).first();
  if (!category) return json({ message: "Category not found" }, 400);
  const result = await env2.DB.prepare(
    `INSERT INTO products (category_id, name, price, image_url, available, production_unit, is_topping)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    body.category_id,
    body.name,
    Math.round(body.price),
    body.image_url ?? null,
    body.available === false ? 0 : 1,
    body.production_unit ?? "kitchen",
    body.is_topping ? 1 : 0
  ).first();
  if (!result) return json({ message: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c s\u1EA3n ph\u1EA9m" }, 500);
  await invalidateMenuCaches(env2);
  return json({ message: "Product added", id: result.id }, 201);
}
__name(handleAdminAddProduct, "handleAdminAddProduct");
async function handleAdminUpdateDeleteProduct(env2, productId, request) {
  const product = await env2.DB.prepare(
    "SELECT id, name, price, category_id, image_url, available, production_unit, is_topping FROM products WHERE id = ?"
  ).bind(productId).first();
  if (!product) return json({ message: "Product not found" }, 404);
  if (request.method === "DELETE") {
    const orderItem = await env2.DB.prepare("SELECT id FROM order_items WHERE product_id = ? LIMIT 1").bind(productId).first();
    if (orderItem) {
      return json({ message: "Kh\xF4ng th\u1EC3 x\xF3a m\xF3n \u0111\xE3 c\xF3 \u0111\u01A1n h\xE0ng. Vui l\xF2ng ch\u1ECDn 'T\u1EA1m ng\u01B0ng' kinh doanh." }, 400);
    }
    const toppingRef = await env2.DB.prepare("SELECT id FROM order_item_toppings WHERE product_id = ? LIMIT 1").bind(productId).first();
    if (toppingRef) {
      return json({ message: "Kh\xF4ng th\u1EC3 x\xF3a m\xF3n (\u0111ang l\xE0 Topping trong \u0111\u01A1n h\xE0ng). Vui l\xF2ng ch\u1ECDn 'T\u1EA1m ng\u01B0ng'." }, 400);
    }
    await env2.DB.prepare("DELETE FROM product_sizes WHERE product_id = ?").bind(productId).run();
    await env2.DB.prepare("DELETE FROM category_toppings WHERE product_id = ?").bind(productId).run();
    await env2.DB.prepare("DELETE FROM products WHERE id = ?").bind(productId).run();
    await invalidateMenuCaches(env2);
    return json({ message: "Product deleted" });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const name = body.name ?? product.name;
  const price = body.price !== void 0 ? Math.round(body.price) : product.price;
  const categoryId = body.category_id ?? product.category_id;
  const imageUrl = body.image_url !== void 0 ? body.image_url : product.image_url;
  const available = body.available !== void 0 ? body.available ? 1 : 0 : product.available;
  const productionUnit = body.production_unit ?? product.production_unit;
  const isTopping = body.is_topping !== void 0 ? body.is_topping ? 1 : 0 : product.is_topping;
  if (body.category_id !== void 0 && body.category_id !== product.category_id) {
    const category = await env2.DB.prepare("SELECT id FROM categories WHERE id = ?").bind(categoryId).first();
    if (!category) return json({ message: "Category not found" }, 400);
  }
  await env2.DB.prepare(
    `UPDATE products SET name = ?, price = ?, category_id = ?, image_url = ?, available = ?, production_unit = ?, is_topping = ? WHERE id = ?`
  ).bind(name, price, categoryId, imageUrl, available, productionUnit, isTopping, productId).run();
  await invalidateMenuCaches(env2);
  return json({ message: "Product updated" });
}
__name(handleAdminUpdateDeleteProduct, "handleAdminUpdateDeleteProduct");
async function handleAdminAddProductSize(env2, productId, body) {
  const product = await env2.DB.prepare("SELECT id FROM products WHERE id = ?").bind(productId).first();
  if (!product) return json({ message: "Product not found" }, 404);
  if (!body.name || body.price === void 0 || body.price === null) {
    return json({ message: "name v\xE0 price l\xE0 b\u1EAFt bu\u1ED9c" }, 400);
  }
  const result = await env2.DB.prepare(
    `INSERT INTO product_sizes (product_id, name, price) VALUES (?, ?, ?) RETURNING id`
  ).bind(productId, body.name, Math.round(body.price)).first();
  if (!result) return json({ message: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c size" }, 500);
  await invalidateMenuCaches(env2);
  return json({ message: "Size added", id: result.id }, 201);
}
__name(handleAdminAddProductSize, "handleAdminAddProductSize");
async function handleAdminDeleteProductSize(env2, sizeId) {
  const size = await env2.DB.prepare("SELECT id FROM product_sizes WHERE id = ?").bind(sizeId).first();
  if (!size) return json({ message: "Size not found" }, 404);
  await env2.DB.prepare("DELETE FROM product_sizes WHERE id = ?").bind(sizeId).run();
  await invalidateMenuCaches(env2);
  return json({ message: "Size deleted" });
}
__name(handleAdminDeleteProductSize, "handleAdminDeleteProductSize");
async function handleAdminAddCategory(env2, body) {
  if (!body.name) return json({ message: "name l\xE0 b\u1EAFt bu\u1ED9c" }, 400);
  const productionUnit = body.production_unit ?? "kitchen";
  if (!VALID_PRODUCTION_UNITS.includes(productionUnit)) {
    return json({ message: "Invalid production_unit" }, 400);
  }
  const maxRow = await env2.DB.prepare("SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM categories").first();
  const nextSort = (maxRow?.max_sort ?? -1) + 1;
  const result = await env2.DB.prepare(
    `INSERT INTO categories (name, sort_order, production_unit, allow_all_toppings) VALUES (?, ?, ?, ?) RETURNING id`
  ).bind(
    body.name,
    body.sort_order ?? nextSort,
    productionUnit,
    body.allow_all_toppings === false ? 0 : 1
  ).first();
  if (!result) return json({ message: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c danh m\u1EE5c" }, 500);
  if (Array.isArray(body.topping_ids) && body.topping_ids.length > 0) {
    await linkCategoryToppings(env2, result.id, body.topping_ids);
  }
  await invalidateMenuCaches(env2);
  return json({ message: "Category added", id: result.id }, 201);
}
__name(handleAdminAddCategory, "handleAdminAddCategory");
async function linkCategoryToppings(env2, categoryId, toppingIds) {
  const placeholders = toppingIds.map(() => "?").join(",");
  const rows = await env2.DB.prepare(
    `SELECT id FROM products WHERE id IN (${placeholders}) AND is_topping = 1`
  ).bind(...toppingIds).all();
  for (const row of rows.results) {
    await env2.DB.prepare(
      "INSERT OR IGNORE INTO category_toppings (category_id, product_id) VALUES (?, ?)"
    ).bind(categoryId, row.id).run();
  }
}
__name(linkCategoryToppings, "linkCategoryToppings");
async function handleAdminUpdateDeleteCategory(env2, categoryId, request) {
  const category = await env2.DB.prepare(
    "SELECT id, name, sort_order, production_unit, allow_all_toppings FROM categories WHERE id = ?"
  ).bind(categoryId).first();
  if (!category) return json({ message: "Category not found" }, 404);
  if (request.method === "DELETE") {
    const productRef = await env2.DB.prepare("SELECT id FROM products WHERE category_id = ? LIMIT 1").bind(categoryId).first();
    if (productRef) return json({ message: "Cannot delete category with products" }, 400);
    await env2.DB.prepare("DELETE FROM category_toppings WHERE category_id = ?").bind(categoryId).run();
    await env2.DB.prepare("DELETE FROM categories WHERE id = ?").bind(categoryId).run();
    await invalidateMenuCaches(env2);
    return json({ message: "Category deleted" });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const name = body.name ?? category.name;
  const sortOrder = body.sort_order ?? category.sort_order;
  const allowAll = body.allow_all_toppings !== void 0 ? body.allow_all_toppings ? 1 : 0 : category.allow_all_toppings;
  let productionUnit = category.production_unit;
  if (body.production_unit !== void 0) {
    if (!VALID_PRODUCTION_UNITS.includes(body.production_unit)) {
      return json({ message: "Invalid production_unit" }, 400);
    }
    productionUnit = body.production_unit;
    await env2.DB.prepare("UPDATE products SET production_unit = ? WHERE category_id = ?").bind(productionUnit, categoryId).run();
  }
  await env2.DB.prepare(
    "UPDATE categories SET name = ?, sort_order = ?, production_unit = ?, allow_all_toppings = ? WHERE id = ?"
  ).bind(name, sortOrder, productionUnit, allowAll, categoryId).run();
  if (Array.isArray(body.topping_ids)) {
    await env2.DB.prepare("DELETE FROM category_toppings WHERE category_id = ?").bind(categoryId).run();
    if (body.topping_ids.length > 0) {
      await linkCategoryToppings(env2, categoryId, body.topping_ids);
    }
  }
  await invalidateMenuCaches(env2);
  return json({ message: "Category updated" });
}
__name(handleAdminUpdateDeleteCategory, "handleAdminUpdateDeleteCategory");
async function handleAdminReorderCategories(env2, body) {
  const ids = body.category_ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return json({ message: "category_ids is required" }, 400);
  }
  const placeholders = ids.map(() => "?").join(",");
  const found = await env2.DB.prepare(
    `SELECT id FROM categories WHERE id IN (${placeholders})`
  ).bind(...ids).all();
  if (found.results.length !== ids.length) {
    return json({ message: "Some category ids are invalid" }, 400);
  }
  for (let i = 0; i < ids.length; i++) {
    await env2.DB.prepare("UPDATE categories SET sort_order = ? WHERE id = ?").bind(i, ids[i]).run();
  }
  await invalidateMenuCaches(env2);
  return json({ message: "Category order updated" });
}
__name(handleAdminReorderCategories, "handleAdminReorderCategories");
async function handleAdminListProducts(env2, availableParam) {
  const products = await env2.DB.prepare(
    `SELECT id, category_id, name, price, image_url, available, is_topping, production_unit
     FROM products ORDER BY id`
  ).all();
  const sizes = await env2.DB.prepare(
    "SELECT id, product_id, name, price FROM product_sizes ORDER BY sort_order, id"
  ).all();
  const sizesByProduct = /* @__PURE__ */ new Map();
  for (const s of sizes.results) {
    if (!sizesByProduct.has(s.product_id)) sizesByProduct.set(s.product_id, []);
    sizesByProduct.get(s.product_id).push({ id: s.id, name: s.name, price: s.price });
  }
  let rows = products.results;
  if (availableParam === "true") rows = rows.filter((p) => p.available === 1);
  else if (availableParam === "false") rows = rows.filter((p) => p.available === 0);
  return json(rows.map((p) => ({ ...p, sizes: sizesByProduct.get(p.id) || [] })));
}
__name(handleAdminListProducts, "handleAdminListProducts");
async function handleAdminListCategories(env2) {
  const cats = await env2.DB.prepare(
    `SELECT id, name, sort_order, production_unit, allow_all_toppings FROM categories
     ORDER BY CASE production_unit WHEN 'counter' THEN 0 WHEN 'kitchen' THEN 1 ELSE 2 END, sort_order, id`
  ).all();
  const links = await env2.DB.prepare("SELECT category_id, product_id FROM category_toppings").all();
  const toppingsByCategory = /* @__PURE__ */ new Map();
  for (const l of links.results) {
    if (!toppingsByCategory.has(l.category_id)) toppingsByCategory.set(l.category_id, []);
    toppingsByCategory.get(l.category_id).push(l.product_id);
  }
  return json(cats.results.map((c) => ({
    ...c,
    allowed_toppings: toppingsByCategory.get(c.id) || []
  })));
}
__name(handleAdminListCategories, "handleAdminListCategories");
async function handleAdminAddTable(env2, body) {
  if (!body.name) return json({ message: "name l\xE0 b\u1EAFt bu\u1ED9c" }, 400);
  const existing = await env2.DB.prepare("SELECT id FROM tables WHERE name = ?").bind(body.name).first();
  if (existing) return json({ message: "Table name already exists" }, 400);
  const result = await env2.DB.prepare(
    "INSERT INTO tables (name, status) VALUES (?, 'empty') RETURNING id"
  ).bind(body.name).first();
  if (!result) return json({ message: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c b\xE0n" }, 500);
  await invalidateMenuCaches(env2);
  return json({ message: "Table added", id: result.id }, 201);
}
__name(handleAdminAddTable, "handleAdminAddTable");
async function handleAdminUpdateDeleteTable(env2, tableId, request) {
  const table3 = await env2.DB.prepare("SELECT id, name, status FROM tables WHERE id = ?").bind(tableId).first();
  if (!table3) return json({ message: "Table not found" }, 404);
  if (request.method === "DELETE") {
    await env2.DB.prepare("DELETE FROM tables WHERE id = ?").bind(tableId).run();
    await invalidateMenuCaches(env2);
    return json({ message: "Table deleted" });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const name = body.name ?? table3.name;
  const status = body.status ?? table3.status;
  await env2.DB.prepare("UPDATE tables SET name = ?, status = ? WHERE id = ?").bind(name, status, tableId).run();
  await invalidateMenuCaches(env2);
  return json({ message: "Table updated" });
}
__name(handleAdminUpdateDeleteTable, "handleAdminUpdateDeleteTable");
async function handleOrderHistory(env2, tableId = null) {
  let query = `SELECT o.id, o.table_id, o.table_position, o.order_type, o.total, o.status, o.customer_name, o.created_at, t.name as table_name
     FROM orders o LEFT JOIN tables t ON t.id = o.table_id
     WHERE o.status = 'completed'`;
  const params = [];
  if (tableId) {
    query += ` AND o.table_id = ?`;
    params.push(tableId);
  }
  query += ` ORDER BY o.created_at DESC LIMIT ?`;
  params.push(tableId ? 20 : 100);
  const stmt = params.length > 0 ? env2.DB.prepare(query).bind(...params) : env2.DB.prepare(query);
  const orders = await stmt.all();
  const results = [];
  for (const o of orders.results) {
    const items = await env2.DB.prepare(
      `SELECT oi.id, oi.product_id, oi.product_name as name, oi.price, oi.quantity, oi.size_name
       FROM order_items oi WHERE oi.order_id = ?`
    ).bind(o.id).all();
    const itemsOut = [];
    for (const it of items.results) {
      const tops = await env2.DB.prepare(
        `SELECT p.name FROM order_item_toppings oit LEFT JOIN products p ON p.id = oit.product_id
         WHERE oit.order_item_id = ?`
      ).bind(it.id).all();
      itemsOut.push({
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        size_name: it.size_name,
        toppings: tops.results.map((t) => t.name).filter((n) => Boolean(n))
      });
    }
    let displayName;
    if (o.table_name) displayName = o.table_name;
    else if (o.order_type === "takeaway") displayName = o.customer_name ? `MV - ${o.customer_name}` : "Order / Mang v\u1EC1";
    else if (o.order_type === "ship") displayName = o.customer_name ? `SHIP - ${o.customer_name}` : "Order / Ship";
    else displayName = "Order / Mang v\u1EC1";
    results.push({
      id: o.id,
      table_name: displayName,
      table_position: o.table_position,
      order_type: o.order_type,
      total_amount: o.total,
      status: o.status,
      created_at: isoTs(o.created_at),
      items: itemsOut
    });
  }
  return json(results);
}
__name(handleOrderHistory, "handleOrderHistory");
async function handleAdminGetSettings(env2) {
  const r = await env2.DB.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  for (const row of r.results) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  const zb = settings["zalo_bot"];
  if (zb && typeof zb === "object") {
    const zbObj = zb;
    const token = typeof zbObj.bot_token === "string" ? zbObj.bot_token : "";
    settings["zalo_bot"] = {
      enabled: Boolean(zbObj.enabled),
      bot_token_masked: token ? token.length < 4 ? "***" : "..." + token.slice(-4) : "",
      group_chat_id: typeof zbObj.group_chat_id === "string" ? zbObj.group_chat_id : "",
      api_base: typeof zbObj.api_base === "string" ? zbObj.api_base : "https://bot-api.zaloplatforms.com"
    };
  }
  const hub = settings["hub"];
  if (hub && typeof hub === "object") {
    const hubObj = hub;
    const key = typeof hubObj.api_key === "string" ? hubObj.api_key : "";
    let tun = {};
    try {
      const tunRow = await env2.DB.prepare("SELECT value FROM settings WHERE key = 'tunnel'").first();
      if (tunRow) tun = JSON.parse(tunRow.value) || {};
    } catch {
    }
    const cfTok = typeof tun.cf_token === "string" ? tun.cf_token : "";
    settings["hub"] = {
      enabled: Boolean(hubObj.enabled),
      mode: typeof hubObj.mode === "string" ? hubObj.mode : "",
      url: typeof hubObj.url === "string" ? hubObj.url : "",
      store_id: typeof hubObj.store_id === "string" ? hubObj.store_id : "",
      db_name: typeof hubObj.db_name === "string" ? hubObj.db_name : "",
      api_key_masked: key ? key.length < 4 ? "***" : "..." + key.slice(-6) : "",
      cf_token_masked: cfTok ? "..." + cfTok.slice(-6) : "",
      cf_account_id: typeof tun.account_id === "string" ? tun.account_id : ""
    };
  }
  return json(settings);
}
__name(handleAdminGetSettings, "handleAdminGetSettings");
async function handleAdminPutSettings(env2, request) {
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (body.zalo_bot) {
    const currentRow = await env2.DB.prepare("SELECT value FROM settings WHERE key = 'zalo_bot'").first();
    let current = {};
    if (currentRow) {
      try {
        current = JSON.parse(currentRow.value);
      } catch {
        current = {};
      }
    }
    const incoming = body.zalo_bot;
    const merged = {
      ...current,
      enabled: incoming.enabled ?? current.enabled ?? false,
      group_chat_id: incoming.group_chat_id ?? current.group_chat_id ?? "",
      api_base: incoming.api_base ?? current.api_base ?? "https://bot-api.zaloplatforms.com"
    };
    if (incoming.bot_token) {
      merged.bot_token = incoming.bot_token;
    }
    await env2.DB.prepare(
      "INSERT INTO settings (key, value) VALUES ('zalo_bot', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).bind(JSON.stringify(merged)).run();
  }
  if (body.hub) {
    const currentRow = await env2.DB.prepare("SELECT value FROM settings WHERE key = 'hub'").first();
    let current = {};
    if (currentRow) {
      try {
        current = JSON.parse(currentRow.value);
      } catch {
        current = {};
      }
    }
    const incoming = body.hub;
    const merged = {
      ...current,
      enabled: incoming.enabled ?? current.enabled ?? false,
      mode: incoming.mode ?? current.mode ?? "",
      url: incoming.url ?? current.url ?? "",
      store_id: incoming.store_id ?? current.store_id ?? "",
      db_name: incoming.db_name ?? current.db_name ?? "",
      account_id: incoming.account_id ?? current.account_id ?? ""
    };
    if (incoming.api_key) {
      merged.api_key = incoming.api_key;
    }
    if (incoming.db_name && incoming.db_name !== current.db_name) {
      delete merged.db_id;
      delete merged._db_name_cached;
    }
    await env2.DB.prepare(
      "INSERT INTO settings (key, value) VALUES ('hub', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).bind(JSON.stringify(merged)).run();
  }
  if (body.cf && typeof body.cf === "object") {
    const currentRow = await env2.DB.prepare("SELECT value FROM settings WHERE key = 'tunnel'").first();
    let current = {};
    if (currentRow) {
      try {
        current = JSON.parse(currentRow.value);
      } catch {
        current = {};
      }
    }
    const incoming = body.cf;
    const merged = { ...current };
    if (incoming.token) merged.cf_token = String(incoming.token).trim();
    if (incoming.email !== void 0) merged.cf_email = String(incoming.email).trim();
    if (incoming.account_id !== void 0) merged.account_id = String(incoming.account_id).trim();
    await env2.DB.prepare(
      "INSERT INTO settings (key, value) VALUES ('tunnel', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).bind(JSON.stringify(merged)).run();
  }
  return json({ message: "Settings updated", ok: true });
}
__name(handleAdminPutSettings, "handleAdminPutSettings");
var UPLOAD_MAX_BYTES = 15e5;
var ALLOWED_IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp"
};
async function handleAdminUpload(env2, request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ message: "Body kh\xF4ng h\u1EE3p l\u1EC7" }, 400);
  }
  if (!body.image) return json({ message: "No selected file" }, 400);
  let raw = body.image;
  let mime = "image/png";
  const dataUrlMatch = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
  if (dataUrlMatch) {
    mime = dataUrlMatch[1];
    raw = dataUrlMatch[2];
  }
  const decoded = atob(raw);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  if (bytes.length === 0) return json({ message: "No selected file" }, 400);
  if (bytes.length > UPLOAD_MAX_BYTES) return json({ message: "File qu\xE1 l\u1EDBn (t\u1ED1i \u0111a 1.5MB)" }, 413);
  let detected = mime;
  if (bytes[0] === 137 && bytes[1] === 80) detected = "image/png";
  else if (bytes[0] === 255 && bytes[1] === 216) detected = "image/jpeg";
  else if (bytes[0] === 71 && bytes[1] === 73) detected = "image/gif";
  else if (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) detected = "image/webp";
  else return json({ message: "Ch\u1EC9 ch\u1EA5p nh\u1EADn file \u1EA3nh (png, jpg, gif, webp)" }, 400);
  const ext = ALLOWED_IMAGE_TYPES[detected] ?? "png";
  const dataUrl = `data:${detected};base64,${btoa(String.fromCharCode(...bytes))}`;
  return json({ url: dataUrl });
}
__name(handleAdminUpload, "handleAdminUpload");
function parseReportDates(url) {
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const endDate = url.searchParams.get("end_date") || today;
  let startDate = url.searchParams.get("start_date");
  if (!startDate) {
    const end = /* @__PURE__ */ new Date(endDate + "T00:00:00Z");
    end.setUTCDate(end.getUTCDate() - 6);
    startDate = end.toISOString().slice(0, 10);
  }
  return { startDate, endDate };
}
__name(parseReportDates, "parseReportDates");
async function handleReportsStats(env2, url) {
  const { startDate, endDate } = parseReportDates(url);
  const revenueRow = await env2.DB.prepare(
    `SELECT COALESCE(SUM(total), 0) AS revenue FROM orders
     WHERE status = 'completed' AND substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) <= ?`
  ).bind(startDate, endDate).first();
  const countRow = await env2.DB.prepare(
    `SELECT COUNT(*) AS cnt FROM orders
     WHERE status = 'completed' AND substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) <= ?`
  ).bind(startDate, endDate).first();
  const productsRow = await env2.DB.prepare("SELECT COUNT(*) AS cnt FROM products").first();
  return json({
    revenue: revenueRow?.revenue ?? 0,
    orders_count: countRow?.cnt ?? 0,
    total_products: productsRow?.cnt ?? 0
  });
}
__name(handleReportsStats, "handleReportsStats");
async function handleReportsChartData(env2, url) {
  const { startDate, endDate } = parseReportDates(url);
  const rows = await env2.DB.prepare(
    `SELECT substr(created_at, 1, 10) AS day, SUM(total) AS revenue
     FROM orders
     WHERE status = 'completed' AND substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) <= ?
     GROUP BY substr(created_at, 1, 10)`
  ).bind(startDate, endDate).all();
  const byDay = /* @__PURE__ */ new Map();
  for (const r of rows.results) byDay.set(r.day, r.revenue ?? 0);
  const out = [];
  const cursor = /* @__PURE__ */ new Date(startDate + "T00:00:00Z");
  const end = /* @__PURE__ */ new Date(endDate + "T00:00:00Z");
  let guard = 0;
  while (cursor <= end && guard < 400) {
    const day = cursor.toISOString().slice(0, 10);
    const [y, m, d] = day.split("-");
    out.push({ date: `${d}/${m}`, revenue: byDay.get(day) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard++;
  }
  return json(out);
}
__name(handleReportsChartData, "handleReportsChartData");
async function handleReportsProductSales(env2, url) {
  const { startDate, endDate } = parseReportDates(url);
  const rows = await env2.DB.prepare(
    `SELECT p.name AS product_name, c.name AS category_name,
            SUM(oi.quantity) AS quantity,
            SUM(oi.price * oi.quantity) AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     JOIN categories c ON c.id = p.category_id
     WHERE o.status = 'completed' AND substr(o.created_at, 1, 10) >= ? AND substr(o.created_at, 1, 10) <= ?
     GROUP BY p.id
     ORDER BY revenue DESC`
  ).bind(startDate, endDate).all();
  return json(rows.results.map((r) => ({
    product_name: r.product_name,
    category_name: r.category_name,
    quantity: r.quantity,
    revenue: r.revenue ?? 0
  })));
}
__name(handleReportsProductSales, "handleReportsProductSales");
async function handleReportsCategorySales(env2, url) {
  const { startDate, endDate } = parseReportDates(url);
  const rows = await env2.DB.prepare(
    `SELECT c.name AS category_name,
            SUM(oi.quantity) AS quantity,
            SUM(oi.price * oi.quantity) AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     JOIN categories c ON c.id = p.category_id
     WHERE o.status = 'completed' AND substr(o.created_at, 1, 10) >= ? AND substr(o.created_at, 1, 10) <= ?
     GROUP BY c.id
     ORDER BY revenue DESC`
  ).bind(startDate, endDate).all();
  return json(rows.results.map((r) => ({
    category_name: r.category_name,
    quantity: r.quantity,
    revenue: r.revenue ?? 0
  })));
}
__name(handleReportsCategorySales, "handleReportsCategorySales");
async function invalidateMenuCaches(env2) {
  menuDataCache = null;
  const keys = [
    new Request("https://cache/api/menu"),
    new Request("https://cache/api/public/takeaway/menu"),
    new Request("https://cache/api/public/ship/menu")
  ];
  for (const key of keys) {
    try {
      await caches.default.delete(key);
    } catch {
    }
  }
}
__name(invalidateMenuCaches, "invalidateMenuCaches");
async function requireAuth(env2, request) {
  const token = extractToken(request);
  if (!token) return { valid: false, error: json({ message: "Thi\u1EBFu token" }, 401) };
  const result = await env2.DB.prepare(
    `SELECT u.id, u.username, u.full_name, u.role, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`
  ).bind(token).first();
  if (!result) return { valid: false, error: json({ message: "Token kh\xF4ng h\u1EE3p l\u1EC7" }, 401) };
  if (new Date(result.expires_at) < /* @__PURE__ */ new Date()) return { valid: false, error: json({ message: "Token \u0111\xE3 h\u1EBFt h\u1EA1n" }, 401) };
  return { valid: true, user: { id: result.id, username: result.username, full_name: result.full_name, role: result.role } };
}
__name(requireAuth, "requireAuth");
var worker_default = {
  async fetch(request, env2, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      try {
        const body = await request.json();
        return await handleLogin(env2, body);
      } catch {
        return json({ message: "Body kh\xF4ng h\u1EE3p l\u1EC7" }, 400);
      }
    }
    if (url.pathname === "/api/auth/verify" && request.method === "GET") {
      const token = extractToken(request);
      if (!token) return json({ valid: false, message: "Thi\u1EBFu token" }, 401);
      try {
        return await handleVerify(env2, token);
      } catch (err) {
        return json({ valid: false, message: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      const token = extractToken(request);
      if (!token) return json({ success: false }, 400);
      try {
        return await handleLogout(env2, token);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/changes" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        const ctx2 = url.searchParams.get("ctx") || "all";
        const unit = url.searchParams.get("unit") || "kitchen";
        return await handleChanges(env2, ctx2, unit);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/health") {
      return json({ ok: true, store: env2.STORE_NAME, time: (/* @__PURE__ */ new Date()).toISOString() });
    }
    if (url.pathname === "/api/menu" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        return await handleMenu(env2);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/products" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        return await handleAdminListProducts(env2, url.searchParams.get("available"));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/products/categories" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        return await handleAdminListCategories(env2);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/tables" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        return await handleTables(env2);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const payMatch = url.pathname.match(/^\/api\/tables\/(\d+)\/pay$/);
    if (payMatch && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        const tableId = parseInt(payMatch[1], 10);
        const body = await request.json();
        return await handlePayTable(env2, tableId, body.payment_method ?? "cash", body.table_position ?? null);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/orders") {
      if (request.method === "GET") {
        const auth = await requireAuth(env2, request);
        if (!auth.valid) return auth.error;
        try {
          return await handleGetOrders(env2);
        } catch (err) {
          return json({ error: String(err) }, 500);
        }
      }
      if (request.method === "POST") {
        const auth = await requireAuth(env2, request);
        if (!auth.valid) return auth.error;
        try {
          const body = await request.json();
          return await handleCreateOrder(env2, body);
        } catch (err) {
          return json({ error: String(err) }, 400);
        }
      }
    }
    const cashierItemMatch = url.pathname.match(/^\/api\/orders\/(\d+)\/items\/(\d+)$/);
    if (cashierItemMatch && request.method === "DELETE") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        return await handleDeleteCashierItem(env2, parseInt(cashierItemMatch[1], 10), parseInt(cashierItemMatch[2], 10));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (cashierItemMatch && request.method === "PUT") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        const body = await request.json();
        return await handleUpdateCashierItemQuantity(env2, parseInt(cashierItemMatch[1], 10), parseInt(cashierItemMatch[2], 10), body);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/tables/transfer" && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        const body = await request.json();
        return await handleTransferTable(env2, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    if (url.pathname === "/api/orders/kitchen" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        const unit = url.searchParams.get("unit") || "kitchen";
        return await handleKitchenOrders(env2, unit);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/orders/kitchen/count" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        const unit = url.searchParams.get("unit") || "kitchen";
        const countResult = await env2.DB.prepare(
          `SELECT COUNT(DISTINCT oi.order_id) AS cnt
           FROM order_items oi
           JOIN products p ON p.id = oi.product_id
           JOIN orders o ON o.id = oi.order_id
           WHERE oi.status != 'completed' AND o.status = 'pending' AND p.production_unit = ?`
        ).bind(unit).first();
        return json({ count: countResult?.cnt ?? 0 });
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/orders/kitchen/cancellation-events" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        const unit = url.searchParams.get("unit") || "kitchen";
        const hours = parseInt(url.searchParams.get("hours") || "12", 10);
        return await handleKitchenCancellationEvents(env2, unit, hours);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const itemStatusMatch = url.pathname.match(/^\/api\/admin\/order-items\/(\d+)\/status$/);
    if (itemStatusMatch && request.method === "PUT") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        const body = await request.json();
        return await handleUpdateItemStatus(env2, parseInt(itemStatusMatch[1], 10), body.status ?? "");
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/sync/kitchen-batch" && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        const body = await request.json();
        return await handleKitchenBatchSync(env2, body.changes || []);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const publicMenuMatch = url.pathname.match(/^\/api\/public\/menu\/(\d+)$/);
    if (publicMenuMatch && request.method === "GET") {
      try {
        return await withCache(
          request,
          60,
          30,
          () => handlePublicMenu(env2, parseInt(publicMenuMatch[1], 10))
        );
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const tableStateMatch = url.pathname.match(/^\/api\/public\/table-state\/(\d+)$/);
    if (tableStateMatch && request.method === "GET") {
      try {
        return await withCache(
          request,
          5,
          5,
          () => handlePublicTableState(env2, parseInt(tableStateMatch[1], 10))
        );
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const itemsMatch = url.pathname.match(/^\/api\/public\/items\/(\d+)$/);
    if (itemsMatch && request.method === "GET") {
      try {
        return await handlePublicItems(env2, parseInt(itemsMatch[1], 10));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/public/orders" && request.method === "POST") {
      try {
        const body = await request.json();
        return await handleCreatePublicOrder(env2, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    const itemMatch = url.pathname.match(/^\/api\/public\/orders\/(\d+)\/items\/(\d+)$/);
    if (itemMatch && request.method === "DELETE") {
      try {
        return await handleDeletePublicItem(env2, parseInt(itemMatch[1], 10), parseInt(itemMatch[2], 10));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (itemMatch && request.method === "PUT") {
      try {
        const body = await request.json();
        return await handleUpdatePublicItemQuantity(env2, parseInt(itemMatch[1], 10), parseInt(itemMatch[2], 10), body);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/public/call-staff" && request.method === "POST") {
      try {
        const body = await request.json();
        return await handlePublicCallStaff(env2, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    if (url.pathname === "/api/staff-calls" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        return await handleGetStaffCalls(env2);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const staffCallResolveMatch = url.pathname.match(/^\/api\/staff-calls\/(\d+)\/resolve$/);
    if (staffCallResolveMatch && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        return await handleResolveStaffCall(env2, parseInt(staffCallResolveMatch[1], 10));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/takeaway" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        return await handleCashierTakeawayList(env2, url.searchParams.get("status"));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const takeawayCompleteMatch = url.pathname.match(/^\/api\/takeaway\/(\d+)\/complete$/);
    if (takeawayCompleteMatch && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        const body = await request.json();
        return await handleCashierTakeawayComplete(env2, parseInt(takeawayCompleteMatch[1], 10), body);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/settings" && request.method === "GET") {
      try {
        return await handleGetSettings(env2);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/public/takeaway/menu" && request.method === "GET") {
      try {
        return await withCache(request, 60, 30, () => handleTakeawayMenu(env2));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/public/takeaway/orders" && request.method === "POST") {
      try {
        const body = await request.json();
        return await handleCreateTakeawayOrder(env2, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    const takeawayItemsMatch = url.pathname.match(/^\/api\/public\/takeaway\/items\/([^/]+)$/);
    if (takeawayItemsMatch && request.method === "GET") {
      try {
        return await handleTakeawayItems(env2, decodeURIComponent(takeawayItemsMatch[1]));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const takeawayItemMatch = url.pathname.match(/^\/api\/public\/takeaway\/orders\/(\d+)\/items\/(\d+)$/);
    if (takeawayItemMatch && request.method === "DELETE") {
      try {
        const clientId = url.searchParams.get("client_id");
        return await handleDeleteTakeawayItem(
          env2,
          parseInt(takeawayItemMatch[1], 10),
          parseInt(takeawayItemMatch[2], 10),
          clientId
        );
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (takeawayItemMatch && request.method === "PUT") {
      try {
        const body = await request.json();
        const clientId = url.searchParams.get("client_id");
        return await handleUpdateTakeawayItemQuantity(
          env2,
          parseInt(takeawayItemMatch[1], 10),
          parseInt(takeawayItemMatch[2], 10),
          clientId,
          body
        );
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/public/ship/menu" && request.method === "GET") {
      try {
        return await withCache(request, 60, 30, () => handleShipMenu(env2));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/public/ship/orders" && request.method === "POST") {
      try {
        const body = await request.json();
        return await handleCreateShipOrder(env2, body, ctx);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    const shipItemsMatch = url.pathname.match(/^\/api\/public\/ship\/items\/([^/]+)$/);
    if (shipItemsMatch && request.method === "GET") {
      try {
        return await handleShipItems(env2, decodeURIComponent(shipItemsMatch[1]));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const shipItemMatch = url.pathname.match(/^\/api\/public\/ship\/orders\/(\d+)\/items\/(\d+)$/);
    if (shipItemMatch && request.method === "DELETE") {
      try {
        const clientId = url.searchParams.get("client_id");
        return await handleDeleteShipItem(
          env2,
          parseInt(shipItemMatch[1], 10),
          parseInt(shipItemMatch[2], 10),
          clientId
        );
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (shipItemMatch && request.method === "PUT") {
      try {
        const body = await request.json();
        const clientId = url.searchParams.get("client_id");
        return await handleUpdateShipItemQuantity(
          env2,
          parseInt(shipItemMatch[1], 10),
          parseInt(shipItemMatch[2], 10),
          clientId,
          body
        );
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/public/ship-orders" && request.method === "GET") {
      try {
        return await handleGetShipOrders(env2);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/public/ship-orders/transfer" && request.method === "GET") {
      try {
        return await handleGetTransferOrders(env2);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const shipperPayCashMatch = url.pathname.match(/^\/api\/public\/ship-orders\/(\d+)\/pay-cash$/);
    if (shipperPayCashMatch && request.method === "POST") {
      try {
        return await handlePayCashShipOrder(env2, parseInt(shipperPayCashMatch[1], 10));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const shipperPayTransferMatch = url.pathname.match(/^\/api\/public\/ship-orders\/(\d+)\/pay-transfer$/);
    if (shipperPayTransferMatch && request.method === "POST") {
      try {
        return await handlePayTransferShipOrder(env2, parseInt(shipperPayTransferMatch[1], 10));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const shipperConfirmTransferMatch = url.pathname.match(/^\/api\/public\/ship-orders\/(\d+)\/confirm-transfer$/);
    if (shipperConfirmTransferMatch && request.method === "POST") {
      try {
        return await handleConfirmTransferShipOrder(env2, parseInt(shipperConfirmTransferMatch[1], 10));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/users" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminGetUsers(env2);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/users" && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        const body = await request.json();
        return await handleAdminAddUser(env2, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    const adminUserMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)$/);
    if (adminUserMatch && (request.method === "PUT" || request.method === "DELETE")) {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminUpdateDeleteUser(env2, parseInt(adminUserMatch[1], 10), request);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/attendance/staff" && request.method === "GET") {
      return await handleAttendanceStaff(env2);
    }
    if (url.pathname === "/api/attendance/check" && request.method === "POST") {
      try {
        return await handleAttendanceCheck(env2, await request.json());
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/attendance" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminAttendance(env2, url.searchParams.get("from"), url.searchParams.get("to"));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/attendance" && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminAttendanceCreate(env2, await request.json());
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const attMutMatch = url.pathname.match(/^\/api\/admin\/attendance\/(\d+)$/);
    if (attMutMatch && (request.method === "PUT" || request.method === "DELETE")) {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminAttendanceMutate(env2, attMutMatch[1], request);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/payroll" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminPayrollList(env2, url.searchParams.get("period"));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/payroll" && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminPayrollCreate(env2, await request.json());
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const payDelMatch = url.pathname.match(/^\/api\/admin\/payroll\/(\d+)$/);
    if (payDelMatch && request.method === "DELETE") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminPayrollDelete(env2, payDelMatch[1]);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/products" && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        const body = await request.json();
        return await handleAdminAddProduct(env2, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    const adminProductMatch = url.pathname.match(/^\/api\/admin\/products\/(\d+)$/);
    if (adminProductMatch && (request.method === "PUT" || request.method === "DELETE")) {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminUpdateDeleteProduct(env2, parseInt(adminProductMatch[1], 10), request);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const adminProductSizeMatch = url.pathname.match(/^\/api\/admin\/products\/(\d+)\/sizes$/);
    if (adminProductSizeMatch && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        const body = await request.json();
        return await handleAdminAddProductSize(env2, parseInt(adminProductSizeMatch[1], 10), body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    const adminSizeMatch = url.pathname.match(/^\/api\/admin\/products\/sizes\/(\d+)$/);
    if (adminSizeMatch && request.method === "DELETE") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminDeleteProductSize(env2, parseInt(adminSizeMatch[1], 10));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/categories" && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        const body = await request.json();
        return await handleAdminAddCategory(env2, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    const adminCategoryMatch = url.pathname.match(/^\/api\/admin\/categories\/(\d+)$/);
    if (adminCategoryMatch && (request.method === "PUT" || request.method === "DELETE")) {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminUpdateDeleteCategory(env2, parseInt(adminCategoryMatch[1], 10), request);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/categories/reorder" && request.method === "PUT") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        const body = await request.json();
        return await handleAdminReorderCategories(env2, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    if (url.pathname === "/api/admin/tables" && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        const body = await request.json();
        return await handleAdminAddTable(env2, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    const adminTableMatch = url.pathname.match(/^\/api\/admin\/tables\/(\d+)$/);
    if (adminTableMatch && (request.method === "PUT" || request.method === "DELETE")) {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminUpdateDeleteTable(env2, parseInt(adminTableMatch[1], 10), request);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/upload" && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminUpload(env2, request);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/settings" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminGetSettings(env2);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/settings" && request.method === "PUT") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminPutSettings(env2, request);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    if (url.pathname === "/api/admin/ship-mode" && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        const body = await request.json();
        const enabled = body.enabled !== false;
        const reason = enabled ? null : String(body.reason || "").trim();
        if (!enabled && !reason) return json({ message: "Ch\u1ECDn l\xFD do t\u1EAFt ship" }, 400);
        const upsert = /* @__PURE__ */ __name((k, v) => env2.DB.prepare(
          "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        ).bind(k, JSON.stringify(v ?? null)), "upsert");
        await env2.DB.batch([
          upsert("ship_enabled", enabled),
          upsert("ship_disable_reason", reason),
          upsert("ship_disable_message", reason)
        ]);
        return json({ success: true, ship_enabled: enabled, ship_disable_message: reason });
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    if (url.pathname === "/api/admin/zalo-bot/test" && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleZaloBotTest(env2);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/orders/history" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      if (!auth.valid) return auth.error;
      try {
        const tableId = url.searchParams.get("table_id");
        return await handleOrderHistory(env2, tableId ? Number(tableId) : null);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/settings" && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        const body = await request.json();
        for (const [key, value] of Object.entries(body)) {
          await env2.DB.prepare(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
          ).bind(key, JSON.stringify(value ?? null)).run();
        }
        return await handleGetSettings(env2);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    if (url.pathname === "/api/reports/stats" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleReportsStats(env2, url);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/reports/chart-data" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleReportsChartData(env2, url);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/reports/product-sales" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleReportsProductSales(env2, url);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/reports/category-sales" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleReportsCategorySales(env2, url);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/hub/stores" && request.method === "POST") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        const body = await request.json();
        return await handleHubCreateStore(env2, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    if (url.pathname === "/api/hub/stores" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      return await handleHubListStores(env2);
    }
    if (url.pathname === "/api/hub/ping" && request.method === "GET") {
      const store = await requireHubStore(env2, request);
      if (!store) return json({ message: "Sai hub key" }, 401);
      return json({ ok: true, store_id: store.store_id, name: store.name });
    }
    if (url.pathname === "/api/hub/push" && request.method === "POST") {
      const store = await requireHubStore(env2, request);
      if (!store) return json({ message: "Sai hub key" }, 401);
      try {
        const body = await request.json();
        return await handleHubPush(env2, store.store_id, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    if (url.pathname === "/api/hub/report" && request.method === "GET") {
      const auth = await requireAuth(env2, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      return await handleHubReport(env2, url.searchParams.get("date"));
    }
    const assetResp = await env2.ASSETS.fetch(request);
    if (assetResp.status === 404 && !url.pathname.startsWith("/api/")) {
      const indexResp = await env2.ASSETS.fetch(new Request(new URL("/index.html", url)));
      if (indexResp.ok) return indexResp;
    }
    return assetResp;
  }
};
async function ensureHubSchema(env2) {
  await env2.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hub_stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id TEXT UNIQUE NOT NULL,
      name TEXT,
      api_key TEXT NOT NULL,
      last_sync_at TEXT,
      last_sync_detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();
  for (const col of ["last_sync_at TEXT", "last_sync_detail TEXT"]) {
    try {
      await env2.DB.prepare(`ALTER TABLE hub_stores ADD COLUMN ${col}`).run();
    } catch {
    }
  }
  await env2.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hub_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id TEXT NOT NULL,
      local_id INTEGER NOT NULL,
      display_code TEXT,
      order_type TEXT,
      status TEXT,
      table_name TEXT,
      customer_phone TEXT,
      total INTEGER NOT NULL DEFAULT 0,
      paid_at TEXT,
      created_at TEXT,
      updated_at TEXT,
      items_json TEXT,
      synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(store_id, local_id)
    )`
  ).run();
  await env2.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hub_products (
      store_id TEXT NOT NULL,
      local_id INTEGER NOT NULL,
      name TEXT,
      price INTEGER,
      category TEXT,
      available INTEGER,
      production_unit TEXT,
      sizes_json TEXT,
      synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(store_id, local_id)
    )`
  ).run();
  await env2.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hub_categories (
      store_id TEXT NOT NULL,
      local_id INTEGER NOT NULL,
      name TEXT,
      sort_order INTEGER,
      production_unit TEXT,
      UNIQUE(store_id, local_id)
    )`
  ).run();
  await env2.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hub_tables (
      store_id TEXT NOT NULL,
      local_id INTEGER NOT NULL,
      name TEXT,
      seats INTEGER,
      UNIQUE(store_id, local_id)
    )`
  ).run();
  await env2.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hub_attendance (
      store_id TEXT NOT NULL,
      local_id INTEGER NOT NULL,
      user_name TEXT,
      check_in_at TEXT,
      check_out_at TEXT,
      synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(store_id, local_id)
    )`
  ).run();
  await env2.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hub_payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id TEXT NOT NULL,
      local_id INTEGER,
      user_name TEXT,
      period TEXT,
      hours REAL, rate INTEGER, bonus INTEGER DEFAULT 0, penalty INTEGER DEFAULT 0,
      total INTEGER, note TEXT,
      synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(store_id, local_id)
    )`
  ).run();
}
__name(ensureHubSchema, "ensureHubSchema");
async function requireHubStore(env2, request) {
  await ensureHubSchema(env2);
  const auth = request.headers.get("Authorization") || "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!key) return null;
  return await env2.DB.prepare(
    "SELECT store_id, name FROM hub_stores WHERE api_key = ?"
  ).bind(key).first();
}
__name(requireHubStore, "requireHubStore");
function hubApiKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "hub_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hubApiKey, "hubApiKey");
async function handleHubCreateStore(env2, body) {
  await ensureHubSchema(env2);
  const storeId = String(body?.store_id || "").trim();
  const name = String(body?.name || storeId).trim();
  if (!storeId) return json({ message: "Thieu store_id" }, 400);
  const apiKey = hubApiKey();
  await env2.DB.prepare(
    `INSERT INTO hub_stores (store_id, name, api_key) VALUES (?, ?, ?)
     ON CONFLICT(store_id) DO UPDATE SET name = excluded.name, api_key = excluded.api_key`
  ).bind(storeId, name, apiKey).run();
  return json({ ok: true, store_id: storeId, name, api_key: apiKey });
}
__name(handleHubCreateStore, "handleHubCreateStore");
async function handleHubListStores(env2) {
  await ensureHubSchema(env2);
  const r = await env2.DB.prepare(
    "SELECT store_id, name, api_key, last_sync_at, last_sync_detail, created_at FROM hub_stores ORDER BY store_id"
  ).all();
  const stores = (r.results || []).map((s) => ({
    ...s,
    api_key: s.api_key ? "..." + String(s.api_key).slice(-6) : ""
  }));
  return json({ stores });
}
__name(handleHubListStores, "handleHubListStores");
async function handleHubPush(env2, storeId, body) {
  await ensureHubSchema(env2);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let orders = 0, products = 0, categories = 0, tables = 0, attendance = 0;
  const orderRows = Array.isArray(body?.orders) ? body.orders : [];
  for (const o of orderRows) {
    if (o?.local_id == null) continue;
    await env2.DB.prepare(
      `INSERT INTO hub_orders (store_id, local_id, display_code, order_type, status,
        table_name, customer_phone, total, paid_at, created_at, updated_at, items_json, synced_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(store_id, local_id) DO UPDATE SET
        display_code=excluded.display_code, order_type=excluded.order_type,
        status=excluded.status, table_name=excluded.table_name,
        customer_phone=excluded.customer_phone, total=excluded.total,
        paid_at=excluded.paid_at, updated_at=excluded.updated_at,
        items_json=excluded.items_json, synced_at=excluded.synced_at`
    ).bind(
      storeId,
      o.local_id,
      o.display_code || null,
      o.order_type || "dine_in",
      o.status || "open",
      o.table_name || null,
      o.customer_phone || null,
      o.total || 0,
      o.paid_at || null,
      o.created_at || null,
      o.updated_at || null,
      JSON.stringify(o.items || []),
      now
    ).run();
    orders++;
  }
  const catRows = Array.isArray(body?.categories) ? body.categories : [];
  const catIds = [];
  for (const c of catRows) {
    if (c?.local_id == null) continue;
    catIds.push(c.local_id);
    await env2.DB.prepare(
      `INSERT INTO hub_categories (store_id, local_id, name, sort_order, production_unit)
       VALUES (?,?,?,?,?)
       ON CONFLICT(store_id, local_id) DO UPDATE SET
        name=excluded.name, sort_order=excluded.sort_order, production_unit=excluded.production_unit`
    ).bind(storeId, c.local_id, c.name || "", c.sort_order || 0, c.production_unit || "counter").run();
    categories++;
  }
  const prodRows = Array.isArray(body?.products) ? body.products : [];
  const prodIds = [];
  for (const p of prodRows) {
    if (p?.local_id == null) continue;
    prodIds.push(p.local_id);
    await env2.DB.prepare(
      `INSERT INTO hub_products (store_id, local_id, name, price, category, available, production_unit, sizes_json, synced_at)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON CONFLICT(store_id, local_id) DO UPDATE SET
        name=excluded.name, price=excluded.price, category=excluded.category,
        available=excluded.available, production_unit=excluded.production_unit,
        sizes_json=excluded.sizes_json, synced_at=excluded.synced_at`
    ).bind(
      storeId,
      p.local_id,
      p.name || "",
      p.price || 0,
      p.category || null,
      p.available ? 1 : 0,
      p.production_unit || "counter",
      JSON.stringify(p.sizes || []),
      now
    ).run();
    products++;
  }
  const tableRows = Array.isArray(body?.tables) ? body.tables : [];
  const tableIds = [];
  for (const t of tableRows) {
    if (t?.local_id == null) continue;
    tableIds.push(t.local_id);
    await env2.DB.prepare(
      `INSERT INTO hub_tables (store_id, local_id, name, seats)
       VALUES (?,?,?,?)
       ON CONFLICT(store_id, local_id) DO UPDATE SET name=excluded.name, seats=excluded.seats`
    ).bind(storeId, t.local_id, t.name || "", t.seats || 0).run();
    tables++;
  }
  const attRows = Array.isArray(body?.attendance) ? body.attendance : [];
  for (const a of attRows) {
    if (a?.local_id == null) continue;
    await env2.DB.prepare(
      `INSERT INTO hub_attendance (store_id, local_id, user_name, check_in_at, check_out_at, synced_at)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(store_id, local_id) DO UPDATE SET
        user_name=excluded.user_name, check_in_at=excluded.check_in_at,
        check_out_at=excluded.check_out_at, synced_at=excluded.synced_at`
    ).bind(
      storeId,
      a.local_id,
      a.user_name || null,
      a.check_in_at || null,
      a.check_out_at || null,
      now
    ).run();
    attendance++;
  }
  const payRows = Array.isArray(body?.payroll) ? body.payroll : [];
  let payroll = 0;
  for (const p of payRows) {
    if (p?.local_id == null) continue;
    await env2.DB.prepare(
      `INSERT INTO hub_payroll (store_id, local_id, user_name, period, hours, rate, bonus, penalty, total, note, synced_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(store_id, local_id) DO UPDATE SET
        user_name=excluded.user_name, period=excluded.period, hours=excluded.hours,
        rate=excluded.rate, bonus=excluded.bonus, penalty=excluded.penalty,
        total=excluded.total, note=excluded.note, synced_at=excluded.synced_at`
    ).bind(
      storeId,
      p.local_id,
      p.user_name || null,
      p.period || null,
      Number(p.hours) || 0,
      Number(p.rate) || 0,
      Number(p.bonus) || 0,
      Number(p.penalty) || 0,
      Number(p.total) || 0,
      p.note || null,
      now
    ).run();
    payroll++;
  }
  if (body?.full_catalog) {
    const wipeNotIn = /* @__PURE__ */ __name(async (table3, ids) => {
      if (!ids.length) {
        await env2.DB.prepare(`DELETE FROM ${table3} WHERE store_id = ?`).bind(storeId).run();
      } else {
        await env2.DB.prepare(
          `DELETE FROM ${table3} WHERE store_id = ? AND local_id NOT IN (${ids.map(() => "?").join(",")})`
        ).bind(storeId, ...ids).run();
      }
    }, "wipeNotIn");
    await wipeNotIn("hub_categories", catIds);
    await wipeNotIn("hub_products", prodIds);
    await wipeNotIn("hub_tables", tableIds);
  }
  await env2.DB.prepare(
    "UPDATE hub_stores SET last_sync_at = ?, last_sync_detail = ? WHERE store_id = ?"
  ).bind(now, `${orders} \u0111\u01A1n, ${products} m\xF3n, ${categories} danh m\u1EE5c, ${tables} b\xE0n, ${attendance} ch\u1EA5m c\xF4ng, ${payroll} phi\u1EBFu l\u01B0\u01A1ng`, storeId).run();
  return json({ ok: true, received: { orders, products, categories, tables, attendance, payroll } });
}
__name(handleHubPush, "handleHubPush");
async function handleHubReport(env2, date) {
  await ensureHubSchema(env2);
  const day = date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const stores = await env2.DB.prepare(
    "SELECT store_id, name, last_sync_at, last_sync_detail FROM hub_stores ORDER BY store_id"
  ).all();
  const perStore = await env2.DB.prepare(
    `SELECT store_id,
       COUNT(*) AS orders_count,
       SUM(CASE WHEN status = 'completed' OR status = 'paid' THEN total ELSE 0 END) AS revenue
     FROM hub_orders
     WHERE substr(created_at, 1, 10) = ?
     GROUP BY store_id`
  ).bind(day).all();
  const totals = await env2.DB.prepare(
    `SELECT store_id, COUNT(*) AS orders_count,
       SUM(CASE WHEN status = 'completed' OR status = 'paid' THEN total ELSE 0 END) AS revenue
     FROM hub_orders GROUP BY store_id`
  ).all();
  const attToday = await env2.DB.prepare(
    `SELECT store_id, COUNT(*) AS shifts,
       SUM((julianday(check_out_at) - julianday(check_in_at)) * 24.0) AS hours
     FROM hub_attendance
     WHERE check_out_at IS NOT NULL AND substr(check_in_at, 1, 10) = ?
     GROUP BY store_id`
  ).bind(day).all();
  return json({
    date: day,
    stores: stores.results || [],
    today: perStore.results || [],
    all_time: totals.results || [],
    attendance_today: attToday.results || []
  });
}
__name(handleHubReport, "handleHubReport");
var worker_default2 = worker_default;
export {
  worker_default2 as default
};
//# sourceMappingURL=worker.js.map
