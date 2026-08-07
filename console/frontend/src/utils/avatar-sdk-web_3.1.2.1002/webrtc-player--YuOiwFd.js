import {
  o as e,
  p as t,
  g as r,
  h as n,
  i,
  e as a,
  a as o,
  f as s,
  _ as c,
  b as d,
  c as p,
  P as u,
  k as f,
  L as l,
  d as m,
  j as h,
  l as v,
  m as y,
  n as g,
} from './index-OS7Lza_r.js';
var C, S;
!(function e(r, n, i) {
  function a(s, c) {
    if (!n[s]) {
      if (!r[s]) {
        var d = 'function' == typeof t && t;
        if (!c && d) return d(s, !0);
        if (o) return o(s, !0);
        var p = new Error("Cannot find module '" + s + "'");
        throw ((p.code = 'MODULE_NOT_FOUND'), p);
      }
      var u = (n[s] = { exports: {} });
      r[s][0].call(
        u.exports,
        function (e) {
          return a(r[s][1][e] || e);
        },
        u,
        u.exports,
        e,
        r,
        n,
        i
      );
    }
    return n[s].exports;
  }
  for (var o = 'function' == typeof t && t, s = 0; s < i.length; s++) a(i[s]);
  return a;
})(
  {
    1: [
      function (e, t, r) {
        var n = (0, e('./adapter_factory.js').adapterFactory)({
          window: window,
        });
        t.exports = n;
      },
      { './adapter_factory.js': 2 },
    ],
    2: [
      function (e, t, r) {
        (Object.defineProperty(r, '__esModule', { value: !0 }),
          (r.adapterFactory = function () {
            var e = (
                arguments.length > 0 && void 0 !== arguments[0]
                  ? arguments[0]
                  : {}
              ).window,
              t =
                arguments.length > 1 && void 0 !== arguments[1]
                  ? arguments[1]
                  : {
                      shimChrome: !0,
                      shimFirefox: !0,
                      shimEdge: !0,
                      shimSafari: !0,
                    },
              r = n.log,
              d = n.detectBrowser(e),
              p = {
                browserDetails: d,
                commonShim: c,
                extractVersion: n.extractVersion,
                disableLog: n.disableLog,
                disableWarnings: n.disableWarnings,
              };
            switch (d.browser) {
              case 'chrome':
                if (!i || !i.shimPeerConnection || !t.shimChrome)
                  return (
                    r('Chrome shim is not included in this adapter release.'),
                    p
                  );
                (r('adapter.js shimming chrome.'),
                  (p.browserShim = i),
                  i.shimGetUserMedia(e),
                  i.shimMediaStream(e),
                  i.shimPeerConnection(e),
                  i.shimOnTrack(e),
                  i.shimAddTrackRemoveTrack(e),
                  i.shimGetSendersWithDtmf(e),
                  i.shimGetStats(e),
                  i.shimSenderReceiverGetStats(e),
                  i.fixNegotiationNeeded(e),
                  c.shimRTCIceCandidate(e),
                  c.shimConnectionState(e),
                  c.shimMaxMessageSize(e),
                  c.shimSendThrowTypeError(e),
                  c.removeAllowExtmapMixed(e));
                break;
              case 'firefox':
                if (!o || !o.shimPeerConnection || !t.shimFirefox)
                  return (
                    r('Firefox shim is not included in this adapter release.'),
                    p
                  );
                (r('adapter.js shimming firefox.'),
                  (p.browserShim = o),
                  o.shimGetUserMedia(e),
                  o.shimPeerConnection(e),
                  o.shimOnTrack(e),
                  o.shimRemoveStream(e),
                  o.shimSenderGetStats(e),
                  o.shimReceiverGetStats(e),
                  o.shimRTCDataChannel(e),
                  o.shimAddTransceiver(e),
                  o.shimCreateOffer(e),
                  o.shimCreateAnswer(e),
                  c.shimRTCIceCandidate(e),
                  c.shimConnectionState(e),
                  c.shimMaxMessageSize(e),
                  c.shimSendThrowTypeError(e));
                break;
              case 'edge':
                if (!a || !a.shimPeerConnection || !t.shimEdge)
                  return (
                    r('MS edge shim is not included in this adapter release.'),
                    p
                  );
                (r('adapter.js shimming edge.'),
                  (p.browserShim = a),
                  a.shimGetUserMedia(e),
                  a.shimGetDisplayMedia(e),
                  a.shimPeerConnection(e),
                  a.shimReplaceTrack(e),
                  c.shimMaxMessageSize(e),
                  c.shimSendThrowTypeError(e));
                break;
              case 'safari':
                if (!s || !t.shimSafari)
                  return (
                    r('Safari shim is not included in this adapter release.'),
                    p
                  );
                (r('adapter.js shimming safari.'),
                  (p.browserShim = s),
                  s.shimRTCIceServerUrls(e),
                  s.shimCreateOfferLegacy(e),
                  s.shimCallbacksAPI(e),
                  s.shimLocalStreamsAPI(e),
                  s.shimRemoteStreamsAPI(e),
                  s.shimTrackEventTransceiver(e),
                  s.shimGetUserMedia(e),
                  c.shimRTCIceCandidate(e),
                  c.shimMaxMessageSize(e),
                  c.shimSendThrowTypeError(e),
                  c.removeAllowExtmapMixed(e));
                break;
              default:
                r('Unsupported browser!');
            }
            return p;
          }));
        var n = d(e('./utils')),
          i = d(e('./chrome/chrome_shim')),
          a = d(e('./edge/edge_shim')),
          o = d(e('./firefox/firefox_shim')),
          s = d(e('./safari/safari_shim')),
          c = d(e('./common_shim'));
        function d(e) {
          if (e && e.__esModule) return e;
          var t = {};
          if (null != e)
            for (var r in e)
              Object.prototype.hasOwnProperty.call(e, r) && (t[r] = e[r]);
          return ((t.default = e), t);
        }
      },
      {
        './chrome/chrome_shim': 3,
        './common_shim': 6,
        './edge/edge_shim': 7,
        './firefox/firefox_shim': 11,
        './safari/safari_shim': 14,
        './utils': 15,
      },
    ],
    3: [
      function (t, r, n) {
        (Object.defineProperty(n, '__esModule', { value: !0 }),
          (n.shimGetDisplayMedia = n.shimGetUserMedia = void 0));
        var i =
            'function' == typeof Symbol && 'symbol' == e(Symbol.iterator)
              ? function (t) {
                  return e(t);
                }
              : function (t) {
                  return t &&
                    'function' == typeof Symbol &&
                    t.constructor === Symbol &&
                    t !== Symbol.prototype
                    ? 'symbol'
                    : e(t);
                },
          a = t('./getusermedia');
        Object.defineProperty(n, 'shimGetUserMedia', {
          enumerable: !0,
          get: function () {
            return a.shimGetUserMedia;
          },
        });
        var o = t('./getdisplaymedia');
        (Object.defineProperty(n, 'shimGetDisplayMedia', {
          enumerable: !0,
          get: function () {
            return o.shimGetDisplayMedia;
          },
        }),
          (n.shimMediaStream = function (e) {
            e.MediaStream = e.MediaStream || e.webkitMediaStream;
          }),
          (n.shimOnTrack = function (e) {
            if (
              'object' !== (void 0 === e ? 'undefined' : i(e)) ||
              !e.RTCPeerConnection ||
              'ontrack' in e.RTCPeerConnection.prototype
            )
              s.wrapPeerConnectionEvent(e, 'track', function (e) {
                return (
                  e.transceiver ||
                    Object.defineProperty(e, 'transceiver', {
                      value: { receiver: e.receiver },
                    }),
                  e
                );
              });
            else {
              Object.defineProperty(e.RTCPeerConnection.prototype, 'ontrack', {
                get: function () {
                  return this._ontrack;
                },
                set: function (e) {
                  (this._ontrack &&
                    this.removeEventListener('track', this._ontrack),
                    this.addEventListener('track', (this._ontrack = e)));
                },
                enumerable: !0,
                configurable: !0,
              });
              var t = e.RTCPeerConnection.prototype.setRemoteDescription;
              e.RTCPeerConnection.prototype.setRemoteDescription = function () {
                var r = this;
                return (
                  this._ontrackpoly ||
                    ((this._ontrackpoly = function (t) {
                      (t.stream.addEventListener('addtrack', function (n) {
                        var i = void 0;
                        i = e.RTCPeerConnection.prototype.getReceivers
                          ? r.getReceivers().find(function (e) {
                              return e.track && e.track.id === n.track.id;
                            })
                          : { track: n.track };
                        var a = new Event('track');
                        ((a.track = n.track),
                          (a.receiver = i),
                          (a.transceiver = { receiver: i }),
                          (a.streams = [t.stream]),
                          r.dispatchEvent(a));
                      }),
                        t.stream.getTracks().forEach(function (n) {
                          var i = void 0;
                          i = e.RTCPeerConnection.prototype.getReceivers
                            ? r.getReceivers().find(function (e) {
                                return e.track && e.track.id === n.id;
                              })
                            : { track: n };
                          var a = new Event('track');
                          ((a.track = n),
                            (a.receiver = i),
                            (a.transceiver = { receiver: i }),
                            (a.streams = [t.stream]),
                            r.dispatchEvent(a));
                        }));
                    }),
                    this.addEventListener('addstream', this._ontrackpoly)),
                  t.apply(this, arguments)
                );
              };
            }
          }),
          (n.shimGetSendersWithDtmf = function (e) {
            if (
              'object' === (void 0 === e ? 'undefined' : i(e)) &&
              e.RTCPeerConnection &&
              !('getSenders' in e.RTCPeerConnection.prototype) &&
              'createDTMFSender' in e.RTCPeerConnection.prototype
            ) {
              var t = function (e, t) {
                return {
                  track: t,
                  get dtmf() {
                    return (
                      void 0 === this._dtmf &&
                        ('audio' === t.kind
                          ? (this._dtmf = e.createDTMFSender(t))
                          : (this._dtmf = null)),
                      this._dtmf
                    );
                  },
                  _pc: e,
                };
              };
              if (!e.RTCPeerConnection.prototype.getSenders) {
                e.RTCPeerConnection.prototype.getSenders = function () {
                  return (
                    (this._senders = this._senders || []),
                    this._senders.slice()
                  );
                };
                var r = e.RTCPeerConnection.prototype.addTrack;
                e.RTCPeerConnection.prototype.addTrack = function (e, n) {
                  var i = r.apply(this, arguments);
                  return (i || ((i = t(this, e)), this._senders.push(i)), i);
                };
                var n = e.RTCPeerConnection.prototype.removeTrack;
                e.RTCPeerConnection.prototype.removeTrack = function (e) {
                  n.apply(this, arguments);
                  var t = this._senders.indexOf(e);
                  -1 !== t && this._senders.splice(t, 1);
                };
              }
              var a = e.RTCPeerConnection.prototype.addStream;
              e.RTCPeerConnection.prototype.addStream = function (e) {
                var r = this;
                ((this._senders = this._senders || []),
                  a.apply(this, [e]),
                  e.getTracks().forEach(function (e) {
                    r._senders.push(t(r, e));
                  }));
              };
              var o = e.RTCPeerConnection.prototype.removeStream;
              e.RTCPeerConnection.prototype.removeStream = function (e) {
                var t = this;
                ((this._senders = this._senders || []),
                  o.apply(this, [e]),
                  e.getTracks().forEach(function (e) {
                    var r = t._senders.find(function (t) {
                      return t.track === e;
                    });
                    r && t._senders.splice(t._senders.indexOf(r), 1);
                  }));
              };
            } else if (
              'object' === (void 0 === e ? 'undefined' : i(e)) &&
              e.RTCPeerConnection &&
              'getSenders' in e.RTCPeerConnection.prototype &&
              'createDTMFSender' in e.RTCPeerConnection.prototype &&
              e.RTCRtpSender &&
              !('dtmf' in e.RTCRtpSender.prototype)
            ) {
              var s = e.RTCPeerConnection.prototype.getSenders;
              ((e.RTCPeerConnection.prototype.getSenders = function () {
                var e = this,
                  t = s.apply(this, []);
                return (
                  t.forEach(function (t) {
                    return (t._pc = e);
                  }),
                  t
                );
              }),
                Object.defineProperty(e.RTCRtpSender.prototype, 'dtmf', {
                  get: function () {
                    return (
                      void 0 === this._dtmf &&
                        ('audio' === this.track.kind
                          ? (this._dtmf = this._pc.createDTMFSender(this.track))
                          : (this._dtmf = null)),
                      this._dtmf
                    );
                  },
                }));
            }
          }),
          (n.shimGetStats = function (e) {
            if (e.RTCPeerConnection) {
              var t = e.RTCPeerConnection.prototype.getStats;
              e.RTCPeerConnection.prototype.getStats = function () {
                var e = this,
                  r = Array.prototype.slice.call(arguments),
                  n = r[0],
                  i = r[1],
                  a = r[2];
                if (arguments.length > 0 && 'function' == typeof n)
                  return t.apply(this, arguments);
                if (
                  0 === t.length &&
                  (0 === arguments.length || 'function' != typeof n)
                )
                  return t.apply(this, []);
                var o = function (e) {
                    var t = {};
                    return (
                      e.result().forEach(function (e) {
                        var r = {
                          id: e.id,
                          timestamp: e.timestamp,
                          type:
                            {
                              localcandidate: 'local-candidate',
                              remotecandidate: 'remote-candidate',
                            }[e.type] || e.type,
                        };
                        (e.names().forEach(function (t) {
                          r[t] = e.stat(t);
                        }),
                          (t[r.id] = r));
                      }),
                      t
                    );
                  },
                  s = function (e) {
                    return new Map(
                      Object.keys(e).map(function (t) {
                        return [t, e[t]];
                      })
                    );
                  };
                if (arguments.length >= 2) {
                  var c = function (e) {
                    i(s(o(e)));
                  };
                  return t.apply(this, [c, n]);
                }
                return new Promise(function (r, n) {
                  t.apply(e, [
                    function (e) {
                      r(s(o(e)));
                    },
                    n,
                  ]);
                }).then(i, a);
              };
            }
          }),
          (n.shimSenderReceiverGetStats = function (e) {
            if (
              'object' === (void 0 === e ? 'undefined' : i(e)) &&
              e.RTCPeerConnection &&
              e.RTCRtpSender &&
              e.RTCRtpReceiver
            ) {
              if (!('getStats' in e.RTCRtpSender.prototype)) {
                var t = e.RTCPeerConnection.prototype.getSenders;
                t &&
                  (e.RTCPeerConnection.prototype.getSenders = function () {
                    var e = this,
                      r = t.apply(this, []);
                    return (
                      r.forEach(function (t) {
                        return (t._pc = e);
                      }),
                      r
                    );
                  });
                var r = e.RTCPeerConnection.prototype.addTrack;
                (r &&
                  (e.RTCPeerConnection.prototype.addTrack = function () {
                    var e = r.apply(this, arguments);
                    return ((e._pc = this), e);
                  }),
                  (e.RTCRtpSender.prototype.getStats = function () {
                    var e = this;
                    return this._pc.getStats().then(function (t) {
                      return s.filterStats(t, e.track, !0);
                    });
                  }));
              }
              if (!('getStats' in e.RTCRtpReceiver.prototype)) {
                var n = e.RTCPeerConnection.prototype.getReceivers;
                (n &&
                  (e.RTCPeerConnection.prototype.getReceivers = function () {
                    var e = this,
                      t = n.apply(this, []);
                    return (
                      t.forEach(function (t) {
                        return (t._pc = e);
                      }),
                      t
                    );
                  }),
                  s.wrapPeerConnectionEvent(e, 'track', function (e) {
                    return ((e.receiver._pc = e.srcElement), e);
                  }),
                  (e.RTCRtpReceiver.prototype.getStats = function () {
                    var e = this;
                    return this._pc.getStats().then(function (t) {
                      return s.filterStats(t, e.track, !1);
                    });
                  }));
              }
              if (
                'getStats' in e.RTCRtpSender.prototype &&
                'getStats' in e.RTCRtpReceiver.prototype
              ) {
                var a = e.RTCPeerConnection.prototype.getStats;
                e.RTCPeerConnection.prototype.getStats = function () {
                  if (
                    arguments.length > 0 &&
                    arguments[0] instanceof e.MediaStreamTrack
                  ) {
                    var t = arguments[0],
                      r = void 0,
                      n = void 0,
                      i = void 0;
                    return (
                      this.getSenders().forEach(function (e) {
                        e.track === t && (r ? (i = !0) : (r = e));
                      }),
                      this.getReceivers().forEach(function (e) {
                        return (
                          e.track === t && (n ? (i = !0) : (n = e)),
                          e.track === t
                        );
                      }),
                      i || (r && n)
                        ? Promise.reject(
                            new DOMException(
                              'There are more than one sender or receiver for the track.',
                              'InvalidAccessError'
                            )
                          )
                        : r
                          ? r.getStats()
                          : n
                            ? n.getStats()
                            : Promise.reject(
                                new DOMException(
                                  'There is no sender or receiver for the track.',
                                  'InvalidAccessError'
                                )
                              )
                    );
                  }
                  return a.apply(this, arguments);
                };
              }
            }
          }),
          (n.shimAddTrackRemoveTrackWithNative = d),
          (n.shimAddTrackRemoveTrack = function (e) {
            if (e.RTCPeerConnection) {
              var t = s.detectBrowser(e);
              if (e.RTCPeerConnection.prototype.addTrack && t.version >= 65)
                return d(e);
              var r = e.RTCPeerConnection.prototype.getLocalStreams;
              e.RTCPeerConnection.prototype.getLocalStreams = function () {
                var e = this,
                  t = r.apply(this);
                return (
                  (this._reverseStreams = this._reverseStreams || {}),
                  t.map(function (t) {
                    return e._reverseStreams[t.id];
                  })
                );
              };
              var n = e.RTCPeerConnection.prototype.addStream;
              e.RTCPeerConnection.prototype.addStream = function (t) {
                var r = this;
                if (
                  ((this._streams = this._streams || {}),
                  (this._reverseStreams = this._reverseStreams || {}),
                  t.getTracks().forEach(function (e) {
                    if (
                      r.getSenders().find(function (t) {
                        return t.track === e;
                      })
                    )
                      throw new DOMException(
                        'Track already exists.',
                        'InvalidAccessError'
                      );
                  }),
                  !this._reverseStreams[t.id])
                ) {
                  var i = new e.MediaStream(t.getTracks());
                  ((this._streams[t.id] = i),
                    (this._reverseStreams[i.id] = t),
                    (t = i));
                }
                n.apply(this, [t]);
              };
              var i = e.RTCPeerConnection.prototype.removeStream;
              ((e.RTCPeerConnection.prototype.removeStream = function (e) {
                ((this._streams = this._streams || {}),
                  (this._reverseStreams = this._reverseStreams || {}),
                  i.apply(this, [this._streams[e.id] || e]),
                  delete this._reverseStreams[
                    this._streams[e.id] ? this._streams[e.id].id : e.id
                  ],
                  delete this._streams[e.id]);
              }),
                (e.RTCPeerConnection.prototype.addTrack = function (t, r) {
                  var n = this;
                  if ('closed' === this.signalingState)
                    throw new DOMException(
                      "The RTCPeerConnection's signalingState is 'closed'.",
                      'InvalidStateError'
                    );
                  var i = [].slice.call(arguments, 1);
                  if (
                    1 !== i.length ||
                    !i[0].getTracks().find(function (e) {
                      return e === t;
                    })
                  )
                    throw new DOMException(
                      'The adapter.js addTrack polyfill only supports a single  stream which is associated with the specified track.',
                      'NotSupportedError'
                    );
                  var a = this.getSenders().find(function (e) {
                    return e.track === t;
                  });
                  if (a)
                    throw new DOMException(
                      'Track already exists.',
                      'InvalidAccessError'
                    );
                  ((this._streams = this._streams || {}),
                    (this._reverseStreams = this._reverseStreams || {}));
                  var o = this._streams[r.id];
                  if (o)
                    (o.addTrack(t),
                      Promise.resolve().then(function () {
                        n.dispatchEvent(new Event('negotiationneeded'));
                      }));
                  else {
                    var s = new e.MediaStream([t]);
                    ((this._streams[r.id] = s),
                      (this._reverseStreams[s.id] = r),
                      this.addStream(s));
                  }
                  return this.getSenders().find(function (e) {
                    return e.track === t;
                  });
                }),
                ['createOffer', 'createAnswer'].forEach(function (t) {
                  var r = e.RTCPeerConnection.prototype[t],
                    n = c({}, t, function () {
                      var e = this,
                        t = arguments;
                      return arguments.length &&
                        'function' == typeof arguments[0]
                        ? r.apply(this, [
                            function (r) {
                              var n = p(e, r);
                              t[0].apply(null, [n]);
                            },
                            function (e) {
                              t[1] && t[1].apply(null, e);
                            },
                            arguments[2],
                          ])
                        : r.apply(this, arguments).then(function (t) {
                            return p(e, t);
                          });
                    });
                  e.RTCPeerConnection.prototype[t] = n[t];
                }));
              var a = e.RTCPeerConnection.prototype.setLocalDescription;
              e.RTCPeerConnection.prototype.setLocalDescription = function () {
                return arguments.length && arguments[0].type
                  ? ((arguments[0] = u(this, arguments[0])),
                    a.apply(this, arguments))
                  : a.apply(this, arguments);
              };
              var o = Object.getOwnPropertyDescriptor(
                e.RTCPeerConnection.prototype,
                'localDescription'
              );
              (Object.defineProperty(
                e.RTCPeerConnection.prototype,
                'localDescription',
                {
                  get: function () {
                    var e = o.get.apply(this);
                    return '' === e.type ? e : p(this, e);
                  },
                }
              ),
                (e.RTCPeerConnection.prototype.removeTrack = function (e) {
                  var t = this;
                  if ('closed' === this.signalingState)
                    throw new DOMException(
                      "The RTCPeerConnection's signalingState is 'closed'.",
                      'InvalidStateError'
                    );
                  if (!e._pc)
                    throw new DOMException(
                      'Argument 1 of RTCPeerConnection.removeTrack does not implement interface RTCRtpSender.',
                      'TypeError'
                    );
                  if (e._pc !== this)
                    throw new DOMException(
                      'Sender was not created by this connection.',
                      'InvalidAccessError'
                    );
                  this._streams = this._streams || {};
                  var r = void 0;
                  (Object.keys(this._streams).forEach(function (n) {
                    t._streams[n].getTracks().find(function (t) {
                      return e.track === t;
                    }) && (r = t._streams[n]);
                  }),
                    r &&
                      (1 === r.getTracks().length
                        ? this.removeStream(this._reverseStreams[r.id])
                        : r.removeTrack(e.track),
                      this.dispatchEvent(new Event('negotiationneeded'))));
                }));
            }
            function p(e, t) {
              var r = t.sdp;
              return (
                Object.keys(e._reverseStreams || []).forEach(function (t) {
                  var n = e._reverseStreams[t],
                    i = e._streams[n.id];
                  r = r.replace(new RegExp(i.id, 'g'), n.id);
                }),
                new RTCSessionDescription({ type: t.type, sdp: r })
              );
            }
            function u(e, t) {
              var r = t.sdp;
              return (
                Object.keys(e._reverseStreams || []).forEach(function (t) {
                  var n = e._reverseStreams[t],
                    i = e._streams[n.id];
                  r = r.replace(new RegExp(n.id, 'g'), i.id);
                }),
                new RTCSessionDescription({ type: t.type, sdp: r })
              );
            }
          }),
          (n.shimPeerConnection = function (e) {
            var t = s.detectBrowser(e);
            if (
              (!e.RTCPeerConnection &&
                e.webkitRTCPeerConnection &&
                (e.RTCPeerConnection = e.webkitRTCPeerConnection),
              e.RTCPeerConnection)
            ) {
              t.version < 53 &&
                [
                  'setLocalDescription',
                  'setRemoteDescription',
                  'addIceCandidate',
                ].forEach(function (t) {
                  var r = e.RTCPeerConnection.prototype[t],
                    n = c({}, t, function () {
                      return (
                        (arguments[0] = new (
                          'addIceCandidate' === t
                            ? e.RTCIceCandidate
                            : e.RTCSessionDescription
                        )(arguments[0])),
                        r.apply(this, arguments)
                      );
                    });
                  e.RTCPeerConnection.prototype[t] = n[t];
                });
              var r = e.RTCPeerConnection.prototype.addIceCandidate;
              e.RTCPeerConnection.prototype.addIceCandidate = function () {
                return arguments[0]
                  ? t.version < 78 &&
                    arguments[0] &&
                    '' === arguments[0].candidate
                    ? Promise.resolve()
                    : r.apply(this, arguments)
                  : (arguments[1] && arguments[1].apply(null),
                    Promise.resolve());
              };
            }
          }),
          (n.fixNegotiationNeeded = function (e) {
            s.wrapPeerConnectionEvent(e, 'negotiationneeded', function (e) {
              if ('stable' === e.target.signalingState) return e;
            });
          }));
        var s = (function (e) {
          if (e && e.__esModule) return e;
          var t = {};
          if (null != e)
            for (var r in e)
              Object.prototype.hasOwnProperty.call(e, r) && (t[r] = e[r]);
          return ((t.default = e), t);
        })(t('../utils.js'));
        function c(e, t, r) {
          return (
            t in e
              ? Object.defineProperty(e, t, {
                  value: r,
                  enumerable: !0,
                  configurable: !0,
                  writable: !0,
                })
              : (e[t] = r),
            e
          );
        }
        function d(e) {
          e.RTCPeerConnection.prototype.getLocalStreams = function () {
            var e = this;
            return (
              (this._shimmedLocalStreams = this._shimmedLocalStreams || {}),
              Object.keys(this._shimmedLocalStreams).map(function (t) {
                return e._shimmedLocalStreams[t][0];
              })
            );
          };
          var t = e.RTCPeerConnection.prototype.addTrack;
          e.RTCPeerConnection.prototype.addTrack = function (e, r) {
            if (!r) return t.apply(this, arguments);
            this._shimmedLocalStreams = this._shimmedLocalStreams || {};
            var n = t.apply(this, arguments);
            return (
              this._shimmedLocalStreams[r.id]
                ? -1 === this._shimmedLocalStreams[r.id].indexOf(n) &&
                  this._shimmedLocalStreams[r.id].push(n)
                : (this._shimmedLocalStreams[r.id] = [r, n]),
              n
            );
          };
          var r = e.RTCPeerConnection.prototype.addStream;
          e.RTCPeerConnection.prototype.addStream = function (e) {
            var t = this;
            ((this._shimmedLocalStreams = this._shimmedLocalStreams || {}),
              e.getTracks().forEach(function (e) {
                if (
                  t.getSenders().find(function (t) {
                    return t.track === e;
                  })
                )
                  throw new DOMException(
                    'Track already exists.',
                    'InvalidAccessError'
                  );
              }));
            var n = this.getSenders();
            r.apply(this, arguments);
            var i = this.getSenders().filter(function (e) {
              return -1 === n.indexOf(e);
            });
            this._shimmedLocalStreams[e.id] = [e].concat(i);
          };
          var n = e.RTCPeerConnection.prototype.removeStream;
          e.RTCPeerConnection.prototype.removeStream = function (e) {
            return (
              (this._shimmedLocalStreams = this._shimmedLocalStreams || {}),
              delete this._shimmedLocalStreams[e.id],
              n.apply(this, arguments)
            );
          };
          var i = e.RTCPeerConnection.prototype.removeTrack;
          e.RTCPeerConnection.prototype.removeTrack = function (e) {
            var t = this;
            return (
              (this._shimmedLocalStreams = this._shimmedLocalStreams || {}),
              e &&
                Object.keys(this._shimmedLocalStreams).forEach(function (r) {
                  var n = t._shimmedLocalStreams[r].indexOf(e);
                  (-1 !== n && t._shimmedLocalStreams[r].splice(n, 1),
                    1 === t._shimmedLocalStreams[r].length &&
                      delete t._shimmedLocalStreams[r]);
                }),
              i.apply(this, arguments)
            );
          };
        }
      },
      { '../utils.js': 15, './getdisplaymedia': 4, './getusermedia': 5 },
    ],
    4: [
      function (e, t, r) {
        (Object.defineProperty(r, '__esModule', { value: !0 }),
          (r.shimGetDisplayMedia = function (e, t) {
            (e.navigator.mediaDevices &&
              'getDisplayMedia' in e.navigator.mediaDevices) ||
              (e.navigator.mediaDevices &&
                'function' == typeof t &&
                (e.navigator.mediaDevices.getDisplayMedia = function (r) {
                  return t(r).then(function (t) {
                    var n = r.video && r.video.width,
                      i = r.video && r.video.height,
                      a = r.video && r.video.frameRate;
                    return (
                      (r.video = {
                        mandatory: {
                          chromeMediaSource: 'desktop',
                          chromeMediaSourceId: t,
                          maxFrameRate: a || 3,
                        },
                      }),
                      n && (r.video.mandatory.maxWidth = n),
                      i && (r.video.mandatory.maxHeight = i),
                      e.navigator.mediaDevices.getUserMedia(r)
                    );
                  });
                }));
          }));
      },
      {},
    ],
    5: [
      function (t, r, n) {
        Object.defineProperty(n, '__esModule', { value: !0 });
        var i =
          'function' == typeof Symbol && 'symbol' == e(Symbol.iterator)
            ? function (t) {
                return e(t);
              }
            : function (t) {
                return t &&
                  'function' == typeof Symbol &&
                  t.constructor === Symbol &&
                  t !== Symbol.prototype
                  ? 'symbol'
                  : e(t);
              };
        n.shimGetUserMedia = function (e) {
          var t = e && e.navigator;
          if (t.mediaDevices) {
            var r = a.detectBrowser(e),
              n = function (e) {
                if (
                  'object' !== (void 0 === e ? 'undefined' : i(e)) ||
                  e.mandatory ||
                  e.optional
                )
                  return e;
                var t = {};
                return (
                  Object.keys(e).forEach(function (r) {
                    if (
                      'require' !== r &&
                      'advanced' !== r &&
                      'mediaSource' !== r
                    ) {
                      var n = 'object' === i(e[r]) ? e[r] : { ideal: e[r] };
                      void 0 !== n.exact &&
                        'number' == typeof n.exact &&
                        (n.min = n.max = n.exact);
                      var a = function (e, t) {
                        return e
                          ? e + t.charAt(0).toUpperCase() + t.slice(1)
                          : 'deviceId' === t
                            ? 'sourceId'
                            : t;
                      };
                      if (void 0 !== n.ideal) {
                        t.optional = t.optional || [];
                        var o = {};
                        'number' == typeof n.ideal
                          ? ((o[a('min', r)] = n.ideal),
                            t.optional.push(o),
                            ((o = {})[a('max', r)] = n.ideal),
                            t.optional.push(o))
                          : ((o[a('', r)] = n.ideal), t.optional.push(o));
                      }
                      void 0 !== n.exact && 'number' != typeof n.exact
                        ? ((t.mandatory = t.mandatory || {}),
                          (t.mandatory[a('', r)] = n.exact))
                        : ['min', 'max'].forEach(function (e) {
                            void 0 !== n[e] &&
                              ((t.mandatory = t.mandatory || {}),
                              (t.mandatory[a(e, r)] = n[e]));
                          });
                    }
                  }),
                  e.advanced &&
                    (t.optional = (t.optional || []).concat(e.advanced)),
                  t
                );
              },
              s = function (e, a) {
                if (r.version >= 61) return a(e);
                if (
                  (e = JSON.parse(JSON.stringify(e))) &&
                  'object' === i(e.audio)
                ) {
                  var s = function (e, t, r) {
                    t in e && !(r in e) && ((e[r] = e[t]), delete e[t]);
                  };
                  (s(
                    (e = JSON.parse(JSON.stringify(e))).audio,
                    'autoGainControl',
                    'googAutoGainControl'
                  ),
                    s(e.audio, 'noiseSuppression', 'googNoiseSuppression'),
                    (e.audio = n(e.audio)));
                }
                if (e && 'object' === i(e.video)) {
                  var c = e.video.facingMode;
                  c =
                    c &&
                    ('object' === (void 0 === c ? 'undefined' : i(c))
                      ? c
                      : { ideal: c });
                  var d = r.version < 66;
                  if (
                    c &&
                    ('user' === c.exact ||
                      'environment' === c.exact ||
                      'user' === c.ideal ||
                      'environment' === c.ideal) &&
                    (!t.mediaDevices.getSupportedConstraints ||
                      !t.mediaDevices.getSupportedConstraints().facingMode ||
                      d)
                  ) {
                    delete e.video.facingMode;
                    var p = void 0;
                    if (
                      ('environment' === c.exact || 'environment' === c.ideal
                        ? (p = ['back', 'rear'])
                        : ('user' !== c.exact && 'user' !== c.ideal) ||
                          (p = ['front']),
                      p)
                    )
                      return t.mediaDevices
                        .enumerateDevices()
                        .then(function (t) {
                          var r = (t = t.filter(function (e) {
                            return 'videoinput' === e.kind;
                          })).find(function (e) {
                            return p.some(function (t) {
                              return e.label.toLowerCase().includes(t);
                            });
                          });
                          return (
                            !r &&
                              t.length &&
                              p.includes('back') &&
                              (r = t[t.length - 1]),
                            r &&
                              (e.video.deviceId = c.exact
                                ? { exact: r.deviceId }
                                : { ideal: r.deviceId }),
                            (e.video = n(e.video)),
                            o('chrome: ' + JSON.stringify(e)),
                            a(e)
                          );
                        });
                  }
                  e.video = n(e.video);
                }
                return (o('chrome: ' + JSON.stringify(e)), a(e));
              },
              c = function (e) {
                return r.version >= 64
                  ? e
                  : {
                      name:
                        {
                          PermissionDeniedError: 'NotAllowedError',
                          PermissionDismissedError: 'NotAllowedError',
                          InvalidStateError: 'NotAllowedError',
                          DevicesNotFoundError: 'NotFoundError',
                          ConstraintNotSatisfiedError: 'OverconstrainedError',
                          TrackStartError: 'NotReadableError',
                          MediaDeviceFailedDueToShutdown: 'NotAllowedError',
                          MediaDeviceKillSwitchOn: 'NotAllowedError',
                          TabCaptureError: 'AbortError',
                          ScreenCaptureError: 'AbortError',
                          DeviceCaptureError: 'AbortError',
                        }[e.name] || e.name,
                      message: e.message,
                      constraint: e.constraint || e.constraintName,
                      toString: function () {
                        return (
                          this.name + (this.message && ': ') + this.message
                        );
                      },
                    };
              };
            if (
              ((t.getUserMedia = function (e, r, n) {
                s(e, function (e) {
                  t.webkitGetUserMedia(e, r, function (e) {
                    n && n(c(e));
                  });
                });
              }.bind(t)),
              t.mediaDevices.getUserMedia)
            ) {
              var d = t.mediaDevices.getUserMedia.bind(t.mediaDevices);
              t.mediaDevices.getUserMedia = function (e) {
                return s(e, function (e) {
                  return d(e).then(
                    function (t) {
                      if (
                        (e.audio && !t.getAudioTracks().length) ||
                        (e.video && !t.getVideoTracks().length)
                      )
                        throw (
                          t.getTracks().forEach(function (e) {
                            e.stop();
                          }),
                          new DOMException('', 'NotFoundError')
                        );
                      return t;
                    },
                    function (e) {
                      return Promise.reject(c(e));
                    }
                  );
                });
              };
            }
          }
        };
        var a = (function (e) {
            if (e && e.__esModule) return e;
            var t = {};
            if (null != e)
              for (var r in e)
                Object.prototype.hasOwnProperty.call(e, r) && (t[r] = e[r]);
            return ((t.default = e), t);
          })(t('../utils.js')),
          o = a.log;
      },
      { '../utils.js': 15 },
    ],
    6: [
      function (t, r, n) {
        Object.defineProperty(n, '__esModule', { value: !0 });
        var i =
          'function' == typeof Symbol && 'symbol' == e(Symbol.iterator)
            ? function (t) {
                return e(t);
              }
            : function (t) {
                return t &&
                  'function' == typeof Symbol &&
                  t.constructor === Symbol &&
                  t !== Symbol.prototype
                  ? 'symbol'
                  : e(t);
              };
        ((n.shimRTCIceCandidate = function (e) {
          if (
            !(
              !e.RTCIceCandidate ||
              (e.RTCIceCandidate && 'foundation' in e.RTCIceCandidate.prototype)
            )
          ) {
            var t = e.RTCIceCandidate;
            ((e.RTCIceCandidate = function (e) {
              if (
                ('object' === (void 0 === e ? 'undefined' : i(e)) &&
                  e.candidate &&
                  0 === e.candidate.indexOf('a=') &&
                  ((e = JSON.parse(JSON.stringify(e))).candidate =
                    e.candidate.substr(2)),
                e.candidate && e.candidate.length)
              ) {
                var r = new t(e),
                  n = o.default.parseCandidate(e.candidate),
                  a = Object.assign(r, n);
                return (
                  (a.toJSON = function () {
                    return {
                      candidate: a.candidate,
                      sdpMid: a.sdpMid,
                      sdpMLineIndex: a.sdpMLineIndex,
                      usernameFragment: a.usernameFragment,
                    };
                  }),
                  a
                );
              }
              return new t(e);
            }),
              (e.RTCIceCandidate.prototype = t.prototype),
              s.wrapPeerConnectionEvent(e, 'icecandidate', function (t) {
                return (
                  t.candidate &&
                    Object.defineProperty(t, 'candidate', {
                      value: new e.RTCIceCandidate(t.candidate),
                      writable: 'false',
                    }),
                  t
                );
              }));
          }
        }),
          (n.shimMaxMessageSize = function (e) {
            if (e.RTCPeerConnection) {
              var t = s.detectBrowser(e);
              'sctp' in e.RTCPeerConnection.prototype ||
                Object.defineProperty(e.RTCPeerConnection.prototype, 'sctp', {
                  get: function () {
                    return void 0 === this._sctp ? null : this._sctp;
                  },
                });
              var r = function (e) {
                  if (!e || !e.sdp) return !1;
                  var t = o.default.splitSections(e.sdp);
                  return (
                    t.shift(),
                    t.some(function (e) {
                      var t = o.default.parseMLine(e);
                      return (
                        t &&
                        'application' === t.kind &&
                        -1 !== t.protocol.indexOf('SCTP')
                      );
                    })
                  );
                },
                n = function (e) {
                  var t = e.sdp.match(/mozilla...THIS_IS_SDPARTA-(\d+)/);
                  if (null === t || t.length < 2) return -1;
                  var r = parseInt(t[1], 10);
                  return r != r ? -1 : r;
                },
                i = function (e) {
                  var r = 65536;
                  return (
                    'firefox' === t.browser &&
                      (r =
                        t.version < 57
                          ? -1 === e
                            ? 16384
                            : 2147483637
                          : t.version < 60
                            ? 57 === t.version
                              ? 65535
                              : 65536
                            : 2147483637),
                    r
                  );
                },
                a = function (e, r) {
                  var n = 65536;
                  'firefox' === t.browser && 57 === t.version && (n = 65535);
                  var i = o.default.matchPrefix(e.sdp, 'a=max-message-size:');
                  return (
                    i.length > 0
                      ? (n = parseInt(i[0].substr(19), 10))
                      : 'firefox' === t.browser && -1 !== r && (n = 2147483637),
                    n
                  );
                },
                c = e.RTCPeerConnection.prototype.setRemoteDescription;
              e.RTCPeerConnection.prototype.setRemoteDescription = function () {
                if (
                  ((this._sctp = null),
                  'chrome' === t.browser &&
                    t.version >= 76 &&
                    'plan-b' === this.getConfiguration().sdpSemantics &&
                    Object.defineProperty(this, 'sctp', {
                      get: function () {
                        return void 0 === this._sctp ? null : this._sctp;
                      },
                      enumerable: !0,
                      configurable: !0,
                    }),
                  r(arguments[0]))
                ) {
                  var e = n(arguments[0]),
                    o = i(e),
                    s = a(arguments[0], e),
                    d = void 0;
                  d =
                    0 === o && 0 === s
                      ? Number.POSITIVE_INFINITY
                      : 0 === o || 0 === s
                        ? Math.max(o, s)
                        : Math.min(o, s);
                  var p = {};
                  (Object.defineProperty(p, 'maxMessageSize', {
                    get: function () {
                      return d;
                    },
                  }),
                    (this._sctp = p));
                }
                return c.apply(this, arguments);
              };
            }
          }),
          (n.shimSendThrowTypeError = function (e) {
            if (
              e.RTCPeerConnection &&
              'createDataChannel' in e.RTCPeerConnection.prototype
            ) {
              var t = e.RTCPeerConnection.prototype.createDataChannel;
              ((e.RTCPeerConnection.prototype.createDataChannel = function () {
                var e = t.apply(this, arguments);
                return (r(e, this), e);
              }),
                s.wrapPeerConnectionEvent(e, 'datachannel', function (e) {
                  return (r(e.channel, e.target), e);
                }));
            }
            function r(e, t) {
              var r = e.send;
              e.send = function () {
                var n = arguments[0],
                  i = n.length || n.size || n.byteLength;
                if (
                  'open' === e.readyState &&
                  t.sctp &&
                  i > t.sctp.maxMessageSize
                )
                  throw new TypeError(
                    'Message too large (can send a maximum of ' +
                      t.sctp.maxMessageSize +
                      ' bytes)'
                  );
                return r.apply(e, arguments);
              };
            }
          }),
          (n.shimConnectionState = function (e) {
            if (
              e.RTCPeerConnection &&
              !('connectionState' in e.RTCPeerConnection.prototype)
            ) {
              var t = e.RTCPeerConnection.prototype;
              (Object.defineProperty(t, 'connectionState', {
                get: function () {
                  return (
                    { completed: 'connected', checking: 'connecting' }[
                      this.iceConnectionState
                    ] || this.iceConnectionState
                  );
                },
                enumerable: !0,
                configurable: !0,
              }),
                Object.defineProperty(t, 'onconnectionstatechange', {
                  get: function () {
                    return this._onconnectionstatechange || null;
                  },
                  set: function (e) {
                    (this._onconnectionstatechange &&
                      (this.removeEventListener(
                        'connectionstatechange',
                        this._onconnectionstatechange
                      ),
                      delete this._onconnectionstatechange),
                      e &&
                        this.addEventListener(
                          'connectionstatechange',
                          (this._onconnectionstatechange = e)
                        ));
                  },
                  enumerable: !0,
                  configurable: !0,
                }),
                ['setLocalDescription', 'setRemoteDescription'].forEach(
                  function (e) {
                    var r = t[e];
                    t[e] = function () {
                      return (
                        this._connectionstatechangepoly ||
                          ((this._connectionstatechangepoly = function (e) {
                            var t = e.target;
                            if (t._lastConnectionState !== t.connectionState) {
                              t._lastConnectionState = t.connectionState;
                              var r = new Event('connectionstatechange', e);
                              t.dispatchEvent(r);
                            }
                            return e;
                          }),
                          this.addEventListener(
                            'iceconnectionstatechange',
                            this._connectionstatechangepoly
                          )),
                        r.apply(this, arguments)
                      );
                    };
                  }
                ));
            }
          }),
          (n.removeAllowExtmapMixed = function (e) {
            if (e.RTCPeerConnection) {
              var t = s.detectBrowser(e);
              if (!('chrome' === t.browser && t.version >= 71)) {
                var r = e.RTCPeerConnection.prototype.setRemoteDescription;
                e.RTCPeerConnection.prototype.setRemoteDescription = function (
                  e
                ) {
                  return (
                    e &&
                      e.sdp &&
                      -1 !== e.sdp.indexOf('\na=extmap-allow-mixed') &&
                      (e.sdp = e.sdp
                        .split('\n')
                        .filter(function (e) {
                          return 'a=extmap-allow-mixed' !== e.trim();
                        })
                        .join('\n')),
                    r.apply(this, arguments)
                  );
                };
              }
            }
          }));
        var a,
          o = (a = t('sdp')) && a.__esModule ? a : { default: a },
          s = (function (e) {
            if (e && e.__esModule) return e;
            var t = {};
            if (null != e)
              for (var r in e)
                Object.prototype.hasOwnProperty.call(e, r) && (t[r] = e[r]);
            return ((t.default = e), t);
          })(t('./utils'));
      },
      { './utils': 15, sdp: 17 },
    ],
    7: [
      function (e, t, r) {
        (Object.defineProperty(r, '__esModule', { value: !0 }),
          (r.shimGetDisplayMedia = r.shimGetUserMedia = void 0));
        var n = e('./getusermedia');
        Object.defineProperty(r, 'shimGetUserMedia', {
          enumerable: !0,
          get: function () {
            return n.shimGetUserMedia;
          },
        });
        var i = e('./getdisplaymedia');
        (Object.defineProperty(r, 'shimGetDisplayMedia', {
          enumerable: !0,
          get: function () {
            return i.shimGetDisplayMedia;
          },
        }),
          (r.shimPeerConnection = function (e) {
            var t = o.detectBrowser(e);
            if (
              e.RTCIceGatherer &&
              (e.RTCIceCandidate ||
                (e.RTCIceCandidate = function (e) {
                  return e;
                }),
              e.RTCSessionDescription ||
                (e.RTCSessionDescription = function (e) {
                  return e;
                }),
              t.version < 15025)
            ) {
              var r = Object.getOwnPropertyDescriptor(
                e.MediaStreamTrack.prototype,
                'enabled'
              );
              Object.defineProperty(e.MediaStreamTrack.prototype, 'enabled', {
                set: function (e) {
                  r.set.call(this, e);
                  var t = new Event('enabled');
                  ((t.enabled = e), this.dispatchEvent(t));
                },
              });
            }
            (!e.RTCRtpSender ||
              'dtmf' in e.RTCRtpSender.prototype ||
              Object.defineProperty(e.RTCRtpSender.prototype, 'dtmf', {
                get: function () {
                  return (
                    void 0 === this._dtmf &&
                      ('audio' === this.track.kind
                        ? (this._dtmf = new e.RTCDtmfSender(this))
                        : 'video' === this.track.kind && (this._dtmf = null)),
                    this._dtmf
                  );
                },
              }),
              e.RTCDtmfSender &&
                !e.RTCDTMFSender &&
                (e.RTCDTMFSender = e.RTCDtmfSender));
            var n = (0, c.default)(e, t.version);
            ((e.RTCPeerConnection = function (e) {
              return (
                e &&
                  e.iceServers &&
                  ((e.iceServers = (0, s.filterIceServers)(
                    e.iceServers,
                    t.version
                  )),
                  o.log('ICE servers after filtering:', e.iceServers)),
                new n(e)
              );
            }),
              (e.RTCPeerConnection.prototype = n.prototype));
          }),
          (r.shimReplaceTrack = function (e) {
            !e.RTCRtpSender ||
              'replaceTrack' in e.RTCRtpSender.prototype ||
              (e.RTCRtpSender.prototype.replaceTrack =
                e.RTCRtpSender.prototype.setTrack);
          }));
        var a,
          o = (function (e) {
            if (e && e.__esModule) return e;
            var t = {};
            if (null != e)
              for (var r in e)
                Object.prototype.hasOwnProperty.call(e, r) && (t[r] = e[r]);
            return ((t.default = e), t);
          })(e('../utils')),
          s = e('./filtericeservers'),
          c =
            (a = e('rtcpeerconnection-shim')) && a.__esModule
              ? a
              : { default: a };
      },
      {
        '../utils': 15,
        './filtericeservers': 8,
        './getdisplaymedia': 9,
        './getusermedia': 10,
        'rtcpeerconnection-shim': 16,
      },
    ],
    8: [
      function (e, t, r) {
        (Object.defineProperty(r, '__esModule', { value: !0 }),
          (r.filterIceServers = function (e, t) {
            var r = !1;
            return (e = JSON.parse(JSON.stringify(e))).filter(function (e) {
              if (e && (e.urls || e.url)) {
                var t = e.urls || e.url;
                e.url &&
                  !e.urls &&
                  n.deprecated('RTCIceServer.url', 'RTCIceServer.urls');
                var i = 'string' == typeof t;
                return (
                  i && (t = [t]),
                  (t = t.filter(function (e) {
                    if (0 === e.indexOf('stun:')) return !1;
                    var t =
                      e.startsWith('turn') &&
                      !e.startsWith('turn:[') &&
                      e.includes('transport=udp');
                    return t && !r ? ((r = !0), !0) : t && !r;
                  })),
                  delete e.url,
                  (e.urls = i ? t[0] : t),
                  !!t.length
                );
              }
            });
          }));
        var n = (function (e) {
          if (e && e.__esModule) return e;
          var t = {};
          if (null != e)
            for (var r in e)
              Object.prototype.hasOwnProperty.call(e, r) && (t[r] = e[r]);
          return ((t.default = e), t);
        })(e('../utils'));
      },
      { '../utils': 15 },
    ],
    9: [
      function (e, t, r) {
        (Object.defineProperty(r, '__esModule', { value: !0 }),
          (r.shimGetDisplayMedia = function (e) {
            'getDisplayMedia' in e.navigator &&
              e.navigator.mediaDevices &&
              ((e.navigator.mediaDevices &&
                'getDisplayMedia' in e.navigator.mediaDevices) ||
                (e.navigator.mediaDevices.getDisplayMedia =
                  e.navigator.getDisplayMedia.bind(e.navigator)));
          }));
      },
      {},
    ],
    10: [
      function (e, t, r) {
        (Object.defineProperty(r, '__esModule', { value: !0 }),
          (r.shimGetUserMedia = function (e) {
            var t = e && e.navigator,
              r = t.mediaDevices.getUserMedia.bind(t.mediaDevices);
            t.mediaDevices.getUserMedia = function (e) {
              return r(e).catch(function (e) {
                return Promise.reject(
                  (function (e) {
                    return {
                      name:
                        { PermissionDeniedError: 'NotAllowedError' }[e.name] ||
                        e.name,
                      message: e.message,
                      constraint: e.constraint,
                      toString: function () {
                        return this.name;
                      },
                    };
                  })(e)
                );
              });
            };
          }));
      },
      {},
    ],
    11: [
      function (t, r, n) {
        (Object.defineProperty(n, '__esModule', { value: !0 }),
          (n.shimGetDisplayMedia = n.shimGetUserMedia = void 0));
        var i =
            'function' == typeof Symbol && 'symbol' == e(Symbol.iterator)
              ? function (t) {
                  return e(t);
                }
              : function (t) {
                  return t &&
                    'function' == typeof Symbol &&
                    t.constructor === Symbol &&
                    t !== Symbol.prototype
                    ? 'symbol'
                    : e(t);
                },
          a = t('./getusermedia');
        Object.defineProperty(n, 'shimGetUserMedia', {
          enumerable: !0,
          get: function () {
            return a.shimGetUserMedia;
          },
        });
        var o = t('./getdisplaymedia');
        (Object.defineProperty(n, 'shimGetDisplayMedia', {
          enumerable: !0,
          get: function () {
            return o.shimGetDisplayMedia;
          },
        }),
          (n.shimOnTrack = function (e) {
            'object' === (void 0 === e ? 'undefined' : i(e)) &&
              e.RTCTrackEvent &&
              'receiver' in e.RTCTrackEvent.prototype &&
              !('transceiver' in e.RTCTrackEvent.prototype) &&
              Object.defineProperty(e.RTCTrackEvent.prototype, 'transceiver', {
                get: function () {
                  return { receiver: this.receiver };
                },
              });
          }),
          (n.shimPeerConnection = function (e) {
            var t = s.detectBrowser(e);
            if (
              'object' === (void 0 === e ? 'undefined' : i(e)) &&
              (e.RTCPeerConnection || e.mozRTCPeerConnection)
            ) {
              if (
                (!e.RTCPeerConnection &&
                  e.mozRTCPeerConnection &&
                  (e.RTCPeerConnection = e.mozRTCPeerConnection),
                t.version < 53 &&
                  [
                    'setLocalDescription',
                    'setRemoteDescription',
                    'addIceCandidate',
                  ].forEach(function (t) {
                    var r = e.RTCPeerConnection.prototype[t],
                      n = (function (e, t, r) {
                        return (
                          t in e
                            ? Object.defineProperty(e, t, {
                                value: r,
                                enumerable: !0,
                                configurable: !0,
                                writable: !0,
                              })
                            : (e[t] = r),
                          e
                        );
                      })({}, t, function () {
                        return (
                          (arguments[0] = new (
                            'addIceCandidate' === t
                              ? e.RTCIceCandidate
                              : e.RTCSessionDescription
                          )(arguments[0])),
                          r.apply(this, arguments)
                        );
                      });
                    e.RTCPeerConnection.prototype[t] = n[t];
                  }),
                t.version < 68)
              ) {
                var r = e.RTCPeerConnection.prototype.addIceCandidate;
                e.RTCPeerConnection.prototype.addIceCandidate = function () {
                  return arguments[0]
                    ? arguments[0] && '' === arguments[0].candidate
                      ? Promise.resolve()
                      : r.apply(this, arguments)
                    : (arguments[1] && arguments[1].apply(null),
                      Promise.resolve());
                };
              }
              var n = {
                  inboundrtp: 'inbound-rtp',
                  outboundrtp: 'outbound-rtp',
                  candidatepair: 'candidate-pair',
                  localcandidate: 'local-candidate',
                  remotecandidate: 'remote-candidate',
                },
                a = e.RTCPeerConnection.prototype.getStats;
              e.RTCPeerConnection.prototype.getStats = function () {
                var e = Array.prototype.slice.call(arguments),
                  r = e[0],
                  i = e[1],
                  o = e[2];
                return a
                  .apply(this, [r || null])
                  .then(function (e) {
                    if (t.version < 53 && !i)
                      try {
                        e.forEach(function (e) {
                          e.type = n[e.type] || e.type;
                        });
                      } catch (t) {
                        if ('TypeError' !== t.name) throw t;
                        e.forEach(function (t, r) {
                          e.set(
                            r,
                            Object.assign({}, t, { type: n[t.type] || t.type })
                          );
                        });
                      }
                    return e;
                  })
                  .then(i, o);
              };
            }
          }),
          (n.shimSenderGetStats = function (e) {
            if (
              'object' === (void 0 === e ? 'undefined' : i(e)) &&
              e.RTCPeerConnection &&
              e.RTCRtpSender &&
              (!e.RTCRtpSender || !('getStats' in e.RTCRtpSender.prototype))
            ) {
              var t = e.RTCPeerConnection.prototype.getSenders;
              t &&
                (e.RTCPeerConnection.prototype.getSenders = function () {
                  var e = this,
                    r = t.apply(this, []);
                  return (
                    r.forEach(function (t) {
                      return (t._pc = e);
                    }),
                    r
                  );
                });
              var r = e.RTCPeerConnection.prototype.addTrack;
              (r &&
                (e.RTCPeerConnection.prototype.addTrack = function () {
                  var e = r.apply(this, arguments);
                  return ((e._pc = this), e);
                }),
                (e.RTCRtpSender.prototype.getStats = function () {
                  return this.track
                    ? this._pc.getStats(this.track)
                    : Promise.resolve(new Map());
                }));
            }
          }),
          (n.shimReceiverGetStats = function (e) {
            if (
              'object' === (void 0 === e ? 'undefined' : i(e)) &&
              e.RTCPeerConnection &&
              e.RTCRtpSender &&
              (!e.RTCRtpSender || !('getStats' in e.RTCRtpReceiver.prototype))
            ) {
              var t = e.RTCPeerConnection.prototype.getReceivers;
              (t &&
                (e.RTCPeerConnection.prototype.getReceivers = function () {
                  var e = this,
                    r = t.apply(this, []);
                  return (
                    r.forEach(function (t) {
                      return (t._pc = e);
                    }),
                    r
                  );
                }),
                s.wrapPeerConnectionEvent(e, 'track', function (e) {
                  return ((e.receiver._pc = e.srcElement), e);
                }),
                (e.RTCRtpReceiver.prototype.getStats = function () {
                  return this._pc.getStats(this.track);
                }));
            }
          }),
          (n.shimRemoveStream = function (e) {
            e.RTCPeerConnection &&
              !('removeStream' in e.RTCPeerConnection.prototype) &&
              (e.RTCPeerConnection.prototype.removeStream = function (e) {
                var t = this;
                (s.deprecated('removeStream', 'removeTrack'),
                  this.getSenders().forEach(function (r) {
                    r.track &&
                      e.getTracks().includes(r.track) &&
                      t.removeTrack(r);
                  }));
              });
          }),
          (n.shimRTCDataChannel = function (e) {
            e.DataChannel &&
              !e.RTCDataChannel &&
              (e.RTCDataChannel = e.DataChannel);
          }),
          (n.shimAddTransceiver = function (e) {
            if (
              'object' === (void 0 === e ? 'undefined' : i(e)) &&
              e.RTCPeerConnection
            ) {
              var t = e.RTCPeerConnection.prototype.addTransceiver;
              t &&
                (e.RTCPeerConnection.prototype.addTransceiver = function () {
                  this.setParametersPromises = [];
                  var e = arguments[1],
                    r = e && 'sendEncodings' in e;
                  r &&
                    e.sendEncodings.forEach(function (e) {
                      if ('rid' in e && !/^[a-z0-9]{0,16}$/i.test(e.rid))
                        throw new TypeError('Invalid RID value provided.');
                      if (
                        'scaleResolutionDownBy' in e &&
                        !(parseFloat(e.scaleResolutionDownBy) >= 1)
                      )
                        throw new RangeError(
                          'scale_resolution_down_by must be >= 1.0'
                        );
                      if (
                        'maxFramerate' in e &&
                        !(parseFloat(e.maxFramerate) >= 0)
                      )
                        throw new RangeError('max_framerate must be >= 0.0');
                    });
                  var n = t.apply(this, arguments);
                  if (r) {
                    var i = n.sender,
                      a = i.getParameters();
                    'encodings' in a ||
                      ((a.encodings = e.sendEncodings),
                      this.setParametersPromises.push(
                        i.setParameters(a).catch(function () {})
                      ));
                  }
                  return n;
                });
            }
          }),
          (n.shimCreateOffer = function (e) {
            if (
              'object' === (void 0 === e ? 'undefined' : i(e)) &&
              e.RTCPeerConnection
            ) {
              var t = e.RTCPeerConnection.prototype.createOffer;
              e.RTCPeerConnection.prototype.createOffer = function () {
                var e = this,
                  r = arguments;
                return this.setParametersPromises &&
                  this.setParametersPromises.length
                  ? Promise.all(this.setParametersPromises)
                      .then(function () {
                        return t.apply(e, r);
                      })
                      .finally(function () {
                        e.setParametersPromises = [];
                      })
                  : t.apply(this, arguments);
              };
            }
          }),
          (n.shimCreateAnswer = function (e) {
            if (
              'object' === (void 0 === e ? 'undefined' : i(e)) &&
              e.RTCPeerConnection
            ) {
              var t = e.RTCPeerConnection.prototype.createAnswer;
              e.RTCPeerConnection.prototype.createAnswer = function () {
                var e = this,
                  r = arguments;
                return this.setParametersPromises &&
                  this.setParametersPromises.length
                  ? Promise.all(this.setParametersPromises)
                      .then(function () {
                        return t.apply(e, r);
                      })
                      .finally(function () {
                        e.setParametersPromises = [];
                      })
                  : t.apply(this, arguments);
              };
            }
          }));
        var s = (function (e) {
          if (e && e.__esModule) return e;
          var t = {};
          if (null != e)
            for (var r in e)
              Object.prototype.hasOwnProperty.call(e, r) && (t[r] = e[r]);
          return ((t.default = e), t);
        })(t('../utils'));
      },
      { '../utils': 15, './getdisplaymedia': 12, './getusermedia': 13 },
    ],
    12: [
      function (e, t, r) {
        (Object.defineProperty(r, '__esModule', { value: !0 }),
          (r.shimGetDisplayMedia = function (e, t) {
            (e.navigator.mediaDevices &&
              'getDisplayMedia' in e.navigator.mediaDevices) ||
              (e.navigator.mediaDevices &&
                (e.navigator.mediaDevices.getDisplayMedia = function (r) {
                  if (!r || !r.video) {
                    var n = new DOMException(
                      'getDisplayMedia without video constraints is undefined'
                    );
                    return (
                      (n.name = 'NotFoundError'),
                      (n.code = 8),
                      Promise.reject(n)
                    );
                  }
                  return (
                    !0 === r.video
                      ? (r.video = { mediaSource: t })
                      : (r.video.mediaSource = t),
                    e.navigator.mediaDevices.getUserMedia(r)
                  );
                }));
          }));
      },
      {},
    ],
    13: [
      function (t, r, n) {
        Object.defineProperty(n, '__esModule', { value: !0 });
        var i =
          'function' == typeof Symbol && 'symbol' == e(Symbol.iterator)
            ? function (t) {
                return e(t);
              }
            : function (t) {
                return t &&
                  'function' == typeof Symbol &&
                  t.constructor === Symbol &&
                  t !== Symbol.prototype
                  ? 'symbol'
                  : e(t);
              };
        n.shimGetUserMedia = function (e) {
          var t = a.detectBrowser(e),
            r = e && e.navigator,
            n = e && e.MediaStreamTrack;
          if (
            ((r.getUserMedia = function (e, t, n) {
              (a.deprecated(
                'navigator.getUserMedia',
                'navigator.mediaDevices.getUserMedia'
              ),
                r.mediaDevices.getUserMedia(e).then(t, n));
            }),
            !(
              t.version > 55 &&
              'autoGainControl' in r.mediaDevices.getSupportedConstraints()
            ))
          ) {
            var o = function (e, t, r) {
                t in e && !(r in e) && ((e[r] = e[t]), delete e[t]);
              },
              s = r.mediaDevices.getUserMedia.bind(r.mediaDevices);
            if (
              ((r.mediaDevices.getUserMedia = function (e) {
                return (
                  'object' === (void 0 === e ? 'undefined' : i(e)) &&
                    'object' === i(e.audio) &&
                    ((e = JSON.parse(JSON.stringify(e))),
                    o(e.audio, 'autoGainControl', 'mozAutoGainControl'),
                    o(e.audio, 'noiseSuppression', 'mozNoiseSuppression')),
                  s(e)
                );
              }),
              n && n.prototype.getSettings)
            ) {
              var c = n.prototype.getSettings;
              n.prototype.getSettings = function () {
                var e = c.apply(this, arguments);
                return (
                  o(e, 'mozAutoGainControl', 'autoGainControl'),
                  o(e, 'mozNoiseSuppression', 'noiseSuppression'),
                  e
                );
              };
            }
            if (n && n.prototype.applyConstraints) {
              var d = n.prototype.applyConstraints;
              n.prototype.applyConstraints = function (e) {
                return (
                  'audio' === this.kind &&
                    'object' === (void 0 === e ? 'undefined' : i(e)) &&
                    ((e = JSON.parse(JSON.stringify(e))),
                    o(e, 'autoGainControl', 'mozAutoGainControl'),
                    o(e, 'noiseSuppression', 'mozNoiseSuppression')),
                  d.apply(this, [e])
                );
              };
            }
          }
        };
        var a = (function (e) {
          if (e && e.__esModule) return e;
          var t = {};
          if (null != e)
            for (var r in e)
              Object.prototype.hasOwnProperty.call(e, r) && (t[r] = e[r]);
          return ((t.default = e), t);
        })(t('../utils'));
      },
      { '../utils': 15 },
    ],
    14: [
      function (t, r, n) {
        Object.defineProperty(n, '__esModule', { value: !0 });
        var i =
          'function' == typeof Symbol && 'symbol' == e(Symbol.iterator)
            ? function (t) {
                return e(t);
              }
            : function (t) {
                return t &&
                  'function' == typeof Symbol &&
                  t.constructor === Symbol &&
                  t !== Symbol.prototype
                  ? 'symbol'
                  : e(t);
              };
        ((n.shimLocalStreamsAPI = function (e) {
          if (
            'object' === (void 0 === e ? 'undefined' : i(e)) &&
            e.RTCPeerConnection
          ) {
            if (
              ('getLocalStreams' in e.RTCPeerConnection.prototype ||
                (e.RTCPeerConnection.prototype.getLocalStreams = function () {
                  return (
                    this._localStreams || (this._localStreams = []),
                    this._localStreams
                  );
                }),
              !('addStream' in e.RTCPeerConnection.prototype))
            ) {
              var t = e.RTCPeerConnection.prototype.addTrack;
              ((e.RTCPeerConnection.prototype.addStream = function (e) {
                var r = this;
                (this._localStreams || (this._localStreams = []),
                  this._localStreams.includes(e) || this._localStreams.push(e),
                  e.getAudioTracks().forEach(function (n) {
                    return t.call(r, n, e);
                  }),
                  e.getVideoTracks().forEach(function (n) {
                    return t.call(r, n, e);
                  }));
              }),
                (e.RTCPeerConnection.prototype.addTrack = function (e) {
                  var r = arguments[1];
                  return (
                    r &&
                      (this._localStreams
                        ? this._localStreams.includes(r) ||
                          this._localStreams.push(r)
                        : (this._localStreams = [r])),
                    t.apply(this, arguments)
                  );
                }));
            }
            'removeStream' in e.RTCPeerConnection.prototype ||
              (e.RTCPeerConnection.prototype.removeStream = function (e) {
                var t = this;
                this._localStreams || (this._localStreams = []);
                var r = this._localStreams.indexOf(e);
                if (-1 !== r) {
                  this._localStreams.splice(r, 1);
                  var n = e.getTracks();
                  this.getSenders().forEach(function (e) {
                    n.includes(e.track) && t.removeTrack(e);
                  });
                }
              });
          }
        }),
          (n.shimRemoteStreamsAPI = function (e) {
            if (
              'object' === (void 0 === e ? 'undefined' : i(e)) &&
              e.RTCPeerConnection &&
              ('getRemoteStreams' in e.RTCPeerConnection.prototype ||
                (e.RTCPeerConnection.prototype.getRemoteStreams = function () {
                  return this._remoteStreams ? this._remoteStreams : [];
                }),
              !('onaddstream' in e.RTCPeerConnection.prototype))
            ) {
              Object.defineProperty(
                e.RTCPeerConnection.prototype,
                'onaddstream',
                {
                  get: function () {
                    return this._onaddstream;
                  },
                  set: function (e) {
                    var t = this;
                    (this._onaddstream &&
                      (this.removeEventListener('addstream', this._onaddstream),
                      this.removeEventListener('track', this._onaddstreampoly)),
                      this.addEventListener(
                        'addstream',
                        (this._onaddstream = e)
                      ),
                      this.addEventListener(
                        'track',
                        (this._onaddstreampoly = function (e) {
                          e.streams.forEach(function (e) {
                            if (
                              (t._remoteStreams || (t._remoteStreams = []),
                              !t._remoteStreams.includes(e))
                            ) {
                              t._remoteStreams.push(e);
                              var r = new Event('addstream');
                              ((r.stream = e), t.dispatchEvent(r));
                            }
                          });
                        })
                      ));
                  },
                }
              );
              var t = e.RTCPeerConnection.prototype.setRemoteDescription;
              e.RTCPeerConnection.prototype.setRemoteDescription = function () {
                var e = this;
                return (
                  this._onaddstreampoly ||
                    this.addEventListener(
                      'track',
                      (this._onaddstreampoly = function (t) {
                        t.streams.forEach(function (t) {
                          if (
                            (e._remoteStreams || (e._remoteStreams = []),
                            !(e._remoteStreams.indexOf(t) >= 0))
                          ) {
                            e._remoteStreams.push(t);
                            var r = new Event('addstream');
                            ((r.stream = t), e.dispatchEvent(r));
                          }
                        });
                      })
                    ),
                  t.apply(e, arguments)
                );
              };
            }
          }),
          (n.shimCallbacksAPI = function (e) {
            if (
              'object' === (void 0 === e ? 'undefined' : i(e)) &&
              e.RTCPeerConnection
            ) {
              var t = e.RTCPeerConnection.prototype,
                r = t.createOffer,
                n = t.createAnswer,
                a = t.setLocalDescription,
                o = t.setRemoteDescription,
                s = t.addIceCandidate;
              ((t.createOffer = function (e, t) {
                var n = arguments.length >= 2 ? arguments[2] : arguments[0],
                  i = r.apply(this, [n]);
                return t ? (i.then(e, t), Promise.resolve()) : i;
              }),
                (t.createAnswer = function (e, t) {
                  var r = arguments.length >= 2 ? arguments[2] : arguments[0],
                    i = n.apply(this, [r]);
                  return t ? (i.then(e, t), Promise.resolve()) : i;
                }));
              var c = function (e, t, r) {
                var n = a.apply(this, [e]);
                return r ? (n.then(t, r), Promise.resolve()) : n;
              };
              ((t.setLocalDescription = c),
                (c = function (e, t, r) {
                  var n = o.apply(this, [e]);
                  return r ? (n.then(t, r), Promise.resolve()) : n;
                }),
                (t.setRemoteDescription = c),
                (c = function (e, t, r) {
                  var n = s.apply(this, [e]);
                  return r ? (n.then(t, r), Promise.resolve()) : n;
                }),
                (t.addIceCandidate = c));
            }
          }),
          (n.shimGetUserMedia = function (e) {
            var t = e && e.navigator;
            if (t.mediaDevices && t.mediaDevices.getUserMedia) {
              var r = t.mediaDevices,
                n = r.getUserMedia.bind(r);
              t.mediaDevices.getUserMedia = function (e) {
                return n(o(e));
              };
            }
            !t.getUserMedia &&
              t.mediaDevices &&
              t.mediaDevices.getUserMedia &&
              (t.getUserMedia = function (e, r, n) {
                t.mediaDevices.getUserMedia(e).then(r, n);
              }.bind(t));
          }),
          (n.shimConstraints = o),
          (n.shimRTCIceServerUrls = function (e) {
            var t = e.RTCPeerConnection;
            ((e.RTCPeerConnection = function (e, r) {
              if (e && e.iceServers) {
                for (var n = [], i = 0; i < e.iceServers.length; i++) {
                  var o = e.iceServers[i];
                  !o.hasOwnProperty('urls') && o.hasOwnProperty('url')
                    ? (a.deprecated('RTCIceServer.url', 'RTCIceServer.urls'),
                      ((o = JSON.parse(JSON.stringify(o))).urls = o.url),
                      delete o.url,
                      n.push(o))
                    : n.push(e.iceServers[i]);
                }
                e.iceServers = n;
              }
              return new t(e, r);
            }),
              (e.RTCPeerConnection.prototype = t.prototype),
              'generateCertificate' in e.RTCPeerConnection &&
                Object.defineProperty(
                  e.RTCPeerConnection,
                  'generateCertificate',
                  {
                    get: function () {
                      return t.generateCertificate;
                    },
                  }
                ));
          }),
          (n.shimTrackEventTransceiver = function (e) {
            'object' === (void 0 === e ? 'undefined' : i(e)) &&
              e.RTCTrackEvent &&
              'receiver' in e.RTCTrackEvent.prototype &&
              !('transceiver' in e.RTCTrackEvent.prototype) &&
              Object.defineProperty(e.RTCTrackEvent.prototype, 'transceiver', {
                get: function () {
                  return { receiver: this.receiver };
                },
              });
          }),
          (n.shimCreateOfferLegacy = function (e) {
            var t = e.RTCPeerConnection.prototype.createOffer;
            e.RTCPeerConnection.prototype.createOffer = function (e) {
              if (e) {
                void 0 !== e.offerToReceiveAudio &&
                  (e.offerToReceiveAudio = !!e.offerToReceiveAudio);
                var r = this.getTransceivers().find(function (e) {
                  return 'audio' === e.receiver.track.kind;
                });
                (!1 === e.offerToReceiveAudio && r
                  ? 'sendrecv' === r.direction
                    ? r.setDirection
                      ? r.setDirection('sendonly')
                      : (r.direction = 'sendonly')
                    : 'recvonly' === r.direction &&
                      (r.setDirection
                        ? r.setDirection('inactive')
                        : (r.direction = 'inactive'))
                  : !0 !== e.offerToReceiveAudio ||
                    r ||
                    this.addTransceiver('audio'),
                  void 0 !== e.offerToReceiveVideo &&
                    (e.offerToReceiveVideo = !!e.offerToReceiveVideo));
                var n = this.getTransceivers().find(function (e) {
                  return 'video' === e.receiver.track.kind;
                });
                !1 === e.offerToReceiveVideo && n
                  ? 'sendrecv' === n.direction
                    ? n.setDirection
                      ? n.setDirection('sendonly')
                      : (n.direction = 'sendonly')
                    : 'recvonly' === n.direction &&
                      (n.setDirection
                        ? n.setDirection('inactive')
                        : (n.direction = 'inactive'))
                  : !0 !== e.offerToReceiveVideo ||
                    n ||
                    this.addTransceiver('video');
              }
              return t.apply(this, arguments);
            };
          }));
        var a = (function (e) {
          if (e && e.__esModule) return e;
          var t = {};
          if (null != e)
            for (var r in e)
              Object.prototype.hasOwnProperty.call(e, r) && (t[r] = e[r]);
          return ((t.default = e), t);
        })(t('../utils'));
        function o(e) {
          return e && void 0 !== e.video
            ? Object.assign({}, e, { video: a.compactObject(e.video) })
            : e;
        }
      },
      { '../utils': 15 },
    ],
    15: [
      function (t, r, n) {
        Object.defineProperty(n, '__esModule', { value: !0 });
        var i =
          'function' == typeof Symbol && 'symbol' == e(Symbol.iterator)
            ? function (t) {
                return e(t);
              }
            : function (t) {
                return t &&
                  'function' == typeof Symbol &&
                  t.constructor === Symbol &&
                  t !== Symbol.prototype
                  ? 'symbol'
                  : e(t);
              };
        ((n.extractVersion = o),
          (n.wrapPeerConnectionEvent = function (e, t, r) {
            if (e.RTCPeerConnection) {
              var n = e.RTCPeerConnection.prototype,
                i = n.addEventListener;
              n.addEventListener = function (e, n) {
                if (e !== t) return i.apply(this, arguments);
                var a = function (e) {
                  var t = r(e);
                  t && n(t);
                };
                return (
                  (this._eventMap = this._eventMap || {}),
                  (this._eventMap[n] = a),
                  i.apply(this, [e, a])
                );
              };
              var a = n.removeEventListener;
              ((n.removeEventListener = function (e, r) {
                if (e !== t || !this._eventMap || !this._eventMap[r])
                  return a.apply(this, arguments);
                var n = this._eventMap[r];
                return (delete this._eventMap[r], a.apply(this, [e, n]));
              }),
                Object.defineProperty(n, 'on' + t, {
                  get: function () {
                    return this['_on' + t];
                  },
                  set: function (e) {
                    (this['_on' + t] &&
                      (this.removeEventListener(t, this['_on' + t]),
                      delete this['_on' + t]),
                      e && this.addEventListener(t, (this['_on' + t] = e)));
                  },
                  enumerable: !0,
                  configurable: !0,
                }));
            }
          }),
          (n.disableLog = function (e) {
            return 'boolean' != typeof e
              ? new Error(
                  'Argument type: ' +
                    (void 0 === e ? 'undefined' : i(e)) +
                    '. Please use a boolean.'
                )
              : ((a = e),
                e
                  ? 'adapter.js logging disabled'
                  : 'adapter.js logging enabled');
          }),
          (n.disableWarnings = function (e) {
            return 'boolean' != typeof e
              ? new Error(
                  'Argument type: ' +
                    (void 0 === e ? 'undefined' : i(e)) +
                    '. Please use a boolean.'
                )
              : 'adapter.js deprecation warnings ' +
                  (e ? 'disabled' : 'enabled');
          }),
          (n.log = function () {
            if (
              'object' ===
              ('undefined' == typeof window ? 'undefined' : i(window))
            ) {
              if (a) return;
              'undefined' != typeof console && console.log;
            }
          }),
          (n.deprecated = function (e, t) {}),
          (n.detectBrowser = function (e) {
            var t = e.navigator,
              r = { browser: null, version: null };
            if (void 0 === e || !e.navigator)
              return ((r.browser = 'Not a browser.'), r);
            if (t.mozGetUserMedia)
              ((r.browser = 'firefox'),
                (r.version = o(t.userAgent, /Firefox\/(\d+)\./, 1)));
            else if (
              t.webkitGetUserMedia ||
              (!1 === e.isSecureContext &&
                e.webkitRTCPeerConnection &&
                !e.RTCIceGatherer)
            )
              ((r.browser = 'chrome'),
                (r.version = o(t.userAgent, /Chrom(e|ium)\/(\d+)\./, 2)));
            else if (t.mediaDevices && t.userAgent.match(/Edge\/(\d+).(\d+)$/))
              ((r.browser = 'edge'),
                (r.version = o(t.userAgent, /Edge\/(\d+).(\d+)$/, 2)));
            else {
              if (
                !e.RTCPeerConnection ||
                !t.userAgent.match(/AppleWebKit\/(\d+)\./)
              )
                return ((r.browser = 'Not a supported browser.'), r);
              ((r.browser = 'safari'),
                (r.version = o(t.userAgent, /AppleWebKit\/(\d+)\./, 1)),
                (r.supportsUnifiedPlan =
                  e.RTCRtpTransceiver &&
                  'currentDirection' in e.RTCRtpTransceiver.prototype));
            }
            return r;
          }),
          (n.compactObject = function e(t) {
            return s(t)
              ? Object.keys(t).reduce(function (r, n) {
                  var i = s(t[n]),
                    a = i ? e(t[n]) : t[n],
                    o = i && !Object.keys(a).length;
                  return void 0 === a || o
                    ? r
                    : Object.assign(
                        r,
                        (function (e, t, r) {
                          return (
                            t in e
                              ? Object.defineProperty(e, t, {
                                  value: r,
                                  enumerable: !0,
                                  configurable: !0,
                                  writable: !0,
                                })
                              : (e[t] = r),
                            e
                          );
                        })({}, n, a)
                      );
                }, {})
              : t;
          }),
          (n.walkStats = c),
          (n.filterStats = function (e, t, r) {
            var n = r ? 'outbound-rtp' : 'inbound-rtp',
              i = new Map();
            if (null === t) return i;
            var a = [];
            return (
              e.forEach(function (e) {
                'track' === e.type && e.trackIdentifier === t.id && a.push(e);
              }),
              a.forEach(function (t) {
                e.forEach(function (r) {
                  r.type === n && r.trackId === t.id && c(e, r, i);
                });
              }),
              i
            );
          }));
        var a = !0;
        function o(e, t, r) {
          var n = e.match(t);
          return n && n.length >= r && parseInt(n[r], 10);
        }
        function s(e) {
          return '[object Object]' === Object.prototype.toString.call(e);
        }
        function c(e, t, r) {
          t &&
            !r.has(t.id) &&
            (r.set(t.id, t),
            Object.keys(t).forEach(function (n) {
              n.endsWith('Id')
                ? c(e, e.get(t[n]), r)
                : n.endsWith('Ids') &&
                  t[n].forEach(function (t) {
                    c(e, e.get(t), r);
                  });
            }));
        }
      },
      {},
    ],
    16: [
      function (e, t, r) {
        var n = e('sdp');
        function i(e, t, r, i, a) {
          var o = n.writeRtpDescription(e.kind, t);
          if (
            ((o += n.writeIceParameters(e.iceGatherer.getLocalParameters())),
            (o += n.writeDtlsParameters(
              e.dtlsTransport.getLocalParameters(),
              'offer' === r ? 'actpass' : a || 'active'
            )),
            (o += 'a=mid:' + e.mid + '\r\n'),
            e.rtpSender && e.rtpReceiver
              ? (o += 'a=sendrecv\r\n')
              : e.rtpSender
                ? (o += 'a=sendonly\r\n')
                : e.rtpReceiver
                  ? (o += 'a=recvonly\r\n')
                  : (o += 'a=inactive\r\n'),
            e.rtpSender)
          ) {
            var s = e.rtpSender._initialTrackId || e.rtpSender.track.id;
            e.rtpSender._initialTrackId = s;
            var c = 'msid:' + (i ? i.id : '-') + ' ' + s + '\r\n';
            ((o += 'a=' + c),
              (o += 'a=ssrc:' + e.sendEncodingParameters[0].ssrc + ' ' + c),
              e.sendEncodingParameters[0].rtx &&
                ((o +=
                  'a=ssrc:' + e.sendEncodingParameters[0].rtx.ssrc + ' ' + c),
                (o +=
                  'a=ssrc-group:FID ' +
                  e.sendEncodingParameters[0].ssrc +
                  ' ' +
                  e.sendEncodingParameters[0].rtx.ssrc +
                  '\r\n')));
          }
          return (
            (o +=
              'a=ssrc:' +
              e.sendEncodingParameters[0].ssrc +
              ' cname:' +
              n.localCName +
              '\r\n'),
            e.rtpSender &&
              e.sendEncodingParameters[0].rtx &&
              (o +=
                'a=ssrc:' +
                e.sendEncodingParameters[0].rtx.ssrc +
                ' cname:' +
                n.localCName +
                '\r\n'),
            o
          );
        }
        function a(e, t) {
          var r = { codecs: [], headerExtensions: [], fecMechanisms: [] },
            n = function (e, t) {
              e = parseInt(e, 10);
              for (var r = 0; r < t.length; r++)
                if (t[r].payloadType === e || t[r].preferredPayloadType === e)
                  return t[r];
            },
            i = function (e, t, r, i) {
              var a = n(e.parameters.apt, r),
                o = n(t.parameters.apt, i);
              return a && o && a.name.toLowerCase() === o.name.toLowerCase();
            };
          return (
            e.codecs.forEach(function (n) {
              for (var a = 0; a < t.codecs.length; a++) {
                var o = t.codecs[a];
                if (
                  n.name.toLowerCase() === o.name.toLowerCase() &&
                  n.clockRate === o.clockRate
                ) {
                  if (
                    'rtx' === n.name.toLowerCase() &&
                    n.parameters &&
                    o.parameters.apt &&
                    !i(n, o, e.codecs, t.codecs)
                  )
                    continue;
                  (((o = JSON.parse(JSON.stringify(o))).numChannels = Math.min(
                    n.numChannels,
                    o.numChannels
                  )),
                    r.codecs.push(o),
                    (o.rtcpFeedback = o.rtcpFeedback.filter(function (e) {
                      for (var t = 0; t < n.rtcpFeedback.length; t++)
                        if (
                          n.rtcpFeedback[t].type === e.type &&
                          n.rtcpFeedback[t].parameter === e.parameter
                        )
                          return !0;
                      return !1;
                    })));
                  break;
                }
              }
            }),
            e.headerExtensions.forEach(function (e) {
              for (var n = 0; n < t.headerExtensions.length; n++) {
                var i = t.headerExtensions[n];
                if (e.uri === i.uri) {
                  r.headerExtensions.push(i);
                  break;
                }
              }
            }),
            r
          );
        }
        function o(e, t, r) {
          return (
            -1 !==
            {
              offer: {
                setLocalDescription: ['stable', 'have-local-offer'],
                setRemoteDescription: ['stable', 'have-remote-offer'],
              },
              answer: {
                setLocalDescription: [
                  'have-remote-offer',
                  'have-local-pranswer',
                ],
                setRemoteDescription: [
                  'have-local-offer',
                  'have-remote-pranswer',
                ],
              },
            }[t][e].indexOf(r)
          );
        }
        function s(e, t) {
          var r = e.getRemoteCandidates().find(function (e) {
            return (
              t.foundation === e.foundation &&
              t.ip === e.ip &&
              t.port === e.port &&
              t.priority === e.priority &&
              t.protocol === e.protocol &&
              t.type === e.type
            );
          });
          return (r || e.addRemoteCandidate(t), !r);
        }
        function c(e, t) {
          var r = new Error(t);
          return (
            (r.name = e),
            (r.code = {
              NotSupportedError: 9,
              InvalidStateError: 11,
              InvalidAccessError: 15,
              TypeError: void 0,
              OperationError: void 0,
            }[e]),
            r
          );
        }
        t.exports = function (e, t) {
          function r(t, r) {
            (r.addTrack(t),
              r.dispatchEvent(
                new e.MediaStreamTrackEvent('addtrack', { track: t })
              ));
          }
          function d(t, r, n, i) {
            var a = new Event('track');
            ((a.track = r),
              (a.receiver = n),
              (a.transceiver = { receiver: n }),
              (a.streams = i),
              e.setTimeout(function () {
                t._dispatchEvent('track', a);
              }));
          }
          var p = function (r) {
            var i = this,
              a = document.createDocumentFragment();
            if (
              ([
                'addEventListener',
                'removeEventListener',
                'dispatchEvent',
              ].forEach(function (e) {
                i[e] = a[e].bind(a);
              }),
              (this.canTrickleIceCandidates = null),
              (this.needNegotiation = !1),
              (this.localStreams = []),
              (this.remoteStreams = []),
              (this._localDescription = null),
              (this._remoteDescription = null),
              (this.signalingState = 'stable'),
              (this.iceConnectionState = 'new'),
              (this.connectionState = 'new'),
              (this.iceGatheringState = 'new'),
              (r = JSON.parse(JSON.stringify(r || {}))),
              (this.usingBundle = 'max-bundle' === r.bundlePolicy),
              'negotiate' === r.rtcpMuxPolicy)
            )
              throw c(
                'NotSupportedError',
                "rtcpMuxPolicy 'negotiate' is not supported"
              );
            switch (
              (r.rtcpMuxPolicy || (r.rtcpMuxPolicy = 'require'),
              r.iceTransportPolicy)
            ) {
              case 'all':
              case 'relay':
                break;
              default:
                r.iceTransportPolicy = 'all';
            }
            switch (r.bundlePolicy) {
              case 'balanced':
              case 'max-compat':
              case 'max-bundle':
                break;
              default:
                r.bundlePolicy = 'balanced';
            }
            if (
              ((r.iceServers = (function (e, t) {
                var r = !1;
                return (e = JSON.parse(JSON.stringify(e))).filter(function (e) {
                  if (e && (e.urls || e.url)) {
                    var n = e.urls || e.url;
                    e.url && e.urls;
                    var i = 'string' == typeof n;
                    return (
                      i && (n = [n]),
                      (n = n.filter(function (e) {
                        return 0 !== e.indexOf('turn:') ||
                          -1 === e.indexOf('transport=udp') ||
                          -1 !== e.indexOf('turn:[') ||
                          r
                          ? 0 === e.indexOf('stun:') &&
                              t >= 14393 &&
                              -1 === e.indexOf('?transport=udp')
                          : ((r = !0), !0);
                      })),
                      delete e.url,
                      (e.urls = i ? n[0] : n),
                      !!n.length
                    );
                  }
                });
              })(r.iceServers || [], t)),
              (this._iceGatherers = []),
              r.iceCandidatePoolSize)
            )
              for (var o = r.iceCandidatePoolSize; o > 0; o--)
                this._iceGatherers.push(
                  new e.RTCIceGatherer({
                    iceServers: r.iceServers,
                    gatherPolicy: r.iceTransportPolicy,
                  })
                );
            else r.iceCandidatePoolSize = 0;
            ((this._config = r),
              (this.transceivers = []),
              (this._sdpSessionId = n.generateSessionId()),
              (this._sdpSessionVersion = 0),
              (this._dtlsRole = void 0),
              (this._isClosed = !1));
          };
          (Object.defineProperty(p.prototype, 'localDescription', {
            configurable: !0,
            get: function () {
              return this._localDescription;
            },
          }),
            Object.defineProperty(p.prototype, 'remoteDescription', {
              configurable: !0,
              get: function () {
                return this._remoteDescription;
              },
            }),
            (p.prototype.onicecandidate = null),
            (p.prototype.onaddstream = null),
            (p.prototype.ontrack = null),
            (p.prototype.onremovestream = null),
            (p.prototype.onsignalingstatechange = null),
            (p.prototype.oniceconnectionstatechange = null),
            (p.prototype.onconnectionstatechange = null),
            (p.prototype.onicegatheringstatechange = null),
            (p.prototype.onnegotiationneeded = null),
            (p.prototype.ondatachannel = null),
            (p.prototype._dispatchEvent = function (e, t) {
              this._isClosed ||
                (this.dispatchEvent(t),
                'function' == typeof this['on' + e] && this['on' + e](t));
            }),
            (p.prototype._emitGatheringStateChange = function () {
              var e = new Event('icegatheringstatechange');
              this._dispatchEvent('icegatheringstatechange', e);
            }),
            (p.prototype.getConfiguration = function () {
              return this._config;
            }),
            (p.prototype.getLocalStreams = function () {
              return this.localStreams;
            }),
            (p.prototype.getRemoteStreams = function () {
              return this.remoteStreams;
            }),
            (p.prototype._createTransceiver = function (e, t) {
              var r = this.transceivers.length > 0,
                n = {
                  track: null,
                  iceGatherer: null,
                  iceTransport: null,
                  dtlsTransport: null,
                  localCapabilities: null,
                  remoteCapabilities: null,
                  rtpSender: null,
                  rtpReceiver: null,
                  kind: e,
                  mid: null,
                  sendEncodingParameters: null,
                  recvEncodingParameters: null,
                  stream: null,
                  associatedRemoteMediaStreams: [],
                  wantReceive: !0,
                };
              if (this.usingBundle && r)
                ((n.iceTransport = this.transceivers[0].iceTransport),
                  (n.dtlsTransport = this.transceivers[0].dtlsTransport));
              else {
                var i = this._createIceAndDtlsTransports();
                ((n.iceTransport = i.iceTransport),
                  (n.dtlsTransport = i.dtlsTransport));
              }
              return (t || this.transceivers.push(n), n);
            }),
            (p.prototype.addTrack = function (t, r) {
              if (this._isClosed)
                throw c(
                  'InvalidStateError',
                  'Attempted to call addTrack on a closed peerconnection.'
                );
              var n;
              if (
                this.transceivers.find(function (e) {
                  return e.track === t;
                })
              )
                throw c('InvalidAccessError', 'Track already exists.');
              for (var i = 0; i < this.transceivers.length; i++)
                this.transceivers[i].track ||
                  this.transceivers[i].kind !== t.kind ||
                  (n = this.transceivers[i]);
              return (
                n || (n = this._createTransceiver(t.kind)),
                this._maybeFireNegotiationNeeded(),
                -1 === this.localStreams.indexOf(r) &&
                  this.localStreams.push(r),
                (n.track = t),
                (n.stream = r),
                (n.rtpSender = new e.RTCRtpSender(t, n.dtlsTransport)),
                n.rtpSender
              );
            }),
            (p.prototype.addStream = function (e) {
              var r = this;
              if (t >= 15025)
                e.getTracks().forEach(function (t) {
                  r.addTrack(t, e);
                });
              else {
                var n = e.clone();
                (e.getTracks().forEach(function (e, t) {
                  var r = n.getTracks()[t];
                  e.addEventListener('enabled', function (e) {
                    r.enabled = e.enabled;
                  });
                }),
                  n.getTracks().forEach(function (e) {
                    r.addTrack(e, n);
                  }));
              }
            }),
            (p.prototype.removeTrack = function (t) {
              if (this._isClosed)
                throw c(
                  'InvalidStateError',
                  'Attempted to call removeTrack on a closed peerconnection.'
                );
              if (!(t instanceof e.RTCRtpSender))
                throw new TypeError(
                  'Argument 1 of RTCPeerConnection.removeTrack does not implement interface RTCRtpSender.'
                );
              var r = this.transceivers.find(function (e) {
                return e.rtpSender === t;
              });
              if (!r)
                throw c(
                  'InvalidAccessError',
                  'Sender was not created by this connection.'
                );
              var n = r.stream;
              (r.rtpSender.stop(),
                (r.rtpSender = null),
                (r.track = null),
                (r.stream = null),
                -1 ===
                  this.transceivers
                    .map(function (e) {
                      return e.stream;
                    })
                    .indexOf(n) &&
                  this.localStreams.indexOf(n) > -1 &&
                  this.localStreams.splice(this.localStreams.indexOf(n), 1),
                this._maybeFireNegotiationNeeded());
            }),
            (p.prototype.removeStream = function (e) {
              var t = this;
              e.getTracks().forEach(function (e) {
                var r = t.getSenders().find(function (t) {
                  return t.track === e;
                });
                r && t.removeTrack(r);
              });
            }),
            (p.prototype.getSenders = function () {
              return this.transceivers
                .filter(function (e) {
                  return !!e.rtpSender;
                })
                .map(function (e) {
                  return e.rtpSender;
                });
            }),
            (p.prototype.getReceivers = function () {
              return this.transceivers
                .filter(function (e) {
                  return !!e.rtpReceiver;
                })
                .map(function (e) {
                  return e.rtpReceiver;
                });
            }),
            (p.prototype._createIceGatherer = function (t, r) {
              var n = this;
              if (r && t > 0) return this.transceivers[0].iceGatherer;
              if (this._iceGatherers.length) return this._iceGatherers.shift();
              var i = new e.RTCIceGatherer({
                iceServers: this._config.iceServers,
                gatherPolicy: this._config.iceTransportPolicy,
              });
              return (
                Object.defineProperty(i, 'state', {
                  value: 'new',
                  writable: !0,
                }),
                (this.transceivers[t].bufferedCandidateEvents = []),
                (this.transceivers[t].bufferCandidates = function (e) {
                  var r = !e.candidate || 0 === Object.keys(e.candidate).length;
                  ((i.state = r ? 'completed' : 'gathering'),
                    null !== n.transceivers[t].bufferedCandidateEvents &&
                      n.transceivers[t].bufferedCandidateEvents.push(e));
                }),
                i.addEventListener(
                  'localcandidate',
                  this.transceivers[t].bufferCandidates
                ),
                i
              );
            }),
            (p.prototype._gather = function (t, r) {
              var i = this,
                a = this.transceivers[r].iceGatherer;
              if (!a.onlocalcandidate) {
                var o = this.transceivers[r].bufferedCandidateEvents;
                ((this.transceivers[r].bufferedCandidateEvents = null),
                  a.removeEventListener(
                    'localcandidate',
                    this.transceivers[r].bufferCandidates
                  ),
                  (a.onlocalcandidate = function (e) {
                    if (!(i.usingBundle && r > 0)) {
                      var o = new Event('icecandidate');
                      o.candidate = { sdpMid: t, sdpMLineIndex: r };
                      var s = e.candidate,
                        c = !s || 0 === Object.keys(s).length;
                      if (c)
                        ('new' !== a.state && 'gathering' !== a.state) ||
                          (a.state = 'completed');
                      else {
                        ('new' === a.state && (a.state = 'gathering'),
                          (s.component = 1),
                          (s.ufrag = a.getLocalParameters().usernameFragment));
                        var d = n.writeCandidate(s);
                        ((o.candidate = Object.assign(
                          o.candidate,
                          n.parseCandidate(d)
                        )),
                          (o.candidate.candidate = d),
                          (o.candidate.toJSON = function () {
                            return {
                              candidate: o.candidate.candidate,
                              sdpMid: o.candidate.sdpMid,
                              sdpMLineIndex: o.candidate.sdpMLineIndex,
                              usernameFragment: o.candidate.usernameFragment,
                            };
                          }));
                      }
                      var p = n.getMediaSections(i._localDescription.sdp);
                      ((p[o.candidate.sdpMLineIndex] += c
                        ? 'a=end-of-candidates\r\n'
                        : 'a=' + o.candidate.candidate + '\r\n'),
                        (i._localDescription.sdp =
                          n.getDescription(i._localDescription.sdp) +
                          p.join('')));
                      var u = i.transceivers.every(function (e) {
                        return (
                          e.iceGatherer && 'completed' === e.iceGatherer.state
                        );
                      });
                      ('gathering' !== i.iceGatheringState &&
                        ((i.iceGatheringState = 'gathering'),
                        i._emitGatheringStateChange()),
                        c || i._dispatchEvent('icecandidate', o),
                        u &&
                          (i._dispatchEvent(
                            'icecandidate',
                            new Event('icecandidate')
                          ),
                          (i.iceGatheringState = 'complete'),
                          i._emitGatheringStateChange()));
                    }
                  }),
                  e.setTimeout(function () {
                    o.forEach(function (e) {
                      a.onlocalcandidate(e);
                    });
                  }, 0));
              }
            }),
            (p.prototype._createIceAndDtlsTransports = function () {
              var t = this,
                r = new e.RTCIceTransport(null);
              r.onicestatechange = function () {
                (t._updateIceConnectionState(), t._updateConnectionState());
              };
              var n = new e.RTCDtlsTransport(r);
              return (
                (n.ondtlsstatechange = function () {
                  t._updateConnectionState();
                }),
                (n.onerror = function () {
                  (Object.defineProperty(n, 'state', {
                    value: 'failed',
                    writable: !0,
                  }),
                    t._updateConnectionState());
                }),
                { iceTransport: r, dtlsTransport: n }
              );
            }),
            (p.prototype._disposeIceAndDtlsTransports = function (e) {
              var t = this.transceivers[e].iceGatherer;
              t &&
                (delete t.onlocalcandidate,
                delete this.transceivers[e].iceGatherer);
              var r = this.transceivers[e].iceTransport;
              r &&
                (delete r.onicestatechange,
                delete this.transceivers[e].iceTransport);
              var n = this.transceivers[e].dtlsTransport;
              n &&
                (delete n.ondtlsstatechange,
                delete n.onerror,
                delete this.transceivers[e].dtlsTransport);
            }),
            (p.prototype._transceive = function (e, r, i) {
              var o = a(e.localCapabilities, e.remoteCapabilities);
              (r &&
                e.rtpSender &&
                ((o.encodings = e.sendEncodingParameters),
                (o.rtcp = {
                  cname: n.localCName,
                  compound: e.rtcpParameters.compound,
                }),
                e.recvEncodingParameters.length &&
                  (o.rtcp.ssrc = e.recvEncodingParameters[0].ssrc),
                e.rtpSender.send(o)),
                i &&
                  e.rtpReceiver &&
                  o.codecs.length > 0 &&
                  ('video' === e.kind &&
                    e.recvEncodingParameters &&
                    t < 15019 &&
                    e.recvEncodingParameters.forEach(function (e) {
                      delete e.rtx;
                    }),
                  e.recvEncodingParameters.length
                    ? (o.encodings = e.recvEncodingParameters)
                    : (o.encodings = [{}]),
                  (o.rtcp = { compound: e.rtcpParameters.compound }),
                  e.rtcpParameters.cname &&
                    (o.rtcp.cname = e.rtcpParameters.cname),
                  e.sendEncodingParameters.length &&
                    (o.rtcp.ssrc = e.sendEncodingParameters[0].ssrc),
                  e.rtpReceiver.receive(o)));
            }),
            (p.prototype.setLocalDescription = function (e) {
              var t,
                r,
                i = this;
              if (-1 === ['offer', 'answer'].indexOf(e.type))
                return Promise.reject(
                  c('TypeError', 'Unsupported type "' + e.type + '"')
                );
              if (
                !o('setLocalDescription', e.type, i.signalingState) ||
                i._isClosed
              )
                return Promise.reject(
                  c(
                    'InvalidStateError',
                    'Can not set local ' +
                      e.type +
                      ' in state ' +
                      i.signalingState
                  )
                );
              if ('offer' === e.type)
                ((t = n.splitSections(e.sdp)),
                  (r = t.shift()),
                  t.forEach(function (e, t) {
                    var r = n.parseRtpParameters(e);
                    i.transceivers[t].localCapabilities = r;
                  }),
                  i.transceivers.forEach(function (e, t) {
                    i._gather(e.mid, t);
                  }));
              else if ('answer' === e.type) {
                ((t = n.splitSections(i._remoteDescription.sdp)),
                  (r = t.shift()));
                var s = n.matchPrefix(r, 'a=ice-lite').length > 0;
                t.forEach(function (e, t) {
                  var o = i.transceivers[t],
                    c = o.iceGatherer,
                    d = o.iceTransport,
                    p = o.dtlsTransport,
                    u = o.localCapabilities,
                    f = o.remoteCapabilities;
                  if (
                    !(
                      (n.isRejected(e) &&
                        0 === n.matchPrefix(e, 'a=bundle-only').length) ||
                      o.rejected
                    )
                  ) {
                    var l = n.getIceParameters(e, r),
                      m = n.getDtlsParameters(e, r);
                    (s && (m.role = 'server'),
                      (i.usingBundle && 0 !== t) ||
                        (i._gather(o.mid, t),
                        'new' === d.state &&
                          d.start(c, l, s ? 'controlling' : 'controlled'),
                        'new' === p.state && p.start(m)));
                    var h = a(u, f);
                    i._transceive(o, h.codecs.length > 0, !1);
                  }
                });
              }
              return (
                (i._localDescription = { type: e.type, sdp: e.sdp }),
                'offer' === e.type
                  ? i._updateSignalingState('have-local-offer')
                  : i._updateSignalingState('stable'),
                Promise.resolve()
              );
            }),
            (p.prototype.setRemoteDescription = function (i) {
              var p = this;
              if (-1 === ['offer', 'answer'].indexOf(i.type))
                return Promise.reject(
                  c('TypeError', 'Unsupported type "' + i.type + '"')
                );
              if (
                !o('setRemoteDescription', i.type, p.signalingState) ||
                p._isClosed
              )
                return Promise.reject(
                  c(
                    'InvalidStateError',
                    'Can not set remote ' +
                      i.type +
                      ' in state ' +
                      p.signalingState
                  )
                );
              var u = {};
              p.remoteStreams.forEach(function (e) {
                u[e.id] = e;
              });
              var f = [],
                l = n.splitSections(i.sdp),
                m = l.shift(),
                h = n.matchPrefix(m, 'a=ice-lite').length > 0,
                v = n.matchPrefix(m, 'a=group:BUNDLE ').length > 0;
              p.usingBundle = v;
              var y = n.matchPrefix(m, 'a=ice-options:')[0];
              return (
                (p.canTrickleIceCandidates =
                  !!y && y.substr(14).split(' ').indexOf('trickle') >= 0),
                l.forEach(function (o, c) {
                  var d = n.splitLines(o),
                    l = n.getKind(o),
                    y =
                      n.isRejected(o) &&
                      0 === n.matchPrefix(o, 'a=bundle-only').length,
                    g = d[0].substr(2).split(' ')[2],
                    C = n.getDirection(o, m),
                    S = n.parseMsid(o),
                    T = n.getMid(o) || n.generateIdentifier();
                  if (
                    y ||
                    ('application' === l &&
                      ('DTLS/SCTP' === g || 'UDP/DTLS/SCTP' === g))
                  )
                    p.transceivers[c] = {
                      mid: T,
                      kind: l,
                      protocol: g,
                      rejected: !0,
                    };
                  else {
                    var P, R, b, w, E, _, k, x, M;
                    !y &&
                      p.transceivers[c] &&
                      p.transceivers[c].rejected &&
                      (p.transceivers[c] = p._createTransceiver(l, !0));
                    var D,
                      O,
                      I = n.parseRtpParameters(o);
                    (y ||
                      ((D = n.getIceParameters(o, m)),
                      ((O = n.getDtlsParameters(o, m)).role = 'client')),
                      (k = n.parseRtpEncodingParameters(o)));
                    var j = n.parseRtcpParameters(o),
                      L = n.matchPrefix(o, 'a=end-of-candidates', m).length > 0,
                      A = n
                        .matchPrefix(o, 'a=candidate:')
                        .map(function (e) {
                          return n.parseCandidate(e);
                        })
                        .filter(function (e) {
                          return 1 === e.component;
                        });
                    if (
                      (('offer' === i.type || 'answer' === i.type) &&
                        !y &&
                        v &&
                        c > 0 &&
                        p.transceivers[c] &&
                        (p._disposeIceAndDtlsTransports(c),
                        (p.transceivers[c].iceGatherer =
                          p.transceivers[0].iceGatherer),
                        (p.transceivers[c].iceTransport =
                          p.transceivers[0].iceTransport),
                        (p.transceivers[c].dtlsTransport =
                          p.transceivers[0].dtlsTransport),
                        p.transceivers[c].rtpSender &&
                          p.transceivers[c].rtpSender.setTransport(
                            p.transceivers[0].dtlsTransport
                          ),
                        p.transceivers[c].rtpReceiver &&
                          p.transceivers[c].rtpReceiver.setTransport(
                            p.transceivers[0].dtlsTransport
                          )),
                      'offer' !== i.type || y)
                    )
                      'answer' !== i.type ||
                        y ||
                        ((R = (P = p.transceivers[c]).iceGatherer),
                        (b = P.iceTransport),
                        (w = P.dtlsTransport),
                        (E = P.rtpReceiver),
                        (_ = P.sendEncodingParameters),
                        (x = P.localCapabilities),
                        (p.transceivers[c].recvEncodingParameters = k),
                        (p.transceivers[c].remoteCapabilities = I),
                        (p.transceivers[c].rtcpParameters = j),
                        A.length &&
                          'new' === b.state &&
                          ((!h && !L) || (v && 0 !== c)
                            ? A.forEach(function (e) {
                                s(P.iceTransport, e);
                              })
                            : b.setRemoteCandidates(A)),
                        (v && 0 !== c) ||
                          ('new' === b.state && b.start(R, D, 'controlling'),
                          'new' === w.state && w.start(O)),
                        !a(
                          P.localCapabilities,
                          P.remoteCapabilities
                        ).codecs.filter(function (e) {
                          return 'rtx' === e.name.toLowerCase();
                        }).length &&
                          P.sendEncodingParameters[0].rtx &&
                          delete P.sendEncodingParameters[0].rtx,
                        p._transceive(
                          P,
                          'sendrecv' === C || 'recvonly' === C,
                          'sendrecv' === C || 'sendonly' === C
                        ),
                        !E || ('sendrecv' !== C && 'sendonly' !== C)
                          ? delete P.rtpReceiver
                          : ((M = E.track),
                            S
                              ? (u[S.stream] ||
                                  (u[S.stream] = new e.MediaStream()),
                                r(M, u[S.stream]),
                                f.push([M, E, u[S.stream]]))
                              : (u.default || (u.default = new e.MediaStream()),
                                r(M, u.default),
                                f.push([M, E, u.default]))));
                    else {
                      (((P = p.transceivers[c] || p._createTransceiver(l)).mid =
                        T),
                        P.iceGatherer ||
                          (P.iceGatherer = p._createIceGatherer(c, v)),
                        A.length &&
                          'new' === P.iceTransport.state &&
                          (!L || (v && 0 !== c)
                            ? A.forEach(function (e) {
                                s(P.iceTransport, e);
                              })
                            : P.iceTransport.setRemoteCandidates(A)),
                        (x = e.RTCRtpReceiver.getCapabilities(l)),
                        t < 15019 &&
                          (x.codecs = x.codecs.filter(function (e) {
                            return 'rtx' !== e.name;
                          })),
                        (_ = P.sendEncodingParameters || [
                          { ssrc: 1001 * (2 * c + 2) },
                        ]));
                      var G,
                        N = !1;
                      ('sendrecv' === C || 'sendonly' === C
                        ? ((N = !P.rtpReceiver),
                          (E =
                            P.rtpReceiver ||
                            new e.RTCRtpReceiver(P.dtlsTransport, l)),
                          N &&
                            ((M = E.track),
                            (S && '-' === S.stream) ||
                              (S
                                ? (u[S.stream] ||
                                    ((u[S.stream] = new e.MediaStream()),
                                    Object.defineProperty(u[S.stream], 'id', {
                                      get: function () {
                                        return S.stream;
                                      },
                                    })),
                                  Object.defineProperty(M, 'id', {
                                    get: function () {
                                      return S.track;
                                    },
                                  }),
                                  (G = u[S.stream]))
                                : (u.default ||
                                    (u.default = new e.MediaStream()),
                                  (G = u.default))),
                            G &&
                              (r(M, G), P.associatedRemoteMediaStreams.push(G)),
                            f.push([M, E, G])))
                        : P.rtpReceiver &&
                          P.rtpReceiver.track &&
                          (P.associatedRemoteMediaStreams.forEach(function (t) {
                            var r = t.getTracks().find(function (e) {
                              return e.id === P.rtpReceiver.track.id;
                            });
                            r &&
                              (function (t, r) {
                                (r.removeTrack(t),
                                  r.dispatchEvent(
                                    new e.MediaStreamTrackEvent('removetrack', {
                                      track: t,
                                    })
                                  ));
                              })(r, t);
                          }),
                          (P.associatedRemoteMediaStreams = [])),
                        (P.localCapabilities = x),
                        (P.remoteCapabilities = I),
                        (P.rtpReceiver = E),
                        (P.rtcpParameters = j),
                        (P.sendEncodingParameters = _),
                        (P.recvEncodingParameters = k),
                        p._transceive(p.transceivers[c], !1, N));
                    }
                  }
                }),
                void 0 === p._dtlsRole &&
                  (p._dtlsRole = 'offer' === i.type ? 'active' : 'passive'),
                (p._remoteDescription = { type: i.type, sdp: i.sdp }),
                'offer' === i.type
                  ? p._updateSignalingState('have-remote-offer')
                  : p._updateSignalingState('stable'),
                Object.keys(u).forEach(function (t) {
                  var r = u[t];
                  if (r.getTracks().length) {
                    if (-1 === p.remoteStreams.indexOf(r)) {
                      p.remoteStreams.push(r);
                      var n = new Event('addstream');
                      ((n.stream = r),
                        e.setTimeout(function () {
                          p._dispatchEvent('addstream', n);
                        }));
                    }
                    f.forEach(function (e) {
                      var t = e[0],
                        n = e[1];
                      r.id === e[2].id && d(p, t, n, [r]);
                    });
                  }
                }),
                f.forEach(function (e) {
                  e[2] || d(p, e[0], e[1], []);
                }),
                e.setTimeout(function () {
                  p &&
                    p.transceivers &&
                    p.transceivers.forEach(function (e) {
                      e.iceTransport &&
                        'new' === e.iceTransport.state &&
                        e.iceTransport.getRemoteCandidates().length > 0 &&
                        e.iceTransport.addRemoteCandidate({});
                    });
                }, 4e3),
                Promise.resolve()
              );
            }),
            (p.prototype.close = function () {
              (this.transceivers.forEach(function (e) {
                (e.iceTransport && e.iceTransport.stop(),
                  e.dtlsTransport && e.dtlsTransport.stop(),
                  e.rtpSender && e.rtpSender.stop(),
                  e.rtpReceiver && e.rtpReceiver.stop());
              }),
                (this._isClosed = !0),
                this._updateSignalingState('closed'));
            }),
            (p.prototype._updateSignalingState = function (e) {
              this.signalingState = e;
              var t = new Event('signalingstatechange');
              this._dispatchEvent('signalingstatechange', t);
            }),
            (p.prototype._maybeFireNegotiationNeeded = function () {
              var t = this;
              'stable' === this.signalingState &&
                !0 !== this.needNegotiation &&
                ((this.needNegotiation = !0),
                e.setTimeout(function () {
                  if (t.needNegotiation) {
                    t.needNegotiation = !1;
                    var e = new Event('negotiationneeded');
                    t._dispatchEvent('negotiationneeded', e);
                  }
                }, 0));
            }),
            (p.prototype._updateIceConnectionState = function () {
              var e,
                t = {
                  new: 0,
                  closed: 0,
                  checking: 0,
                  connected: 0,
                  completed: 0,
                  disconnected: 0,
                  failed: 0,
                };
              if (
                (this.transceivers.forEach(function (e) {
                  e.iceTransport && !e.rejected && t[e.iceTransport.state]++;
                }),
                (e = 'new'),
                t.failed > 0
                  ? (e = 'failed')
                  : t.checking > 0
                    ? (e = 'checking')
                    : t.disconnected > 0
                      ? (e = 'disconnected')
                      : t.new > 0
                        ? (e = 'new')
                        : t.connected > 0
                          ? (e = 'connected')
                          : t.completed > 0 && (e = 'completed'),
                e !== this.iceConnectionState)
              ) {
                this.iceConnectionState = e;
                var r = new Event('iceconnectionstatechange');
                this._dispatchEvent('iceconnectionstatechange', r);
              }
            }),
            (p.prototype._updateConnectionState = function () {
              var e,
                t = {
                  new: 0,
                  closed: 0,
                  connecting: 0,
                  connected: 0,
                  completed: 0,
                  disconnected: 0,
                  failed: 0,
                };
              if (
                (this.transceivers.forEach(function (e) {
                  e.iceTransport &&
                    e.dtlsTransport &&
                    !e.rejected &&
                    (t[e.iceTransport.state]++, t[e.dtlsTransport.state]++);
                }),
                (t.connected += t.completed),
                (e = 'new'),
                t.failed > 0
                  ? (e = 'failed')
                  : t.connecting > 0
                    ? (e = 'connecting')
                    : t.disconnected > 0
                      ? (e = 'disconnected')
                      : t.new > 0
                        ? (e = 'new')
                        : t.connected > 0 && (e = 'connected'),
                e !== this.connectionState)
              ) {
                this.connectionState = e;
                var r = new Event('connectionstatechange');
                this._dispatchEvent('connectionstatechange', r);
              }
            }),
            (p.prototype.createOffer = function () {
              var r = this;
              if (r._isClosed)
                return Promise.reject(
                  c('InvalidStateError', 'Can not call createOffer after close')
                );
              var a = r.transceivers.filter(function (e) {
                  return 'audio' === e.kind;
                }).length,
                o = r.transceivers.filter(function (e) {
                  return 'video' === e.kind;
                }).length,
                s = arguments[0];
              if (s) {
                if (s.mandatory || s.optional)
                  throw new TypeError(
                    'Legacy mandatory/optional constraints not supported.'
                  );
                (void 0 !== s.offerToReceiveAudio &&
                  (a =
                    !0 === s.offerToReceiveAudio
                      ? 1
                      : !1 === s.offerToReceiveAudio
                        ? 0
                        : s.offerToReceiveAudio),
                  void 0 !== s.offerToReceiveVideo &&
                    (o =
                      !0 === s.offerToReceiveVideo
                        ? 1
                        : !1 === s.offerToReceiveVideo
                          ? 0
                          : s.offerToReceiveVideo));
              }
              for (
                r.transceivers.forEach(function (e) {
                  'audio' === e.kind
                    ? --a < 0 && (e.wantReceive = !1)
                    : 'video' === e.kind && --o < 0 && (e.wantReceive = !1);
                });
                a > 0 || o > 0;

              )
                (a > 0 && (r._createTransceiver('audio'), a--),
                  o > 0 && (r._createTransceiver('video'), o--));
              var d = n.writeSessionBoilerplate(
                r._sdpSessionId,
                r._sdpSessionVersion++
              );
              (r.transceivers.forEach(function (i, a) {
                var o = i.track,
                  s = i.kind,
                  c = i.mid || n.generateIdentifier();
                ((i.mid = c),
                  i.iceGatherer ||
                    (i.iceGatherer = r._createIceGatherer(a, r.usingBundle)));
                var d = e.RTCRtpSender.getCapabilities(s);
                (t < 15019 &&
                  (d.codecs = d.codecs.filter(function (e) {
                    return 'rtx' !== e.name;
                  })),
                  d.codecs.forEach(function (e) {
                    ('H264' === e.name &&
                      void 0 === e.parameters['level-asymmetry-allowed'] &&
                      (e.parameters['level-asymmetry-allowed'] = '1'),
                      i.remoteCapabilities &&
                        i.remoteCapabilities.codecs &&
                        i.remoteCapabilities.codecs.forEach(function (t) {
                          e.name.toLowerCase() === t.name.toLowerCase() &&
                            e.clockRate === t.clockRate &&
                            (e.preferredPayloadType = t.payloadType);
                        }));
                  }),
                  d.headerExtensions.forEach(function (e) {
                    (
                      (i.remoteCapabilities &&
                        i.remoteCapabilities.headerExtensions) ||
                      []
                    ).forEach(function (t) {
                      e.uri === t.uri && (e.id = t.id);
                    });
                  }));
                var p = i.sendEncodingParameters || [
                  { ssrc: 1001 * (2 * a + 1) },
                ];
                (o &&
                  t >= 15019 &&
                  'video' === s &&
                  !p[0].rtx &&
                  (p[0].rtx = { ssrc: p[0].ssrc + 1 }),
                  i.wantReceive &&
                    (i.rtpReceiver = new e.RTCRtpReceiver(i.dtlsTransport, s)),
                  (i.localCapabilities = d),
                  (i.sendEncodingParameters = p));
              }),
                'max-compat' !== r._config.bundlePolicy &&
                  (d +=
                    'a=group:BUNDLE ' +
                    r.transceivers
                      .map(function (e) {
                        return e.mid;
                      })
                      .join(' ') +
                    '\r\n'),
                (d += 'a=ice-options:trickle\r\n'),
                r.transceivers.forEach(function (e, t) {
                  ((d += i(
                    e,
                    e.localCapabilities,
                    'offer',
                    e.stream,
                    r._dtlsRole
                  )),
                    (d += 'a=rtcp-rsize\r\n'),
                    !e.iceGatherer ||
                      'new' === r.iceGatheringState ||
                      (0 !== t && r.usingBundle) ||
                      (e.iceGatherer.getLocalCandidates().forEach(function (e) {
                        ((e.component = 1),
                          (d += 'a=' + n.writeCandidate(e) + '\r\n'));
                      }),
                      'completed' === e.iceGatherer.state &&
                        (d += 'a=end-of-candidates\r\n')));
                }));
              var p = new e.RTCSessionDescription({ type: 'offer', sdp: d });
              return Promise.resolve(p);
            }),
            (p.prototype.createAnswer = function () {
              var r = this;
              if (r._isClosed)
                return Promise.reject(
                  c(
                    'InvalidStateError',
                    'Can not call createAnswer after close'
                  )
                );
              if (
                'have-remote-offer' !== r.signalingState &&
                'have-local-pranswer' !== r.signalingState
              )
                return Promise.reject(
                  c(
                    'InvalidStateError',
                    'Can not call createAnswer in signalingState ' +
                      r.signalingState
                  )
                );
              var o = n.writeSessionBoilerplate(
                r._sdpSessionId,
                r._sdpSessionVersion++
              );
              (r.usingBundle &&
                (o +=
                  'a=group:BUNDLE ' +
                  r.transceivers
                    .map(function (e) {
                      return e.mid;
                    })
                    .join(' ') +
                  '\r\n'),
                (o += 'a=ice-options:trickle\r\n'));
              var s = n.getMediaSections(r._remoteDescription.sdp).length;
              r.transceivers.forEach(function (e, n) {
                if (!(n + 1 > s)) {
                  if (e.rejected)
                    return (
                      'application' === e.kind
                        ? 'DTLS/SCTP' === e.protocol
                          ? (o += 'm=application 0 DTLS/SCTP 5000\r\n')
                          : (o +=
                              'm=application 0 ' +
                              e.protocol +
                              ' webrtc-datachannel\r\n')
                        : 'audio' === e.kind
                          ? (o +=
                              'm=audio 0 UDP/TLS/RTP/SAVPF 0\r\na=rtpmap:0 PCMU/8000\r\n')
                          : 'video' === e.kind &&
                            (o +=
                              'm=video 0 UDP/TLS/RTP/SAVPF 120\r\na=rtpmap:120 VP8/90000\r\n'),
                      void (o +=
                        'c=IN IP4 0.0.0.0\r\na=inactive\r\na=mid:' +
                        e.mid +
                        '\r\n')
                    );
                  var c;
                  e.stream &&
                    ('audio' === e.kind
                      ? (c = e.stream.getAudioTracks()[0])
                      : 'video' === e.kind &&
                        (c = e.stream.getVideoTracks()[0]),
                    c &&
                      t >= 15019 &&
                      'video' === e.kind &&
                      !e.sendEncodingParameters[0].rtx &&
                      (e.sendEncodingParameters[0].rtx = {
                        ssrc: e.sendEncodingParameters[0].ssrc + 1,
                      }));
                  var d = a(e.localCapabilities, e.remoteCapabilities);
                  (!d.codecs.filter(function (e) {
                    return 'rtx' === e.name.toLowerCase();
                  }).length &&
                    e.sendEncodingParameters[0].rtx &&
                    delete e.sendEncodingParameters[0].rtx,
                    (o += i(e, d, 'answer', e.stream, r._dtlsRole)),
                    e.rtcpParameters &&
                      e.rtcpParameters.reducedSize &&
                      (o += 'a=rtcp-rsize\r\n'));
                }
              });
              var d = new e.RTCSessionDescription({ type: 'answer', sdp: o });
              return Promise.resolve(d);
            }),
            (p.prototype.addIceCandidate = function (e) {
              var t,
                r = this;
              return e && void 0 === e.sdpMLineIndex && !e.sdpMid
                ? Promise.reject(
                    new TypeError('sdpMLineIndex or sdpMid required')
                  )
                : new Promise(function (i, a) {
                    if (!r._remoteDescription)
                      return a(
                        c(
                          'InvalidStateError',
                          'Can not add ICE candidate without a remote description'
                        )
                      );
                    if (e && '' !== e.candidate) {
                      var o = e.sdpMLineIndex;
                      if (e.sdpMid)
                        for (var d = 0; d < r.transceivers.length; d++)
                          if (r.transceivers[d].mid === e.sdpMid) {
                            o = d;
                            break;
                          }
                      var p = r.transceivers[o];
                      if (!p)
                        return a(
                          c('OperationError', 'Can not add ICE candidate')
                        );
                      if (p.rejected) return i();
                      var u =
                        Object.keys(e.candidate).length > 0
                          ? n.parseCandidate(e.candidate)
                          : {};
                      if (
                        'tcp' === u.protocol &&
                        (0 === u.port || 9 === u.port)
                      )
                        return i();
                      if (u.component && 1 !== u.component) return i();
                      if (
                        (0 === o ||
                          (o > 0 &&
                            p.iceTransport !==
                              r.transceivers[0].iceTransport)) &&
                        !s(p.iceTransport, u)
                      )
                        return a(
                          c('OperationError', 'Can not add ICE candidate')
                        );
                      var f = e.candidate.trim();
                      (0 === f.indexOf('a=') && (f = f.substr(2)),
                        ((t = n.getMediaSections(r._remoteDescription.sdp))[
                          o
                        ] +=
                          'a=' + (u.type ? f : 'end-of-candidates') + '\r\n'),
                        (r._remoteDescription.sdp =
                          n.getDescription(r._remoteDescription.sdp) +
                          t.join('')));
                    } else
                      for (
                        var l = 0;
                        l < r.transceivers.length &&
                        (r.transceivers[l].rejected ||
                          (r.transceivers[l].iceTransport.addRemoteCandidate(
                            {}
                          ),
                          ((t = n.getMediaSections(r._remoteDescription.sdp))[
                            l
                          ] += 'a=end-of-candidates\r\n'),
                          (r._remoteDescription.sdp =
                            n.getDescription(r._remoteDescription.sdp) +
                            t.join('')),
                          !r.usingBundle));
                        l++
                      );
                    i();
                  });
            }),
            (p.prototype.getStats = function (t) {
              if (t && t instanceof e.MediaStreamTrack) {
                var r = null;
                if (
                  (this.transceivers.forEach(function (e) {
                    e.rtpSender && e.rtpSender.track === t
                      ? (r = e.rtpSender)
                      : e.rtpReceiver &&
                        e.rtpReceiver.track === t &&
                        (r = e.rtpReceiver);
                  }),
                  !r)
                )
                  throw c('InvalidAccessError', 'Invalid selector.');
                return r.getStats();
              }
              var n = [];
              return (
                this.transceivers.forEach(function (e) {
                  [
                    'rtpSender',
                    'rtpReceiver',
                    'iceGatherer',
                    'iceTransport',
                    'dtlsTransport',
                  ].forEach(function (t) {
                    e[t] && n.push(e[t].getStats());
                  });
                }),
                Promise.all(n).then(function (e) {
                  var t = new Map();
                  return (
                    e.forEach(function (e) {
                      e.forEach(function (e) {
                        t.set(e.id, e);
                      });
                    }),
                    t
                  );
                })
              );
            }),
            [
              'RTCRtpSender',
              'RTCRtpReceiver',
              'RTCIceGatherer',
              'RTCIceTransport',
              'RTCDtlsTransport',
            ].forEach(function (t) {
              var r = e[t];
              if (r && r.prototype && r.prototype.getStats) {
                var n = r.prototype.getStats;
                r.prototype.getStats = function () {
                  return n.apply(this).then(function (e) {
                    var t = new Map();
                    return (
                      Object.keys(e).forEach(function (r) {
                        var n;
                        ((e[r].type =
                          {
                            inboundrtp: 'inbound-rtp',
                            outboundrtp: 'outbound-rtp',
                            candidatepair: 'candidate-pair',
                            localcandidate: 'local-candidate',
                            remotecandidate: 'remote-candidate',
                          }[(n = e[r]).type] || n.type),
                          t.set(r, e[r]));
                      }),
                      t
                    );
                  });
                };
              }
            }));
          var u = ['createOffer', 'createAnswer'];
          return (
            u.forEach(function (e) {
              var t = p.prototype[e];
              p.prototype[e] = function () {
                var e = arguments;
                return 'function' == typeof e[0] || 'function' == typeof e[1]
                  ? t.apply(this, [arguments[2]]).then(
                      function (t) {
                        'function' == typeof e[0] && e[0].apply(null, [t]);
                      },
                      function (t) {
                        'function' == typeof e[1] && e[1].apply(null, [t]);
                      }
                    )
                  : t.apply(this, arguments);
              };
            }),
            (u = [
              'setLocalDescription',
              'setRemoteDescription',
              'addIceCandidate',
            ]).forEach(function (e) {
              var t = p.prototype[e];
              p.prototype[e] = function () {
                var e = arguments;
                return 'function' == typeof e[1] || 'function' == typeof e[2]
                  ? t.apply(this, arguments).then(
                      function () {
                        'function' == typeof e[1] && e[1].apply(null);
                      },
                      function (t) {
                        'function' == typeof e[2] && e[2].apply(null, [t]);
                      }
                    )
                  : t.apply(this, arguments);
              };
            }),
            ['getStats'].forEach(function (e) {
              var t = p.prototype[e];
              p.prototype[e] = function () {
                var e = arguments;
                return 'function' == typeof e[1]
                  ? t.apply(this, arguments).then(function () {
                      'function' == typeof e[1] && e[1].apply(null);
                    })
                  : t.apply(this, arguments);
              };
            }),
            p
          );
        };
      },
      { sdp: 17 },
    ],
    17: [
      function (t, r, n) {
        var i = {
          generateIdentifier: function () {
            return Math.random().toString(36).substr(2, 10);
          },
        };
        ((i.localCName = i.generateIdentifier()),
          (i.splitLines = function (e) {
            return e
              .trim()
              .split('\n')
              .map(function (e) {
                return e.trim();
              });
          }),
          (i.splitSections = function (e) {
            return e.split('\nm=').map(function (e, t) {
              return (t > 0 ? 'm=' + e : e).trim() + '\r\n';
            });
          }),
          (i.getDescription = function (e) {
            var t = i.splitSections(e);
            return t && t[0];
          }),
          (i.getMediaSections = function (e) {
            var t = i.splitSections(e);
            return (t.shift(), t);
          }),
          (i.matchPrefix = function (e, t) {
            return i.splitLines(e).filter(function (e) {
              return 0 === e.indexOf(t);
            });
          }),
          (i.parseCandidate = function (e) {
            for (
              var t,
                r = {
                  foundation: (t =
                    0 === e.indexOf('a=candidate:')
                      ? e.substring(12).split(' ')
                      : e.substring(10).split(' '))[0],
                  component: parseInt(t[1], 10),
                  protocol: t[2].toLowerCase(),
                  priority: parseInt(t[3], 10),
                  ip: t[4],
                  address: t[4],
                  port: parseInt(t[5], 10),
                  type: t[7],
                },
                n = 8;
              n < t.length;
              n += 2
            )
              switch (t[n]) {
                case 'raddr':
                  r.relatedAddress = t[n + 1];
                  break;
                case 'rport':
                  r.relatedPort = parseInt(t[n + 1], 10);
                  break;
                case 'tcptype':
                  r.tcpType = t[n + 1];
                  break;
                case 'ufrag':
                  ((r.ufrag = t[n + 1]), (r.usernameFragment = t[n + 1]));
                  break;
                default:
                  r[t[n]] = t[n + 1];
              }
            return r;
          }),
          (i.writeCandidate = function (e) {
            var t = [];
            (t.push(e.foundation),
              t.push(e.component),
              t.push(e.protocol.toUpperCase()),
              t.push(e.priority),
              t.push(e.address || e.ip),
              t.push(e.port));
            var r = e.type;
            return (
              t.push('typ'),
              t.push(r),
              'host' !== r &&
                e.relatedAddress &&
                e.relatedPort &&
                (t.push('raddr'),
                t.push(e.relatedAddress),
                t.push('rport'),
                t.push(e.relatedPort)),
              e.tcpType &&
                'tcp' === e.protocol.toLowerCase() &&
                (t.push('tcptype'), t.push(e.tcpType)),
              (e.usernameFragment || e.ufrag) &&
                (t.push('ufrag'), t.push(e.usernameFragment || e.ufrag)),
              'candidate:' + t.join(' ')
            );
          }),
          (i.parseIceOptions = function (e) {
            return e.substr(14).split(' ');
          }),
          (i.parseRtpMap = function (e) {
            var t = e.substr(9).split(' '),
              r = { payloadType: parseInt(t.shift(), 10) };
            return (
              (t = t[0].split('/')),
              (r.name = t[0]),
              (r.clockRate = parseInt(t[1], 10)),
              (r.channels = 3 === t.length ? parseInt(t[2], 10) : 1),
              (r.numChannels = r.channels),
              r
            );
          }),
          (i.writeRtpMap = function (e) {
            var t = e.payloadType;
            void 0 !== e.preferredPayloadType && (t = e.preferredPayloadType);
            var r = e.channels || e.numChannels || 1;
            return (
              'a=rtpmap:' +
              t +
              ' ' +
              e.name +
              '/' +
              e.clockRate +
              (1 !== r ? '/' + r : '') +
              '\r\n'
            );
          }),
          (i.parseExtmap = function (e) {
            var t = e.substr(9).split(' ');
            return {
              id: parseInt(t[0], 10),
              direction:
                t[0].indexOf('/') > 0 ? t[0].split('/')[1] : 'sendrecv',
              uri: t[1],
            };
          }),
          (i.writeExtmap = function (e) {
            return (
              'a=extmap:' +
              (e.id || e.preferredId) +
              (e.direction && 'sendrecv' !== e.direction
                ? '/' + e.direction
                : '') +
              ' ' +
              e.uri +
              '\r\n'
            );
          }),
          (i.parseFmtp = function (e) {
            for (
              var t, r = {}, n = e.substr(e.indexOf(' ') + 1).split(';'), i = 0;
              i < n.length;
              i++
            )
              r[(t = n[i].trim().split('='))[0].trim()] = t[1];
            return r;
          }),
          (i.writeFmtp = function (e) {
            var t = '',
              r = e.payloadType;
            if (
              (void 0 !== e.preferredPayloadType &&
                (r = e.preferredPayloadType),
              e.parameters && Object.keys(e.parameters).length)
            ) {
              var n = [];
              (Object.keys(e.parameters).forEach(function (t) {
                e.parameters[t] ? n.push(t + '=' + e.parameters[t]) : n.push(t);
              }),
                (t += 'a=fmtp:' + r + ' ' + n.join(';') + '\r\n'));
            }
            return t;
          }),
          (i.parseRtcpFb = function (e) {
            var t = e.substr(e.indexOf(' ') + 1).split(' ');
            return { type: t.shift(), parameter: t.join(' ') };
          }),
          (i.writeRtcpFb = function (e) {
            var t = '',
              r = e.payloadType;
            return (
              void 0 !== e.preferredPayloadType && (r = e.preferredPayloadType),
              e.rtcpFeedback &&
                e.rtcpFeedback.length &&
                e.rtcpFeedback.forEach(function (e) {
                  t +=
                    'a=rtcp-fb:' +
                    r +
                    ' ' +
                    e.type +
                    (e.parameter && e.parameter.length
                      ? ' ' + e.parameter
                      : '') +
                    '\r\n';
                }),
              t
            );
          }),
          (i.parseSsrcMedia = function (e) {
            var t = e.indexOf(' '),
              r = { ssrc: parseInt(e.substr(7, t - 7), 10) },
              n = e.indexOf(':', t);
            return (
              n > -1
                ? ((r.attribute = e.substr(t + 1, n - t - 1)),
                  (r.value = e.substr(n + 1)))
                : (r.attribute = e.substr(t + 1)),
              r
            );
          }),
          (i.parseSsrcGroup = function (e) {
            var t = e.substr(13).split(' ');
            return {
              semantics: t.shift(),
              ssrcs: t.map(function (e) {
                return parseInt(e, 10);
              }),
            };
          }),
          (i.getMid = function (e) {
            var t = i.matchPrefix(e, 'a=mid:')[0];
            if (t) return t.substr(6);
          }),
          (i.parseFingerprint = function (e) {
            var t = e.substr(14).split(' ');
            return { algorithm: t[0].toLowerCase(), value: t[1] };
          }),
          (i.getDtlsParameters = function (e, t) {
            return {
              role: 'auto',
              fingerprints: i
                .matchPrefix(e + t, 'a=fingerprint:')
                .map(i.parseFingerprint),
            };
          }),
          (i.writeDtlsParameters = function (e, t) {
            var r = 'a=setup:' + t + '\r\n';
            return (
              e.fingerprints.forEach(function (e) {
                r += 'a=fingerprint:' + e.algorithm + ' ' + e.value + '\r\n';
              }),
              r
            );
          }),
          (i.parseCryptoLine = function (e) {
            var t = e.substr(9).split(' ');
            return {
              tag: parseInt(t[0], 10),
              cryptoSuite: t[1],
              keyParams: t[2],
              sessionParams: t.slice(3),
            };
          }),
          (i.writeCryptoLine = function (t) {
            return (
              'a=crypto:' +
              t.tag +
              ' ' +
              t.cryptoSuite +
              ' ' +
              ('object' == e(t.keyParams)
                ? i.writeCryptoKeyParams(t.keyParams)
                : t.keyParams) +
              (t.sessionParams ? ' ' + t.sessionParams.join(' ') : '') +
              '\r\n'
            );
          }),
          (i.parseCryptoKeyParams = function (e) {
            if (0 !== e.indexOf('inline:')) return null;
            var t = e.substr(7).split('|');
            return {
              keyMethod: 'inline',
              keySalt: t[0],
              lifeTime: t[1],
              mkiValue: t[2] ? t[2].split(':')[0] : void 0,
              mkiLength: t[2] ? t[2].split(':')[1] : void 0,
            };
          }),
          (i.writeCryptoKeyParams = function (e) {
            return (
              e.keyMethod +
              ':' +
              e.keySalt +
              (e.lifeTime ? '|' + e.lifeTime : '') +
              (e.mkiValue && e.mkiLength
                ? '|' + e.mkiValue + ':' + e.mkiLength
                : '')
            );
          }),
          (i.getCryptoParameters = function (e, t) {
            return i.matchPrefix(e + t, 'a=crypto:').map(i.parseCryptoLine);
          }),
          (i.getIceParameters = function (e, t) {
            var r = i.matchPrefix(e + t, 'a=ice-ufrag:')[0],
              n = i.matchPrefix(e + t, 'a=ice-pwd:')[0];
            return r && n
              ? { usernameFragment: r.substr(12), password: n.substr(10) }
              : null;
          }),
          (i.writeIceParameters = function (e) {
            return (
              'a=ice-ufrag:' +
              e.usernameFragment +
              '\r\na=ice-pwd:' +
              e.password +
              '\r\n'
            );
          }),
          (i.parseRtpParameters = function (e) {
            for (
              var t = {
                  codecs: [],
                  headerExtensions: [],
                  fecMechanisms: [],
                  rtcp: [],
                },
                r = i.splitLines(e)[0].split(' '),
                n = 3;
              n < r.length;
              n++
            ) {
              var a = r[n],
                o = i.matchPrefix(e, 'a=rtpmap:' + a + ' ')[0];
              if (o) {
                var s = i.parseRtpMap(o),
                  c = i.matchPrefix(e, 'a=fmtp:' + a + ' ');
                switch (
                  ((s.parameters = c.length ? i.parseFmtp(c[0]) : {}),
                  (s.rtcpFeedback = i
                    .matchPrefix(e, 'a=rtcp-fb:' + a + ' ')
                    .map(i.parseRtcpFb)),
                  t.codecs.push(s),
                  s.name.toUpperCase())
                ) {
                  case 'RED':
                  case 'ULPFEC':
                    t.fecMechanisms.push(s.name.toUpperCase());
                }
              }
            }
            return (
              i.matchPrefix(e, 'a=extmap:').forEach(function (e) {
                t.headerExtensions.push(i.parseExtmap(e));
              }),
              t
            );
          }),
          (i.writeRtpDescription = function (e, t) {
            var r = '';
            ((r += 'm=' + e + ' '),
              (r += t.codecs.length > 0 ? '9' : '0'),
              (r += ' UDP/TLS/RTP/SAVPF '),
              (r +=
                t.codecs
                  .map(function (e) {
                    return void 0 !== e.preferredPayloadType
                      ? e.preferredPayloadType
                      : e.payloadType;
                  })
                  .join(' ') + '\r\n'),
              (r += 'c=IN IP4 0.0.0.0\r\n'),
              (r += 'a=rtcp:9 IN IP4 0.0.0.0\r\n'),
              t.codecs.forEach(function (e) {
                ((r += i.writeRtpMap(e)),
                  (r += i.writeFmtp(e)),
                  (r += i.writeRtcpFb(e)));
              }));
            var n = 0;
            return (
              t.codecs.forEach(function (e) {
                e.maxptime > n && (n = e.maxptime);
              }),
              n > 0 && (r += 'a=maxptime:' + n + '\r\n'),
              (r += 'a=rtcp-mux\r\n'),
              t.headerExtensions &&
                t.headerExtensions.forEach(function (e) {
                  r += i.writeExtmap(e);
                }),
              r
            );
          }),
          (i.parseRtpEncodingParameters = function (e) {
            var t,
              r = [],
              n = i.parseRtpParameters(e),
              a = -1 !== n.fecMechanisms.indexOf('RED'),
              o = -1 !== n.fecMechanisms.indexOf('ULPFEC'),
              s = i
                .matchPrefix(e, 'a=ssrc:')
                .map(function (e) {
                  return i.parseSsrcMedia(e);
                })
                .filter(function (e) {
                  return 'cname' === e.attribute;
                }),
              c = s.length > 0 && s[0].ssrc,
              d = i.matchPrefix(e, 'a=ssrc-group:FID').map(function (e) {
                return e
                  .substr(17)
                  .split(' ')
                  .map(function (e) {
                    return parseInt(e, 10);
                  });
              });
            (d.length > 0 && d[0].length > 1 && d[0][0] === c && (t = d[0][1]),
              n.codecs.forEach(function (e) {
                if ('RTX' === e.name.toUpperCase() && e.parameters.apt) {
                  var n = {
                    ssrc: c,
                    codecPayloadType: parseInt(e.parameters.apt, 10),
                  };
                  (c && t && (n.rtx = { ssrc: t }),
                    r.push(n),
                    a &&
                      (((n = JSON.parse(JSON.stringify(n))).fec = {
                        ssrc: c,
                        mechanism: o ? 'red+ulpfec' : 'red',
                      }),
                      r.push(n)));
                }
              }),
              0 === r.length && c && r.push({ ssrc: c }));
            var p = i.matchPrefix(e, 'b=');
            return (
              p.length &&
                ((p =
                  0 === p[0].indexOf('b=TIAS:')
                    ? parseInt(p[0].substr(7), 10)
                    : 0 === p[0].indexOf('b=AS:')
                      ? 1e3 * parseInt(p[0].substr(5), 10) * 0.95 - 16e3
                      : void 0),
                r.forEach(function (e) {
                  e.maxBitrate = p;
                })),
              r
            );
          }),
          (i.parseRtcpParameters = function (e) {
            var t = {},
              r = i
                .matchPrefix(e, 'a=ssrc:')
                .map(function (e) {
                  return i.parseSsrcMedia(e);
                })
                .filter(function (e) {
                  return 'cname' === e.attribute;
                })[0];
            r && ((t.cname = r.value), (t.ssrc = r.ssrc));
            var n = i.matchPrefix(e, 'a=rtcp-rsize');
            ((t.reducedSize = n.length > 0), (t.compound = 0 === n.length));
            var a = i.matchPrefix(e, 'a=rtcp-mux');
            return ((t.mux = a.length > 0), t);
          }),
          (i.parseMsid = function (e) {
            var t,
              r = i.matchPrefix(e, 'a=msid:');
            if (1 === r.length)
              return {
                stream: (t = r[0].substr(7).split(' '))[0],
                track: t[1],
              };
            var n = i
              .matchPrefix(e, 'a=ssrc:')
              .map(function (e) {
                return i.parseSsrcMedia(e);
              })
              .filter(function (e) {
                return 'msid' === e.attribute;
              });
            return n.length > 0
              ? { stream: (t = n[0].value.split(' '))[0], track: t[1] }
              : void 0;
          }),
          (i.parseSctpDescription = function (e) {
            var t,
              r = i.parseMLine(e),
              n = i.matchPrefix(e, 'a=max-message-size:');
            (n.length > 0 && (t = parseInt(n[0].substr(19), 10)),
              isNaN(t) && (t = 65536));
            var a = i.matchPrefix(e, 'a=sctp-port:');
            if (a.length > 0)
              return {
                port: parseInt(a[0].substr(12), 10),
                protocol: r.fmt,
                maxMessageSize: t,
              };
            if (i.matchPrefix(e, 'a=sctpmap:').length > 0) {
              var o = i.matchPrefix(e, 'a=sctpmap:')[0].substr(10).split(' ');
              return {
                port: parseInt(o[0], 10),
                protocol: o[1],
                maxMessageSize: t,
              };
            }
          }),
          (i.writeSctpDescription = function (e, t) {
            var r = [];
            return (
              (r =
                'DTLS/SCTP' !== e.protocol
                  ? [
                      'm=' +
                        e.kind +
                        ' 9 ' +
                        e.protocol +
                        ' ' +
                        t.protocol +
                        '\r\n',
                      'c=IN IP4 0.0.0.0\r\n',
                      'a=sctp-port:' + t.port + '\r\n',
                    ]
                  : [
                      'm=' +
                        e.kind +
                        ' 9 ' +
                        e.protocol +
                        ' ' +
                        t.port +
                        '\r\n',
                      'c=IN IP4 0.0.0.0\r\n',
                      'a=sctpmap:' + t.port + ' ' + t.protocol + ' 65535\r\n',
                    ]),
              void 0 !== t.maxMessageSize &&
                r.push('a=max-message-size:' + t.maxMessageSize + '\r\n'),
              r.join('')
            );
          }),
          (i.generateSessionId = function () {
            return Math.random().toString().substr(2, 21);
          }),
          (i.writeSessionBoilerplate = function (e, t, r) {
            var n = void 0 !== t ? t : 2;
            return (
              'v=0\r\no=' +
              (r || 'thisisadapterortc') +
              ' ' +
              (e || i.generateSessionId()) +
              ' ' +
              n +
              ' IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n'
            );
          }),
          (i.writeMediaSection = function (e, t, r, n) {
            var a = i.writeRtpDescription(e.kind, t);
            if (
              ((a += i.writeIceParameters(e.iceGatherer.getLocalParameters())),
              (a += i.writeDtlsParameters(
                e.dtlsTransport.getLocalParameters(),
                'offer' === r ? 'actpass' : 'active'
              )),
              (a += 'a=mid:' + e.mid + '\r\n'),
              e.direction
                ? (a += 'a=' + e.direction + '\r\n')
                : e.rtpSender && e.rtpReceiver
                  ? (a += 'a=sendrecv\r\n')
                  : e.rtpSender
                    ? (a += 'a=sendonly\r\n')
                    : e.rtpReceiver
                      ? (a += 'a=recvonly\r\n')
                      : (a += 'a=inactive\r\n'),
              e.rtpSender)
            ) {
              var o = 'msid:' + n.id + ' ' + e.rtpSender.track.id + '\r\n';
              ((a += 'a=' + o),
                (a += 'a=ssrc:' + e.sendEncodingParameters[0].ssrc + ' ' + o),
                e.sendEncodingParameters[0].rtx &&
                  ((a +=
                    'a=ssrc:' + e.sendEncodingParameters[0].rtx.ssrc + ' ' + o),
                  (a +=
                    'a=ssrc-group:FID ' +
                    e.sendEncodingParameters[0].ssrc +
                    ' ' +
                    e.sendEncodingParameters[0].rtx.ssrc +
                    '\r\n')));
            }
            return (
              (a +=
                'a=ssrc:' +
                e.sendEncodingParameters[0].ssrc +
                ' cname:' +
                i.localCName +
                '\r\n'),
              e.rtpSender &&
                e.sendEncodingParameters[0].rtx &&
                (a +=
                  'a=ssrc:' +
                  e.sendEncodingParameters[0].rtx.ssrc +
                  ' cname:' +
                  i.localCName +
                  '\r\n'),
              a
            );
          }),
          (i.getDirection = function (e, t) {
            for (var r = i.splitLines(e), n = 0; n < r.length; n++)
              switch (r[n]) {
                case 'a=sendrecv':
                case 'a=sendonly':
                case 'a=recvonly':
                case 'a=inactive':
                  return r[n].substr(2);
              }
            return t ? i.getDirection(t) : 'sendrecv';
          }),
          (i.getKind = function (e) {
            return i.splitLines(e)[0].split(' ')[0].substr(2);
          }),
          (i.isRejected = function (e) {
            return '0' === e.split(' ', 2)[1];
          }),
          (i.parseMLine = function (e) {
            var t = i.splitLines(e)[0].substr(2).split(' ');
            return {
              kind: t[0],
              port: parseInt(t[1], 10),
              protocol: t[2],
              fmt: t.slice(3).join(' '),
            };
          }),
          (i.parseOLine = function (e) {
            var t = i.matchPrefix(e, 'o=')[0].substr(2).split(' ');
            return {
              username: t[0],
              sessionId: t[1],
              sessionVersion: parseInt(t[2], 10),
              netType: t[3],
              addressType: t[4],
              address: t[5],
            };
          }),
          (i.isValidSDP = function (e) {
            if ('string' != typeof e || 0 === e.length) return !1;
            for (var t = i.splitLines(e), r = 0; r < t.length; r++)
              if (t[r].length < 2 || '=' !== t[r].charAt(1)) return !1;
            return !0;
          }),
          'object' == e(r) && (r.exports = i));
      },
      {},
    ],
  },
  {},
  [1]
)(1);
var T,
  P,
  R,
  b,
  w,
  E,
  _,
  k,
  x,
  M,
  D,
  O,
  I,
  j,
  L,
  A,
  G,
  N,
  U = (function () {
    function e(t) {
      var r = this;
      (o(this, e),
        C.set(this, void 0),
        S.set(this, void 0),
        s(this, C, new RTCPeerConnection(), 'f'),
        s(this, S, t, 'f'),
        (a(this, C, 'f').onaddstream = function (e) {
          a(r, S, 'f') &&
            Promise.resolve().then(function () {
              var t;
              null === (t = a(r, S, 'f')) || void 0 === t || t.call(r, e);
            });
        }),
        (a(this, C, 'f').ontrack = function (e) {
          a(r, S, 'f') &&
            Promise.resolve().then(function () {
              var t;
              null === (t = a(r, S, 'f')) || void 0 === t || t.call(r, e);
            });
        }));
    }
    return (
      r(
        e,
        [
          {
            key: 'play',
            value: function (e, t) {
              return n(
                this,
                void 0,
                void 0,
                i().mark(function r() {
                  var n, o, s, c, d, p, u;
                  return i().wrap(
                    function (r) {
                      for (;;)
                        switch ((r.prev = r.next)) {
                          case 0:
                            return (
                              (r.next = 2),
                              null === (n = a(this, C, 'f')) || void 0 === n
                                ? void 0
                                : n.createOffer({
                                    offerToReceiveAudio: !0,
                                    offerToReceiveVideo: !0,
                                  })
                            );
                          case 2:
                            return (
                              (c = r.sent),
                              (r.next = 5),
                              null === (o = a(this, C, 'f')) || void 0 === o
                                ? void 0
                                : o.setLocalDescription(c)
                            );
                          case 5:
                            return (
                              (d = {
                                api: e,
                                streamurl: t,
                                clientip: null,
                                sdp: null == c ? void 0 : c.sdp,
                              }),
                              (r.next = 8),
                              fetch(e, {
                                method: 'post',
                                body: JSON.stringify(d),
                                headers: { 'Content-Type': 'application/json' },
                              }).then(function (e) {
                                return e.json();
                              })
                            );
                          case 8:
                            return (
                              (p = r.sent),
                              (u = p.sdp),
                              (p.sdp = u.replace(
                                'a=rtpmap:102 H264/90000',
                                'a=rtpmap:102 H264/90000\na=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f'
                              )),
                              (r.next = 13),
                              null === (s = a(this, C, 'f')) || void 0 === s
                                ? void 0
                                : s.setRemoteDescription(
                                    new RTCSessionDescription({
                                      type: 'answer',
                                      sdp: p.sdp,
                                    })
                                  )
                            );
                          case 13:
                            return r.abrupt('return', p);
                          case 14:
                          case 'end':
                            return r.stop();
                        }
                    },
                    r,
                    this
                  );
                })
              );
            },
          },
          {
            key: 'close',
            value: function () {
              var e;
              null === (e = a(this, C, 'f')) || void 0 === e || e.close();
            },
          },
        ],
        [
          {
            key: 'parseRtcUrl',
            value: function (e) {
              var t = (function (e) {
                  var t = document.createElement('a');
                  t.href = e
                    .replace('rtmp://', 'http://')
                    .replace('webrtc://', 'http://')
                    .replace('rtc://', 'http://');
                  var r = t.hostname,
                    n = t.pathname.substr(1, t.pathname.lastIndexOf('/') - 1),
                    i = t.pathname.substr(t.pathname.lastIndexOf('/') + 1);
                  if (
                    (n = n.replace('...vhost...', '?vhost=')).indexOf('?') >= 0
                  ) {
                    var a = n.substr(n.indexOf('?'));
                    ((n = n.substr(0, n.indexOf('?'))),
                      a.indexOf('vhost=') > 0 &&
                        (r = a.substr(a.indexOf('vhost=') + 6)).indexOf('&') >
                          0 &&
                        (r = r.substr(0, r.indexOf('&'))));
                  }
                  t.hostname === r &&
                    /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.test(t.hostname) &&
                    (r = '__defaultVhost__');
                  var o = 'rtmp';
                  e.indexOf('://') > 0 && (o = e.substr(0, e.indexOf('://')));
                  var s = t.port;
                  s ||
                    ('http' === o
                      ? (s = 80)
                      : 'https' === o
                        ? (s = 443)
                        : 'rtmp' === o && (s = 1935));
                  var c = {
                    url: e,
                    schema: o,
                    server: t.hostname,
                    port: s,
                    vhost: r,
                    app: n,
                    stream: i,
                  };
                  return (
                    (function (e, t) {
                      if (((t.user_query = {}), 0 !== e.length)) {
                        e.indexOf('?') >= 0 && (e = e.split('?')[1]);
                        for (var r = e.split('&'), n = 0; n < r.length; n++) {
                          var i = r[n].split('=');
                          ((t[i[0]] = i[1]), (t.user_query[i[0]] = i[1]));
                        }
                        t.domain && (t.vhost = t.domain);
                      }
                    })(t.search, c),
                    c.port ||
                      ('webrtc' !== o && 'rtc' !== o) ||
                      ('https' === c.user_query.schema ||
                      0 === window.location.href.indexOf('https://')
                        ? (c.port = 443)
                        : (c.port = 1985)),
                    c
                  );
                })(e),
                r = t.user_query.schema,
                n = r ? r + ':' : window.location.protocol,
                i = t.port || ('https:' === n ? 443 : 1985),
                a = t.user_query.play || '/rtc/v1/play/',
                o = ''
                  .concat(a)
                  .concat(a.lastIndexOf('/') !== a.length - 1 ? '/' : ''),
                s = ''
                  .concat(n, '//')
                  .concat(t.server, ':')
                  .concat(i)
                  .concat(o);
              for (var c in t.user_query)
                'api' !== c &&
                  'play' !== c &&
                  (s += '&' + c + '=' + t.user_query[c]);
              return {
                apiUrl: (s = s.replace(o + '&', o + '?')),
                streamUrl: t.url,
                schema: n,
                urlObject: t,
                port: i,
              };
            },
          },
        ]
      ),
      e
    );
  })();
((C = new WeakMap()), (S = new WeakMap()));
var F = (function (e) {
  function t() {
    var e;
    return (
      o(this, t),
      (e = d(this, t)),
      T.set(p(e), 1),
      P.set(p(e), !1),
      R.set(p(e), !1),
      b.set(p(e), void 0),
      w.set(p(e), void 0),
      E.set(p(e), void 0),
      _.set(p(e), void 0),
      k.set(p(e), !1),
      x.set(
        p(e),
        window.navigator.userAgent.match(/CPU.+Mac OS X/) &&
          window.navigator.userAgent.match(/(iPhone)|(iPad)/)
      ),
      M.set(p(e), !0),
      D.set(p(e), function () {
        (a(p(e), k, 'f') || e.emit(u.play),
          s(p(e), k, !0, 'f'),
          a(p(e), x, 'f') && a(p(e), I, 'f').call(p(e), !1),
          e.emit(u.playing));
      }),
      O.set(p(e), function () {
        (a(p(e), I, 'f').call(p(e), !1), e.emit(u.error));
      }),
      I.set(p(e), function (t) {
        t
          ? (s(p(e), M, !0, 'f'), e.emit(u.waiting))
          : (s(p(e), M, !1, 'f'), clearTimeout(a(p(e), _, 'f')));
      }),
      j.set(p(e), function () {
        s(
          p(e),
          _,
          setTimeout(function () {
            a(p(e), I, 'f').call(p(e), !0);
          }, 300),
          'f'
        );
      }),
      L.set(p(e), function () {
        (a(p(e), I, 'f').call(p(e), !1),
          a(p(e), x, 'f') ||
            (a(p(e), E, 'f') &&
              a(p(e), M, 'f') &&
              (a(p(e), I, 'f').call(p(e), !1), a(p(e), D, 'f').call(p(e)))));
      }),
      A.set(p(e), function () {
        return n(
          p(e),
          void 0,
          void 0,
          i().mark(function e() {
            var t, r, n, o, s, c, d, p, u, h, v, y, g, C;
            return i().wrap(
              function (e) {
                for (;;)
                  switch ((e.prev = e.next)) {
                    case 0:
                      return (
                        (t = a(this, b, 'f')),
                        (r = t.sid),
                        (n = t.streamUrl),
                        (o = U.parseRtcUrl(n || '')),
                        (s = f()),
                        (c = s.promise),
                        (d = s.controller),
                        (p = f()),
                        (u = p.promise),
                        (h = p.controller),
                        (v = new U(function (e) {
                          u.then(function (t) {
                            var r, n;
                            e.stream || e.streams[0]
                              ? null === (n = d.resolve) ||
                                void 0 === n ||
                                n.call(d, {
                                  stream: e.stream || e.streams[0],
                                  sessionid: t,
                                })
                              : null === (r = d.reject) ||
                                void 0 === r ||
                                r.call(d, new Error('no stream available'));
                          });
                        })),
                        v
                          .play(o.apiUrl, o.streamUrl)
                          .then(function (e) {
                            var t;
                            (l.record(m.info, '[session]', e.sessionid),
                              null === (t = h.resolve) ||
                                void 0 === t ||
                                t.call(h, e.sessionid));
                          })
                          .catch(function (e) {
                            var t;
                            (l.record(
                              m.error,
                              '[error]',
                              null == e ? void 0 : e.message
                            ),
                              v.close(),
                              null === (t = h.reject) ||
                                void 0 === t ||
                                t.call(h, e));
                          }),
                        (e.next = 8),
                        c
                      );
                    case 8:
                      return (
                        (y = e.sent),
                        (g = y.stream),
                        (C = y.sessionid),
                        e.abrupt('return', {
                          stream: g,
                          sessionid: C,
                          sid: r || '',
                        })
                      );
                    case 12:
                    case 'end':
                      return e.stop();
                  }
              },
              e,
              this
            );
          })
        );
      }),
      G.set(p(e), function (t) {
        return n(
          p(e),
          void 0,
          void 0,
          i().mark(function e() {
            var r,
              n,
              o = this;
            return i().wrap(
              function (e) {
                for (;;)
                  switch ((e.prev = e.next)) {
                    case 0:
                      if (
                        (a(this, E, 'f') ||
                          ((n = s(
                            this,
                            E,
                            document.createElement('video'),
                            'f'
                          )).setAttribute('x5-video-player-type', 'h5'),
                          n.setAttribute('x5-video-player-fullscreen', 'true'),
                          n.setAttribute('x-webkit-airplay', 'allow'),
                          n.setAttribute(
                            'webkit-playsinline',
                            'webkit-playsinline'
                          ),
                          n.setAttribute('playsinline', 'playsinline'),
                          n.addEventListener('waiting', a(this, j, 'f')),
                          n.addEventListener('play', a(this, D, 'f')),
                          n.addEventListener('playing', a(this, D, 'f')),
                          n.addEventListener('error', a(this, O, 'f')),
                          n.addEventListener('timeupdate', a(this, L, 'f')),
                          (n.style.objectFit = 'contain'),
                          null === (r = a(this, w, 'f')) ||
                            void 0 === r ||
                            r.appendChild(n)),
                        a(this, E, 'f') && a(this, w, 'f'))
                      ) {
                        e.next = 3;
                        break;
                      }
                      return e.abrupt('return');
                    case 3:
                      try {
                        a(this, E, 'f').srcObject = t;
                      } catch (e) {
                        ((a(this, E, 'f').src = window.URL.createObjectURL(t)),
                          window.URL.revokeObjectURL(a(this, E, 'f').src));
                      }
                      return (
                        (e.next = 6),
                        a(this, E, 'f')
                          .play()
                          .catch(function (e) {
                            return 'NotAllowedError' ===
                              (null == e ? void 0 : e.name) && a(o, E, 'f')
                              ? (o.emit(
                                  u.playNotAllowed,
                                  h.PlayNotAllowed.code
                                ),
                                (o.muted = !0),
                                s(o, P, !0, 'f'),
                                Promise.resolve())
                              : Promise.reject(e);
                          })
                      );
                    case 6:
                    case 'end':
                      return e.stop();
                  }
              },
              e,
              this
            );
          })
        );
      }),
      N.set(p(e), function () {
        var t;
        a(p(e), I, 'f').call(p(e), !1);
        var r = a(p(e), E, 'f');
        (r &&
          (r.removeEventListener('waiting', a(p(e), j, 'f')),
          r.removeEventListener('play', a(p(e), D, 'f')),
          r.removeEventListener('playing', a(p(e), D, 'f')),
          r.removeEventListener('error', a(p(e), O, 'f')),
          r.removeEventListener('timeupdate', a(p(e), L, 'f'))),
          null === (t = a(p(e), E, 'f')) || void 0 === t || t.pause(),
          s(p(e), E, void 0, 'f'));
      }),
      e
    );
  }
  return (
    c(t, g),
    r(t, [
      {
        key: 'muted',
        get: function () {
          var e = a(this, R, 'f');
          return (a(this, E, 'f') && (e = a(this, E, 'f').muted), e);
        },
        set: function (e) {
          (s(this, R, e, 'f'),
            a(this, E, 'f') &&
              (e
                ? (a(this, E, 'f').muted = !0)
                : (a(this, E, 'f')
                    .play()
                    .catch(function (e) {
                      l.record(m.info, '[stream play]', e);
                    }),
                  (a(this, E, 'f').muted = !1))));
        },
      },
      {
        key: 'volume',
        get: function () {
          return a(this, T, 'f');
        },
        set: function (e) {
          (e > 1 && (e = 1),
            s(this, T, e, 'f'),
            a(this, E, 'f') && (a(this, E, 'f').volume = e));
        },
      },
      {
        key: 'stream',
        set: function (e) {
          s(this, b, e, 'f');
        },
      },
      {
        key: 'videoWrapper',
        set: function (e) {
          s(this, w, e, 'f');
        },
      },
      {
        key: 'play',
        value: function () {
          return n(
            this,
            void 0,
            void 0,
            i().mark(function e() {
              var t;
              return i().wrap(
                function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        return ((e.next = 2), a(this, A, 'f').call(this));
                      case 2:
                        return (
                          (t = e.sent),
                          (e.next = 5),
                          a(this, G, 'f').call(this, t.stream)
                        );
                      case 5:
                      case 'end':
                        return e.stop();
                    }
                },
                e,
                this
              );
            })
          );
        },
      },
      {
        key: 'resume',
        value: function () {
          return n(
            this,
            void 0,
            void 0,
            i().mark(function e() {
              return i().wrap(
                function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        if (!a(this, E, 'f')) {
                          e.next = 3;
                          break;
                        }
                        return (
                          a(this, P, 'f') &&
                            ((this.muted = !1), s(this, P, !1, 'f')),
                          e.abrupt(
                            'return',
                            a(this, E, 'f')
                              .play()
                              .catch(function (e) {
                                return (
                                  l.record(m.warn, '[stream resume]', e),
                                  Promise.reject(e)
                                );
                              })
                          )
                        );
                      case 3:
                        return e.abrupt(
                          'return',
                          Promise.reject('stream not found')
                        );
                      case 4:
                      case 'end':
                        return e.stop();
                    }
                },
                e,
                this
              );
            })
          );
        },
      },
      {
        key: 'stop',
        value: function () {
          (s(this, P, !1, 'f'), this.emit(u.stop), a(this, N, 'f').call(this));
        },
      },
      {
        key: 'setSinkId',
        value: function (e) {
          return n(
            this,
            void 0,
            void 0,
            i().mark(function t() {
              var r;
              return i().wrap(
                function (t) {
                  for (;;)
                    switch ((t.prev = t.next)) {
                      case 0:
                        return (
                          (t.next = 2),
                          null === (r = a(this, E, 'f')) || void 0 === r
                            ? void 0
                            : r.setSinkId(e)
                        );
                      case 2:
                      case 'end':
                        return t.stop();
                    }
                },
                t,
                this
              );
            })
          );
        },
      },
      {
        key: 'getSinkId',
        value: function () {
          return n(
            this,
            void 0,
            void 0,
            i().mark(function e() {
              var t;
              return i().wrap(
                function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        return e.abrupt(
                          'return',
                          (null === (t = a(this, E, 'f')) || void 0 === t
                            ? void 0
                            : t.sinkId) || ''
                        );
                      case 1:
                      case 'end':
                        return e.stop();
                    }
                },
                e,
                this
              );
            })
          );
        },
      },
      {
        key: 'destroy',
        value: function () {
          (this.stop(), v(y(t.prototype), 'destroy', this).call(this));
        },
      },
      { key: 'resize', value: function () {} },
    ]),
    t
  );
})();
((T = new WeakMap()),
  (P = new WeakMap()),
  (R = new WeakMap()),
  (b = new WeakMap()),
  (w = new WeakMap()),
  (E = new WeakMap()),
  (_ = new WeakMap()),
  (k = new WeakMap()),
  (x = new WeakMap()),
  (M = new WeakMap()),
  (D = new WeakMap()),
  (O = new WeakMap()),
  (I = new WeakMap()),
  (j = new WeakMap()),
  (L = new WeakMap()),
  (A = new WeakMap()),
  (G = new WeakMap()),
  (N = new WeakMap()));
export { F as WebRTCPlayer, F as default };
