'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');
// var ws = require('nodejs-websocket');

var WebSocket = window.WebSocket || null;

var ws = {
	_socket: null,
	_options: null,
	connect: function ( href, options ) {
		var _this = this;

		if( WebSocket ) {
			this._socket = new WebSocket( href, options.protocols );
		}
		this._href = href;
		this._options = options;

		this._socket.addEventListener( 'open', function () {
			_this._invoke( 'connect', arguments );
		});
		this._socket.addEventListener( 'close', function () {
			_this._invoke( 'close', arguments );
		});
		this._socket.addEventListener( 'error', function () {
			_this._invoke( 'error', arguments );
		});
		this._socket.addEventListener( 'message', function ( message ) {
			if( typeof message.data === 'string'  ) {
				_this._invoke( 'text', message );
			}
			else {
				var inStream

				if( message.data instanceof Blob ) {
					_this._invoke( 'binary', message );
				}
				else if( message.data instanceof ArrayBuffer ) {
					_this._invoke( 'binaryBuffer', message );
				}
				// TODO: send inStream in args...
			}

			_this._invoke( 'message', message );
		});

		return this;
	},
	_handlers: {},
	on: function ( eventName, handler ) {
		if( typeof handler === 'function' ) {
			if( !this._handlers[ eventName ] ) {
				this._handlers[ eventName ] = [];
			}
			this._handlers[ eventName ].push( handler );
		}
	},
	_invoke: function ( eventName, args ) {
		if( this._handlers[ eventName ] && this._handlers[ eventName ].length ) {
			this._handlers[ eventName ].forEach( function ( handler ) {
				handler.call( this, args );
			});
		}
	},
	sendBinary: function ( data ) {
		this._socket.send( data.buffer );
	},
	close: function () {
		this._socket.close();
	},
	removeAllListeners: function () {
		this._handlers = null;
	}
};

function WSTransport () {
	EventEmitter.call(this);
	this._socket = null;
}

util.inherits(WSTransport, EventEmitter);

WSTransport.register = function (transportProvider) {
	transportProvider.registerTransport('wss', function () { return new WSTransport(); });
};

WSTransport.prototype.connect = function (address, sslOptions) {
	// The subprotocol specified in extraHeaders is specific to Azure IoT Hub.
	var options = sslOptions ? sslOptions : {};
	if (!options.extraHeaders) options.extraHeaders = {};
	options.protocols = ['AMQPWSB10'];
	this._socket = ws.connect(address.href, options);

	var self = this;
	this._socket.on('connect', function () { self.emit('connect'); });
	this._socket.on('error', function (err) {
		self.hasError = true;
		self.emit('error', err);
	});
	this._socket.on('text', function (text) { self.emit('data', text); });
	this._socket.on('close', function (code, reason) {
		process.nextTick(function() {
			self.emit('end', code + ": " + reason);
		});
	});

	this._socket.on( 'binary', function ( message ) {
		var arrayBuffer;
		var fileReader = new FileReader();
		fileReader.onload = function() {
		    arrayBuffer = this.result;
			self.emit('data', arrayBuffer);
		};
		fileReader.readAsArrayBuffer( message.data );
	});

	this._socket.on( 'binaryBuffer', function ( message ) {
		self.emit( 'data', message.data );
	});

/*	this._socket.on('binary', function (inStream) {
		// Empty buffer for collecting binary data
		var data = new Buffer(0);
		// Read chunks of binary data and add to the buffer
		inStream.on("readable", function () {
			var newData = inStream.read();
			if (newData) {
				data = Buffer.concat([data, newData], data.length + newData.length);
			}
		});

		inStream.on("end", function () {
			self.emit('data', data);
		});
	});
*/
};

WSTransport.prototype.write = function (data) {
	if(!this._socket)
		throw new Error('Socket not connected');

	this._socket.sendBinary(data);
};

WSTransport.prototype.end = function() {
	if (!this._socket)
		throw new Error('Socket not connected');

	if (this._socket.readyState !== this._socket.CLOSED && !this.hasError) {
		this._socket.close();
	}

	this._socket.removeAllListeners();
};

WSTransport.prototype.destroy = function() {
	this._socket = null;
	this.removeAllListeners();
};

module.exports = WSTransport;