var EventEmitter = require('events').EventEmitter,
	util = require('util'),
	spawn = require('child_process').spawn;

var callbacks = {};

function onError(err) {
	this.exit();
	this.emit("error", err);
}

function listen(data) {
	var data = data.toString('utf8');
	try {
		var json = JSON.parse(data);
	} catch (e) {
		return this.private.onError(new Error("Can't parse JSON response from DApp: \n" + data)).bind(this);
	}

	if (json.callback_id === null || json.callback_id === undefined) {
		return this.private.onError(new Error("Incorrect response from vm, missed callback id field")).bind(this);
	}

	try {
		var callback_id = parseInt(json.callback_id);
	} catch (e) {
		return this.private.onError(new Error("Incorrect callback_id field, callback_id should be a number")).bind(this);
	}

	if (isNaN(callback_id)) {
		return this.private.onError(new Error("Incorrect callback_id field, callback_id should be a number")).bind(this);
	}

	if (json.type == "dapp_response") {
		var callback = callbacks[callback_id];

		if (!callback) {
			return this.private.onError(new Error("Crypti can't find callback_id from vm")).bind(this);
		}

		var error = json.error;
		var response = json.response;

		if (util.isArray(response)) {
			var args = [
				callback,
				error
			];

			args = args.concat(response);

			setImmediate.apply(null, args);
		} else {
			setImmediate(callback, error, response);
		}
	} else if (json.type == "dapp_call") {
		var message = json.message;

		if (message === null || message === undefined) {
			return this.private.onError(new Error("Crypti can't find message for request from vm")).bind(this);
		}

		this.apiHandler(message, function (err, response) {
			var responseObj = {
				type: "crypti_response",
				callback_id: callback_id,
				error: err,
				response: response
			};

			try {
				var responseString = JSON.stringify(responseObj);
			} catch (e) {
				return this.private.onError(new Error("Can't make response: " + e.toString())).bind(this);
			}

			this.child.stdio[3].write(responseString);
		}.bind(this));
	} else {
		this.exit();
		this.emit("error", new Error("Incorrect response type from vm"));
		return;
	}
}

var private = {
	onError: onError,
	listen: listen
}

var Sandbox = function (file, apiHandler) {
	EventEmitter.call(this);

	if (typeof file !== "string" || file === undefined || file === null) {
		throw new Error("First argument should be a path to file to launch in vm");
	}

	if (typeof apiHandler !== "function" || apiHandler === undefined || apiHandler === null) {
		throw new Error("Second argument should be a api hanlder callback");
	}

	this.file = file;
	this.apiHandler = apiHandler;
	this.child = null;
	this.private = private;
}

util.inherits(Sandbox, EventEmitter);

Sandbox.prototype.run = function () {
	this.child = spawn(__dirname + "/node/node", [this.file], {
		stdio: ['pipe', 'pipe', 'pipe', 'pipe', 'pipe']
	});

	// catch errors...
	this.child.on('error', this.private.onError.bind(this));
	this.child.stdio[0].on('error', this.private.onError.bind(this));
	this.child.stdio[1].on('error', this.private.onError.bind(this));
	this.child.stdio[2].on('error', this.private.onError.bind(this));
	this.child.stdio[3].on('error', this.private.onError.bind(this));
	this.child.stdio[4].on('error', this.private.onError.bind(this));

	this.child.stdio[4].on('data', this.private.listen.bind(this));
}


Sandbox.prototype.sendMessage = function (message, callback) {
	try {
		var messageString = JSON.stringify(message);
	} catch (e) {
		return setImmediate(callback, "Can't stringify message: " + e.toString());
	}

	var callback_id = Object.keys(callbacks).length + 1;

	var messageObj = {
		callback_id: callback_id,
		type: "crypti_call",
		message: messageString
	};

	this.child.stdio[3].write(JSON.stringify(messageObj));

	callbacks[callback_id] = callback;
}

Sandbox.prototype.exit = function () {
	if (this.child) {
		this.child.kill();
		this.emit("exit");
	}
}

module.exports = Sandbox;