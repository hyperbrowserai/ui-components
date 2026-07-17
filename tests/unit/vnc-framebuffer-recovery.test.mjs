import assert from "node:assert/strict";
import {
  createFramebufferRefreshRecovery,
  requestFullFramebufferRefresh,
} from "../../dist/esm/components/vnc-framebuffer-recovery.js";

class FakeRuntime {
  nowMs = 0;
  nextTimerId = 1;
  timers = new Map();

  now = () => this.nowMs;

  setTimeout = (callback, delayMs) =>
    this.addTimer(callback, delayMs, null);

  clearTimeout = (timer) => {
    this.timers.delete(timer);
  };

  setInterval = (callback, delayMs) =>
    this.addTimer(callback, delayMs, delayMs);

  clearInterval = (timer) => {
    this.timers.delete(timer);
  };

  addTimer(callback, delayMs, intervalMs) {
    const id = this.nextTimerId++;
    this.timers.set(id, {
      callback,
      intervalMs,
      runAt: this.nowMs + delayMs,
    });
    return id;
  }

  advance(delayMs) {
    const target = this.nowMs + delayMs;

    while (true) {
      let nextId = null;
      let nextTimer = null;
      for (const [id, timer] of this.timers) {
        if (
          timer.runAt <= target &&
          (!nextTimer || timer.runAt < nextTimer.runAt)
        ) {
          nextId = id;
          nextTimer = timer;
        }
      }

      if (nextId === null || nextTimer === null) {
        break;
      }

      this.nowMs = nextTimer.runAt;
      if (nextTimer.intervalMs === null) {
        this.timers.delete(nextId);
      } else {
        nextTimer.runAt += nextTimer.intervalMs;
      }
      nextTimer.callback();
    }

    this.nowMs = target;
  }
}

class FakeSocket {
  listeners = new Map();
  sentMessages = [];

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  send(data) {
    this.sentMessages.push(Array.from(new Uint8Array(data)));
  }

  emit(type) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ type });
    }
  }
}

function createRfb(rawSocket, width = 1920, height = 1080) {
  return {
    _fbWidth: width,
    _fbHeight: height,
    _rfbConnectionState: "connected",
    _sock: {
      readyState: "open",
      _websocket: rawSocket,
    },
  };
}

function testDelayedRfbRefAndStartupRefreshes() {
  const runtime = new FakeRuntime();
  const socket = new FakeSocket();
  let rfb = null;
  const recovery = createFramebufferRefreshRecovery(() => rfb, runtime);

  recovery.start();
  runtime.advance(0);
  rfb = createRfb(socket);
  runtime.advance(25);
  runtime.advance(249);
  assert.equal(socket.sentMessages.length, 0);

  runtime.advance(1);
  assert.deepEqual(socket.sentMessages[0], [3, 0, 0, 0, 0, 0, 7, 128, 4, 56]);
  runtime.advance(1250);
  assert.equal(socket.sentMessages.length, 2);
  runtime.advance(2000);
  assert.equal(socket.sentMessages.length, 3);
}

function testInboundTrackingAndBoundedStallRefreshes() {
  const runtime = new FakeRuntime();
  const socket = new FakeSocket();
  const recovery = createFramebufferRefreshRecovery(
    () => createRfb(socket),
    runtime
  );

  recovery.start();
  runtime.advance(0);
  runtime.advance(9000);
  socket.emit("message");
  runtime.advance(6000);
  assert.equal(socket.sentMessages.length, 3);

  runtime.advance(5000);
  assert.equal(socket.sentMessages.length, 4);
  runtime.advance(10000);
  assert.equal(socket.sentMessages.length, 5);
  runtime.advance(30000);
  assert.equal(socket.sentMessages.length, 5);
}

function testSocketCloseAndReconnectCleanup() {
  const runtime = new FakeRuntime();
  const firstSocket = new FakeSocket();
  const secondSocket = new FakeSocket();
  let rfb = createRfb(firstSocket);
  const recovery = createFramebufferRefreshRecovery(() => rfb, runtime);

  recovery.start();
  runtime.advance(0);
  rfb = createRfb(secondSocket);
  recovery.start();
  runtime.advance(0);
  firstSocket.emit("close");
  runtime.advance(3500);

  assert.equal(firstSocket.sentMessages.length, 0);
  assert.equal(secondSocket.sentMessages.length, 3);

  secondSocket.emit("close");
  runtime.advance(30000);
  assert.equal(secondSocket.sentMessages.length, 3);
}

function testUnsupportedInternalsFailClosed() {
  assert.equal(requestFullFramebufferRefresh(null), false);
  assert.equal(
    requestFullFramebufferRefresh({
      _fbWidth: 1920,
      _fbHeight: 1080,
      _rfbConnectionState: "connected",
      _sock: { readyState: "open", _websocket: {} },
    }),
    false
  );

  const throwingSocket = new FakeSocket();
  throwingSocket.send = () => {
    throw new Error("socket closed");
  };
  assert.equal(
    requestFullFramebufferRefresh(createRfb(throwingSocket)),
    false
  );
}

testDelayedRfbRefAndStartupRefreshes();
testInboundTrackingAndBoundedStallRefreshes();
testSocketCloseAndReconnectCleanup();
testUnsupportedInternalsFailClosed();
console.log("VNC framebuffer recovery tests passed.");
