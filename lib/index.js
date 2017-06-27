'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var WebSocket = window.WebSocket || null;

function WSTransport () {
	EventEmitter.call(this);
	this._socket = null;
}

util.inherits(WSTransport, EventEmitter);

WSTransport.register = function (transportProvider) {
	transportProvider.registerTransport('wss', function () { return new WSTransport(); });
	transportProvider.registerTransport('ws', function () { return new WSTransport(); });
};

WSTransport.prototype.connect = function (address, sslOptions) {
	// The subprotocol specified in extraHeaders is specific to Azure IoT Hub.
	var options = sslOptions ? sslOptions : {};

	if (!options.extraHeaders) options.extraHeaders = {};
	options.protocols = ['AMQPWSB10'];

	this._socket = new WebSocket( address.href, options.protocols );
	this._options = options;

	var self = this;
	this._socket.addEventListener('open', function () { self.emit('connect'); });
	this._socket.addEventListener('error', function (err) {
		self.hasError = true;
		self.emit('error', err);
	});

	this._socket.addEventListener( 'message', function ( message ) {
		if( typeof message.data === 'string' ) {
			self.emit('data', message.data );
		}
		else if( message.data instanceof Blob ) {
			var arrayBuffer;
			var fileReader = new FileReader();

			fileReader.onload = function() {
			    arrayBuffer = this.result;
				self.emit( 'data', arrayBuffer);
			};
			fileReader.readAsArrayBuffer( message.data );
		}
		else if( message.data instanceof ArrayBuffer ) {
				self.emit( 'data', message.data );
		}
		else {

		}
	});

	this._socket.addEventListener('close', function (code, reason) {
		process.nextTick(function() {
			self.emit('end', code + ": " + reason);
		});
	});
};

WSTransport.prototype.write = function (data) {
	if(!this._socket)
		throw new Error('Socket not connected');

	this._socket.send(data.buffer);
};

WSTransport.prototype.end = function() {
	if (!this._socket)
		throw new Error('Socket not connected');

	if (this._socket.readyState !== this._socket.CLOSED && !this.hasError) {
		this._socket.close();
	}
};

WSTransport.prototype.destroy = function() {
	this._socket = null;
};

module.exports = WSTransport;
