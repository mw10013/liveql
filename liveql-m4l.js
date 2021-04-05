inlets = 1;
outlets = 1;

function getLive(idOrPath) {
  var live = new LiveAPI(
    typeof idOrPath === "string" ? idOrPath : "id " + idOrPath
  );
  // LOM says id is number, but string here.
  if (live.id === "0") {
    throw "Invalid live id or path: " + idOrPath;
  }
  return live;
}
getLive.local = 1;

function outletSuccessfulResult(actionId, data) {
  outlet(
    0,
    "result",
    JSON.stringify({
      status: "succeeded",
      actionId: actionId,
      data: data,
    })
  );
}
outletSuccessfulResult.local = 1;

function outletFailedResult(actionId, message) {
  outlet(
    0,
    "result",
    JSON.stringify({
      status: "failed",
      actionId: actionId,
      message: message.toString(),
    })
  );
}
outletFailedResult.local = 1;

function get(json) {
  var actionId = null;
  try {
    var params = JSON.parse(json);
    actionId = params.actionId;
    var live = getLive(params.idOrPath);

    var o = {
      id: parseInt(live.id), // LOM says this should be number instead of string
      path: live.unquotedpath,
      type: live.type,
    };
    (params.propertyKeysSingle || []).forEach(function (k) {
      var propertyArr = live.get(k);
      if (propertyArr.length === 1) {
        o[k] = propertyArr[0];
      }
    });

    (params.propertyKeysMultiple || []).forEach(function (k) {
      o[k] = live.get(k);
    });

    (params.childKeysSingle || []).forEach(function (k) {
      const id = live.get(k)[1];
      o[k] = id === 0 ? null : id;
    });

    (params.childKeysMultiple || []).forEach(function (k) {
      o[k] = live.get(k).filter(function (v) {
        return v !== "id";
      });
    });

    outletSuccessfulResult(actionId, o);
  } catch (err) {
    outletFailedResult(actionId, err);
  }
}

function set(json) {
  var actionId = null;
  try {
    var params = JSON.parse(json);
    actionId = params.actionId;
    var live = getLive(params.idOrPath);
    var data = live.set(params.property, params.value);
    outletSuccessfulResult(actionId, data);
  } catch (err) {
    outletFailedResult(actionId, err);
  }
}

function call(json) {
  var actionId = null;
  try {
    var params = JSON.parse(json);
    actionId = params.actionId;
    var live = getLive(params.idOrPath);
    var data = live.call(params.args);
    outletSuccessfulResult(actionId, data);
  } catch (err) {
    outletFailedResult(actionId, err);
  }
}
