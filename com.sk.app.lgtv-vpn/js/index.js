/* Remote focus helpers */
var curState = "UNKNOWN";
var mgmtPort = 7505;
var launchInitialized = false;

function noop() {}

function logMessage(message) {
  if (window.console && typeof window.console.log === "function") {
    window.console.log(message);
  }
}

function containsText(value, search) {
  return value.indexOf(search) !== -1;
}

function trimString(value) {
  return String(value).replace(/^\s+|\s+$/g, "");
}

function setElementText(element, text) {
  if (!element) {
    return;
  }

  if ("textContent" in element) {
    element.textContent = text;
    return;
  }

  element.innerText = text;
}

function addClassName(element, className) {
  var currentClasses;

  if (!element || !className) {
    return;
  }

  currentClasses = " " + (element.className || "") + " ";
  if (currentClasses.indexOf(" " + className + " ") === -1) {
    element.className = element.className ? element.className + " " + className : className;
  }
}

function removeClassName(element, className) {
  var currentClasses;

  if (!element || !className) {
    return;
  }

  currentClasses = " " + (element.className || "") + " ";
  while (currentClasses.indexOf(" " + className + " ") !== -1) {
    currentClasses = currentClasses.replace(" " + className + " ", " ");
  }

  element.className = trimString(currentClasses);
}

function refreshFocusableItems() {
  if (window.SpatialNavigation && typeof window.SpatialNavigation.makeFocusable === "function") {
    window.SpatialNavigation.makeFocusable();
  }
  focusFirstEnabledItem();
}

var eventRegister = (function () {
  function items() {
    return document.getElementsByClassName("item");
  }

  function blurAll() {
    var nodes = items();
    var i;

    for (i = 0; i < nodes.length; i += 1) {
      nodes[i].blur();
    }
  }

  function getEventTarget(event) {
    return event.target || event.srcElement;
  }

  function handleMouseOver(event) {
    var target = getEventTarget(event);

    blurAll();
    if (target && typeof target.focus === "function") {
      target.focus();
    }
  }

  function handleMouseOut(event) {
    var target = getEventTarget(event);

    if (target && typeof target.blur === "function") {
      target.blur();
    }
  }

  function handleKeyDown(event) {
    var target = getEventTarget(event);

    if (event.keyCode === 13) {
      addClassName(target, "active");
    }
  }

  function handleKeyUp(event) {
    var target = getEventTarget(event);

    if (event.keyCode === 13) {
      removeClassName(target, "active");
    }
  }

  function add() {
    var nodes = items();
    var i;
    var node;

    for (i = 0; i < nodes.length; i += 1) {
      node = nodes[i];
      if (node.__vpnFocusBound) {
        continue;
      }

      node.__vpnFocusBound = true;
      node.addEventListener("mouseover", handleMouseOver, false);
      node.addEventListener("mouseout", handleMouseOut, false);
      node.addEventListener("keydown", handleKeyDown, false);
      node.addEventListener("keyup", handleKeyUp, false);
    }
  }

  return { add: add };
}());

function lunaCall(uri, parameters, timeout, onSuccess, onFailure) {
  var timeoutMs = timeout;
  var handleSuccess = onSuccess || noop;
  var handleFailure = onFailure || noop;
  var separatorIndex;
  var completed = false;
  var timerId;

  if (typeof timeoutMs !== "number") {
    handleFailure = onSuccess || noop;
    handleSuccess = timeout || noop;
    timeoutMs = 8000;
  }

  if (!window.webOS || !window.webOS.service || typeof window.webOS.service.request !== "function") {
    handleFailure(new Error("webOS service API unavailable."));
    return;
  }

  separatorIndex = uri.indexOf("/", 7);
  timerId = window.setTimeout(function () {
    if (completed) {
      return;
    }

    completed = true;
    handleFailure(new Error("Timeout"));
  }, timeoutMs);

  function finish(callback, payload) {
    if (completed) {
      return;
    }

    completed = true;
    window.clearTimeout(timerId);
    callback(payload);
  }

  try {
    window.webOS.service.request(uri.substring(0, separatorIndex), {
      method: uri.substring(separatorIndex + 1),
      parameters: parameters || {},
      onSuccess: function (response) {
        finish(handleSuccess, response);
      },
      onFailure: function (response) {
        finish(handleFailure, new Error(JSON.stringify(response)));
      }
    });
  } catch (error) {
    finish(handleFailure, error);
  }
}

function setButtonLabel(state) {
  var button = document.getElementById("cbtn");
  setElementText(button, state === "CONNECTED" ? "Stop" : "Connect");
}

function focusFirstEnabledItem() {
  var items = document.getElementsByClassName("item");
  var i;

  for (i = 0; i < items.length; i += 1) {
    if (!items[i].disabled) {
      items[i].focus();
      return;
    }
  }
}

function setButtonDisabled(disabled) {
  document.getElementById("cbtn").disabled = disabled;
  refreshFocusableItems();
}

function setDropdownDisabled(disabled) {
  document.getElementById("configDropdown").disabled = disabled;
  refreshFocusableItems();
}

function updateStateLabel(text, className) {
  var stateElement = document.getElementById("state");

  stateElement.className = className || "";
  setElementText(stateElement, text);
}

function setDebug(message) {
  setElementText(document.getElementById("debugInfo"), "DebugMsg:\n" + message);
}

function extendDebug(message) {
  var debugElement = document.getElementById("debugInfo");
  var currentValue = debugElement.textContent || debugElement.innerText || "";

  setElementText(debugElement, currentValue ? currentValue + "\n" + message : message);
}

function showError(message) {
  setElementText(document.getElementById("errorMsg"), message);
}

function clearDropdown(dropdown) {
  while (dropdown.firstChild) {
    dropdown.removeChild(dropdown.firstChild);
  }
}

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function buildOpenVpnStartCommand(configName) {
  var openVpnPath = "/media/developer/apps/usr/palm/applications/com.sk.app.lgtv-vpn/res/openvpn";
  var configPath = "/media/developer/apps/usr/palm/applications/com.sk.app.lgtv-vpn/profiles/" + configName;

  /* HBC /spawn keeps a process attached to the service. Close inherited fds and
   * launch OpenVPN through /exec so the daemon cannot keep HBC service handles.
   */
  return 'i=3; while [ "$i" -lt 256 ]; do eval "exec ${i}>&-"; i=$((i+1)); done; ' +
    'exec ' + shellQuote(openVpnPath) +
    " --management 127.0.0.1 " + mgmtPort +
    " --config " + shellQuote(configPath) +
    " --daemon </dev/null >/dev/null 2>&1";
}

function parseProfileList(output) {
  var lines = (output || "").split(/\r?\n/);
  var files = [];
  var i;
  var fileName;

  for (i = 0; i < lines.length; i += 1) {
    fileName = trimString(lines[i]);
    if (fileName) {
      files.push(fileName);
    }
  }

  return files;
}

function terminateDaemon(done) {
  lunaCall(
    "luna://org.webosbrew.hbchannel.service/exec",
    { command: '{ echo "signal SIGTERM"; sleep 1s; echo "exit";} | nc 127.0.0.1 ' + mgmtPort },
    15000,
    function () {
      done();
    },
    function (error) {
      extendDebug("Cleanup stop failed: " + error.message);
      done();
    }
  );
}

function getState(retries, canFail, done) {
  var remainingRetries = typeof retries === "number" ? retries : 3;
  var allowFailure = !!canFail;
  var onComplete = done || noop;

  updateStateLabel("Checking...", "connecting");
  showError("");

  lunaCall(
    "luna://org.webosbrew.hbchannel.service/exec",
    { command: '{ echo "state"; sleep 1s; echo "exit";} | nc 127.0.0.1 ' + mgmtPort },
    function (response) {
      var output = response.stdoutString || "";

      setDebug(output);

      if (containsText(output, "CONNECTED")) {
        curState = "CONNECTED";
        updateStateLabel("CONNECTED", "connected");
        setButtonLabel(curState);
        setButtonDisabled(false);
        setDropdownDisabled(true);
        onComplete(null, curState);
        return;
      }

      if (containsText(output, "WAIT")) {
        window.setTimeout(function () {
          logMessage("state from retry wait");
          getState(remainingRetries - 1, allowFailure, onComplete);
        }, 1500);
        extendDebug("VPN is connecting, retrying state check...");
        return;
      }

      curState = "DISCONNECTED";
      updateStateLabel("DISCONNECTED", "disconnected");
      setButtonLabel(curState);
      setButtonDisabled(false);
      setDropdownDisabled(false);
      onComplete(null, curState);
    },
    function (error) {
      if (remainingRetries > 0) {
        window.setTimeout(function () {
          logMessage("state from retry");
          getState(remainingRetries - 1, allowFailure, onComplete);
        }, 1500);

        if (!allowFailure) {
          extendDebug("VPN not responding, retrying state check (" + remainingRetries + " attempts left)...");
        }
        return;
      }

      curState = "DISCONNECTED";
      updateStateLabel("DISCONNECTED", "disconnected");
      setButtonLabel(curState);
      setButtonDisabled(false);
      setDropdownDisabled(false);

      if (!allowFailure) {
        setDebug(error.message);
        showError("Could not connect to management interface.");
      }

      onComplete(error);
    }
  );
}

function loadProfiles(done) {
  var dropdown = document.getElementById("configDropdown");

  clearDropdown(dropdown);

  lunaCall(
    "luna://org.webosbrew.hbchannel.service/exec",
    {
      command: "cd /media/developer/apps/usr/palm/applications/com.sk.app.lgtv-vpn/profiles && ls -1 *.ovpn"
    },
    15000,
    function (response) {
      var files = parseProfileList(response.stdoutString);
      var emptyOption;
      var option;
      var i;

      if (files.length === 0) {
        emptyOption = document.createElement("option");
        emptyOption.value = "";
        setElementText(emptyOption, "Keine Profile gefunden");
        dropdown.appendChild(emptyOption);
        setDropdownDisabled(true);
        setButtonDisabled(true);
        showError("No Profiles found in profiles folder. Please make sure to upload .ovpn files into /media/developer/apps/usr/palm/applications/com.sk.app.lgtv-vpn/profiles");
        done(new Error("No Profiles found"));
        return;
      }

      for (i = 0; i < files.length; i += 1) {
        option = document.createElement("option");
        option.value = files[i];
        setElementText(option, files[i].replace(/\.ovpn$/i, ""));
        dropdown.appendChild(option);
      }

      extendDebug("Loaded " + files.length + " profile(s).");
      done(null);
    },
    function (error) {
      setDropdownDisabled(true);
      setButtonDisabled(true);
      showError("Profiles could not be loaded: " + error.message);
      done(error);
    }
  );
}

function connect() {
  var configName = document.getElementById("configDropdown").value;
  var startCommand;

  if (!configName) {
    showError("No Profile found");
    return;
  }

  showError("");
  setButtonDisabled(true);
  setDropdownDisabled(true);
  setDebug("Launching OpenVPN with " + configName);
  startCommand = buildOpenVpnStartCommand(configName);

  lunaCall(
    "luna://org.webosbrew.hbchannel.service/exec",
    {
      command: startCommand
    },
    function () {
      logMessage("state from connect");
      window.setTimeout(function () {
        getState();
      }, 2000);
    },
    function (error) {
      setDebug(error.message);
      showError("Start failed " + error.message);
      setButtonDisabled(false);
      setDropdownDisabled(false);
    }
  );
}

function disconnect() {
  showError("");
  setButtonDisabled(true);
  setDropdownDisabled(true);
  setDebug("Stopping VPN Connection...");

  terminateDaemon(function () {
    window.setTimeout(function () {
      logMessage("state from disconnect");
      getState(1, true, function () {
        setDebug("VPN Stopped.");
      });
    }, 2000);
  });
}

function btnClick() {
  if (curState === "CONNECTED") {
    disconnect();
    return;
  }

  connect();
}

function initVPN(done) {
  function finishInit() {
    extendDebug("Checking management interface...");
    logMessage("state from initVPN");
    getState(1, true, function () {
      done();
    });
  }

  setDebug("Preparing openvpn binary...");

  lunaCall(
    "luna://org.webosbrew.hbchannel.service/exec",
    {
      command: "chmod +x /media/developer/apps/usr/palm/applications/com.sk.app.lgtv-vpn/res/openvpn"
    },
    function () {
      finishInit();
    },
    function (error) {
      extendDebug("Failed to set executable flag: " + error.message);
      finishInit();
    }
  );
}

function bindUiOnce() {
  if (launchInitialized) {
    return;
  }

  SpatialNavigation.init();
  SpatialNavigation.add({ selector: ".item" });
  SpatialNavigation.makeFocusable();
  eventRegister.add();
  document.getElementById("cbtn").addEventListener("click", btnClick, false);
  launchInitialized = true;
}

function launchEvent() {
  bindUiOnce();
  refreshFocusableItems();
  eventRegister.add();

  initVPN(function () {
    extendDebug("Loading Profiles, this could take some seconds...");
    loadProfiles(function (error) {
      if (error) {
        extendDebug("Failed to load profiles.");
        return;
      }

      extendDebug("Initialization complete.");
    });
  });
}

document.addEventListener("webOSLaunch", launchEvent, true);
document.addEventListener("webOSRelaunch", launchEvent, true);
