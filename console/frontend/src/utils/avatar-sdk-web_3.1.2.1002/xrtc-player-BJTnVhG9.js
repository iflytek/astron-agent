import {
  _ as e,
  a as t,
  b as i,
  c as r,
  L as n,
  d as o,
  P as s,
  e as a,
  f as c,
  g as u,
  h as d,
  i as l,
  j as h,
  k as p,
  C as f,
  E as m,
  l as g,
  m as v,
  n as b,
} from './index-OS7Lza_r.js';
/*!
 * xrtc.js v5.2024.5.0_00
 * (c) 2020-2024
 * Released under the MIT License in iflytek.
 */ function S(e, t, i) {
  return (
    t in e
      ? Object.defineProperty(e, t, {
          value: i,
          enumerable: !0,
          configurable: !0,
          writable: !0,
        })
      : (e[t] = i),
    e
  );
}
function y(e, t) {
  (null == t || t > e.length) && (t = e.length);
  for (var i = 0, r = new Array(t); i < t; i++) r[i] = e[i];
  return r;
}
function E(e, t) {
  if (e) {
    if ('string' == typeof e) return y(e, t);
    var i = Object.prototype.toString.call(e).slice(8, -1);
    return (
      'Object' === i && e.constructor && (i = e.constructor.name),
      'Map' === i || 'Set' === i
        ? Array.from(e)
        : 'Arguments' === i ||
            /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i)
          ? y(e, t)
          : void 0
    );
  }
}
function C(e, t) {
  return (
    (function (e) {
      if (Array.isArray(e)) return e;
    })(e) ||
    (function (e, t) {
      if ('undefined' != typeof Symbol && Symbol.iterator in Object(e)) {
        var i = [],
          r = !0,
          n = !1,
          o = void 0;
        try {
          for (
            var s, a = e[Symbol.iterator]();
            !(r = (s = a.next()).done) &&
            (i.push(s.value), !t || i.length !== t);
            r = !0
          );
        } catch (e) {
          ((n = !0), (o = e));
        } finally {
          try {
            r || null == a.return || a.return();
          } finally {
            if (n) throw o;
          }
        }
        return i;
      }
    })(e, t) ||
    E(e, t) ||
    (function () {
      throw new TypeError(
        'Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
      );
    })()
  );
}
function I(e, t, i, r, n, o, s) {
  try {
    var a = e[o](s),
      c = a.value;
  } catch (e) {
    return void i(e);
  }
  a.done ? t(c) : Promise.resolve(c).then(r, n);
}
function T(e) {
  return function () {
    var t = this,
      i = arguments;
    return new Promise(function (r, n) {
      var o = e.apply(t, i);
      function s(e) {
        I(o, r, n, s, a, 'next', e);
      }
      function a(e) {
        I(o, r, n, s, a, 'throw', e);
      }
      s(void 0);
    });
  };
}
function R(e) {
  return (
    (function (e) {
      if (Array.isArray(e)) return y(e);
    })(e) ||
    (function (e) {
      if ('undefined' != typeof Symbol && Symbol.iterator in Object(e))
        return Array.from(e);
    })(e) ||
    E(e) ||
    (function () {
      throw new TypeError(
        'Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
      );
    })()
  );
}
function _(e, t) {
  if (!(e instanceof t))
    throw new TypeError('Cannot call a class as a function');
}
function k(e, t) {
  for (var i = 0; i < t.length; i++) {
    var r = t[i];
    ((r.enumerable = r.enumerable || !1),
      (r.configurable = !0),
      'value' in r && (r.writable = !0),
      Object.defineProperty(e, r.key, r));
  }
}
function O(e, t, i) {
  return (t && k(e.prototype, t), i && k(e, i), e);
}
function w(e) {
  var t = { exports: {} };
  return (e(t, t.exports), t.exports);
}
var A = w(function (e) {
    var t = (function (e) {
      var t,
        i = Object.prototype,
        r = i.hasOwnProperty,
        n = 'function' == typeof Symbol ? Symbol : {},
        o = n.iterator || '@@iterator',
        s = n.asyncIterator || '@@asyncIterator',
        a = n.toStringTag || '@@toStringTag';
      function c(e, t, i) {
        return (
          Object.defineProperty(e, t, {
            value: i,
            enumerable: !0,
            configurable: !0,
            writable: !0,
          }),
          e[t]
        );
      }
      try {
        c({}, '');
      } catch (e) {
        c = function (e, t, i) {
          return (e[t] = i);
        };
      }
      function u(e, t, i, r) {
        var n = Object.create(
            (t && t.prototype instanceof g ? t : g).prototype
          ),
          o = new O(r || []);
        return (
          (n._invoke = (function (e, t, i) {
            var r = l;
            return function (n, o) {
              if (r === p) throw new Error('Generator is already running');
              if (r === f) {
                if ('throw' === n) throw o;
                return A();
              }
              for (i.method = n, i.arg = o; ; ) {
                var s = i.delegate;
                if (s) {
                  var a = R(s, i);
                  if (a) {
                    if (a === m) continue;
                    return a;
                  }
                }
                if ('next' === i.method) i.sent = i._sent = i.arg;
                else if ('throw' === i.method) {
                  if (r === l) throw ((r = f), i.arg);
                  i.dispatchException(i.arg);
                } else 'return' === i.method && i.abrupt('return', i.arg);
                r = p;
                var c = d(e, t, i);
                if ('normal' === c.type) {
                  if (((r = i.done ? f : h), c.arg === m)) continue;
                  return { value: c.arg, done: i.done };
                }
                'throw' === c.type &&
                  ((r = f), (i.method = 'throw'), (i.arg = c.arg));
              }
            };
          })(e, i, o)),
          n
        );
      }
      function d(e, t, i) {
        try {
          return { type: 'normal', arg: e.call(t, i) };
        } catch (e) {
          return { type: 'throw', arg: e };
        }
      }
      e.wrap = u;
      var l = 'suspendedStart',
        h = 'suspendedYield',
        p = 'executing',
        f = 'completed',
        m = {};
      function g() {}
      function v() {}
      function b() {}
      var S = {};
      S[o] = function () {
        return this;
      };
      var y = Object.getPrototypeOf,
        E = y && y(y(w([])));
      E && E !== i && r.call(E, o) && (S = E);
      var C = (b.prototype = g.prototype = Object.create(S));
      function I(e) {
        ['next', 'throw', 'return'].forEach(function (t) {
          c(e, t, function (e) {
            return this._invoke(t, e);
          });
        });
      }
      function T(e, t) {
        function i(n, o, s, a) {
          var c = d(e[n], e, o);
          if ('throw' !== c.type) {
            var u = c.arg,
              l = u.value;
            return l && 'object' == typeof l && r.call(l, '__await')
              ? t.resolve(l.__await).then(
                  function (e) {
                    i('next', e, s, a);
                  },
                  function (e) {
                    i('throw', e, s, a);
                  }
                )
              : t.resolve(l).then(
                  function (e) {
                    ((u.value = e), s(u));
                  },
                  function (e) {
                    return i('throw', e, s, a);
                  }
                );
          }
          a(c.arg);
        }
        var n;
        this._invoke = function (e, r) {
          function o() {
            return new t(function (t, n) {
              i(e, r, t, n);
            });
          }
          return (n = n ? n.then(o, o) : o());
        };
      }
      function R(e, i) {
        var r = e.iterator[i.method];
        if (r === t) {
          if (((i.delegate = null), 'throw' === i.method)) {
            if (
              e.iterator.return &&
              ((i.method = 'return'),
              (i.arg = t),
              R(e, i),
              'throw' === i.method)
            )
              return m;
            ((i.method = 'throw'),
              (i.arg = new TypeError(
                "The iterator does not provide a 'throw' method"
              )));
          }
          return m;
        }
        var n = d(r, e.iterator, i.arg);
        if ('throw' === n.type)
          return (
            (i.method = 'throw'),
            (i.arg = n.arg),
            (i.delegate = null),
            m
          );
        var o = n.arg;
        return o
          ? o.done
            ? ((i[e.resultName] = o.value),
              (i.next = e.nextLoc),
              'return' !== i.method && ((i.method = 'next'), (i.arg = t)),
              (i.delegate = null),
              m)
            : o
          : ((i.method = 'throw'),
            (i.arg = new TypeError('iterator result is not an object')),
            (i.delegate = null),
            m);
      }
      function _(e) {
        var t = { tryLoc: e[0] };
        (1 in e && (t.catchLoc = e[1]),
          2 in e && ((t.finallyLoc = e[2]), (t.afterLoc = e[3])),
          this.tryEntries.push(t));
      }
      function k(e) {
        var t = e.completion || {};
        ((t.type = 'normal'), delete t.arg, (e.completion = t));
      }
      function O(e) {
        ((this.tryEntries = [{ tryLoc: 'root' }]),
          e.forEach(_, this),
          this.reset(!0));
      }
      function w(e) {
        if (e) {
          var i = e[o];
          if (i) return i.call(e);
          if ('function' == typeof e.next) return e;
          if (!isNaN(e.length)) {
            var n = -1,
              s = function i() {
                for (; ++n < e.length; )
                  if (r.call(e, n)) return ((i.value = e[n]), (i.done = !1), i);
                return ((i.value = t), (i.done = !0), i);
              };
            return (s.next = s);
          }
        }
        return { next: A };
      }
      function A() {
        return { value: t, done: !0 };
      }
      return (
        (v.prototype = C.constructor = b),
        (b.constructor = v),
        (v.displayName = c(b, a, 'GeneratorFunction')),
        (e.isGeneratorFunction = function (e) {
          var t = 'function' == typeof e && e.constructor;
          return (
            !!t &&
            (t === v || 'GeneratorFunction' === (t.displayName || t.name))
          );
        }),
        (e.mark = function (e) {
          return (
            Object.setPrototypeOf
              ? Object.setPrototypeOf(e, b)
              : ((e.__proto__ = b), c(e, a, 'GeneratorFunction')),
            (e.prototype = Object.create(C)),
            e
          );
        }),
        (e.awrap = function (e) {
          return { __await: e };
        }),
        I(T.prototype),
        (T.prototype[s] = function () {
          return this;
        }),
        (e.AsyncIterator = T),
        (e.async = function (t, i, r, n, o) {
          void 0 === o && (o = Promise);
          var s = new T(u(t, i, r, n), o);
          return e.isGeneratorFunction(i)
            ? s
            : s.next().then(function (e) {
                return e.done ? e.value : s.next();
              });
        }),
        I(C),
        c(C, a, 'Generator'),
        (C[o] = function () {
          return this;
        }),
        (C.toString = function () {
          return '[object Generator]';
        }),
        (e.keys = function (e) {
          var t = [];
          for (var i in e) t.push(i);
          return (
            t.reverse(),
            function i() {
              for (; t.length; ) {
                var r = t.pop();
                if (r in e) return ((i.value = r), (i.done = !1), i);
              }
              return ((i.done = !0), i);
            }
          );
        }),
        (e.values = w),
        (O.prototype = {
          constructor: O,
          reset: function (e) {
            if (
              ((this.prev = 0),
              (this.next = 0),
              (this.sent = this._sent = t),
              (this.done = !1),
              (this.delegate = null),
              (this.method = 'next'),
              (this.arg = t),
              this.tryEntries.forEach(k),
              !e)
            )
              for (var i in this)
                't' === i.charAt(0) &&
                  r.call(this, i) &&
                  !isNaN(+i.slice(1)) &&
                  (this[i] = t);
          },
          stop: function () {
            this.done = !0;
            var e = this.tryEntries[0].completion;
            if ('throw' === e.type) throw e.arg;
            return this.rval;
          },
          dispatchException: function (e) {
            if (this.done) throw e;
            var i = this;
            function n(r, n) {
              return (
                (a.type = 'throw'),
                (a.arg = e),
                (i.next = r),
                n && ((i.method = 'next'), (i.arg = t)),
                !!n
              );
            }
            for (var o = this.tryEntries.length - 1; o >= 0; --o) {
              var s = this.tryEntries[o],
                a = s.completion;
              if ('root' === s.tryLoc) return n('end');
              if (s.tryLoc <= this.prev) {
                var c = r.call(s, 'catchLoc'),
                  u = r.call(s, 'finallyLoc');
                if (c && u) {
                  if (this.prev < s.catchLoc) return n(s.catchLoc, !0);
                  if (this.prev < s.finallyLoc) return n(s.finallyLoc);
                } else if (c) {
                  if (this.prev < s.catchLoc) return n(s.catchLoc, !0);
                } else {
                  if (!u)
                    throw new Error('try statement without catch or finally');
                  if (this.prev < s.finallyLoc) return n(s.finallyLoc);
                }
              }
            }
          },
          abrupt: function (e, t) {
            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var n = this.tryEntries[i];
              if (
                n.tryLoc <= this.prev &&
                r.call(n, 'finallyLoc') &&
                this.prev < n.finallyLoc
              ) {
                var o = n;
                break;
              }
            }
            o &&
              ('break' === e || 'continue' === e) &&
              o.tryLoc <= t &&
              t <= o.finallyLoc &&
              (o = null);
            var s = o ? o.completion : {};
            return (
              (s.type = e),
              (s.arg = t),
              o
                ? ((this.method = 'next'), (this.next = o.finallyLoc), m)
                : this.complete(s)
            );
          },
          complete: function (e, t) {
            if ('throw' === e.type) throw e.arg;
            return (
              'break' === e.type || 'continue' === e.type
                ? (this.next = e.arg)
                : 'return' === e.type
                  ? ((this.rval = this.arg = e.arg),
                    (this.method = 'return'),
                    (this.next = 'end'))
                  : 'normal' === e.type && t && (this.next = t),
              m
            );
          },
          finish: function (e) {
            for (var t = this.tryEntries.length - 1; t >= 0; --t) {
              var i = this.tryEntries[t];
              if (i.finallyLoc === e)
                return (this.complete(i.completion, i.afterLoc), k(i), m);
            }
          },
          catch: function (e) {
            for (var t = this.tryEntries.length - 1; t >= 0; --t) {
              var i = this.tryEntries[t];
              if (i.tryLoc === e) {
                var r = i.completion;
                if ('throw' === r.type) {
                  var n = r.arg;
                  k(i);
                }
                return n;
              }
            }
            throw new Error('illegal catch attempt');
          },
          delegateYield: function (e, i, r) {
            return (
              (this.delegate = { iterator: w(e), resultName: i, nextLoc: r }),
              'next' === this.method && (this.arg = t),
              m
            );
          },
        }),
        e
      );
    })(e.exports);
    try {
      regeneratorRuntime = t;
    } catch (e) {
      Function('r', 'regeneratorRuntime = r')(t);
    }
  }),
  P = (function () {
    function e(t) {
      (_(this, e), (this.events = {}), (this.logger = t));
    }
    return (
      O(e, [
        {
          key: 'on',
          value: function (e, t) {
            var i = this.events[e] || [];
            return (i.push(t), (this.events[e] = i), this);
          },
        },
        {
          key: 'once',
          value: function (e, t) {
            var i = this;
            this.on(e, function r() {
              for (
                var n = arguments.length, o = new Array(n), s = 0;
                s < n;
                s++
              )
                o[s] = arguments[s];
              (t.apply(null, o), i.off(e, r));
            });
          },
        },
        {
          key: 'off',
          value: function (e, t) {
            if ('*' === e) return ((this.events = {}), this);
            var i = this.events[e];
            return (
              (this.events[e] =
                i &&
                i.filter(function (e) {
                  return e !== t;
                })),
              this
            );
          },
        },
        {
          key: 'emit',
          value: function (e) {
            for (
              var t = arguments.length, i = new Array(t > 1 ? t - 1 : 0), r = 1;
              r < t;
              r++
            )
              i[r - 1] = arguments[r];
            'network-quality' !== e &&
              'audio-volume' !== e &&
              'mic-volume' !== e &&
              this.logger &&
              this.logger.info('Emit event name:', e);
            var n = this.events[e];
            return (
              n &&
                n.forEach(function (e) {
                  return e.apply(null, i);
                }),
              this
            );
          },
        },
      ]),
      e
    );
  })(),
  L = new Map();
(L.set('anchor', {
  publish: { audio: !0, video: !0 },
  subscribe: { audio: !0, video: !0 },
  control: !0,
}),
  L.set('audience', {
    publish: { audio: !1, video: !1 },
    subscribe: { audio: !0, video: !0 },
    control: !1,
  }));
var D, x, M, U;
(!(function (e) {
  ((e[(e.New = 0)] = 'New'),
    (e[(e.Joining = 1)] = 'Joining'),
    (e[(e.Joined = 2)] = 'Joined'),
    (e[(e.Leaving = 3)] = 'Leaving'),
    (e[(e.Leaved = 4)] = 'Leaved'));
})(D || (D = {})),
  (function (e) {
    ((e[(e.Create = 0)] = 'Create'),
      (e[(e.Publishing = 1)] = 'Publishing'),
      (e[(e.Published = 2)] = 'Published'),
      (e[(e.Unpublished = 3)] = 'Unpublished'));
  })(x || (x = {})),
  (function (e) {
    ((e[(e.Create = 0)] = 'Create'),
      (e[(e.Subscribing = 1)] = 'Subscribing'),
      (e[(e.Subscribed = 2)] = 'Subscribed'),
      (e[(e.Unsubscribed = 3)] = 'Unsubscribed'));
  })(M || (M = {})),
  (function (e) {
    ((e[(e.Invalid = 0)] = 'Invalid'),
      (e[(e.AudioOnly = 1)] = 'AudioOnly'),
      (e[(e.VideoOnly = 2)] = 'VideoOnly'),
      (e[(e.AudioVideo = 3)] = 'AudioVideo'));
  })(U || (U = {})));
var N = 'auxiliary',
  V = 'error';
function F(e, t) {
  var i = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      i.push.apply(i, r));
  }
  return i;
}
function j(e) {
  for (var t = 1; t < arguments.length; t++) {
    var i = null != arguments[t] ? arguments[t] : {};
    t % 2
      ? F(Object(i), !0).forEach(function (t) {
          S(e, t, i[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(i))
        : F(Object(i)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(i, t));
          });
  }
  return e;
}
var B = j(
  j(
    j(
      j(
        j(
          j(
            {},
            {
              INVALID_PARAMETER: 4096,
              INVALID_OPERATION: 4097,
              NOT_SUPPORTED: 4098,
            }
          ),
          {
            JOIN_ROOM_FAILED: 16388,
            CREATE_OFFER_FAILED: 16389,
            LEAVE_ROOM_FAILED: 16390,
            PUBLISH_STREAM_FAILED: 16391,
            UNPUBLISH_STREAM_FAILED: 16392,
            SUBSCRIBE_FAILED: 16393,
            UNSUBSCRIBE_FAILED: 16400,
            SWITCH_ROLE_ERROR: 16401,
            INVALID_TRANSPORT_STATA: 16402,
            LOCAL_AUDIO_STATA_ERROR: 16403,
            LOCAL_VIDEO_STATA_ERROR: 16404,
            REMOTE_AUDIO_STATA_ERROR: 16405,
            REMOTE_VIDEO_STATA_ERROR: 16406,
            LOCAL_SWITCH_SIMULCAST: 16407,
            REMOTE_SWITCH_SIMULCAST: 16408,
            SUBSCRIPTION_TIMEOUT: 16450,
            UNKNOWN: '0xFFFF',
          }
        ),
        {
          INIT_STREAM_FAILED: 12289,
          PLAY_STREAM_ERROR: 12290,
          SET_AUDIO_OUTPUT_FAILED: 12291,
          SET_VIDEO_PROFILE_ERROR: 12292,
          SET_SCREEN_SHARE_FAILED: 12293,
          SWITCH_DEVICE_FAILED: 12294,
          ADD_TRACK_FAILED: 12295,
          REMOVE_TRACK_FAILED: 12296,
          REPLACE_TRACK_FAILED: 12297,
          PLAY_NOT_ALLOWED: 16451,
          DEVICE_AUTO_RECOVER_FAILED: 16452,
          CANDIDATE_COLLECT_FAILED: 16453,
          RTCPEERCONNECTION_SATE_FAILED: 16480,
        }
      ),
      {
        DEVICE_NOT_FOUND: 256,
        H264_NOT_SUPPORTED: 257,
        CAMERAS_NOT_FOUND: 258,
        MICROPHONES_NOT_FOUND: 259,
        SPEAKERS_NOT_FOUND: 260,
        OS_NOT_SUPPORTED: 261,
        WEBRTC_NOT_SUPPORTED: 262,
        BROWSER_NOT_SUPPORTED: 263,
      }
    ),
    {
      SIGNAL_CHANNEL_SETUP_FAILED: 20481,
      SIGNAL_CHANNEL_RECONNECTION_FAILED: 20482,
      SERVER_TIMEOUT: 20483,
    }
  ),
  {
    SERVER_UNKNOWN_ERROR: -10011,
    AUTHORIZATION_FAILED: -10013,
    GET_SERVER_NODE_FAILED: -10015,
    REQUEST_TIMEOUT: -10020,
  }
);
function W(e, t) {
  return (W =
    Object.setPrototypeOf ||
    function (e, t) {
      return ((e.__proto__ = t), e);
    })(e, t);
}
function H(e, t) {
  if ('function' != typeof t && null !== t)
    throw new TypeError('Super expression must either be null or a function');
  ((e.prototype = Object.create(t && t.prototype, {
    constructor: { value: e, writable: !0, configurable: !0 },
  })),
    t && W(e, t));
}
function G(e) {
  return (G =
    'function' == typeof Symbol && 'symbol' == typeof Symbol.iterator
      ? function (e) {
          return typeof e;
        }
      : function (e) {
          return e &&
            'function' == typeof Symbol &&
            e.constructor === Symbol &&
            e !== Symbol.prototype
            ? 'symbol'
            : typeof e;
        })(e);
}
function J(e) {
  if (void 0 === e)
    throw new ReferenceError(
      "this hasn't been initialised - super() hasn't been called"
    );
  return e;
}
function K(e, t) {
  return !t || ('object' !== G(t) && 'function' != typeof t) ? J(e) : t;
}
function Y(e) {
  return (Y = Object.setPrototypeOf
    ? Object.getPrototypeOf
    : function (e) {
        return e.__proto__ || Object.getPrototypeOf(e);
      })(e);
}
function z(e, t, i) {
  return (z = (function () {
    if ('undefined' == typeof Reflect || !Reflect.construct) return !1;
    if (Reflect.construct.sham) return !1;
    if ('function' == typeof Proxy) return !0;
    try {
      return (
        Boolean.prototype.valueOf.call(
          Reflect.construct(Boolean, [], function () {})
        ),
        !0
      );
    } catch (e) {
      return !1;
    }
  })()
    ? Reflect.construct
    : function (e, t, i) {
        var r = [null];
        r.push.apply(r, t);
        var n = new (Function.bind.apply(e, r))();
        return (i && W(n, i.prototype), n);
      }).apply(null, arguments);
}
function q(e) {
  var t = 'function' == typeof Map ? new Map() : void 0;
  return (q = function (e) {
    if (null === e || -1 === Function.toString.call(e).indexOf('[native code]'))
      return e;
    if ('function' != typeof e)
      throw new TypeError('Super expression must either be null or a function');
    if (void 0 !== t) {
      if (t.has(e)) return t.get(e);
      t.set(e, i);
    }
    function i() {
      return z(e, arguments, Y(this).constructor);
    }
    return (
      (i.prototype = Object.create(e.prototype, {
        constructor: {
          value: i,
          enumerable: !1,
          writable: !0,
          configurable: !0,
        },
      })),
      W(i, e)
    );
  })(e);
}
var X = (function (e) {
    H(i, q(Error));
    var t = (function (e) {
      var t = (function () {
        if ('undefined' == typeof Reflect || !Reflect.construct) return !1;
        if (Reflect.construct.sham) return !1;
        if ('function' == typeof Proxy) return !0;
        try {
          return (
            Boolean.prototype.valueOf.call(
              Reflect.construct(Boolean, [], function () {})
            ),
            !0
          );
        } catch (e) {
          return !1;
        }
      })();
      return function () {
        var i,
          r = Y(e);
        if (t) {
          var n = Y(this).constructor;
          i = Reflect.construct(r, arguments, n);
        } else i = r.apply(this, arguments);
        return K(this, i);
      };
    })(i);
    function i(e) {
      var r;
      (_(this, i),
        ((r = t.call(this)).code = e.code),
        e.name && (r.name = e.name));
      var n = e.message instanceof Error ? e.message.message : e.message;
      return ((r.message = n), r);
    }
    return (
      O(i, [
        {
          key: 'getCode',
          value: function () {
            return this.code;
          },
        },
      ]),
      i
    );
  })(),
  Q = (function () {
    function e() {
      var t = this;
      (_(this, e),
        (this.context = new (window.AudioContext ||
          window.webkitAudioContext)()),
        (this.instant = 0),
        (this.slow = 0),
        (this.clip = 0),
        (this.script = this.context.createScriptProcessor(2048, 1, 1)),
        (this.script.onaudioprocess = function (e) {
          var i,
            r = e.inputBuffer.getChannelData(0),
            n = 0,
            o = 0;
          for (i = 0; i < r.length; ++i)
            ((n += r[i] * r[i]), Math.abs(r[i]) > 0.99 && (o += 1));
          ((t.instant = Math.sqrt(n / r.length)),
            (t.slow = 0.95 * t.slow + 0.05 * t.instant),
            (t.clip = o / r.length));
        }));
    }
    return (
      O(e, [
        {
          key: 'connectToSource',
          value: function (e) {
            try {
              var t = new MediaStream();
              (t.addTrack(e),
                (this.mic = this.context.createMediaStreamSource(t)),
                this.mic.connect(this.script),
                this.script.connect(this.context.destination));
            } catch (e) {}
          },
        },
        {
          key: 'stop',
          value: function () {
            (this.mic.disconnect(), this.script.disconnect());
          },
        },
        {
          key: 'resume',
          value: function () {
            this.context && this.context.resume();
          },
        },
        {
          key: 'getVolume',
          value: function () {
            return this.instant.toFixed(2);
          },
        },
      ]),
      e
    );
  })();
function $() {
  var e = navigator.userAgent,
    t = navigator.connection,
    i = e.match(/NetType\/\w+/) ? e.match(/NetType\/\w+/)[0] : '';
  '3gnet' === (i = i.toLowerCase().replace('nettype/', '')) && (i = '3g');
  var r = t && t.type && t.type.toLowerCase(),
    n = t && t.effectiveType && t.effectiveType.toLowerCase();
  'slow-2' === n && (n = '2g');
  var o = i || 'unknown';
  if (r)
    switch (r) {
      case 'cellular':
      case 'wimax':
        o = n || 'unknown';
        break;
      case 'wifi':
        o = 'wifi';
        break;
      case 'ethernet':
        o = 'wired';
        break;
      case 'none':
      case 'other':
      case 'unknown':
        o = 'unknown';
    }
  return o;
}
var Z = {
  Android: function () {
    return navigator.userAgent.match(/Android/i);
  },
  BlackBerry: function () {
    return navigator.userAgent.match(/BlackBerry|BB10/i);
  },
  iOS: function () {
    return navigator.userAgent.match(/iPhone|iPad|iPod/i);
  },
  Opera: function () {
    return navigator.userAgent.match(/Opera Mini/i);
  },
  Windows: function () {
    return navigator.userAgent.match(/IEMobile/i);
  },
  wx: function () {
    return navigator.userAgent.match(/MicroMessenger/i);
  },
  any: function () {
    return Z.BlackBerry() || Z.Opera() || Z.Windows();
  },
  getOsName: function () {
    var e = 'Unknown OS';
    return (
      Z.Android() && (e = 'Android'),
      Z.BlackBerry() && (e = 'BlackBerry'),
      Z.iOS() && (e = 'iOS'),
      Z.Opera() && (e = 'Opera Mini'),
      Z.Windows() && (e = 'Windows'),
      Z.wx() && (e = 'wx'),
      { osName: e, type: 'mobile' }
    );
  },
};
function ee() {
  var e,
    t,
    i = navigator.userAgent.toLocaleLowerCase();
  if (-1 != i.indexOf('firefox')) e = 'Firefox';
  else if (-1 != i.indexOf('trident'))
    ((e = 'IE'), -1 == i.indexOf('ie') && (t = 11));
  else if (-1 != i.indexOf('opr')) e = 'OPR';
  else if (-1 != i.indexOf('edge')) e = 'Edge';
  else if (-1 != i.indexOf('chrome')) e = 'Chrome';
  else if (-1 != i.indexOf('safari')) {
    e = 'Safari';
    var r = i.match(/(version).*?([\d.]+)/);
    t = r ? r[2] : '';
  } else e = '未知浏览器';
  if (void 0 === t) {
    var n = i.match(/(firefox|trident|opr|chrome|safari).*?([\d.]+)/);
    t = n ? n[2] : '';
  }
  return { browser: e, version: t };
}
var te,
  ie = (function () {
    function e(t) {
      (_(this, e),
        (this.stream = t.stream),
        (this.userId = t.stream.userId),
        (this.log = t.stream.logger),
        (this.track = t.track),
        (this.div = t.div),
        (this.muted = t.muted),
        (this.outputDeviceId = t.deviceId),
        (this.volume = t.volume),
        (this.element = null),
        (this.state = 'NONE'),
        (this.pausedRetryCount = 5),
        (this._emitter = new P()),
        (this.handleEleEventPlaying = this.eleEventPlaying.bind(this)),
        (this.handleEleEventEnded = this.eleEventEnded.bind(this)),
        (this.handleEleEventPause = this.eleEventPause.bind(this)),
        (this.handleTrackEventEnded = this.trackEventEnded.bind(this)),
        (this.handleTrackEventMute = this.trackEventMute.bind(this)),
        (this.handleTrackEventUnmute = this.trackEventUnmute.bind(this)));
    }
    var t;
    return (
      O(e, [
        {
          key: 'play',
          value:
            ((t = T(
              A.mark(function e() {
                var t = this;
                return A.wrap(function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        return e.abrupt(
                          'return',
                          new Promise(function (e, i) {
                            var r = new MediaStream();
                            r.addTrack(t.track);
                            var n = document.createElement('audio');
                            ((n.srcObject = r),
                              (n.muted = t.muted),
                              n.setAttribute(
                                'id',
                                'audio_'
                                  .concat(t.stream.getId(), '_')
                                  .concat(Date.now())
                              ),
                              n.setAttribute('autoplay', 'autoplay'),
                              n.setAttribute('playsinline', 'playsinline'),
                              t.div.appendChild(n),
                              t.outputDeviceId &&
                                'function' ==
                                  typeof (null == n ? void 0 : n.setSinkId) &&
                                n.setSinkId(t.outputDeviceId),
                              (t.element = n),
                              t.setVolume(t.volume),
                              t.handleEvents());
                            var o = function () {
                              t.element
                                .play()
                                .then(function () {
                                  e();
                                })
                                .catch(function (e) {
                                  i(e);
                                });
                            };
                            Z.wx() && Z.iOS()
                              ? (t.log.info('ios wx audio play'), o())
                              : n.addEventListener('canplay', function () {
                                  (t.log.info('audio canplay'), o());
                                });
                          })
                        );
                      case 1:
                      case 'end':
                        return e.stop();
                    }
                }, e);
              })
            )),
            function () {
              return t.apply(this, arguments);
            }),
        },
        {
          key: 'handleEvents',
          value: function () {
            var e, t, i;
            (null === (e = this.element) ||
              void 0 === e ||
              e.addEventListener('playing', this.handleEleEventPlaying),
              null === (t = this.element) ||
                void 0 === t ||
                t.addEventListener('ended', this.handleEleEventEnded),
              null === (i = this.element) ||
                void 0 === i ||
                i.addEventListener('pause', this.handleEleEventPause),
              this.trackHandleEvents());
          },
        },
        {
          key: 'trackHandleEvents',
          value: function () {
            var e, t, i;
            (null === (e = this.track) ||
              void 0 === e ||
              e.addEventListener('ended', this.handleTrackEventEnded),
              null === (t = this.track) ||
                void 0 === t ||
                t.addEventListener('mute', this.handleTrackEventMute),
              null === (i = this.track) ||
                void 0 === i ||
                i.addEventListener('unmute', this.handleTrackEventUnmute));
          },
        },
        {
          key: 'trackRemoveEvents',
          value: function () {
            var e, t, i;
            (null === (e = this.track) ||
              void 0 === e ||
              e.removeEventListener('ended', this.handleTrackEventEnded),
              null === (t = this.track) ||
                void 0 === t ||
                t.removeEventListener('mute', this.handleTrackEventMute),
              null === (i = this.track) ||
                void 0 === i ||
                i.removeEventListener('unmute', this.handleTrackEventUnmute));
          },
        },
        {
          key: 'removeEvents',
          value: function () {
            var e, t, i;
            (null === (e = this.element) ||
              void 0 === e ||
              e.removeEventListener('playing', this.handleEleEventPlaying),
              null === (t = this.element) ||
                void 0 === t ||
                t.removeEventListener('ended', this.handleEleEventEnded),
              null === (i = this.element) ||
                void 0 === i ||
                i.removeEventListener('pause', this.handleEleEventPause),
              this.trackRemoveEvents());
          },
        },
        {
          key: 'setSinkId',
          value: function (e) {
            var t;
            this.outputDeviceId !== e &&
              ((this.outputDeviceId = e),
              'function' ==
                typeof (null === (t = this.element) || void 0 === t
                  ? void 0
                  : t.setSinkId) && this.element.setSinkId(e));
          },
        },
        {
          key: 'setVolume',
          value: function (e) {
            (this.log.info(
              'stream - audioElement setVolume to : '.concat(e.toString())
            ),
              (this.element.volume = e));
          },
        },
        {
          key: 'getAudioLevel',
          value: function () {
            return (
              this.soundMeter ||
                ((this.soundMeter = new Q()),
                this.soundMeter.connectToSource(this.track)),
              this.soundMeter.getVolume()
            );
          },
        },
        {
          key: 'stop',
          value: function () {
            (this.removeEvents(),
              this.div.removeChild(this.element),
              (this.element.srcObject = null),
              (this.element = null),
              this.soundMeter &&
                (this.soundMeter.stop(), (this.soundMeter = null)));
          },
        },
        {
          key: 'resume',
          value: function () {
            var e;
            return null === (e = this.element) || void 0 === e
              ? void 0
              : e.play();
          },
        },
        {
          key: 'getAudioElement',
          value: function () {
            return this.element;
          },
        },
        {
          key: 'setAudioTrack',
          value: function (e) {
            this.trackRemoveEvents();
            var t = new MediaStream();
            (t.addTrack(e),
              (this.track = e),
              this.trackHandleEvents(),
              (this.soundMeter = null),
              this.log.info('setAudioTrack', e),
              this.element &&
                ((this.element.srcObject = t), this.element.play()));
          },
        },
        {
          key: 'eleEventPlaying',
          value: function () {
            (this.log.info(
              'stream '.concat(
                this.userId,
                ' - audio player is starting playing'
              )
            ),
              (this.state = 'PLAYING'),
              this._emitter.emit('player-state-changed', {
                state: this.state,
                reason: 'playing',
              }));
          },
        },
        {
          key: 'eleEventEnded',
          value: function () {
            (this.log.info(
              'stream '.concat(this.userId, ' - audio player is ended')
            ),
              'STOPPED' !== this.state &&
                ((this.state = 'STOPPED'),
                this._emitter.emit('player-state-changed', {
                  state: this.state,
                  reason: 'ended',
                })));
          },
        },
        {
          key: 'eleEventPause',
          value: function () {
            (this.log.info(
              'stream '.concat(this.userId, ' - audio player is paused')
            ),
              (this.state = 'PAUSED'),
              this._emitter.emit('player-state-changed', {
                state: this.state,
                reason: 'pause',
              }),
              this.div && document.getElementById(this.div.id)
                ? this.pausedRetryCount > 0 &&
                  (this.log.info(
                    'audio resume when audio paused count:' +
                      this.pausedRetryCount
                  ),
                  this.resume(),
                  this.pausedRetryCount--)
                : this.log.warn('audio container is not in DOM'));
          },
        },
        {
          key: 'trackEventEnded',
          value: function () {
            (this.log.info(
              'stream '.concat(this.userId, ' - audio player track is ended')
            ),
              'STOPPED' !== this.state &&
                ((this.state = 'STOPPED'),
                this._emitter.emit('player-state-changed', {
                  state: this.state,
                  reason: 'ended',
                  type: 'track',
                })));
          },
        },
        {
          key: 'trackEventMute',
          value: function () {
            (this.log.info(
              'stream '.concat(this.userId, ' - audio track is muted')
            ),
              'PAUSED' !== this.state &&
                ((this.state = 'PAUSED'),
                this._emitter.emit('player-state-changed', {
                  state: this.state,
                  reason: 'mute',
                  type: 'track',
                })));
          },
        },
        {
          key: 'trackEventUnmute',
          value: function () {
            (this.log.info(
              'stream '.concat(this.userId, ' - audio track is unmuted')
            ),
              'PAUSED' === this.state &&
                ((this.state = 'PLAYING'),
                this._emitter.emit('player-state-changed', {
                  state: this.state,
                  reason: 'unmute',
                  type: 'track',
                })));
          },
        },
      ]),
      e
    );
  })(),
  re =
    ((te = function (e, t) {
      for (
        var i = ['webgl', 'experimental-webgl', 'webkit-3d', 'moz-webgl'],
          r = null,
          n = 0;
        n < i.length;
        ++n
      ) {
        try {
          r = e.getContext(i[n], t);
        } catch (e) {}
        if (r) break;
      }
      return r;
    }),
    function (e, t, i) {
      ((i =
        i ||
        function (e) {
          var t = document.getElementsByTagName('body')[0];
          if (t) {
            var i = window.WebGLRenderingContext
              ? 'It doesn\'t appear your computer can support WebGL.<br/><a href="http://get.webgl.org">Click here for more information.</a>'
              : 'This page requires a browser that supports WebGL.<br/><a href="http://get.webgl.org">Click here to upgrade your browser.</a>';
            (e && (i += '<br/><br/>Status: ' + e),
              (t.innerHTML = (function (e) {
                return '<div style="margin: auto; width:500px;z-index:10000;margin-top:20em;text-align:center;"> '.concat(
                  e,
                  ' </div>'
                );
              })(i)));
          }
        }),
        e.addEventListener &&
          e.addEventListener(
            'webglcontextcreationerror',
            function (e) {
              i(e.statusMessage);
            },
            !1
          ));
      var r = te(e, t);
      return (r || i(''), r);
    });
function ne(e, t, i) {
  var r = e.createShader(t);
  if (null == r) return null;
  if (
    (e.shaderSource(r, i),
    e.compileShader(r),
    !e.getShaderParameter(r, e.COMPILE_STATUS))
  ) {
    e.getShaderInfoLog(r);
    return (e.deleteShader(r), null);
  }
  return r;
}
(window.requestAnimationFrame ||
  (window.requestAnimationFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (e, t) {
      window.setTimeout(e, 1e3 / 60);
    }),
  window.cancelAnimationFrame ||
    (window.cancelAnimationFrame =
      window.cancelRequestAnimationFrame ||
      window.webkitCancelAnimationFrame ||
      window.webkitCancelRequestAnimationFrame ||
      window.mozCancelAnimationFrame ||
      window.mozCancelRequestAnimationFrame ||
      window.msCancelAnimationFrame ||
      window.msCancelRequestAnimationFrame ||
      window.oCancelAnimationFrame ||
      window.oCancelRequestAnimationFrame ||
      window.clearTimeout));
var oe,
  se,
  ae,
  ce,
  ue,
  de,
  le,
  he,
  pe,
  fe,
  me,
  ge,
  ve,
  be,
  Se = (function () {
    function e(t, i) {
      (_(this, e),
        (this.div = t.div),
        (this.video = t.video),
        (this.virtualBackgroundMix = t.virtualBackgroundMix || null),
        (this.textures = []),
        (this.canCopyVideo = !1),
        (this.canCopyBackground = !1),
        (this.log = i),
        (this.track = t.track),
        this.initVirtualBackground(t.virtualBackground),
        (this.isEleLisenter = t.isEleLisenter));
    }
    return (
      O(e, [
        {
          key: 'play',
          value: function () {
            var e = this;
            if (
              (this.initCanvas(),
              (this.gl =
                re(this.canvas, {
                  preserveDrawingBuffer: !0,
                  alpha: !0,
                  antialias: !0,
                }) || null),
              this.gl)
            ) {
              var t = this.initXShaderSource();
              if (
                (function (e, t, i) {
                  var r = (function (e, t, i) {
                    var r = ne(e, e.VERTEX_SHADER, t),
                      n = ne(e, e.FRAGMENT_SHADER, i);
                    if (!r || !n) return null;
                    var o = e.createProgram();
                    return o
                      ? (e.attachShader(o, r),
                        e.attachShader(o, n),
                        e.linkProgram(o),
                        e.getProgramParameter(o, e.LINK_STATUS)
                          ? o
                          : (e.getProgramInfoLog(o),
                            e.deleteProgram(o),
                            e.deleteShader(n),
                            e.deleteShader(r),
                            null))
                      : null;
                  })(e, t, i);
                  return !!r && (e.useProgram(r), (e.program = r), !0);
                })(this.gl, t.VSHADER, t.FSHADER)
              )
                if (this.initVertexBuffers(this.gl) < 0)
                  this.log.warn('Failed to initialize shaders');
                else {
                  var i = [];
                  this.video
                    ? (this.setupVideo(this.video, 'canCopyVideo'),
                      i.push(this.video),
                      this.virtualBackground &&
                        this.virtualBackgroundMix &&
                        i.push(this.virtualBackground),
                      i.forEach(function (t, i) {
                        var r = e.initTextures(e.gl, i);
                        r
                          ? e.textures.push(r)
                          : e.log.warn('Failed to initialize texture');
                      }),
                      this.gl.clearColor(0, 0, 0, 0),
                      this.gl.clear(this.gl.COLOR_BUFFER_BIT),
                      this.render())
                    : this.log.warn('Failed to get video');
                }
              else this.log.warn('Failed to initialize shaders');
            } else
              this.log.warn('Failed to get the rendering context for webgl');
          },
        },
        {
          key: 'stop',
          value: function () {
            ((this.canCopyVideo = !1),
              (this.canCopyBackground = !1),
              this.rafId && cancelAnimationFrame(this.rafId),
              (this.rafId = null),
              (this.virtualBackground = null),
              (this.virtualBackgroundMix = !1),
              this.isEleLisenter && this.observer.unobserve(this.div),
              this.canvas.remove(),
              delete this.canvas,
              delete this.gl);
          },
        },
        {
          key: 'unmute',
          value: function () {
            this.render();
          },
        },
        {
          key: 'mute',
          value: function () {
            (this.rafId && cancelAnimationFrame(this.rafId),
              (this.rafId = null),
              this.gl.clearColor(0, 0, 0, 0),
              this.gl.clear(this.gl.COLOR_BUFFER_BIT),
              (this.canvas.style.backgroundImage = ''));
          },
        },
        {
          key: 'render',
          value: function () {
            var e,
              t,
              i,
              r = this,
              n = Date.now();
            (i = function () {
              var o = r.track.getSettings();
              r.frameRate = o.frameRate || 15;
              var s = 1e3 / r.frameRate;
              (r.rafId && cancelAnimationFrame(r.rafId),
                (r.rafId = requestAnimationFrame(i)),
                (e = Date.now()),
                (t = e - n) > s &&
                  ((n = e - t / s),
                  r.canCopyVideo &&
                    (r.updateTexture(r.gl, r.textures[0], r.video),
                    r.setCanvasBgImage(),
                    r.canUpdateBackground() &&
                      r.updateTexture(
                        r.gl,
                        r.textures[1],
                        r.virtualBackground
                      )),
                  r.gl.clear(r.gl.COLOR_BUFFER_BIT),
                  r.gl.viewport(0, 0, r.canvas.width, r.canvas.height),
                  r.gl.drawArrays(r.gl.TRIANGLE_STRIP, 0, 4)));
            })();
          },
        },
        {
          key: 'initVirtualBackground',
          value: function (e) {
            if (e) {
              if ('IMG' === e.nodeName) {
                var t = new Image();
                ((t.src = e.src), (this.virtualBackground = t));
              } else if ('VIDEO' === e.nodeName) {
                var i = document.createElement('video');
                ((i.playsInline = !0),
                  (i.muted = !0),
                  (i.loop = !0),
                  (i.src = e.src),
                  i.play(),
                  (this.virtualBackground = i),
                  this.setupVideo(this.video, 'canCopyBackground'));
              }
            } else this.virtualBackground = null;
          },
        },
        {
          key: 'initCanvas',
          value: function () {
            ((this.canvas = document.createElement('canvas')),
              this.canvas
                ? ((this.canvas.width = this.div.clientWidth),
                  (this.canvas.height = this.div.clientHeight),
                  (this.canvas.style.objectFit = this.video.style.objectFit),
                  (this.canvas.style.width = '100%'),
                  (this.canvas.style.height = '100%'),
                  this.isEleLisenter && this.addDivListener(),
                  this.div.appendChild(this.canvas))
                : this.log.warn('Failed to retrieve the <canvas> element'));
          },
        },
        {
          key: 'resize',
          value: function () {
            var e = this.canvas.width,
              t = this.div.clientHeight,
              i = this.div.clientWidth;
            (t !== this.canvas.height && (this.canvas.height = t),
              i !== e && (this.canvas.width = i));
          },
        },
        {
          key: 'addDivListener',
          value: function () {
            ((this.observer = new ResizeObserver(this.resize.bind(this))),
              this.observer.observe(this.div));
          },
        },
        {
          key: 'setCanvasBgImage',
          value: function () {
            this.canvas.style.backgroundImage ||
              (this.virtualBackground &&
                !this.virtualBackgroundMix &&
                ((this.canvas.style.backgroundImage = 'url('.concat(
                  this.virtualBackground.src,
                  ')'
                )),
                (this.canvas.style.backgroundRepeat = 'no-repeat'),
                (this.canvas.style.backgroundSize = 'cover')));
          },
        },
        {
          key: 'setupVideo',
          value: function (e, t) {
            var i = this,
              r = !1,
              n = !1;
            (e.addEventListener(
              'playing',
              function () {
                ((r = !0), o());
              },
              !0
            ),
              e.addEventListener(
                'timeupdate',
                function () {
                  ((n = !0), o());
                },
                !0
              ));
            var o = function () {
              r && n && (i[t] = !0);
            };
          },
        },
        {
          key: 'canUpdateBackground',
          value: function () {
            return (
              !(!this.virtualBackground || !this.virtualBackgroundMix) &&
              ('IMG' === this.virtualBackground.nodeName
                ? this.virtualBackground.complete
                : this.canCopyBackground)
            );
          },
        },
        {
          key: 'initVertexBuffers',
          value: function (e) {
            var t = new Float32Array([
                -1, 1, 0, 1, -1, -1, 0, 0, 1, 1, 1, 1, 1, -1, 1, 0,
              ]),
              i = t.BYTES_PER_ELEMENT,
              r = e.createBuffer();
            if (!r)
              return (this.log.warn('Failed to create vertex buffer'), -1);
            (e.bindBuffer(e.ARRAY_BUFFER, r),
              e.bufferData(e.ARRAY_BUFFER, t, e.STATIC_DRAW));
            var n = e.getAttribLocation(e.program, 'a_Position');
            if (n < 0)
              return (
                this.log.warn(
                  'Failed to get the storage location of a_Position'
                ),
                -1
              );
            (e.vertexAttribPointer(n, 2, e.FLOAT, !1, 4 * i, 0),
              e.enableVertexAttribArray(n));
            var o = e.getAttribLocation(e.program, 'a_TexCoord');
            return o < 0
              ? (this.log.warn(
                  'Failed to get the storage location of a_TexCoord'
                ),
                -1)
              : (e.vertexAttribPointer(o, 2, e.FLOAT, !1, 4 * i, 2 * i),
                e.enableVertexAttribArray(o),
                4);
          },
        },
        {
          key: 'initTextures',
          value: function (e, t) {
            var i,
              r,
              n = e.createTexture();
            if (!n)
              return (
                this.log.warn('Failed to create the texture object'),
                null
              );
            if (0 === t) {
              if (!(i = e.getUniformLocation(e.program, 'u_Sampler0')))
                return (
                  this.log.warn(
                    'Failed to get the storage location of u_Sampler'
                  ),
                  null
                );
            } else if (!(r = e.getUniformLocation(e.program, 'u_Sampler1')))
              return (
                this.log.warn(
                  'Failed to get the storage location of u_Sampler'
                ),
                null
              );
            return (
              e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL, 1),
              e.activeTexture(0 === t ? e.TEXTURE0 : e.TEXTURE1),
              e.bindTexture(e.TEXTURE_2D, n),
              e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.CLAMP_TO_EDGE),
              e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.CLAMP_TO_EDGE),
              e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.LINEAR),
              e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MAG_FILTER, e.LINEAR),
              0 === t ? e.uniform1i(i, 0) : e.uniform1i(r, 1),
              n
            );
          },
        },
        {
          key: 'updateTexture',
          value: function (e, t, i) {
            var r = e.RGBA,
              n = e.RGBA,
              o = e.UNSIGNED_BYTE;
            (e.bindTexture(e.TEXTURE_2D, t),
              e.texImage2D(e.TEXTURE_2D, 0, r, n, o, i));
          },
        },
        {
          key: 'initXShaderSource',
          value: function () {
            return {
              VSHADER:
                'attribute vec4 a_Position;\nattribute vec2 a_TexCoord;\nvarying vec2 v_TexCoord;\nvoid main() {\ngl_Position = a_Position;\nv_TexCoord = a_TexCoord;\n}\n',
              FSHADER:
                this.virtualBackground && this.virtualBackgroundMix
                  ? 'precision mediump float;\nuniform sampler2D u_Sampler0;\nuniform sampler2D u_Sampler1;\nvarying vec2 v_TexCoord;\nvoid main() {\nvec2 true_pixel_coord = vec2(v_TexCoord.x, (0.5 + (v_TexCoord.y / 2.))); \nvec2 mask_pexel_coord = vec2(v_TexCoord.x, v_TexCoord.y / 2.); \nfloat alpha = texture2D(u_Sampler0, mask_pexel_coord).r; \nvec3 rgb = texture2D(u_Sampler0, true_pixel_coord).rgb*alpha;\nvec4 videoColor = vec4(rgb, alpha);\nvec4 imgColor = vec4(texture2D(u_Sampler1, v_TexCoord).rgb*(1.0-alpha),1.0-alpha);\ngl_FragColor = imgColor + videoColor;\n}\n'
                  : 'precision mediump float;\nuniform sampler2D u_Sampler0;\nvarying vec2 v_TexCoord;\nvoid main() {\nvec2 true_pixel_coord = vec2(v_TexCoord.x, (0.5 + (v_TexCoord.y / 2.))); \nvec2 mask_pexel_coord = vec2(v_TexCoord.x, v_TexCoord.y / 2.); \nfloat alpha = texture2D(u_Sampler0, mask_pexel_coord).r; \nvec3 rgb = texture2D(u_Sampler0, true_pixel_coord).rgb*alpha;\nvec4 videoColor = vec4(rgb, alpha);\ngl_FragColor = videoColor;\n}\n',
            };
          },
        },
      ]),
      e
    );
  })(),
  ye = (function () {
    function e(t) {
      (_(this, e),
        (this.stream = t.stream),
        (this.userId = t.stream.userId),
        (this.log = t.stream.logger),
        (this.track = t.track),
        (this.div = t.div),
        (this.muted = t.muted),
        (this.objectFit = t.objectFit),
        (this.mirror = t.mirror),
        (this.element = null),
        (this.state = 'NONE'),
        (this.pausedRetryCount = 5),
        (this.isEleLisenter = t.isEleLisenter),
        (this._emitter = new P()),
        (this.handleEleEventPlaying = this.eleEventPlaying.bind(this)),
        (this.handleEleEventEnded = this.eleEventEnded.bind(this)),
        (this.handleEleEventPause = this.eleEventPause.bind(this)),
        (this.handleTrackEventEnded = this.trackEventEnded.bind(this)),
        (this.handleTrackEventMute = this.trackEventMute.bind(this)),
        (this.handleTrackEventUnmute = this.trackEventUnmute.bind(this)),
        (this.isAlphaChannels = t.isAlphaChannels || !1),
        (this.virtualBackground = t.virtualBackground),
        (this.virtualBackgroundMix = t.virtualBackgroundMix),
        this.initializeElement(),
        this.isAlphaChannels && this.startTexturesPlayer());
    }
    var t;
    return (
      O(e, [
        {
          key: 'initializeElement',
          value: function () {
            var e = new MediaStream();
            e.addTrack(this.track);
            var t = document.createElement('video');
            ((t.srcObject = e), (t.muted = !0));
            var i = 'width: 100%; height: 100%; object-fit: '.concat(
              this.objectFit,
              ';'
            );
            (this.mirror && (i += 'transform: rotateY(180deg);'),
              t.setAttribute(
                'id',
                'video_'.concat(this.stream.getId(), '_').concat(Date.now())
              ),
              t.setAttribute('style', i),
              t.setAttribute('autoplay', 'autoplay'),
              t.setAttribute('playsinline', 'playsinline'),
              (this.div.style.lineHeight = '0'),
              this.div.appendChild(t),
              (this.element = t),
              this.handleEvents());
          },
        },
        {
          key: 'play',
          value:
            ((t = T(
              A.mark(function e() {
                var t = this;
                return A.wrap(function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        return e.abrupt(
                          'return',
                          new Promise(function (e, i) {
                            t.element
                              .play()
                              .then(function () {
                                (t.element.pause(), e());
                              })
                              .catch(function (e) {
                                i(e);
                              });
                          })
                        );
                      case 1:
                      case 'end':
                        return e.stop();
                    }
                }, e);
              })
            )),
            function () {
              return t.apply(this, arguments);
            }),
        },
        {
          key: 'handleEvents',
          value: function () {
            var e, t, i;
            (null === (e = this.element) ||
              void 0 === e ||
              e.addEventListener('playing', this.handleEleEventPlaying),
              null === (t = this.element) ||
                void 0 === t ||
                t.addEventListener('ended', this.handleEleEventEnded),
              null === (i = this.element) ||
                void 0 === i ||
                i.addEventListener('pause', this.handleEleEventPause),
              this.trackHandleEvents());
          },
        },
        {
          key: 'trackHandleEvents',
          value: function () {
            var e, t, i;
            (null === (e = this.track) ||
              void 0 === e ||
              e.addEventListener('ended', this.handleTrackEventEnded),
              null === (t = this.track) ||
                void 0 === t ||
                t.addEventListener('mute', this.handleTrackEventMute),
              null === (i = this.track) ||
                void 0 === i ||
                i.addEventListener('unmute', this.handleTrackEventUnmute));
          },
        },
        {
          key: 'trackRemoveEvents',
          value: function () {
            var e, t, i;
            (null === (e = this.track) ||
              void 0 === e ||
              e.removeEventListener('ended', this.handleTrackEventEnded),
              null === (t = this.track) ||
                void 0 === t ||
                t.removeEventListener('mute', this.handleTrackEventMute),
              null === (i = this.track) ||
                void 0 === i ||
                i.removeEventListener('unmute', this.handleTrackEventUnmute));
          },
        },
        {
          key: 'removeEvents',
          value: function () {
            var e, t, i;
            (null === (e = this.element) ||
              void 0 === e ||
              e.removeEventListener('playing', this.handleEleEventPlaying),
              null === (t = this.element) ||
                void 0 === t ||
                t.removeEventListener('ended', this.handleEleEventEnded),
              null === (i = this.element) ||
                void 0 === i ||
                i.removeEventListener('pause', this.handleEleEventPause),
              this.trackRemoveEvents());
          },
        },
        {
          key: 'stop',
          value: function () {
            (this.removeEvents(),
              this.div.removeChild(this.element),
              (this.element.srcObject = null),
              (this.element = null),
              this.isAlphaChannels && this.texturesPlayer.stop(),
              (this.isAlphaChannels = !1));
          },
        },
        {
          key: 'resume',
          value: function () {
            var e;
            return null === (e = this.element) || void 0 === e
              ? void 0
              : e.play();
          },
        },
        {
          key: 'getVideoFrame',
          value: function () {
            var e,
              t,
              i = document.createElement('canvas');
            ((i.width =
              null === (e = this.element) || void 0 === e
                ? void 0
                : e.videoWidth),
              (i.height =
                null === (t = this.element) || void 0 === t
                  ? void 0
                  : t.videoHeight));
            var r = null;
            return (
              this.isAlphaChannels
                ? ((r = this.texturesPlayer.canvas),
                  (i.height = i.height / 2),
                  i
                    .getContext('2d')
                    .drawImage(
                      r,
                      0,
                      0,
                      r.width,
                      r.height,
                      0,
                      0,
                      i.width,
                      i.height
                    ))
                : ((r = this.element), i.getContext('2d').drawImage(r, 0, 0)),
              i.toDataURL('image/png')
            );
          },
        },
        {
          key: 'getVideoElement',
          value: function () {
            return this.element;
          },
        },
        {
          key: 'setVideoTrack',
          value: function (e) {
            this.trackRemoveEvents();
            var t = new MediaStream();
            (t.addTrack(e),
              (this.track = e),
              this.trackHandleEvents(),
              this.log.info('setVideoTrack', e),
              this.element &&
                ((this.element.srcObject = t), this.element.play()));
          },
        },
        {
          key: 'unmute',
          value: function () {
            this.isAlphaChannels && this.texturesPlayer.unmute();
          },
        },
        {
          key: 'mute',
          value: function () {
            this.isAlphaChannels && this.texturesPlayer.mute();
          },
        },
        {
          key: 'startTexturesPlayer',
          value: function () {
            ((this.element.style.position = 'absolute'),
              (this.element.style.width = '0'),
              (this.element.style.height = '0'),
              (this.element.style.zIndex = '-1'),
              (this.texturesPlayer = new Se(
                {
                  div: this.div,
                  video: this.element,
                  track: this.track,
                  virtualBackground: this.virtualBackground,
                  virtualBackgroundMix: this.virtualBackgroundMix,
                  isEleLisenter: this.isEleLisenter,
                },
                this.log
              )),
              this.texturesPlayer.play());
          },
        },
        {
          key: 'resize',
          value: function () {
            this.texturesPlayer.resize();
          },
        },
        {
          key: 'eleEventPlaying',
          value: function () {
            (this.log.info(
              'stream '.concat(
                this.userId,
                ' - video player is starting playing'
              )
            ),
              (this.state = 'PLAYING'),
              this._emitter.emit('player-state-changed', {
                state: this.state,
                reason: 'playing',
              }));
          },
        },
        {
          key: 'eleEventEnded',
          value: function () {
            (this.log.info(
              'stream '.concat(this.userId, ' - video player is ended')
            ),
              'STOPPED' !== this.state &&
                ((this.state = 'STOPPED'),
                this._emitter.emit('player-state-changed', {
                  state: this.state,
                  reason: 'ended',
                })));
          },
        },
        {
          key: 'eleEventPause',
          value: function () {
            (this.log.info(
              'stream '.concat(this.userId, ' - video player is paused')
            ),
              (this.state = 'PAUSED'),
              this._emitter.emit('player-state-changed', {
                state: this.state,
                reason: 'pause',
              }),
              this.div && document.getElementById(this.div.id)
                ? this.pausedRetryCount > 0 &&
                  (this.log.info(
                    'video resume when video paused count:' +
                      this.pausedRetryCount
                  ),
                  this.resume(),
                  this.pausedRetryCount--)
                : this.log.warn('video container is not in DOM'));
          },
        },
        {
          key: 'trackEventEnded',
          value: function () {
            (this.log.info(
              'stream '.concat(this.userId, ' - video player track is ended')
            ),
              'STOPPED' !== this.state &&
                ((this.state = 'STOPPED'),
                this._emitter.emit('player-state-changed', {
                  state: this.state,
                  reason: 'ended',
                  type: 'track',
                })));
          },
        },
        {
          key: 'trackEventMute',
          value: function () {
            (this.log.info(
              'stream '.concat(this.userId, ' - video track is muted')
            ),
              'PAUSED' !== this.state &&
                ((this.state = 'PAUSED'),
                this._emitter.emit('player-state-changed', {
                  state: this.state,
                  reason: 'mute',
                  type: 'track',
                })));
          },
        },
        {
          key: 'trackEventUnmute',
          value: function () {
            (this.log.info(
              'stream '.concat(this.userId, ' - video track is unmuted')
            ),
              'PAUSED' === this.state &&
                ((this.state = 'PLAYING'),
                this._emitter.emit('player-state-changed', {
                  state: this.state,
                  reason: 'unmute',
                  type: 'track',
                })));
          },
        },
      ]),
      e
    );
  })(),
  Ee = ee(),
  Ce = Ee.browser,
  Ie = Ee.version;
function Te(e) {
  switch (e) {
    case he.ForwardStream:
      return 'forward';
    case he.MixedStream:
      return 'mixed';
  }
  return '';
}
function Re(e) {
  return 'forward' == e
    ? he.ForwardStream
    : 'mixed' == e
      ? he.MixedStream
      : he.Invalid;
}
function _e(e) {
  switch (e) {
    case me.Microphone:
      return 'mic';
    case me.ScreenShare:
      return 'screen';
    case me.File:
      return 'file';
  }
  return '';
}
function ke(e) {
  return 'mic' == e
    ? me.Microphone
    : 'screen' == e
      ? me.ScreenShare
      : 'file' == e
        ? me.File
        : me.Unknown;
}
function Oe(e) {
  switch (e) {
    case ge.Camera:
      return 'camera';
    case ge.ScreenShare:
      return 'screen';
    case ge.File:
      return 'file';
  }
  return '';
}
function we(e) {
  return 'camera' == e
    ? ge.Camera
    : 'screen' == e
      ? ge.ScreenShare
      : 'file' == e
        ? ge.File
        : ge.Unknown;
}
function Ae(e) {
  switch (e) {
    case ve.BigStream:
      return 'h';
    case ve.MiddleStream:
      return 'm';
    case ve.SmallStream:
      return 'l';
  }
  return '';
}
function Pe(e) {
  return 'h' == e
    ? ve.BigStream
    : 'm' == e
      ? ve.MiddleStream
      : 'l' == e
        ? ve.SmallStream
        : ve.Invalid;
}
(!(function (e) {
  ((e[(e.Failed = 0)] = 'Failed'),
    (e[(e.Success = 1)] = 'Success'),
    (e[(e.Timeout = 2)] = 'Timeout'));
})(oe || (oe = {})),
  (function (e) {
    ((e[(e.Unknown = 0)] = 'Unknown'),
      (e[(e.ActivelyLeave = 1)] = 'ActivelyLeave'),
      (e[(e.RoomDissolved = 2)] = 'RoomDissolved'),
      (e[(e.RepeatLogin = 3)] = 'RepeatLogin'));
  })(se || (se = {})),
  (function (e) {
    ((e[(e.Normal = 0)] = 'Normal'),
      (e[(e.Timeout = 1)] = 'Timeout'),
      (e[(e.Kick = 2)] = 'Kick'),
      (e[(e.RepeatLogin = 3)] = 'RepeatLogin'),
      (e[(e.RoomDissolved = 4)] = 'RoomDissolved'));
  })(ae || (ae = {})),
  (function (e) {
    ((e[(e.Unknown = 0)] = 'Unknown'),
      (e[(e.Kicked = 1)] = 'Kicked'),
      (e[(e.RepeatLogin = 2)] = 'RepeatLogin'),
      (e[(e.RoomDissolved = 3)] = 'RoomDissolved'));
  })(ce || (ce = {})),
  (function (e) {
    ((e[(e.New = 0)] = 'New'),
      (e[(e.ConnectionConnected = 1)] = 'ConnectionConnected'),
      (e[(e.ConnectionLost = 2)] = 'ConnectionLost'),
      (e[(e.ConnectionRetring = 3)] = 'ConnectionRetring'),
      (e[(e.ConnectionRecovery = 4)] = 'ConnectionRecovery'));
  })(ue || (ue = {})),
  (function (e) {
    ((e[(e.ParticipantJoin = 0)] = 'ParticipantJoin'),
      (e[(e.ParticipantLeave = 1)] = 'ParticipantLeave'),
      (e[(e.StreamAdd = 2)] = 'StreamAdd'),
      (e[(e.StreamUpdate = 3)] = 'StreamUpdate'),
      (e[(e.StreamRemove = 4)] = 'StreamRemove'),
      (e[(e.Drop = 5)] = 'Drop'),
      (e[(e.PermissionChange = 6)] = 'PermissionChange'),
      (e[(e.MuteLocal = 7)] = 'MuteLocal'));
  })(de || (de = {})),
  (function (e) {
    ((e[(e.AudioMute = 0)] = 'AudioMute'),
      (e[(e.VideoMute = 1)] = 'VideoMute'),
      (e[(e.AudioUnmute = 2)] = 'AudioUnmute'),
      (e[(e.VideoUnmute = 3)] = 'VideoUnmute'),
      (e[(e.Kick = 4)] = 'Kick'));
  })(le || (le = {})),
  (function (e) {
    ((e[(e.Invalid = 0)] = 'Invalid'),
      (e[(e.ForwardStream = 1)] = 'ForwardStream'),
      (e[(e.MixedStream = 2)] = 'MixedStream'));
  })(he || (he = {})),
  (function (e) {
    ((e[(e.Invalid = 0)] = 'Invalid'),
      (e[(e.AudioOnly = 1)] = 'AudioOnly'),
      (e[(e.VideoOnly = 2)] = 'VideoOnly'),
      (e[(e.AudioVideo = 3)] = 'AudioVideo'));
  })(pe || (pe = {})),
  (function (e) {
    ((e[(e.Normal = 0)] = 'Normal'), (e[(e.Shadow = 1)] = 'Shadow'));
  })(fe || (fe = {})),
  (function (e) {
    ((e[(e.Unknown = 0)] = 'Unknown'),
      (e[(e.Microphone = 1)] = 'Microphone'),
      (e[(e.ScreenShare = 2)] = 'ScreenShare'),
      (e[(e.File = 3)] = 'File'));
  })(me || (me = {})),
  (function (e) {
    ((e[(e.Unknown = 0)] = 'Unknown'),
      (e[(e.Camera = 1)] = 'Camera'),
      (e[(e.ScreenShare = 2)] = 'ScreenShare'),
      (e[(e.File = 3)] = 'File'));
  })(ge || (ge = {})),
  (function (e) {
    ((e[(e.Invalid = 0)] = 'Invalid'),
      (e[(e.BigStream = 1)] = 'BigStream'),
      (e[(e.MiddleStream = 2)] = 'MiddleStream'),
      (e[(e.SmallStream = 3)] = 'SmallStream'));
  })(ve || (ve = {})),
  (function (e) {
    ((e[(e.Amute = 0)] = 'Amute'),
      (e[(e.Aunmute = 1)] = 'Aunmute'),
      (e[(e.Vmute = 2)] = 'Vmute'),
      (e[(e.Vunmute = 3)] = 'Vunmute'));
  })(be || (be = {})));
var Le = {
    TOP_ERROR: 8801,
    SET_LOG_LEVEL: 3001,
    ENABLE_UPLOAD_LOG: 3002,
    DISABLE_UPLOAD_LOG: 3003,
    JOIN: 3004,
    JOIN_FIRST: 8001,
    JOIN_SUCCESS: 1103,
    JOIN_FAILED: 1104,
    LEAVE: 3007,
    LEAVE_SUCCESS: 3008,
    LEAVE_FAILED: 3009,
    SWITCH_ROLE_ANCHOR: 3010,
    SWITCH_ROLE_AUDIENCE: 3011,
    SWITCH_ROLE_ANCHOR_SUCCESS: 3012,
    SWITCH_ROLE_ANCHOR_FAILED: 3013,
    SWITCH_ROLE_AUDIENCE_SUCCESS: 3014,
    SWITCH_ROLE_AUDIENCE_FAILED: 3015,
    PUBLISH_STREAM: 3016,
    PUBLISH_STREAM_SCREEN: 3017,
    PUBLISH_STREAM_SUCCESS: 3018,
    PUBLISH_STREAM_FAILED: 3019,
    PUBLISH_STREAM_SCREEN_SUCCESS: 3020,
    PUBLISH_STREAM_SCREEN_FAILED: 3021,
    UNPUBLISH_STREAM: 3022,
    UNPUBLISH_STREAM_SCREEN: 3023,
    UNPUBLISH_STREAM_SUCCESS: 3024,
    UNPUBLISH_STREAM_FAILED: 3025,
    UNPUBLISH_STREAM_SCREEN_SUCCESS: 3026,
    UNPUBLISH_STREAM_SCREEN_FAILED: 3027,
    SUBSCRIBE_STREAM: 3028,
    SUBSCRIBE_STREAM_SCREEN: 3029,
    SUBSCRIBE_STREAM_SUCCESS: 3030,
    SUBSCRIBE_STREAM_FAILED: 3031,
    SUBSCRIBE_STREAM_SCREEN_SUCCESS: 3032,
    SUBSCRIBE_STREAM_SCREEN_FAILED: 3033,
    UNSUBSCRIBE_STREAM: 3034,
    UNSUBSCRIBE_STREAM_SCREEN: 3035,
    UNSUBSCRIBE_STREAM_SUCCESS: 3036,
    UNSUBSCRIBE_STREAM_FAILED: 3037,
    UNSUBSCRIBE_STREAM_SCREEN_SUCCESS: 3038,
    UNSUBSCRIBE_STREAM_SCREEN_FAILED: 3039,
    HAS_PUBLISHED_STREAM: 3040,
    GET_CLIENT_STATE: 3041,
    GET_REMOTE_MUTED_STATE: 3042,
    ENABLE_AUDIO_VOLUME_EVALUATION: 3043,
    ENABLE_SMALL_STREAM: 3044,
    DISABLE_SMALL_STREAM: 3045,
    SET_SMALL_STREAM_PROFILE: 3046,
    SET_REMOTE_VIDEO_STREAM_TYPE_SAMLL: 3047,
    SET_REMOTE_VIDEO_STREAM_TYPE_BIG: 3048,
    SET_REMOTE_VIDEO_STREAM_TYPE_SAMLL_SUCCESS: 3049,
    SET_REMOTE_VIDEO_STREAM_TYPE_SAMLL_FAILED: 3050,
    SET_REMOTE_VIDEO_STREAM_TYPE_BIG_SUCCESSE: 3051,
    SET_REMOTE_VIDEO_STREAM_TYPE_BIG_FAILED: 3052,
    UPDATE_SIMULCAST: 3053,
    UPDATE_SIMULCAST_SUCCESSE: 3054,
    UPDATE_SIMULCAST_FAILED: 3055,
    PLAY_LOCAL_VIDEO: 3056,
    PLAY_LOCAL_AUDIO: 3057,
    PLAY_LOCAL_VIDEO_SCREEN: 3058,
    PLAY_LOCAL_AUDIO_SCREEN: 3059,
    PLAY_REMOTE_VIDEO: 3060,
    PLAY_REMOTE_AUDIO: 3061,
    PLAY_REMOTE_VIDEO_SCREEN: 3062,
    PLAY_REMOTE_AUDIO_SCREEN: 3063,
    STOP_LOCAL_VIDEO: 3064,
    STOP_LOCAL_AUDIO: 3065,
    STOP_LOCAL_VIDEO_SCREEN: 3066,
    STOP_LOCAL_AUDIO_SCREEN: 3067,
    STOP_REMOTE_VIDEO: 3068,
    STOP_REMOTE_AUDIO: 3069,
    STOP_REMOTE_VIDEO_SCREEN: 3070,
    STOP_REMOTE_AUDIO_SCREEN: 3071,
    RESUME_LOCAL_VIDEO: 3072,
    RESUME_LOCAL_AUDIO: 3073,
    RESUME_LOCAL_VIDEO_SCREEN: 3074,
    RESUME_LOCAL_AUDIO_SCREEN: 3075,
    RESUME_REMOTE_VIDEO: 3076,
    RESUME_REMOTE_AUDIO: 3077,
    RESUME_REMOTE_VIDEO_SCREEN: 3078,
    RESUME_REMOTE_AUDIO_SCREEN: 3079,
    CLOSE_LOCAL_VIDEO: 3080,
    CLOSE_LOCAL_AUDIO: 3081,
    CLOSE_LOCAL_VIDEO_SCREEN: 3082,
    CLOSE_LOCAL_AUDIO_SCREEN: 3083,
    CLOSE_REMOTE_VIDEO: 3084,
    CLOSE_REMOTE_AUDIO: 3085,
    CLOSE_REMOTE_VIDEO_SCREEN: 3086,
    CLOSE_REMOTE_AUDIO_SCREEN: 3087,
    MUTE_LOCAL_AUDIO: 3088,
    MUTE_LOCAL_AUDIO_SCREEN: 3089,
    MUTE_REMOTE_AUDIO: 3090,
    MUTE_REMOTE_AUDIO_SCREEN: 3091,
    MUTE_LOCAL_VIDEO: 3092,
    MUTE_LOCAL_VIDEO_SCREEN: 3093,
    MUTE_REMOTE_VIDEO: 3094,
    MUTE_REMOTE_VIDEO_SCREEN: 3095,
    UNMUTE_LOCAL_AUDIO: 3096,
    UNMUTE_LOCAL_AUDIO_SCREEN: 3097,
    UNMUTE_REMOTE_AUDIO: 3098,
    UNMUTE_REMOTE_AUDIO_SCREEN: 3099,
    UNMUTE_LOCAL_VIDEO: 3100,
    UNMUTE_LOCAL_VIDEO_SCREEN: 3101,
    UNMUTE_REMOTE_VIDEO: 3102,
    UNMUTE_REMOTE_VIDEO_SCREEN: 3103,
    GET_LOCAL_ID: 3104,
    GET_REMOTE_ID: 3105,
    GET_LOCAL_USER_ID: 3106,
    GET_REMOTE_USER_ID: 3107,
    SET_AUDIO_OUTPUT: 3108,
    SET_LOCAL_AUDIO_VOLUME: 3109,
    SET_LOCAL_AUDIO_VOLUME_SCREEN: 3110,
    SET_REMOTE_AUDIO_VOLUME: 3111,
    SET_REMOTE_AUDIO_VOLUME_SCREEN: 3112,
    GET_LOCAL_AUDIO_LEVEL: 3113,
    GET_LOCAL_AUDIO_LEVEL_SCREEN: 3114,
    GET_REMOTE_AUDIO_LEVEL: 3115,
    GET_REMOTE_AUDIO_LEVEL_SCREEN: 3116,
    HAS_LOCAL_AUDIO: 3117,
    HAS_LOCAL_AUDIO_SCREEN: 3118,
    HAS_REMOTE_AUDIO: 3119,
    HAS_REMOTE_AUDIO_SCREEN: 3120,
    HAS_LOCAL_VIDEO: 3121,
    HAS_LOCAL_VIDEO_SCREEN: 3122,
    HAS_REMOTE_VIDEO: 3123,
    HAS_REMOTE_VIDEO_SCREEN: 3124,
    GET_LCOAL_AUDIO_TRACK: 3125,
    GET_LCOAL_AUDIO_TRACK_SCREEN: 3126,
    GET_REMOTE_AUDIO_TRACK: 3127,
    GET_REMOTE_AUDIO_TRACK_SCREEN: 3128,
    GET_LCOAL_VIDEO_TRACK: 3129,
    GET_LCOAL_VIDEO_TRACK_SCREEN: 3130,
    GET_REMOTE_VIDEO_TRACK: 3131,
    GET_REMOTE_VIDEO_TRACK_SCREEN: 3132,
    GET_LCOAL_VIDEO_FRAME: 3133,
    GET_LCOAL_VIDEO_FRAME_SCREEN: 3134,
    GET_REMOTE_VIDEO_FRAME: 3135,
    GET_REMOTE_VIDEO_FRAME_SCREEN: 3136,
    GET_LCOAL_TYPE: 3137,
    GET_REMOTE_TYPE: 3138,
    GET_LOCAL_AUDIO_ELEMENT: 3139,
    GET_LOCAL_AUDIO_ELEMENT_SCREEN: 3140,
    GET_REMOTE_AUDIO_ELEMENT: 3141,
    GET_REMOTE_AUDIO_ELEMENT_SCREEN: 3142,
    GET_LOCAL_VIDEO_ELEMENT: 3143,
    GET_LOCAL_VIDEO_ELEMENT_SCREEN: 3144,
    GET_REMOTE_VIDEO_ELEMENT: 3145,
    GET_REMOTE_VIDEO_ELEMENT_SCREEN: 3146,
    SET_AUDIO_PROFILE: 3147,
    SET_VIDEO_PROFILE: 3148,
    SET_SCREEN_PROFILE: 3149,
    SET_VIDEO_CONTENT_HINT: 3150,
    SWITCH_DEVICE_AUDIO: 3151,
    SWITCH_DEVICE_VIDEO: 3152,
    ADD_AUDIO_TRACK: 3153,
    ADD_AUDIO_TRACK_SCREEN: 3154,
    ADD_VIDEO_TRACK: 3155,
    ADD_VIDEO_TRACK_SCREEN: 3156,
    REMOVE_TRACK: 3157,
    REMOVE_TRACK_SCREEN: 3158,
    REPLACE_AUDIO_TRACK: 3159,
    REPLACE_AUDIO_TRACK_SCREEN: 3160,
    REPLACE_VIDEO_TRACK: 3161,
    REPLACE_VIDEO_TRACK_SCREEN: 3162,
    GET_DEVICES_INFO_IN_USE: 3163,
    ON_STREAM_ADDED: 3164,
    ON_STREAM_ADDED_SCREEN: 3165,
    ON_STREAM_REMOVED: 3166,
    ON_STREAM_REMOVED_SCREEN: 3167,
    ON_STREAM_UPDATED: 3168,
    ON_STREAM_UPDATED_SCREEN: 3169,
    ON_STREAM_SUBSCRIBED: 3170,
    ON_STREAM_SUBSCRIBED_SCREEN: 3171,
    ON_PEER_JOIN: 3172,
    ON_PEER_LEVAE: 3173,
    ON_MUTE_AUDIO: 3174,
    ON_MUTE_AUDIO_SCREEN: 3175,
    ON_MUTE_VIDEO: 3176,
    ON_MUTE_VIDEO_SCREEN: 3177,
    ON_UNMUTE_AUDIO: 3178,
    ON_UNMUTE_AUDIO_SCREEN: 3179,
    ON_UNMUTE_VIDEO: 3180,
    ON_UNMUTE_VIDEO_SCREEN: 3181,
    ON_CLIENT_BANNED: 3182,
    ON_CAMERA_CHANGED: 3183,
    ON_RECORDING_DEVICE_CHANGED: 3184,
    ON_PLAYBACK_DEVICE_CHANGED: 3185,
    ON_ERROR: 3186,
    OFF_STREAM_ADDED: 3187,
    OFF_STREAM_REMOVED: 3188,
    OFF_STREAM_UPDATED: 3189,
    OFF_STREAM_SUBSCRIBED: 3190,
    OFF_CONNECTION_STATE_CHANGED: 3191,
    OFF_PEER_JOIN: 3192,
    OFF_PEER_LEVAE: 3193,
    OFF_MUTE_AUDIO: 3194,
    OFF_MUTE_VIDEO: 3195,
    OFF_UNMUTE_VIDEO: 3196,
    OFF_CLIENT_BANNED: 3197,
    OFF_CAMERA_CHANGED: 3198,
    OFF_RECORDING_DEVICE_CHANGED: 3199,
    OFF_PLAYBACK_DEVICE_CHANGED: 3200,
    OFF_NETWORK_QUALITY: 3201,
    OFF_AUDIO_VOLUME: 3202,
    OFF_ERROR: 3203,
    ON_PLAYER_STATE_CHANGED: 3204,
    ON_SCREEN_SHARING_STOPPED: 3205,
    ON_STREAM_ERROR: 3206,
    CONNECTIONLOST_CB: 3207,
    TRY_TO_RECONNECT_CB: 3208,
    CONNECTION_RECOVERY_CB: 3209,
  },
  De = {
    VUBIT: 2001,
    VDBIT: 2002,
    AUBIT: 2003,
    ADBIT: 2004,
    VULOSS: 2005,
    VDLOSS: 2006,
    AULOSS: 2007,
    ADLOSS: 2008,
    VURTT: 2009,
    VDRTT: 2010,
    AURTT: 2011,
    ADRTT: 2012,
    VUFPS: 2013,
    VDFPS: 2014,
    AUFPS: 2015,
    ADFPS: 2016,
    VUBLOCK: 2017,
    VDBLOCK: 2018,
    AUBLOCK: 2019,
    ADBLOCK: 2020,
    VUWIDTHHEIGHT: 2021,
    VDWIDTHHEIGHT: 2022,
    APPCPU: 2023,
    SYSCPU: 2024,
  };
function xe(e, t) {
  var i = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      i.push.apply(i, r));
  }
  return i;
}
function Me(e) {
  for (var t = 1; t < arguments.length; t++) {
    var i = null != arguments[t] ? arguments[t] : {};
    t % 2
      ? xe(Object(i), !0).forEach(function (t) {
          S(e, t, i[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(i))
        : xe(Object(i)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(i, t));
          });
  }
  return e;
}
var Ue = Me(Me({}, Le), De);
function Ne() {
  var e,
    t,
    i = navigator.userAgent.toLocaleLowerCase();
  if (-1 != i.indexOf('firefox')) e = 'Firefox';
  else if (-1 != i.indexOf('trident'))
    ((e = 'IE'), -1 == i.indexOf('ie') && (t = 11));
  else if (-1 != i.indexOf('opr')) e = 'OPR';
  else if (-1 != i.indexOf('edge')) e = 'Edge';
  else if (-1 != i.indexOf('chrome')) e = 'Chrome';
  else if (-1 != i.indexOf('safari')) {
    var r;
    ((e = 'Safari'),
      (r = (r = i.indexOf('version')) + 7 + 1),
      (t = parseInt(i.slice(r, r + 3))));
  } else e = '未知浏览器';
  return (
    void 0 === t &&
      ((r = (r = i.indexOf(e.toLocaleLowerCase())) + e.length + 1),
      (t = parseInt(i.slice(r, r + 3)))),
    { browser: e, version: t }
  );
}
function Ve() {
  return (
    ['RTCPeerConnection', 'webkitRTCPeerConnection', 'RTCIceGatherer'].filter(
      function (e) {
        return e in window;
      }
    ).length > 0
  );
}
function Fe() {
  var e = (function () {
      if (navigator.userAgent.toLocaleLowerCase().includes('mobile')) return !0;
      var e = Ne(),
        t = e.browser,
        i = e.version;
      return 'Chrome' === t
        ? i >= 74
        : 'Edge' === t
          ? i >= 80
          : 'Firefox' === t
            ? i >= 66
            : 'OPR' === t
              ? i >= 60
              : 'Safari' === t && i >= 13;
    })(),
    t = Ve(),
    i = (function () {
      if (!navigator.mediaDevices) return !1;
      var e = ['getUserMedia', 'enumerateDevices'];
      return (
        e.filter(function (e) {
          return e in navigator.mediaDevices;
        }).length === e.length
      );
    })();
  return new Promise(function (r, n) {
    new Promise(function (e, t) {
      if (Ve()) {
        var i = new RTCPeerConnection();
        i.createOffer({ offerToReceiveAudio: !0, offerToReceiveVideo: !0 })
          .then(
            function (t) {
              var r = !!t.sdp && t.sdp.toLowerCase().indexOf('h264') > -1;
              (i.close(), (i = null), e(r));
            },
            function () {
              (Logger.onError({ c: Ue.TOP_ERROR, v: B.H264_NOT_SUPPORTED }),
                t(
                  new X({
                    code: B.H264_NOT_SUPPORTED,
                    message: 'h264 not supported',
                  })
                ));
            }
          )
          .catch(function (e) {
            Logger.onError({ c: Ue.TOP_ERROR, v: B.H264_NOT_SUPPORTED });
            var i = new X({ code: B.H264_NOT_SUPPORTED, message: e.message });
            t(i);
          });
      } else e(!1);
    }).then(
      function (n) {
        r({
          result: e && t && i && n,
          detail: {
            isBrowserSupported: e,
            isWebRTCSupported: t,
            isMediaDevicesSupported: i,
            isH264Supported: n,
          },
        });
      },
      function (e) {
        return n(e);
      }
    );
  });
}
function je() {
  if (!navigator.mediaDevices)
    throw (
      Logger.onError({ c: Ue.TOP_ERROR, v: B.DEVICE_NOT_FOUND }),
      new X({
        code: B.DEVICE_NOT_FOUND,
        message: 'navigator.mediaDevices is undefined',
      })
    );
  return new Promise(function (e, t) {
    navigator.mediaDevices
      .enumerateDevices()
      .then(
        function (t) {
          var i = t
            .filter(function (e) {
              return 'audioinput' !== e.kind || 'communications' != e.deviceId;
            })
            .map(function (e, t) {
              var i = e.label;
              e.label || (i = e.kind + '_' + t);
              var r = { label: i, deviceId: e.deviceId, kind: e.kind };
              return (e.groupId && (r.groupId = e.groupId), r);
            });
          e(i);
        },
        function (e) {
          t(e);
        }
      )
      .catch(function (e) {
        Logger.onError({ c: Ue.TOP_ERROR, v: B.DEVICE_NOT_FOUND });
        var i = new X({ code: B.DEVICE_NOT_FOUND, message: e.message });
        t(i);
      });
  });
}
function Be() {
  if (!navigator.mediaDevices)
    throw (
      Logger.onError({ c: Ue.TOP_ERROR, v: B.CAMERAS_NOT_FOUND }),
      new X({
        code: B.CAMERAS_NOT_FOUND,
        message: 'navigator.mediaDevices is undefined',
      })
    );
  return new Promise(function (e, t) {
    navigator.mediaDevices
      .enumerateDevices()
      .then(
        function (t) {
          var i = t
            .filter(function (e) {
              return 'videoinput' === e.kind;
            })
            .map(function (e, t) {
              var i = e.label;
              e.label || (i = 'camera_' + t);
              var r = { label: i, deviceId: e.deviceId, kind: e.kind };
              return (e.groupId && (r.groupId = e.groupId), r);
            });
          e(i);
        },
        function (e) {
          t(e);
        }
      )
      .catch(function (e) {
        Logger.onError({ c: Ue.TOP_ERROR, v: B.CAMERAS_NOT_FOUND });
        var i = new X({ code: B.CAMERAS_NOT_FOUND, message: e.message });
        t(i);
      });
  });
}
function We() {
  if (!navigator.mediaDevices)
    throw (
      Logger.onError({ c: Ue.TOP_ERROR, v: B.MICROPHONES_NOT_FOUND }),
      new X({
        code: B.MICROPHONES_NOT_FOUND,
        message: 'navigator.mediaDevices is undefined',
      })
    );
  return new Promise(function (e, t) {
    navigator.mediaDevices
      .enumerateDevices()
      .then(
        function (t) {
          var i = t
            .filter(function (e) {
              return 'audioinput' === e.kind && 'communications' !== e.deviceId;
            })
            .map(function (e, t) {
              var i = e.label;
              e.label || (i = 'microphone_' + t);
              var r = { label: i, deviceId: e.deviceId, kind: e.kind };
              return (e.groupId && (r.groupId = e.groupId), r);
            });
          e(i);
        },
        function (e) {
          t(e);
        }
      )
      .catch(function (e) {
        var i = new X({ code: B.MICROPHONES_NOT_FOUND, message: e.message });
        t(i);
      });
  });
}
function He() {
  if (!navigator.mediaDevices)
    throw (
      Logger.onError({ c: Ue.TOP_ERROR, v: B.SPEAKERS_NOT_FOUND }),
      new X({
        code: B.SPEAKERS_NOT_FOUND,
        message: 'navigator.mediaDevices is undefined',
      })
    );
  return new Promise(function (e, t) {
    navigator.mediaDevices
      .enumerateDevices()
      .then(
        function (t) {
          var i = t
            .filter(function (e) {
              return 'audiooutput' === e.kind;
            })
            .map(function (e, t) {
              var i = e.label;
              e.label || (i = 'speaker_' + t);
              var r = { label: i, deviceId: e.deviceId, kind: e.kind };
              return (e.groupId && (r.groupId = e.groupId), r);
            });
          e(i);
        },
        function (e) {
          t(e);
        }
      )
      .catch(function (e) {
        Logger.onError({ c: Ue.TOP_ERROR, v: B.SPEAKERS_NOT_FOUND });
        var i = new X({ code: B.SPEAKERS_NOT_FOUND, message: e.message });
        t(i);
      });
  });
}
function Ge() {
  return !!('captureStream' in HTMLCanvasElement.prototype);
}
function Je() {
  return 'Safari' !== Ne().browser;
}
var Ke = (function () {
    function e(t, i, r, n) {
      (_(this, e),
        (this.logger = i),
        (this.streamConfig = t),
        (this.streamId = t.streamId || null),
        (this.mediaStream = t.mediaStream || null),
        (this.type = t.type ? t.type : t.screen ? N : null),
        (this.info = t.info || null),
        (this.mixedInfo = t.mixedInfo || null),
        (this.constraints = { audio: t.audio, video: t.video }),
        (this.roomId = r || null),
        (this.xsigoClient = n || null),
        (this.isPlaying = !1),
        (this.objectFit = 'cover'),
        (this.muted = !1),
        (this.mirror = t.mirror || !1),
        (this.audioPlayer = null),
        (this.videoPlayer = null),
        (this.audioOutputDeviceId = ''),
        (this.audioOutputGroupId = ''),
        (this.audioVolume = 1),
        (this.isRemote = !1),
        this.setUserId(t.userId),
        (this.timer = null),
        (this.waterStreamStream = null),
        (this.waterMarkoptions = null),
        (this.waterMarkVideo = null),
        (this.isWaterMark = !1),
        (this.localId = 'default'),
        (this._emitter = new P()),
        (this.hasAudioTrack = !1),
        (this.hasVideoTrack = !1),
        (this.audioStreamId = ''),
        (this.videoStreamId = ''),
        (this.peerConnections = []),
        (this.audioTrackEnabled = !0),
        (this.videoTrackEnabled = !0),
        (this.pcFailedCount = 0),
        (this.audioMuted = !0),
        (this.videoMuted = !0),
        (this.backgroundColor = '#000000'),
        (this.isAlphaChannels = !1),
        (this.virtualBackground = null),
        (this.virtualBackgroundMix = !1),
        (this.waterMarkImage = null),
        (this.isEleLisenter = !0),
        this.setAudioOutput('default'));
    }
    var t, i, r, n, o;
    return (
      O(e, [
        {
          key: 'setPlayBackground',
          value: function (e) {
            this.backgroundColor = e;
          },
        },
        {
          key: 'play',
          value:
            ((o = T(
              A.mark(function e(t, i) {
                var r, n, o;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          if (!this.isPlaying) {
                            e.next = 3;
                            break;
                          }
                          return (
                            this.logger.warn(
                              'duplicated play() call observed, please stop() firstly'
                            ),
                            e.abrupt('return')
                          );
                        case 3:
                          if (
                            ((this.isPlaying = !0),
                            this.logger.info(
                              'stream start to play with options: '.concat(
                                JSON.stringify(i)
                              )
                            ),
                            (n =
                              'string' == typeof t
                                ? document.getElementById(t)
                                : t),
                            document.getElementById(
                              'player_'.concat(this.userId)
                            )
                              ? (r = document.getElementById(
                                  'player_'.concat(this.userId)
                                ))
                              : ((r =
                                  document.createElement('div')).setAttribute(
                                  'id',
                                  'player_'.concat(this.userId)
                                ),
                                r.setAttribute(
                                  'style',
                                  'width: 100%; height: 100%; position: relative; background-color:'.concat(
                                    this.backgroundColor,
                                    '; overflow: hidden;'
                                  )
                                ),
                                null === (o = n) ||
                                  void 0 === o ||
                                  o.appendChild(r)),
                            (this.div = r),
                            this.isRemote || (this.muted = !0),
                            i && void 0 !== i.muted && (this.muted = i.muted),
                            this.isRemote &&
                              this.info.video &&
                              'screen' === this.info.video.source &&
                              (this.objectFit = 'contain'),
                            i &&
                              void 0 !== i.objectFit &&
                              (this.objectFit = i.objectFit),
                            i &&
                              i.hasOwnProperty('isEleLisenter') &&
                              (this.isEleLisenter = i.isEleLisenter),
                            !this.hasVideo() || !this.hasAudio())
                          ) {
                            e.next = 17;
                            break;
                          }
                          return (
                            this.logger.buriedLog({
                              c: this.isRemote
                                ? this.type === N
                                  ? Ue.PLAY_REMOTE_VIDEO_SCREEN
                                  : Ue.PLAY_REMOTE_VIDEO
                                : this.type === N
                                  ? Ue.PLAY_LOCAL_VIDEO_SCREEN
                                  : Ue.PLAY_LOCAL_VIDEO,
                              v: this.addUid(),
                            }),
                            this.logger.buriedLog({
                              c: this.isRemote
                                ? this.type === N
                                  ? Ue.PLAY_REMOTE_AUDIO_SCREEN
                                  : Ue.PLAY_REMOTE_AUDIO
                                : this.type === N
                                  ? Ue.PLAY_LOCAL_AUDIO_SCREEN
                                  : Ue.PLAY_LOCAL_AUDIO,
                              v: this.addUid(),
                            }),
                            e.abrupt(
                              'return',
                              (this.playVideo(), this.playAudio())
                            )
                          );
                        case 17:
                          if (!this.hasVideo()) {
                            e.next = 20;
                            break;
                          }
                          return (
                            this.logger.buriedLog({
                              c: this.isRemote
                                ? this.type === N
                                  ? Ue.PLAY_REMOTE_VIDEO_SCREEN
                                  : Ue.PLAY_REMOTE_VIDEO
                                : this.type === N
                                  ? Ue.PLAY_LOCAL_VIDEO_SCREEN
                                  : Ue.PLAY_LOCAL_VIDEO,
                              v: this.addUid(),
                            }),
                            e.abrupt('return', this.playVideo())
                          );
                        case 20:
                          if (!this.hasAudio()) {
                            e.next = 23;
                            break;
                          }
                          return (
                            this.logger.buriedLog({
                              c: this.isRemote
                                ? this.type === N
                                  ? Ue.PLAY_REMOTE_AUDIO_SCREEN
                                  : Ue.PLAY_REMOTE_AUDIO
                                : this.type === N
                                  ? Ue.PLAY_LOCAL_AUDIO_SCREEN
                                  : Ue.PLAY_LOCAL_AUDIO,
                              v: this.addUid(),
                            }),
                            e.abrupt('return', this.playAudio())
                          );
                        case 23:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this
                );
              })
            )),
            function (e, t) {
              return o.apply(this, arguments);
            }),
        },
        {
          key: 'stop',
          value: function () {
            (this.logger.info('is playing:' + this.isPlaying),
              this.isPlaying &&
                (this.logger.info('Stop playing audio and video'),
                this.audioPlayer &&
                  this.logger.buriedLog({
                    c: this.isRemote
                      ? this.type === N
                        ? Ue.STOP_REMOTE_AUDIO_SCREEN
                        : Ue.STOP_REMOTE_AUDIO
                      : this.type === N
                        ? Ue.STOP_LOCAL_AUDIO_SCREEN
                        : Ue.STOP_LOCAL_AUDIO,
                    v: this.addUid(),
                  }),
                this.videoPlayer &&
                  this.logger.buriedLog({
                    c: this.isRemote
                      ? this.type === N
                        ? Ue.STOP_REMOTE_VIDEO_SCREEN
                        : Ue.STOP_REMOTE_VIDEO
                      : this.type === N
                        ? Ue.STOP_LOCAL_VIDEO_SCREEN
                        : Ue.STOP_LOCAL_VIDEO,
                    v: this.addUid(),
                  }),
                (this.isPlaying = !1),
                this.stopAudio(),
                this.stopVideo(),
                this.div.parentNode &&
                  this.div.parentNode.removeChild(this.div)));
          },
        },
        {
          key: 'resume',
          value:
            ((n = T(
              A.mark(function e() {
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          (this.logger.info('is playing:' + this.isPlaying),
                            this.isPlaying &&
                              (this.logger.info('stream - resume'),
                              this.audioPlayer &&
                                (this.logger.buriedLog({
                                  c: this.isRemote
                                    ? this.type === N
                                      ? Ue.RESUME_REMOTE_AUDIO_SCREEN
                                      : Ue.RESUME_REMOTE_AUDIO
                                    : this.type === N
                                      ? Ue.RESUME_LOCAL_AUDIO_SCREEN
                                      : Ue.RESUME_LOCAL_AUDIO,
                                  v: this.addUid(),
                                }),
                                this.audioPlayer.resume()),
                              this.videoPlayer &&
                                (this.logger.buriedLog({
                                  c: this.isRemote
                                    ? this.type === N
                                      ? Ue.RESUME_REMOTE_VIDEO_SCREEN
                                      : Ue.RESUME_REMOTE_VIDEO
                                    : this.type === N
                                      ? Ue.RESUME_LOCAL_VIDEO_SCREEN
                                      : Ue.RESUME_LOCAL_VIDEO,
                                  v: this.addUid(),
                                }),
                                this.videoPlayer.resume())));
                        case 2:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this
                );
              })
            )),
            function () {
              return n.apply(this, arguments);
            }),
        },
        {
          key: 'close',
          value: function () {
            (this.logger.info('is playing:' + this.isPlaying),
              this.isPlaying && this.stop(),
              this.mediaStream &&
                (this.mediaStream.getTracks().forEach(function (e) {
                  e.stop();
                }),
                (this.mediaStream = null)));
          },
        },
        {
          key: 'muteAudio',
          value: function () {
            return (
              !(!this.mediaStream || !this.audioTrackEnabled) &&
              (this.logger.info('mute audio'),
              this.logger.buriedLog({
                c: this.isRemote
                  ? this.type === N
                    ? Ue.MUTE_REMOTE_AUDIO_SCREEN
                    : Ue.MUTE_REMOTE_AUDIO
                  : this.type === N
                    ? Ue.MUTE_LOCAL_AUDIO_SCREEN
                    : Ue.MUTE_LOCAL_AUDIO,
                v: this.addUid(),
              }),
              this.addRemoteEvent(le.AudioMute),
              this.doEnableTrack('audio', !1))
            );
          },
        },
        {
          key: 'muteVideo',
          value: function () {
            return (
              !(!this.mediaStream || !this.videoTrackEnabled) &&
              (this.logger.info('mute video'),
              this.logger.buriedLog({
                c: this.isRemote
                  ? this.type === N
                    ? Ue.MUTE_REMOTE_VIDEO_SCREEN
                    : Ue.MUTE_REMOTE_VIDEO
                  : this.type === N
                    ? Ue.MUTE_LOCAL_VIDEO_SCREEN
                    : Ue.MUTE_LOCAL_VIDEO,
                v: this.addUid(),
              }),
              this.isAlphaChannels && this.videoPlayer.mute(),
              this.addRemoteEvent(le.VideoMute),
              this.doEnableTrack('video', !1))
            );
          },
        },
        {
          key: 'unmuteAudio',
          value: function () {
            return (
              !(!this.mediaStream || this.audioTrackEnabled) &&
              (this.logger.info('unmute audio'),
              this.logger.buriedLog({
                c: this.isRemote
                  ? this.type === N
                    ? Ue.UNMUTE_REMOTE_AUDIO_SCREEN
                    : Ue.UNMUTE_REMOTE_AUDIO
                  : this.type === N
                    ? Ue.UNMUTE_LOCAL_AUDIO_SCREEN
                    : Ue.UNMUTE_LOCAL_AUDIO,
                v: this.addUid(),
              }),
              this.addRemoteEvent(le.AudioUnmute),
              this.doEnableTrack('audio', !0))
            );
          },
        },
        {
          key: 'unmuteVideo',
          value: function () {
            return (
              !(!this.mediaStream || this.videoTrackEnabled) &&
              (this.logger.info('unmute video'),
              this.logger.buriedLog({
                c: this.isRemote
                  ? this.type === N
                    ? Ue.UNMUTE_REMOTE_VIDEO_SCREEN
                    : Ue.UNMUTE_REMOTE_VIDEO
                  : this.type === N
                    ? Ue.UNMUTE_LOCAL_VIDEO_SCREEN
                    : Ue.UNMUTE_LOCAL_VIDEO,
                v: this.addUid(),
              }),
              this.isAlphaChannels && this.videoPlayer.unmute(),
              this.addRemoteEvent(le.VideoUnmute),
              this.doEnableTrack('video', !0))
            );
          },
        },
        {
          key: 'updateTrack',
          value: function (e, t) {
            var i;
            ((i =
              'audio' === e ? this.getAudioTrack() : this.getVideoTrack()) &&
              this.mediaStream.removeTrack(i),
              this.mediaStream.addTrack(t));
          },
        },
        {
          key: 'doEnableTrack',
          value: function (e, t) {
            var i = !1;
            return (
              'audio' === e
                ? this.mediaStream.getAudioTracks().forEach(function (e) {
                    ((i = !0), (e.enabled = t));
                  })
                : this.mediaStream.getVideoTracks().forEach(function (e) {
                    ((i = !0), (e.enabled = t));
                  }),
              this.setEnableTrackFlag(e, t),
              i
            );
          },
        },
        {
          key: 'setEnableTrackFlag',
          value: function (e, t) {
            'audio' === e
              ? (this.audioTrackEnabled = t)
              : (this.videoTrackEnabled = t);
          },
        },
        {
          key: 'addRemoteEvent',
          value: function (e, t) {
            var i = this;
            return new Promise(function (r, n) {
              if (!i.isRemote) {
                var o = function (e, t, i) {
                  (1 === e && r(!0), 0 === e && n(!1));
                };
                if (i.xsigoClient)
                  switch (e) {
                    case le.AudioMute:
                      i.xsigoClient.muteAudio(i.roomId, i.audioStreamId, o, t);
                      break;
                    case le.VideoMute:
                      i.xsigoClient.muteVideo(i.roomId, i.videoStreamId, o, t);
                      break;
                    case le.AudioUnmute:
                      i.xsigoClient.unmuteAudio(
                        i.roomId,
                        i.audioStreamId,
                        o,
                        t
                      );
                      break;
                    case le.VideoUnmute:
                      i.xsigoClient.unmuteVideo(
                        i.roomId,
                        i.videoStreamId,
                        o,
                        t
                      );
                  }
                else i.logger.info('not xsigoClient');
              }
            });
          },
        },
        {
          key: 'getId',
          value: function () {
            return this.streamId || '';
          },
        },
        {
          key: 'getUserId',
          value: function () {
            return 'main' === this.type
              ? this.userId
              : this.userId.replace('share_', '');
          },
        },
        {
          key: 'setUserId',
          value: function (e) {
            if (this.streamConfig.screen)
              return (this.userId = 'share_'.concat(e));
            this.userId = e;
          },
        },
        {
          key: 'setAudioOutput',
          value: function (e) {
            var t = this;
            ((this.audioOutputDeviceId = e),
              this.logger.info('setAudioOutput deviceId', this.userId, e),
              this.logger.buriedLog({
                c: Ue.SET_AUDIO_OUTPUT,
                v: 'deviceId:'.concat(e, ',uid:').concat(this.userId),
              }),
              this.audioPlayer && this.audioPlayer.setSinkId(e),
              He().then(function (e) {
                var i = e.find(function (e) {
                  return e.deviceId === t.audioOutputDeviceId;
                });
                i && (t.audioOutputGroupId = i.groupId);
              }));
          },
        },
        {
          key: 'getInuseSpeaker',
          value: function () {
            return (
              this.logger.buriedLog({
                c: Ue.GET_DEVICES_INFO_IN_USE,
                v: 'speaker:'.concat(this.audioOutputDeviceId),
              }),
              {
                speaker: {
                  deviceId: this.audioOutputDeviceId,
                  groupId: this.audioOutputGroupId,
                },
              }
            );
          },
        },
        {
          key: 'setAudioVolume',
          value: function (e) {
            ((this.audioVolume = e),
              this.logger.info('setAudioVolume to '.concat(e.toString())),
              this.logger.buriedLog({
                c: this.isRemote
                  ? this.type === N
                    ? Ue.SET_REMOTE_AUDIO_VOLUME_SCREEN
                    : Ue.SET_REMOTE_AUDIO_VOLUME
                  : this.type === N
                    ? Ue.SET_LOCAL_AUDIO_VOLUME_SCREEN
                    : Ue.SET_LOCAL_AUDIO_VOLUME,
                v: 'volume:'.concat(e),
              }),
              this.audioPlayer && this.audioPlayer.setVolume(e));
          },
        },
        {
          key: 'getAudioLevel',
          value: function () {
            return this.audioPlayer ? this.audioPlayer.getAudioLevel() : 0;
          },
        },
        {
          key: 'setHasAudio',
          value: function (e) {
            this.hasAudioTrack = e;
          },
        },
        {
          key: 'hasAudio',
          value: function () {
            return !!this.checkMediaStream() && this.hasAudioTrack;
          },
        },
        {
          key: 'setHasVideo',
          value: function (e) {
            this.hasVideoTrack = e;
          },
        },
        {
          key: 'hasVideo',
          value: function () {
            return !!this.checkMediaStream() && this.hasVideoTrack;
          },
        },
        {
          key: 'getAudioTrack',
          value: function () {
            var e = null;
            if (this.checkMediaStream()) {
              var t = this.mediaStream.getAudioTracks();
              t.length > 0 && (e = t[0]);
            }
            return e;
          },
        },
        {
          key: 'getVideoTrack',
          value: function () {
            var e = null;
            if (this.checkMediaStream()) {
              var t = this.mediaStream.getVideoTracks();
              t.length > 0 && (e = t[0]);
            }
            return e;
          },
        },
        {
          key: 'getVideoFrame',
          value: function () {
            return (
              this.logger.buriedLog({
                c: this.isRemote
                  ? this.type === N
                    ? Ue.GET_REMOTE_VIDEO_FRAME_SCREEN
                    : Ue.GET_REMOTE_VIDEO_FRAME
                  : this.type === N
                    ? Ue.GET_LCOAL_VIDEO_FRAME_SCREEN
                    : Ue.GET_LCOAL_VIDEO_FRAME,
              }),
              this.videoPlayer ? this.videoPlayer.getVideoFrame() : null
            );
          },
        },
        {
          key: 'on',
          value: function (e, t) {
            this._emitter.on(e, t);
          },
        },
        {
          key: 'playAudio',
          value:
            ((r = T(
              A.mark(function e() {
                var t,
                  i = this;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          if (
                            ((t = this.getAudioTrack()), !this.audioPlayer && t)
                          ) {
                            e.next = 3;
                            break;
                          }
                          return e.abrupt('return');
                        case 3:
                          return (
                            this.logger.info(
                              'stream - create AudioPlayer and play'
                            ),
                            (this.audioPlayer = new ie({
                              stream: this,
                              track: t,
                              div: this.div,
                              muted: this.muted,
                              volume: this.audioVolume,
                              deviceId: this.audioOutputDeviceId,
                            })),
                            this.audioPlayer._emitter.on(
                              'player-state-changed',
                              function (e) {
                                (i._emitter.emit('player-state-changed', {
                                  type: 'audio',
                                  state: e.state,
                                  reason: e.reason,
                                }),
                                  'track' === e.type &&
                                    i._emitter.emit('track-state-changed', {
                                      type: 'audio',
                                      state: e.state,
                                      reason: e.reason,
                                    }));
                              }
                            ),
                            e.abrupt(
                              'return',
                              new Promise(function (e, t) {
                                i.audioPlayer
                                  .play()
                                  .then(function () {
                                    e();
                                  })
                                  .catch(function (e) {
                                    if (
                                      (i.logger.warn(
                                        '<audio> play() error:' + e
                                      ),
                                      (e.toString() + ' <audio>').startsWith(
                                        'NotAllowedError'
                                      ))
                                    ) {
                                      i.logger.onError({
                                        c: Ue.TOP_ERROR,
                                        v: B.PLAY_NOT_ALLOWED,
                                      });
                                      var r = new X({
                                        code: B.PLAY_NOT_ALLOWED,
                                        message: e.message,
                                      });
                                      (i.logger.buriedLog({
                                        c: Ue.ON_STREAM_ERROR,
                                        v: 'code:'.concat(B.PLAY_NOT_ALLOWED),
                                      }),
                                        i._emitter.emit(V, r),
                                        t(r));
                                    }
                                  });
                              })
                            )
                          );
                        case 7:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this
                );
              })
            )),
            function () {
              return r.apply(this, arguments);
            }),
        },
        {
          key: 'getWaterStreamStream',
          value:
            ((i = T(
              A.mark(function e(t) {
                var i,
                  r,
                  n,
                  o,
                  s,
                  a,
                  c,
                  u,
                  d,
                  l = this;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          return (
                            (i = this.mediaStream),
                            (this.waterMarkVideo =
                              document.createElement('video')),
                            (this.waterMarkVideo.srcObject = i),
                            (e.next = 5),
                            this.waterMarkVideo.play()
                          );
                        case 5:
                          return (
                            (r = i.getVideoTracks()[0]),
                            (n = document.createElement('canvas')),
                            (o = n.getContext('2d')),
                            (s = r.getSettings()),
                            this.logger.info(
                              'settings frameRate ====>',
                              1e3 / s.frameRate
                            ),
                            (a = Math.floor(1e3 / 15)),
                            (u = Date.now()),
                            (n.width = s.width),
                            (n.height = s.height),
                            (function e() {
                              var i = r.getSettings().frameRate;
                              (i && (a = Math.floor(1e3 / i)),
                                a < 1e3 / 15 && (a = Math.floor(1e3 / 15)),
                                l.timer && cancelAnimationFrame(l.timer),
                                (l.timer = requestAnimationFrame(e)),
                                (c = Date.now()),
                                (d = c - u) > a &&
                                  ((u = c - d / a),
                                  o.drawImage(
                                    l.waterMarkVideo,
                                    0,
                                    0,
                                    n.width,
                                    n.height
                                  ),
                                  o.drawImage(t, 0, 0, s.width, s.height)));
                            })(),
                            (this.waterStreamStream = n.captureStream()),
                            e.abrupt('return', this.waterStreamStream)
                          );
                        case 17:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this
                );
              })
            )),
            function (e) {
              return i.apply(this, arguments);
            }),
        },
        {
          key: 'startWaterMark',
          value: function (e, t) {
            var i = this;
            return (
              this.logger.info(this.userId + ' startWaterMark', e),
              new Promise(
                (function () {
                  var r = T(
                    A.mark(function r(n, o) {
                      var s, a;
                      return A.wrap(function (r) {
                        for (;;)
                          switch ((r.prev = r.next)) {
                            case 0:
                              if (!i.waterStreamStream) {
                                r.next = 2;
                                break;
                              }
                              return r.abrupt(
                                'return',
                                o('waterMark is starting')
                              );
                            case 2:
                              if (
                                ((i.waterMarkoptions = e),
                                (i.waterMarkImage = t),
                                i.type === N && i.isRemote)
                              ) {
                                r.next = 6;
                                break;
                              }
                              return r.abrupt(
                                'return',
                                o(
                                  'waterMark is only support remoteStream and screenShare'
                                )
                              );
                            case 6:
                              if (!i.videoPlayer) {
                                r.next = 17;
                                break;
                              }
                              return ((r.next = 9), i.getWaterStreamStream(t));
                            case 9:
                              ((s = r.sent.getVideoTracks()[0]),
                                (a = new MediaStream()).addTrack(s),
                                (i.getVideoElement().srcObject = a),
                                (r.next = 18));
                              break;
                            case 17:
                              i.isWaterMark = !0;
                            case 18:
                              n();
                            case 19:
                            case 'end':
                              return r.stop();
                          }
                      }, r);
                    })
                  );
                  return function (e, t) {
                    return r.apply(this, arguments);
                  };
                })()
              )
            );
          },
        },
        {
          key: 'closeWaterMark',
          value: function () {
            if (
              this.waterStreamStream &&
              (this.logger.info(this.userId + ' closeWaterMark'),
              (this.isWaterMark = !1),
              (this.waterStreamStream = null),
              (this.waterMarkImage = null),
              (this.waterMarkoptions = null),
              this.timer &&
                (cancelAnimationFrame(this.timer), (this.timer = null)),
              this.waterMarkVideo &&
                ((this.waterMarkVideo.srcObject = null),
                (this.waterMarkVideo = null)),
              this.isPlaying)
            ) {
              var e = this.getVideoElement(),
                t = this.getVideoTrack(),
                i = new MediaStream();
              (i.addTrack(t), (e.srcObject = i));
            }
          },
        },
        {
          key: 'setLocalUserId',
          value: function (e) {
            this.localId = e;
          },
        },
        {
          key: 'playVideo',
          value:
            ((t = T(
              A.mark(function e() {
                var t,
                  i = this;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          if (
                            ((t = this.getVideoTrack()), !this.videoPlayer && t)
                          ) {
                            e.next = 3;
                            break;
                          }
                          return e.abrupt('return');
                        case 3:
                          if (!this.isWaterMark) {
                            e.next = 8;
                            break;
                          }
                          return (
                            (e.next = 6),
                            this.getWaterStreamStream(this.waterMarkImage)
                          );
                        case 6:
                          t = e.sent.getVideoTracks()[0];
                        case 8:
                          return (
                            this.logger.info(
                              'stream - create VideoPlayer and play'
                            ),
                            (this.videoPlayer = new ye({
                              stream: this,
                              track: t,
                              div: this.div,
                              muted: this.muted,
                              objectFit: this.objectFit,
                              mirror: this.mirror,
                              isAlphaChannels: this.isAlphaChannels,
                              virtualBackground: this.virtualBackground,
                              virtualBackgroundMix: this.virtualBackgroundMix,
                              isEleLisenter: this.isEleLisenter,
                            })),
                            this.videoPlayer._emitter.on(
                              'player-state-changed',
                              function (e) {
                                (i._emitter.emit('player-state-changed', {
                                  type: 'video',
                                  state: e.state,
                                  reason: e.reason,
                                }),
                                  'track' === e.type &&
                                    i._emitter.emit('track-state-changed', {
                                      type: 'video',
                                      state: e.state,
                                      reason: e.reason,
                                    }));
                              }
                            ),
                            e.abrupt(
                              'return',
                              new Promise(function (e, t) {
                                i.videoPlayer
                                  .play()
                                  .then(function () {
                                    e();
                                  })
                                  .catch(function (e) {
                                    if (
                                      (i.logger.warn(
                                        '<video> play() error:' + e
                                      ),
                                      (e.toString() + ' <video>').startsWith(
                                        'NotAllowedError'
                                      ))
                                    ) {
                                      i.logger.onError({
                                        c: Ue.TOP_ERROR,
                                        v: B.PLAY_NOT_ALLOWED,
                                      });
                                      var r = new X({
                                        code: B.PLAY_NOT_ALLOWED,
                                        message: e.message,
                                      });
                                      (i.logger.buriedLog({
                                        c: Ue.ON_STREAM_ERROR,
                                        v: 'code:'.concat(B.PLAY_NOT_ALLOWED),
                                      }),
                                        i._emitter.emit(V, r),
                                        t(r));
                                    }
                                  });
                              })
                            )
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
            )),
            function () {
              return t.apply(this, arguments);
            }),
        },
        {
          key: 'stopAudio',
          value: function () {
            this.audioPlayer &&
              (this.logger.info('stream - stop AudioPlayer'),
              this.audioPlayer.stop(),
              (this.audioPlayer = null));
          },
        },
        {
          key: 'stopVideo',
          value: function () {
            this.videoPlayer &&
              (this.logger.info('stream - stop VideoPlayer'),
              this.videoPlayer.stop(),
              (this.videoPlayer = null));
          },
        },
        {
          key: 'checkMediaStream',
          value: function () {
            return !!this.mediaStream;
          },
        },
        {
          key: 'restartAudio',
          value: function () {
            this.isPlaying && (this.stopAudio(), this.playAudio());
          },
        },
        {
          key: 'restartVideo',
          value: function () {
            this.isPlaying && (this.stopVideo(), this.playVideo());
          },
        },
        {
          key: 'setMediaStream',
          value: function (e) {
            this.mediaStream = e;
          },
        },
        {
          key: 'setSimulcasts',
          value: function (e) {
            this.info.video.simulcast = e;
          },
        },
        {
          key: 'getSimulcasts',
          value: function () {
            try {
              return this.info.video.simulcast || [];
            } catch (e) {
              return [];
            }
          },
        },
        {
          key: 'setInfo',
          value: function (e) {
            this.info = e;
          },
        },
        {
          key: 'getType',
          value: function () {
            return this.type || 'main';
          },
        },
        {
          key: 'getAudioElement',
          value: function () {
            return this.audioPlayer && this.audioPlayer.getAudioElement();
          },
        },
        {
          key: 'getVideoElement',
          value: function () {
            return this.videoPlayer && this.videoPlayer.getVideoElement();
          },
        },
        {
          key: 'setAudioTrack',
          value: function (e) {
            ((e.enabled = this.audioTrackEnabled),
              this.audioPlayer
                ? this.audioPlayer.setAudioTrack(e)
                : this.playAudio());
          },
        },
        {
          key: 'setVideoTrack',
          value: function (e) {
            ((e.enabled = this.videoTrackEnabled),
              this.videoPlayer
                ? this.videoPlayer.setVideoTrack(e)
                : this.playVideo());
          },
        },
        {
          key: 'setAudioStreamId',
          value: function (e) {
            this.audioStreamId = e;
          },
        },
        {
          key: 'setVideoStreamId',
          value: function (e) {
            this.videoStreamId = e;
          },
        },
        {
          key: 'addUid',
          value: function () {
            if (this.isRemote) return 'uid:'.concat(this.getUserId());
          },
        },
        {
          key: 'getAudioMuted',
          value: function () {
            return (
              (this.getAudioTrack() && !this.audioTrackEnabled) ||
              this.audioMuted
            );
          },
        },
        {
          key: 'getVideoMuted',
          value: function () {
            return (
              (this.getVideoTrack() && !this.videoTrackEnabled) ||
              this.videoMuted
            );
          },
        },
        {
          key: 'updatePeerConnectionFailed',
          value: function (e) {
            if ('failed' === e) {
              (this.pcFailedCount++,
                this.logger.onError({
                  c: Ue.TOP_ERROR,
                  v: B.RTCPEERCONNECTION_SATE_FAILED,
                }));
              var t = new X({
                code: B.RTCPEERCONNECTION_SATE_FAILED,
                message: '{"count":'.concat(this.pcFailedCount, '}'),
              });
              (this._emitter.emit(V, t),
                this.logger.warn(
                  'updatePeerConnectionFailed,count:'.concat(this.pcFailedCount)
                ));
            } else
              'connected' === e &&
                0 !== this.pcFailedCount &&
                (this.pcFailedCount = 0);
          },
        },
        {
          key: 'setMutedState',
          value: function (e, t) {
            'audio' === e
              ? (this.audioMuted = t)
              : 'video' === e && (this.videoMuted = t);
          },
        },
        {
          key: 'setIsAlphaChannels',
          value: function (e) {
            (this.logger.info('set isAlphaChannels', e),
              (this.isAlphaChannels = e));
          },
        },
        {
          key: 'hasAlphaChannels',
          value: function () {
            return this.isAlphaChannels;
          },
        },
        {
          key: 'setVirtualBackground',
          value: function (e) {
            var t =
              arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
            if (this.virtualBackground)
              return (
                this.logger.warn('The virtual background has already been set'),
                !1
              );
            return ['IMG', 'VIDEO'].includes(e.nodeName)
              ? (this.logger.info(
                  'set virtual background,element:'
                    .concat(e.nodeName, ',mix:')
                    .concat(t)
                ),
                (this.virtualBackground = e),
                (this.virtualBackgroundMix = 'VIDEO' === e.nodeName || t),
                !0)
              : (this.logger.warn('Element must be img or video'), !1);
          },
        },
        {
          key: 'resize',
          value: function () {
            return this.isAlphaChannels
              ? this.videoPlayer
                ? void this.videoPlayer.resize()
                : (this.logger.warn('Please play video first'), !1)
              : (this.logger.warn(
                  'Please start the stream containing alpha channel first'
                ),
                !1);
          },
        },
      ]),
      e
    );
  })(),
  Ye = new Map();
(Ye.set('standard', { sampleRate: 48e3, channelCount: 1, bitrate: 40 }),
  Ye.set('high', { sampleRate: 48e3, channelCount: 1, bitrate: 128 }));
var ze = new Map();
(ze.set('120p', { width: 160, height: 120, frameRate: 15, bitrate: 200 }),
  ze.set('180p', { width: 320, height: 180, frameRate: 15, bitrate: 350 }),
  ze.set('240p', { width: 320, height: 240, frameRate: 15, bitrate: 400 }),
  ze.set('360p', { width: 640, height: 360, frameRate: 15, bitrate: 800 }),
  ze.set('480p', { width: 640, height: 480, frameRate: 15, bitrate: 900 }),
  ze.set('720p', { width: 1280, height: 720, frameRate: 15, bitrate: 1500 }),
  ze.set('1080p', { width: 1920, height: 1080, frameRate: 15, bitrate: 2e3 }),
  ze.set('1440p', { width: 2560, height: 1440, frameRate: 30, bitrate: 4860 }),
  ze.set('4K', { width: 3840, height: 2160, frameRate: 30, bitrate: 9e3 }));
var qe = new Map();
function Xe(e) {
  return (
    'function' == typeof Symbol && 'symbol' == G(Symbol.iterator)
      ? function (e) {
          return G(e);
        }
      : function (e) {
          return e &&
            'function' == typeof Symbol &&
            e.constructor === Symbol &&
            e !== Symbol.prototype
            ? 'symbol'
            : G(e);
        }
  )(e);
}
(qe.set('480p', { width: 640, height: 480, frameRate: 5, bitrate: 900 }),
  qe.set('480p_2', { width: 640, height: 480, frameRate: 30, bitrate: 1e3 }),
  qe.set('720p', { width: 1280, height: 720, frameRate: 5, bitrate: 1200 }),
  qe.set('720p_2', { width: 1280, height: 720, frameRate: 30, bitrate: 3e3 }),
  qe.set('1080p', { width: 1920, height: 1080, frameRate: 5, bitrate: 1600 }),
  qe.set('1080p_2', {
    width: 1920,
    height: 1080,
    frameRate: 30,
    bitrate: 4e3,
  }));
var Qe,
  $e = (window.navigator && window.navigator.userAgent) || '',
  Ze = /Edge\//i.test($e),
  et = (Qe = $e.match(/Chrome\/(\d+)/)) && Qe[1] ? parseFloat(Qe[1]) : null;
function tt(e, t) {
  return new Promise(function (i, r) {
    var n = document.createElement('canvas'),
      o = n.getContext('2d');
    ((n.width = 1920), (n.height = 1080));
    var s = document.createElement('canvas');
    ((s.width = 400), (s.height = 200), (s.style.border = '1px solid'));
    var a = s.getContext('2d');
    (a.rotate((-20 * Math.PI) / 180),
      (a.font = ''.concat(e.fontSize, 'px ').concat(e.fontType)),
      (a.fillStyle = e.fontColor),
      (a.textBaseline = 'middle'),
      a.fillText(t, 0, 90));
    var c = new Image();
    ((c.src = s.toDataURL('image/png')),
      (c.onload = function () {
        ((o.fillStyle = o.createPattern(c, 'repeat')),
          o.fillRect(0, 0, n.width, n.height));
        var e = new Image();
        return ((e.src = n.toDataURL('image/png')), i(e));
      }));
  });
}
function it(e, t) {
  var i = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      i.push.apply(i, r));
  }
  return i;
}
function rt(e) {
  for (var t = 1; t < arguments.length; t++) {
    var i = null != arguments[t] ? arguments[t] : {};
    t % 2
      ? it(Object(i), !0).forEach(function (t) {
          S(e, t, i[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(i))
        : it(Object(i)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(i, t));
          });
  }
  return e;
}
var nt = (function (e) {
  H(s, Ke);
  var t,
    i,
    r,
    n,
    o = (function (e) {
      var t = (function () {
        if ('undefined' == typeof Reflect || !Reflect.construct) return !1;
        if (Reflect.construct.sham) return !1;
        if ('function' == typeof Proxy) return !0;
        try {
          return (
            Boolean.prototype.valueOf.call(
              Reflect.construct(Boolean, [], function () {})
            ),
            !0
          );
        } catch (e) {
          return !1;
        }
      })();
      return function () {
        var i,
          r = Y(e);
        if (t) {
          var n = Y(this).constructor;
          i = Reflect.construct(r, arguments, n);
        } else i = r.apply(this, arguments);
        return K(this, i);
      };
    })(s);
  function s(e, t) {
    var i;
    return (
      _(this, s),
      ((i = o.call(this, e, t)).screen = e.screen),
      (i.audioProfile = Ye.get('standard')),
      (i.videoProfile = ze.get('480p')),
      (i.screenProfile = qe.get('1080p')),
      (i.bitrate = {
        audio: i.audioProfile.bitrate,
        video: i.screen ? i.screenProfile.bitrate : i.videoProfile.bitrate,
      }),
      (i.cameraId_ = e.cameraId || ''),
      (i.cameraGroupId_ = ''),
      (i.microphoneId_ = e.microphoneId || ''),
      (i.microphoneGroupId_ = ''),
      (i.cameraLabel_ = ''),
      (i.microphoneLabel_ = ''),
      (i.recoverCaptureCount_ = 0),
      (i.published = !1),
      (i.audioPubState = x.Create),
      (i.videoPubState = x.Create),
      i._emitter.on('track-state-changed', i.onTrackStopped.bind(J(i))),
      i
    );
  }
  return (
    O(s, [
      {
        key: 'initialize',
        value:
          ((n = T(
            A.mark(function e(t) {
              var i = this;
              return A.wrap(
                function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        return (
                          this.logger.info(
                            'initialize stream audio: '
                              .concat(this.constraints.audio, ' video: ')
                              .concat(this.constraints.video)
                          ),
                          e.abrupt(
                            'return',
                            new Promise(function (e, r) {
                              return i.screen
                                ? i
                                    .initShareStream({
                                      audio: i.streamConfig.audio,
                                      screenAudio: i.streamConfig.screenAudio,
                                      microphoneId: i.microphoneId_,
                                      width: i.screenProfile.width,
                                      height: i.screenProfile.height,
                                      frameRate: i.screenProfile.frameRate,
                                      sampleRate: i.audioProfile.sampleRate,
                                      channelCount: i.audioProfile.channelCount,
                                      customStream: t,
                                    })
                                    .then(function (t) {
                                      i.mediaStream = t;
                                      var r = t.getAudioTracks().length > 0,
                                        n = t.getVideoTracks().length > 0;
                                      (i.setHasAudio(r),
                                        i.setHasVideo(n),
                                        i.setMutedState('audio', !r),
                                        i.setMutedState('video', !n),
                                        i.listenForScreenSharingStopped(
                                          t.getVideoTracks()[0]
                                        ),
                                        i.setVideoContentHint('detail'),
                                        i.updateDeviceIdInUse(),
                                        e(t),
                                        i.logger.info(
                                          'init share stream success'
                                        ));
                                    })
                                    .catch(function (e) {
                                      i.logger.onError(
                                        {
                                          c: Ue.TOP_ERROR,
                                          v: B.INIT_STREAM_FAILED,
                                        },
                                        'init share stream failed,'
                                          .concat(e.name, ':')
                                          .concat(e.message)
                                      );
                                      var t = new X({
                                        code: B.INIT_STREAM_FAILED,
                                        message: e.message,
                                        name: e.name,
                                      });
                                      r(t);
                                    })
                                : i
                                    .initAvStream({
                                      audio: i.streamConfig.audio,
                                      video: i.streamConfig.video,
                                      facingMode: i.streamConfig.facingMode,
                                      cameraId: i.cameraId_,
                                      microphoneId: i.microphoneId_,
                                      width: i.videoProfile.width,
                                      height: i.videoProfile.height,
                                      frameRate: i.videoProfile.frameRate,
                                      sampleRate: i.audioProfile.sampleRate,
                                      channelCount: i.audioProfile.channelCount,
                                      customStream: t,
                                    })
                                    .then(function (t) {
                                      i.mediaStream = t;
                                      var r = t.getAudioTracks().length > 0,
                                        n = t.getVideoTracks().length > 0;
                                      (i.setHasAudio(r),
                                        i.setHasVideo(n),
                                        i.setMutedState('audio', !r),
                                        i.setMutedState('video', !n),
                                        i.updateDeviceIdInUse(),
                                        (i.videoSetting =
                                          n &&
                                          t.getVideoTracks()[0].getSettings()),
                                        e(t),
                                        i.logger.info(
                                          'init local stream success'
                                        ));
                                    })
                                    .catch(function (e) {
                                      i.logger.onError(
                                        {
                                          c: Ue.TOP_ERROR,
                                          v: B.INIT_STREAM_FAILED,
                                        },
                                        'init localstream failed,'
                                          .concat(e.name, ':')
                                          .concat(e.message)
                                      );
                                      var t = new X({
                                        code: B.INIT_STREAM_FAILED,
                                        message: e.message,
                                        name: e.name,
                                      });
                                      r(t);
                                    })
                                    .finally(
                                      T(
                                        A.mark(function e() {
                                          return A.wrap(function (e) {
                                            for (;;)
                                              switch ((e.prev = e.next)) {
                                                case 0:
                                                  return ((e.next = 2), je());
                                                case 2:
                                                  i.logger.info(
                                                    'mediaDevices',
                                                    JSON.stringify(
                                                      e.sent,
                                                      null,
                                                      4
                                                    )
                                                  );
                                                case 4:
                                                case 'end':
                                                  return e.stop();
                                              }
                                          }, e);
                                        })
                                      )
                                    );
                            })
                          )
                        );
                      case 2:
                      case 'end':
                        return e.stop();
                    }
                },
                e,
                this
              );
            })
          )),
          function (e) {
            return n.apply(this, arguments);
          }),
      },
      {
        key: 'initAvStream',
        value:
          ((r = T(
            A.mark(function e(t) {
              var i, r, n, o, s, a;
              return A.wrap(
                function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        if (!t.customStream) {
                          e.next = 2;
                          break;
                        }
                        return e.abrupt(
                          'return',
                          Promise.resolve(t.customStream)
                        );
                      case 2:
                        if (navigator.mediaDevices) {
                          e.next = 5;
                          break;
                        }
                        return (
                          this.logger.onError(
                            { c: Ue.TOP_ERROR, v: B.DEVICE_NOT_FOUND },
                            'navigator.mediaDevices is undefined'
                          ),
                          e.abrupt('return', Promise.reject())
                        );
                      case 5:
                        if (
                          ((r = { audio: t.audio, video: t.video }), !t.audio)
                        ) {
                          e.next = 20;
                          break;
                        }
                        return ((e.next = 9), We());
                      case 9:
                        if (0 !== (i = e.sent).length) {
                          e.next = 15;
                          break;
                        }
                        throw (
                          this.logger.onError({
                            c: Ue.TOP_ERROR,
                            v: B.DEVICE_NOT_FOUND,
                          }),
                          new X({
                            code: B.DEVICE_NOT_FOUND,
                            message:
                              'no microphone detected, but you are trying to get audio stream, please check your microphone and the configeration on XRTC.createStream.',
                          })
                        );
                      case 15:
                        ((n = i.filter(function (e) {
                          return e.deviceId.length > 0;
                        })).length > 0 && (o = n[0].deviceId),
                          (s = i.filter(function (e) {
                            return 'default' === e.deviceId;
                          })).length > 0 && (a = s[0].deviceId),
                          (r.audio = {
                            deviceId: { exact: t.microphoneId || a || o },
                            echoCancellation: !0,
                            autoGainControl: !0,
                            noiseSuppression: !0,
                            sampleRate: t.sampleRate,
                            channelCount: t.channelCount,
                          }));
                      case 20:
                        if (!t.video) {
                          e.next = 32;
                          break;
                        }
                        return ((e.next = 23), Be());
                      case 23:
                        if (0 !== e.sent.length) {
                          e.next = 29;
                          break;
                        }
                        throw (
                          this.logger.onError({
                            c: Ue.TOP_ERROR,
                            v: B.DEVICE_NOT_FOUND,
                          }),
                          new X({
                            code: B.DEVICE_NOT_FOUND,
                            message:
                              'no camera detected, but you are trying to get video stream, please check your camera and the configeration on XRTC.createStream.',
                          })
                        );
                      case 29:
                        ((r.video = {
                          width: t.width,
                          height: t.height,
                          frameRate: t.frameRate,
                        }),
                          t.cameraId &&
                            (r.video = rt(
                              rt({}, r.video),
                              {},
                              { deviceId: { exact: t.cameraId } }
                            )),
                          t.facingMode &&
                            (r.video = rt(
                              rt({}, r.video),
                              {},
                              { facingMode: t.facingMode }
                            )));
                      case 32:
                        return e.abrupt(
                          'return',
                          navigator.mediaDevices.getUserMedia(r)
                        );
                      case 33:
                      case 'end':
                        return e.stop();
                    }
                },
                e,
                this
              );
            })
          )),
          function (e) {
            return r.apply(this, arguments);
          }),
      },
      {
        key: 'initShareStream',
        value: function (e) {
          if (e.customStream) return Promise.resolve(e.customStream);
          if (!navigator.mediaDevices)
            return (
              this.logger.onError(
                { c: Ue.TOP_ERROR, v: B.DEVICE_NOT_FOUND },
                'navigator.mediaDevices is undefined'
              ),
              Promise.reject()
            );
          if (e.screenAudio)
            Ze || et < 74
              ? this.logger.onError(
                  { c: Ue.TOP_ERROR, v: B.BROWSER_NOT_SUPPORTED },
                  'Your browser not support capture system audio'
                )
              : (e.audioConstraints = {
                  echoCancellation: !0,
                  noiseSuppression: !0,
                  sampleRate: 44100,
                });
          else if (e.audio) {
            var t = {
                audio: e.microphoneId
                  ? {
                      deviceId: { exact: e.microphoneId },
                      sampleRate: e.sampleRate,
                      channelCount: e.channelCount,
                    }
                  : { sampleRate: e.sampleRate, channelCount: e.channelCount },
                video: !1,
              },
              i = this.setConstraints(e);
            return (
              this.logger.info(
                'getDisplayMedia with contraints1: ' + JSON.stringify(i)
              ),
              new Promise(
                (function () {
                  var e = T(
                    A.mark(function e(r, n) {
                      var o;
                      return A.wrap(
                        function (e) {
                          for (;;)
                            switch ((e.prev = e.next)) {
                              case 0:
                                return (
                                  (e.prev = 0),
                                  (e.next = 3),
                                  navigator.mediaDevices.getDisplayMedia(i)
                                );
                              case 3:
                                ((o = e.sent),
                                  navigator.mediaDevices
                                    .getUserMedia(t)
                                    .then(function (e) {
                                      (o.addTrack(e.getAudioTracks()[0]), r(o));
                                    }),
                                  (e.next = 10));
                                break;
                              case 7:
                                ((e.prev = 7), (e.t0 = e.catch(0)), n(e.t0));
                              case 10:
                              case 'end':
                                return e.stop();
                            }
                        },
                        e,
                        null,
                        [[0, 7]]
                      );
                    })
                  );
                  return function (t, i) {
                    return e.apply(this, arguments);
                  };
                })()
              )
            );
          }
          var r = this.setConstraints(e);
          return (
            this.logger.info(
              'getDisplayMedia with contraints2: ' + JSON.stringify(r)
            ),
            navigator.mediaDevices.getDisplayMedia(r)
          );
        },
      },
      {
        key: 'setAudioProfile',
        value: function (e) {
          var t;
          this.mediaStream
            ? this.logger.warn('Please set audio profile before initialize!')
            : ('object' === Xe(e)
                ? (t = e)
                : void 0 === (t = Ye.get(e)) && (t = Ye.get('standard')),
              this.logger.info('setAudioProfile: ' + JSON.stringify(t)),
              this.logger.buriedLog({
                c: Ue.SET_AUDIO_PROFILE,
                v: JSON.stringify(t),
              }),
              (this.audioProfile = t),
              (this.bitrate.audio = t.bitrate));
        },
      },
      {
        key: 'setVideoProfile',
        value:
          ((i = T(
            A.mark(function e(t) {
              var i;
              return A.wrap(
                function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        if (!this.mediaStream) {
                          e.next = 3;
                          break;
                        }
                        return (
                          this.logger.warn(
                            'Please set video profile before initialize!'
                          ),
                          e.abrupt('return')
                        );
                      case 3:
                        ('object' === Xe(t)
                          ? (i = t)
                          : void 0 === (i = ze.get(t)) && (i = ze.get('480p')),
                          this.logger.info(
                            'setVideoProfile ' + JSON.stringify(i)
                          ),
                          this.logger.buriedLog({
                            c: Ue.SET_VIDEO_PROFILE,
                            v: JSON.stringify(i),
                          }),
                          (this.videoProfile = i),
                          (this.bitrate.video = i.bitrate));
                      case 8:
                      case 'end':
                        return e.stop();
                    }
                },
                e,
                this
              );
            })
          )),
          function (e) {
            return i.apply(this, arguments);
          }),
      },
      {
        key: 'setScreenProfile',
        value: function (e) {
          var t;
          this.mediaStream
            ? this.logger.warn('Please set screen profile before initialize!')
            : ('object' === Xe(e)
                ? (t = e)
                : void 0 === (t = qe.get(e)) && (t = qe.get('1080p_2')),
              this.logger.info('setScreenProfile ' + JSON.stringify(t)),
              this.logger.buriedLog({
                c: Ue.SET_SCREEN_PROFILE,
                v: JSON.stringify(t),
              }),
              (this.screenProfile = t),
              (this.bitrate.video = t.bitrate));
        },
      },
      {
        key: 'setConstraints',
        value: function (e) {
          var t = {};
          return (
            (t.video = {
              width: e.width,
              height: e.height,
              frameRate: e.frameRate,
            }),
            void 0 !== e.audioConstraints && (t.audio = e.audioConstraints),
            (this.constraints = t),
            t
          );
        },
      },
      {
        key: 'getBitrate',
        value: function () {
          return this.bitrate;
        },
      },
      {
        key: 'addTrack',
        value: function (e) {
          var t = this;
          if (!this.mediaStream)
            throw (
              this.logger.onError({ c: Ue.TOP_ERROR, v: B.ADD_TRACK_FAILED }),
              new X({
                code: B.ADD_TRACK_FAILED,
                message: 'the local stream is not initialized yet',
              })
            );
          if (
            ('audio' === e.kind && this.getAudioTracks().length > 0) ||
            ('video' === e.kind && this.getVideoTracks().length > 0)
          )
            throw (
              this.logger.onError({ c: Ue.TOP_ERROR, v: B.ADD_TRACK_FAILED }),
              new X({
                code: B.ADD_TRACK_FAILED,
                message:
                  'A Stream has at most one audio track and one video track',
              })
            );
          var i = e.getSettings();
          return (
            'video' === e.kind &&
              i &&
              this.videoSetting &&
              (i.width !== this.videoSetting.width ||
                i.height !== this.videoSetting.height) &&
              this.logger.warn(
                'video resolution of the track '
                  .concat(i.width, ' x ')
                  .concat(i.height, ' shall be kept the same as the previous: ')
                  .concat(this.videoSetting.width, ' x ')
                  .concat(this.videoSetting.height)
              ),
            new Promise(function (r, n) {
              (t._emitter.once('stream-track-update-result', function (e) {
                var i = e.code,
                  o = e.message;
                if ((t.logger.info('add track response', i), 1 === i)) r(!0);
                else {
                  t.logger.onError({ c: Ue.TOP_ERROR, v: B.ADD_TRACK_FAILED });
                  var s = new X({
                    code: B.ADD_TRACK_FAILED,
                    message: o || 'add track failed',
                  });
                  n(s);
                }
              }),
                'video' === e.kind
                  ? ((t.cameraId_ = i.deviceId), (t.cameraGroupId_ = i.groupId))
                  : 'audio' === e.kind &&
                    ((t.microphoneId_ = i.deviceId),
                    (t.microphoneGroupId_ = i.groupId)),
                t.setEnableTrackFlag(e.kind, e.enabled),
                t.logger.buriedLog({
                  c:
                    'audio' === e.kind
                      ? t.type === N
                        ? Ue.ADD_AUDIO_TRACK_SCREEN
                        : Ue.ADD_AUDIO_TRACK
                      : t.type === N
                        ? Ue.ADD_VIDEO_TRACK_SCREEN
                        : Ue.ADD_VIDEO_TRACK,
                }),
                t._emitter.emit('stream-add-track', {
                  track: e,
                  streamId: t.streamId,
                }));
            })
          );
        },
      },
      {
        key: 'removeTrack',
        value: function (e) {
          var t = this;
          if (e && 'audio' === e.kind)
            throw (
              this.logger.onError({ c: Ue.TOP_ERROR, v: B.INVALID_PARAMETER }),
              new X({
                code: B.INVALID_PARAMETER,
                message: 'remove audio track is not supported',
              })
            );
          if (!this.mediaStream)
            throw new X({
              code: B.INVALID_OPERATION,
              message: 'the local stream is not initialized yet',
            });
          if (-1 === this.mediaStream.getTracks().indexOf(e))
            throw (
              this.logger.onError({ c: Ue.TOP_ERROR, v: B.INVALID_PARAMETER }),
              new X({
                code: B.INVALID_PARAMETER,
                message: 'the track to be removed is not being publishing',
              })
            );
          if (!this.supportPC())
            throw new X({
              code: B.INVALID_OPERATION,
              message: 'removeTrack is not supported in this browser',
            });
          return (
            this.logger.info(
              'remove video track from current published stream'
            ),
            new Promise(function (i, r) {
              (t._emitter.once('stream-track-update-result', function (e) {
                var n = e.code,
                  o = e.message;
                if ((t.logger.info('remove track response', n), 1 === n)) i(!0);
                else {
                  t.logger.onError({
                    c: Ue.TOP_ERROR,
                    v: B.REMOVE_TRACK_FAILED,
                  });
                  var s = new X({
                    code: B.REMOVE_TRACK_FAILED,
                    message: o || 'remove track failed',
                  });
                  r(s);
                }
              }),
                t.logger.buriedLog({
                  c: t.type === N ? Ue.REMOVE_TRACK_SCREEN : Ue.REMOVE_TRACK,
                }),
                t._emitter.emit('stream-remove-track', {
                  track: e,
                  streamId: t.streamId,
                }));
            })
          );
        },
      },
      {
        key: 'replaceTrack',
        value: function (e) {
          if (!this.mediaStream)
            throw new X({
              code: B.INVALID_OPERATION,
              message: 'the local stream is not initialized yet',
            });
          var t = e.getSettings();
          if (
            ('video' === e.kind &&
              t &&
              this.videoSetting &&
              (t.width !== this.videoSetting.width ||
                t.height !== this.videoSetting.height) &&
              this.logger.warn(
                'video resolution of the track '
                  .concat(t.width, ' x ')
                  .concat(t.height, ' shall be kept the same as the previous: ')
                  .concat(this.videoSetting.width, ' x ')
                  .concat(this.videoSetting.height)
              ),
            'audio' === e.kind
              ? (this.mediaStream.removeTrack(this.getAudioTrack()),
                this.mediaStream.addTrack(e),
                (e.enabled = !this.getAudioMuted()),
                this.restartAudio())
              : (this.mediaStream.removeTrack(this.getVideoTrack()),
                this.mediaStream.addTrack(e),
                (e.enabled = !this.getVideoMuted()),
                this.restartVideo()),
            !this.isReplaceTrackAvailable() || !this.supportPC())
          )
            throw new X({
              code: B.INVALID_OPERATION,
              message:
                'replaceTrack is not supported in this browser, please use switchDevice or addTrack instead',
            });
          (this.logger.buriedLog({
            c:
              'audio' === e.kind
                ? this.type === N
                  ? Ue.REPLACE_AUDIO_TRACK_SCREEN
                  : Ue.REPLACE_AUDIO_TRACK
                : this.type === N
                  ? Ue.REPLACE_VIDEO_TRACK_SCREEN
                  : Ue.REPLACE_VIDEO_TRACK,
          }),
            this._emitter.emit('stream-replace-track', {
              streamId: this.streamId,
              type: e.kind,
              track: e,
            }));
        },
      },
      {
        key: 'setVideoContentHint',
        value: function (e) {
          var t = this.getVideoTrack();
          t &&
            'contentHint' in t &&
            (this.logger.info('set video track contentHint to: ' + e),
            (t.contentHint = e),
            t.contentHint !== e &&
              this.logger.info('Invalid video track contentHint: ' + e),
            this.logger.buriedLog({
              c: Ue.SET_VIDEO_CONTENT_HINT,
              v: 'hint'.concat(e),
            }));
        },
      },
      {
        key: 'switchDevice',
        value: function (e, t) {
          var i,
            r,
            n = this;
          if (this.screen)
            throw new X({
              code: B.INVALID_OPERATION,
              message: 'switch device is not supported in screen sharing',
            });
          if (
            !t ||
            this.streamConfig.audioSource ||
            this.streamConfig.videoSource
          )
            return Promise.reject();
          if (
            ('audio' === e && this.microphoneId_ === t) ||
            ('video' === e && this.cameraId_ === t)
          )
            return (
              this.logger.warn('switch device is not supported same device'),
              Promise.reject('switch device is not supported same device')
            );
          if (
            (this.logger.info('switchDevice ' + e + ' to: ' + t),
            'audio' === e && this.microphoneId_ !== t)
          ) {
            if (!(i = this.getAudioTrack()))
              return ((this.microphoneId_ = t), Promise.resolve());
            (i && i.stop(),
              (this.microphoneId_ = t),
              this.logger.buriedLog({
                c: Ue.SWITCH_DEVICE_AUDIO,
                v: 'deviceId:'.concat(t),
              }));
          }
          if ('video' === e && this.cameraId_ !== t) {
            if (!(r = this.getVideoTrack()))
              return ((this.cameraId_ = t), Promise.resolve());
            (r && r.stop(),
              (this.cameraId_ = t),
              this.logger.buriedLog({
                c: Ue.SWITCH_DEVICE_VIDEO,
                v: 'deviceId:'.concat(t),
              }));
          }
          return new Promise(function (t, o) {
            n.initAvStream({
              audio: 'audio' === e,
              video: 'video' === e,
              facingMode: n.streamConfig.facingMode,
              cameraId: n.cameraId_,
              microphoneId: n.microphoneId_,
              width: n.videoProfile.width,
              height: n.videoProfile.height,
              frameRate: n.videoProfile.frameRate,
              sampleRate: n.audioProfile.sampleRate,
              channelCount: n.audioProfile.channelCount,
            })
              .then(function (o) {
                ('audio' === e &&
                  (n.mediaStream.removeTrack(i),
                  (i = o.getAudioTracks()[0]) && n.mediaStream.addTrack(i),
                  i && n.setHasAudio(!0),
                  i &&
                    n._emitter.emit('stream-switch-device', {
                      streamId: n.streamId,
                      type: e,
                      track: i,
                    }),
                  n.updateDeviceIdInUse('audio'),
                  (i.enabled = !n.getAudioMuted()),
                  n.restartAudio()),
                  'video' == e &&
                    (n.mediaStream.removeTrack(r),
                    (r = o.getVideoTracks()[0]) && n.mediaStream.addTrack(r),
                    r && n.setHasVideo(!0),
                    r &&
                      n._emitter.emit('stream-switch-device', {
                        streamId: n.streamId,
                        type: e,
                        track: r,
                      }),
                    n.updateDeviceIdInUse('video'),
                    (r.enabled = !n.getVideoMuted()),
                    n.restartVideo()),
                  t());
              })
              .catch(function (e) {
                ((n.microphoneId_ = ''),
                  (n.cameraId_ = ''),
                  n.logger.onError({
                    c: Ue.TOP_ERROR,
                    v: B.SWITCH_DEVICE_FAILED,
                  }),
                  o(
                    new X({
                      code: B.SWITCH_DEVICE_FAILED,
                      message: 'init audio or video stream failed',
                    })
                  ),
                  n.logger.onError({
                    c: Ue.TOP_ERROR,
                    v: B.SWITCH_DEVICE_FAILED,
                  }));
                var t = new X({
                  code: B.SWITCH_DEVICE_FAILED,
                  message: e.message,
                });
                o(t);
              });
          });
        },
      },
      {
        key: 'updateStream',
        value: function (e) {
          var t = this;
          if (
            this.screen ||
            this.streamConfig.audioSource ||
            this.streamConfig.videoSource
          )
            return Promise.reject();
          var i,
            r,
            n = e.audio,
            o = e.video,
            s = e.cameraId,
            a = e.microphoneId;
          return (
            n && (i = this.getAudioTrack()),
            o && (r = this.getVideoTrack()),
            new Promise(function (e, c) {
              t.initAvStream({
                audio: n,
                video: o,
                facingMode: t.streamConfig.facingMode,
                cameraId: s || '',
                microphoneId: a || '',
                width: t.videoProfile.width,
                height: t.videoProfile.height,
                frameRate: t.videoProfile.frameRate,
                sampleRate: t.audioProfile.sampleRate,
                channelCount: t.audioProfile.channelCount,
              })
                .then(function (s) {
                  (n &&
                    (t.logger.info('updateStream audio'),
                    i && i.stop(),
                    t.mediaStream.removeTrack(i),
                    (i = s.getAudioTracks()[0]) && t.mediaStream.addTrack(i),
                    i && t.setHasAudio(!0),
                    i &&
                      t._emitter.emit('stream-switch-device', {
                        streamId: t.streamId,
                        type: 'audio',
                        track: i,
                      }),
                    t.updateDeviceIdInUse('audio'),
                    t.setAudioTrack(i)),
                    o &&
                      (t.logger.info('updateStream video'),
                      r && r.stop(),
                      t.mediaStream.removeTrack(r),
                      (r = s.getVideoTracks()[0]) && t.mediaStream.addTrack(r),
                      r && t.setHasVideo(!0),
                      r &&
                        t._emitter.emit('stream-switch-device', {
                          streamId: t.streamId,
                          type: 'video',
                          track: r,
                        }),
                      t.updateDeviceIdInUse('video'),
                      t.setVideoTrack(r)),
                    e());
                })
                .catch(function (e) {
                  (t.logger.warn(
                    'NotReadableError' === e.name
                      ? 'getUserMedia NotReadableError observed'
                      : e.name,
                    e.message
                  ),
                    t.logger.onError({
                      c: Ue.TOP_ERROR,
                      v: B.DEVICE_AUTO_RECOVER_FAILED,
                    }));
                  var i = new X({
                    code: B.DEVICE_AUTO_RECOVER_FAILED,
                    message: e,
                  });
                  (c(i), t._emitter.emit(V, i));
                });
            })
          );
        },
      },
      {
        key: 'getAudioTracks',
        value: function () {
          return this.mediaStream.getAudioTracks();
        },
      },
      {
        key: 'getVideoTracks',
        value: function () {
          return this.mediaStream.getVideoTracks();
        },
      },
      {
        key: 'isReplaceTrackAvailable',
        value: function () {
          return (
            'RTCRtpSender' in window &&
            'replaceTrack' in window.RTCRtpSender.prototype
          );
        },
      },
      {
        key: 'supportPC',
        value: function () {
          return (
            'RTCPeerConnection' in window &&
            'getSenders' in window.RTCPeerConnection.prototype
          );
        },
      },
      {
        key: 'listenForScreenSharingStopped',
        value: function (e) {
          var t = this;
          e.addEventListener(
            'ended',
            function (e) {
              (t.logger.info(
                'screen sharing was stopped because the video track is ended'
              ),
                t.logger.buriedLog({ c: Ue.ON_SCREEN_SHARING_STOPPED }),
                t._emitter.emit('screen-sharing-stopped'));
            },
            { once: !0 }
          );
        },
      },
      {
        key: 'updateDeviceIdInUse',
        value: function (e) {
          if (!this.mediaStream)
            return (
              (this.microphoneId_ = ''),
              (this.microphoneGroupId_ = ''),
              (this.cameraId_ = ''),
              (this.cameraGroupId_ = ''),
              (this.microphoneLabel_ = ''),
              void (this.cameraLabel_ = '')
            );
          for (
            var t = this.mediaStream.getTracks(), i = t.length, r = 0;
            r < i;
            r++
          ) {
            var n = t[r].getSettings(),
              o = n.deviceId,
              s = n.groupId;
            if (e && o) {
              if (e === t[r].kind && 'audio' === t[r].kind) {
                ((this.microphoneId_ = o),
                  (this.microphoneGroupId_ = s),
                  (this.microphoneLabel_ = t[r].label));
                break;
              }
              if (e === t[r].kind && 'video' === t[r].kind && !this.screen) {
                ((this.cameraId_ = o),
                  (this.cameraGroupId_ = s),
                  (this.cameraLabel_ = t[r].label));
                break;
              }
            } else
              o &&
                ('audio' === t[r].kind
                  ? ((this.microphoneId_ = o),
                    s && (this.microphoneGroupId_ = s),
                    (this.microphoneLabel_ = t[r].label))
                  : 'video' !== t[r].kind ||
                    this.screen ||
                    ((this.cameraId_ = o),
                    s && (this.cameraGroupId_ = s),
                    (this.cameraLabel_ = t[r].label)));
          }
          var a = this.mediaStream.getAudioTracks(),
            c = this.mediaStream.getVideoTracks();
          (a &&
            0 === a.length &&
            ((this.microphoneId_ = ''),
            (this.microphoneGroupId_ = ''),
            (this.microphoneLabel_ = '')),
            c &&
              0 === c.length &&
              ((this.cameraId_ = ''),
              (this.cameraGroupId_ = ''),
              (this.cameraLabel_ = '')),
            this.logger.info(
              'update device id: microphoneId: '
                .concat(this.microphoneId_, ',microphoneLabel:')
                .concat(this.microphoneLabel_, ', microphoneGroupId:')
                .concat(this.microphoneGroupId_, ',cameraId: ')
                .concat(this.cameraId_, ',cameraLabel:')
                .concat(this.cameraLabel_, ',cameraGroupId:')
                .concat(this.cameraGroupId_)
            ));
        },
      },
      {
        key: 'getDevicesInfoInUse',
        value: function () {
          return (
            this.logger.buriedLog({
              c: Ue.GET_DEVICES_INFO_IN_USE,
              v: 'microphone:'
                .concat(this.microphoneId_, ',camera:')
                .concat(this.cameraId_),
            }),
            {
              camera: {
                deviceId: this.cameraId_,
                groupId: this.cameraGroupId_,
                label: this.cameraLabel_,
              },
              microphone: {
                deviceId: this.microphoneId_,
                groupId: this.microphoneGroupId_,
                label: this.microphoneLabel_,
              },
            }
          );
        },
      },
      {
        key: 'setPubState',
        value: function (e, t) {
          'audio' === e ? (this.audioPubState = t) : (this.videoPubState = t);
        },
      },
      {
        key: 'getPubState',
        value: function (e) {
          return 'audio' === e ? this.audioPubState : this.videoPubState;
        },
      },
      {
        key: 'onTrackAdd',
        value: function (e) {
          this._emitter.on('stream-add-track', e);
        },
      },
      {
        key: 'onTrackRemove',
        value: function (e) {
          this._emitter.on('stream-remove-track', e);
        },
      },
      {
        key: 'onSwitchDevice',
        value: function (e) {
          this._emitter.on('stream-switch-device', e);
        },
      },
      {
        key: 'onReplaceTrack',
        value: function (e) {
          this._emitter.on('stream-replace-track', e);
        },
      },
      {
        key: 'onTrackStopped',
        value:
          ((t = T(
            A.mark(function e(t) {
              var i,
                r,
                n,
                o,
                s = this;
              return A.wrap(
                function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        if (
                          ((i = t.type),
                          this.logger.info(
                            'onTrackStopped',
                            (r = t.reason),
                            this.recoverCaptureCount_
                          ),
                          'audio' !== i || 'ended' !== r)
                        ) {
                          e.next = 11;
                          break;
                        }
                        if (!(this.recoverCaptureCount_ <= 10)) {
                          e.next = 9;
                          break;
                        }
                        return ((e.next = 6), We());
                      case 6:
                        ((n = e.sent.findIndex(function (e) {
                          return e.deviceId === s.microphoneId_;
                        })),
                          this.microphoneId_ &&
                            n > -1 &&
                            (this.logger.info('stat-local-audio-ended'),
                            (this.recoverCaptureCount_ += 1),
                            this.updateStream({
                              audio: !0,
                              video: !1,
                              microphoneId: this.microphoneId_,
                            })));
                      case 9:
                        e.next = 18;
                        break;
                      case 11:
                        if ('video' !== i || 'ended' !== r) {
                          e.next = 18;
                          break;
                        }
                        if (!(this.recoverCaptureCount_ <= 10)) {
                          e.next = 18;
                          break;
                        }
                        return ((e.next = 15), Be());
                      case 15:
                        ((o = e.sent.findIndex(function (e) {
                          return e.deviceId === s.cameraId_;
                        })),
                          this.cameraId_ &&
                            o > -1 &&
                            (this.logger.info('stat-local-video-ended'),
                            (this.recoverCaptureCount_ += 1),
                            this.updateStream({
                              audio: !1,
                              video: !0,
                              cameraId: this.cameraId_,
                            })));
                      case 18:
                      case 'end':
                        return e.stop();
                    }
                },
                e,
                this
              );
            })
          )),
          function (e) {
            return t.apply(this, arguments);
          }),
      },
    ]),
    s
  );
})();
var ot = (function (e) {
  H(i, Ke);
  var t = (function (e) {
    var t = (function () {
      if ('undefined' == typeof Reflect || !Reflect.construct) return !1;
      if (Reflect.construct.sham) return !1;
      if ('function' == typeof Proxy) return !0;
      try {
        return (
          Boolean.prototype.valueOf.call(
            Reflect.construct(Boolean, [], function () {})
          ),
          !0
        );
      } catch (e) {
        return !1;
      }
    })();
    return function () {
      var i,
        r = Y(e);
      if (t) {
        var n = Y(this).constructor;
        i = Reflect.construct(r, arguments, n);
      } else i = r.apply(this, arguments);
      return K(this, i);
    };
  })(i);
  function i(e, r) {
    var n;
    return (
      _(this, i),
      ((n = t.call(this, e, r)).isRemote = !0),
      (n.subscribed = !1),
      (n.audio = !1),
      (n.video = !1),
      (n.subscriptionId = null),
      (n.audioSubscriptionId = null),
      (n.videoSubscriptionId = null),
      (n.audioSubState = M.Create),
      (n.videoSubState = M.Create),
      (n.simulcastType = null),
      n
    );
  }
  return (
    O(i, [
      {
        key: 'getUserSeq',
        value: function () {
          return this.userId;
        },
      },
      {
        key: 'setAudio',
        value: function (e) {
          this.audio = e;
        },
      },
      {
        key: 'setVideo',
        value: function (e) {
          this.video = e;
        },
      },
      {
        key: 'setAudioSubscriptionId',
        value: function (e) {
          this.audioSubscriptionId = e;
        },
      },
      {
        key: 'setVideoSubscriptionId',
        value: function (e) {
          this.videoSubscriptionId = e;
        },
      },
      {
        key: 'getStreamKind',
        value: function (e) {
          return this.audioStreamId === this.videoStreamId
            ? U.AudioVideo
            : this.audioStreamId === e
              ? U.AudioOnly
              : this.videoStreamId === e
                ? U.VideoOnly
                : void 0;
        },
      },
      {
        key: 'setSimulcastType',
        value: function (e) {
          this.simulcastType = e;
        },
      },
      {
        key: 'getSimulcastType',
        value: function () {
          return this.simulcastType;
        },
      },
      {
        key: 'setSubState',
        value: function (e, t) {
          'audio' === e ? (this.audioSubState = t) : (this.videoSubState = t);
        },
      },
      {
        key: 'getSubState',
        value: function (e) {
          return 'audio' === e ? this.audioSubState : this.videoSubState;
        },
      },
    ]),
    i
  );
})();
function st(e, t) {
  var i = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      i.push.apply(i, r));
  }
  return i;
}
function at(e) {
  for (var t = 1; t < arguments.length; t++) {
    var i = null != arguments[t] ? arguments[t] : {};
    t % 2
      ? st(Object(i), !0).forEach(function (t) {
          S(e, t, i[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(i))
        : st(Object(i)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(i, t));
          });
  }
  return e;
}
var ct,
  ut,
  dt = at(at({}, Le), De);
function lt(e, t) {
  var i = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      i.push.apply(i, r));
  }
  return i;
}
function ht(e) {
  for (var t = 1; t < arguments.length; t++) {
    var i = null != arguments[t] ? arguments[t] : {};
    t % 2
      ? lt(Object(i), !0).forEach(function (t) {
          S(e, t, i[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(i))
        : lt(Object(i)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(i, t));
          });
  }
  return e;
}
(!(function (e) {
  ((e[(e.Create = 0)] = 'Create'),
    (e[(e.Publishing = 1)] = 'Publishing'),
    (e[(e.Published = 2)] = 'Published'),
    (e[(e.Unpublished = 3)] = 'Unpublished'));
})(ct || (ct = {})),
  (function (e) {
    ((e[(e.Normal = 0)] = 'Normal'), (e[(e.Half = 1)] = 'Half'));
  })(ut || (ut = {})));
var pt = (function () {
  function e(t) {
    (_(this, e),
      (this.options = t),
      (this.userId = t.userId),
      (this.streamId = null),
      (this.localStream = t.mediaStream),
      (this.peerConnection = new RTCPeerConnection({
        bundlePolicy: 'max-bundle',
        sdpSemantics: 'unified-plan',
      })),
      (this.logger = t.logger),
      (this.xsigoClient = t.xsigoClient),
      (this.roomId = t.roomId),
      (this.state = ct.Create),
      (this.transceiver = null),
      (this._emitter = new P()),
      (this._interval = -1),
      (this.audioBytesSentIs0Count = 0),
      (this.videoBytesSentIs0Count = 0),
      (this.recoverCaptureCount = 0),
      (this.times = 2e3),
      (this.timer = null),
      (this.level = ut.Normal));
  }
  var t, i;
  return (
    O(e, [
      {
        key: 'publish',
        value: function () {
          var e = this;
          return new Promise(
            (function () {
              var t = T(
                A.mark(function t(i, r) {
                  var n, o, s;
                  return A.wrap(
                    function (t) {
                      for (;;)
                        switch ((t.prev = t.next)) {
                          case 0:
                            return (
                              (t.prev = 0),
                              e.state !== ct.Create &&
                                (e.logger.warn(
                                  'Stream already publishing or published'
                                ),
                                r({
                                  message:
                                    'stream already publishing or published',
                                })),
                              e.logger.info('stream publishing'),
                              (e.state = ct.Publishing),
                              (t.next = 6),
                              e.createOffer(e.localStream)
                            );
                          case 6:
                            ((n = t.sent),
                              e.logger.info(
                                'publishStream track',
                                e.localStream.getTracks()
                              ),
                              (e.peerConnection.onconnectionstatechange =
                                e.onConnectionstatechange.bind(e, 'publish')),
                              (o = ''),
                              (s = []),
                              (e.peerConnection.onicecandidate = function (t) {
                                var a = t.candidate;
                                (e.logger.info(
                                  'peerConnection publish '
                                    .concat(
                                      JSON.stringify(
                                        e.localStream.getTracks()[0].kind
                                      ),
                                      '  IceCandidate data:\n '
                                    )
                                    .concat(
                                      (null == a ? void 0 : a.candidate) || ''
                                    )
                                ),
                                  null != a &&
                                    a.candidate &&
                                    (o = o + 'a=' + a.candidate + '\r\n'),
                                  s.push(a));
                                var c = !1,
                                  u = window.setTimeout(function () {
                                    c = !0;
                                  }, e.times);
                                if (!a || c) {
                                  (window.clearTimeout(u),
                                    (s[0] && 0 !== s.length) ||
                                      r({
                                        code: B.CANDIDATE_COLLECT_FAILED,
                                        message: 'candidate is null',
                                      }),
                                    (s = []));
                                  var d = n.sdp;
                                  if (
                                    d.toLowerCase().includes('audio') &&
                                    !d.toLowerCase().includes('opus')
                                  )
                                    return (
                                      e.logger.warn(
                                        '=======publish offer========\n',
                                        d
                                      ),
                                      r('opus not supported')
                                    );
                                  if (
                                    d.toLowerCase().includes('video') &&
                                    !d.toLowerCase().includes('h264')
                                  )
                                    return (
                                      e.logger.warn(
                                        '=======publish offer========\n',
                                        d
                                      ),
                                      r('H264 not supported')
                                    );
                                  d.includes('a=candidate') || (d += o);
                                  var l = e.buildPublishParams();
                                  ((l.params.offerSdp = d),
                                    e.logger.info(
                                      '=======publish offer========\n',
                                      d
                                    ),
                                    (e.streamId = e.xsigoClient.publishStream(
                                      e.roomId,
                                      l
                                    )),
                                    i(e.streamId));
                                }
                              }),
                              (t.next = 17));
                            break;
                          case 14:
                            ((t.prev = 14), (t.t0 = t.catch(0)), r(t.t0));
                          case 17:
                          case 'end':
                            return t.stop();
                        }
                    },
                    t,
                    null,
                    [[0, 14]]
                  );
                })
              );
              return function (e, i) {
                return t.apply(this, arguments);
              };
            })()
          );
        },
      },
      {
        key: 'republish',
        value: function () {
          var e = this;
          return new Promise(
            (function () {
              var t = T(
                A.mark(function t(i, r) {
                  var n, o;
                  return A.wrap(function (t) {
                    for (;;)
                      switch ((t.prev = t.next)) {
                        case 0:
                          return (
                            e.close(),
                            (e.peerConnection = new RTCPeerConnection({
                              bundlePolicy: 'max-bundle',
                              sdpSemantics: 'unified-plan',
                            })),
                            (e.state = ct.Publishing),
                            (t.next = 5),
                            e.createOffer(e.localStream)
                          );
                        case 5:
                          ((n = t.sent),
                            (e.peerConnection.onconnectionstatechange =
                              e.onConnectionstatechange.bind(e, 'republish')),
                            (o = ''),
                            (e.peerConnection.onicecandidate = function (t) {
                              var r = t.candidate;
                              (e.logger.info(
                                'peerConnection republish IceCandidate data:\n '.concat(
                                  (null == r ? void 0 : r.candidate) || ''
                                )
                              ),
                                null != r &&
                                  r.candidate &&
                                  (o = o + 'a=' + r.candidate + '\r\n'));
                              var s = !1,
                                a = window.setTimeout(function () {
                                  s = !0;
                                }, e.times);
                              (r && !s) ||
                                (window.clearTimeout(a),
                                n.sdp.includes('a=candidate') ||
                                  (n.sdp = n.sdp + o),
                                e.logger.info(
                                  '=======republish offer========\n',
                                  n.sdp
                                ),
                                i(n));
                            }));
                        case 9:
                        case 'end':
                          return t.stop();
                      }
                  }, t);
                })
              );
              return function (e, i) {
                return t.apply(this, arguments);
              };
            })()
          );
        },
      },
      {
        key: 'unpublish',
        value: function (e) {
          var t = this;
          this.xsigoClient.unpublishStream(
            this.roomId,
            this.streamId,
            function (i, r, n) {
              (1 === i && ((t.state = ct.Unpublished), t.close()), e(i, r, n));
            }
          );
        },
      },
      {
        key: 'updateSimulcast',
        value: function (e, t) {
          this.xsigoClient.updateSimulcast(
            this.roomId,
            this.streamId,
            { simulcast: e },
            t
          );
        },
      },
      {
        key: 'createOffer',
        value: function (e) {
          var t = this;
          return new Promise(
            (function () {
              var i = T(
                A.mark(function i(r, n) {
                  var o, s, a, c, u;
                  return A.wrap(
                    function (i) {
                      for (;;)
                        switch ((i.prev = i.next)) {
                          case 0:
                            return (
                              (o = t.options.minBitrate
                                ? t.options.minBitrate
                                : t.options.bitrate.video < 200
                                  ? t.options.bitrate.video
                                  : 200),
                              (i.prev = 1),
                              t.localStream.getTracks().forEach(function (i) {
                                var r = [];
                                if ('video' === i.kind) {
                                  var n = t.options,
                                    s = n.isEnableSmallStream,
                                    a = n.smallStreamConfig,
                                    c = n.screen,
                                    u = i.getSettings();
                                  ((t.captureVideoWidth = u.width),
                                    (t.captureVideoHeight = u.height),
                                    s &&
                                      !c &&
                                      (r.push({
                                        rid: 'h',
                                        active: !0,
                                        scaleResolutionDownBy: 1,
                                      }),
                                      r.push({
                                        rid: 'l',
                                        active: !0,
                                        scaleResolutionDownBy:
                                          t.captureVideoHeight / a.height,
                                        maxBitrate: 1e3 * a.bitrate,
                                      }),
                                      (o = t.options.minBitrate
                                        ? t.options.minBitrate
                                        : t.options.bitrate.video < 600
                                          ? t.options.bitrate.video
                                          : 600)));
                                }
                                ((t.transceiver =
                                  t.peerConnection.addTransceiver(i.kind, {
                                    direction: 'sendonly',
                                    sendEncodings: r,
                                  })),
                                  t.peerConnection.addTrack(i, e));
                              }),
                              (i.next = 5),
                              t.peerConnection.createOffer()
                            );
                          case 5:
                            (t.logger.info(
                              '=======publish offer original========\n',
                              (s = i.sent).sdp
                            ),
                              (a = []),
                              s.sdp.includes('video') &&
                                ((c = (c = s.sdp.split('\r\n')).map(
                                  function (e) {
                                    if (
                                      e.includes('a=rtpmap') &&
                                      !e.toLowerCase().includes('h264')
                                    ) {
                                      var t = e.indexOf(':') + 1,
                                        i = e.indexOf(' ');
                                      a.push(e.slice(t, i));
                                    }
                                    return e.includes('a=fmtp:') && o
                                      ? e + ';x-google-min-bitrate='.concat(o)
                                      : e;
                                  }
                                )),
                                a.length &&
                                  a.forEach(function (e) {
                                    c = c.filter(function (t) {
                                      return !(
                                        t.includes('a=rtpmap:' + e) ||
                                        t.includes('a=fmtp:' + e) ||
                                        t.includes('a=rtcp-fb:' + e)
                                      );
                                    });
                                  }),
                                (s.sdp = c.join('\r\n'))),
                              s.sdp.includes('audio') &&
                                ((u = s.sdp.split('\r\n')).forEach(
                                  function (e) {
                                    if (
                                      e.includes('a=rtpmap') &&
                                      !e.toLowerCase().includes('opus')
                                    ) {
                                      var t = e.indexOf(':') + 1,
                                        i = e.indexOf(' ');
                                      a.push(e.slice(t, i));
                                    }
                                  }
                                ),
                                a.length &&
                                  a.forEach(function (e) {
                                    u = u.filter(function (t) {
                                      return !(
                                        t.includes('a=rtpmap:' + e) ||
                                        t.includes('a=fmtp:' + e) ||
                                        t.includes('a=rtcp-fb:' + e)
                                      );
                                    });
                                  }),
                                (s.sdp = u.join('\r\n'))),
                              r(s),
                              t.logger.info(
                                '=======publish offer old========\n',
                                s.sdp
                              ),
                              t.peerConnection.setLocalDescription(s),
                              (i.next = 20));
                            break;
                          case 15:
                            throw (
                              (i.prev = 15),
                              (i.t0 = i.catch(1)),
                              t.logger.onError(
                                { c: dt.TOP_ERROR, v: B.CREATE_OFFER_FAILED },
                                'code:'
                                  .concat(
                                    B.CREATE_OFFER_FAILED,
                                    ',create offer error!, '
                                  )
                                  .concat(i.t0)
                              ),
                              (t.state = ct.Create),
                              new X({
                                code: B.CREATE_OFFER_FAILED,
                                message: 'create offer error!,'.concat(i.t0),
                              })
                            );
                          case 20:
                          case 'end':
                            return i.stop();
                        }
                    },
                    i,
                    null,
                    [[1, 15]]
                  );
                })
              );
              return function (e, t) {
                return i.apply(this, arguments);
              };
            })()
          );
        },
      },
      {
        key: 'onConnectionstatechange',
        value: function (e) {
          var t = this;
          (['failed', 'connected'].includes(
            this.peerConnection.connectionState
          ) &&
            this._emitter.emit('publish-ice-state', {
              state: this.peerConnection.connectionState,
              streamId: this.streamId,
            }),
            this.logger.info(
              'peerConnection '
                .concat(e, ' ICE State: ')
                .concat(this.peerConnection.connectionState)
            ),
            'connecting' === this.peerConnection.connectionState
              ? -1 === this._interval &&
                (this._interval = window.setInterval(function () {
                  t.getRTCIceCandidatePairStats();
                }, this.times))
              : 'connected' === this.peerConnection.connectionState
                ? (this.localStream.getTracks().forEach(function (e) {
                    (t.peerConnection.getSenders() || []).forEach(function (t) {
                      t.replaceTrack(e);
                    });
                  }),
                  clearInterval(this._interval))
                : clearInterval(this._interval));
        },
      },
      {
        key: 'filterCodecs',
        value: function (e) {
          if (RTCRtpSender.getCapabilities) {
            var t = RTCRtpSender.getCapabilities(e.kind).codecs.filter(
              function (t) {
                return 'audio' === e.kind
                  ? -1 != t.mimeType.indexOf('opus')
                  : -1 != t.mimeType.indexOf('H264');
              }
            );
            this.transceiver.setCodecPreferences &&
              'function' == typeof this.transceiver.setCodecPreferences &&
              this.transceiver.setCodecPreferences(t);
          }
        },
      },
      {
        key: 'setRemoteDesc',
        value: function (e, t) {
          var i = this;
          return new Promise(function (r, n) {
            var o = e.split('\r\n');
            if (!o.includes('a=ptime')) {
              var s = o.findIndex(function (e) {
                return e.includes('a=fmtp');
              });
              -1 !== s && o.splice(s, 0, 'a=ptime:10');
            }
            if (!e.includes('x-google-min-bitrate')) {
              var a = i.options.minBitrate
                  ? i.options.minBitrate
                  : i.options.bitrate.video < 200
                    ? i.options.bitrate.video
                    : 200,
                c = i.options;
              (c.isEnableSmallStream &&
                !c.screen &&
                (a = i.options.minBitrate
                  ? i.options.minBitrate
                  : i.options.bitrate.video < 600
                    ? i.options.bitrate.video
                    : 600),
                (o = o.map(function (e) {
                  return e.includes('a=fmtp:') && a
                    ? e + ';x-google-min-bitrate='.concat(a)
                    : e;
                })));
            }
            var u = o.join('\r\n');
            (i.logger.info('=======publish answer========\n', u),
              (i.state = ct.Published),
              (i.streamId = t),
              i.peerConnection
                .setRemoteDescription({ sdp: u, type: 'answer' })
                .then(function () {
                  (i.setBandwidth(i.options.bitrate), r(!0));
                })
                .catch(function (e) {
                  (i.logger.error('publish setRemoteDescription error', e),
                    n(e));
                }));
          });
        },
      },
      {
        key: 'getPeerConnection',
        value: function () {
          return this.peerConnection;
        },
      },
      {
        key: 'close',
        value: function () {
          (this.peerConnection &&
            ((this.peerConnection.onicecandidate = null),
            (this.peerConnection.onconnectionstatechange = null),
            this.peerConnection.close()),
            (this.peerConnection = null),
            (this.transceiver = null),
            this._interval && clearInterval(this._interval),
            (this._interval = null),
            this.timer && clearInterval(this.timer),
            (this.timer = null),
            (this.audioBytesSentIs0Count = 0),
            (this.videoBytesSentIs0Count = 0),
            (this.recoverCaptureCount = 0),
            this.logger.info(
              'close publish stream peerConnection,streamId',
              this.streamId
            ));
        },
      },
      {
        key: 'setBandwidth',
        value: function (e) {
          var t = this,
            i = this.peerConnection.getSenders(),
            r = e.audio,
            n = e.video;
          i.forEach(function (e) {
            var i = e.getParameters();
            if (
              (i.encodings.length || (i.encodings = [{}]),
              'video' === e.track.kind)
            ) {
              var o = t.options;
              (o.isEnableSmallStream && !o.screen && t.onchangeNet(e),
                (i.encodings[0].maxBitrate = t.options.maxBitrate
                  ? 1e3 * t.options.maxBitrate
                  : 1e3 * n));
            }
            ('audio' === e.track.kind && (i.encodings[0].maxBitrate = 1e3 * r),
              t.logger.info('encodings', JSON.stringify(i.encodings)),
              e.setParameters(i).then(
                function () {
                  t.logger.info(
                    ''
                      .concat(e.track.kind, ' set bitrate to ')
                      .concat(i.encodings[0].maxBitrate, ' success')
                  );
                },
                function (i) {
                  t.logger.warn(
                    ''.concat(e.track.kind, ' set bitrate error'),
                    i
                  );
                }
              ));
          });
        },
      },
      {
        key: 'onchangeNet',
        value: function (e) {
          var t,
            i = this,
            r = 0,
            n = 0;
          this.timer = setInterval(
            T(
              A.mark(function o() {
                var s, a, c, u, d, l, h, p, f;
                return A.wrap(function (o) {
                  for (;;)
                    switch ((o.prev = o.next)) {
                      case 0:
                        ((s = i.level), (a = Date.now()), (c = []), (u = []));
                      case 4:
                        if (!(Date.now() - a < 4e3)) {
                          o.next = 13;
                          break;
                        }
                        return ((o.next = 7), i.getLocalStats('video'));
                      case 7:
                        return (
                          (t = o.sent)
                            ? ((l =
                                (d = t.video.retransmittedPacketsSent - r) <= 0
                                  ? 0
                                  : Math.floor(
                                      (d / (t.video.packetsSent - n)) * 100
                                    )),
                              (r = t.video.retransmittedPacketsSent),
                              (n = t.video.packetsSent),
                              c.push(t.rtt),
                              u.push(l))
                            : (c.push(0), u.push(0)),
                          (o.next = 11),
                          new Promise(function (e) {
                            return setTimeout(e, 1e3);
                          })
                        );
                      case 11:
                        o.next = 4;
                        break;
                      case 13:
                        if (
                          ((h =
                            c.reduce(function (e, t) {
                              return e + t;
                            }, 0) / c.length),
                          (p =
                            u.reduce(function (e, t) {
                              return e + t;
                            }, 0) / c.length),
                          (f = e.getParameters()).encodings.length &&
                            f.encodings[0])
                        ) {
                          o.next = 18;
                          break;
                        }
                        return o.abrupt('return');
                      case 18:
                        if (
                          (h < 150 && p < 30
                            ? ((f.encodings[0].scaleResolutionDownBy = 1),
                              (i.level = ut.Normal))
                            : (h >= 150 || p >= 30) &&
                              ((i.level = ut.Half),
                              (f.encodings[0].scaleResolutionDownBy = 2)),
                          s !== i.level)
                        ) {
                          o.next = 21;
                          break;
                        }
                        return o.abrupt('return');
                      case 21:
                        e.setParameters(f).then(
                          function () {
                            i.logger.info(
                              'video onchangeBitrite set success '.concat(
                                i.level
                              )
                            );
                          },
                          function (e) {
                            i.logger.warn(
                              'video onchangeBitrite set failed '.concat(
                                i.level
                              ),
                              e
                            );
                          }
                        );
                      case 22:
                      case 'end':
                        return o.stop();
                    }
                }, o);
              })
            ),
            4e3
          );
        },
      },
      {
        key: 'replaceMediaStreamTrack',
        value: function (e) {
          var t = this;
          (this.logger.info('replace mediaStream Track', e),
            this.peerConnection &&
              e &&
              (this.peerConnection.getSenders() || []).forEach(function (i) {
                if ('audio' === e.kind && i.track && 'audio' === i.track.kind) {
                  i.replaceTrack(e);
                  var r = t.localStream.getAudioTracks()[0];
                  (r && t.localStream.removeTrack(r),
                    r && t.localStream.addTrack(e));
                }
                if ('video' === e.kind && i.track && 'video' === i.track.kind) {
                  i.replaceTrack(e);
                  var n = t.localStream.getVideoTracks()[0];
                  (n && t.localStream.removeTrack(n),
                    n && t.localStream.addTrack(e));
                }
              }));
          var i =
            'audio' === e.kind
              ? this.localStream.getAudioTracks()[0]
              : this.localStream.getVideoTracks()[0];
          (i && this.localStream.removeTrack(i),
            i && this.localStream.addTrack(e));
        },
      },
      {
        key: 'buildPublishParams',
        value: function () {
          var e = this,
            t = this.options || {},
            i = t.hasAudio,
            r = t.hasVideo,
            n = t.screen,
            o = {
              streamType: he.ForwardStream,
              streamKind:
                i && r
                  ? pe.AudioVideo
                  : i
                    ? pe.AudioOnly
                    : r
                      ? pe.VideoOnly
                      : pe.Invalid,
              params: {
                offerSdp: '',
                audioInfo: {
                  source: n ? me.ScreenShare : me.Microphone,
                  muted: t.audioMuted,
                  floor: !0,
                },
                videoInfo: {
                  source: n ? ge.ScreenShare : ge.Camera,
                  muted: t.videoMuted,
                  floor: !0,
                },
              },
              cb: function (t, i, r) {
                1 === t
                  ? e
                      .setRemoteDesc(r.answer_sdp, r.streamId)
                      .then(function () {
                        e.options.onPublish && e.options.onPublish(t, i, r);
                      })
                      .catch(function (t) {
                        e.options.onPublish && e.options.onPublish(0, t, r);
                      })
                  : e.options.onPublish && e.options.onPublish(t, i, r);
              },
              updateCb: function () {},
            },
            s = this.options,
            a = s.smallStreamConfig,
            c = [];
          if (s.isEnableSmallStream && !n) {
            if (
              (this.logger.info(
                'publish width height',
                this.captureVideoWidth,
                this.captureVideoHeight
              ),
              this.captureVideoWidth > 0 && this.captureVideoHeight > 0)
            ) {
              var u = {
                type: ve.SmallStream,
                maxWidth: a.width,
                maxHeight: a.height,
              };
              (c.push({
                type: ve.BigStream,
                maxWidth: this.captureVideoWidth,
                maxHeight: this.captureVideoHeight,
              }),
                c.push(u));
            }
            o.params.videoInfo.simulcast = c;
          }
          return o;
        },
      },
      {
        key: 'getTransportStats',
        value:
          ((i = T(
            A.mark(function e() {
              var t = this;
              return A.wrap(function (e) {
                for (;;)
                  switch ((e.prev = e.next)) {
                    case 0:
                      return e.abrupt(
                        'return',
                        new Promise(function (e, i) {
                          if (t.peerConnection) {
                            var r,
                              n = (t.peerConnection.getSenders() || [])[0];
                            n &&
                              n.getStats().then(
                                function (i) {
                                  ((r = t.getSenderStats({
                                    send: i,
                                    mediaType: n.track.kind,
                                  })),
                                    e(r));
                                },
                                function (e) {
                                  (t.logger.onError(
                                    {
                                      c: dt.TOP_ERROR,
                                      v: B.INVALID_TRANSPORT_STATA,
                                    },
                                    'Get transport stats error, '.concat(e)
                                  ),
                                    i(e.message));
                                }
                              );
                          }
                        })
                      );
                    case 1:
                    case 'end':
                      return e.stop();
                  }
              }, e);
            })
          )),
          function () {
            return i.apply(this, arguments);
          }),
      },
      {
        key: 'getLocalStats',
        value:
          ((t = T(
            A.mark(function e(t) {
              var i = this;
              return A.wrap(function (e) {
                for (;;)
                  switch ((e.prev = e.next)) {
                    case 0:
                      return e.abrupt(
                        'return',
                        new Promise(function (e, r) {
                          if (i.peerConnection) {
                            var n,
                              o = (i.peerConnection.getSenders() || []).find(
                                function (e) {
                                  return e.track.kind === t;
                                }
                              );
                            o &&
                              o
                                .getStats()
                                .then(function (r) {
                                  ((n = i.getSenderStats({
                                    send: r,
                                    mediaType: t,
                                  })),
                                    e(n));
                                })
                                .catch(function (e) {
                                  r(e.message);
                                });
                          }
                        })
                      );
                    case 1:
                    case 'end':
                      return e.stop();
                  }
              }, e);
            })
          )),
          function (e) {
            return t.apply(this, arguments);
          }),
      },
      {
        key: 'getSenderStats',
        value: function (e) {
          var t = this,
            i = {
              audio: {
                bytesSent: 0,
                packetsSent: 0,
                retransmittedPacketsSent: 0,
                audioLevel: 0,
              },
              video: {
                bytesSent: 0,
                packetsSent: 0,
                framesEncoded: 0,
                frameWidth: 0,
                frameHeight: 0,
                framesSent: 0,
                retransmittedPacketsSent: 0,
                framesPerSecond: 0,
                rid: 'h',
              },
              smallVideo: {
                bytesSent: 0,
                packetsSent: 0,
                framesEncoded: 0,
                frameWidth: 0,
                frameHeight: 0,
                framesSent: 0,
                retransmittedPacketsSent: 0,
                framesPerSecond: 0,
                rid: 'l',
              },
              rtt: 0,
              timestamp: 0,
            };
          return (
            e.send.forEach(function (r) {
              if ('outbound-rtp' === r.type)
                if (
                  ((i.timestamp = r.timestamp),
                  'video' === e.mediaType && 'l' === r.rid)
                ) {
                  if (0 === r.bytesSent) return;
                  i.smallVideo = ht(
                    ht({}, i.smallVideo),
                    {},
                    {
                      bytesSent: r.bytesSent,
                      packetsSent: r.packetsSent,
                      framesEncoded: r.framesEncoded,
                      retransmittedPacketsSent: r.retransmittedPacketsSent || 0,
                      framesPerSecond: r.framesPerSecond || 0,
                      frameWidth: r.frameWidth || 0,
                      frameHeight: r.frameHeight || 0,
                      framesSent: r.framesSent,
                      rid: r.rid || 'l',
                    }
                  );
                } else if ('video' === e.mediaType) {
                  if (0 === r.bytesSent) return;
                  ((i.video = ht(
                    ht({}, i.video),
                    {},
                    {
                      bytesSent: r.bytesSent,
                      packetsSent: r.packetsSent,
                      framesEncoded: r.framesEncoded,
                      retransmittedPacketsSent: r.retransmittedPacketsSent || 0,
                      rid: r.rid || 'h',
                    }
                  )),
                    void 0 !== r.framesPerSecond &&
                      (i.video.framesPerSecond = r.framesPerSecond),
                    void 0 !== r.frameWidth &&
                      (i.video.frameWidth = r.frameWidth),
                    void 0 !== r.frameHeight &&
                      (i.video.frameHeight = r.frameHeight),
                    void 0 !== r.framesSent &&
                      (i.video.framesSent = r.framesSent));
                } else
                  'audio' === e.mediaType &&
                    (i.audio = ht(
                      ht({}, i.audio),
                      {},
                      {
                        bytesSent: r.bytesSent,
                        packetsSent: r.packetsSent,
                        retransmittedPacketsSent:
                          r.retransmittedPacketsSent || 0,
                      }
                    ));
              else if ('candidate-pair' === r.type)
                'number' == typeof r.currentRoundTripTime &&
                  (i.rtt = 1e3 * r.currentRoundTripTime);
              else if ('track' === r.type) {
                if (void 0 !== r.frameWidth) {
                  var n = t.localStream.getVideoTracks();
                  n.length &&
                    n[0].id === r.trackIdentifier &&
                    ((i.video.frameWidth = r.frameWidth),
                    (i.video.frameHeight = r.frameHeight),
                    (i.video.framesSent = r.framesSent));
                }
              } else if ('media-source' === r.type)
                if ('video' === r.kind) {
                  var o = t.localStream.getVideoTracks();
                  o.length &&
                    o[0].id === r.trackIdentifier &&
                    void 0 !== r.framesPerSecond &&
                    (i.video.framesPerSecond = r.framesPerSecond);
                } else
                  'audio' === r.kind &&
                    (i.audio.audioLevel = r.audioLevel || 0);
            }),
            i
          );
        },
      },
      {
        key: 'onPublishPeerConnectionFailed',
        value: function (e) {
          this._emitter.on('publish-ice-state', e);
        },
      },
      {
        key: 'getRTCIceCandidatePairStats',
        value: function () {
          var e = this;
          this.peerConnection &&
            this.peerConnection.getStats().then(function (t) {
              t.forEach(function (t) {
                'candidate-pair' === t.type &&
                  e.logger.warn(
                    'publish RTCIceCandidatePairStats',
                    JSON.stringify(t, null, 4)
                  );
              });
            });
        },
      },
      {
        key: 'updateBytesSentIs0Count',
        value: function (e) {
          var t = this;
          if ('audio' === e) {
            var i,
              r = this.localStream.getAudioTracks();
            r.length &&
              'connected' ===
                (null === (i = this.peerConnection) || void 0 === i
                  ? void 0
                  : i.connectionState) &&
              ((this.audioBytesSentIs0Count += 1),
              this.audioBytesSentIs0Count >= 4 &&
                this.recoverCaptureCount <= 5 &&
                ((this.recoverCaptureCount += 1),
                (this.audioBytesSentIs0Count = 0),
                r.forEach(function (e) {
                  (t.peerConnection.getSenders() || []).forEach(function (t) {
                    'audio' === t.track.kind && t.replaceTrack(e);
                  });
                }),
                this.logger.info(
                  'replace the track because the audio bytes sent is 0,recover count:',
                  this.recoverCaptureCount
                )));
          } else if ('video' === e) {
            var n,
              o = this.localStream.getVideoTracks();
            o.length &&
              'connected' ===
                (null === (n = this.peerConnection) || void 0 === n
                  ? void 0
                  : n.connectionState) &&
              ((this.videoBytesSentIs0Count += 1),
              this.videoBytesSentIs0Count >= 4 &&
                this.recoverCaptureCount <= 5 &&
                ((this.recoverCaptureCount += 1),
                (this.videoBytesSentIs0Count = 0),
                o.forEach(function (e) {
                  (t.peerConnection.getSenders() || []).forEach(function (t) {
                    'video' === t.track.kind && t.replaceTrack(e);
                  });
                }),
                this.logger.info(
                  'replace the track because the video bytes sent is 0,recover count:',
                  this.recoverCaptureCount
                )));
          }
        },
      },
    ]),
    e
  );
})();
function ft(e, t) {
  var i = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      i.push.apply(i, r));
  }
  return i;
}
function mt(e) {
  for (var t = 1; t < arguments.length; t++) {
    var i = null != arguments[t] ? arguments[t] : {};
    t % 2
      ? ft(Object(i), !0).forEach(function (t) {
          S(e, t, i[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(i))
        : ft(Object(i)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(i, t));
          });
  }
  return e;
}
var gt,
  vt = (function () {
    function e(t) {
      (_(this, e),
        (this.subscribedStreams = new Map()),
        (this.subscriptedOptions = new Map()),
        (this.subscriptedState = new Map()),
        (this.logger = t));
    }
    return (
      O(e, [
        {
          key: 'addSubscriptionRecord',
          value: function (e, t) {
            this.subscribedStreams.set(e, t);
          },
        },
        {
          key: 'setSubscriptionOpts',
          value: function (e, t) {
            (this.logger.debug('set subscribe options:', t),
              this.subscriptedOptions.set(e, t));
          },
        },
        {
          key: 'getSubscriptionOpts',
          value: function (e) {
            return (
              this.subscriptedOptions.get(e) || {
                audio: !0,
                video: !0,
                small: !1,
              }
            );
          },
        },
        {
          key: 'updateSubscriptedState',
          value: function (e, t) {
            var i = mt(mt({}, this.getSubscriptedState(e)), t);
            (this.subscriptedState.set(e, i),
              this.logger.info(
                '-----\x3e update subscribe state <----------',
                e,
                JSON.stringify(i)
              ));
          },
        },
        {
          key: 'getSubscriptedState',
          value: function (e) {
            return (
              this.subscriptedState.get(e) || {
                audio: !1,
                video: !1,
                small: !1,
              }
            );
          },
        },
        {
          key: 'needSubscribeKind',
          value: function (e) {
            var t = this.subscriptedState.get(e) || { audio: !1, video: !1 },
              i = this.subscriptedOptions.get(e) || { audio: !1, video: !1 };
            return (
              this.logger.info('subscribe state', t),
              this.logger.info('subscribe options:', i),
              i.audio && !t.audio && i.video && !t.video
                ? U.AudioVideo
                : i.audio && !t.audio
                  ? U.AudioOnly
                  : i.video && !t.video
                    ? U.VideoOnly
                    : void 0
            );
          },
        },
        {
          key: 'reset',
          value: function (e) {
            if (e)
              return (
                this.subscriptedState.delete(e),
                this.subscribedStreams.delete(e),
                void this.subscriptedOptions.delete(e)
              );
            (this.subscriptedState.clear(),
              this.subscribedStreams.clear(),
              this.subscriptedOptions.clear());
          },
        },
      ]),
      e
    );
  })(),
  bt = w(function (e) {
    var t = (e.exports = {
      v: [{ name: 'version', reg: /^(\d*)$/ }],
      o: [
        {
          name: 'origin',
          reg: /^(\S*) (\d*) (\d*) (\S*) IP(\d) (\S*)/,
          names: [
            'username',
            'sessionId',
            'sessionVersion',
            'netType',
            'ipVer',
            'address',
          ],
          format: '%s %s %d %s IP%d %s',
        },
      ],
      s: [{ name: 'name' }],
      i: [{ name: 'description' }],
      u: [{ name: 'uri' }],
      e: [{ name: 'email' }],
      p: [{ name: 'phone' }],
      z: [{ name: 'timezones' }],
      r: [{ name: 'repeats' }],
      t: [
        {
          name: 'timing',
          reg: /^(\d*) (\d*)/,
          names: ['start', 'stop'],
          format: '%d %d',
        },
      ],
      c: [
        {
          name: 'connection',
          reg: /^IN IP(\d) (\S*)/,
          names: ['version', 'ip'],
          format: 'IN IP%d %s',
        },
      ],
      b: [
        {
          push: 'bandwidth',
          reg: /^(TIAS|AS|CT|RR|RS):(\d*)/,
          names: ['type', 'limit'],
          format: '%s:%s',
        },
      ],
      m: [
        {
          reg: /^(\w*) (\d*) ([\w/]*)(?: (.*))?/,
          names: ['type', 'port', 'protocol', 'payloads'],
          format: '%s %d %s %s',
        },
      ],
      a: [
        {
          push: 'rtp',
          reg: /^rtpmap:(\d*) ([\w\-.]*)(?:\s*\/(\d*)(?:\s*\/(\S*))?)?/,
          names: ['payload', 'codec', 'rate', 'encoding'],
          format: function (e) {
            return e.encoding
              ? 'rtpmap:%d %s/%s/%s'
              : e.rate
                ? 'rtpmap:%d %s/%s'
                : 'rtpmap:%d %s';
          },
        },
        {
          push: 'fmtp',
          reg: /^fmtp:(\d*) ([\S| ]*)/,
          names: ['payload', 'config'],
          format: 'fmtp:%d %s',
        },
        { name: 'control', reg: /^control:(.*)/, format: 'control:%s' },
        {
          name: 'rtcp',
          reg: /^rtcp:(\d*)(?: (\S*) IP(\d) (\S*))?/,
          names: ['port', 'netType', 'ipVer', 'address'],
          format: function (e) {
            return null != e.address ? 'rtcp:%d %s IP%d %s' : 'rtcp:%d';
          },
        },
        {
          push: 'rtcpFbTrrInt',
          reg: /^rtcp-fb:(\*|\d*) trr-int (\d*)/,
          names: ['payload', 'value'],
          format: 'rtcp-fb:%s trr-int %d',
        },
        {
          push: 'rtcpFb',
          reg: /^rtcp-fb:(\*|\d*) ([\w-_]*)(?: ([\w-_]*))?/,
          names: ['payload', 'type', 'subtype'],
          format: function (e) {
            return null != e.subtype ? 'rtcp-fb:%s %s %s' : 'rtcp-fb:%s %s';
          },
        },
        {
          push: 'ext',
          reg: /^extmap:(\d+)(?:\/(\w+))?(?: (urn:ietf:params:rtp-hdrext:encrypt))? (\S*)(?: (\S*))?/,
          names: ['value', 'direction', 'encrypt-uri', 'uri', 'config'],
          format: function (e) {
            return (
              'extmap:%d' +
              (e.direction ? '/%s' : '%v') +
              (e['encrypt-uri'] ? ' %s' : '%v') +
              ' %s' +
              (e.config ? ' %s' : '')
            );
          },
        },
        { name: 'extmapAllowMixed', reg: /^(extmap-allow-mixed)/ },
        {
          push: 'crypto',
          reg: /^crypto:(\d*) ([\w_]*) (\S*)(?: (\S*))?/,
          names: ['id', 'suite', 'config', 'sessionConfig'],
          format: function (e) {
            return null != e.sessionConfig
              ? 'crypto:%d %s %s %s'
              : 'crypto:%d %s %s';
          },
        },
        { name: 'setup', reg: /^setup:(\w*)/, format: 'setup:%s' },
        {
          name: 'connectionType',
          reg: /^connection:(new|existing)/,
          format: 'connection:%s',
        },
        { name: 'mid', reg: /^mid:([^\s]*)/, format: 'mid:%s' },
        { name: 'msid', reg: /^msid:(.*)/, format: 'msid:%s' },
        { name: 'ptime', reg: /^ptime:(\d*(?:\.\d*)*)/, format: 'ptime:%d' },
        {
          name: 'maxptime',
          reg: /^maxptime:(\d*(?:\.\d*)*)/,
          format: 'maxptime:%d',
        },
        { name: 'direction', reg: /^(sendrecv|recvonly|sendonly|inactive)/ },
        { name: 'icelite', reg: /^(ice-lite)/ },
        { name: 'iceUfrag', reg: /^ice-ufrag:(\S*)/, format: 'ice-ufrag:%s' },
        { name: 'icePwd', reg: /^ice-pwd:(\S*)/, format: 'ice-pwd:%s' },
        {
          name: 'fingerprint',
          reg: /^fingerprint:(\S*) (\S*)/,
          names: ['type', 'hash'],
          format: 'fingerprint:%s %s',
        },
        {
          push: 'candidates',
          reg: /^candidate:(\S*) (\d*) (\S*) (\d*) (\S*) (\d*) typ (\S*)(?: raddr (\S*) rport (\d*))?(?: tcptype (\S*))?(?: generation (\d*))?(?: network-id (\d*))?(?: network-cost (\d*))?/,
          names: [
            'foundation',
            'component',
            'transport',
            'priority',
            'ip',
            'port',
            'type',
            'raddr',
            'rport',
            'tcptype',
            'generation',
            'network-id',
            'network-cost',
          ],
          format: function (e) {
            var t = 'candidate:%s %d %s %d %s %d typ %s';
            return (
              (t += null != e.raddr ? ' raddr %s rport %d' : '%v%v'),
              (t += null != e.tcptype ? ' tcptype %s' : '%v'),
              null != e.generation && (t += ' generation %d'),
              (t += null != e['network-id'] ? ' network-id %d' : '%v') +
                (null != e['network-cost'] ? ' network-cost %d' : '%v')
            );
          },
        },
        { name: 'endOfCandidates', reg: /^(end-of-candidates)/ },
        {
          name: 'remoteCandidates',
          reg: /^remote-candidates:(.*)/,
          format: 'remote-candidates:%s',
        },
        {
          name: 'iceOptions',
          reg: /^ice-options:(\S*)/,
          format: 'ice-options:%s',
        },
        {
          push: 'ssrcs',
          reg: /^ssrc:(\d*) ([\w_-]*)(?::(.*))?/,
          names: ['id', 'attribute', 'value'],
          format: function (e) {
            var t = 'ssrc:%d';
            return (
              null != e.attribute &&
                ((t += ' %s'), null != e.value && (t += ':%s')),
              t
            );
          },
        },
        {
          push: 'ssrcGroups',
          reg: /^ssrc-group:([\x21\x23\x24\x25\x26\x27\x2A\x2B\x2D\x2E\w]*) (.*)/,
          names: ['semantics', 'ssrcs'],
          format: 'ssrc-group:%s %s',
        },
        {
          name: 'msidSemantic',
          reg: /^msid-semantic:\s?(\w*) (\S*)/,
          names: ['semantic', 'token'],
          format: 'msid-semantic: %s %s',
        },
        {
          push: 'groups',
          reg: /^group:(\w*) (.*)/,
          names: ['type', 'mids'],
          format: 'group:%s %s',
        },
        { name: 'rtcpMux', reg: /^(rtcp-mux)/ },
        { name: 'rtcpRsize', reg: /^(rtcp-rsize)/ },
        {
          name: 'sctpmap',
          reg: /^sctpmap:([\w_/]*) (\S*)(?: (\S*))?/,
          names: ['sctpmapNumber', 'app', 'maxMessageSize'],
          format: function (e) {
            return null != e.maxMessageSize
              ? 'sctpmap:%s %s %s'
              : 'sctpmap:%s %s';
          },
        },
        {
          name: 'xGoogleFlag',
          reg: /^x-google-flag:([^\s]*)/,
          format: 'x-google-flag:%s',
        },
        {
          push: 'rids',
          reg: /^rid:([\d\w]+) (\w+)(?: ([\S| ]*))?/,
          names: ['id', 'direction', 'params'],
          format: function (e) {
            return e.params ? 'rid:%s %s %s' : 'rid:%s %s';
          },
        },
        {
          push: 'imageattrs',
          reg: new RegExp(
            '^imageattr:(\\d+|\\*)[\\s\\t]+(send|recv)[\\s\\t]+(\\*|\\[\\S+\\](?:[\\s\\t]+\\[\\S+\\])*)(?:[\\s\\t]+(recv|send)[\\s\\t]+(\\*|\\[\\S+\\](?:[\\s\\t]+\\[\\S+\\])*))?'
          ),
          names: ['pt', 'dir1', 'attrs1', 'dir2', 'attrs2'],
          format: function (e) {
            return 'imageattr:%s %s %s' + (e.dir2 ? ' %s %s' : '');
          },
        },
        {
          name: 'simulcast',
          reg: new RegExp(
            '^simulcast:(send|recv) ([a-zA-Z0-9\\-_~;,]+)(?:\\s?(send|recv) ([a-zA-Z0-9\\-_~;,]+))?$'
          ),
          names: ['dir1', 'list1', 'dir2', 'list2'],
          format: function (e) {
            return 'simulcast:%s %s' + (e.dir2 ? ' %s %s' : '');
          },
        },
        {
          name: 'simulcast_03',
          reg: /^simulcast:[\s\t]+([\S+\s\t]+)$/,
          names: ['value'],
          format: 'simulcast: %s',
        },
        {
          name: 'framerate',
          reg: /^framerate:(\d+(?:$|\.\d+))/,
          format: 'framerate:%s',
        },
        {
          name: 'sourceFilter',
          reg: /^source-filter: *(excl|incl) (\S*) (IP4|IP6|\*) (\S*) (.*)/,
          names: [
            'filterMode',
            'netType',
            'addressTypes',
            'destAddress',
            'srcList',
          ],
          format: 'source-filter: %s %s %s %s %s',
        },
        { name: 'bundleOnly', reg: /^(bundle-only)/ },
        { name: 'label', reg: /^label:(.+)/, format: 'label:%s' },
        { name: 'sctpPort', reg: /^sctp-port:(\d+)$/, format: 'sctp-port:%s' },
        {
          name: 'maxMessageSize',
          reg: /^max-message-size:(\d+)$/,
          format: 'max-message-size:%s',
        },
        {
          push: 'tsRefClocks',
          reg: /^ts-refclk:([^\s=]*)(?:=(\S*))?/,
          names: ['clksrc', 'clksrcExt'],
          format: function (e) {
            return 'ts-refclk:%s' + (null != e.clksrcExt ? '=%s' : '');
          },
        },
        {
          name: 'mediaClk',
          reg: /^mediaclk:(?:id=(\S*))? *([^\s=]*)(?:=(\S*))?(?: *rate=(\d+)\/(\d+))?/,
          names: [
            'id',
            'mediaClockName',
            'mediaClockValue',
            'rateNumerator',
            'rateDenominator',
          ],
          format: function (e) {
            var t = 'mediaclk:';
            return (
              (t += null != e.id ? 'id=%s %s' : '%v%s'),
              (t += null != e.mediaClockValue ? '=%s' : ''),
              (t += null != e.rateNumerator ? ' rate=%s' : '') +
                (null != e.rateDenominator ? '/%s' : '')
            );
          },
        },
        { name: 'keywords', reg: /^keywds:(.+)$/, format: 'keywds:%s' },
        { name: 'content', reg: /^content:(.+)/, format: 'content:%s' },
        {
          name: 'bfcpFloorCtrl',
          reg: /^floorctrl:(c-only|s-only|c-s)/,
          format: 'floorctrl:%s',
        },
        { name: 'bfcpConfId', reg: /^confid:(\d+)/, format: 'confid:%s' },
        { name: 'bfcpUserId', reg: /^userid:(\d+)/, format: 'userid:%s' },
        {
          name: 'bfcpFloorId',
          reg: /^floorid:(.+) (?:m-stream|mstrm):(.+)/,
          names: ['id', 'mStream'],
          format: 'floorid:%s mstrm:%s',
        },
        { push: 'invalid', names: ['value'] },
      ],
    });
    Object.keys(t).forEach(function (e) {
      t[e].forEach(function (e) {
        (e.reg || (e.reg = /(.*)/), e.format || (e.format = '%s'));
      });
    });
  }),
  St = w(function (e, t) {
    var i = function (e) {
        return String(Number(e)) === e ? Number(e) : e;
      },
      r = function (e, t, r) {
        var n = e.name && e.names;
        e.push && !t[e.push]
          ? (t[e.push] = [])
          : n && !t[e.name] && (t[e.name] = {});
        var o = e.push ? {} : n ? t[e.name] : t;
        (!(function (e, t, r, n) {
          if (n && !r) t[n] = i(e[1]);
          else
            for (var o = 0; o < r.length; o += 1)
              null != e[o + 1] && (t[r[o]] = i(e[o + 1]));
        })(r.match(e.reg), o, e.names, e.name),
          e.push && t[e.push].push(o));
      },
      n = RegExp.prototype.test.bind(/^([a-z])=(.*)/);
    t.parse = function (e) {
      var t = {},
        i = [],
        o = t;
      return (
        e
          .split(/(\r\n|\r|\n)/)
          .filter(n)
          .forEach(function (e) {
            var t = e[0],
              n = e.slice(2);
            'm' === t && (i.push({ rtp: [], fmtp: [] }), (o = i[i.length - 1]));
            for (var s = 0; s < (bt[t] || []).length; s += 1) {
              var a = bt[t][s];
              if (a.reg.test(n)) return r(a, o, n);
            }
          }),
        (t.media = i),
        t
      );
    };
    var o = function (e, t) {
      var r = t.split(/=(.+)/, 2);
      return (
        2 === r.length
          ? (e[r[0]] = i(r[1]))
          : 1 === r.length && t.length > 1 && (e[r[0]] = void 0),
        e
      );
    };
    ((t.parseParams = function (e) {
      return e.split(/;\s?/).reduce(o, {});
    }),
      (t.parseFmtpConfig = t.parseParams),
      (t.parsePayloads = function (e) {
        return e.toString().split(' ').map(Number);
      }),
      (t.parseRemoteCandidates = function (e) {
        for (var t = [], r = e.split(' ').map(i), n = 0; n < r.length; n += 3)
          t.push({ component: r[n], ip: r[n + 1], port: r[n + 2] });
        return t;
      }),
      (t.parseImageAttributes = function (e) {
        return e.split(' ').map(function (e) {
          return e
            .substring(1, e.length - 1)
            .split(',')
            .reduce(o, {});
        });
      }),
      (t.parseSimulcastStreamList = function (e) {
        return e.split(';').map(function (e) {
          return e.split(',').map(function (e) {
            var t,
              r = !1;
            return (
              '~' !== e[0]
                ? (t = i(e))
                : ((t = i(e.substring(1, e.length))), (r = !0)),
              { scid: t, paused: r }
            );
          });
        });
      }));
  }),
  yt = /%[sdv%]/g,
  Et = function (e) {
    var t = 1,
      i = arguments,
      r = i.length;
    return e.replace(yt, function (e) {
      if (t >= r) return e;
      var n = i[t];
      switch (((t += 1), e)) {
        case '%%':
          return '%';
        case '%s':
          return String(n);
        case '%d':
          return Number(n);
        case '%v':
          return '';
      }
    });
  },
  Ct = function (e, t, i) {
    var r = [
      e +
        '=' +
        (t.format instanceof Function
          ? t.format(t.push ? i : i[t.name])
          : t.format),
    ];
    if (t.names)
      for (var n = 0; n < t.names.length; n += 1)
        r.push(t.name ? i[t.name][t.names[n]] : i[t.names[n]]);
    else r.push(i[t.name]);
    return Et.apply(null, r);
  },
  It = ['v', 'o', 's', 'i', 'u', 'e', 'p', 'c', 'b', 't', 'r', 'z', 'a'],
  Tt = ['i', 'c', 'b', 'a'],
  Rt = function (e, t) {
    ((t = t || {}),
      null == e.version && (e.version = 0),
      null == e.name && (e.name = ' '),
      e.media.forEach(function (e) {
        null == e.payloads && (e.payloads = '');
      }));
    var i = t.innerOrder || Tt,
      r = [];
    return (
      (t.outerOrder || It).forEach(function (t) {
        bt[t].forEach(function (i) {
          i.name in e && null != e[i.name]
            ? r.push(Ct(t, i, e))
            : i.push in e &&
              null != e[i.push] &&
              e[i.push].forEach(function (e) {
                r.push(Ct(t, i, e));
              });
        });
      }),
      e.media.forEach(function (e) {
        (r.push(Ct('m', bt.m[0], e)),
          i.forEach(function (t) {
            bt[t].forEach(function (i) {
              i.name in e && null != e[i.name]
                ? r.push(Ct(t, i, e))
                : i.push in e &&
                  null != e[i.push] &&
                  e[i.push].forEach(function (e) {
                    r.push(Ct(t, i, e));
                  });
            });
          }));
      }),
      r.join('\r\n') + '\r\n'
    );
  },
  _t = St.parse,
  kt = St.parsePayloads;
function Ot(e, t) {
  var i = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      i.push.apply(i, r));
  }
  return i;
}
function wt(e) {
  for (var t = 1; t < arguments.length; t++) {
    var i = null != arguments[t] ? arguments[t] : {};
    t % 2
      ? Ot(Object(i), !0).forEach(function (t) {
          S(e, t, i[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(i))
        : Ot(Object(i)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(i, t));
          });
  }
  return e;
}
function At(e, t) {
  var i;
  if ('undefined' == typeof Symbol || null == e[Symbol.iterator]) {
    if (
      Array.isArray(e) ||
      (i = (function (e, t) {
        if (e) {
          if ('string' == typeof e) return Pt(e, t);
          var i = Object.prototype.toString.call(e).slice(8, -1);
          return (
            'Object' === i && e.constructor && (i = e.constructor.name),
            'Map' === i || 'Set' === i
              ? Array.from(e)
              : 'Arguments' === i ||
                  /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i)
                ? Pt(e, t)
                : void 0
          );
        }
      })(e)) ||
      (t && e && 'number' == typeof e.length)
    ) {
      i && (e = i);
      var r = 0,
        n = function () {};
      return {
        s: n,
        n: function () {
          return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
        },
        e: function (e) {
          throw e;
        },
        f: n,
      };
    }
    throw new TypeError(
      'Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
    );
  }
  var o,
    s = !0,
    a = !1;
  return {
    s: function () {
      i = e[Symbol.iterator]();
    },
    n: function () {
      var e = i.next();
      return ((s = e.done), e);
    },
    e: function (e) {
      ((a = !0), (o = e));
    },
    f: function () {
      try {
        s || null == i.return || i.return();
      } finally {
        if (a) throw o;
      }
    },
  };
}
function Pt(e, t) {
  (null == t || t > e.length) && (t = e.length);
  for (var i = 0, r = new Array(t); i < t; i++) r[i] = e[i];
  return r;
}
!(function (e) {
  ((e[(e.Create = 0)] = 'Create'),
    (e[(e.Subscribing = 1)] = 'Subscribing'),
    (e[(e.Subscribed = 2)] = 'Subscribed'),
    (e[(e.Unsubscribed = 3)] = 'Unsubscribed'));
})(gt || (gt = {}));
var Lt,
  Dt = (function () {
    function e(t) {
      (_(this, e),
        (this.options = t),
        (this.userId = t.userId),
        (this.logger = t.logger),
        (this.xsigoClient = t.xsigoClient || null),
        (this.roomId = t.roomId),
        (this.peerConnection = new RTCPeerConnection({
          sdpSemantics: 'unified-plan',
        })),
        (this.peerConnection.onnegotiationneeded =
          this.onNegotiationNeeded.bind(this)),
        (this.peerConnection.ontrack = this.onTrack.bind(this)),
        (this.state = gt.Create),
        (this.subscriptionId = null),
        (this._emitter = new P()),
        (this._interval = -1),
        (this.times = 2e3),
        (this.isAlphaChannels = !1));
    }
    var t;
    return (
      O(e, [
        {
          key: 'getState',
          value: function () {
            return this.state;
          },
        },
        {
          key: 'subscribe',
          value: function () {
            var e = this;
            return new Promise(function (t, i) {
              (e.logger.info('start subscribing to the stream'),
                (e.state = gt.Subscribing),
                e.addTransceiver(),
                e.createOffer(),
                (e.peerConnection.onconnectionstatechange =
                  e.onConnectionstatechange.bind(e, 'subscribe')));
              var r = '';
              e.peerConnection.onicecandidate = function (n) {
                var o = n.candidate;
                (e.logger.info(
                  'peercConnection subscribe IceCandidate data:\n '.concat(
                    (null == o ? void 0 : o.candidate) || ''
                  )
                ),
                  null != o &&
                    o.candidate &&
                    (r = r + 'a=' + o.candidate + '\r\n'));
                var s = !1,
                  a = window.setTimeout(function () {
                    s = !0;
                  }, e.times);
                if (!o || s) {
                  window.clearTimeout(a);
                  var c = e.peerConnection.pendingLocalDescription.sdp;
                  if (
                    c.toLocaleLowerCase().includes('video') &&
                    !c.toLowerCase().includes('h264')
                  )
                    (e.logger.warn('=======subscribe offer========\n', c),
                      i('H264 not supported'));
                  else {
                    c.includes('a=candidate') || (c += r);
                    var u = e.buildSubscribeParams();
                    ((u.params.offerSdp = c),
                      e.logger.info('=======subscribe offer========\n', c),
                      (e.subscriptionId = e.xsigoClient.subscribeStream(
                        e.roomId,
                        u
                      )),
                      t(e.subscriptionId));
                  }
                }
              };
            });
          },
        },
        {
          key: 'resubscribe',
          value: function () {
            var e = this;
            return new Promise(function (t, i) {
              (e.logger.info('resubscribe stream', e.subscriptionId),
                e.close(),
                (e.peerConnection = new RTCPeerConnection({
                  sdpSemantics: 'unified-plan',
                })),
                (e.state = gt.Subscribing),
                e.addTransceiver(),
                e.createOffer(),
                (e.peerConnection.onconnectionstatechange =
                  e.onConnectionstatechange.bind(e, 'resubscribe')),
                (e.peerConnection.ontrack = e.onTrack.bind(e)));
              var r = '';
              e.peerConnection.onicecandidate = function (i) {
                var n = i.candidate;
                (e.logger.info(
                  'peercConnection resubscribe IceCandidate data:\n '.concat(
                    (null == n ? void 0 : n.candidate) || ''
                  )
                ),
                  null != n &&
                    n.candidate &&
                    (r = r + 'a=' + n.candidate + '\r\n'));
                var o = !1,
                  s = window.setTimeout(function () {
                    o = !0;
                  }, e.times);
                if (!n || o) {
                  window.clearTimeout(s);
                  var a = e.peerConnection.pendingLocalDescription;
                  (a.sdp.includes('a=candidate') || (a.sdp = a.sdp + r),
                    e.logger.info('=======resubscribe offer========\n', a.sdp),
                    t(a));
                }
              };
            });
          },
        },
        {
          key: 'unsubscribe',
          value: function (e) {
            var t = this;
            (this.logger.info(
              'unsubscribe subscriptionId',
              this.subscriptionId
            ),
              this.xsigoClient.unsubscribeStream(
                this.roomId,
                this.subscriptionId,
                function (i, r, n) {
                  (1 === i && ((t.state = gt.Unsubscribed), t.close()),
                    e(i, r, n));
                }
              ));
          },
        },
        {
          key: 'switchSimulcast',
          value: function (e, t) {
            this.xsigoClient.switchSimulcast(
              this.roomId,
              this.subscriptionId,
              { type: e },
              t
            );
          },
        },
        {
          key: 'setRemoteDescription',
          value: function (e) {
            var t = this;
            return new Promise(function (i, r) {
              (t.logger.info('=======subscribe answer========\n' + e),
                (t.isAlphaChannels = e.includes('a=xrtc-alpha')),
                t.peerConnection
                  .setRemoteDescription({ sdp: e, type: 'answer' })
                  .then(function () {
                    ((t.state = gt.Subscribed), i(!0));
                  })
                  .catch(function (e) {
                    (t.logger.error('subscribe setRemoteDescription error', e),
                      r(e));
                  }));
            });
          },
        },
        {
          key: 'onConnectionstatechange',
          value: function (e) {
            var t = this;
            (['failed', 'connected'].includes(
              this.peerConnection.connectionState
            ) &&
              this._emitter.emit('subscribe-ice-state', {
                state: this.peerConnection.connectionState,
                subscriptionId: this.subscriptionId,
              }),
              this.logger.info(
                'peerConnection '
                  .concat(e, ' ICE State: ')
                  .concat(this.peerConnection.connectionState)
              ),
              'connecting' === this.peerConnection.connectionState
                ? -1 === this._interval &&
                  (this._interval = window.setInterval(function () {
                    t.getRTCIceCandidatePairStats();
                  }, this.times))
                : clearInterval(this._interval));
          },
        },
        {
          key: 'addTransceiver',
          value: function () {
            (this.options.hasAudio &&
              this.peerConnection.addTransceiver('audio', {
                direction: 'recvonly',
              }),
              this.options.hasVideo &&
                this.peerConnection.addTransceiver('video', {
                  direction: 'recvonly',
                }));
          },
        },
        {
          key: 'createOffer',
          value: function () {
            var e = this;
            this.peerConnection
              .createOffer()
              .then(this.onGotOffer.bind(this))
              .catch(function (t) {
                (e.logger.error('create offer error', t),
                  (e.state = gt.Create));
              });
          },
        },
        {
          key: 'onGotOffer',
          value: function (e) {
            var t,
              i = this,
              r = _t(e.sdp),
              n = At(r.media);
            try {
              for (n.s(); !(t = n.n()).done; ) {
                var o,
                  s = t.value,
                  a = At(kt(s.payloads));
                try {
                  for (a.s(); !(o = a.n()).done; ) {
                    var c = o.value;
                    s.rtcpFb = s.rtcpFb
                      ? [].concat(R(s.rtcpFb), [{ payload: c, type: 'rrtr' }])
                      : [{ payload: c, type: 'rrtr' }];
                  }
                } catch (e) {
                  a.e(e);
                } finally {
                  a.f();
                }
              }
            } catch (e) {
              n.e(e);
            } finally {
              n.f();
            }
            var u = { sdp: Rt(r), type: 'offer' };
            this.peerConnection
              .setLocalDescription(u)
              .then(function () {
                i.logger.info(
                  'Set local description success',
                  i.subscriptionId
                );
              })
              .catch(function (e) {
                i.logger.error('Set local description failure', e);
              });
          },
        },
        {
          key: 'onNegotiationNeeded',
          value: function () {
            this.logger.info('onNegotiationneeded--');
          },
        },
        {
          key: 'onTrack',
          value: function (e) {
            this.logger.debug('on track return');
            var t = this.options || {},
              i = t.hasAudio,
              r =
                i && t.hasVideo
                  ? pe.AudioVideo
                  : i
                    ? pe.AudioOnly
                    : pe.VideoOnly,
              n = e.streams[0],
              o = e.track;
            t.audioStreamId || t.videoStreamId
              ? this.options.onRemoteStream(n, o, r, this.isAlphaChannels)
              : this.logger.info('not audio or video');
          },
        },
        {
          key: 'getPeerConnection',
          value: function () {
            return this.peerConnection;
          },
        },
        {
          key: 'close',
          value: function () {
            (this.peerConnection &&
              ((this.peerConnection.onicecandidate = null),
              (this.peerConnection.onnegotiationneeded = null),
              (this.peerConnection.onconnectionstatechange = null),
              (this.peerConnection.ontrack = null),
              this.peerConnection.close()),
              (this.peerConnection = null),
              this._interval && clearInterval(this._interval),
              this.logger.info(
                'close subscribe stream peerConnection subscriptionId',
                this.subscriptionId
              ));
          },
        },
        {
          key: 'buildSubscribeParams',
          value: function () {
            var e = this,
              t = this.options || {},
              i = t.hasAudio,
              r = t.hasVideo,
              n = t.simulcast,
              o = {
                publisherUserId: t.publisherUserId,
                streamId: i ? t.audioStreamId : t.videoStreamId,
                streamKind:
                  i && r ? pe.AudioVideo : i ? pe.AudioOnly : pe.VideoOnly,
                params: {
                  offerSdp: '',
                  hasAudio: i,
                  hasVideo: r,
                  type: (null == n ? void 0 : n.length) > 0 && n[0].type,
                },
                cb: function (t, i, r) {
                  1 === t
                    ? e
                        .setRemoteDescription(r.answer_sdp)
                        .then(function () {
                          e.options.onSubscribe &&
                            e.options.onSubscribe(t, i, r);
                        })
                        .catch(function (t) {
                          (e.logger.error('setRemoteDescription is failed', t),
                            e.options.onSubscribe &&
                              e.options.onSubscribe(0, t, r));
                        })
                    : e.options.onSubscribe && e.options.onSubscribe(t, i, r);
                },
                updateCb: function () {},
              };
            return (
              t.small &&
                r &&
                ((n || []).find(function (e) {
                  return e.type === ve.SmallStream;
                })
                  ? (o.params.type = ve.SmallStream)
                  : this.logger.warn('does not publish small stream')),
              o
            );
          },
        },
        {
          key: 'getTransportStats',
          value:
            ((t = T(
              A.mark(function e() {
                var t = this;
                return A.wrap(function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        return e.abrupt(
                          'return',
                          new Promise(function (e, i) {
                            if (t.peerConnection) {
                              var r = (t.peerConnection.getReceivers() ||
                                [])[0];
                              r &&
                                r
                                  .getStats()
                                  .then(function (i) {
                                    var n = t.getReceiverStats({
                                      send: i,
                                      mediaType: r.track.kind,
                                    });
                                    e(n.rtt);
                                  })
                                  .catch(function (e) {
                                    i(e);
                                  });
                            }
                          })
                        );
                      case 1:
                      case 'end':
                        return e.stop();
                    }
                }, e);
              })
            )),
            function () {
              return t.apply(this, arguments);
            }),
        },
        {
          key: 'getRemoteAudioOrVideoStats',
          value: function (e) {
            var t = this;
            return new Promise(function (i, r) {
              if (t.peerConnection) {
                var n = t.peerConnection.getReceivers().find(function (t) {
                  return t.track.kind === e;
                });
                n &&
                  n
                    .getStats()
                    .then(function (r) {
                      var n = t.getReceiverStats({ send: r, mediaType: e });
                      i(n);
                    })
                    .catch(function (e) {
                      r(e);
                    });
              }
            });
          },
        },
        {
          key: 'getReceiverStats',
          value: function (e) {
            var t = {
              audio: {
                bytesReceived: 0,
                packetsReceived: 0,
                packetsLost: 0,
                nackCount: 0,
                audioLevel: 0,
              },
              video: {
                bytesReceived: 0,
                packetsReceived: 0,
                packetsLost: 0,
                framesDecoded: 0,
                frameWidth: 0,
                frameHeight: 0,
                framesPerSecond: 0,
                nackCount: 0,
              },
              rtt: 0,
              timestamp: 0,
            };
            return (
              e.send.forEach(function (i) {
                if ('inbound-rtp' === i.type)
                  if (((t.timestamp = i.timestamp), 'audio' === e.mediaType))
                    ((t.audio = wt(
                      wt({}, t.audio),
                      {},
                      {
                        bytesReceived: i.bytesReceived,
                        packetsReceived: i.packetsReceived,
                        packetsLost: i.packetsLost,
                      }
                    )),
                      void 0 !== i.nackCount &&
                        (t.audio.nackCount = i.nackCount),
                      void 0 !== i.audioLevel &&
                        (t.audio.audioLevel = i.audioLevel));
                  else {
                    if (0 === i.bytesReceived) return;
                    ((t.video = wt(
                      wt({}, t.video),
                      {},
                      {
                        bytesReceived: i.bytesReceived,
                        packetsReceived: i.packetsReceived,
                        packetsLost: i.packetsLost,
                        framesDecoded: i.framesDecoded,
                        framesPerSecond: i.framesPerSecond || 0,
                        nackCount: i.nackCount,
                      }
                    )),
                      void 0 !== i.frameWidth &&
                        (t.video.frameWidth = i.frameWidth),
                      void 0 !== i.frameHeight &&
                        (t.video.frameHeight = i.frameHeight));
                  }
                else
                  'track' === i.type
                    ? void 0 !== i.frameWidth
                      ? (t.video = wt(
                          wt({}, t.video),
                          {},
                          {
                            frameWidth: i.frameWidth,
                            frameHeight: i.frameHeight,
                          }
                        ))
                      : void 0 !== i.audioLevel &&
                        (t.audio.audioLevel = i.audioLevel || 0)
                    : 'candidate-pair' === i.type &&
                      'number' == typeof i.currentRoundTripTime &&
                      (t.rtt = 1e3 * i.currentRoundTripTime);
              }),
              t
            );
          },
        },
        {
          key: 'onSubscribePeerConnectionFailed',
          value: function (e) {
            this._emitter.on('subscribe-ice-state', e);
          },
        },
        {
          key: 'getRTCIceCandidatePairStats',
          value: function () {
            var e = this;
            this.peerConnection &&
              this.peerConnection.getStats().then(function (t) {
                t.forEach(function (t) {
                  'candidate-pair' === t.type &&
                    e.logger.warn(
                      'subscribe RTCIceCandidatePairStats',
                      JSON.stringify(t, null, 4)
                    );
                });
              });
          },
        },
      ]),
      e
    );
  })();
function xt(e, t) {
  (null == t || t > e.length) && (t = e.length);
  for (var i = 0, r = new Array(t); i < t; i++) r[i] = e[i];
  return r;
}
function Mt(e) {
  var t,
    i = new Array(),
    r = (function (e, t) {
      var i;
      if ('undefined' == typeof Symbol || null == e[Symbol.iterator]) {
        if (
          Array.isArray(e) ||
          (i = (function (e, t) {
            if (e) {
              if ('string' == typeof e) return xt(e, t);
              var i = Object.prototype.toString.call(e).slice(8, -1);
              return (
                'Object' === i && e.constructor && (i = e.constructor.name),
                'Map' === i || 'Set' === i
                  ? Array.from(e)
                  : 'Arguments' === i ||
                      /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i)
                    ? xt(e, t)
                    : void 0
              );
            }
          })(e)) ||
          (t && e && 'number' == typeof e.length)
        ) {
          i && (e = i);
          var r = 0,
            n = function () {};
          return {
            s: n,
            n: function () {
              return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
            },
            e: function (e) {
              throw e;
            },
            f: n,
          };
        }
        throw new TypeError(
          'Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
        );
      }
      var o,
        s = !0,
        a = !1;
      return {
        s: function () {
          i = e[Symbol.iterator]();
        },
        n: function () {
          var e = i.next();
          return ((s = e.done), e);
        },
        e: function (e) {
          ((a = !0), (o = e));
        },
        f: function () {
          try {
            s || null == i.return || i.return();
          } finally {
            if (a) throw o;
          }
        },
      };
    })(e);
  try {
    for (r.s(); !(t = r.n()).done; ) {
      var n = t.value,
        o = { type: Pe(n.rid), maxWidth: n.maxWidth, maxHeight: n.maxHeight };
      i.push(o);
    }
  } catch (e) {
    r.e(e);
  } finally {
    r.f();
  }
  return i;
}
function Ut(e) {
  var t = { userId: e.userId, streamId: e.streamId, type: Re(e.type) };
  return (
    e.info &&
      ((t.info = {}),
      e.info.audio &&
        (t.info.audio = {
          source: ke(e.info.audio.source),
          muted: e.info.audio.muted,
          floor: e.info.audio.floor,
        }),
      e.info.video &&
        ((t.info.video = {
          source: we(e.info.video.source),
          muted: e.info.video.muted,
          floor: e.info.video.floor,
        }),
        e.info.video.simulcast &&
          (t.info.video.simulcast = Mt(e.info.video.simulcast)))),
    t
  );
}
function Nt(e) {
  var t = { userId: e.userId, streamId: e.streamId, type: Re(e.data.type) };
  return (
    e.data.media.info &&
      ((t.info = {}),
      e.data.media.info.audio &&
        (t.info.audio = {
          source: ke(e.data.media.info.audio.source),
          muted: e.data.media.info.audio.muted,
          floor: e.data.media.info.audio.floor,
        }),
      e.data.media.info.video &&
        ((t.info.video = {
          source: we(e.data.media.info.video.source),
          muted: e.data.media.info.video.muted,
          floor: e.data.media.info.video.floor,
        }),
        e.data.media.info.video.simulcast &&
          (t.info.video.simulcast = Mt(e.data.media.info.video.simulcast)))),
    t
  );
}
!(function (e) {
  ((e[(e.Created = 0)] = 'Created'),
    (e[(e.Entering = 1)] = 'Entering'),
    (e[(e.EnterFailed = 2)] = 'EnterFailed'),
    (e[(e.EnterTimeout = 3)] = 'EnterTimeout'),
    (e[(e.Entered = 4)] = 'Entered'),
    (e[(e.Exiting = 5)] = 'Exiting'),
    (e[(e.ExitFailed = 6)] = 'ExitFailed'),
    (e[(e.ExitTimeout = 7)] = 'ExitTimeout'),
    (e[(e.Exited = 8)] = 'Exited'),
    (e[(e.Destroyed = 9)] = 'Destroyed'),
    (e[(e.StateMax = 10)] = 'StateMax'));
})(Lt || (Lt = {}));
var Vt,
  Ft = [
    'Created',
    'Entering',
    'EnterFailed',
    'EnterTimeout',
    'Entered',
    'Exiting',
    'ExitFailed',
    'ExitTimeout',
    'Exited',
    'Destroyed',
  ],
  jt = (function () {
    function e(t) {
      (_(this, e),
        (this.currentState = Lt.Created),
        (this.stateTransformTable = new Array()),
        (this.logger = t),
        this.initStateTransformTable());
    }
    return (
      O(e, [
        {
          key: 'setState',
          value: function (e) {
            return this.checkStateChange(this.currentState, e)
              ? (this.logger.info(
                  'RoomState : state change from ' +
                    Ft[this.currentState] +
                    ' to ' +
                    Ft[e]
                ),
                (this.currentState = e),
                !0)
              : (this.logger.error(
                  'RoomState : INVALID state change from ' +
                    Ft[this.currentState] +
                    ' to ' +
                    Ft[e]
                ),
                !1);
          },
        },
        {
          key: 'state',
          value: function () {
            return this.currentState;
          },
        },
        {
          key: 'checkStateChange',
          value: function (e, t) {
            return this.stateTransformTable[e][t];
          },
        },
        {
          key: 'initStateTransformTable',
          value: function () {
            for (var e = Lt.Created; e < Lt.StateMax; e++) {
              this.stateTransformTable[e] = new Array();
              for (var t = Lt.Created; t < Lt.StateMax; t++)
                this.stateTransformTable[e][t] = !1;
            }
            ((this.stateTransformTable[Lt.Created][Lt.Entering] = !0),
              (this.stateTransformTable[Lt.Created][Lt.Destroyed] = !0),
              (this.stateTransformTable[Lt.Entering][Lt.Entered] = !0),
              (this.stateTransformTable[Lt.Entering][Lt.EnterFailed] = !0),
              (this.stateTransformTable[Lt.Entering][Lt.EnterTimeout] = !0),
              (this.stateTransformTable[Lt.Entering][Lt.Destroyed] = !0),
              (this.stateTransformTable[Lt.EnterFailed][Lt.Destroyed] = !0),
              (this.stateTransformTable[Lt.EnterTimeout][Lt.Destroyed] = !0),
              (this.stateTransformTable[Lt.Entered][Lt.Exiting] = !0),
              (this.stateTransformTable[Lt.Entered][Lt.Destroyed] = !0),
              (this.stateTransformTable[Lt.Exiting][Lt.Exited] = !0),
              (this.stateTransformTable[Lt.Exiting][Lt.ExitTimeout] = !0),
              (this.stateTransformTable[Lt.Exiting][Lt.Destroyed] = !0),
              (this.stateTransformTable[Lt.Exited][Lt.Destroyed] = !0));
          },
        },
      ]),
      e
    );
  })();
!(function (e) {
  ((e[(e.New = 0)] = 'New'),
    (e[(e.Logining = 1)] = 'Logining'),
    (e[(e.LoginFailed = 2)] = 'LoginFailed'),
    (e[(e.LoginTimeout = 3)] = 'LoginTimeout'),
    (e[(e.Logined = 4)] = 'Logined'),
    (e[(e.Relogining = 5)] = 'Relogining'),
    (e[(e.Relogined = 6)] = 'Relogined'),
    (e[(e.Logouting = 7)] = 'Logouting'),
    (e[(e.LogoutTimeout = 8)] = 'LogoutTimeout'),
    (e[(e.Logouted = 9)] = 'Logouted'),
    (e[(e.Destroyed = 10)] = 'Destroyed'),
    (e[(e.StateMax = 11)] = 'StateMax'));
})(Vt || (Vt = {}));
var Bt,
  Wt,
  Ht = [
    'New',
    'Logining',
    'LoginFailed',
    'LoginTimeout',
    'Logined',
    'Relogining',
    'Relogined',
    'Logouting',
    'LogoutTimeout',
    'Logouted',
    'Destroy',
  ],
  Gt = (function () {
    function e(t) {
      (_(this, e),
        (this.currentState = Vt.New),
        (this.stateTransformTable = new Array()),
        (this.logger = t),
        this.initStateTransformTable());
    }
    return (
      O(e, [
        {
          key: 'setState',
          value: function (e) {
            return this.checkStateChange(this.currentState, e)
              ? (this.logger.info(
                  'Login : state change from ' +
                    Ht[this.currentState] +
                    ' to ' +
                    Ht[e]
                ),
                (this.currentState = e),
                !0)
              : (this.logger.error(
                  'Login : INVALID state change from ' +
                    Ht[this.currentState] +
                    ' to ' +
                    Ht[e]
                ),
                !1);
          },
        },
        {
          key: 'state',
          value: function () {
            return this.currentState;
          },
        },
        {
          key: 'checkStateChange',
          value: function (e, t) {
            return this.stateTransformTable[e][t];
          },
        },
        {
          key: 'initStateTransformTable',
          value: function () {
            for (var e = Vt.New; e < Vt.StateMax; e++) {
              this.stateTransformTable[e] = new Array();
              for (var t = Vt.New; t < Vt.StateMax; t++)
                this.stateTransformTable[e][t] = !1;
            }
            ((this.stateTransformTable[Vt.New][Vt.Logining] = !0),
              (this.stateTransformTable[Vt.New][Vt.Destroyed] = !0),
              (this.stateTransformTable[Vt.Logining][Vt.Logined] = !0),
              (this.stateTransformTable[Vt.Logining][Vt.LoginFailed] = !0),
              (this.stateTransformTable[Vt.Logining][Vt.LoginTimeout] = !0),
              (this.stateTransformTable[Vt.Logining][Vt.Destroyed] = !0),
              (this.stateTransformTable[Vt.LoginFailed][Vt.Destroyed] = !0),
              (this.stateTransformTable[Vt.LoginTimeout][Vt.Destroyed] = !0),
              (this.stateTransformTable[Vt.Logined][Vt.Logouting] = !0),
              (this.stateTransformTable[Vt.Logined][Vt.Relogining] = !0),
              (this.stateTransformTable[Vt.Logined][Vt.Destroyed] = !0),
              (this.stateTransformTable[Vt.Relogining][Vt.Relogining] = !0),
              (this.stateTransformTable[Vt.Relogining][Vt.Relogined] = !0),
              (this.stateTransformTable[Vt.Relogining][Vt.Logined] = !0),
              (this.stateTransformTable[Vt.Relogining][Vt.Destroyed] = !0),
              (this.stateTransformTable[Vt.Relogined][Vt.Relogining] = !0),
              (this.stateTransformTable[Vt.Relogined][Vt.Logouting] = !0),
              (this.stateTransformTable[Vt.Relogined][Vt.Destroyed] = !0),
              (this.stateTransformTable[Vt.Logouting][Vt.Logouted] = !0),
              (this.stateTransformTable[Vt.Logouting][Vt.LogoutTimeout] = !0),
              (this.stateTransformTable[Vt.Logouting][Vt.Destroyed] = !0),
              (this.stateTransformTable[Vt.Logouted][Vt.Destroyed] = !0));
          },
        },
      ]),
      e
    );
  })();
function Jt(e, t) {
  var i = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      i.push.apply(i, r));
  }
  return i;
}
function Kt(e) {
  for (var t = 1; t < arguments.length; t++) {
    var i = null != arguments[t] ? arguments[t] : {};
    t % 2
      ? Jt(Object(i), !0).forEach(function (t) {
          S(e, t, i[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(i))
        : Jt(Object(i)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(i, t));
          });
  }
  return e;
}
(!(function (e) {
  ((e[(e.LoginSuccess = 0)] = 'LoginSuccess'),
    (e[(e.LoginTimeout = 1)] = 'LoginTimeout'),
    (e[(e.LoginFailed = 2)] = 'LoginFailed'));
})(Bt || (Bt = {})),
  (function (e) {
    ((e[(e.LogoutSuccess = 0)] = 'LogoutSuccess'),
      (e[(e.LogoutTimeout = 1)] = 'LogoutTimeout'),
      (e[(e.LogoutFailed = 2)] = 'LogoutFailed'));
  })(Wt || (Wt = {})));
var Yt,
  zt = (function () {
    function e(t) {
      (_(this, e),
        (this.options = t),
        (this.state = new Gt(t.logger)),
        (this.connectionStatus = ue.New),
        (this.timeout = 1e4));
    }
    return (
      O(e, [
        {
          key: 'login',
          value: function () {
            var e = this;
            if (this.state.setState(Vt.Logining)) {
              this.options.logger.info(
                'Login room: '.concat(this.options.roomId)
              );
              var t = null;
              this.buildLoginReuqest();
              var i = { method: 'login', params: this.loginRequestParams };
              (t ||
                (t = setTimeout(function () {
                  (e.options.logger.info(
                    'login timeout: '.concat(e.options.roomId)
                  ),
                    e.state.setState(Vt.LoginTimeout) &&
                      (t && clearTimeout(t),
                      (t = null),
                      e.options.loginCb &&
                        e.options.loginCb(
                          Bt.LoginTimeout,
                          null,
                          'login timeout'
                        )));
                }, this.timeout)),
                this.options.rpcClient.sendRequest(
                  i,
                  function (i) {
                    if (
                      e.state.setState(Vt.Logined) &&
                      (t && clearTimeout(t), (t = null), e.options.loginCb)
                    ) {
                      var r = i.result.room,
                        n = {
                          room: Kt(
                            Kt({}, r),
                            {},
                            {
                              roomUniqueId: r.roomUniqueId || r.roomId,
                              participants: r.participants || [],
                              streams: r.streams || [],
                            }
                          ),
                        };
                      e.options.loginCb(Bt.LoginSuccess, n);
                    }
                  },
                  function (i) {
                    e.state.setState(Vt.LoginFailed) &&
                      (t && clearTimeout(t),
                      (t = null),
                      e.options.loginCb &&
                        e.options.loginCb(
                          Bt.LoginFailed,
                          null,
                          i.error.message
                        ));
                  }
                ) ||
                  this.options.logger.error(
                    'Json Rpc Client send login request error'
                  ));
            }
          },
        },
        {
          key: 'logout',
          value: function () {
            var e = this;
            if (this.state.setState(Vt.Logouting)) {
              this.options.logger.info(
                'Logout room: '.concat(this.options.roomId)
              );
              var t = null;
              (this.options.rpcClient.sendRequest(
                { method: 'logout' },
                function (i) {
                  e.state.setState(Vt.Logouted) &&
                    (t && clearTimeout(t),
                    (t = null),
                    e.options.logoutCb && e.options.logoutCb(Wt.LogoutSuccess));
                },
                function (i) {
                  e.state.setState(Vt.LoginFailed) &&
                    (t && clearTimeout(t),
                    (t = null),
                    e.options.logoutCb &&
                      e.options.logoutCb(Wt.LogoutFailed, i.error.message));
                }
              ) ||
                this.options.logger.error(
                  'Json Rpc Client send loginout request error'
                ),
                t ||
                  (t = setTimeout(function () {
                    (e.options.logger.info(
                      'logout timeout: '.concat(e.options.roomId)
                    ),
                      e.state.setState(Vt.LogoutTimeout) &&
                        (t && clearTimeout(t),
                        (t = null),
                        e.options.logoutCb &&
                          e.options.logoutCb(
                            Wt.LogoutTimeout,
                            'logout timeout'
                          )));
                  }, this.timeout)));
            }
          },
        },
        {
          key: 'relogin',
          value: function () {
            var e = this;
            this.state.setState(Vt.Relogining) &&
              (this.buildLoginReuqest(),
              this.options.logger.info(
                'Relogin room: '.concat(this.options.roomId)
              ),
              this.options.rpcClient.sendRequest(
                { method: 'login', params: this.loginRequestParams },
                function (t) {
                  if (e.state.setState(Vt.Relogined) && e.options.reloginCb) {
                    var i = t.result.room,
                      r = {
                        room: Kt(
                          Kt({}, i),
                          {},
                          {
                            roomUniqueId: i.roomUniqueId || i.roomId,
                            participants: i.participants || [],
                            streams: i.streams || [],
                          }
                        ),
                      };
                    e.options.reloginCb(!0, i.sessionTimeout, r);
                  }
                },
                function (t) {
                  e.options.logger.info('relogining failed');
                }
              ) ||
                this.options.logger.error(
                  'Json Rpc Client send relogin request error'
                ));
          },
        },
        {
          key: 'updatePermission',
          value: function (e) {
            this.options.permission = e;
          },
        },
        {
          key: 'onConnectionLost',
          value: function () {
            this.connectionStatus = ue.ConnectionLost;
          },
        },
        {
          key: 'onConnectionRecovery',
          value: function () {
            ((this.connectionStatus = ue.ConnectionRecovery), this.relogin());
          },
        },
        {
          key: 'buildLoginReuqest',
          value: function () {
            this.loginRequestParams = {
              appId: this.options.appId,
              userId: this.options.userId,
              type: this.options.userType,
              roomId: this.options.roomId,
              previousRoomId: this.options.previousRoomId,
              permission: this.options.permission,
              userAgent: this.options.userAgent,
              userData: this.options.userData,
              protocol: '1.0',
            };
          },
        },
      ]),
      e
    );
  })();
!(function (e) {
  ((e[(e.Create = 0)] = 'Create'),
    (e[(e.Publishing = 1)] = 'Publishing'),
    (e[(e.Published = 2)] = 'Published'),
    (e[(e.Republishing = 3)] = 'Republishing'),
    (e[(e.Republished = 4)] = 'Republished'),
    (e[(e.Unpublishing = 5)] = 'Unpublishing'),
    (e[(e.Unpublished = 6)] = 'Unpublished'),
    (e[(e.Destroyed = 7)] = 'Destroyed'),
    (e[(e.StateMax = 8)] = 'StateMax'));
})(Yt || (Yt = {}));
var qt = [
    'Create',
    'Publishing',
    'Published',
    'Republishing',
    'Republished',
    'Unpublishing',
    'Unpublished',
    'Destroy',
  ],
  Xt = (function () {
    function e(t) {
      (_(this, e),
        (this.currentState = Yt.Create),
        (this.stateTransformTable = new Array()),
        (this.logger = t),
        this.initStateTransformTable());
    }
    return (
      O(e, [
        {
          key: 'setState',
          value: function (e) {
            return this.checkStateChange(this.currentState, e)
              ? (this.logger.info(
                  'PublicationState : state change from ' +
                    qt[this.currentState] +
                    ' to ' +
                    qt[e]
                ),
                (this.currentState = e),
                !0)
              : (this.logger.error(
                  'PublicationState : INVALID state change from' +
                    qt[this.currentState] +
                    ' to ' +
                    qt[e]
                ),
                !1);
          },
        },
        {
          key: 'state',
          value: function () {
            return this.currentState;
          },
        },
        {
          key: 'checkStateChange',
          value: function (e, t) {
            return this.stateTransformTable[e][t];
          },
        },
        {
          key: 'initStateTransformTable',
          value: function () {
            for (var e = Yt.Create; e < Yt.StateMax; e++) {
              this.stateTransformTable[e] = new Array();
              for (var t = Yt.Create; t < Yt.StateMax; t++)
                this.stateTransformTable[e][t] = !1;
            }
            ((this.stateTransformTable[Yt.Create][Yt.Publishing] = !0),
              (this.stateTransformTable[Yt.Create][Yt.Destroyed] = !0),
              (this.stateTransformTable[Yt.Publishing][Yt.Published] = !0),
              (this.stateTransformTable[Yt.Publishing][Yt.Unpublishing] = !0),
              (this.stateTransformTable[Yt.Publishing][Yt.Destroyed] = !0),
              (this.stateTransformTable[Yt.Publishing][Yt.Republishing] = !0),
              (this.stateTransformTable[Yt.Published][Yt.Unpublishing] = !0),
              (this.stateTransformTable[Yt.Published][Yt.Republishing] = !0),
              (this.stateTransformTable[Yt.Published][Yt.Destroyed] = !0),
              (this.stateTransformTable[Yt.Republishing][Yt.Republishing] = !0),
              (this.stateTransformTable[Yt.Republishing][Yt.Republished] = !0),
              (this.stateTransformTable[Yt.Republishing][Yt.Unpublishing] = !0),
              (this.stateTransformTable[Yt.Republishing][Yt.Published] = !0),
              (this.stateTransformTable[Yt.Republishing][Yt.Destroyed] = !0),
              (this.stateTransformTable[Yt.Republished][Yt.Republishing] = !0),
              (this.stateTransformTable[Yt.Republished][Yt.Unpublishing] = !0),
              (this.stateTransformTable[Yt.Republished][Yt.Destroyed] = !0),
              (this.stateTransformTable[Yt.Unpublishing][Yt.Unpublished] = !0),
              (this.stateTransformTable[Yt.Unpublishing][Yt.Destroyed] = !0),
              (this.stateTransformTable[Yt.Unpublished][Yt.Destroyed] = !0));
          },
        },
      ]),
      e
    );
  })();
function Qt(e, t) {
  var i = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      i.push.apply(i, r));
  }
  return i;
}
function $t(e) {
  for (var t = 1; t < arguments.length; t++) {
    var i = null != arguments[t] ? arguments[t] : {};
    t % 2
      ? Qt(Object(i), !0).forEach(function (t) {
          S(e, t, i[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(i))
        : Qt(Object(i)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(i, t));
          });
  }
  return e;
}
var Zt = (function () {
    function e(t) {
      (_(this, e),
        (this.options = t),
        (this.state = new Xt(t.logger)),
        (this.connectionStatus = ue.ConnectionConnected),
        t.stream.info &&
          (t.stream.info.audio && t.stream.info.video
            ? ((this.streamKind = pe.AudioVideo),
              (this.audioMuteWanted = this.options.stream.info.audio.muted),
              (this.simulcastWanted = this.options.stream.info.video.simulcast),
              (this.videoMuteWanted = this.options.stream.info.video.muted))
            : t.stream.info.audio
              ? ((this.streamKind = pe.AudioOnly),
                (this.audioMuteWanted = this.options.stream.info.audio.muted))
              : t.stream.info.video
                ? ((this.streamKind = pe.VideoOnly),
                  (this.simulcastWanted =
                    this.options.stream.info.video.simulcast),
                  (this.videoMuteWanted = this.options.stream.info.video.muted))
                : this.options.logger.warn('now not support mix')));
    }
    return (
      O(e, [
        {
          key: 'publish',
          value: function () {
            if (
              (this.options.logger.info(
                'Publish stream: '.concat(this.options.stream.streamId)
              ),
              this.state.setState(Yt.Publishing))
            ) {
              var e = this.options.rpcClient.getWsState().state;
              ['CONNECTED', 'RECOVERY'].includes(e) && this.doPublish();
            }
          },
        },
        {
          key: 'unpublish',
          value: function (e) {
            if (
              (this.options.logger.info(
                'Unpublish stream: ' + this.options.stream.streamId
              ),
              this.state.setState(Yt.Unpublishing))
            ) {
              this.unpublishCb = e;
              var t = this.options.rpcClient.getWsState().state;
              ['CONNECTED', 'RECOVERY'].includes(t)
                ? this.doUnpublish(e)
                : this.options.logger.info(
                    'websocketState: '.concat(t, ', unpublish has been cached')
                  );
            }
          },
        },
        {
          key: 'updateSimulcast',
          value: function (e, t) {
            ((this.simulcastWanted = e), (this.updateSimulcastCb = t));
            var i = this.options.rpcClient.getWsState().state,
              r = this.state.state();
            ['CONNECTED', 'RECOVERY'].includes(i)
              ? r === Yt.Republished || r === Yt.Published
                ? this.doUpdateSimulcast(t)
                : this.options.logger.info(
                    'publicationState: '.concat(
                      i,
                      ',updateSimulcast has been cached'
                    )
                  )
              : this.options.logger.info(
                  'websocketState: '.concat(
                    i,
                    ',updateSimulcast has been cached'
                  )
                );
          },
        },
        {
          key: 'muteAudio',
          value: function (e, t, i, r) {
            ((this.audioMuteWanted = !0),
              (this.muteAudioOption = { userId: e, cb: t, userData: r }));
            var n = this.options.rpcClient.getWsState().state,
              o = this.state.state();
            ['CONNECTED', 'RECOVERY'].includes(n)
              ? o === Yt.Republished || o === Yt.Published
                ? this.control(e, 'mute', t, i, r)
                : this.options.logger.info(
                    'publicationState: '.concat(n, ',muteAudio has been cached')
                  )
              : this.options.logger.info(
                  'websocketState: '.concat(n, ',muteAudio has been cached')
                );
          },
        },
        {
          key: 'muteVideo',
          value: function (e, t, i, r) {
            ((this.videoMuteWanted = !0),
              (this.muteVideoOption = { userId: e, cb: t, userData: r }));
            var n = this.options.rpcClient.getWsState().state,
              o = this.state.state();
            ['CONNECTED', 'RECOVERY'].includes(n)
              ? o === Yt.Republished || o === Yt.Published
                ? this.control(e, 'vmute', t, i, r)
                : this.options.logger.info(
                    'publicationState: '.concat(n, ',muteVideo has been cached')
                  )
              : this.options.logger.info(
                  'websocketState: '.concat(n, ',muteVideo has been cached')
                );
          },
        },
        {
          key: 'unmuteAudio',
          value: function (e, t, i, r) {
            ((this.audioMuteWanted = !1),
              (this.unmuteAudioOption = { userId: e, cb: t, userData: r }));
            var n = this.options.rpcClient.getWsState().state,
              o = this.state.state();
            ['CONNECTED', 'RECOVERY'].includes(n)
              ? o === Yt.Republished || o === Yt.Published
                ? this.control(e, 'unmute', t, i, r)
                : this.options.logger.info(
                    'publicationState: '.concat(
                      n,
                      ',unmuteAudio has been cached'
                    )
                  )
              : this.options.logger.info(
                  'websocketState: '.concat(n, ',unmuteAudio has been cached')
                );
          },
        },
        {
          key: 'unmuteVideo',
          value: function (e, t, i, r) {
            ((this.videoMuteWanted = !1),
              (this.unmuteVideoOPtion = { userId: e, cb: t, userData: r }));
            var n = this.options.rpcClient.getWsState().state,
              o = this.state.state();
            ['CONNECTED', 'RECOVERY'].includes(n)
              ? o === Yt.Republished || o === Yt.Published
                ? this.control(e, 'unvmute', t, i, r)
                : this.options.logger.info(
                    'publicationState: '.concat(
                      n,
                      ',unmuteVideo has been cached'
                    )
                  )
              : this.options.logger.info(
                  'websocketState: '.concat(n, ',unmuteVideo has been cached')
                );
          },
        },
        { key: 'onConnectionLost', value: function () {} },
        {
          key: 'onConnectionRecovery',
          value: function (e, t) {
            if (
              (this.options.logger.info(
                'onConnectionRecovery streamId',
                this.options.stream.streamId,
                'sessionTimeout',
                e,
                'sdp',
                t
              ),
              this.state.state() === Yt.Unpublishing)
            )
              return this.doUnpublish(this.unpublishCb);
            e
              ? t &&
                ((this.options.offerSdp = t.sdp),
                (this.options.stream.streamId = t.pubId),
                this.republish())
              : this.recoveryOperations();
          },
        },
        {
          key: 'republish',
          value: function () {
            (this.options.logger.info(
              'start republish: ' + this.options.stream.streamId
            ),
              this.state.setState(Yt.Republishing) && this.doPublish());
          },
        },
        {
          key: 'recoveryOperations',
          value: function () {
            var e, t, i, r, n, o;
            if (
              this.audioMuteWanted !==
              (null === (e = this.options.stream.info) ||
              void 0 === e ||
              null === (t = e.audio) ||
              void 0 === t
                ? void 0
                : t.muted)
            )
              if (this.audioMuteWanted) {
                var s = this.muteAudioOption;
                this.control(s.userId, 'mute', s.cb, s.userData);
              } else {
                var a = this.unmuteAudioOption;
                this.control(a.userId, 'unmute', a.cb, a.userData);
              }
            if (
              this.videoMuteWanted !==
              (null === (i = this.options.stream.info) ||
              void 0 === i ||
              null === (r = i.video) ||
              void 0 === r
                ? void 0
                : r.muted)
            )
              if (this.videoMuteWanted) {
                var c = this.muteVideoOption;
                this.control(c.userId, 'vmute', c.cb, c.userData);
              } else {
                var u = this.unmuteVideoOPtion;
                this.control(u.userId, 'unvmute', u.cb, u.userData);
              }
            this.simulcastWanted &&
              null !== (n = this.options.stream.info) &&
              void 0 !== n &&
              null !== (o = n.video) &&
              void 0 !== o &&
              o.simulcast &&
              JSON.stringify(this.simulcastWanted) !==
                JSON.stringify(this.options.stream.info.video.simulcast) &&
              this.doUpdateSimulcast(this.updateSimulcastCb);
          },
        },
        {
          key: 'buildPublishParams',
          value: function () {
            if (this.streamKind === pe.AudioVideo) {
              var e = {
                streamId: this.options.stream.streamId,
                type: Te(this.options.stream.type),
                media: {
                  audio: {
                    source: _e(this.options.stream.info.audio.source),
                    muted: this.audioMuteWanted,
                    floor: this.options.stream.info.audio.floor,
                  },
                  video: {
                    source: Oe(this.options.stream.info.video.source),
                    muted: this.videoMuteWanted,
                    floor: this.options.stream.info.video.floor,
                  },
                },
                sdp: this.options.offerSdp,
              };
              return (
                this.simulcastWanted &&
                  this.simulcastWanted.length &&
                  (e.media.video.simulcast = this.simulcastWanted.map(
                    function (e) {
                      return $t($t({}, e), {}, { rid: Ae(e.type) });
                    }
                  )),
                e
              );
            }
            if (this.streamKind === pe.AudioOnly)
              return {
                streamId: this.options.stream.streamId,
                type: Te(this.options.stream.type),
                media: {
                  audio: {
                    source: _e(this.options.stream.info.audio.source),
                    muted: this.audioMuteWanted,
                    floor: this.options.stream.info.audio.floor,
                  },
                },
                sdp: this.options.offerSdp,
              };
            if (this.streamKind === pe.VideoOnly) {
              var t = {
                streamId: this.options.stream.streamId,
                type: Te(this.options.stream.type),
                media: {
                  video: {
                    source: Oe(this.options.stream.info.video.source),
                    muted: this.videoMuteWanted,
                    floor: this.options.stream.info.video.floor,
                  },
                },
                sdp: this.options.offerSdp,
              };
              return (
                this.simulcastWanted &&
                  this.simulcastWanted.length &&
                  (t.media.video.simulcast = this.simulcastWanted.map(
                    function (e) {
                      return $t($t({}, e), {}, { rid: Ae(e.type) });
                    }
                  )),
                t
              );
            }
          },
        },
        {
          key: 'doPublish',
          value: function () {
            var e = this;
            try {
              var t = this.buildPublishParams();
              null !== t &&
                (this.options.rpcClient.sendRequest(
                  { method: 'publish', params: t },
                  function (t) {
                    if (
                      (e.state.state() !== Yt.Publishing ||
                        e.state.setState(Yt.Published)) &&
                      (e.state.state() !== Yt.Republishing ||
                        e.state.setState(Yt.Republished))
                    ) {
                      if (e.options.publishCb) {
                        var i = t.result;
                        e.options.publishCb(oe.Success, null, {
                          roomId: e.options.roomId,
                          streamId: i.streamId,
                          answer_sdp: i.sdp,
                        });
                      }
                      e.recoveryOperations();
                    }
                  },
                  function (t) {
                    (e.options.logger.info('publish stream failed'),
                      e.options.publishCb &&
                        e.options.publishCb(oe.Failed, t.error.message, {
                          roomId: e.options.roomId,
                          streamId: e.options.stream.streamId,
                        }));
                  }
                ) ||
                  this.options.logger.error(
                    'Json Rpc Client send publish request error'
                  ));
            } catch (e) {
              (this.options.publishCb &&
                this.options.publishCb(oe.Failed, e, {
                  roomId: this.options.roomId,
                }),
                this.options.logger.error(e));
            }
          },
        },
        {
          key: 'doUnpublish',
          value: function (e) {
            var t = this;
            this.options.rpcClient.sendRequest(
              {
                method: 'unpublish',
                params: { id: this.options.stream.streamId },
              },
              function () {
                t.state.setState(Yt.Unpublished) &&
                  e &&
                  (e(oe.Success, null, { roomId: t.options.roomId }),
                  (t.unpublishCb = null));
              },
              function (i) {
                e &&
                  (t.options.logger.info('unpublish stream failed'),
                  e(oe.Failed, i.error.message, { roomId: t.options.roomId }),
                  (t.unpublishCb = null));
              }
            ) ||
              this.options.logger.error(
                'Json Rpc Client send unpublish request error'
              );
          },
        },
        {
          key: 'doUpdateSimulcast',
          value: function (e) {
            var t = this,
              i = {
                method: 'publishControl',
                params: {
                  type: 'simulcast',
                  streamId: this.options.stream.streamId,
                  simulcast: this.simulcastWanted.map(function (e) {
                    return {
                      rid: Ae(e.type),
                      maxWidth: e.maxWidth,
                      maxHeight: e.maxHeight,
                    };
                  }),
                },
              };
            this.options.rpcClient.sendRequest(
              i,
              function (i) {
                (t.options.logger.info(
                  'updateSimulcast '.concat(
                    t.options.stream.streamId,
                    ' success'
                  )
                ),
                  (t.options.stream.info.video.simulcast = t.simulcastWanted),
                  e && e(oe.Success, null, t.options.roomId));
              },
              function (i) {
                (t.options.logger.info(
                  'updateSimulcast '.concat(
                    t.options.stream.streamId,
                    ' failed'
                  )
                ),
                  e && e(oe.Failed, i.error.message, null));
              }
            ) ||
              this.options.logger.error(
                'Json Rpc Client send unsubscribe request error'
              );
          },
        },
        {
          key: 'control',
          value: function (e, t, i, r, n) {
            var o = this,
              s = {
                method: 'controlCommand',
                params: {
                  type: t,
                  streamId: this.options.stream.streamId,
                  member: e,
                  userData: n,
                },
              };
            (this.options.logger.info('control command with', t),
              this.options.rpcClient.sendRequest(
                s,
                function (n) {
                  switch (
                    (o.options.logger.info(
                      'control command with '.concat(t, ' success')
                    ),
                    t)
                  ) {
                    case 'mute':
                      r &&
                        r(o.options.roomId, de.MuteLocal, {
                          type: be.Amute,
                          userId: e,
                        });
                      break;
                    case 'unmute':
                      (r &&
                        r(o.options.roomId, de.MuteLocal, {
                          type: be.Aunmute,
                          userId: e,
                        }),
                        (o.options.stream.info.audio.muted =
                          o.audioMuteWanted));
                      break;
                    case 'vmute':
                      r &&
                        r(o.options.roomId, de.MuteLocal, {
                          type: be.Vmute,
                          userId: e,
                        });
                      break;
                    case 'unvmute':
                      (r &&
                        r(o.options.roomId, de.MuteLocal, {
                          type: be.Vunmute,
                          userId: e,
                        }),
                        (o.options.stream.info.video.muted =
                          o.videoMuteWanted));
                  }
                  i && i(oe.Success, null, { roomId: o.options.roomId });
                },
                function (e) {
                  (o.options.logger.info(
                    'control command with '.concat(t, ' failed')
                  ),
                    i &&
                      i(oe.Failed, e.error.message, {
                        roomId: o.options.roomId,
                      }));
                }
              ) ||
                this.options.logger.error(
                  'Json Rpc Client send ControlCommand request error'
                ));
          },
        },
      ]),
      e
    );
  })(),
  ei = (function () {
    function e(t) {
      (_(this, e),
        (this.options = t),
        (this.publiccation = new Zt({
          roomId: this.options.roomId,
          stream: this.options.stream,
          offerSdp: this.options.offerSdp,
          rpcClient: this.options.rpcClient,
          logger: this.options.logger,
          publishCb: this.options.publishCb,
          publishUpdateCb: this.options.publishUpdateCb,
        })));
    }
    return (
      O(e, [
        {
          key: 'publish',
          value: function () {
            this.publiccation.publish();
          },
        },
        {
          key: 'unpublish',
          value: function (e) {
            this.publiccation.unpublish(e);
          },
        },
        {
          key: 'updateSimulcast',
          value: function (e, t) {
            this.publiccation.updateSimulcast(e, t);
          },
        },
        {
          key: 'muteAudio',
          value: function (e, t, i, r) {
            this.publiccation.muteAudio(e, t, i, r);
          },
        },
        {
          key: 'muteVideo',
          value: function (e, t, i, r) {
            this.publiccation.muteVideo(e, t, i, r);
          },
        },
        {
          key: 'unmuteAudio',
          value: function (e, t, i, r) {
            this.publiccation.unmuteAudio(e, t, i, r);
          },
        },
        {
          key: 'unmuteVideo',
          value: function (e, t, i, r) {
            this.publiccation.unmuteVideo(e, t, i, r);
          },
        },
        {
          key: 'onConnectionLost',
          value: function () {
            this.publiccation.onConnectionLost();
          },
        },
        {
          key: 'onConnectionRecovery',
          value: function (e, t) {
            (this.options.logger.info('localStreams onConnectionRecovery'),
              this.publiccation.onConnectionRecovery(e, t));
          },
        },
      ]),
      e
    );
  })();
function ti(e, t) {
  (null == t || t > e.length) && (t = e.length);
  for (var i = 0, r = new Array(t); i < t; i++) r[i] = e[i];
  return r;
}
var ii,
  ri = (function () {
    function e(t) {
      (_(this, e),
        (this.options = t),
        (this.permissionWanted = t.permission),
        (this.permissionCb = null),
        (this.localStreams = new Map()));
    }
    return (
      O(e, [
        {
          key: 'getUserId',
          value: function () {
            return this.options.userId;
          },
        },
        {
          key: 'switchPermission',
          value: function (e, t) {
            ((this.permissionWanted = e), (this.permissionCb = t));
            var i = this.options.rpcClient.getWsState().state;
            ['CONNECTED', 'RECOVERY'].includes(i)
              ? this.doSwitchPermission(t)
              : this.options.logger.info(
                  'websocketState: '.concat(i, ',the operation has been cached')
                );
          },
        },
        {
          key: 'publishStream',
          value: function (e, t, i, r, n, o) {
            var s = {
              roomId: this.options.roomId,
              stream: {
                userId: this.options.userId,
                streamId: e,
                type: t,
                info: {},
              },
              offerSdp: r.offerSdp,
              rpcClient: this.options.rpcClient,
              logger: this.options.logger,
              publishCb: n,
              publishUpdateCb: o,
            };
            (i === pe.AudioVideo &&
              (s.stream.info = { audio: r.audioInfo, video: r.videoInfo }),
              i === pe.AudioOnly && (s.stream.info.audio = r.audioInfo),
              i === pe.VideoOnly && (s.stream.info.video = r.videoInfo));
            var a = new ei(s);
            (a.publish(), this.localStreams.set(e, a));
          },
        },
        {
          key: 'unpublishStream',
          value: function (e, t) {
            var i = this;
            this.localStreams.has(e) &&
              this.localStreams.get(e).unpublish(function (r, n, o) {
                (r === oe.Success && i.localStreams.delete(e), t && t(r, n, o));
              });
          },
        },
        {
          key: 'updateSimulcast',
          value: function (e, t, i) {
            this.localStreams.has(e) &&
              this.localStreams.get(e).updateSimulcast(t.simulcast, i);
          },
        },
        {
          key: 'muteAudio',
          value: function (e, t, i, r) {
            this.localStreams.has(e) &&
              this.localStreams.get(e).muteAudio(this.options.userId, t, i, r);
          },
        },
        {
          key: 'muteVideo',
          value: function (e, t, i, r) {
            this.localStreams.has(e) &&
              this.localStreams.get(e).muteVideo(this.options.userId, t, i, r);
          },
        },
        {
          key: 'unmuteAudio',
          value: function (e, t, i, r) {
            this.localStreams.has(e) &&
              this.localStreams
                .get(e)
                .unmuteAudio(this.options.userId, t, i, r);
          },
        },
        {
          key: 'unmuteVideo',
          value: function (e, t, i, r) {
            this.localStreams.has(e) &&
              this.localStreams
                .get(e)
                .unmuteVideo(this.options.userId, t, i, r);
          },
        },
        { key: 'onConnectionLost', value: function () {} },
        {
          key: 'onConnectionRecovery',
          value: function (e, t) {
            if (
              (this.options.logger.info('localUser onConnectionRecovery', e), e)
            ) {
              var i,
                r = (function (e, t) {
                  var i;
                  if (
                    'undefined' == typeof Symbol ||
                    null == e[Symbol.iterator]
                  ) {
                    if (
                      Array.isArray(e) ||
                      (i = (function (e, t) {
                        if (e) {
                          if ('string' == typeof e) return ti(e, t);
                          var i = Object.prototype.toString
                            .call(e)
                            .slice(8, -1);
                          return (
                            'Object' === i &&
                              e.constructor &&
                              (i = e.constructor.name),
                            'Map' === i || 'Set' === i
                              ? Array.from(e)
                              : 'Arguments' === i ||
                                  /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(
                                    i
                                  )
                                ? ti(e, t)
                                : void 0
                          );
                        }
                      })(e)) ||
                      (t && e && 'number' == typeof e.length)
                    ) {
                      i && (e = i);
                      var r = 0,
                        n = function () {};
                      return {
                        s: n,
                        n: function () {
                          return r >= e.length
                            ? { done: !0 }
                            : { done: !1, value: e[r++] };
                        },
                        e: function (e) {
                          throw e;
                        },
                        f: n,
                      };
                    }
                    throw new TypeError(
                      'Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
                    );
                  }
                  var o,
                    s = !0,
                    a = !1;
                  return {
                    s: function () {
                      i = e[Symbol.iterator]();
                    },
                    n: function () {
                      var e = i.next();
                      return ((s = e.done), e);
                    },
                    e: function (e) {
                      ((a = !0), (o = e));
                    },
                    f: function () {
                      try {
                        s || null == i.return || i.return();
                      } finally {
                        if (a) throw o;
                      }
                    },
                  };
                })(new Map(this.localStreams));
              try {
                for (r.s(); !(i = r.n()).done; ) {
                  var n = C(i.value, 2),
                    o = n[0],
                    s = n[1];
                  (this.options.logger.info(
                    'localUser onConnectionRecovery',
                    o
                  ),
                    s.onConnectionRecovery(e, null == t ? void 0 : t.get(o)),
                    this.localStreams.delete(o));
                  var a = null == t ? void 0 : t.get(o).pubId;
                  this.localStreams.set(a, s);
                }
              } catch (e) {
                r.e(e);
              } finally {
                r.f();
              }
              JSON.stringify(this.permissionWanted) !==
                JSON.stringify(this.options.permission) &&
                this.doSwitchPermission(this.permissionCb);
            }
          },
        },
        {
          key: 'doSwitchPermission',
          value: function (e) {
            var t = this;
            this.options.rpcClient.sendRequest(
              {
                method: 'switchPermission',
                params: { permission: this.permissionWanted },
              },
              function (i) {
                (t.options.logger.info('switch permission success'),
                  (t.options.permission = t.permissionWanted),
                  e && e(oe.Success, null, t.options.roomId));
              },
              function (i) {
                (t.options.logger.info('switch permission failed'),
                  e && e(oe.Failed, i.error.message, t.options.roomId));
              }
            ) ||
              this.options.logger.error(
                'Json Rpc Client send switch permission request error'
              );
          },
        },
      ]),
      e
    );
  })();
!(function (e) {
  ((e[(e.Create = 0)] = 'Create'),
    (e[(e.Subscribing = 1)] = 'Subscribing'),
    (e[(e.Subscribed = 2)] = 'Subscribed'),
    (e[(e.Resubscribing = 3)] = 'Resubscribing'),
    (e[(e.Resubscribed = 4)] = 'Resubscribed'),
    (e[(e.Unsubscribing = 5)] = 'Unsubscribing'),
    (e[(e.Unsubscribed = 6)] = 'Unsubscribed'),
    (e[(e.Destroyed = 7)] = 'Destroyed'),
    (e[(e.StateMax = 8)] = 'StateMax'));
})(ii || (ii = {}));
var ni = [
    'Create',
    'Subscribing',
    'Subscribed',
    'Resubscribing',
    'Resubscribed',
    'Unsubscribing',
    'Unsubscribed',
    'Destroy',
  ],
  oi = (function () {
    function e(t) {
      (_(this, e),
        (this.currentState = ii.Create),
        (this.stateTransformTable = new Array()),
        (this.logger = t),
        this.initStateTransformTable());
    }
    return (
      O(e, [
        {
          key: 'setState',
          value: function (e) {
            return this.checkStateChange(this.currentState, e)
              ? (this.logger.info(
                  'SubscriptionState : state change from ' +
                    ni[this.currentState] +
                    ' to ' +
                    ni[e]
                ),
                (this.currentState = e),
                !0)
              : (this.logger.error(
                  'SubscriptionState : INVALID state change from' +
                    ni[this.currentState] +
                    ' to ' +
                    ni[e]
                ),
                !1);
          },
        },
        {
          key: 'state',
          value: function () {
            return this.currentState;
          },
        },
        {
          key: 'checkStateChange',
          value: function (e, t) {
            return this.stateTransformTable[e][t];
          },
        },
        {
          key: 'initStateTransformTable',
          value: function () {
            for (var e = ii.Create; e < ii.StateMax; e++) {
              this.stateTransformTable[e] = new Array();
              for (var t = ii.Create; t < ii.StateMax; t++)
                this.stateTransformTable[e][t] = !1;
            }
            ((this.stateTransformTable[ii.Create][ii.Subscribing] = !0),
              (this.stateTransformTable[ii.Create][ii.Destroyed] = !0),
              (this.stateTransformTable[ii.Subscribing][ii.Subscribed] = !0),
              (this.stateTransformTable[ii.Subscribing][ii.Unsubscribing] = !0),
              (this.stateTransformTable[ii.Subscribing][ii.Destroyed] = !0),
              (this.stateTransformTable[ii.Subscribing][ii.Resubscribing] = !0),
              (this.stateTransformTable[ii.Subscribed][ii.Unsubscribing] = !0),
              (this.stateTransformTable[ii.Subscribed][ii.Resubscribing] = !0),
              (this.stateTransformTable[ii.Subscribed][ii.Destroyed] = !0),
              (this.stateTransformTable[ii.Resubscribing][ii.Resubscribing] =
                !0),
              (this.stateTransformTable[ii.Resubscribing][ii.Resubscribed] =
                !0),
              (this.stateTransformTable[ii.Resubscribing][ii.Unsubscribing] =
                !0),
              (this.stateTransformTable[ii.Resubscribing][ii.Subscribed] = !0),
              (this.stateTransformTable[ii.Resubscribing][ii.Destroyed] = !0),
              (this.stateTransformTable[ii.Resubscribed][ii.Resubscribing] =
                !0),
              (this.stateTransformTable[ii.Resubscribed][ii.Unsubscribing] =
                !0),
              (this.stateTransformTable[ii.Resubscribed][ii.Destroyed] = !0),
              (this.stateTransformTable[ii.Unsubscribing][ii.Unsubscribed] =
                !0),
              (this.stateTransformTable[ii.Unsubscribing][ii.Destroyed] = !0),
              (this.stateTransformTable[ii.Unsubscribed][ii.Destroyed] = !0));
          },
        },
      ]),
      e
    );
  })(),
  si = (function () {
    function e(t) {
      (_(this, e),
        (this.options = t),
        (this.state = new oi(t.logger)),
        (this.connectionStatus = ue.ConnectionConnected),
        this.options.rid && (this.ridWanted = this.options.rid),
        (this.switchSimulcastCb = null),
        (this.unsubscribeCb = null));
    }
    return (
      O(e, [
        {
          key: 'subscribe',
          value: function () {
            if (
              (this.options.logger.info(
                'start subscribe: '.concat(this.options.subscriptionId)
              ),
              this.state.setState(ii.Subscribing))
            ) {
              var e = this.options.rpcClient.getWsState().state;
              ['CONNECTED', 'RECOVERY'].includes(e) && this.doSubscribe();
            }
          },
        },
        {
          key: 'unsubscribe',
          value: function (e) {
            if (
              (this.options.logger.info(
                'unsubscribe: '.concat(this.options.subscriptionId)
              ),
              this.state.setState(ii.Unsubscribing))
            ) {
              this.unsubscribeCb = e;
              var t = this.options.rpcClient.getWsState().state;
              ['CONNECTED', 'RECOVERY'].includes(t)
                ? this.doUnsubscribe(this.unsubscribeCb)
                : this.options.logger.info(
                    'websocketState: '.concat(t, ',unsubscribe has been cached')
                  );
            }
          },
        },
        {
          key: 'switchSimulcast',
          value: function (e, t) {
            if (this.ridWanted !== e) {
              ((this.ridWanted = e), (this.switchSimulcastCb = t));
              var i = this.options.rpcClient.getWsState().state,
                r = this.state.state();
              ['CONNECTED', 'RECOVERY'].includes(i)
                ? r === ii.Resubscribed || r === ii.Subscribed
                  ? this.doSwitchSimulcast(t)
                  : this.options.logger.info(
                      'publicationState: '.concat(
                        i,
                        ',switchSimulcast has been cached'
                      )
                    )
                : this.options.logger.info(
                    'websocketState: '.concat(
                      i,
                      ',switchSimulcast has been cached'
                    )
                  );
            } else
              this.options.logger.info('can not switch the same simulcast');
          },
        },
        { key: 'onConnectionLost', value: function () {} },
        {
          key: 'onConnectionRecovery',
          value: function (e, t) {
            if (
              (this.options.logger.info(
                'onConnectionRecovery subscriptionId',
                this.options.subscriptionId,
                'sessionTimeout',
                e,
                'sdp',
                t
              ),
              this.state.state() === ii.Unsubscribing)
            )
              return this.doUnsubscribe(this.unsubscribeCb);
            e
              ? t &&
                ((this.options.offerSdp = t.sdp),
                (this.options.subscriptionId = t.subId),
                this.resubscribe())
              : this.recoveryOperations();
          },
        },
        {
          key: 'resubscribe',
          value: function () {
            (this.options.logger.info(
              'start resubscribe: ' + this.options.subscriptionId
            ),
              this.state.setState(ii.Resubscribing) && this.doSubscribe());
          },
        },
        {
          key: 'recoveryOperations',
          value: function () {
            this.ridWanted &&
              this.ridWanted !== this.options.rid &&
              this.doSwitchSimulcast(this.switchSimulcastCb);
          },
        },
        {
          key: 'doSubscribe',
          value: function () {
            var e = this;
            try {
              var t = {
                userId: this.options.userId,
                subscriptionId: this.options.subscriptionId,
                media: {
                  audio: { has: this.options.subAudio },
                  video: { has: this.options.subVideo },
                },
                sdp: this.options.offerSdp,
              };
              (this.options.subAudio &&
                (t.media.audio.streamId = this.options.audioStreamId),
                this.options.subVideo &&
                  ((t.media.video.streamId = this.options.videoStreamId),
                  (t.media.video.rid = this.ridWanted)),
                this.options.rpcClient.sendRequest(
                  { method: 'subscribe', params: t },
                  function (t) {
                    if (
                      (e.state.state() !== ii.Subscribing ||
                        e.state.setState(ii.Subscribed)) &&
                      (e.state.state() !== ii.Resubscribing ||
                        e.state.setState(ii.Resubscribed))
                    ) {
                      e.options.logger.info(
                        'subscribe '.concat(
                          e.options.subscriptionId,
                          ' success'
                        )
                      );
                      var i = t.result;
                      (e.options.subscribeCb &&
                        e.options.subscribeCb(oe.Success, null, {
                          roomId: e.options.roomId,
                          subscriptionId: i.subscriptionId,
                          answer_sdp: i.sdp,
                        }),
                        e.recoveryOperations());
                    }
                  },
                  function (t) {
                    (e.options.logger.info(
                      'subscribe '.concat(e.options.subscriptionId, ' failed')
                    ),
                      e.options.subscribeCb &&
                        e.options.subscribeCb(oe.Failed, t.error.message, {
                          roomId: e.options.roomId,
                          subscriptionId: e.options.subscriptionId,
                        }));
                  }
                ) ||
                  this.options.logger.error(
                    'Json Rpc Client send subscribe request error'
                  ));
            } catch (e) {
              (this.options.subscribeCb &&
                this.options.subscribeCb(oe.Failed, e, null),
                this.options.logger.error(e));
            }
          },
        },
        {
          key: 'doSwitchSimulcast',
          value: function (e) {
            var t = this;
            this.options.rpcClient.sendRequest(
              {
                method: 'subscribeControl',
                params: {
                  subscriptionId: this.options.subscriptionId,
                  type: 'simulcast',
                  rid: this.ridWanted,
                },
              },
              function (i) {
                (t.options.logger.info(
                  'switchSimulcast '.concat(
                    t.options.subscriptionId,
                    ' success'
                  )
                ),
                  (t.options.rid = t.ridWanted),
                  e && e(oe.Success, null, t.options.roomId));
              },
              function (i) {
                (t.options.logger.info(
                  'switchSimulcast '.concat(t.options.subscriptionId, ' failed')
                ),
                  e && e(oe.Failed, i.error.message, null));
              }
            ) ||
              this.options.logger.error(
                'Json Rpc Client send unsubscribe request error'
              );
          },
        },
        {
          key: 'doUnsubscribe',
          value: function (e) {
            var t = this;
            this.options.rpcClient.sendRequest(
              {
                method: 'unsubscribe',
                params: { id: this.options.subscriptionId },
              },
              function (i) {
                t.state.setState(ii.Unsubscribed) &&
                  (t.options.logger.info(
                    'unsubscribe '.concat(t.options.subscriptionId, ' success')
                  ),
                  e &&
                    (e(oe.Success, null, { roomId: t.options.roomId }),
                    (t.unsubscribeCb = null)));
              },
              function (i) {
                (t.options.logger.info(
                  'unsubscribe '.concat(t.options.subscriptionId, ' failed')
                ),
                  e &&
                    (e(oe.Failed, i.error.message, null),
                    (t.unsubscribeCb = null)));
              }
            ) ||
              this.options.logger.error(
                'Json Rpc Client send unsubscribe request error'
              );
          },
        },
      ]),
      e
    );
  })();
function ai(e, t) {
  var i;
  if ('undefined' == typeof Symbol || null == e[Symbol.iterator]) {
    if (
      Array.isArray(e) ||
      (i = (function (e, t) {
        if (e) {
          if ('string' == typeof e) return ci(e, t);
          var i = Object.prototype.toString.call(e).slice(8, -1);
          return (
            'Object' === i && e.constructor && (i = e.constructor.name),
            'Map' === i || 'Set' === i
              ? Array.from(e)
              : 'Arguments' === i ||
                  /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i)
                ? ci(e, t)
                : void 0
          );
        }
      })(e)) ||
      (t && e && 'number' == typeof e.length)
    ) {
      i && (e = i);
      var r = 0,
        n = function () {};
      return {
        s: n,
        n: function () {
          return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
        },
        e: function (e) {
          throw e;
        },
        f: n,
      };
    }
    throw new TypeError(
      'Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
    );
  }
  var o,
    s = !0,
    a = !1;
  return {
    s: function () {
      i = e[Symbol.iterator]();
    },
    n: function () {
      var e = i.next();
      return ((s = e.done), e);
    },
    e: function (e) {
      ((a = !0), (o = e));
    },
    f: function () {
      try {
        s || null == i.return || i.return();
      } finally {
        if (a) throw o;
      }
    },
  };
}
function ci(e, t) {
  (null == t || t > e.length) && (t = e.length);
  for (var i = 0, r = new Array(t); i < t; i++) r[i] = e[i];
  return r;
}
var ui = (function () {
  function e(t) {
    (_(this, e), (this.options = t), (this.subscriptions = new Map()));
  }
  return (
    O(e, [
      {
        key: 'subscribe',
        value: function (e, t, i, r, n, o, s) {
          var a = new si({
            roomId: this.options.roomId,
            userId: this.options.stream.userId,
            subscriptionId: e,
            offerSdp: n,
            subAudio: t,
            audioStreamId: this.options.stream.streamId,
            subVideo: i,
            videoStreamId: this.options.stream.streamId,
            rid: r,
            rpcClient: this.options.rpcClient,
            logger: this.options.logger,
            subscribeCb: o,
            subscribeUpdateCb: s,
          });
          (a.subscribe(),
            this.options.logger.info(
              'remoteStream subscribe subscriptionId',
              e
            ),
            this.subscriptions.set(e, a));
        },
      },
      {
        key: 'unsubscribe',
        value: function (e, t) {
          var i = this;
          this.subscriptions.has(e) &&
            this.subscriptions.get(e).unsubscribe(function (r, n, o) {
              (r === oe.Success &&
                (i.options.logger.info(
                  'remoteStream unsubscribe subscriptionId',
                  e
                ),
                i.subscriptions.delete(e)),
                t && t(r, n, o));
            });
        },
      },
      {
        key: 'updateSimulcast',
        value: function (e) {
          this.options.stream.info.video.simulcast = e;
        },
      },
      {
        key: 'updateLiveStatus',
        value: function (e) {
          (e.audio && (this.options.stream.info.audio.muted = e.audio.muted),
            e.video && (this.options.stream.info.video.muted = e.video.muted));
        },
      },
      {
        key: 'switchSimulcast',
        value: function (e, t, i) {
          this.subscriptions.has(e) &&
            this.subscriptions.get(e).switchSimulcast(t, i);
        },
      },
      {
        key: 'onConnectionLost',
        value: function () {
          var e,
            t = ai(this.subscriptions.values());
          try {
            for (t.s(); !(e = t.n()).done; ) e.value.onConnectionLost();
          } catch (e) {
            t.e(e);
          } finally {
            t.f();
          }
        },
      },
      {
        key: 'onConnectionRecovery',
        value: function (e, t, i) {
          this.options.logger.info(
            'remoteStream onConnectionRecovery subscriptionId',
            this.subscriptions,
            t,
            i
          );
          var r,
            n = ai(new Map(this.subscriptions));
          try {
            for (n.s(); !(r = n.n()).done; ) {
              var o = C(r.value, 2),
                s = o[1];
              o[0] === t &&
                (this.subscriptions.get(t).onConnectionRecovery(e, i),
                this.subscriptions.delete(t),
                this.subscriptions.set(null == i ? void 0 : i.subId, s));
            }
          } catch (e) {
            n.e(e);
          } finally {
            n.f();
          }
        },
      },
    ]),
    e
  );
})();
function di(e, t) {
  var i;
  if ('undefined' == typeof Symbol || null == e[Symbol.iterator]) {
    if (
      Array.isArray(e) ||
      (i = (function (e, t) {
        if (e) {
          if ('string' == typeof e) return li(e, t);
          var i = Object.prototype.toString.call(e).slice(8, -1);
          return (
            'Object' === i && e.constructor && (i = e.constructor.name),
            'Map' === i || 'Set' === i
              ? Array.from(e)
              : 'Arguments' === i ||
                  /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i)
                ? li(e, t)
                : void 0
          );
        }
      })(e)) ||
      (t && e && 'number' == typeof e.length)
    ) {
      i && (e = i);
      var r = 0,
        n = function () {};
      return {
        s: n,
        n: function () {
          return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
        },
        e: function (e) {
          throw e;
        },
        f: n,
      };
    }
    throw new TypeError(
      'Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
    );
  }
  var o,
    s = !0,
    a = !1;
  return {
    s: function () {
      i = e[Symbol.iterator]();
    },
    n: function () {
      var e = i.next();
      return ((s = e.done), e);
    },
    e: function (e) {
      ((a = !0), (o = e));
    },
    f: function () {
      try {
        s || null == i.return || i.return();
      } finally {
        if (a) throw o;
      }
    },
  };
}
function li(e, t) {
  (null == t || t > e.length) && (t = e.length);
  for (var i = 0, r = new Array(t); i < t; i++) r[i] = e[i];
  return r;
}
var hi = (function () {
    function e(t) {
      (_(this, e),
        (this.options = t),
        (this.remoteStreams = new Map()),
        (this.streamIdArray = new Array()),
        (this.subPubIdMap = new Map()));
    }
    return (
      O(e, [
        {
          key: 'addStream',
          value: function (e) {
            var t = e.streamId;
            (this.remoteStreams.set(
              t,
              new ui({
                roomId: this.options.roomId,
                stream: e,
                rpcClient: this.options.rpcClient,
                logger: this.options.logger,
              })
            ),
              this.streamIdArray.push(t));
          },
        },
        {
          key: 'deleteStream',
          value: function (e) {
            if (this.remoteStreams.has(e)) {
              this.remoteStreams.delete(e);
              var t = this.streamIdArray.indexOf(e);
              -1 != t && this.streamIdArray.splice(t, 1);
              var i,
                r = null,
                n = di(this.subPubIdMap);
              try {
                for (n.s(); !(i = n.n()).done; ) {
                  var o = C(i.value, 2);
                  o[1] === e && (r = o[0]);
                }
              } catch (e) {
                n.e(e);
              } finally {
                n.f();
              }
              r && this.subPubIdMap.delete(r);
            }
          },
        },
        {
          key: 'updateStreamSimulcast',
          value: function (e, t) {
            this.remoteStreams.has(e) &&
              this.remoteStreams.get(e).updateSimulcast(t);
          },
        },
        {
          key: 'updateStreamStatus',
          value: function (e, t) {
            this.remoteStreams.has(e) &&
              this.remoteStreams.get(e).updateLiveStatus(t);
          },
        },
        {
          key: 'subscribeStream',
          value: function (e, t, i, r, n, o) {
            (this.options.logger.info(
              'remote user subscribe stream',
              this.remoteStreams.has(t)
            ),
              this.remoteStreams.has(t) &&
                (this.remoteStreams
                  .get(t)
                  .subscribe(
                    e,
                    r.hasAudio,
                    r.hasVideo,
                    Ae(null == r ? void 0 : r.type),
                    r.offerSdp,
                    n,
                    o
                  ),
                this.options.logger.info(
                  'remoteUser subscribeStream subscriptionId',
                  e
                ),
                this.subPubIdMap.set(e, t)));
          },
        },
        {
          key: 'unsubscribeStream',
          value: function (e, t) {
            var i = this,
              r = this.subPubIdMap.get(e);
            r &&
              this.remoteStreams.has(r) &&
              this.remoteStreams.get(r).unsubscribe(e, function (r, n, o) {
                (r === oe.Success && i.subPubIdMap.delete(e), t && t(r, n, o));
              });
          },
        },
        {
          key: 'switchSimulcast',
          value: function (e, t, i) {
            var r = this.subPubIdMap.get(e);
            r &&
              this.remoteStreams.has(r) &&
              this.remoteStreams.get(r).switchSimulcast(e, Ae(t.type), i);
          },
        },
        {
          key: 'getAllStreamId',
          value: function () {
            return this.streamIdArray;
          },
        },
        { key: 'onConnectionLost', value: function () {} },
        {
          key: 'onConnectionRecovery',
          value: function (e, t) {
            this.options.logger.info('remoteUser onConnectionRecovery', e);
            var i,
              r = di(new Map(this.subPubIdMap));
            try {
              for (r.s(); !(i = r.n()).done; ) {
                var n = C(i.value, 2),
                  o = n[0],
                  s = n[1];
                if (
                  (this.options.logger.info(
                    'remoteUser onConnectionRecovery subscriptionId',
                    o,
                    'streamId',
                    s
                  ),
                  this.remoteStreams.has(s))
                ) {
                  (this.remoteStreams
                    .get(s)
                    .onConnectionRecovery(e, o, t.get(o)),
                    this.subPubIdMap.delete(o));
                  var a = null == t ? void 0 : t.get(o).subId;
                  this.subPubIdMap.set(a, s);
                }
              }
            } catch (e) {
              r.e(e);
            } finally {
              r.f();
            }
          },
        },
      ]),
      e
    );
  })(),
  pi = (function () {
    function e(t, i) {
      (_(this, e),
        (this.options = t),
        (this.wsUrlList = R(t.wsUrl)),
        (this.userId = t.userId),
        (this.ssl = t.ssl),
        (this.roomId = t.roomId),
        (this.logger = i),
        (this.wsSocket = null),
        (this.pendingRequests = new Array()),
        (this.successCallbacks = new Map()),
        (this.errorCallbacks = new Map()),
        (this.requestTypes = new Map()),
        (this.retryTimerId = 0),
        (this.retryCount = 0),
        (this.maxRetryCount = 30),
        (this.currentId = 1),
        (this.times = 6e4),
        (this.timer = null),
        (this.state = 'DISCONNECTED'),
        (this.prevState = 'DISCONNECTED'),
        (this.autoReconnected = !0),
        (this.lockReconnect = !1),
        (this.heartCheck = this.initHeartCheck()));
    }
    var t, i;
    return (
      O(e, [
        {
          key: 'sendRequest',
          value: function (e, t, i) {
            if (!e) return !1;
            ((e.jsonrpc = '2.0'),
              (e.id = ''
                .concat(this.userId, '_')
                .concat(Date.now(), '_')
                .concat(this.currentId++)));
            var r = this;
            (t ||
              (t = function (e) {
                r.logger.debug('success: ' + JSON.stringify(e));
              }),
              i ||
                (i = function (e) {
                  r.logger.debug('error: ' + JSON.stringify(e));
                }));
            var n = JSON.stringify(e);
            return (
              !!this.wsSocket &&
              (this.wsSocket.readyState < 1
                ? this.pendingRequests.push(n)
                : (r.logger.info(
                    'send message: \n' + JSON.stringify(JSON.parse(n), null, 4)
                  ),
                  this.sendMessage(n)),
              this.successCallbacks.set(e.id, t),
              this.errorCallbacks.set(e.id, i),
              this.requestTypes.set(e.id, e.method),
              !0)
            );
          },
        },
        {
          key: 'socketReady',
          value: function () {
            return (
              this.logger.info(
                'wsSocket readyState',
                this.wsSocket && this.wsSocket.readyState
              ),
              !(null == this.wsSocket || this.wsSocket.readyState > 1)
            );
          },
        },
        {
          key: 'connect',
          value:
            ((i = T(
              A.mark(function e() {
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          if (
                            this.options.wsUrl ||
                            0 !== this.options.wsUrl.length
                          ) {
                            e.next = 3;
                            break;
                          }
                          return (
                            this.logger.error('Websocket url is empty!'),
                            e.abrupt('return', !1)
                          );
                        case 3:
                          if (
                            (this.retryTimerId &&
                              window.clearTimeout(this.retryTimerId),
                            this.socketReady())
                          ) {
                            e.next = 13;
                            break;
                          }
                          return (
                            (this.prevState = this.state),
                            (this.state = 'CONNECTING'),
                            this.options.onWsStateChange(
                              this.prevState,
                              this.state,
                              this.retryCount
                            ),
                            (e.next = 10),
                            this.getWsUrl()
                          );
                        case 10:
                          ((this.wsSocket = new WebSocket(e.sent)),
                            this.wsSocket &&
                              ((this.wsSocket.onmessage =
                                this.onWsMessage.bind(this)),
                              (this.wsSocket.onclose =
                                this.onWsClose.bind(this)),
                              (this.wsSocket.onerror =
                                this.onWsError.bind(this)),
                              (this.wsSocket.onopen =
                                this.onConnect.bind(this))));
                        case 13:
                          return e.abrupt('return', !!this.wsSocket);
                        case 14:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this
                );
              })
            )),
            function () {
              return i.apply(this, arguments);
            }),
        },
        {
          key: 'close',
          value: function () {
            this.socketReady() &&
              ((this.autoReconnected = !1),
              (this.pendingRequests = []),
              this.wsSocket.close(),
              this.resetWs(),
              this.timer && clearTimeout(this.timer),
              this.retryTimerId && clearTimeout(this.retryTimerId),
              this.heartCheck.reset(),
              (this.heartCheck = null),
              this.logger.info('close websocket'));
          },
        },
        {
          key: 'onConnect',
          value: function () {
            var e;
            for (
              this.heartCheck.start(),
                this.prevState = this.state,
                this.retryTimerId
                  ? (window.clearTimeout(this.retryTimerId),
                    (this.retryTimerId = null),
                    (this.state = 'RECOVERY'))
                  : (this.state = 'CONNECTED'),
                this.options.onConnect(this.state),
                this.retryCount = 0,
                this.options.onWsStateChange(
                  this.prevState,
                  this.state,
                  this.retryCount
                );
              (e = this.pendingRequests.shift());

            )
              (this.logger.info('send message: \n' + e), this.sendMessage(e));
          },
        },
        {
          key: 'onWsMessage',
          value: function (e) {
            var t;
            if (
              (this.heartCheck &&
                this.heartCheck.serverTimeoutObj &&
                (clearTimeout(this.heartCheck.serverTimeoutObj),
                (this.heartCheck.serverTimeoutObj = null)),
              this.timer && clearTimeout(this.timer),
              (this.timer = null),
              'object' !== G((t = JSON.parse(e.data))) || 'pong' !== t.method)
            ) {
              if (
                (this.logger.info(
                  '格式化消息: \n' + JSON.stringify(t, null, 4)
                ),
                'object' === G(t) && 'jsonrpc' in t && '2.0' === t.jsonrpc)
              ) {
                var i = t.id,
                  r = this.successCallbacks.get(i),
                  n = this.errorCallbacks.get(i);
                if ('result' in t && r)
                  return (
                    r({ jsonrpc: '2.0', id: t.id, result: t.result }),
                    this.successCallbacks.delete(i),
                    void this.errorCallbacks.delete(i)
                  );
                if ('error' in t && n) {
                  var o = { jsonrpc: '2.0', id: t.id, error: t.error };
                  return (
                    this.logger.error(
                      '信令返回错误: \n' + JSON.stringify(o, null, 4)
                    ),
                    n(o),
                    this.successCallbacks.delete(i),
                    void this.errorCallbacks.delete(i)
                  );
                }
              }
              if ('id' in t) {
                if ('function' == typeof this.options.onRequest) {
                  var s = this.options.onRequest({
                    jsonrpc: '2.0',
                    id: t.id,
                    method: t.method,
                    params: t.params,
                  });
                  ((s.jsonrpc = '2.0'),
                    (s.id = t.id),
                    this.wsSocket && this.wsSocket.send(JSON.stringify(s)));
                }
              } else
                this.options.onNotification({
                  jsonrpc: '2.0',
                  method: t.method,
                  params: t.params,
                });
            }
          },
        },
        {
          key: 'onWsClose',
          value: function (e) {
            (this.logger.info('onWsClose', e),
              this.heartCheck && this.heartCheck.reset(),
              (this.pendingRequests = []),
              (this.prevState = this.state),
              (this.state = 'DISCONNECTED'),
              this.prevState !== this.state &&
                this.options.onWsStateChange(
                  this.prevState,
                  this.state,
                  this.retryCount
                ));
          },
        },
        {
          key: 'onWsError',
          value: function (e) {
            if (
              (this.logger.info('onWsError', e),
              this.heartCheck && this.heartCheck.reset(),
              (this.pendingRequests = []),
              (this.prevState = this.state),
              (this.state = 'DISCONNECTED'),
              this.prevState !== this.state &&
                this.options.onWsStateChange(
                  this.prevState,
                  this.state,
                  this.retryCount
                ),
              0 === this.retryCount)
            ) {
              this.logger.onError({
                c: Ue.TOP_ERROR,
                v: B.SIGNAL_CHANNEL_SETUP_FAILED,
              });
              var t = new X({
                code: B.SIGNAL_CHANNEL_SETUP_FAILED,
                message: 'WebSocket connect failed',
              });
              'function' == typeof this.options.onError &&
                this.options.onError(t);
            }
          },
        },
        {
          key: 'reconnect',
          value: function () {
            var e = this;
            (!this.autoReconnected && this.lockReconnect) ||
              ((this.lockReconnect = !0),
              (this.prevState = this.state),
              this.retryTimerId && clearTimeout(this.retryTimerId),
              this.retryCount < this.maxRetryCount
                ? (this.retryTimerId = window.setTimeout(function () {
                    (e.retryCount++,
                      e.logger.info(
                        ''
                          .concat(
                            new Date().toLocaleString(),
                            ' Try to reconnect, count: '
                          )
                          .concat(e.retryCount)
                      ),
                      (e.state = 'RECONNECTING'),
                      e.options.onWsStateChange(
                        e.prevState,
                        e.state,
                        e.retryCount
                      ),
                      e.resetWs(),
                      e.connect(),
                      (e.lockReconnect = !1));
                  }, this.getReconnectDelay(this.retryCount)))
                : (this.logger.warn(
                    'SDK has tried reconnect signal channel for '.concat(
                      this.maxRetryCount,
                      ' times, but all failed. please check your network'
                    )
                  ),
                  this.options.onWsReconnectFailed &&
                    this.options.onWsReconnectFailed()));
          },
        },
        {
          key: 'sendMessage',
          value: function (e) {
            var t = this;
            (this.wsSocket.send(e),
              this.timer ||
                (this.timer = setTimeout(function () {
                  t.logger.onError(
                    { c: Ue.TOP_ERROR, v: B.SERVER_TIMEOUT },
                    'websocket connection timeout!'
                  );
                  var e = new X({
                    code: B.SERVER_TIMEOUT,
                    message: 'server timeout',
                  });
                  'function' == typeof t.options.onError &&
                    t.options.onError(e);
                }, this.times)));
          },
        },
        {
          key: 'getWsState',
          value: function () {
            return { state: this.state, prevState: this.prevState };
          },
        },
        {
          key: 'resetWs',
          value: function () {
            this.wsSocket &&
              ((this.wsSocket.onmessage = null),
              (this.wsSocket.onclose = null),
              (this.wsSocket.onerror = null),
              (this.wsSocket.onopen = null),
              (this.wsSocket = null));
          },
        },
        {
          key: 'initHeartCheck',
          value: function () {
            var e = this;
            return {
              timeout: 2e3,
              serverTimeout: 1e4,
              timeoutObj: null,
              serverTimeoutObj: null,
              reset: function () {
                return (
                  clearInterval(this.timeoutObj),
                  clearTimeout(this.serverTimeoutObj),
                  (this.timeoutObj = null),
                  (this.serverTimeoutObj = null),
                  this
                );
              },
              start: function () {
                var t = this;
                (this.reset(),
                  (this.timeoutObj = setInterval(function () {
                    (e.sendMessage(
                      JSON.stringify({
                        jsonrpc: '2.0',
                        id: 0,
                        method: 'ping',
                        params: {},
                      })
                    ),
                      t.serverTimeoutObj ||
                        (t.serverTimeoutObj = setTimeout(function () {
                          (e.logger.info(
                            new Date().toLocaleString(),
                            'not received pong, close the websocket'
                          ),
                            e.onWsError());
                        }, t.serverTimeout)));
                  }, this.timeout)));
              },
            };
          },
        },
        {
          key: 'getReconnectDelay',
          value: function (e) {
            return Math.round(e / 2) + 1 > 6 ? 13e3 : 3e3;
          },
        },
        {
          key: 'getWsUrl',
          value:
            ((t = T(
              A.mark(function e() {
                var t, i, r, n, o, s, a, c, u, d, l, h, p, f;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          if (
                            ((t = ''),
                            'string' == typeof this.options.wsUrl
                              ? (t = ''
                                  .concat(this.options.wsUrl, '/xsigo?roomNum=')
                                  .concat(this.roomId, '&userId=')
                                  .concat(this.userId, '&appKey=')
                                  .concat(this.options.appId))
                              : ((i = this.getWsUrlList()),
                                (t = ''
                                  .concat(this.ssl ? 'wss' : 'ws', '://')
                                  .concat(i, '/xsigo?roomNum=')
                                  .concat(this.roomId, '&userId=')
                                  .concat(this.userId, '&appKey=')
                                  .concat(this.options.appId))),
                            this.options.privateKey &&
                              (t += '&privateKey='.concat(
                                this.options.privateKey
                              )),
                            this.options.extendInfo &&
                              this.options.extendInfo.location &&
                              (t += '&location='.concat(
                                this.options.extendInfo.location
                              )),
                            !(r = this.options.onCustomSignParam))
                          ) {
                            e.next = 13;
                            break;
                          }
                          return ((e.next = 8), r());
                        case 8:
                          if (
                            'object' === G((n = e.sent).getHeader) &&
                            '{}' !== JSON.stringify(n.getHeader) &&
                            ((o = n.getHeader),
                            '[object Object]' ===
                              Object.prototype.toString.call(o) &&
                              '{}' !== JSON.stringify(o))
                          )
                            for (
                              s = 0, a = Object.entries(o);
                              s < a.length;
                              s++
                            )
                              ((c = C(a[s], 2)),
                                (u = c[1]),
                                (t += '&'.concat(c[0], '=').concat(u)));
                          if (
                            'object' === G(n.getQuery) &&
                            '{}' !== JSON.stringify(n.getQuery) &&
                            ((d = n.getQuery),
                            '[object Object]' ===
                              Object.prototype.toString.call(d) &&
                              '{}' !== JSON.stringify(d))
                          )
                            for (
                              l = 0, h = Object.entries(d);
                              l < h.length;
                              l++
                            )
                              ((p = C(h[l], 2)),
                                (f = p[1]),
                                (t += '&'.concat(p[0], '=').concat(f)));
                          e.next = 14;
                          break;
                        case 13:
                          r ||
                            (t = ''
                              .concat(t, '&Authorization=')
                              .concat(this.options.userSig));
                        case 14:
                          return e.abrupt('return', t);
                        case 15:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this
                );
              })
            )),
            function () {
              return t.apply(this, arguments);
            }),
        },
        {
          key: 'getWsUrlList',
          value: function () {
            var e = this.options.wsUrl.length;
            if (1 === e) return this.options.wsUrl[0];
            if (
              (e &&
                !this.wsUrlList.length &&
                (this.wsUrlList = R(this.options.wsUrl)),
              e === this.wsUrlList.length)
            )
              for (; e; ) {
                var t = Math.floor(Math.random() * e--),
                  i = [this.wsUrlList[e], this.wsUrlList[t]];
                ((this.wsUrlList[t] = i[0]), (this.wsUrlList[e] = i[1]));
              }
            return this.wsUrlList.shift();
          },
        },
      ]),
      e
    );
  })();
function fi(e, t) {
  var i;
  if ('undefined' == typeof Symbol || null == e[Symbol.iterator]) {
    if (
      Array.isArray(e) ||
      (i = (function (e, t) {
        if (e) {
          if ('string' == typeof e) return mi(e, t);
          var i = Object.prototype.toString.call(e).slice(8, -1);
          return (
            'Object' === i && e.constructor && (i = e.constructor.name),
            'Map' === i || 'Set' === i
              ? Array.from(e)
              : 'Arguments' === i ||
                  /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i)
                ? mi(e, t)
                : void 0
          );
        }
      })(e)) ||
      (t && e && 'number' == typeof e.length)
    ) {
      i && (e = i);
      var r = 0,
        n = function () {};
      return {
        s: n,
        n: function () {
          return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
        },
        e: function (e) {
          throw e;
        },
        f: n,
      };
    }
    throw new TypeError(
      'Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
    );
  }
  var o,
    s = !0,
    a = !1;
  return {
    s: function () {
      i = e[Symbol.iterator]();
    },
    n: function () {
      var e = i.next();
      return ((s = e.done), e);
    },
    e: function (e) {
      ((a = !0), (o = e));
    },
    f: function () {
      try {
        s || null == i.return || i.return();
      } finally {
        if (a) throw o;
      }
    },
  };
}
function mi(e, t) {
  (null == t || t > e.length) && (t = e.length);
  for (var i = 0, r = new Array(t); i < t; i++) r[i] = e[i];
  return r;
}
var gi = (function () {
  function e(t) {
    (_(this, e), (this.options = t), (this.isFirstLogin = !0));
    var i = t.roomCbs;
    ((this.roomCbs = {
      connectionLostCb: i.connectionLostCb,
      connectionRecoveryCb: i.connectionRecoveryCb,
      tryToReconnectCb: i.tryToReconnectCb,
      notificationCb: i.notificationCb,
      onWsStateChange: i.onWsStateChange,
      onWsError: i.onWsError,
      onWsReconnectFailed: i.onWsReconnectFailed,
    }),
      (this.remoteUsers = new Map()),
      (this.remoteUserIdArray = new Array()),
      (this.remoteStreams = new Map()),
      (this.remoteStreamIdArray = new Array()),
      (this.subUserIdMap = new Map()),
      (this.state = new jt(this.options.logger)),
      (this.connectionStatus = ue.New));
  }
  var t, i, r, n;
  return (
    O(e, [
      {
        key: 'enter',
        value:
          ((n = T(
            A.mark(function e(t, i, r, n, o, s, a, c, u, d, l, h, p) {
              return A.wrap(
                function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        if (
                          ((this.loginParams = {
                            appId: i,
                            userId: n,
                            userType: o,
                            previousRoomId: s,
                            permission: a,
                            userData: c,
                            extendInfo: u,
                          }),
                          this.state.setState(Lt.Entering))
                        ) {
                          e.next = 3;
                          break;
                        }
                        return e.abrupt('return');
                      case 3:
                        return (
                          this.options.logger.info(
                            'Enter Room ' + this.options.roomId
                          ),
                          (this.roomCbs.enterRoomCb = l),
                          (e.next = 7),
                          this.initJsonRpcClient(t, i, r, n, d, u, h, p)
                        );
                      case 7:
                      case 'end':
                        return e.stop();
                    }
                },
                e,
                this
              );
            })
          )),
          function (e, t, i, r, o, s, a, c, u, d, l, h, p) {
            return n.apply(this, arguments);
          }),
      },
      {
        key: 'exit',
        value: function (e) {
          this.state.setState(Lt.Exiting) &&
            (this.options.logger.info('Exit Room ' + this.options.roomId),
            (this.isFirstLogin = !0),
            (this.roomCbs.exitRoomCb = e),
            this.login.logout());
        },
      },
      {
        key: 'publishStream',
        value: function (e, t, i, r, n, o) {
          if (this.state.state() == Lt.Entered)
            return this.localUser.publishStream(e, t, i, r, n, o);
          this.options.logger.info(
            'We are not enter room, can not publish stream'
          );
        },
      },
      {
        key: 'unpublishStream',
        value: function (e, t) {
          if (this.state.state() == Lt.Entered)
            return this.localUser.unpublishStream(e, t);
          this.options.logger.info(
            'We are not enter room, can not unpublish stream'
          );
        },
      },
      {
        key: 'updateSimulcast',
        value: function (e, t, i) {
          if (this.state.state() == Lt.Entered)
            return this.localUser.updateSimulcast(e, t, i);
          this.options.logger.info(
            'We arn not enter room, can not publish updateSimulcast'
          );
        },
      },
      {
        key: 'muteLocalAudio',
        value: function (e, t, i) {
          this.state.state() == Lt.Entered
            ? this.localUser.muteAudio(e, t, this.roomCbs.notificationCb, i)
            : this.options.logger.info(
                'We are not enter room, can not muteLocalAudio'
              );
        },
      },
      {
        key: 'muteLocalVideo',
        value: function (e, t, i) {
          this.state.state() == Lt.Entered
            ? this.localUser.muteVideo(e, t, this.roomCbs.notificationCb, i)
            : this.options.logger.info(
                'We are not enter room, can not muteLocalVideo'
              );
        },
      },
      {
        key: 'unmuteLocalAudio',
        value: function (e, t, i) {
          this.state.state() == Lt.Entered
            ? this.localUser.unmuteAudio(e, t, this.roomCbs.notificationCb, i)
            : this.options.logger.info(
                'We are not enter room, can not unmuteLocalAudio'
              );
        },
      },
      {
        key: 'unmuteLocalVideo',
        value: function (e, t, i) {
          this.state.state() == Lt.Entered
            ? this.localUser.unmuteVideo(e, t, this.roomCbs.notificationCb, i)
            : this.options.logger.info(
                'We are not enter room, can not unmuteLocalVideo'
              );
        },
      },
      {
        key: 'subscribeStream',
        value: function (e, t, i, r, n, o, s) {
          this.state.state() == Lt.Entered
            ? (this.options.logger.info(
                'room subscribe stream',
                this.remoteUsers.has(t)
              ),
              this.remoteUsers.has(t) &&
                (this.remoteUsers.get(t).subscribeStream(e, i, r, n, o, s),
                this.subUserIdMap.set(e, t)))
            : this.options.logger.info(
                'We are not enter room, can not subscribe stream'
              );
        },
      },
      {
        key: 'unsubscribeStream',
        value: function (e, t) {
          if (this.state.state() == Lt.Entered)
            if (
              (this.options.logger.debug('subUserIdMap', this.subUserIdMap, e),
              this.subUserIdMap.has(e))
            ) {
              var i = this.subUserIdMap.get(e);
              this.remoteUsers.has(i)
                ? (this.remoteUsers.get(i).unsubscribeStream(e, t),
                  this.subUserIdMap.delete(e))
                : this.options.logger.info(
                    'unsubscription: ' + e + '  no related user'
                  );
            } else
              this.options.logger.info(
                'unsubscription: ' + e + '  no related user'
              );
          else
            this.options.logger.info(
              'We are not enter room, can not unsubscribe stream'
            );
        },
      },
      {
        key: 'switchSimulcast',
        value: function (e, t, i) {
          if (this.state.state() == Lt.Entered)
            if (this.subUserIdMap.has(e)) {
              var r = this.subUserIdMap.get(e);
              this.remoteUsers.has(r) &&
                this.remoteUsers.get(r).switchSimulcast(e, t, i);
            } else
              this.options.logger.info('Subscription: ' + e + ' not exist');
          else
            this.options.logger.info(
              'We are not enter room, can not switchSimulcast'
            );
        },
      },
      {
        key: 'switchPermission',
        value: function (e, t) {
          var i = this;
          this.state.state() == Lt.Entered
            ? this.localUser.switchPermission(e, function (r, n, o) {
                (1 === r && i.login.updatePermission(e), t && t(r, n, o));
              })
            : this.options.logger.info(
                'We are not enter room, can not switchPermission'
              );
        },
      },
      {
        key: 'getWsState',
        value: function () {
          return this.rpcClient.getWsState();
        },
      },
      {
        key: 'onLogin',
        value: function (e, t, i) {
          if (e === Bt.LoginSuccess) {
            if (
              ((this.connectionStatus = ue.ConnectionConnected),
              !this.state.setState(Lt.Entered))
            )
              return;
            (this.options.logger.info(
              'Enter Room '.concat(this.options.roomId, ' success')
            ),
              this.roomCbs.enterRoomCb &&
                this.roomCbs.enterRoomCb(oe.Success, null, {
                  roomId: this.options.roomId,
                  roomUniqueId: t.room.roomUniqueId,
                  participants: t.room.participants,
                }));
            var r = this.buildRemoteUserAndCollectNotification(t, !1),
              n = this.buildRemoteStreamsAndCollectNotification(t, !1),
              o = setTimeout(function () {
                var e,
                  t = fi(r);
                try {
                  for (t.s(); !(e = t.n()).done; ) (0, e.value)();
                } catch (e) {
                  t.e(e);
                } finally {
                  t.f();
                }
                var i,
                  s = fi(n);
                try {
                  for (s.s(); !(i = s.n()).done; ) (0, i.value)();
                } catch (e) {
                  s.e(e);
                } finally {
                  s.f();
                }
                (o && clearTimeout(o), (o = null));
              }, 300);
          } else if (e === Bt.LoginTimeout) {
            if (!this.state.setState(Lt.EnterTimeout)) return;
            (this.options.logger.info(
              'Enter Room '.concat(this.options.roomId, ' timeout')
            ),
              this.roomCbs.enterRoomCb &&
                this.roomCbs.enterRoomCb(oe.Timeout, i, {
                  roomId: this.options.roomId,
                }));
          } else if (e === Bt.LoginFailed) {
            if (!this.state.setState(Lt.EnterFailed)) return;
            (this.options.logger.info(
              'Enter Room '.concat(this.options.roomId, ' failed')
            ),
              this.roomCbs.enterRoomCb &&
                this.roomCbs.enterRoomCb(oe.Failed, i, {
                  roomId: this.options.roomId,
                }));
          } else
            this.options.logger.error('Enter room result type is invalid!');
        },
      },
      {
        key: 'onRelogin',
        value:
          ((r = T(
            A.mark(function e(t, i, r) {
              var n,
                o,
                s,
                a,
                c,
                u,
                d,
                l,
                h,
                p,
                f,
                m,
                g,
                v,
                b,
                S,
                y,
                E,
                I,
                T,
                R,
                _,
                k,
                O;
              return A.wrap(
                function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        if (!t) {
                          e.next = 22;
                          break;
                        }
                        if (
                          ((this.connectionStatus = ue.ConnectionRecovery),
                          this.options.logger.info('onRelogin:', t, i, r),
                          (n = this.buildRemoteUserAndCollectNotification(
                            r,
                            !0
                          )),
                          (o = this.buildRemoteStreamsAndCollectNotification(
                            r,
                            !0
                          )),
                          (s = r.room.roomUniqueId),
                          (a = null),
                          !this.roomCbs.connectionRecoveryCb)
                        ) {
                          e.next = 16;
                          break;
                        }
                        return (
                          (e.next = 10),
                          this.roomCbs.connectionRecoveryCb(
                            this.options.roomId,
                            s,
                            i
                          )
                        );
                      case 10:
                        (this.localUser.onConnectionRecovery(
                          i,
                          null === (c = a = e.sent) || void 0 === c
                            ? void 0
                            : c.publishOfferSdp
                        ),
                          (u = new Map(this.subUserIdMap)),
                          this.options.logger.info('subUserIdMap', u, a),
                          (d = fi(u)));
                        try {
                          for (d.s(); !(l = d.n()).done; )
                            ((f = C(l.value, 2)),
                              (m = f[0]),
                              (g = f[1]),
                              null !== (h = a) &&
                                void 0 !== h &&
                                null !== (p = h.subscribeOfferSdp) &&
                                void 0 !== p &&
                                p.has(m) &&
                                ((y =
                                  null === (v = a) ||
                                  void 0 === v ||
                                  null === (b = v.subscribeOfferSdp) ||
                                  void 0 === b ||
                                  null === (S = b.get(m)) ||
                                  void 0 === S
                                    ? void 0
                                    : S.subId),
                                this.subUserIdMap.delete(m),
                                this.subUserIdMap.set(y, g)));
                        } catch (e) {
                          d.e(e);
                        } finally {
                          d.f();
                        }
                      case 16:
                        E = fi(this.remoteUsers.values());
                        try {
                          for (E.s(); !(I = E.n()).done; )
                            I.value.onConnectionRecovery(
                              i,
                              null === (T = a) || void 0 === T
                                ? void 0
                                : T.subscribeOfferSdp
                            );
                        } catch (e) {
                          E.e(e);
                        } finally {
                          E.f();
                        }
                        R = fi(n);
                        try {
                          for (R.s(); !(_ = R.n()).done; ) (0, _.value)();
                        } catch (e) {
                          R.e(e);
                        } finally {
                          R.f();
                        }
                        k = fi(o);
                        try {
                          for (k.s(); !(O = k.n()).done; ) (0, O.value)();
                        } catch (e) {
                          k.e(e);
                        } finally {
                          k.f();
                        }
                      case 22:
                      case 'end':
                        return e.stop();
                    }
                },
                e,
                this
              );
            })
          )),
          function (e, t, i) {
            return r.apply(this, arguments);
          }),
      },
      {
        key: 'onLogout',
        value: function (e, t) {
          if (e === Wt.LogoutSuccess) {
            if (!this.state.setState(Lt.Exited)) return;
            (this.options.logger.info(
              'Exit Room ' + this.options.roomId + ' success'
            ),
              this.roomCbs.exitRoomCb &&
                this.roomCbs.exitRoomCb(oe.Success, null, {
                  roomId: this.options.roomId,
                  reason: se.ActivelyLeave,
                }),
              this.rpcClient &&
                (this.rpcClient.close(), (this.rpcClient = null)));
          } else if (e === Wt.LogoutFailed) {
            if (!this.state.setState(Lt.ExitFailed)) return;
            (this.roomCbs.exitRoomCb &&
              (this.options.logger.info('exit room failed'),
              this.roomCbs.exitRoomCb(oe.Failed, t, {
                roomId: this.options.roomId,
                reason: se.ActivelyLeave,
              })),
              this.rpcClient &&
                (this.rpcClient.close(), (this.rpcClient = null)));
          } else if (e === Wt.LogoutTimeout) {
            if (!this.state.setState(Lt.ExitTimeout)) return;
            (this.options.logger.info(
              'Exit Room ' + this.options.roomId + ' timeout'
            ),
              this.roomCbs.exitRoomCb &&
                (this.options.logger.info('exit room timeout'),
                this.roomCbs.exitRoomCb(oe.Failed, t, {
                  roomId: this.options.roomId,
                  reason: se.ActivelyLeave,
                })),
              this.rpcClient &&
                (this.rpcClient.close(), (this.rpcClient = null)));
          } else this.options.logger.error('Exit room result type is invalid!');
        },
      },
      {
        key: 'onNotification',
        value: function (e) {
          this.options.logger.info(
            'room: ' + this.options.roomId + ' receive notification message'
          );
          var t,
            i = e.method;
          if (i)
            if ('participant' === i) {
              var r = e.params.type;
              if ('join' === r) {
                var n = e.params,
                  o = {
                    participant: {
                      userId: n.userId,
                      previousRoomId: n.previousRoomId,
                      userData: n.userData,
                    },
                  };
                (this.buildRemoteUser(o.participant),
                  this.roomCbs.notificationCb &&
                    (this.options.logger.info(
                      'user: ' + o.participant.userId + 'join notification'
                    ),
                    this.roomCbs.notificationCb(
                      this.options.roomId,
                      de.ParticipantJoin,
                      o
                    )));
              } else if ('leave' === r) {
                var s = e.params,
                  a = { userId: s.userId, reason: s.reason };
                (this.remoteUsers.has(a.userId) &&
                  this.deleteRemoteUser(a.userId),
                  this.roomCbs.notificationCb &&
                    (this.options.logger.info(
                      'user: ' + a.userId + ' leave notification',
                      this.remoteStreams,
                      this.remoteUsers,
                      this.remoteStreamIdArray
                    ),
                    this.roomCbs.notificationCb(
                      this.options.roomId,
                      de.ParticipantLeave,
                      a
                    )));
              } else
                this.options.logger.error(
                  'participant notification type error!!!'
                );
            } else if ('stream' === i) {
              var c = e.params.type;
              if ('add' === c) {
                var u = { stream: Nt(e.params) };
                (this.options.logger.info(
                  'room-add ',
                  this.remoteStreams,
                  this.remoteUsers,
                  u
                ),
                  this.remoteUsers.has(u.stream.userId) &&
                    !this.remoteStreams.has(u.stream.streamId) &&
                    (this.buildRemoteStream(u.stream),
                    this.roomCbs.notificationCb &&
                      (this.options.logger.info(
                        'user: ' +
                          u.stream.userId +
                          ', stream ' +
                          u.stream.streamId +
                          ' add notification'
                      ),
                      this.roomCbs.notificationCb(
                        this.options.roomId,
                        de.StreamAdd,
                        u
                      ))));
              } else if ('remove' === c) {
                var d = e.params,
                  l = { userId: d.userId, streamId: d.streamId };
                this.remoteStreams.has(l.streamId) &&
                  (this.deleteRemoteStream(l.streamId),
                  this.options.logger.info(
                    'room-remove ',
                    this.remoteStreams,
                    this.remoteUsers,
                    l
                  ),
                  this.roomCbs.notificationCb &&
                    (this.options.logger.info(
                      'user: ' +
                        l.userId +
                        ', stream ' +
                        l.streamId +
                        ' remove notification'
                    ),
                    this.roomCbs.notificationCb(
                      this.options.roomId,
                      de.StreamRemove,
                      l
                    )));
              } else if ('update' === c) {
                var h = e.params,
                  p = {
                    userId: h.userId,
                    streamId: h.streamId,
                    liveStatus: h.data.liveStatus,
                    userData: h.userData,
                  };
                (h.data.simulcast &&
                  this.remoteStreams.has(p.streamId) &&
                  ((p.simulcast = Mt(h.data.simulcast)),
                  (this.remoteStreams.get(p.streamId).info.video.simulcast =
                    p.simulcast),
                  this.remoteUsers
                    .get(p.userId)
                    .updateStreamSimulcast(p.streamId, p.simulcast)),
                  h.data.liveStatus &&
                    ((p.liveStatus = h.data.liveStatus),
                    this.remoteStreams.has(p.streamId) &&
                      (p.liveStatus.audio &&
                        (this.remoteStreams.get(p.streamId).info.audio.muted =
                          p.liveStatus.audio.muted),
                      p.liveStatus.video &&
                        (this.remoteStreams.get(p.streamId).info.video.muted =
                          p.liveStatus.video.muted),
                      this.remoteUsers
                        .get(p.userId)
                        .updateStreamStatus(p.streamId, p.liveStatus))),
                  this.roomCbs.notificationCb &&
                    (this.options.logger.info(
                      'user: ' +
                        p.userId +
                        ', stream ' +
                        p.streamId +
                        ' update notification'
                    ),
                    this.roomCbs.notificationCb(
                      this.options.roomId,
                      de.StreamUpdate,
                      p
                    )));
              } else
                this.options.logger.error('Stream notification type error!!!');
            } else if ('drop' === i) {
              var f = {
                cause:
                  ((t = e.params.cause),
                  'kicked' == t
                    ? ce.Kicked
                    : 'repeatlogin' == t
                      ? ce.RepeatLogin
                      : 'disbanded' == t
                        ? ce.RoomDissolved
                        : ce.Unknown),
              };
              if (!this.state.setState(Lt.Destroyed)) return;
              (this.roomCbs.notificationCb &&
                (this.options.logger.info('drop notification'),
                this.roomCbs.notificationCb(this.options.roomId, de.Drop, f)),
                this.rpcClient &&
                  (this.rpcClient.close(), (this.rpcClient = null)));
            } else if ('permission' === i) {
              var m = e.params,
                g = {
                  userId: m.userId,
                  publish: m.publish,
                  subscribe: m.subscribe,
                  control: m.control,
                };
              this.roomCbs.notificationCb &&
                (this.options.logger.info('permission change notification'),
                this.roomCbs.notificationCb(
                  this.options.roomId,
                  de.PermissionChange,
                  g
                ));
              var v = g.publish && (g.publish.audio || g.publish.video);
              if (this.remoteUsers.has(g.userId)) {
                if (!v) {
                  this.deleteRemoteUser(g.userId);
                  var b = { userId: g.userId, reason: ae.Normal };
                  this.roomCbs.notificationCb &&
                    (this.options.logger.info(
                      'user: ' + b.userId + 'leave notification'
                    ),
                    this.roomCbs.notificationCb(
                      this.options.roomId,
                      de.ParticipantLeave,
                      b
                    ));
                }
              } else if (v) {
                var S = {
                  userId: g.userId,
                  previousRoomId: '',
                  userData: { userId: g.userId, userName: '' },
                };
                (this.buildRemoteUser(S),
                  this.roomCbs.notificationCb &&
                    (this.options.logger.info(
                      'user: ' + S.userId + 'join notification'
                    ),
                    this.roomCbs.notificationCb(
                      this.options.roomId,
                      de.ParticipantJoin,
                      { participant: S }
                    )));
              }
            }
        },
      },
      {
        key: 'onRpcStateChange',
        value: function (e, t, i) {
          (this.options.logger.info(
            'prevState: '.concat(e, ',state: ').concat(t)
          ),
            'DISCONNECTED' === t
              ? this.onConnectionLost()
              : 'RECONNECTING' === t && this.onTryToReconenct(),
            this.roomCbs.onWsStateChange &&
              this.roomCbs.onWsStateChange(this.options.roomId, e, t));
        },
      },
      {
        key: 'onConnectionLost',
        value: function () {
          (this.options.logger.info(
            'room: ' + this.options.roomId + ' connection lost!!!'
          ),
            (this.connectionStatus = ue.ConnectionLost));
          var e,
            t = fi(this.remoteUsers.values());
          try {
            for (t.s(); !(e = t.n()).done; ) e.value.onConnectionLost();
          } catch (e) {
            t.e(e);
          } finally {
            t.f();
          }
          (this.roomCbs.connectionLostCb &&
            this.roomCbs.connectionLostCb(this.options.roomId),
            this.rpcClient.reconnect());
        },
      },
      {
        key: 'onTryToReconenct',
        value: function () {
          (this.options.logger.info(
            'room: ' + this.options.roomId + ' connection retring ......'
          ),
            (this.connectionStatus = ue.ConnectionRetring),
            this.roomCbs.tryToReconnectCb &&
              this.roomCbs.tryToReconnectCb(this.options.roomId));
        },
      },
      {
        key: 'onConnectionRecovery',
        value: function () {
          (this.options.logger.info(
            'room: '.concat(this.options.roomId, ' connection recovery!!!')
          ),
            this.state.state() != Lt.Entering &&
              this.login.onConnectionRecovery());
        },
      },
      {
        key: 'onRpcReconnectFailed',
        value: function () {
          (this.options.logger.info(
            'room: ' + this.options.roomId + ' reconnection failed!!!'
          ),
            this.roomCbs.onWsReconnectFailed &&
              this.roomCbs.onWsReconnectFailed(this.options.roomId));
        },
      },
      {
        key: 'initJsonRpcClient',
        value:
          ((i = T(
            A.mark(function e(t, i, r, n, o, s, a, c) {
              var u;
              return A.wrap(
                function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        return (
                          (u = {
                            onCustomSignParam: t,
                            appId: i,
                            userSig: r,
                            userId: n,
                            privateKey: o,
                            extendInfo: s,
                            wsUrl: this.options.serverUrl,
                            ssl: a,
                            roomId: c,
                            onRequest: null,
                            onNotification: this.onNotification.bind(this),
                            onError: this.roomCbs.onWsError,
                            onConnect: this.initLoginAndLocalUser.bind(this),
                            onWsStateChange: this.onRpcStateChange.bind(this),
                            onWsReconnectFailed:
                              this.onRpcReconnectFailed.bind(this),
                          }),
                          (this.rpcClient = new pi(u, this.options.logger)),
                          (e.next = 4),
                          this.rpcClient.connect()
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
          )),
          function (e, t, r, n, o, s, a, c) {
            return i.apply(this, arguments);
          }),
      },
      {
        key: 'initLoginAndLocalUser',
        value:
          ((t = T(
            A.mark(function e() {
              var t, i, r, n, o, s, a, c, u, d;
              return A.wrap(
                function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        if (this.isFirstLogin) {
                          e.next = 2;
                          break;
                        }
                        return e.abrupt('return', this.onConnectionRecovery());
                      case 2:
                        return (
                          (this.isFirstLogin = !1),
                          (i = (t = this.loginParams).appId),
                          (r = t.userId),
                          (n = t.userType),
                          (o = t.previousRoomId),
                          (s = t.permission),
                          (a = t.userData),
                          (c = t.extendInfo),
                          (e.next = 6),
                          new Promise(
                            (function () {
                              var e = T(
                                A.mark(function e(t) {
                                  var i;
                                  return A.wrap(
                                    function (e) {
                                      for (;;)
                                        switch ((e.prev = e.next)) {
                                          case 0:
                                            return (
                                              (i = {
                                                sdk: {
                                                  type: 'WebRTC',
                                                  version: '5.2024.5.0_00',
                                                },
                                                device: {
                                                  osName: '',
                                                  osVersion: ''
                                                    .concat(Ce, '/')
                                                    .concat(Ie),
                                                  netType: $(),
                                                },
                                                capabilities: {
                                                  isp: 'unknown',
                                                  location: 'unknown',
                                                  trikleIce: !1,
                                                  secure: !0,
                                                },
                                              }),
                                              (e.prev = 1),
                                              (e.next = 4),
                                              new Promise(
                                                (function () {
                                                  var e = T(
                                                    A.mark(function e(t, i) {
                                                      return A.wrap(
                                                        function (e) {
                                                          for (;;)
                                                            switch (
                                                              (e.prev = e.next)
                                                            ) {
                                                              case 0:
                                                                if (
                                                                  ((e.prev = 0),
                                                                  !Z.any())
                                                                ) {
                                                                  e.next = 5;
                                                                  break;
                                                                }
                                                                (t(
                                                                  Z.getOsName()
                                                                ),
                                                                  (e.next = 9));
                                                                break;
                                                              case 5:
                                                                return (
                                                                  (e.next = 7),
                                                                  new Promise(
                                                                    (function () {
                                                                      var e = T(
                                                                        A.mark(
                                                                          function e(
                                                                            t,
                                                                            i
                                                                          ) {
                                                                            var r,
                                                                              n,
                                                                              o,
                                                                              s,
                                                                              a,
                                                                              c,
                                                                              u,
                                                                              d;
                                                                            return A.wrap(
                                                                              function (
                                                                                e
                                                                              ) {
                                                                                for (;;)
                                                                                  switch (
                                                                                    (e.prev =
                                                                                      e.next)
                                                                                  ) {
                                                                                    case 0:
                                                                                      ((r =
                                                                                        '-'),
                                                                                        (n =
                                                                                          navigator.appVersion),
                                                                                        (o =
                                                                                          navigator.userAgent),
                                                                                        (s =
                                                                                          r),
                                                                                        (a =
                                                                                          [
                                                                                            {
                                                                                              s: 'Chrome OS',
                                                                                              r: /CrOS/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Windows 10',
                                                                                              r: /(Windows 10.0|Windows NT 10.0)/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Windows 8.1',
                                                                                              r: /(Windows 8.1|Windows NT 6.3)/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Windows 8',
                                                                                              r: /(Windows 8|Windows NT 6.2)/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Windows 7',
                                                                                              r: /(Windows 7|Windows NT 6.1)/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Windows Vista',
                                                                                              r: /Windows NT 6.0/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Windows Server 2003',
                                                                                              r: /Windows NT 5.2/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Windows XP',
                                                                                              r: /(Windows NT 5.1|Windows XP)/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Windows 2000',
                                                                                              r: /(Windows NT 5.0|Windows 2000)/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Windows ME',
                                                                                              r: /(Win 9x 4.90|Windows ME)/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Windows 98',
                                                                                              r: /(Windows 98|Win98)/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Windows 95',
                                                                                              r: /(Windows 95|Win95|Windows_95)/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Windows NT 4.0',
                                                                                              r: /(Windows NT 4.0|WinNT4.0|WinNT|Windows NT)/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Windows CE',
                                                                                              r: /Windows CE/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Windows 3.11',
                                                                                              r: /Win16/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Android',
                                                                                              r: /Android/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Open BSD',
                                                                                              r: /OpenBSD/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Sun OS',
                                                                                              r: /SunOS/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Linux',
                                                                                              r: /(Linux|X11)/,
                                                                                            },
                                                                                            {
                                                                                              s: 'iOS',
                                                                                              r: /(iPhone|iPad|iPod)/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Mac OS X',
                                                                                              r: /Mac OS X/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Mac OS',
                                                                                              r: /(MacPPC|MacIntel|Mac_PowerPC|Macintosh)/,
                                                                                            },
                                                                                            {
                                                                                              s: 'QNX',
                                                                                              r: /QNX/,
                                                                                            },
                                                                                            {
                                                                                              s: 'UNIX',
                                                                                              r: /UNIX/,
                                                                                            },
                                                                                            {
                                                                                              s: 'BeOS',
                                                                                              r: /BeOS/,
                                                                                            },
                                                                                            {
                                                                                              s: 'OS/2',
                                                                                              r: /OS\/2/,
                                                                                            },
                                                                                            {
                                                                                              s: 'Search Bot',
                                                                                              r: /(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/,
                                                                                            },
                                                                                          ]),
                                                                                        (c = 0));
                                                                                    case 6:
                                                                                      if (
                                                                                        !(u =
                                                                                          a[
                                                                                            c
                                                                                          ])
                                                                                      ) {
                                                                                        e.next = 13;
                                                                                        break;
                                                                                      }
                                                                                      if (
                                                                                        !u.r.test(
                                                                                          o
                                                                                        )
                                                                                      ) {
                                                                                        e.next = 10;
                                                                                        break;
                                                                                      }
                                                                                      return (
                                                                                        (s =
                                                                                          u.s),
                                                                                        e.abrupt(
                                                                                          'break',
                                                                                          13
                                                                                        )
                                                                                      );
                                                                                    case 10:
                                                                                      (c++,
                                                                                        (e.next = 6));
                                                                                      break;
                                                                                    case 13:
                                                                                      if (
                                                                                        ((d =
                                                                                          r),
                                                                                        !/Windows/.test(
                                                                                          s
                                                                                        ))
                                                                                      ) {
                                                                                        e.next = 28;
                                                                                        break;
                                                                                      }
                                                                                      if (
                                                                                        !/Windows (.*)/.test(
                                                                                          s
                                                                                        )
                                                                                      ) {
                                                                                        e.next = 27;
                                                                                        break;
                                                                                      }
                                                                                      if (
                                                                                        10 !=
                                                                                        (d =
                                                                                          /Windows (.*)/.exec(
                                                                                            s
                                                                                          )[1])
                                                                                      ) {
                                                                                        e.next = 27;
                                                                                        break;
                                                                                      }
                                                                                      return (
                                                                                        (e.prev = 18),
                                                                                        (e.next = 21),
                                                                                        new Promise(
                                                                                          function (
                                                                                            e
                                                                                          ) {
                                                                                            navigator &&
                                                                                            navigator.userAgentData &&
                                                                                            navigator
                                                                                              .userAgentData
                                                                                              .getHighEntropyValues
                                                                                              ? navigator.userAgentData
                                                                                                  .getHighEntropyValues(
                                                                                                    [
                                                                                                      'platformVersion',
                                                                                                    ]
                                                                                                  )
                                                                                                  .then(
                                                                                                    function (
                                                                                                      t
                                                                                                    ) {
                                                                                                      if (
                                                                                                        navigator
                                                                                                          .userAgentData
                                                                                                          .platform &&
                                                                                                        'windows' ===
                                                                                                          navigator.userAgentData.platform.toLowerCase() &&
                                                                                                        t.platformVersion
                                                                                                      ) {
                                                                                                        var i =
                                                                                                          parseInt(
                                                                                                            t.platformVersion.split(
                                                                                                              '.'
                                                                                                            )[0]
                                                                                                          );
                                                                                                        e(
                                                                                                          i >=
                                                                                                            13
                                                                                                            ? 11
                                                                                                            : 10
                                                                                                        );
                                                                                                      } else
                                                                                                        e(
                                                                                                          10
                                                                                                        );
                                                                                                    }
                                                                                                  )
                                                                                                  .catch(
                                                                                                    function () {
                                                                                                      e(
                                                                                                        10
                                                                                                      );
                                                                                                    }
                                                                                                  )
                                                                                              : e(
                                                                                                  10
                                                                                                );
                                                                                          }
                                                                                        )
                                                                                      );
                                                                                    case 21:
                                                                                      ((d =
                                                                                        e.sent),
                                                                                        (e.next = 27));
                                                                                      break;
                                                                                    case 24:
                                                                                      ((e.prev = 24),
                                                                                        (e.t0 =
                                                                                          e.catch(
                                                                                            18
                                                                                          )),
                                                                                        (d = 10));
                                                                                    case 27:
                                                                                      s =
                                                                                        'Windows';
                                                                                    case 28:
                                                                                      ((e.t1 =
                                                                                        s),
                                                                                        (e.next =
                                                                                          'Mac OS X' ===
                                                                                          e.t1
                                                                                            ? 31
                                                                                            : 'Android' ===
                                                                                                e.t1
                                                                                              ? 33
                                                                                              : 'iOS' ===
                                                                                                  e.t1
                                                                                                ? 35
                                                                                                : 37));
                                                                                      break;
                                                                                    case 31:
                                                                                      return (
                                                                                        /Mac OS X (10[/._\d]+)/.test(
                                                                                          o
                                                                                        ) &&
                                                                                          (d =
                                                                                            /Mac OS X (10[\.\_\d]+)/.exec(
                                                                                              o
                                                                                            )[1]),
                                                                                        e.abrupt(
                                                                                          'break',
                                                                                          37
                                                                                        )
                                                                                      );
                                                                                    case 33:
                                                                                      return (
                                                                                        /Android ([\.\_\d]+)/.test(
                                                                                          o
                                                                                        ) &&
                                                                                          (d =
                                                                                            /Android ([\.\_\d]+)/.exec(
                                                                                              o
                                                                                            )[1]),
                                                                                        e.abrupt(
                                                                                          'break',
                                                                                          37
                                                                                        )
                                                                                      );
                                                                                    case 35:
                                                                                      return (
                                                                                        /OS (\d+)_(\d+)_?(\d+)?/.test(
                                                                                          o
                                                                                        ) &&
                                                                                          (d =
                                                                                            (d =
                                                                                              /OS (\d+)_(\d+)_?(\d+)?/.exec(
                                                                                                n
                                                                                              ))[1] +
                                                                                            '.' +
                                                                                            d[2] +
                                                                                            '.' +
                                                                                            (0 |
                                                                                              d[3])),
                                                                                        e.abrupt(
                                                                                          'break',
                                                                                          37
                                                                                        )
                                                                                      );
                                                                                    case 37:
                                                                                      t(
                                                                                        {
                                                                                          osName:
                                                                                            s +
                                                                                            d,
                                                                                          type: 'desktop',
                                                                                        }
                                                                                      );
                                                                                    case 38:
                                                                                    case 'end':
                                                                                      return e.stop();
                                                                                  }
                                                                              },
                                                                              e,
                                                                              null,
                                                                              [
                                                                                [
                                                                                  18,
                                                                                  24,
                                                                                ],
                                                                              ]
                                                                            );
                                                                          }
                                                                        )
                                                                      );
                                                                      return function (
                                                                        t,
                                                                        i
                                                                      ) {
                                                                        return e.apply(
                                                                          this,
                                                                          arguments
                                                                        );
                                                                      };
                                                                    })()
                                                                  )
                                                                );
                                                              case 7:
                                                                t(e.sent);
                                                              case 9:
                                                                e.next = 14;
                                                                break;
                                                              case 11:
                                                                ((e.prev = 11),
                                                                  (e.t0 =
                                                                    e.catch(0)),
                                                                  i(e.t0));
                                                              case 14:
                                                              case 'end':
                                                                return e.stop();
                                                            }
                                                        },
                                                        e,
                                                        null,
                                                        [[0, 11]]
                                                      );
                                                    })
                                                  );
                                                  return function (t, i) {
                                                    return e.apply(
                                                      this,
                                                      arguments
                                                    );
                                                  };
                                                })()
                                              )
                                            );
                                          case 4:
                                            ((i.device.osName = e.sent.osName),
                                              t(i),
                                              (e.next = 12));
                                            break;
                                          case 9:
                                            ((e.prev = 9),
                                              (e.t0 = e.catch(1)),
                                              t(i));
                                          case 12:
                                          case 'end':
                                            return e.stop();
                                        }
                                    },
                                    e,
                                    null,
                                    [[1, 9]]
                                  );
                                })
                              );
                              return function (t) {
                                return e.apply(this, arguments);
                              };
                            })()
                          )
                        );
                      case 6:
                        ((u = e.sent),
                          c &&
                            c.location &&
                            (u.capabilities.location = c.location),
                          (d = {
                            appId: i,
                            userId: r,
                            userType: n,
                            roomId: this.options.roomId,
                            previousRoomId: o,
                            userAgent: u,
                            permission: s,
                            userData: a,
                            rpcClient: this.rpcClient,
                            logger: this.options.logger,
                            loginCb: this.onLogin.bind(this),
                            reloginCb: this.onRelogin.bind(this),
                            logoutCb: this.onLogout.bind(this),
                          }),
                          (this.login = new zt(d)),
                          (this.localUser = new ri({
                            userId: r,
                            roomId: this.options.roomId,
                            previousRoomId: o,
                            userAgent: d.userAgent,
                            permission: s,
                            userData: a,
                            rpcClient: this.rpcClient,
                            logger: this.options.logger,
                          })),
                          this.login.login());
                      case 13:
                      case 'end':
                        return e.stop();
                    }
                },
                e,
                this
              );
            })
          )),
          function () {
            return t.apply(this, arguments);
          }),
      },
      {
        key: 'buildRemoteUser',
        value: function (e) {
          var t = e.userId,
            i = new hi({
              roomId: this.options.roomId,
              participant: e,
              rpcClient: this.rpcClient,
              logger: this.options.logger,
            });
          (this.remoteUsers.set(t, i),
            this.remoteUserIdArray.push(t),
            this.options.logger.info(
              'this.remoteUsers',
              JSON.stringify(this.remoteUsers, null, 4)
            ));
        },
      },
      {
        key: 'deleteRemoteStream',
        value: function (e) {
          if (
            (this.options.logger.info('delete-streamId', e, this.remoteStreams),
            this.remoteStreams.has(e))
          ) {
            var t = this.remoteStreams.get(e).userId;
            (this.remoteUsers.has(t) && this.remoteUsers.get(t).deleteStream(e),
              this.remoteStreams.delete(e));
            var i = this.remoteStreamIdArray.indexOf(e);
            -1 != i && this.remoteStreamIdArray.splice(i, 1);
          }
        },
      },
      {
        key: 'deleteRemoteUser',
        value: function (e) {
          if (this.remoteUsers.has(e)) {
            var t,
              i = fi(
                JSON.parse(
                  JSON.stringify(this.remoteUsers.get(e).getAllStreamId())
                )
              );
            try {
              for (i.s(); !(t = i.n()).done; ) this.deleteRemoteStream(t.value);
            } catch (e) {
              i.e(e);
            } finally {
              i.f();
            }
            this.remoteUsers.delete(e);
            var r = this.remoteUserIdArray.indexOf(e);
            -1 != r && this.remoteUserIdArray.splice(r, 1);
          }
        },
      },
      {
        key: 'buildRemoteStream',
        value: function (e) {
          var t = e.streamId;
          (this.remoteUsers.get(e.userId).addStream(e),
            this.remoteStreams.set(t, e),
            this.remoteStreamIdArray.push(t));
        },
      },
      {
        key: 'buildRemoteUserAndCollectNotification',
        value: function (e, t) {
          var i = this,
            r = new Array();
          if (t) {
            var n,
              o = fi(e.room.participants);
            try {
              var s = function () {
                var e = n.value,
                  t = { participant: e },
                  o = e.userId;
                if (o === i.localUser.getUserId()) return 'continue';
                i.remoteUsers.has(o) ||
                  (i.buildRemoteUser(e),
                  r.push(function () {
                    i.roomCbs.notificationCb &&
                      (i.options.logger.info(
                        'user: ' + t.participant.userId + 'join notification'
                      ),
                      i.roomCbs.notificationCb(
                        i.options.roomId,
                        de.ParticipantJoin,
                        t
                      ));
                  }));
              };
              for (o.s(); !(n = o.n()).done; ) s();
            } catch (e) {
              o.e(e);
            } finally {
              o.f();
            }
            var a,
              c = fi(JSON.parse(JSON.stringify(this.remoteUserIdArray)));
            try {
              for (c.s(); !(a = c.n()).done; ) {
                var u,
                  d = a.value,
                  l = !0,
                  h = fi(e.room.participants);
                try {
                  for (h.s(); !(u = h.n()).done; )
                    u.value.userId === d && (l = !1);
                } catch (e) {
                  h.e(e);
                } finally {
                  h.f();
                }
                if (l) {
                  this.deleteRemoteUser(d);
                  var p = { userId: d, reason: ae.Normal };
                  this.roomCbs.notificationCb &&
                    (this.options.logger.info(
                      'user: ' + p.userId + 'leave notification'
                    ),
                    this.roomCbs.notificationCb(
                      this.options.roomId,
                      de.ParticipantLeave,
                      p
                    ));
                }
              }
            } catch (e) {
              c.e(e);
            } finally {
              c.f();
            }
          } else {
            var f,
              m = fi(e.room.participants);
            try {
              var g = function () {
                var e = f.value,
                  t = { participant: e };
                if (e.userId === i.localUser.getUserId()) return 'continue';
                (i.buildRemoteUser(e),
                  r.push(function () {
                    i.roomCbs.notificationCb &&
                      (i.options.logger.info(
                        'user: '.concat(
                          t.participant.userId,
                          ' join notification'
                        )
                      ),
                      i.roomCbs.notificationCb(
                        i.options.roomId,
                        de.ParticipantJoin,
                        t
                      ));
                  }));
              };
              for (m.s(); !(f = m.n()).done; ) g();
            } catch (e) {
              m.e(e);
            } finally {
              m.f();
            }
          }
          return r;
        },
      },
      {
        key: 'buildRemoteStreamsAndCollectNotification',
        value: function (e, t) {
          var i = this,
            r = new Array();
          if (t) {
            var n,
              o = fi(JSON.parse(JSON.stringify(this.remoteStreamIdArray)));
            try {
              for (o.s(); !(n = o.n()).done; ) {
                var s,
                  a = n.value,
                  c = !0,
                  u = fi(e.room.streams);
                try {
                  for (u.s(); !(s = u.n()).done; )
                    s.value.streamId === a && (c = !1);
                } catch (e) {
                  u.e(e);
                } finally {
                  u.f();
                }
                if (c && this.remoteStreams.has(a)) {
                  var d = this.remoteStreams.get(a).userId;
                  this.deleteRemoteStream(a);
                  var l = { userId: d, streamId: a };
                  this.roomCbs.notificationCb &&
                    (this.options.logger.info(
                      'user: ' +
                        l.userId +
                        ', stream ' +
                        l.streamId +
                        ' remove notification'
                    ),
                    this.roomCbs.notificationCb(
                      this.options.roomId,
                      de.StreamRemove,
                      l
                    ));
                }
              }
            } catch (e) {
              o.e(e);
            } finally {
              o.f();
            }
            var h,
              p = fi(e.room.streams);
            try {
              var f = function () {
                var e = h.value,
                  t = { stream: Ut(e) },
                  n = e.userId,
                  o = e.streamId;
                if (n === i.localUser.getUserId()) return 'continue';
                if (i.remoteStreams.has(o)) {
                  if (
                    e.info.audio &&
                    e.info.audio.muted !=
                      i.remoteStreams.get(o).info.audio.muted
                  ) {
                    var s = {
                      audio: {
                        muted: e.info.audio.muted,
                        floor: e.info.audio.floor,
                      },
                    };
                    ((i.remoteStreams.get(o).info.audio.muted =
                      e.info.audio.muted),
                      (i.remoteStreams.get(o).info.audio.floor =
                        e.info.audio.floor),
                      i.remoteUsers.get(n).updateStreamStatus(o, s));
                    var a = { userId: n, streamId: o, liveStatus: s };
                    r.push(function () {
                      i.roomCbs.notificationCb &&
                        (i.options.logger.info(
                          'user: ' +
                            n +
                            ', stream ' +
                            o +
                            ' update notification'
                        ),
                        i.roomCbs.notificationCb(
                          i.options.roomId,
                          de.StreamUpdate,
                          a
                        ));
                    });
                  }
                  if (
                    e.info.video &&
                    e.info.video.muted !=
                      i.remoteStreams.get(o).info.video.muted
                  ) {
                    var c = {
                      video: {
                        muted: e.info.video.muted,
                        floor: e.info.video.floor,
                      },
                    };
                    ((i.remoteStreams.get(o).info.video.muted =
                      e.info.video.muted),
                      (i.remoteStreams.get(o).info.video.floor =
                        e.info.video.floor),
                      i.remoteUsers.get(n).updateStreamStatus(o, c));
                    var u = { userId: n, streamId: o, liveStatus: c };
                    r.push(function () {
                      i.roomCbs.notificationCb &&
                        (i.options.logger.info(
                          'user: ' +
                            n +
                            ', stream ' +
                            o +
                            ' update notification'
                        ),
                        i.roomCbs.notificationCb(
                          i.options.roomId,
                          de.StreamUpdate,
                          u
                        ));
                    });
                  }
                  if (
                    e.info.video &&
                    e.info.video.simulcast &&
                    e.info.video.simulcast.length !=
                      i.remoteStreams.get(o).info.video.simulcast.length
                  ) {
                    var d = Mt(e.info.video.simulcast);
                    ((i.remoteStreams.get(o).info.video.simulcast = d),
                      i.remoteUsers.get(n).updateStreamSimulcast(o, d));
                    var l = { userId: n, streamId: o, simulcast: d };
                    r.push(function () {
                      i.roomCbs.notificationCb &&
                        (i.options.logger.info(
                          'user: ' +
                            n +
                            ', stream ' +
                            o +
                            ' update notification'
                        ),
                        i.roomCbs.notificationCb(
                          i.options.roomId,
                          de.StreamUpdate,
                          l
                        ));
                    });
                  }
                } else {
                  if (!i.remoteUsers.has(n))
                    return (
                      i.options.logger.error(
                        'Stream ' + o + ' no related user!'
                      ),
                      { v: r }
                    );
                  (i.buildRemoteStream(t.stream),
                    r.push(function () {
                      i.roomCbs.notificationCb &&
                        (i.options.logger.info(
                          'user: ' + n + ', stream ' + o + ' add notification'
                        ),
                        i.roomCbs.notificationCb(
                          i.options.roomId,
                          de.StreamAdd,
                          t
                        ));
                    }));
                }
              };
              for (p.s(); !(h = p.n()).done; ) {
                var m = f();
                if ('continue' !== m && 'object' === G(m)) return m.v;
              }
            } catch (e) {
              p.e(e);
            } finally {
              p.f();
            }
          } else {
            var g,
              v = fi(e.room.streams);
            try {
              var b = function () {
                var e = g.value,
                  t = { stream: Ut(e) },
                  n = e.userId,
                  o = e.streamId;
                return n === i.localUser.getUserId()
                  ? 'continue'
                  : i.remoteUsers.has(n)
                    ? (i.buildRemoteStream(t.stream),
                      void r.push(function () {
                        i.roomCbs.notificationCb &&
                          (i.options.logger.info(
                            'user: ' + n + ', stream ' + o + ' add notification'
                          ),
                          i.roomCbs.notificationCb(
                            i.options.roomId,
                            de.StreamAdd,
                            t
                          ));
                      }))
                    : (i.options.logger.error(
                        'Stream ' + o + ' no related user!'
                      ),
                      { v: r });
              };
              for (v.s(); !(g = v.n()).done; ) {
                var S = b();
                if ('continue' !== S && 'object' === G(S)) return S.v;
              }
            } catch (e) {
              v.e(e);
            } finally {
              v.f();
            }
          }
          return r;
        },
      },
    ]),
    e
  );
})();
function vi() {
  function e() {
    return ((65536 * (1 + Math.random())) | 0).toString(16).substring(1);
  }
  return e() + e() + '-' + e() + '-' + e() + '-' + e() + '-' + e() + e() + e();
}
var bi,
  Si = (function () {
    function e(t, i) {
      (_(this, e),
        (this.rooms = new Map()),
        (this.logger = t),
        (this.roomCbs = i));
    }
    return (
      O(e, [
        {
          key: 'enterRoom',
          value: function (e, t) {
            var i = t.onCustomSignParam,
              r = t.appId,
              n = t.userSig,
              o = t.userId,
              s = t.userType,
              a = t.previousRoomId,
              c = t.permission,
              u = t.userData,
              d = t.extendInfo,
              l = t.serverUrl,
              h = t.privateKey,
              p = t.enterRoomCb,
              f = t.ssl;
            if (
              (this.logger.info('XsigoStackClient enterRoom: ' + e),
              !this.rooms.has(e))
            ) {
              var m = new gi({
                roomId: e,
                serverUrl: l,
                logger: this.logger,
                roomCbs: this.roomCbs,
              });
              this.rooms.set(e, m);
            }
            this.rooms.get(e).enter(i, r, n, o, s, a, c, u, d, h, p, f, e);
          },
        },
        {
          key: 'exitRoom',
          value: function (e, t) {
            if (
              (this.logger.info('XsigoStackClient exitRoom: ' + e),
              this.rooms.has(e))
            )
              return (this.rooms.get(e).exit(t), void this.rooms.delete(e));
            this.logger.error(
              'XsigoStackClient exitRoom: ' + e + 'error, room not exist'
            );
          },
        },
        {
          key: 'publishStream',
          value: function (e, t) {
            var i = t.streamType,
              r = t.streamKind,
              n = t.params,
              o = t.cb,
              s = t.updateCb,
              a = vi();
            if (
              (this.logger.info(
                'XsigoStackClient publishStream :  ' + a + ' in room' + e,
                this.rooms.has(e)
              ),
              this.rooms.has(e))
            )
              return (this.rooms.get(e).publishStream(a, i, r, n, o, s), a);
          },
        },
        {
          key: 'unpublishStream',
          value: function (e, t, i) {
            (this.logger.info(
              'XsigoStackClient unpublishStream :  ' + t + ' in room' + e
            ),
              this.rooms.has(e) && this.rooms.get(e).unpublishStream(t, i));
          },
        },
        {
          key: 'updateSimulcast',
          value: function (e, t, i, r) {
            this.rooms.has(e) && this.rooms.get(e).updateSimulcast(t, i, r);
          },
        },
        {
          key: 'muteAudio',
          value: function (e, t, i, r) {
            this.rooms.has(e) && this.rooms.get(e).muteLocalAudio(t, i, r);
          },
        },
        {
          key: 'muteVideo',
          value: function (e, t, i, r) {
            this.rooms.has(e) && this.rooms.get(e).muteLocalVideo(t, i, r);
          },
        },
        {
          key: 'unmuteAudio',
          value: function (e, t, i, r) {
            this.rooms.has(e) && this.rooms.get(e).unmuteLocalAudio(t, i, r);
          },
        },
        {
          key: 'unmuteVideo',
          value: function (e, t, i, r) {
            this.rooms.has(e) && this.rooms.get(e).unmuteLocalVideo(t, i, r);
          },
        },
        {
          key: 'subscribeStream',
          value: function (e, t) {
            var i = t.publisherUserId,
              r = t.streamId,
              n = t.streamKind,
              o = t.params,
              s = t.cb,
              a = t.updateCb;
            this.logger.info(
              'XsigoStackClient subscribeStream :  ' + r + ' in room' + e
            );
            var c = vi();
            return this.rooms.has(e)
              ? (this.rooms.get(e).subscribeStream(c, i, r, n, o, s, a), c)
              : '';
          },
        },
        {
          key: 'unsubscribeStream',
          value: function (e, t, i) {
            (this.logger.info(
              'XsigoStackClient unsubscribe :  ' + t + ' in room' + e
            ),
              this.rooms.has(e) && this.rooms.get(e).unsubscribeStream(t, i));
          },
        },
        {
          key: 'switchSimulcast',
          value: function (e, t, i, r) {
            this.rooms.has(e) && this.rooms.get(e).switchSimulcast(t, i, r);
          },
        },
        {
          key: 'switchPermission',
          value: function (e, t, i) {
            this.rooms.has(e) && this.rooms.get(e).switchPermission(t, i);
          },
        },
        {
          key: 'getWsState',
          value: function (e) {
            if (this.rooms.has(e)) return this.rooms.get(e).getWsState();
          },
        },
        {
          key: 'isDisconnected',
          value: function (e) {
            var t = this.getWsState(e).state;
            return (
              ['CONNECTED', 'RECOVERY'].includes(t) ||
                this.logger.warn('cannot operate during network disconnection'),
              !['CONNECTED', 'RECOVERY'].includes(t)
            );
          },
        },
      ]),
      e
    );
  })();
function yi(e, t) {
  var i = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      i.push.apply(i, r));
  }
  return i;
}
function Ei(e) {
  for (var t = 1; t < arguments.length; t++) {
    var i = null != arguments[t] ? arguments[t] : {};
    t % 2
      ? yi(Object(i), !0).forEach(function (t) {
          S(e, t, i[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(i))
        : yi(Object(i)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(i, t));
          });
  }
  return e;
}
!(function (e) {
  ((e[(e.AuthTypeHeader = 0)] = 'AuthTypeHeader'),
    (e[(e.AuthTypeQuery = 1)] = 'AuthTypeQuery'));
})(bi || (bi = {}));
var Ci = {
  appKey: null,
  authorization: '',
  timeout: 1e4,
  extendInfo: {},
  ssl: !0,
  onCustomSignParam: null,
  path: '',
  privateKey: '',
  timeoutObj: {},
  init: function (e) {
    var t = e.sdkAppId,
      i = e.userSig,
      r = e.onCustomSignParam,
      n = e.extendInfo,
      o = e.userId;
    ((this.ssl = e.ssl),
      (this.userId = o),
      (this.appKey = t),
      (this.authorization = i),
      (this.onCustomSignParam = r),
      (this.extendInfo = n));
  },
  timeoutPromise: function (e, t, i) {
    var r = this;
    return new Promise(function (n, o) {
      r.timeoutObj[i] = setTimeout(function () {
        (n(
          new Response('timeout', {
            status: 408,
            statusText: 'request timeout',
          })
        ),
          t.abort());
      }, e);
    });
  },
  getHeader: function () {
    var e = this;
    return T(
      A.mark(function t() {
        var i, r;
        return A.wrap(function (t) {
          for (;;)
            switch ((t.prev = t.next)) {
              case 0:
                if (!e.onCustomSignParam) {
                  t.next = 18;
                  break;
                }
                return ((t.next = 3), e.onCustomSignParam());
              case 3:
                if ((i = t.sent).getHeader) {
                  t.next = 6;
                  break;
                }
                return t.abrupt(
                  'return',
                  new Headers({
                    'Content-Type': 'application/json',
                    appKey: e.appKey,
                    userId: e.userId,
                  })
                );
              case 6:
                if ('object' !== G(i.getHeader)) {
                  t.next = 15;
                  break;
                }
                if (
                  ((r = i.getHeader),
                  '[object Object]' !== Object.prototype.toString.call(r))
                ) {
                  t.next = 12;
                  break;
                }
                return t.abrupt(
                  'return',
                  new Headers(
                    Ei(
                      { 'Content-Type': 'application/json', appKey: e.appKey },
                      r
                    )
                  )
                );
              case 12:
                throw new Error(
                  'onCustomSignParam.getHeader result is not an object'
                );
              case 13:
                t.next = 16;
                break;
              case 15:
                throw new Error('onCustomSignParam.getHeader is not a object');
              case 16:
                t.next = 19;
                break;
              case 18:
                return t.abrupt(
                  'return',
                  new Headers({
                    'Content-Type': 'application/json',
                    appKey: e.appKey,
                    Authorization: e.authorization,
                    userId: e.userId,
                  })
                );
              case 19:
              case 'end':
                return t.stop();
            }
        }, t);
      })
    )();
  },
  getQuerys: function () {
    var e = this;
    return T(
      A.mark(function t() {
        var i, r, n, o, s, a, c;
        return A.wrap(function (t) {
          for (;;)
            switch ((t.prev = t.next)) {
              case 0:
                if (!e.onCustomSignParam) {
                  t.next = 20;
                  break;
                }
                return ((t.next = 3), e.onCustomSignParam());
              case 3:
                if ((i = t.sent).getQuery) {
                  t.next = 6;
                  break;
                }
                return t.abrupt('return', '');
              case 6:
                if ('object' !== G(i.getQuery)) {
                  t.next = 17;
                  break;
                }
                if (
                  ((r = i.getQuery),
                  '[object Object]' !== Object.prototype.toString.call(r))
                ) {
                  t.next = 14;
                  break;
                }
                for (n = '', o = 0, s = Object.entries(r); o < s.length; o++)
                  ((a = C(s[o], 2)),
                    (c = a[1]),
                    (n += '&'.concat(a[0], '=').concat(c)));
                return t.abrupt('return', n.slice(1));
              case 14:
                throw new Error(
                  'onCustomSignParam.getQuery result is not an object'
                );
              case 15:
                t.next = 18;
                break;
              case 17:
                throw new Error('onCustomSignParam.getQuery is not a object');
              case 18:
                t.next = 21;
                break;
              case 20:
                return t.abrupt('return', '');
              case 21:
              case 'end':
                return t.stop();
            }
        }, t);
      })
    )();
  },
  baseUrl: function (e) {
    return e.includes('https://') || e.includes('http://')
      ? e
      : ''.concat(this.ssl ? 'https://' : 'http://').concat(e);
  },
  getAppConfig: function (e, t) {
    var i = this;
    return T(
      A.mark(function r() {
        var n, o, s, a, c;
        return A.wrap(function (r) {
          for (;;)
            switch ((r.prev = r.next)) {
              case 0:
                return ((i.path = i.baseUrl(e)), (r.next = 3), i.getQuerys());
              case 3:
                return ((n = r.sent), (r.next = 6), i.getHeader());
              case 6:
                return (
                  (o = r.sent),
                  (s = new AbortController()),
                  (a = ''
                    .concat(i.path, '/api/v1/app/config/get?')
                    .concat(n && n + '&', 'appId=')
                    .concat(i.appKey)),
                  i.extendInfo &&
                    i.extendInfo.location &&
                    (a += '&location='.concat(i.extendInfo.location)),
                  t && ((i.privateKey = t), (a += '&privateKey='.concat(t))),
                  (c = function () {
                    return fetch(a, {
                      method: 'GET',
                      headers: o,
                      signal: s.signal,
                    });
                  }),
                  r.abrupt(
                    'return',
                    Promise.race([
                      i.timeoutPromise(i.timeout, s, 'getAppConfig'),
                      c(),
                    ])
                      .then(function (e) {
                        if (e.ok) return e.json();
                        throw new X(
                          401 === e.status
                            ? {
                                code: B.AUTHORIZATION_FAILED,
                                message:
                                  'Authorization failed: /api/v1/app/config/get?appId',
                              }
                            : 404 === e.status
                              ? {
                                  code: B.GET_SERVER_NODE_FAILED,
                                  message: '404: /api/v1/app/config/get?appId',
                                }
                              : 408 === e.status
                                ? {
                                    code: B.REQUEST_TIMEOUT,
                                    message: ''.concat(
                                      e.statusText,
                                      ': /api/v1/app/config/get?appId'
                                    ),
                                  }
                                : {
                                    code: B.SERVER_UNKNOWN_ERROR,
                                    message:
                                      'Server unknown error: /api/v1/app/config/get?appId',
                                  }
                        );
                      })
                      .catch(function (e) {
                        return Promise.reject(a + e);
                      })
                      .finally(function () {
                        (i.timeoutObj.getAppConfig &&
                          clearTimeout(i.timeoutObj.getAppConfig),
                          (i.timeoutObj.getAppConfig = null));
                      })
                  )
                );
              case 13:
              case 'end':
                return r.stop();
            }
        }, r);
      })
    )();
  },
  getWsUrl: function (e, t, i) {
    var r = this;
    return T(
      A.mark(function n() {
        var o, s, a, c, u;
        return A.wrap(function (n) {
          for (;;)
            switch ((n.prev = n.next)) {
              case 0:
                return ((r.path = r.baseUrl(t)), (n.next = 3), r.getQuerys());
              case 3:
                return ((o = n.sent), (n.next = 6), r.getHeader());
              case 6:
                return (
                  (s = n.sent),
                  (a = ''
                    .concat(r.path, '/api/v1/dispatch/get-can-use?')
                    .concat(o && o + '&', 'mucNum=')
                    .concat(e)),
                  r.extendInfo &&
                    r.extendInfo.location &&
                    (a += '&location='.concat(r.extendInfo.location)),
                  i && (a += '&privateKey='.concat(i)),
                  (c = new AbortController()),
                  (u = function () {
                    return fetch(a, {
                      method: 'GET',
                      headers: s,
                      signal: c.signal,
                    });
                  }),
                  n.abrupt(
                    'return',
                    Promise.race([
                      r.timeoutPromise(r.timeout, c, 'getWsUrl'),
                      u(),
                    ])
                      .then(function (e) {
                        if (e.ok) return e.json();
                        throw new X(
                          401 === e.status
                            ? {
                                code: B.AUTHORIZATION_FAILED,
                                message:
                                  'Authorization failed: /api/v1/dispatch/get-can-use?mucNum',
                              }
                            : 404 === e.status
                              ? {
                                  code: B.GET_SERVER_NODE_FAILED,
                                  message:
                                    '404: /api/v1/dispatch/get-can-use?mucNum',
                                }
                              : 408 === e.status
                                ? {
                                    code: B.REQUEST_TIMEOUT,
                                    message: ''.concat(
                                      e.statusText,
                                      ': /api/v1/dispatch/get-can-use?mucNum'
                                    ),
                                  }
                                : {
                                    code: B.SERVER_UNKNOWN_ERROR,
                                    message:
                                      'Server unknown error: /api/v1/dispatch/get-can-use?mucNum',
                                  }
                        );
                      })
                      .catch(function (e) {
                        return Promise.reject(a + e);
                      })
                      .finally(function () {
                        (r.timeoutObj.getWsUrl &&
                          clearTimeout(r.timeoutObj.getWsUrl),
                          (r.timeoutObj.getWsUrl = null));
                      })
                  )
                );
              case 13:
              case 'end':
                return n.stop();
            }
        }, n);
      })
    )();
  },
  upload: function (e) {
    var t = this;
    return T(
      A.mark(function i() {
        var r, n, o;
        return A.wrap(function (i) {
          for (;;)
            switch ((i.prev = i.next)) {
              case 0:
                return ((i.next = 2), t.getQuerys());
              case 2:
                return ((r = i.sent), (i.next = 5), t.getHeader());
              case 5:
                return (
                  (n = i.sent),
                  (o = ''
                    .concat(t.path, '/api/v1/logging/collect/list')
                    .concat(r && '?'.concat(r))),
                  t.extendInfo &&
                    t.extendInfo.location &&
                    (o += r
                      ? '&location='.concat(t.extendInfo.location)
                      : '?location='.concat(t.extendInfo.location)),
                  t.privateKey &&
                    (o += r
                      ? '&privateKey='.concat(t.privateKey)
                      : '?privateKey='.concat(t.privateKey)),
                  i.abrupt(
                    'return',
                    fetch(o, {
                      method: 'POST',
                      body: JSON.stringify(e),
                      headers: n,
                    })
                      .then(function (e) {
                        if (e.ok) return e.json();
                        throw new X({ code: e.status, message: e.statusText });
                      })
                      .catch(function (e) {
                        return Promise.reject(e);
                      })
                  )
                );
              case 10:
              case 'end':
                return i.stop();
            }
        }, i);
      })
    )();
  },
};
function Ii(e, t) {
  var i = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      i.push.apply(i, r));
  }
  return i;
}
function Ti(e) {
  for (var t = 1; t < arguments.length; t++) {
    var i = null != arguments[t] ? arguments[t] : {};
    t % 2
      ? Ii(Object(i), !0).forEach(function (t) {
          S(e, t, i[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(i))
        : Ii(Object(i)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(i, t));
          });
  }
  return e;
}
function Ri(e, t) {
  var i;
  if ('undefined' == typeof Symbol || null == e[Symbol.iterator]) {
    if (
      Array.isArray(e) ||
      (i = (function (e, t) {
        if (e) {
          if ('string' == typeof e) return _i(e, t);
          var i = Object.prototype.toString.call(e).slice(8, -1);
          return (
            'Object' === i && e.constructor && (i = e.constructor.name),
            'Map' === i || 'Set' === i
              ? Array.from(e)
              : 'Arguments' === i ||
                  /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i)
                ? _i(e, t)
                : void 0
          );
        }
      })(e)) ||
      (t && e && 'number' == typeof e.length)
    ) {
      i && (e = i);
      var r = 0,
        n = function () {};
      return {
        s: n,
        n: function () {
          return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
        },
        e: function (e) {
          throw e;
        },
        f: n,
      };
    }
    throw new TypeError(
      'Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
    );
  }
  var o,
    s = !0,
    a = !1;
  return {
    s: function () {
      i = e[Symbol.iterator]();
    },
    n: function () {
      var e = i.next();
      return ((s = e.done), e);
    },
    e: function (e) {
      ((a = !0), (o = e));
    },
    f: function () {
      try {
        s || null == i.return || i.return();
      } finally {
        if (a) throw o;
      }
    },
  };
}
function _i(e, t) {
  (null == t || t > e.length) && (t = e.length);
  for (var i = 0, r = new Array(t); i < t; i++) r[i] = e[i];
  return r;
}
var ki,
  Oi,
  wi = (function () {
    function e(t, i) {
      (_(this, e),
        (this.logger = i),
        (this.ssl =
          !!t.ssl || !!t.wsUrl.includes('https') || !t.wsUrl.includes('http')),
        (this.wsUrl = t.wsUrl),
        (this.wsUrlList = t.backupWsUrlList
          ? R(new Set([this.wsUrl].concat(R(t.backupWsUrlList))))
          : [this.wsUrl]),
        (this.userId = t.userId),
        (this.userName =
          'undefined' !== t.userName && t.userName ? t.userName : ''),
        (this.mode = t.mode),
        (this.sdkAppId = t.sdkAppId),
        (this.userSig = t.userSig),
        (this.onCustomSignParam = t.onCustomSignParam),
        (this.extendInfo = t.extendInfo),
        (this.appConfig = null),
        (this.reconnectCount = 0),
        this.init());
    }
    var t, i, r, n, o, s, a, c, u, d, l, h, p, f, m;
    return (
      O(e, [
        {
          key: 'init',
          value: function () {
            var e = this;
            ((this.publications = new Map()),
              (this.subscriptions = new Map()),
              (this.roomId = null),
              (this.roomUniqueId = null),
              (this.role = 'anchor'),
              (this.remoteStreams = new Map()),
              (this.state = D.New),
              (this.localStreams = []),
              (this.enablemicVolume = !1),
              (this.soundMeter = null),
              (this.timer = null),
              (this.micStream = null),
              (this.isEnableSmallStream = !1),
              (this._emitter = new P(this.logger)),
              (this.subscribeManager = new vt(this.logger)),
              (this._interval = -1),
              (this._remoteMutedStateMap = new Map()),
              (this.audioVolumeInterval = null),
              (this.isWaterMark = !1),
              (this.waterMarkoptions = null),
              (this.waterMarkImage = null),
              (this.smallStreamConfig = {
                width: 160,
                height: 120,
                bitrate: 100,
                framerate: 15,
              }),
              this.logger.setUserId(this.userId),
              this.logger.setServerUrl(this.wsUrl),
              Ci.init({
                userId: this.userId,
                ssl: this.ssl,
                sdkAppId: this.sdkAppId,
                userSig: this.userSig,
                onCustomSignParam: this.onCustomSignParam,
                extendInfo: this.extendInfo,
              }),
              (this.xsigoClient = new Si(this.logger, {
                notificationCb: this.notificationCb.bind(this),
                connectionLostCb: this.connectionLostCb.bind(this),
                tryToReconnectCb: this.tryToReconnectCb.bind(this),
                connectionRecoveryCb: this.connectionRecoveryCb.bind(this),
                onWsStateChange: this.onWsStateChange.bind(this),
                onWsError: this.onError.bind(this),
                onWsReconnectFailed: this.onWsReconnectFailed.bind(this),
              })),
              this.ssl &&
                navigator.mediaDevices &&
                je()
                  .then(function (t) {
                    ((e._preDiviceList = t),
                      e.logger.info(
                        'mediaDevices',
                        JSON.stringify(e._preDiviceList, null, 4)
                      ));
                  })
                  .catch(function () {
                    e._preDiviceList = [];
                  }),
              (this.senderStats = new Map()),
              (this.receiverStats = new Map()),
              (this.senderLocalStats = new Map()),
              (this.deviceChange = this.onDeviceChange.bind(this)),
              (this.visibilitychange = this.onVisibilitychange.bind(this)),
              this.logger.info('userAgent:', navigator.userAgent));
          },
        },
        {
          key: 'setAppConfig',
          value: function (e) {
            var t = e.serverTs,
              i = e.logPeriod,
              r = e.enableLog,
              n = e.eventPeriod,
              o = e.enableEvent,
              s = e.metricCollectPeriod;
            ((this.appConfig = {
              serverTs: t,
              timeDiff: t ? Date.now() - t : 0,
              logPeriod: i,
              enableLog: !1 !== r,
              eventPeriod: n,
              enableEvent: !1 !== o,
              metricCollectPeriod: s,
            }),
              this.logger.setAppConfig(this.appConfig),
              this.logger.info(
                'get app config',
                JSON.stringify(this.appConfig, null, 4)
              ));
          },
        },
        {
          key: 'reset',
          value: function () {
            ((this.publications = new Map()),
              (this.subscriptions = new Map()),
              (this.localStreams = []),
              this.remoteStreams.clear(),
              this.subscribeManager.reset(),
              this._remoteMutedStateMap.clear(),
              (this.appConfig = null),
              this._interval && window.clearInterval(this._interval),
              (this._interval = -1),
              (this.reconnectCount = 0),
              this.audioVolumeInterval &&
                window.clearInterval(this.audioVolumeInterval),
              (this.audioVolumeInterval = null),
              this.removeEventListenser('devicechange'),
              this.removeEventListenser('visibilitychange'),
              this.logger.setServerUrl(null),
              this.logger.setAppConfig(null),
              this.closeWaterMark());
          },
        },
        {
          key: 'notificationCb',
          value: function (e, t, i) {
            if (t === de.ParticipantJoin) {
              var r = i.participant,
                n = r.userId,
                o = r.previousRoomId,
                s = r.userData;
              (this.logger.info('======notification: participant join======'),
                this.updateRemoteMutedState(n),
                this.logger.buriedLog({
                  c: Ue.ON_PEER_JOIN,
                  v: 'uid:'.concat(n),
                }),
                this._emitter.emit('peer-join', {
                  userId: n,
                  previousRoomId: o,
                  userData: s,
                }));
            }
            if (t === de.ParticipantLeave) {
              var a = i.userId;
              (this.logger.info('======notification: participant leave======'),
                this.onParticipantLeave(a));
            }
            if (
              (t === de.StreamAdd &&
                (this.logger.info('======notification: stream add======'),
                this.onStreamAdd(i.stream)),
              t === de.StreamRemove &&
                (this.logger.info('======notification: stream remove======'),
                this.onStreamChange(i.userId, i.streamId)),
              t === de.Drop)
            ) {
              var c = i.cause;
              (this.logger.info('======notification: participant drop======'),
                this.onClientBanned(c));
            }
            if (
              (t === de.StreamUpdate &&
                (this.logger.info('======notification: stream update======'),
                this.onStreamUpdate(
                  i.userId,
                  i.streamId,
                  i.liveStatus,
                  i.simulcast
                )),
              t === de.PermissionChange)
            ) {
              var u = i;
              this.logger.info(
                '======notification: role change======',
                u.userId,
                u.publish
              );
            }
            if (t === de.MuteLocal) {
              var d = i.type,
                l = i.userId;
              (this.logger.info('======notification: muteLocal ======', d),
                this.onMuteLocal(d, l));
            }
          },
        },
        {
          key: 'connectionLostCb',
          value: function (e) {
            this.logger &&
              (this.logger.info('room: '.concat(e, ' connection lost')),
              this.logger.buriedLog({ c: Ue.CONNECTIONLOST_CB }));
          },
        },
        {
          key: 'tryToReconnectCb',
          value: function (e) {
            this.logger.info('room: '.concat(e, ' connection retring ......'));
          },
        },
        {
          key: 'connectionRecoveryCb',
          value: function (e, t, i) {
            var r = this;
            return new Promise(
              (function () {
                var n = T(
                  A.mark(function n(o, s) {
                    var a, c, u, d, l, h, p, f, m, g, v, b, S, y;
                    return A.wrap(
                      function (n) {
                        for (;;)
                          switch ((n.prev = n.next)) {
                            case 0:
                              if (
                                (r.logger.info(
                                  'room: '.concat(e, ' connection recovery')
                                ),
                                r.logger.buriedLog({
                                  c: Ue.CONNECTION_RECOVERY_CB,
                                }),
                                !i)
                              ) {
                                n.next = 50;
                                break;
                              }
                              if (
                                ((r.roomUniqueId = t),
                                r.logger.setRoomUniqueId(t),
                                (a = new Map()),
                                (c = new Map()),
                                (u = new Map(r.publications)),
                                !r.publications.size)
                              ) {
                                n.next = 25;
                                break;
                              }
                              ((d = Ri(u.entries())),
                                (n.prev = 10),
                                (h = A.mark(function e() {
                                  var t, i, n, o, s, c, u;
                                  return A.wrap(function (e) {
                                    for (;;)
                                      switch ((e.prev = e.next)) {
                                        case 0:
                                          return (
                                            (t = C(l.value, 2)),
                                            (i = t[0]),
                                            (n = t[1]),
                                            (e.next = 3),
                                            n.republish()
                                          );
                                        case 3:
                                          (o = e.sent) &&
                                            ((s = vi()),
                                            a.set(i, { sdp: o.sdp, pubId: s }),
                                            r.publications.delete(i),
                                            r.publications.set(s, n),
                                            (c = r.localStreams.find(
                                              function (e) {
                                                return [
                                                  e.audioStreamId,
                                                  e.videoStreamId,
                                                ].includes(i);
                                              }
                                            )) &&
                                              ((u = c.screen
                                                ? 'share_'.concat(c.getUserId())
                                                : c.getUserId()),
                                              r.senderStats.delete(u),
                                              (c.streamId = s)));
                                        case 5:
                                        case 'end':
                                          return e.stop();
                                      }
                                  }, e);
                                })),
                                d.s());
                            case 13:
                              if ((l = d.n()).done) {
                                n.next = 17;
                                break;
                              }
                              return n.delegateYield(h(), 't0', 15);
                            case 15:
                              n.next = 13;
                              break;
                            case 17:
                              n.next = 22;
                              break;
                            case 19:
                              ((n.prev = 19), (n.t1 = n.catch(10)), d.e(n.t1));
                            case 22:
                              return ((n.prev = 22), d.f(), n.finish(22));
                            case 25:
                              if (!r.subscriptions.size) {
                                n.next = 48;
                                break;
                              }
                              ((p = new Map(r.subscriptions)),
                                (f = Ri(p.entries())),
                                (n.prev = 28),
                                f.s());
                            case 30:
                              if ((m = f.n()).done) {
                                n.next = 40;
                                break;
                              }
                              return (
                                (g = C(m.value, 2)),
                                (b = g[1]),
                                r.logger.info('resubscribe stream', (v = g[0])),
                                (n.next = 35),
                                b.subscriber.resubscribe()
                              );
                            case 35:
                              ((S = n.sent),
                                r.receiverStats.delete(b.stream.getUserSeq()),
                                S &&
                                  ((y = vi()),
                                  c.set(v, { sdp: S.sdp, subId: y }),
                                  r.subscriptions.delete(v),
                                  r.subscriptions.set(y, b)));
                            case 38:
                              n.next = 30;
                              break;
                            case 40:
                              n.next = 45;
                              break;
                            case 42:
                              ((n.prev = 42), (n.t2 = n.catch(28)), f.e(n.t2));
                            case 45:
                              return ((n.prev = 45), f.f(), n.finish(45));
                            case 48:
                              (r.logger.info(
                                'publishOfferSdp==>',
                                a,
                                'subscribeOfferSdp==>',
                                c
                              ),
                                o({
                                  publishOfferSdp: a,
                                  subscribeOfferSdp: c,
                                }));
                            case 50:
                            case 'end':
                              return n.stop();
                          }
                      },
                      n,
                      null,
                      [
                        [10, 19, 22, 25],
                        [28, 42, 45, 48],
                      ]
                    );
                  })
                );
                return function (e, t) {
                  return n.apply(this, arguments);
                };
              })()
            );
          },
        },
        {
          key: 'join',
          value: function (e) {
            var t = this;
            if (
              (this.logger.info('join room with options', JSON.stringify(e)),
              this.logger.buriedLog({ c: Ue.JOIN }),
              this.logger.buriedLog({ c: Ue.JOIN_FIRST }),
              [D.New, D.Leaved].includes(this.state))
            )
              return new Promise(
                (function () {
                  var i = T(
                    A.mark(function i(r, n) {
                      var o, s, a, c, u, d, l, h, p, f, m, g;
                      return A.wrap(function (i) {
                        for (;;)
                          switch ((i.prev = i.next)) {
                            case 0:
                              return ((i.next = 2), t.isJoinRoomSupported());
                            case 2:
                              if (
                                ((s = (o = i.sent).code),
                                (a = o.message),
                                o.isSupported)
                              ) {
                                i.next = 11;
                                break;
                              }
                              return (
                                t.logger.buriedLog({ c: Ue.JOIN_FAILED }, !0),
                                (c = 'join room failed,'.concat(a)),
                                t.logger.onError(
                                  { c: Ue.TOP_ERROR, v: B.JOIN_ROOM_FAILED },
                                  c,
                                  !0
                                ),
                                i.abrupt(
                                  'return',
                                  n(new X({ code: s, message: a }))
                                )
                              );
                            case 11:
                              if (
                                ((d = e.role),
                                (l = ''),
                                e.privateKey && (l = e.privateKey),
                                (h = /^[A-Za-z0-9_-]+$/g),
                                !(u = e.roomId) || h.test(u))
                              ) {
                                i.next = 20;
                                break;
                              }
                              return (
                                (p = 'join room failed,roomId:'.concat(
                                  u,
                                  ' is invalid，roomId can only be numbers, letters and "-" '
                                )),
                                t.logger.buriedLog({ c: Ue.JOIN_FAILED }, !0),
                                t.logger.onError(
                                  { c: Ue.TOP_ERROR, v: B.JOIN_ROOM_FAILED },
                                  p,
                                  !0
                                ),
                                i.abrupt(
                                  'return',
                                  n(
                                    new X({
                                      code: B.INVALID_OPERATION,
                                      message: p,
                                    })
                                  )
                                )
                              );
                            case 20:
                              if (
                                !(
                                  t.wsUrl &&
                                  t.sdkAppId &&
                                  (t.userSig || t.onCustomSignParam) &&
                                  u &&
                                  t.userId
                                )
                              ) {
                                i.next = 28;
                                break;
                              }
                              ((t.roomId = u),
                                (t.role = ('live' === t.mode && d) || t.role),
                                t.logger.setRoomId(t.roomId),
                                (f = function (i) {
                                  t.state = D.Joining;
                                  var o = {
                                    onCustomSignParam: t.onCustomSignParam,
                                    appId: t.sdkAppId,
                                    userSig: t.userSig,
                                    userId: t.userId,
                                    userType: fe.Normal,
                                    previousRoomId: '',
                                    permission: L.get(t.role),
                                    userData: {
                                      userId: t.userId,
                                      userName: t.userName,
                                      extra: e.extra,
                                    },
                                    extendInfo: t.extendInfo,
                                    serverUrl: i,
                                    privateKey: l,
                                    ssl: t.ssl,
                                    enterRoomCb: function (e, i, o) {
                                      if (1 === e) {
                                        t.state = D.Joined;
                                        var s = o.participants,
                                          a = o.roomUniqueId;
                                        (t.getNetworkQuality(),
                                          t.addEventListenser('devicechange'),
                                          t.addEventListenser(
                                            'visibilitychange'
                                          ),
                                          (t.roomUniqueId = a),
                                          t.logger.setRoomUniqueId(a),
                                          t.logger.buriedLog({
                                            c: Ue.JOIN_SUCCESS,
                                          }),
                                          t._emitter.emit('members', s),
                                          t.logger.info(
                                            'join room '.concat(
                                              t.roomId,
                                              ' success'
                                            )
                                          ),
                                          r(!0));
                                      } else if (2 === e) {
                                        t.state = D.New;
                                        var c = ''.concat(
                                          B.JOIN_ROOM_FAILED,
                                          ' join room timeout'
                                        );
                                        (t.logger.onError(
                                          {
                                            c: Ue.TOP_ERROR,
                                            v: B.JOIN_ROOM_FAILED,
                                          },
                                          c,
                                          !0
                                        ),
                                          t.logger.buriedLog(
                                            { c: Ue.JOIN_FAILED },
                                            !0
                                          ),
                                          n(
                                            new X({
                                              code: B.JOIN_ROOM_FAILED,
                                              message: 'join room timeout',
                                            })
                                          ));
                                      } else {
                                        t.state = D.New;
                                        var u = 'join room failed:, '.concat(i);
                                        (t.logger.onError(
                                          {
                                            c: Ue.TOP_ERROR,
                                            v: B.JOIN_ROOM_FAILED,
                                          },
                                          u,
                                          !0
                                        ),
                                          t.logger.buriedLog(
                                            { c: Ue.JOIN_FAILED },
                                            !0
                                          ),
                                          n(
                                            new X({
                                              code: B.JOIN_ROOM_FAILED,
                                              message: i,
                                            })
                                          ));
                                      }
                                    },
                                  };
                                  t.xsigoClient.enterRoom(t.roomId, o);
                                }),
                                t.getWsUrl(l, f, n),
                                (i.next = 35));
                              break;
                            case 28:
                              return ((i.next = 30), t.onCustomSignParam());
                            case 30:
                              ((m = i.sent),
                                (g =
                                  'join room failed, options is invalid,wsUrl:'
                                    .concat(t.wsUrl, ',sdkAppId:')
                                    .concat(t.sdkAppId, ',userSig:')
                                    .concat(t.userSig, ',onCustomSignParam:')
                                    .concat(JSON.stringify(m), ',roomId:')
                                    .concat(e.roomId, ',userId:')
                                    .concat(t.userId)),
                                t.logger.error(g),
                                t.logger.buriedLog({ c: Ue.JOIN_FAILED }, !0),
                                n(
                                  new X({
                                    code: B.INVALID_OPERATION,
                                    message: g,
                                  })
                                ));
                            case 35:
                            case 'end':
                              return i.stop();
                          }
                      }, i);
                    })
                  );
                  return function (e, t) {
                    return i.apply(this, arguments);
                  };
                })()
              );
            this.logger.buriedLog({ c: Ue.JOIN_FAILED });
            var i = 'join room failed,client state is error ,state:'.concat(
              this.state
            );
            this.logger.onError(
              { c: Ue.TOP_ERROR, v: B.JOIN_ROOM_FAILED },
              i,
              !0
            );
          },
        },
        {
          key: 'getWsUrl',
          value:
            ((m = T(
              A.mark(function e(t, i, r) {
                var n, o, s, a, c, u, d, l, h, p;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          if (
                            ((n = []),
                            this.logger.info(
                              'wsUrlList,'.concat(this.wsUrlList)
                            ),
                            (o = this.wsUrlList.shift()),
                            this.wsUrlList.push(o),
                            !o.includes('ws:') && !o.includes('wss:'))
                          ) {
                            e.next = 9;
                            break;
                          }
                          return (i(o), e.abrupt('return'));
                        case 9:
                          return (
                            (e.prev = 9),
                            (e.next = 12),
                            Ci.getAppConfig(o, t)
                          );
                        case 12:
                          return (
                            (s = e.sent) && this.setAppConfig(s.data),
                            (e.next = 16),
                            Ci.getWsUrl(this.roomId, o, t)
                          );
                        case 16:
                          ((c = ((a = e.sent).data || {}).metadata),
                            (o.includes('https://') || o.includes('http://')) &&
                              (o = o.split('//')[1]),
                            (u = o.split(':').length - 1 >= 2),
                            c
                              ? u
                                ? ((l = c.hostV6),
                                  (d = c.sslHostV6).includes(':') &&
                                    ((d = c.sslHostV6.includes('[')
                                      ? c.sslHostV6
                                      : '['.concat(d)),
                                    (d = c.sslHostV6.includes(']')
                                      ? c.sslHostV6
                                      : ''.concat(d, ']'))),
                                  l.includes(':') &&
                                    ((l = c.hostV6.includes('[')
                                      ? c.hostV6
                                      : '['.concat(l)),
                                    (l = c.hostV6.includes(']')
                                      ? c.hostV6
                                      : ''.concat(l, ']'))),
                                  (n = this.ssl
                                    ? 'wss://'.concat(d, ':').concat(c.sslPort)
                                    : 'ws://'.concat(l, ':').concat(c.port)))
                                : (n = this.ssl
                                    ? 'wss://'
                                        .concat(c.sslHost, ':')
                                        .concat(c.sslPort)
                                    : 'ws://'
                                        .concat(c.host, ':')
                                        .concat(c.port))
                              : (n = 'wss://'
                                  .concat(a.data.host, ':')
                                  .concat(a.data.port)),
                            this.logger.info(
                              ' httpUrl==>'
                                .concat(o, '  , serverIPUrl==>')
                                .concat(n)
                            ),
                            i(n),
                            (e.next = 40));
                          break;
                        case 25:
                          if (
                            ((e.prev = 25),
                            (e.t0 = e.catch(9)),
                            this.reconnectCount++,
                            !(this.reconnectCount < this.wsUrlList.length))
                          ) {
                            e.next = 36;
                            break;
                          }
                          if (
                            this.state !== D.Leaved &&
                            this.state !== D.Leaving
                          ) {
                            e.next = 31;
                            break;
                          }
                          return e.abrupt('return');
                        case 31:
                          ((h = 'http connect faild ,sdk is reconnecting,count:'
                            .concat(this.reconnectCount, ' ==>')
                            .concat(e.t0)),
                            this.logger.warn(h),
                            this.getWsUrl(t, i, r),
                            (e.next = 40));
                          break;
                        case 36:
                          ((p =
                            'http connect faild, SDK has tried reconnect , but faild,  please check your network and server ==>'.concat(
                              e.t0
                            )),
                            this.logger.onError(
                              { c: Ue.TOP_ERROR, v: B.JOIN_ROOM_FAILED },
                              p,
                              !0
                            ),
                            this.logger.buriedLog({ c: Ue.JOIN_FAILED }, !0),
                            r(
                              new X({ code: B.JOIN_ROOM_FAILED, message: e.t0 })
                            ));
                        case 40:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this,
                  [[9, 25]]
                );
              })
            )),
            function (e, t, i) {
              return m.apply(this, arguments);
            }),
        },
        {
          key: 'leave',
          value:
            ((f = T(
              A.mark(function e() {
                var t = this;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          if (![D.Leaving, D.Leaved].includes(this.state)) {
                            e.next = 2;
                            break;
                          }
                          return e.abrupt('return');
                        case 2:
                          return (
                            this.logger.buriedLog({ c: Ue.LEAVE }),
                            e.abrupt(
                              'return',
                              new Promise(function (e, i) {
                                var r,
                                  n = Ri(t.publications.entries());
                                try {
                                  var o = function () {
                                    var e = C(r.value, 2),
                                      i = e[0],
                                      n = e[1],
                                      o = t.localStreams.find(function (e) {
                                        return e.streamId === i;
                                      });
                                    (o && o.close(), n.close());
                                  };
                                  for (n.s(); !(r = n.n()).done; ) o();
                                } catch (e) {
                                  n.e(e);
                                } finally {
                                  n.f();
                                }
                                var s,
                                  a = Ri(t.subscriptions.values());
                                try {
                                  for (a.s(); !(s = a.n()).done; ) {
                                    var c = s.value;
                                    (c.stream.close(), c.subscriber.close());
                                  }
                                } catch (e) {
                                  a.e(e);
                                } finally {
                                  a.f();
                                }
                                ((t.state = D.Leaving),
                                  t.xsigoClient.exitRoom(
                                    t.roomId,
                                    function (i, r, n) {
                                      if (1 === i)
                                        t.logger.info('leave room success');
                                      else {
                                        var o = 'leave room failed:, '.concat(
                                          r
                                        );
                                        t.logger.onError(
                                          {
                                            c: Ue.TOP_ERROR,
                                            v: B.LEAVE_ROOM_FAILED,
                                          },
                                          o,
                                          !0
                                        );
                                      }
                                      (t.logger.buriedLog(
                                        { c: Ue.LEAVE_SUCCESS },
                                        !0
                                      ),
                                        (t.state = D.Leaved),
                                        t.reset(),
                                        e(!0));
                                    }
                                  ));
                              })
                            )
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
            )),
            function () {
              return f.apply(this, arguments);
            }),
        },
        {
          key: 'publish',
          value:
            ((p = T(
              A.mark(function e(t) {
                var i,
                  r,
                  n = this;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          if ((this.logger.info('publish stream'), t)) {
                            e.next = 5;
                            break;
                          }
                          throw (
                            this.logger.error('stream is undefined or null'),
                            new X({
                              code: B.INVALID_OPERATION,
                              message: 'stream is undefined or null',
                            })
                          );
                        case 5:
                          if (
                            !(i = [x.Publishing, x.Published]).includes(
                              t.getPubState('audio')
                            ) ||
                            !i.includes(t.getPubState('video'))
                          ) {
                            e.next = 8;
                            break;
                          }
                          throw new X({
                            code: B.INVALID_OPERATION,
                            message:
                              'duplicate publishing, please unpublish and then re-publish',
                          });
                        case 8:
                          if (
                            'live' !== this.mode ||
                            'audience' !== this.role
                          ) {
                            e.next = 10;
                            break;
                          }
                          throw new X({
                            code: B.INVALID_OPERATION,
                            message:
                              'no permission to publish() under live/audience, please call swithRole("anchor") firstly before publish()',
                          });
                        case 10:
                          if (t.mediaStream) {
                            e.next = 12;
                            break;
                          }
                          throw new X({
                            code: B.INVALID_OPERATION,
                            message: 'stream not initialized!',
                          });
                        case 12:
                          return (
                            this.logger.buriedLog({
                              c: t.screen
                                ? Ue.PUBLISH_STREAM_SCREEN
                                : Ue.PUBLISH_STREAM,
                            }),
                            (r = t.mediaStream.getTracks().map(function (e) {
                              return new Promise(function (r, o) {
                                var s = new MediaStream();
                                s.addTrack(e);
                                var a = 'audio' === e.kind,
                                  c = a && !e.enabled,
                                  u = 'video' === e.kind,
                                  d = u && !e.enabled;
                                if (i.includes(t.getPubState(e.kind)))
                                  n.logger.warn(
                                    ''.concat(
                                      a ? 'audio' : 'video',
                                      ' is publishing or published'
                                    )
                                  );
                                else {
                                  t.setPubState(e.kind, x.Publishing);
                                  var l = {
                                    localStream: t,
                                    mediaStream: s,
                                    screen: t.screen,
                                    hasAudio: a,
                                    audioMuted: c,
                                    hasVideo: u,
                                    videoMuted: d,
                                    bitrate: t.getBitrate(),
                                    videoProfile: t.videoProfile,
                                  };
                                  n.doPublish(l, function (i, s, c) {
                                    if (
                                      (n.logger.info(
                                        'xsigo client publish stream success',
                                        c && c.streamId
                                      ),
                                      t.getPubState(e.kind) !== x.Unpublished)
                                    )
                                      if (1 === i)
                                        (t.published ||
                                          ((t.published = !0),
                                          (t.roomId = c.roomId),
                                          (t.streamId = c.streamId),
                                          (t.xsigoClient = n.xsigoClient),
                                          -1 ===
                                            n.localStreams.findIndex(
                                              function (e) {
                                                return (
                                                  e.streamId === c.streamId
                                                );
                                              }
                                            ) &&
                                            (n.localStreams.push(t),
                                            t.onTrackAdd(n.onAddTrack.bind(n)),
                                            t.onTrackRemove(
                                              n.onRemoveTrack.bind(n)
                                            ),
                                            t.onSwitchDevice(
                                              n.onReplaceTrack.bind(n)
                                            ),
                                            t.onReplaceTrack(
                                              n.onReplaceTrack.bind(n)
                                            ))),
                                          a &&
                                            (t.setHasAudio(!!a),
                                            t.setAudioStreamId(c.streamId)),
                                          u &&
                                            (t.setHasVideo(!!u),
                                            t.setVideoStreamId(c.streamId)),
                                          n.logger.buriedLog({
                                            c: t.screen
                                              ? Ue.PUBLISH_STREAM_SCREEN_SUCCESS
                                              : Ue.PUBLISH_STREAM_SUCCESS,
                                            v: a ? 'audio' : 'video',
                                          }),
                                          t.setPubState(e.kind, x.Published),
                                          r(t));
                                      else if (
                                        (n.logger.buriedLog({
                                          c: t.screen
                                            ? Ue.PUBLISH_STREAM_SCREEN_FAILED
                                            : Ue.PUBLISH_STREAM_FAILED,
                                          v: a ? 'audio' : 'video',
                                        }),
                                        c && n.publications.delete(c.streamId),
                                        t.setPubState(e.kind, x.Create),
                                        'H264 not supported' === s)
                                      ) {
                                        n.logger.onError({
                                          c: Ue.TOP_ERROR,
                                          v: B.H264_NOT_SUPPORTED,
                                        });
                                        var d = new X({
                                          code: B.H264_NOT_SUPPORTED,
                                          message:
                                            'publish stream failed h264 not supported',
                                        });
                                        (n._emitter.emit(V, d), o(d));
                                      } else
                                        (n.logger.onError(
                                          {
                                            c: Ue.TOP_ERROR,
                                            v: B.PUBLISH_STREAM_FAILED,
                                          },
                                          s
                                        ),
                                          o(
                                            new X({
                                              code: B.PUBLISH_STREAM_FAILED,
                                              message: s,
                                            })
                                          ));
                                  });
                                }
                              });
                            })),
                            e.abrupt('return', Promise.all(r))
                          );
                        case 16:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this
                );
              })
            )),
            function (e) {
              return p.apply(this, arguments);
            }),
        },
        {
          key: 'onAddTrack',
          value: function (e) {
            var t = this,
              i = e.track,
              r = e.streamId,
              n = new MediaStream();
            n.addTrack(i);
            var o = 'audio' === i.kind,
              s = o && !i.enabled,
              a = 'video' === i.kind,
              c = a && !i.enabled,
              u = this.localStreams.find(function (e) {
                return e.streamId === r;
              });
            if (
              (this.logger.info('PublishState', u && u.getPubState(i.kind)),
              u && ![x.Publishing, x.Published].includes(u.getPubState(i.kind)))
            ) {
              var d = {
                localStream: u,
                screen: !1,
                hasAudio: o,
                audioMuted: s,
                hasVideo: a,
                videoMuted: c,
                mediaStream: n,
                bitrate: u.getBitrate(),
                videoProfile: u.videoProfile,
              };
              (u.setPubState(i.kind, x.Publishing),
                this.doPublish(d, function (e, r, n) {
                  u.getPubState(i.kind) !== x.Unpublished &&
                    (1 === e
                      ? (u.mediaStream.addTrack(i),
                        (u.published = !0),
                        o &&
                          (u.setHasAudio(o),
                          u.setAudioStreamId(n.streamId),
                          u.setAudioTrack(i)),
                        a &&
                          (u.setHasVideo(a),
                          u.setVideoStreamId(n.streamId),
                          u.setVideoTrack(i)),
                        u.setPubState(i.kind, x.Published))
                      : (n && t.publications.delete(n.streamId),
                        u.setPubState(i.kind, x.Create)),
                    t.logger.buriedLog({
                      c:
                        1 === e
                          ? Ue.PUBLISH_STREAM_SUCCESS
                          : Ue.PUBLISH_STREAM_FAILED,
                      v: o ? 'addAudioTrack' : 'addVideoTrack',
                    }),
                    u._emitter.emit('stream-track-update-result', {
                      code: e,
                      message: r,
                    }));
                }));
            } else
              (i.stop(),
                this.logger.warn(
                  u
                    ? 'same track is publishing or published'
                    : 'stream is not published'
                ));
          },
        },
        {
          key: 'doPublish',
          value:
            ((h = T(
              A.mark(function e(t, i) {
                var r, n, o, s, a, c, u, d;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          return (
                            (e.prev = 0),
                            (c = (o = t || {}).localStream),
                            (u = new pt({
                              roomId: this.roomId,
                              userId: this.userId,
                              mediaStream: o.mediaStream,
                              screen: o.screen,
                              bitrate: o.bitrate,
                              isEnableSmallStream: this.isEnableSmallStream,
                              smallStreamConfig: this.smallStreamConfig,
                              hasAudio: (s = o.hasAudio),
                              audioMuted: o.audioMuted,
                              hasVideo: (a = o.hasVideo),
                              videoMuted: o.videoMuted,
                              minBitrate:
                                (null === (r = t.videoProfile) || void 0 === r
                                  ? void 0
                                  : r.minBitrate) || 0,
                              maxBitrate:
                                (null === (n = t.videoProfile) || void 0 === n
                                  ? void 0
                                  : n.maxBitrate) || 0,
                              logger: this.logger,
                              xsigoClient: this.xsigoClient,
                              onPublish: i,
                            })),
                            (e.next = 5),
                            u.publish()
                          );
                        case 5:
                          ('string' != typeof (d = e.sent) ||
                            this.publications.has(d) ||
                            (u.onPublishPeerConnectionFailed(
                              this.onPublishPeerConnectionFailed.bind(this)
                            ),
                            this.publications.set(d, u),
                            (c.streamId = d),
                            s && c.setAudioStreamId(d),
                            a && c.setVideoStreamId(d)),
                            (e.next = 12));
                          break;
                        case 9:
                          ((e.prev = 9), (e.t0 = e.catch(0)), i && i(0, e.t0));
                        case 12:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this,
                  [[0, 9]]
                );
              })
            )),
            function (e, t) {
              return h.apply(this, arguments);
            }),
        },
        {
          key: 'onPublishPeerConnectionFailed',
          value: function (e) {
            var t = this,
              i = e.state,
              r = e.streamId,
              n = this.xsigoClient.getWsState(this.roomId);
            if (this.publications.has(r)) {
              var o = this.localStreams.find(function (e) {
                return [e.audioStreamId, e.videoStreamId].includes(r);
              });
              o &&
                ('failed' === i &&
                n &&
                ['CONNECTED', 'RECOVERY'].includes(n.state)
                  ? (this.logger.warn(
                      'publish peerConnection failed try to republish streamId:'.concat(
                        r
                      )
                    ),
                    o.updatePeerConnectionFailed(i),
                    this.doUnpublish(o, r).then(function () {
                      var e = new MediaStream(),
                        i = o.audioStreamId === r,
                        n = o.videoStreamId === r,
                        s = i ? o.getAudioTrack() : o.getVideoTrack(),
                        a = i && !s.enabled,
                        c = n && !s.enabled;
                      (t.logger.info(
                        'publish '
                          .concat(i ? 'audio' : 'video', ',trackId:')
                          .concat(s && s.id)
                      ),
                        e.addTrack(s));
                      var u = {
                        localStream: o,
                        screen: o.screen,
                        hasAudio: i,
                        audioMuted: a,
                        hasVideo: n,
                        videoMuted: c,
                        mediaStream: e,
                        bitrate: o.getBitrate(),
                      };
                      t.doPublish(u, function (e, r, s) {
                        1 === e
                          ? ((o.published = !0),
                            i &&
                              (o.setHasAudio(i),
                              o.setAudioStreamId(s.streamId)),
                            n &&
                              (o.setHasVideo(n),
                              o.setVideoStreamId(s.streamId)))
                          : s && t.publications.delete(s.streamId);
                      });
                    }))
                  : 'connected' === i && o.updatePeerConnectionFailed(i));
            }
          },
        },
        {
          key: 'onRemoveTrack',
          value: function (e) {
            var t = this,
              i = e.track,
              r = e.streamId,
              n = i.kind,
              o = this.localStreams.find(function (e) {
                return e.streamId === r;
              });
            if (
              o &&
              ![x.Create, x.Unpublished].includes(o.getPubState(i.kind))
            ) {
              var s = 'audio' === n ? o.audioStreamId : o.videoStreamId;
              (o.mediaStream.removeTrack(i),
                'audio' === n && o.setHasAudio(!1),
                'video' === n && o.setHasVideo(!1),
                this.doUnpublish(o, s, function (e, i) {
                  (1 === e && t.logger.info('remove track success'),
                    o._emitter.emit('stream-track-update-result', {
                      code: e,
                      message: i,
                    }));
                }));
            } else this.logger.warn('stream is not published');
          },
        },
        {
          key: 'onReplaceTrack',
          value: function (e) {
            var t = e.streamId,
              i = e.type,
              r = e.track,
              n = this.localStreams.find(function (e) {
                return e.streamId === t;
              });
            if (n) {
              var o = 'audio' === i ? n.audioStreamId : n.videoStreamId;
              o &&
                this.publications.has(o) &&
                this.publications.get(o).replaceMediaStreamTrack(r);
            }
          },
        },
        {
          key: 'unpublish',
          value: function (e) {
            var t = this;
            if ((this.logger.info('unpublish stream'), !e))
              throw (
                this.logger.error('stream is undefined or null'),
                new X({
                  code: B.INVALID_OPERATION,
                  message: 'stream is undefined or null',
                })
              );
            this.logger.buriedLog({
              c: e.screen ? Ue.UNPUBLISH_STREAM_SCREEN : Ue.UNPUBLISH_STREAM,
            });
            var i,
              r = [],
              n = Ri(this.publications.keys());
            try {
              for (n.s(); !(i = n.n()).done; ) {
                var o = i.value;
                [e.audioStreamId, e.videoStreamId].includes(o) &&
                  r.push(this.doUnpublish(e, o));
              }
            } catch (e) {
              n.e(e);
            } finally {
              n.f();
            }
            return Promise.all(r).then(function () {
              var i = t.localStreams.findIndex(function (t) {
                return t.getId() === e.getId();
              });
              -1 !== i && t.localStreams.splice(i, 1);
            });
          },
        },
        {
          key: 'doUnpublish',
          value: function (e, t, i) {
            var r = this;
            return new Promise(function (n, o) {
              var s = r.publications.get(t);
              if (s) {
                (r.publications.delete(t),
                  e.audioStreamId === t && e.setHasAudio(!1),
                  e.videoStreamId === t && e.setHasVideo(!1));
                var a = e.screen
                  ? 'share_'.concat(e.getUserId())
                  : e.getUserId();
                if (
                  (e.hasAudio() || e.hasVideo() || (e.published = !1),
                  e.setPubState(
                    e.audioStreamId === t ? 'audio' : 'video',
                    x.Unpublished
                  ),
                  r.senderStats.has(a))
                ) {
                  var c = Ti({}, r.senderStats.get(a));
                  (e.hasAudio() ||
                    (c.audio = {
                      bytesSent: 0,
                      timestamp: 0,
                      retransmittedPacketsSent: 0,
                      packetsSent: 0,
                      packetLossRate: 0,
                    }),
                    e.hasVideo() ||
                      ((c.video = {
                        bytesSent: 0,
                        timestamp: 0,
                        retransmittedPacketsSent: 0,
                        packetsSent: 0,
                        packetLossRate: 0,
                      }),
                      (c.smallVideo = {
                        bytesSent: 0,
                        timestamp: 0,
                        retransmittedPacketsSent: 0,
                        packetsSent: 0,
                        packetLossRate: 0,
                      })),
                    r.senderStats.set(a, c));
                }
                (n(!0),
                  s.unpublish(function (n, o, s) {
                    1 === n
                      ? (r.logger.info('unpublish stream success', t),
                        i && i(n, o),
                        r.logger.buriedLog({
                          c: e.screen
                            ? Ue.UNPUBLISH_STREAM_SCREEN_SUCCESS
                            : Ue.UNPUBLISH_STREAM_SUCCESS,
                          v: e.audioStreamId === t ? 'audio' : 'video',
                        }))
                      : (r.logger.buriedLog({
                          c: e.screen
                            ? Ue.UNPUBLISH_STREAM_SCREEN_FAILED
                            : Ue.UNPUBLISH_STREAM_FAILED,
                          v: e.audioStreamId === t ? 'audio' : 'video',
                        }),
                        i && i(n, o),
                        r.logger.onError(
                          { c: Ue.TOP_ERROR, v: B.UNPUBLISH_STREAM_FAILED },
                          'unpublish stream with response:, '
                            .concat(n, ',')
                            .concat(o)
                        ));
                  }));
              } else (r.logger.warn('stream is not published', t), n(!0));
            });
          },
        },
        {
          key: 'subscribe',
          value:
            ((l = T(
              A.mark(function e(t, i) {
                var r, n, o;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          if (t) {
                            e.next = 3;
                            break;
                          }
                          throw (
                            this.logger.error('stream is undefined or null'),
                            new X({
                              code: B.INVALID_OPERATION,
                              message: 'stream is undefined or null',
                            })
                          );
                        case 3:
                          if (t.isRemote) {
                            e.next = 6;
                            break;
                          }
                          throw (
                            this.logger.error(
                              'try to subscribe a local stream'
                            ),
                            new X({
                              code: B.INVALID_OPERATION,
                              message: 'try to subscribe a local stream',
                            })
                          );
                        case 6:
                          if (
                            !(r = [M.Subscribing, M.Subscribed]).includes(
                              t.getSubState('audio')
                            ) ||
                            !r.includes(t.getSubState('video'))
                          ) {
                            e.next = 10;
                            break;
                          }
                          throw (
                            this.logger.error(
                              'Stream already subscribing or subscribed'
                            ),
                            new X({
                              code: B.INVALID_OPERATION,
                              message:
                                'Stream already subscribing or subscribed',
                            })
                          );
                        case 10:
                          return (
                            !i && (i = { audio: !0, video: !0, small: !1 }),
                            (n = t.getUserSeq()),
                            (t = this.remoteStreams.get(n)),
                            this.logger.info(
                              'subscribe with options:',
                              JSON.stringify(i, null, 4),
                              t
                            ),
                            this.subscribeManager.setSubscriptionOpts(n, i),
                            (o = []),
                            t &&
                            t.audioStreamId &&
                            !r.includes(t.getSubState('audio'))
                              ? i.audio &&
                                o.push(
                                  this.doSubscribe(t, {
                                    audio: !0,
                                    video: !1,
                                    small: !!i.small && i.small,
                                  })
                                )
                              : r.includes(t.getSubState('audio')) &&
                                this.logger.warn(
                                  'audio is subscribing or subscribed'
                                ),
                            t &&
                            t.videoStreamId &&
                            !r.includes(t.getSubState('video'))
                              ? i.video &&
                                o.push(
                                  this.doSubscribe(t, {
                                    audio: !1,
                                    video: !0,
                                    small: !!i.small && i.small,
                                  })
                                )
                              : r.includes(t.getSubState('video')) &&
                                this.logger.warn(
                                  'video is subscribing or subscribed'
                                ),
                            e.abrupt('return', Promise.all(o))
                          );
                        case 19:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this
                );
              })
            )),
            function (e, t) {
              return l.apply(this, arguments);
            }),
        },
        {
          key: 'doSubscribe',
          value:
            ((d = T(
              A.mark(function e(t, i, r) {
                var n = this;
                return A.wrap(function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        return e.abrupt(
                          'return',
                          new Promise(
                            (function () {
                              var e = T(
                                A.mark(function e(o, s) {
                                  var a, c, u, d, l, h, p, f, m, g;
                                  return A.wrap(
                                    function (e) {
                                      for (;;)
                                        switch ((e.prev = e.next)) {
                                          case 0:
                                            return (
                                              (e.prev = 0),
                                              n.logger.info(
                                                'doSubscribe options',
                                                JSON.stringify(i, null, 4)
                                              ),
                                              (a = t.getUserSeq()),
                                              (c = t.getSimulcasts()),
                                              (l = !!i.small && i.small),
                                              n.logger.info(
                                                '---do subscribe options',
                                                (u = i.audio
                                                  ? t.audio
                                                  : i.audio),
                                                (d = i.video
                                                  ? t.video
                                                  : i.video)
                                              ),
                                              n.logger.buriedLog({
                                                c:
                                                  t.getType() === N
                                                    ? Ue.SUBSCRIBE_STREAM_SCREEN
                                                    : Ue.SUBSCRIBE_STREAM,
                                                v: 'uid:'
                                                  .concat(t.getUserId(), ',')
                                                  .concat(
                                                    u ? 'audio' : 'video'
                                                  ),
                                              }),
                                              t.setSubState(
                                                u ? 'audio' : 'video',
                                                M.Subscribing
                                              ),
                                              u &&
                                                n.subscribeManager.updateSubscriptedState(
                                                  a,
                                                  { audio: u, small: l }
                                                ),
                                              d &&
                                                n.subscribeManager.updateSubscriptedState(
                                                  a,
                                                  { video: d, small: l }
                                                ),
                                              (h = 0),
                                              (p = 0),
                                              (f = new Dt({
                                                userId: t.userId,
                                                publisherUserId: t.getUserId(),
                                                hasAudio: u,
                                                hasVideo: d,
                                                simulcast: c,
                                                audioStreamId: u
                                                  ? t.audioStreamId
                                                  : null,
                                                videoStreamId: d
                                                  ? t.videoStreamId
                                                  : null,
                                                logger: n.logger,
                                                xsigoClient: n.xsigoClient,
                                                roomId: n.roomId,
                                                small: l,
                                                onRemoteStream: (function () {
                                                  var e = T(
                                                    A.mark(
                                                      function e(i, s, c, l) {
                                                        var f, m, g;
                                                        return A.wrap(function (
                                                          e
                                                        ) {
                                                          for (;;)
                                                            switch (
                                                              (e.prev = e.next)
                                                            ) {
                                                              case 0:
                                                                if (
                                                                  !u ||
                                                                  t.getSubState(
                                                                    'audio'
                                                                  ) !==
                                                                    M.Unsubscribed
                                                                ) {
                                                                  e.next = 2;
                                                                  break;
                                                                }
                                                                return e.abrupt(
                                                                  'return'
                                                                );
                                                              case 2:
                                                                if (
                                                                  !d ||
                                                                  t.getSubState(
                                                                    'video'
                                                                  ) !==
                                                                    M.Unsubscribed
                                                                ) {
                                                                  e.next = 4;
                                                                  break;
                                                                }
                                                                return e.abrupt(
                                                                  'return'
                                                                );
                                                              case 4:
                                                                ((f =
                                                                  n.remoteStreams.get(
                                                                    a
                                                                  )),
                                                                  'audio' ===
                                                                    s.kind &&
                                                                    h++,
                                                                  'video' ===
                                                                    s.kind &&
                                                                    p++,
                                                                  f &&
                                                                    ((c !==
                                                                      pe.AudioVideo &&
                                                                      c !==
                                                                        pe.VideoOnly) ||
                                                                      f.setIsAlphaChannels(
                                                                        l
                                                                      ),
                                                                    f.mediaStream ||
                                                                      f.setMediaStream(
                                                                        i
                                                                      ),
                                                                    'audio' ===
                                                                      s.kind &&
                                                                      (h > 1 ||
                                                                        r ||
                                                                        !f.getAudioTrack()) &&
                                                                      (f.updateTrack(
                                                                        'audio',
                                                                        s
                                                                      ),
                                                                      r || h > 1
                                                                        ? f.setAudioTrack(
                                                                            s
                                                                          )
                                                                        : f.restartAudio()),
                                                                    'video' ===
                                                                      s.kind &&
                                                                      (p > 1 ||
                                                                        r ||
                                                                        !f.getVideoTrack()) &&
                                                                      (f.updateTrack(
                                                                        'video',
                                                                        s
                                                                      ),
                                                                      r || p > 1
                                                                        ? f.setVideoTrack(
                                                                            s
                                                                          )
                                                                        : f.restartVideo()),
                                                                    n.subscribeManager.addSubscriptionRecord(
                                                                      a,
                                                                      f
                                                                    ),
                                                                    (m =
                                                                      t.getType() ===
                                                                      N
                                                                        ? 'share_'.concat(
                                                                            t.getUserId()
                                                                          )
                                                                        : t.getUserId()),
                                                                    f.subscribed
                                                                      ? (n._emitter.emit(
                                                                          'stream-updated',
                                                                          {
                                                                            stream:
                                                                              f,
                                                                          }
                                                                        ),
                                                                        (g =
                                                                          ''),
                                                                        c ===
                                                                        pe.AudioOnly
                                                                          ? (g =
                                                                              f.audioMuted
                                                                                ? 'mute-audio'
                                                                                : 'unmute-audio')
                                                                          : c ===
                                                                              pe.VideoOnly &&
                                                                            (g =
                                                                              f.videoMuted
                                                                                ? 'mute-video'
                                                                                : 'unmute-video'),
                                                                        n._emitter.emit(
                                                                          g,
                                                                          {
                                                                            userId:
                                                                              m,
                                                                          }
                                                                        ))
                                                                      : ((f.subscribed =
                                                                          !0),
                                                                        n.logger.buriedLog(
                                                                          {
                                                                            c:
                                                                              t.getType() ===
                                                                              N
                                                                                ? Ue.ON_STREAM_SUBSCRIBED_SCREEN
                                                                                : Ue.ON_STREAM_SUBSCRIBED,
                                                                            v: 'uid:'.concat(
                                                                              t.getUserId()
                                                                            ),
                                                                          }
                                                                        ),
                                                                        n._emitter.emit(
                                                                          'stream-subscribed',
                                                                          {
                                                                            stream:
                                                                              f,
                                                                          }
                                                                        ),
                                                                        f.getType() ===
                                                                          N &&
                                                                          n.isWaterMark &&
                                                                          f.startWaterMark(
                                                                            n.waterMarkoptions,
                                                                            n.waterMarkImage
                                                                          ),
                                                                        c ===
                                                                        pe.AudioOnly
                                                                          ? n._emitter.emit(
                                                                              f.audioMuted
                                                                                ? 'mute-audio'
                                                                                : 'unmute-audio',
                                                                              {
                                                                                userId:
                                                                                  m,
                                                                              }
                                                                            )
                                                                          : c ===
                                                                              pe.VideoOnly &&
                                                                            n._emitter.emit(
                                                                              f.videoMuted
                                                                                ? 'mute-video'
                                                                                : 'unmute-video',
                                                                              {
                                                                                userId:
                                                                                  m,
                                                                              }
                                                                            )),
                                                                    t.setSubState(
                                                                      u
                                                                        ? 'audio'
                                                                        : 'video',
                                                                      M.Subscribed
                                                                    ),
                                                                    o(!0)));
                                                              case 8:
                                                              case 'end':
                                                                return e.stop();
                                                            }
                                                        }, e);
                                                      }
                                                    )
                                                  );
                                                  return function (t, i, r, n) {
                                                    return e.apply(
                                                      this,
                                                      arguments
                                                    );
                                                  };
                                                })(),
                                                onSubscribe: function (
                                                  e,
                                                  i,
                                                  r
                                                ) {
                                                  var o =
                                                    n.subscribeManager.getSubscriptedState(
                                                      a
                                                    );
                                                  if (
                                                    !(
                                                      (u &&
                                                        t.getSubState(
                                                          'audio'
                                                        ) === M.Unsubscribed) ||
                                                      (d &&
                                                        t.getSubState(
                                                          'video'
                                                        ) === M.Unsubscribed)
                                                    )
                                                  )
                                                    if (1 === e)
                                                      (u && (o.audio = !0),
                                                        d && (o.video = !0),
                                                        n.subscribeManager.updateSubscriptedState(
                                                          a,
                                                          o
                                                        ),
                                                        c.length &&
                                                          (l
                                                            ? c.find(
                                                                function (e) {
                                                                  return (
                                                                    e.type ===
                                                                    ve.SmallStream
                                                                  );
                                                                }
                                                              ) &&
                                                              t.setSimulcastType(
                                                                ve.SmallStream
                                                              )
                                                            : t.setSimulcastType(
                                                                c[0].type
                                                              )),
                                                        n.logger.info(
                                                          'subscribe stream success'
                                                        ),
                                                        n.logger.buriedLog({
                                                          c:
                                                            t.getType() === N
                                                              ? Ue.SUBSCRIBE_STREAM_SCREEN_SUCCESS
                                                              : Ue.SUBSCRIBE_STREAM_SUCCESS,
                                                          v: 'uid:'
                                                            .concat(
                                                              t.getUserId(),
                                                              ','
                                                            )
                                                            .concat(
                                                              u
                                                                ? 'audio'
                                                                : 'video'
                                                            ),
                                                        }));
                                                    else {
                                                      (n.logger.onError(
                                                        {
                                                          c: Ue.TOP_ERROR,
                                                          v: B.SUBSCRIBE_FAILED,
                                                        },
                                                        'on subscribe stream with response:, '
                                                          .concat(e, ', ')
                                                          .concat(i)
                                                      ),
                                                        n.logger.buriedLog({
                                                          c:
                                                            t.getType() === N
                                                              ? Ue.SUBSCRIBE_STREAM_SCREEN_FAILED
                                                              : Ue.SUBSCRIBE_STREAM_FAILED,
                                                          v: 'uid:'
                                                            .concat(
                                                              t.getUserId(),
                                                              ','
                                                            )
                                                            .concat(
                                                              u
                                                                ? 'audio'
                                                                : 'video'
                                                            ),
                                                        }),
                                                        n.subscriptions.delete(
                                                          r.subscriptionId
                                                        ),
                                                        t.setSubState(
                                                          u ? 'audio' : 'video',
                                                          M.Create
                                                        ));
                                                      var h =
                                                          n.subscribeManager.getSubscriptedState(
                                                            a
                                                          ),
                                                        p =
                                                          n.subscribeManager.needSubscribeKind(
                                                            a
                                                          );
                                                      (p === pe.AudioVideo &&
                                                        h.audio &&
                                                        h.video &&
                                                        (u &&
                                                          n.subscribeManager.updateSubscriptedState(
                                                            a,
                                                            { audio: !1 }
                                                          ),
                                                        d &&
                                                          n.subscribeManager.updateSubscriptedState(
                                                            a,
                                                            { video: !1 }
                                                          )),
                                                        p === pe.VideoOnly &&
                                                          d &&
                                                          n.subscribeManager.updateSubscriptedState(
                                                            a,
                                                            { video: !1 }
                                                          ),
                                                        p === pe.AudioVideo &&
                                                          u &&
                                                          n.subscribeManager.updateSubscriptedState(
                                                            a,
                                                            { audio: !1 }
                                                          ),
                                                        s(
                                                          new X({
                                                            code: B.SUBSCRIBE_FAILED,
                                                            message: i,
                                                          })
                                                        ));
                                                    }
                                                },
                                              })),
                                              (e.next = 17),
                                              f.subscribe()
                                            );
                                          case 17:
                                            if (
                                              ((m = e.sent),
                                              n.logger.info(
                                                'time Date.now doSubscribe',
                                                n.remoteStreams.has(a),
                                                t.audioStreamId,
                                                t.videoStreamId
                                              ),
                                              !u || t.audioStreamId)
                                            ) {
                                              e.next = 21;
                                              break;
                                            }
                                            return e.abrupt(
                                              'return',
                                              f.close()
                                            );
                                          case 21:
                                            if (!d || t.videoStreamId) {
                                              e.next = 23;
                                              break;
                                            }
                                            return e.abrupt(
                                              'return',
                                              f.close()
                                            );
                                          case 23:
                                            (n.subscriptions.has(m) ||
                                              (f.onSubscribePeerConnectionFailed(
                                                n.onSubscribePeerConnectionFailed.bind(
                                                  n
                                                )
                                              ),
                                              n.subscriptions.set(m, {
                                                subscriber: f,
                                                stream: t,
                                              })),
                                              u && t.setAudioSubscriptionId(m),
                                              d && t.setVideoSubscriptionId(m),
                                              (e.next = 31));
                                            break;
                                          case 28:
                                            ((e.prev = 28),
                                              (e.t0 = e.catch(0)),
                                              'H264 not supported' === e.t0
                                                ? (n.logger.onError(
                                                    {
                                                      c: Ue.TOP_ERROR,
                                                      v: B.H264_NOT_SUPPORTED,
                                                    },
                                                    'subscribe stream failed h264 not supported'
                                                  ),
                                                  (g = new X({
                                                    code: B.H264_NOT_SUPPORTED,
                                                    message:
                                                      'subscribe stream failed h264 not supported',
                                                  })),
                                                  n._emitter.emit(V, g))
                                                : (n.logger.onError(
                                                    {
                                                      c: Ue.TOP_ERROR,
                                                      v: B.SUBSCRIBE_FAILED,
                                                    },
                                                    'subscribe stream error:, '.concat(
                                                      e.t0,
                                                      '}'
                                                    )
                                                  ),
                                                  s(
                                                    new X({
                                                      code: B.SUBSCRIBE_FAILED,
                                                      message: e.t0,
                                                    })
                                                  )));
                                          case 31:
                                          case 'end':
                                            return e.stop();
                                        }
                                    },
                                    e,
                                    null,
                                    [[0, 28]]
                                  );
                                })
                              );
                              return function (t, i) {
                                return e.apply(this, arguments);
                              };
                            })()
                          )
                        );
                      case 1:
                      case 'end':
                        return e.stop();
                    }
                }, e);
              })
            )),
            function (e, t, i) {
              return d.apply(this, arguments);
            }),
        },
        {
          key: 'onSubscribePeerConnectionFailed',
          value: function (e) {
            var t = this,
              i = e.state,
              r = e.subscriptionId,
              n = this.xsigoClient.getWsState(this.roomId);
            if (this.subscriptions.has(r)) {
              var o = this.subscribeManager.getSubscriptionOpts(this.userId),
                s = this.subscriptions.get(r).stream;
              if (s)
                if (
                  'failed' === i &&
                  n &&
                  ['CONNECTED', 'RECOVERY'].includes(n.state)
                ) {
                  (this.logger.warn(
                    'subscribe peerConnection failed try to resubscribe subscriptionId:'.concat(
                      r
                    )
                  ),
                    s.updatePeerConnectionFailed(i));
                  var a = s.audioSubscriptionId,
                    c = s.videoSubscriptionId;
                  this.doUnsubscribe(s, r).then(function () {
                    (a === r &&
                      o.audio &&
                      t.doSubscribe(
                        s,
                        { audio: !0, video: !1, small: !!o.small && o.small },
                        !0
                      ),
                      c === r &&
                        o.video &&
                        t.doSubscribe(
                          s,
                          { audio: !1, video: !0, small: !!o.small && o.small },
                          !0
                        ));
                  });
                } else 'connected' === i && s.updatePeerConnectionFailed(i);
            }
          },
        },
        {
          key: 'unsubscribe',
          value: function (e) {
            if (!e)
              throw (
                this.logger.error('stream is undefined or null'),
                new X({
                  code: B.INVALID_OPERATION,
                  message: 'stream is undefined or null',
                })
              );
            var t = [],
              i = this.subscribeManager.getSubscriptionOpts(e.getUserSeq());
            return (
              e.setSubState('audio', M.Unsubscribed),
              e.setSubState('video', M.Unsubscribed),
              i.audio &&
                e.audioSubscriptionId &&
                (t.push(this.doUnsubscribe(e, e.audioSubscriptionId)),
                e.setEnableTrackFlag('audio', !0)),
              i.video &&
                e.videoSubscriptionId &&
                (t.push(this.doUnsubscribe(e, e.videoSubscriptionId)),
                e.setEnableTrackFlag('video', !0)),
              Promise.all(t)
            );
          },
        },
        {
          key: 'doUnsubscribe',
          value: function (e, t) {
            var i = this,
              r = e.audioSubscriptionId && e.audioSubscriptionId === t,
              n = e.videoSubscriptionId && e.videoSubscriptionId === t;
            this.logger.buriedLog({
              c:
                e.getType() === N
                  ? Ue.UNSUBSCRIBE_STREAM_SCREEN
                  : Ue.UNSUBSCRIBE_STREAM,
              v: 'uid:'
                .concat(e.getUserId(), ',')
                .concat(r ? 'audio' : 'video'),
            });
            var o = e.getUserSeq(),
              s = this.remoteStreams.get(o),
              a = this.subscribeManager.getSubscriptedState(o);
            return (
              s &&
                r &&
                (s.getAudioTrack() &&
                  s.mediaStream.removeTrack(s.getAudioTrack()),
                s.setSubState('audio', M.Unsubscribed),
                e.setAudioSubscriptionId(null),
                this.subscribeManager.updateSubscriptedState(
                  o,
                  Ti(Ti({}, a), {}, { audio: !1, small: !1 })
                )),
              s &&
                n &&
                (s.getVideoTrack() &&
                  s.mediaStream.removeTrack(s.getVideoTrack()),
                s.setSubState('video', M.Unsubscribed),
                e.setVideoSubscriptionId(null),
                this.subscribeManager.updateSubscriptedState(
                  o,
                  Ti(Ti({}, a), {}, { video: !1, small: !1 })
                )),
              !s ||
                e.getAudioTrack() ||
                e.getVideoTrack() ||
                ((s.subscribed = !1), (s.mediaStream = null)),
              this.receiverStats.has(o) && this.receiverStats.delete(o),
              new Promise(function (n, o) {
                if (i.subscriptions.has(t)) {
                  var s = i.subscriptions.get(t);
                  (i.subscriptions.delete(t),
                    n(!0),
                    s.subscriber.unsubscribe(function (t, n, o) {
                      1 === t
                        ? (i.logger.info('unsubscribe stream success'),
                          i.logger.buriedLog({
                            c:
                              e.getType() === N
                                ? Ue.UNSUBSCRIBE_STREAM_SCREEN_SUCCESS
                                : Ue.UNSUBSCRIBE_STREAM_SUCCESS,
                            v: 'uid:'
                              .concat(e.getUserId(), ',')
                              .concat(r ? 'audio' : 'video'),
                          }))
                        : (i.logger.buriedLog({
                            c:
                              e.getType() === N
                                ? Ue.UNSUBSCRIBE_STREAM_SCREEN_FAILED
                                : Ue.UNSUBSCRIBE_STREAM_FAILED,
                            v: 'uid:'
                              .concat(e.getUserId(), ',')
                              .concat(r ? 'audio' : 'video'),
                          }),
                          i.logger.onError(
                            { c: Ue.TOP_ERROR, v: B.UNSUBSCRIBE_FAILED },
                            'unsubscribe stream with response:,'
                              .concat(t, ', ')
                              .concat(n)
                          ));
                    }));
                } else
                  (i.logger.warn('stream is not subscribed', e.getUserId()),
                    i.logger.buriedLog({
                      c:
                        e.getType() === N
                          ? Ue.UNSUBSCRIBE_STREAM_SCREEN_SUCCESS
                          : Ue.UNSUBSCRIBE_STREAM_SUCCESS,
                      v: 'uid:'
                        .concat(e.getUserId(), ',')
                        .concat(r ? 'audio' : 'video'),
                    }),
                    n(!0));
              })
            );
          },
        },
        {
          key: 'updateSimulcast',
          value: function (e, t) {
            var i = this;
            return new Promise(function (r, n) {
              var o = i.publications.get(e.videoStreamId);
              if (!o && e.screen)
                throw new X({
                  code: B.INVALID_OPERATION,
                  message: 'stream is invalid',
                });
              var s = t.map(function (e) {
                  return {
                    type: Pe(e.rid),
                    maxWidth: e.maxWidth,
                    maxHeight: e.maxHeight,
                  };
                }),
                a = e.getSimulcasts();
              if (JSON.stringify(s) === JSON.stringify(a))
                return i.logger.warn('simulcast  '.concat(t, ' is same'));
              (i.logger.info('Update Simulcast '.concat(t)),
                o.updateSimulcast(s, function (e, o, s) {
                  if (1 === e)
                    (r(!0),
                      i.logger.info('Update Simulcast '.concat(t, ' Success')));
                  else {
                    i.logger.onError({
                      c: Ue.TOP_ERROR,
                      v: B.LOCAL_SWITCH_SIMULCAST,
                    });
                    var a = new X({
                      code: B.LOCAL_SWITCH_SIMULCAST,
                      message: o,
                    });
                    n(a);
                  }
                }));
            });
          },
        },
        {
          key: 'setRemoteVideoStreamType',
          value: function (e, t) {
            var i = this;
            if (!e || !t)
              throw (
                this.logger.error('stream or status is undefined or null'),
                new X({
                  code: B.INVALID_OPERATION,
                  message: 'stream or status is undefined or null',
                })
              );
            return new Promise(function (r, n) {
              var o = { big: 'h', small: 'l' }[t];
              if (!o)
                throw new X({
                  code: B.INVALID_OPERATION,
                  message: 'status: '.concat(t, ' is invalid'),
                });
              var s = i.getRemoteMutedState().filter(function (t) {
                return t.userId === e.getUserId();
              })[0];
              if ('small' === t && s && !s.hasSmall)
                throw new X({
                  code: B.INVALID_OPERATION,
                  message: 'does not publish small stream',
                });
              var a = i.subscriptions.get(e.videoSubscriptionId);
              if (!a)
                throw new X({
                  code: B.INVALID_OPERATION,
                  message: 'remoteStream is invalid',
                });
              var c = Pe(o);
              if (e.getSimulcastType() === c)
                return i.logger.warn('status '.concat(t, ' is same'));
              (i.logger.info('Set Remote Video Stream Type '.concat(t)),
                i.logger.buriedLog({
                  c:
                    c === ve.SmallStream
                      ? Ue.SET_REMOTE_VIDEO_STREAM_TYPE_SAMLL
                      : Ue.SET_REMOTE_VIDEO_STREAM_TYPE_BIG,
                }),
                a.subscriber.switchSimulcast(c, function (o, s, a) {
                  if (1 === o)
                    (e.setSimulcastType(c),
                      i.logger.info(
                        'Set Remote Video Stream Type '.concat(t, ' Success')
                      ),
                      i.logger.buriedLog({
                        c:
                          c === ve.SmallStream
                            ? Ue.SET_REMOTE_VIDEO_STREAM_TYPE_SAMLL_SUCCESS
                            : Ue.SET_REMOTE_VIDEO_STREAM_TYPE_BIG_SUCCESSE,
                      }),
                      r(!0));
                  else {
                    var u = new X({
                      code: B.REMOTE_SWITCH_SIMULCAST,
                      message: s,
                    });
                    (i.logger.onError(
                      { c: Ue.TOP_ERROR, v: B.LOCAL_SWITCH_SIMULCAST },
                      s
                    ),
                      i.logger.buriedLog({
                        c:
                          c === ve.SmallStream
                            ? Ue.SET_REMOTE_VIDEO_STREAM_TYPE_SAMLL_FAILED
                            : Ue.SET_REMOTE_VIDEO_STREAM_TYPE_BIG_FAILED,
                      }),
                      n(u));
                  }
                }));
            });
          },
        },
        {
          key: 'switchRole',
          value:
            ((u = T(
              A.mark(function e(t) {
                var i,
                  r,
                  n,
                  o = this;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          if (t) {
                            e.next = 2;
                            break;
                          }
                          throw new X({
                            code: B.INVALID_OPERATION,
                            message: 'role is undefined or null',
                          });
                        case 2:
                          if ('rtc' !== this.mode) {
                            e.next = 4;
                            break;
                          }
                          throw new X({
                            code: B.INVALID_OPERATION,
                            message: 'role is only valid in live mode',
                          });
                        case 4:
                          if ('anchor' === t || 'audience' === t) {
                            e.next = 7;
                            break;
                          }
                          throw (
                            this.logger.onError({
                              c: Ue.TOP_ERROR,
                              v: B.INVALID_PARAMETER,
                            }),
                            new X({
                              code: B.INVALID_PARAMETER,
                              message:
                                'role could only be set to a value as anchor or audience',
                            })
                          );
                        case 7:
                          if (t !== this.role) {
                            e.next = 10;
                            break;
                          }
                          return (
                            this.logger.warn('can not switch the same role'),
                            e.abrupt('return', Promise.resolve(!0))
                          );
                        case 10:
                          if (
                            (this.logger.buriedLog({
                              c:
                                'anchor' === t
                                  ? Ue.SWITCH_ROLE_ANCHOR
                                  : Ue.SWITCH_ROLE_AUDIENCE,
                            }),
                            'audience' === t)
                          ) {
                            i = Ri(this.publications.keys());
                            try {
                              for (
                                n = function () {
                                  var e = r.value,
                                    t = o.localStreams.find(function (t) {
                                      return [
                                        t.audioStreamId,
                                        t.videoStreamId,
                                      ].includes(e);
                                    });
                                  t && o.doUnpublish(t, e);
                                },
                                  i.s();
                                !(r = i.n()).done;

                              )
                                n();
                            } catch (e) {
                              i.e(e);
                            } finally {
                              i.f();
                            }
                          }
                          return e.abrupt(
                            'return',
                            new Promise(
                              (function () {
                                var e = T(
                                  A.mark(function e(i, r) {
                                    return A.wrap(function (e) {
                                      for (;;)
                                        switch ((e.prev = e.next)) {
                                          case 0:
                                            o.xsigoClient.switchPermission(
                                              o.roomId,
                                              L.get(t),
                                              function (e, n, s) {
                                                if (1 === e)
                                                  (o.logger.info(
                                                    'switch role from '
                                                      .concat(o.role, ' to ')
                                                      .concat(t)
                                                  ),
                                                    (o.role = t),
                                                    (o.localStreams = []),
                                                    o.logger.buriedLog({
                                                      c:
                                                        'anchor' === t
                                                          ? Ue.SWITCH_ROLE_ANCHOR_SUCCESS
                                                          : Ue.SWITCH_ROLE_AUDIENCE_SUCCESS,
                                                    }),
                                                    i(!0));
                                                else {
                                                  (o.logger.buriedLog({
                                                    c:
                                                      'anchor' === t
                                                        ? Ue.SWITCH_ROLE_ANCHOR_FAILED
                                                        : Ue.SWITCH_ROLE_AUDIENCE_FAILED,
                                                  }),
                                                    o.logger.onError({
                                                      c: Ue.TOP_ERROR,
                                                      v: B.SWITCH_ROLE_ERROR,
                                                    }));
                                                  var a = new X({
                                                    code: B.SWITCH_ROLE_ERROR,
                                                    message: n,
                                                  });
                                                  r(a);
                                                }
                                              }
                                            );
                                          case 1:
                                          case 'end':
                                            return e.stop();
                                        }
                                    }, e);
                                  })
                                );
                                return function (t, i) {
                                  return e.apply(this, arguments);
                                };
                              })()
                            )
                          );
                        case 13:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this
                );
              })
            )),
            function (e) {
              return u.apply(this, arguments);
            }),
        },
        {
          key: 'on',
          value: function (e, t) {
            this._emitter.on(e, t);
          },
        },
        {
          key: 'off',
          value: function (e, t) {
            (this.logger &&
              this.logger.buriedLog({
                c: Ue['OFF_'.concat(e.replace('-', '_').toUpperCase())],
              }),
              this._emitter.off(e, t));
          },
        },
        {
          key: 'getRemoteMutedState',
          value: function () {
            this.logger.buriedLog({ c: Ue.GET_REMOTE_MUTED_STATE });
            var e,
              t = [],
              i = Ri(this._remoteMutedStateMap);
            try {
              for (i.s(); !(e = i.n()).done; ) {
                var r = C(e.value, 2);
                t.push(Ti({ userId: r[0] }, r[1]));
              }
            } catch (e) {
              i.e(e);
            } finally {
              i.f();
            }
            return t.filter(function (e) {
              return !e.userId.includes('share_');
            });
          },
        },
        {
          key: 'updateRemoteMutedState',
          value: function (e, t) {
            if (![e, 'share_'.concat(e)].includes(this.userId)) {
              var i = {
                hasAudio: !1,
                hasVideo: !1,
                audioMuted: !0,
                videoMuted: !0,
                hasSmall: !1,
              };
              t = t || i;
              var r = this._remoteMutedStateMap.get(e) || i;
              this._remoteMutedStateMap.set(e, Ti(Ti({}, r), t));
            }
          },
        },
        {
          key: 'getTransportStats',
          value:
            ((c = T(
              A.mark(function e() {
                var t,
                  i,
                  r,
                  n = this;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          if (this.publications.size) {
                            e.next = 2;
                            break;
                          }
                          throw new X({
                            code: B.INVALID_OPERATION,
                            message: 'local stream is not published',
                          });
                        case 2:
                          ((t = null),
                            (i = Ri(this.publications.values())),
                            (e.prev = 4),
                            i.s());
                        case 6:
                          if ((r = i.n()).done) {
                            e.next = 12;
                            break;
                          }
                          return ((t = r.value), e.abrupt('break', 12));
                        case 10:
                          e.next = 6;
                          break;
                        case 12:
                          e.next = 17;
                          break;
                        case 14:
                          ((e.prev = 14), (e.t0 = e.catch(4)), i.e(e.t0));
                        case 17:
                          return ((e.prev = 17), i.f(), e.finish(17));
                        case 20:
                          return e.abrupt(
                            'return',
                            new Promise(function (e, i) {
                              t.getTransportStats()
                                .then(function (i) {
                                  var r = t.userId,
                                    o = 0;
                                  if (n.senderStats.has(r)) {
                                    var s = n.senderStats.get(r);
                                    s.video.timestamp
                                      ? (o = s.video.packetLossRate)
                                      : s.audio.timestamp
                                        ? (o = s.audio.packetLossRate)
                                        : s.smallVideo.timestamp &&
                                          (o = s.smallVideo.packetLossRate);
                                  }
                                  ((i.packetLossRate = o), e(i));
                                })
                                .catch(function (e) {
                                  n.logger.onError({
                                    c: Ue.TOP_ERROR,
                                    v: B.INVALID_TRANSPORT_STATA,
                                  });
                                  var t = new X({
                                    code: B.INVALID_TRANSPORT_STATA,
                                    message: e,
                                  });
                                  i(t);
                                });
                            })
                          );
                        case 21:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this,
                  [[4, 14, 17, 20]]
                );
              })
            )),
            function () {
              return c.apply(this, arguments);
            }),
        },
        {
          key: 'getRemoteTransportStats',
          value:
            ((a = T(
              A.mark(function e() {
                var t = this;
                return A.wrap(function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        return e.abrupt(
                          'return',
                          new Promise(function (e) {
                            try {
                              var i,
                                r = [],
                                n = [],
                                o = [],
                                s = function (e, t, i) {
                                  e.getTransportStats()
                                    .then(function (e) {
                                      -1 ===
                                        o.findIndex(function (e) {
                                          return e.userId === t;
                                        }) &&
                                        o.push({
                                          userId: t,
                                          packetLossRate: i,
                                          rtt: e,
                                        });
                                    })
                                    .catch(function () {
                                      -1 ===
                                        o.findIndex(function (e) {
                                          return e.userId === t;
                                        }) &&
                                        o.push({
                                          userId: t,
                                          packetLossRate: -1,
                                          rtt: -1,
                                        });
                                    });
                                },
                                a = Ri(t.subscriptions.values());
                              try {
                                for (a.s(); !(i = a.n()).done; ) {
                                  var c = i.value,
                                    u = c.subscriber.userId,
                                    d = 0;
                                  if (t.receiverStats.has(u)) {
                                    var l = t.receiverStats.get(u);
                                    l.video.timestamp
                                      ? s(
                                          c.subscriber,
                                          u,
                                          (d = l.video.packetLossRate)
                                        )
                                      : l.audio.timestamp &&
                                        s(
                                          c.subscriber,
                                          u,
                                          (d = l.audio.packetLossRate)
                                        );
                                  }
                                  (n.push(d),
                                    r.push(c.subscriber.getTransportStats()));
                                }
                              } catch (e) {
                                a.e(e);
                              } finally {
                                a.f();
                              }
                              Promise.all(r).then(function (i) {
                                R(t._remoteMutedStateMap.keys()).forEach(
                                  function (e) {
                                    -1 ===
                                      o.findIndex(function (t) {
                                        return t.userId === e;
                                      }) &&
                                      o.push({
                                        userId: e,
                                        packetLossRate: -1,
                                        rtt: -1,
                                      });
                                  }
                                );
                                var r =
                                    i.length > 0
                                      ? i.reduce(function (e, t) {
                                          return e + t;
                                        }) / i.length
                                      : -1,
                                  s =
                                    n.length > 0
                                      ? n.reduce(function (e, t) {
                                          return e + t;
                                        }) / n.length
                                      : -1;
                                e({ packetLossRate: s, rtt: r, list: o });
                              });
                            } catch (i) {
                              var h = R(t._remoteMutedStateMap.keys()).map(
                                function (e) {
                                  return {
                                    userId: e,
                                    packetLossRate: -1,
                                    rtt: -1,
                                  };
                                }
                              );
                              e({ packetLossRate: -1, rtt: -1, list: h });
                            }
                          })
                        );
                      case 1:
                      case 'end':
                        return e.stop();
                    }
                }, e);
              })
            )),
            function () {
              return a.apply(this, arguments);
            }),
        },
        {
          key: 'getNetworkQuality',
          value: function () {
            var e = this;
            if (-1 === this._interval) {
              var t = {
                uplinkNetworkQuality: 0,
                downlinkNetworkQuality: 0,
                downlinkNetworkQualityList: [],
              };
              this._interval = window.setInterval(function () {
                if (e.xsigoClient) {
                  var i,
                    r = e.xsigoClient.getWsState(e.roomId),
                    n = r || {},
                    o = n.state;
                  (r &&
                  ('DISCONNECTED' === o ||
                    'RECONNECTING' === o ||
                    ('CONNECTING' === o && 'RECONNECTING' === n.prevState))
                    ? ((t.uplinkNetworkQuality = 6),
                      (t.downlinkNetworkQuality = 6),
                      (t.downlinkNetworkQualityList = R(
                        e._remoteMutedStateMap.keys()
                      ).map(function (e) {
                        return { userId: e, downlinkNetworkQuality: 6 };
                      })))
                    : (e
                        .getTransportStats()
                        .then(function (i) {
                          t.uplinkNetworkQuality = e.networkLevel(
                            i.packetLossRate,
                            i.rtt
                          );
                        })
                        .catch(function () {
                          t.uplinkNetworkQuality = 0;
                        }),
                      e
                        .getRemoteTransportStats()
                        .then(function (i) {
                          ((t.downlinkNetworkQuality = e.networkLevel(
                            i.packetLossRate,
                            i.rtt
                          )),
                            i.list &&
                              (t.downlinkNetworkQualityList = i.list.map(
                                function (t) {
                                  return {
                                    userId: t.userId,
                                    downlinkNetworkQuality: e.networkLevel(
                                      t.packetLossRate,
                                      t.rtt
                                    ),
                                  };
                                }
                              )));
                        })
                        .catch(function (e) {
                          ((t.downlinkNetworkQuality = 0),
                            (t.downlinkNetworkQualityList = e.list.map(
                              function (e) {
                                return {
                                  userId: e.userId,
                                  downlinkNetworkQuality: 0,
                                };
                              }
                            )));
                        })),
                    (t.uplinkNetworkQuality >= 3 ||
                      t.downlinkNetworkQuality >= 3) &&
                      e.logger.warn(
                        'network-quality',
                        JSON.stringify(t, null, 4)
                      ),
                    e._emitter.emit('network-quality', t),
                    null !== (i = e.appConfig) &&
                      void 0 !== i &&
                      i.enableEvent &&
                      (e.getSenderStats(), e.getReceiverStats()));
                }
              }, 2e3);
            } else
              this.logger.warn(
                'network quality calculating is already started'
              );
          },
        },
        {
          key: 'getSenderStats',
          value:
            ((s = T(
              A.mark(function e() {
                var t,
                  i,
                  r,
                  n,
                  o,
                  s,
                  a,
                  c,
                  u,
                  d,
                  l,
                  h,
                  p,
                  f,
                  m,
                  g,
                  v,
                  b,
                  S,
                  y,
                  E,
                  I,
                  T,
                  R,
                  _,
                  k,
                  O,
                  w,
                  P,
                  L,
                  D,
                  x,
                  M,
                  U,
                  N,
                  V,
                  F,
                  j,
                  B,
                  W,
                  H,
                  G,
                  J,
                  K,
                  Y;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          ((t = Ri(this.publications.entries())),
                            (e.prev = 1),
                            t.s());
                        case 3:
                          if ((i = t.n()).done) {
                            e.next = 27;
                            break;
                          }
                          ((r = C(i.value, 2)),
                            (n = r[0]),
                            (o = r[1]),
                            (e.t0 = A.keys(this.localStreams)));
                        case 6:
                          if ((e.t1 = e.t0()).done) {
                            e.next = 25;
                            break;
                          }
                          if (
                            ((a = (s = this.localStreams[e.t1.value]).screen
                              ? 'share_'.concat(s.getUserId())
                              : s.getUserId()),
                            this.senderStats.has(a) ||
                              this.senderStats.set(a, {
                                audio: {
                                  bytesSent: 0,
                                  timestamp: 0,
                                  retransmittedPacketsSent: 0,
                                  packetsSent: 0,
                                  packetLossRate: 0,
                                },
                                video: {
                                  bytesSent: 0,
                                  timestamp: 0,
                                  retransmittedPacketsSent: 0,
                                  packetsSent: 0,
                                  packetLossRate: 0,
                                },
                                smallVideo: {
                                  bytesSent: 0,
                                  timestamp: 0,
                                  retransmittedPacketsSent: 0,
                                  packetsSent: 0,
                                  packetLossRate: 0,
                                },
                              }),
                            !s.audioStreamId ||
                              s.audioStreamId !== n ||
                              s.screen)
                          ) {
                            e.next = 18;
                            break;
                          }
                          return (
                            (c = this.senderStats.get(a)),
                            (d = (u = c.audio).bytesSent),
                            (l = u.timestamp),
                            (h = u.retransmittedPacketsSent),
                            (p = u.packetsSent),
                            (e.next = 16),
                            o.getLocalStats('audio')
                          );
                        case 16:
                          (f = e.sent) &&
                            ((g = (f.timestamp - l) / 1e3),
                            (b =
                              (v = (m = f.audio).bytesSent - d) <= 0
                                ? 0
                                : Number(((8 * v) / g / 1024).toFixed(2))),
                            (y =
                              (S = m.retransmittedPacketsSent - h) <= 0
                                ? 0
                                : parseFloat(
                                    (S / (m.packetsSent - p)).toFixed(6)
                                  )),
                            this.senderStats.set(
                              a,
                              Ti(
                                Ti({}, c),
                                {},
                                {
                                  audio: {
                                    bytesSent: m.bytesSent,
                                    timestamp: f.timestamp,
                                    packetsSent: m.packetsSent,
                                    retransmittedPacketsSent:
                                      m.retransmittedPacketsSent,
                                    packetLossRate: y,
                                  },
                                }
                              )
                            ),
                            this.logger.mediaLog({
                              med_type: 'mic',
                              pub: !0,
                              ruid: this.roomUniqueId,
                              uid: this.userId,
                              streams: [{ rate: b, lost: y, rtt: f.rtt }],
                            }),
                            (E = this.xsigoClient.getWsState(this.roomId)),
                            ['CONNECTED', 'RECOVERY'].includes(
                              (E || {}).state
                            ) &&
                              0 === m.bytesSent &&
                              o.updateBytesSentIs0Count('audio'));
                        case 18:
                          if (!s.videoStreamId || s.videoStreamId !== n) {
                            e.next = 23;
                            break;
                          }
                          return ((e.next = 21), o.getLocalStats('video'));
                        case 21:
                          (I = e.sent) &&
                            ((T = {
                              med_type: s.screen ? 'screen' : 'camera',
                              pub: !0,
                              ruid: this.roomUniqueId,
                              uid: this.userId,
                              sess_id: n,
                              streams: [],
                            }),
                            (R = this.senderStats.get(a)),
                            (O = (_ = R.video).retransmittedPacketsSent),
                            (w = _.packetsSent),
                            (L = (I.timestamp - _.timestamp) / 1e3),
                            (x =
                              (D =
                                (P = I.video).bytesSent - (k = _.bytesSent)) <=
                              0
                                ? 0
                                : ((8 * D) / L / 1024).toFixed(2)),
                            this.logger.debug(
                              'video vStats.bytesSent:'
                                .concat(P.bytesSent, ',bytesSent:')
                                .concat(k, ',bitrate:')
                                .concat(x)
                            ),
                            (U =
                              (M = P.retransmittedPacketsSent - O) <= 0
                                ? 0
                                : parseFloat(
                                    (M / (P.packetsSent - w)).toFixed(6)
                                  )),
                            T.streams.push({
                              rate: x,
                              lost: U,
                              rtt: I.rtt,
                              fps: P.framesPerSecond,
                              rid: P.rid,
                              width: P.frameWidth,
                              height: P.frameHeight,
                            }),
                            (N = R.smallVideo),
                            !s.screen &&
                              this.isEnableSmallStream &&
                              ((F = (V = N).retransmittedPacketsSent),
                              (j = V.packetsSent),
                              (W = (I.timestamp - V.timestamp) / 1e3),
                              (G =
                                (H =
                                  (B = I.smallVideo).bytesSent - V.bytesSent) <=
                                0
                                  ? 0
                                  : ((8 * H) / W / 1024).toFixed(2)),
                              (K =
                                (J = B.retransmittedPacketsSent - F) <= 0
                                  ? 0
                                  : parseFloat(
                                      (J / (B.packetsSent - j)).toFixed(6)
                                    )),
                              (N = {
                                bytesSent: B.bytesSent,
                                timestamp: I.timestamp,
                                packetsSent: B.packetsSent,
                                retransmittedPacketsSent:
                                  B.retransmittedPacketsSent,
                                packetLossRate: K,
                              }),
                              T.streams.push({
                                rate: G,
                                lost: K,
                                rtt: I.rtt,
                                fps: B.framesPerSecond,
                                rid: B.rid,
                                width: B.frameWidth,
                                height: B.frameHeight,
                              })),
                            this.senderStats.set(
                              a,
                              Ti(
                                Ti({}, R),
                                {},
                                {
                                  video: {
                                    bytesSent: P.bytesSent,
                                    timestamp: I.timestamp,
                                    packetsSent: P.packetsSent,
                                    retransmittedPacketsSent:
                                      P.retransmittedPacketsSent,
                                    packetLossRate: U,
                                  },
                                  smallVideo: N,
                                }
                              )
                            ),
                            this.logger.mediaLog(T),
                            (Y = this.xsigoClient.getWsState(this.roomId)),
                            ['CONNECTED', 'RECOVERY'].includes(
                              (Y || {}).state
                            ) &&
                              0 === P.bytesSent &&
                              o.updateBytesSentIs0Count('video'));
                        case 23:
                          e.next = 6;
                          break;
                        case 25:
                          e.next = 3;
                          break;
                        case 27:
                          e.next = 32;
                          break;
                        case 29:
                          ((e.prev = 29), (e.t2 = e.catch(1)), t.e(e.t2));
                        case 32:
                          return ((e.prev = 32), t.f(), e.finish(32));
                        case 35:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this,
                  [[1, 29, 32, 35]]
                );
              })
            )),
            function () {
              return s.apply(this, arguments);
            }),
        },
        {
          key: 'getReceiverStats',
          value:
            ((o = T(
              A.mark(function e() {
                var t,
                  i,
                  r,
                  n,
                  o,
                  s,
                  a,
                  c,
                  u,
                  d,
                  l,
                  h,
                  p,
                  f,
                  m,
                  g,
                  v,
                  b,
                  S,
                  y,
                  E,
                  I,
                  T,
                  R,
                  _,
                  k,
                  O,
                  w,
                  P,
                  L,
                  D,
                  x,
                  M,
                  U,
                  V,
                  F,
                  j,
                  B,
                  W,
                  H,
                  G;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          ((t = Ri(this.subscriptions.entries())),
                            (e.prev = 1),
                            t.s());
                        case 3:
                          if ((i = t.n()).done) {
                            e.next = 25;
                            break;
                          }
                          if (
                            ((r = C(i.value, 2)),
                            (n = r[0]),
                            (s = (o = r[1]).stream.getUserSeq()),
                            (a = o.stream.getUserId()),
                            this.receiverStats.has(s) ||
                              this.receiverStats.set(s, {
                                audio: {
                                  bytesReceived: 0,
                                  timestamp: 0,
                                  packetsReceived: 0,
                                  packetsLost: 0,
                                  nackCount: 0,
                                  packetLossRate: 0,
                                },
                                video: {
                                  bytesReceived: 0,
                                  timestamp: 0,
                                  packetsReceived: 0,
                                  packetsLost: 0,
                                  nackCount: 0,
                                  packetLossRate: 0,
                                },
                              }),
                            (c = o.stream.getType()),
                            n !== o.stream.audioSubscriptionId || c === N)
                          ) {
                            e.next = 16;
                            break;
                          }
                          return (
                            (u = this.receiverStats.get(s)),
                            (l = (d = u.audio).bytesReceived),
                            (h = d.timestamp),
                            (p = d.packetsLost),
                            (f = d.packetsReceived),
                            (m = d.nackCount),
                            (e.next = 14),
                            o.subscriber.getRemoteAudioOrVideoStats('audio')
                          );
                        case 14:
                          (g = e.sent) &&
                            ((b = (g.timestamp - h) / 1e3),
                            (y =
                              (S = (v = g.audio).bytesReceived - l) <= 0
                                ? 0
                                : Number(((8 * S) / b / 1024).toFixed(2))),
                            (E = v.packetsLost - p),
                            (I = v.packetsReceived - f),
                            0,
                            (R =
                              (T = v.nackCount - m) <= 0 || I <= 0
                                ? 0
                                : T > I
                                  ? 100
                                  : E < 0
                                    ? parseFloat((T / I).toFixed(6))
                                    : parseFloat(
                                        ((E + T) / (E + I)).toFixed(6)
                                      )),
                            this.receiverStats.set(
                              s,
                              Ti(
                                Ti({}, u),
                                {},
                                {
                                  audio: {
                                    bytesReceived: v.bytesReceived,
                                    timestamp: g.timestamp,
                                    packetsReceived: v.packetsReceived,
                                    packetsLost: v.packetsLost,
                                    nackCount: v.nackCount,
                                    packetLossRate: R,
                                  },
                                }
                              )
                            ),
                            this.logger.mediaLog({
                              med_type: 'mic',
                              pub: !1,
                              ruid: this.roomUniqueId,
                              uid: a,
                              streams: [{ rate: y, lost: R, rtt: g.rtt }],
                            }));
                        case 16:
                          if (n !== o.stream.videoSubscriptionId) {
                            e.next = 23;
                            break;
                          }
                          return (
                            (_ = this.receiverStats.get(s)),
                            (O = (k = _.video).bytesReceived),
                            (w = k.timestamp),
                            (P = k.packetsLost),
                            (L = k.packetsReceived),
                            (D = k.nackCount),
                            (e.next = 21),
                            o.subscriber.getRemoteAudioOrVideoStats('video')
                          );
                        case 21:
                          (x = e.sent) &&
                            ((U = (x.timestamp - w) / 1e3),
                            (F =
                              (V = (M = x.video).bytesReceived - O) <= 0
                                ? 0
                                : Number(((8 * V) / U / 1024).toFixed(2))),
                            (j = M.packetsLost - P),
                            (B = M.packetsReceived - L),
                            0,
                            (H =
                              (W = M.nackCount - D) <= 0 || B <= 0
                                ? 0
                                : W > B
                                  ? 100
                                  : j < 0
                                    ? parseFloat((W / B).toFixed(6))
                                    : parseFloat(
                                        ((j + W) / (j + B)).toFixed(6)
                                      )),
                            this.receiverStats.set(
                              s,
                              Ti(
                                Ti({}, _),
                                {},
                                {
                                  video: {
                                    bytesReceived: M.bytesReceived,
                                    timestamp: x.timestamp,
                                    packetsReceived: M.packetsReceived,
                                    packetsLost: M.packetsLost,
                                    nackCount: M.nackCount,
                                    packetLossRate: H,
                                  },
                                }
                              )
                            ),
                            (G = o.stream.getSimulcastType()),
                            this.logger.mediaLog({
                              med_type: c !== N ? 'camera' : 'screen',
                              pub: !1,
                              ruid: this.roomUniqueId,
                              uid: a,
                              streams: [
                                {
                                  rate: F,
                                  lost: H,
                                  rtt: x.rtt,
                                  fps: M.framesPerSecond,
                                  rid: G === ve.SmallStream ? 'l' : 'h',
                                  width: M.frameWidth,
                                  height: M.frameHeight,
                                },
                              ],
                            }));
                        case 23:
                          e.next = 3;
                          break;
                        case 25:
                          e.next = 30;
                          break;
                        case 27:
                          ((e.prev = 27), (e.t0 = e.catch(1)), t.e(e.t0));
                        case 30:
                          return ((e.prev = 30), t.f(), e.finish(30));
                        case 33:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this,
                  [[1, 27, 30, 33]]
                );
              })
            )),
            function () {
              return o.apply(this, arguments);
            }),
        },
        {
          key: 'networkLevel',
          value: function (e, t) {
            return e > 50 || t > 500
              ? 5
              : e > 30 || t > 350
                ? 4
                : e > 20 || t > 200
                  ? 3
                  : e > 10 || t > 100
                    ? 2
                    : e >= 0 || t >= 0
                      ? 1
                      : 0;
          },
        },
        {
          key: 'getLocalAudioStats',
          value: function () {
            return this.getLocalStatsMap('audio');
          },
        },
        {
          key: 'getLocalVideoStats',
          value: function () {
            return this.getLocalStatsMap('video');
          },
        },
        {
          key: 'getLocalStatsMap',
          value:
            ((n = T(
              A.mark(function e(t) {
                var i, r, n, o, s, a, c, u, d, l, h, p, f, m, g, v, b, S;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          if (
                            this.localStreams.some(function (e) {
                              return (
                                e.published &&
                                ('audio' === t
                                  ? e.audioStreamId
                                  : e.videoStreamId)
                              );
                            })
                          ) {
                            e.next = 3;
                            break;
                          }
                          throw new X({
                            code: B.INVALID_OPERATION,
                            message: 'local stream is not published',
                          });
                        case 3:
                          ((i = new Map()),
                            (e.prev = 4),
                            (r = Ri(this.publications.entries())),
                            (e.prev = 6),
                            r.s());
                        case 8:
                          if ((n = r.n()).done) {
                            e.next = 25;
                            break;
                          }
                          ((o = C(n.value, 2)),
                            (s = o[0]),
                            (a = o[1]),
                            (e.t0 = A.keys(this.localStreams)));
                        case 11:
                          if ((e.t1 = e.t0()).done) {
                            e.next = 23;
                            break;
                          }
                          if (
                            ((c = this.localStreams[e.t1.value]),
                            !('audio' === t
                              ? c.audioStreamId === s
                              : c.videoStreamId === s))
                          ) {
                            e.next = 21;
                            break;
                          }
                          return (
                            (u = c.screen
                              ? 'share_'.concat(c.getUserId())
                              : c.getUserId()),
                            (e.next = 18),
                            a.getLocalStats(t)
                          );
                        case 18:
                          ((d = e.sent),
                            'audio' === t &&
                              d &&
                              (this.senderLocalStats.has(u) ||
                                this.senderLocalStats.set(u, {
                                  audio: {
                                    bytesSent: 0,
                                    timestamp: 0,
                                    packetsSent: 0,
                                  },
                                }),
                              (l = this.senderLocalStats.get(u)),
                              (f = (h = d[t]).packetsSent),
                              (m = (d.timestamp - l.audio.timestamp) / 1e3),
                              (v =
                                (g = (p = h.bytesSent) - l.audio.bytesSent) <= 0
                                  ? 0
                                  : Number(((8 * g) / m / 1024).toFixed())),
                              i.set(u, {
                                bytesSent: p,
                                packetsSent: f,
                                bitrate: v,
                              }),
                              this.senderLocalStats.set(
                                c.getUserId(),
                                Ti(
                                  Ti({}, l),
                                  {},
                                  {
                                    audio: {
                                      bytesSent: p,
                                      timestamp: d.timestamp,
                                      packetsSent: f,
                                    },
                                  }
                                )
                              )),
                            'video' === t &&
                              d &&
                              i.set(u, {
                                bytesSent: (b = d[t]).bytesSent,
                                packetsSent: b.packetsSent,
                                framesEncoded: b.framesEncoded,
                                frameWidth: b.frameWidth,
                                frameHeight: b.frameHeight,
                                framesSent: b.framesSent,
                              }));
                        case 21:
                          e.next = 11;
                          break;
                        case 23:
                          e.next = 8;
                          break;
                        case 25:
                          e.next = 30;
                          break;
                        case 27:
                          ((e.prev = 27), (e.t2 = e.catch(6)), r.e(e.t2));
                        case 30:
                          return ((e.prev = 30), r.f(), e.finish(30));
                        case 33:
                          return e.abrupt('return', Promise.resolve(i));
                        case 36:
                          return (
                            (e.prev = 36),
                            (e.t3 = e.catch(4)),
                            this.logger.info(
                              'Get local '.concat(t, ' stats failed'),
                              e.t3
                            ),
                            this.logger.onError({
                              c: Ue.TOP_ERROR,
                              v:
                                'audio' === t
                                  ? B.LOCAL_AUDIO_STATA_ERROR
                                  : B.LOCAL_VIDEO_STATA_ERROR,
                            }),
                            (S = new X({
                              code:
                                'audio' === t
                                  ? B.LOCAL_AUDIO_STATA_ERROR
                                  : B.LOCAL_VIDEO_STATA_ERROR,
                              message: e.t3.message,
                            })),
                            e.abrupt('return', Promise.reject(S))
                          );
                        case 42:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this,
                  [
                    [4, 36],
                    [6, 27, 30, 33],
                  ]
                );
              })
            )),
            function (e) {
              return n.apply(this, arguments);
            }),
        },
        {
          key: 'getRemoteAudioStats',
          value: function () {
            var e = this;
            return new Promise(
              (function () {
                var t = T(
                  A.mark(function t(i, r) {
                    var n, o, s, a, c, u, d, l, h;
                    return A.wrap(
                      function (t) {
                        for (;;)
                          switch ((t.prev = t.next)) {
                            case 0:
                              ((n = new Map()),
                                (t.prev = 1),
                                e.logger.info(
                                  'get remote audio Stats',
                                  e.subscriptions
                                ),
                                (o = Ri(e.subscriptions.entries())),
                                (t.prev = 4),
                                o.s());
                            case 6:
                              if ((s = o.n()).done) {
                                t.next = 16;
                                break;
                              }
                              if (
                                ((a = C(s.value, 2)),
                                (c = a[0]),
                                (d = (u = a[1]).stream.getUserSeq()),
                                c !== u.stream.audioSubscriptionId)
                              ) {
                                t.next = 14;
                                break;
                              }
                              return (
                                (t.next = 12),
                                u.subscriber.getRemoteAudioOrVideoStats('audio')
                              );
                            case 12:
                              (l = t.sent) && n.set(d, l.audio);
                            case 14:
                              t.next = 6;
                              break;
                            case 16:
                              t.next = 21;
                              break;
                            case 18:
                              ((t.prev = 18), (t.t0 = t.catch(4)), o.e(t.t0));
                            case 21:
                              return ((t.prev = 21), o.f(), t.finish(21));
                            case 24:
                              (i(n), (t.next = 32));
                              break;
                            case 27:
                              ((t.prev = 27),
                                (t.t1 = t.catch(1)),
                                e.logger.onError(
                                  {
                                    c: Ue.TOP_ERROR,
                                    v: B.REMOTE_AUDIO_STATA_ERROR,
                                  },
                                  'Get Remote Audio Stats Failed, '.concat(t.t1)
                                ),
                                (h = new X({
                                  code: B.REMOTE_AUDIO_STATA_ERROR,
                                  message: t.t1.message,
                                })),
                                r(h));
                            case 32:
                            case 'end':
                              return t.stop();
                          }
                      },
                      t,
                      null,
                      [
                        [1, 27],
                        [4, 18, 21, 24],
                      ]
                    );
                  })
                );
                return function (e, i) {
                  return t.apply(this, arguments);
                };
              })()
            );
          },
        },
        {
          key: 'getRemoteVideoStats',
          value: function () {
            var e = this;
            return new Promise(
              (function () {
                var t = T(
                  A.mark(function t(i, r) {
                    var n, o, s, a, c, u, d, l, h, p;
                    return A.wrap(
                      function (t) {
                        for (;;)
                          switch ((t.prev = t.next)) {
                            case 0:
                              ((n = new Map()),
                                (t.prev = 1),
                                e.logger.info(
                                  'get remote video Stats',
                                  e.subscriptions
                                ),
                                (o = Ri(e.subscriptions.entries())),
                                (t.prev = 4),
                                o.s());
                            case 6:
                              if ((s = o.n()).done) {
                                t.next = 16;
                                break;
                              }
                              if (
                                ((a = C(s.value, 2)),
                                (c = a[0]),
                                (d = (u = a[1]).stream.getUserSeq()),
                                c !== u.stream.videoSubscriptionId)
                              ) {
                                t.next = 14;
                                break;
                              }
                              return (
                                (t.next = 12),
                                u.subscriber.getRemoteAudioOrVideoStats('video')
                              );
                            case 12:
                              (l = t.sent) &&
                                n.set(d, {
                                  bytesReceived: (h = l.video).bytesReceived,
                                  packetsReceived: h.packetsReceived,
                                  packetsLost: h.packetsLost,
                                  framesDecoded: h.framesDecoded,
                                  frameWidth: h.frameWidth,
                                  frameHeight: h.frameHeight,
                                });
                            case 14:
                              t.next = 6;
                              break;
                            case 16:
                              t.next = 21;
                              break;
                            case 18:
                              ((t.prev = 18), (t.t0 = t.catch(4)), o.e(t.t0));
                            case 21:
                              return ((t.prev = 21), o.f(), t.finish(21));
                            case 24:
                              (i(n), (t.next = 32));
                              break;
                            case 27:
                              ((t.prev = 27),
                                (t.t1 = t.catch(1)),
                                e.logger.onError(
                                  {
                                    c: Ue.TOP_ERROR,
                                    v: B.REMOTE_VIDEO_STATA_ERROR,
                                  },
                                  'Get Remote Video Stats Failed, '.concat(t.t1)
                                ),
                                (p = new X({
                                  code: B.REMOTE_VIDEO_STATA_ERROR,
                                  message: t.t1.message,
                                })),
                                r(p));
                            case 32:
                            case 'end':
                              return t.stop();
                          }
                      },
                      t,
                      null,
                      [
                        [1, 27],
                        [4, 18, 21, 24],
                      ]
                    );
                  })
                );
                return function (e, i) {
                  return t.apply(this, arguments);
                };
              })()
            );
          },
        },
        {
          key: 'onWsStateChange',
          value: function (e, t, i) {
            (this.logger.info('Ws state from '.concat(t, ' to ').concat(i)),
              this._emitter.emit('connection-state-changed', {
                state: i,
                prevState: t,
              }));
          },
        },
        {
          key: 'onError',
          value: function (e) {
            (this.logger.buriedLog({ c: Ue.ON_ERROR, v: ''.concat(e.message) }),
              this._emitter.emit(V, e));
          },
        },
        {
          key: 'onWsReconnectFailed',
          value: function (e) {
            (this.logger.warn('room: '.concat(e, ' reconnection failed')),
              this.logger.onError({
                c: Ue.TOP_ERROR,
                v: B.SIGNAL_CHANNEL_RECONNECTION_FAILED,
              }));
            var t = new X({
              code: B.SIGNAL_CHANNEL_RECONNECTION_FAILED,
              message:
                'signal channel reconnection failed, please check your network',
            });
            (this._emitter.emit(V, t), this.leave());
          },
        },
        {
          key: 'onParticipantLeave',
          value: function (e) {
            var t = this;
            this.logger.info('======notification: '.concat(e, ' leave======'));
            try {
              var i = 'share_'.concat(e),
                r = this.remoteStreams.get(e),
                n = this.remoteStreams.get(i),
                o = function (i, r) {
                  (t.logger.buriedLog({
                    c:
                      i.type === N
                        ? Ue.ON_STREAM_REMOVED_SCREEN
                        : Ue.ON_STREAM_REMOVED,
                    v: 'uid:'.concat(e),
                  }),
                    t._emitter.emit('stream-removed', { stream: i }),
                    i.close(),
                    t.remoteStreams.delete(r),
                    t.subscribeManager.subscriptedState.delete(r),
                    t.receiverStats.has(r) && t.receiverStats.delete(r));
                  var n,
                    o = Ri(t.subscriptions.entries());
                  try {
                    for (o.s(); !(n = o.n()).done; ) {
                      var s = C(n.value, 2),
                        a = s[0],
                        c = s[1];
                      [i.audioSubscriptionId, i.videoSubscriptionId].includes(
                        a
                      ) && (c.subscriber.close(), t.subscriptions.delete(a));
                    }
                  } catch (e) {
                    o.e(e);
                  } finally {
                    o.f();
                  }
                };
              (r && o(r, e),
                n && o(n, i),
                this._remoteMutedStateMap.has(e) &&
                  this._remoteMutedStateMap.delete(e));
            } catch (e) {
              this.logger.info(e);
            }
            (this.logger.buriedLog({
              c: Ue.ON_PEER_LEVAE,
              v: 'uid:'.concat(e),
            }),
              this._emitter.emit('peer-leave', { userId: e }));
          },
        },
        {
          key: 'onStreamAdd',
          value: function (e) {
            var t = e || {},
              i = t.userId,
              r = t.streamId,
              n = t.info,
              o = t.mixedInfo,
              s = n || {},
              a = s.audio,
              c = s.video;
            if (
              (this.logger.info('time  Date.now stream-add', Date.now()),
              i !== this.userId)
            ) {
              var u = (a || c || {}).source;
              u === ge.ScreenShare && (i = 'share_'.concat(i));
              var d = this.remoteStreams.get(i);
              if ((this.logger.info('userId: ' + i, 'remote stream', d), d)) {
                var l = this.subscribeManager.needSubscribeKind(i),
                  h = this.subscribeManager.getSubscriptionOpts(i);
                this.logger.info('userId: ' + i, l, h, null, 4);
                var p = { audio: !1, video: !1, small: h.small };
                if (
                  (l === pe.AudioOnly && (p.audio = !0),
                  l === pe.VideoOnly && (p.video = !0),
                  l === pe.AudioVideo && ((p.audio = !0), (p.video = !0)),
                  a &&
                    (d.setAudio(!!a),
                    d.setHasAudio(!!a),
                    d.setAudioStreamId(r),
                    d.setMutedState('audio', a.muted),
                    this.updateRemoteMutedState(i, {
                      hasAudio: !0,
                      audioMuted: a.muted,
                    })),
                  c)
                ) {
                  (d.setVideo(!!c),
                    d.setHasVideo(!!c),
                    d.setVideoStreamId(r),
                    d.setInfo(n));
                  var f = (c.simulcast || []).find(function (e) {
                    return e.type === ve.SmallStream;
                  });
                  (d.setMutedState('video', c.muted),
                    this.updateRemoteMutedState(i, {
                      hasVideo: !0,
                      videoMuted: c.muted,
                      hasSmall: !!f,
                    }));
                }
                (this._emitter.emit('stream-updated', { stream: d }),
                  this.logger.info('Auto subscribe options', JSON.stringify(p)),
                  (p.audio || p.video) && this.doSubscribe(d, p));
              } else {
                if (
                  ((d = new ot(
                    {
                      userId: i,
                      type: u === ge.ScreenShare ? N : 'main',
                      info: n,
                      mixedInfo: o,
                    },
                    this.logger
                  )),
                  u === ge.ScreenShare && d.setLocalUserId(this.userId),
                  (d.streamId = r),
                  this.remoteStreams.set(i, d),
                  a &&
                    (d.setAudio(!!a),
                    d.setHasAudio(!!a),
                    d.setAudioStreamId(r),
                    d.setMutedState('audio', a.muted),
                    this.updateRemoteMutedState(i, {
                      hasAudio: !0,
                      audioMuted: a.muted,
                    })),
                  c)
                ) {
                  (d.setVideo(!!c), d.setHasVideo(!!c), d.setVideoStreamId(r));
                  var m = (c.simulcast || []).find(function (e) {
                    return e.type === ve.SmallStream;
                  });
                  (d.setMutedState('video', c.muted),
                    this.updateRemoteMutedState(i, {
                      hasVideo: !0,
                      videoMuted: c.muted,
                      hasSmall: !!m,
                    }));
                }
                (this.logger.buriedLog({
                  c:
                    d.type === N
                      ? Ue.ON_STREAM_ADDED_SCREEN
                      : Ue.ON_STREAM_ADDED,
                  v: 'uid:'.concat(d.getUserId()),
                }),
                  this._emitter.emit('stream-added', { stream: d }));
              }
            }
          },
        },
        {
          key: 'onStreamChange',
          value: function (e, t) {
            var i = e;
            (this.getType(t) === N &&
              ((i = 'share_'.concat(i)),
              this.remoteStreams.get(i).closeWaterMark()),
              this.logger.info('time  Date.now stream-remove', Date.now()));
            var r = this.remoteStreams.get(i);
            if (i !== this.userId && i !== 'share_'.concat(i) && r) {
              var n = this.subscribeManager.getSubscriptedState(i);
              if (r && r.getStreamKind(t) === pe.AudioOnly) {
                if (!r.videoStreamId) return void this.doStreamRemove(i);
                if (r.audioStreamId) {
                  if (r.hasAudio()) {
                    var o = r.getAudioTrack();
                    o && r.mediaStream.removeTrack(o);
                  }
                  ((n.audio = !1),
                    r.setHasAudio(!1),
                    r.setAudioStreamId(null),
                    this.subscriptions.has(r.audioSubscriptionId) &&
                      (this.subscriptions
                        .get(r.audioSubscriptionId)
                        .subscriber.close(),
                      this.subscriptions.delete(r.audioSubscriptionId),
                      r.setAudioSubscriptionId(null)),
                    r.setMutedState('audio', !0),
                    this.updateRemoteMutedState(i, {
                      hasAudio: !1,
                      audioMuted: !0,
                    }),
                    this.receiverStats.has(i) &&
                      (this.receiverStats.get(i).audio = {
                        bytesReceived: 0,
                        timestamp: 0,
                        packetsReceived: 0,
                        packetsLost: 0,
                        nackCount: 0,
                        packetLossRate: 0,
                      }),
                    this._emitter.emit('mute-audio', { userId: i }));
                }
              }
              if (r && r.getStreamKind(t) === pe.VideoOnly) {
                if (!r.audioStreamId) return void this.doStreamRemove(i);
                if (r.videoStreamId) {
                  if (r.hasVideo()) {
                    var s = r.getVideoTrack();
                    s && r.mediaStream.removeTrack(s);
                  }
                  ((n.video = !1),
                    r.setHasVideo(!1),
                    r.setVideoStreamId(null),
                    this.subscriptions.has(r.videoSubscriptionId) &&
                      (this.subscriptions
                        .get(r.videoSubscriptionId)
                        .subscriber.close(),
                      this.subscriptions.delete(r.videoSubscriptionId),
                      r.setVideoSubscriptionId(null)),
                    r.setSimulcasts([]),
                    r.setMutedState('video', !0),
                    this.updateRemoteMutedState(i, {
                      hasVideo: !1,
                      videoMuted: !0,
                      hasSmall: !1,
                    }),
                    this.receiverStats.has(i) &&
                      (this.receiverStats.get(i).video = {
                        bytesReceived: 0,
                        timestamp: 0,
                        packetsReceived: 0,
                        packetsLost: 0,
                        nackCount: 0,
                        packetLossRate: 0,
                      }),
                    this._emitter.emit('mute-video', { userId: i }));
                }
              }
              (this.subscribeManager.updateSubscriptedState(i, n),
                this._emitter.emit('stream-updated', { stream: r }));
            }
          },
        },
        {
          key: 'doStreamRemove',
          value: function (e) {
            var t = this,
              i = this.remoteStreams.get(e),
              r = this.subscribeManager.getSubscriptedState(e);
            if (
              ((r.audio = !1),
              (r.video = !1),
              this.subscribeManager.updateSubscriptedState(e, r),
              i)
            ) {
              (i.getType() === N && i.closeWaterMark(),
                i.setAudioStreamId(null),
                i.setVideoStreamId(null),
                i.setMutedState('audio', !0),
                i.setMutedState('video', !0),
                this.remoteStreams.delete(e),
                this.logger.info(
                  'time  Date.now delete remoteStreams',
                  Date.now(),
                  i.audioSubscriptionId,
                  i.videoSubscriptionId
                ),
                this.receiverStats.has(e) && this.receiverStats.delete(e));
              var n = [];
              (i.audioSubscriptionId && n.push(i.audioSubscriptionId),
                i.videoSubscriptionId && n.push(i.videoSubscriptionId),
                n.forEach(function (e) {
                  t.subscriptions.has(e) &&
                    (t.subscriptions.get(e).subscriber.close(),
                    t.subscriptions.delete(e),
                    e === i.audioSubscriptionId &&
                      i.setAudioSubscriptionId(null),
                    e === i.videoSubscriptionId &&
                      i.setVideoSubscriptionId(null));
                }),
                this.logger.info('do stream remove with ', this.subscriptions),
                this.logger.buriedLog({
                  c:
                    i.type === N
                      ? Ue.ON_STREAM_REMOVED_SCREEN
                      : Ue.ON_STREAM_REMOVED,
                  v: 'uid:'.concat(i.getUserId()),
                }),
                this.updateRemoteMutedState(e),
                this._emitter.emit('stream-removed', { stream: i }));
            }
          },
        },
        {
          key: 'onClientBanned',
          value: function (e) {
            var t = this;
            this.logger.buriedLog(
              { c: Ue.ON_CLIENT_BANNED, v: 'cause:'.concat(e) },
              !0
            );
            var i,
              r = Ri(this.publications.entries());
            try {
              var n = function () {
                var e = C(i.value, 2),
                  r = e[0],
                  n = e[1],
                  o = t.localStreams.find(function (e) {
                    return e.streamId === r;
                  });
                (o && o.close(), n.close());
              };
              for (r.s(); !(i = r.n()).done; ) n();
            } catch (e) {
              r.e(e);
            } finally {
              r.f();
            }
            var o,
              s = Ri(this.subscriptions.values());
            try {
              for (s.s(); !(o = s.n()).done; ) {
                var a = o.value;
                (a.stream.close(), a.subscriber.close());
              }
            } catch (e) {
              s.e(e);
            } finally {
              s.f();
            }
            ((this.state = D.Leaved),
              this.reset(),
              this._emitter.emit('client-banned', { cause: e }));
          },
        },
        {
          key: 'onStreamUpdate',
          value: function (e, t, i, r) {
            var n = e;
            if (this.remoteStreams.has('share_'.concat(e))) {
              var o = this.remoteStreams.get('share_'.concat(e));
              [o.audioStreamId, o.videoStreamId].includes(t) &&
                (n = 'share_'.concat(e));
            }
            var s = this.localStreams.find(function (e) {
              return [e.audioStreamId, e.videoStreamId].includes(t);
            });
            if (
              (s || (s = this.remoteStreams.get(n)),
              null != i &&
                i.audio &&
                (e !== this.userId &&
                  (this.logger.buriedLog({
                    c: i.audio.muted ? Ue.ON_MUTE_AUDIO : Ue.ON_UNMUTE_AUDIO,
                    v: 'uid:'.concat(e),
                  }),
                  this._emitter.emit(
                    i.audio.muted ? 'mute-audio' : 'unmute-audio',
                    { userId: n }
                  )),
                s.setMutedState('audio', i.audio.muted),
                this.updateRemoteMutedState(e, { audioMuted: i.audio.muted })),
              null != i &&
                i.video &&
                (e !== this.userId &&
                  (this.logger.buriedLog({
                    c: i.video.muted ? Ue.ON_MUTE_VIDEO : Ue.ON_UNMUTE_VIDEO,
                    v: 'uid:'.concat(e),
                  }),
                  this._emitter.emit(
                    i.video.muted ? 'mute-video' : 'unmute-video',
                    { userId: n }
                  )),
                s.setMutedState('video', i.video.muted),
                this.updateRemoteMutedState(e, { videoMuted: i.video.muted })),
              r && r.length)
            ) {
              var a = (r || []).find(function (e) {
                return e.type === ve.SmallStream;
              });
              if (this.remoteStreams.has(e)) {
                var c = this.remoteStreams.get(e);
                (c.setSimulcasts(r),
                  this.logger.buriedLog({
                    c:
                      c.getType() === N
                        ? Ue.ON_STREAM_UPDATED_SCREEN
                        : Ue.ON_STREAM_UPDATED,
                    v: 'uid:'.concat(c.getUserId()),
                  }),
                  this._emitter.emit('stream-updated', { stream: c }),
                  a ||
                    (c.getSimulcastType() === ve.SmallStream &&
                      (this.logger.info('auto setRemoteVideoStreamType big'),
                      this.setRemoteVideoStreamType(c, 'big'))));
              }
              this.updateRemoteMutedState(e, { hasVideo: !0, hasSmall: !!a });
            }
          },
        },
        {
          key: 'onMuteLocal',
          value: function (e, t) {
            switch (e) {
              case be.Amute:
                this._emitter.emit('mute-audio', { userId: t });
                break;
              case be.Aunmute:
                this._emitter.emit('unmute-audio', { userId: t });
                break;
              case be.Vmute:
                this._emitter.emit('mute-video', { userId: t });
                break;
              case be.Vunmute:
                this._emitter.emit('unmute-video', { userId: t });
            }
          },
        },
        {
          key: 'getType',
          value: function (e) {
            var t,
              i,
              r = Ri(this.remoteStreams);
            try {
              for (r.s(); !(i = r.n()).done; ) {
                var n = C(i.value, 2)[1];
                if (n.audioStreamId === e || n.videoStreamId === e) {
                  t = n.getType();
                  break;
                }
              }
            } catch (e) {
              r.e(e);
            } finally {
              r.f();
            }
            return t;
          },
        },
        {
          key: 'hasPublishedStream',
          value: function () {
            return this.localStreams.some(function (e) {
              return e.published;
            });
          },
        },
        {
          key: 'getClientState',
          value: function () {
            return this.state;
          },
        },
        {
          key: 'onDeviceChange',
          value:
            ((r = T(
              A.mark(function e() {
                var t,
                  i,
                  r,
                  n,
                  o,
                  s,
                  a,
                  c,
                  u,
                  d,
                  l,
                  h,
                  p,
                  f,
                  m,
                  g,
                  v,
                  b,
                  S,
                  y,
                  E,
                  C,
                  I,
                  T = this;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          return ((e.prev = 0), (e.next = 3), je());
                        case 3:
                          if (
                            ((t = e.sent),
                            (i = JSON.parse(
                              JSON.stringify(this._preDiviceList)
                            )),
                            (this._preDiviceList = t),
                            (r = t.filter(function (e) {
                              return (
                                -1 ===
                                i.findIndex(function (t) {
                                  return t.deviceId === e.deviceId;
                                })
                              );
                            })).length &&
                              this.logger.info(
                                'onDeviceChange addedDevices',
                                JSON.stringify(r, null, 4)
                              ),
                            (n = i.filter(function (e) {
                              return (
                                -1 ===
                                t.findIndex(function (t) {
                                  return t.deviceId === e.deviceId;
                                })
                              );
                            })).length &&
                              this.logger.info(
                                'onDeviceChange removedDevices',
                                JSON.stringify(n, null, 4)
                              ),
                            (o = this.localStreams.find(function (e) {
                              return !e.screen;
                            })),
                            (s = r.filter(function (e) {
                              return 'audiooutput' === e.kind;
                            })),
                            (a = t.filter(function (e) {
                              return 'default' === e.deviceId;
                            })),
                            !o)
                          ) {
                            e.next = 63;
                            break;
                          }
                          if (
                            ((c = t.filter(function (e) {
                              return (
                                'audioinput' === e.kind &&
                                'default' === e.deviceId
                              );
                            })),
                            !r || !r.length)
                          ) {
                            e.next = 42;
                            break;
                          }
                          if (
                            ((u = i.find(function (e) {
                              return 'audioinput' === e.kind;
                            })),
                            (d = i.find(function (e) {
                              return 'videoinput' === e.kind;
                            })),
                            (l = r.filter(function (e) {
                              return 'audioinput' === e.kind;
                            })),
                            (h = r.filter(function (e) {
                              return 'videoinput' === e.kind;
                            })),
                            (p = !u && l.length > 0 && o.hasAudio()),
                            (f = !d && h.length > 0 && o.hasVideo()),
                            !p || !f)
                          ) {
                            e.next = 30;
                            break;
                          }
                          return (
                            this.logger.warn(
                              'new microphone and camera detected, but there was no device before.'
                            ),
                            (e.next = 26),
                            o.updateStream({
                              audio: !0,
                              video: !0,
                              cameraId: h[0].deviceId,
                              microphoneId: c.length
                                ? c[0].deviceId
                                : l[0].deviceId,
                            })
                          );
                        case 26:
                          (this._emitter.emit('auto-switch-device', {
                            type: 'audio',
                            deviceId: c.length ? c[0].deviceId : l[0].deviceId,
                          }),
                            this._emitter.emit('auto-switch-device', {
                              type: 'video',
                              deviceId: h[0].deviceId,
                            }),
                            (e.next = 42));
                          break;
                        case 30:
                          if (!p) {
                            e.next = 37;
                            break;
                          }
                          return (
                            this.logger.warn(
                              'new microphone  detected, but there was no device before.'
                            ),
                            (e.next = 34),
                            o.updateStream({
                              audio: !0,
                              video: !1,
                              microphoneId: l[0].deviceId,
                            })
                          );
                        case 34:
                          (this._emitter.emit('auto-switch-device', {
                            type: 'audio',
                            deviceId: l[0].deviceId,
                          }),
                            (e.next = 42));
                          break;
                        case 37:
                          if (!f) {
                            e.next = 42;
                            break;
                          }
                          return (
                            this.logger.warn(
                              'new camera  detected, but there was no device before.'
                            ),
                            (e.next = 41),
                            o.updateStream({
                              audio: !1,
                              video: !0,
                              cameraId: h[0].deviceId,
                            })
                          );
                        case 41:
                          this._emitter.emit('auto-switch-device', {
                            type: 'video',
                            deviceId: h[0].deviceId,
                          });
                        case 42:
                          if (!n || !n.length) {
                            e.next = 63;
                            break;
                          }
                          if (
                            ((m = o.getDevicesInfoInUse()),
                            (g = m.microphone),
                            (v = m.camera),
                            this.logger.warn(
                              'Devices in use microphone:'
                                .concat(JSON.stringify(g, null, 4), ',camera:')
                                .concat(JSON.stringify(v, null, 4))
                            ),
                            (b = n.find(function (e) {
                              return e.groupId && g.groupId
                                ? e.deviceId === g.deviceId &&
                                    e.groupId === g.groupId
                                : e.deviceId === g.deviceId;
                            })),
                            (S = n.find(function (e) {
                              return e.groupId && v.groupId
                                ? e.deviceId === v.deviceId &&
                                    e.groupId === v.groupId
                                : e.deviceId === v.deviceId;
                            })),
                            (y = t.find(function (e) {
                              return 'audioinput' === e.kind;
                            })),
                            (E = t.find(function (e) {
                              return 'videoinput' === e.kind;
                            })),
                            (C = b && o.hasAudio()),
                            (I = S && o.hasVideo()),
                            !C)
                          ) {
                            e.next = 57;
                            break;
                          }
                          if (
                            (this.logger.warn(
                              'current microphone in use is lost, deviceId: '.concat(
                                g.deviceId
                              )
                            ),
                            !y)
                          ) {
                            e.next = 57;
                            break;
                          }
                          return (
                            (e.next = 56),
                            o.updateStream({ audio: !0, video: !1 })
                          );
                        case 56:
                          this._emitter.emit('auto-switch-device', {
                            type: 'audio',
                          });
                        case 57:
                          if (!I) {
                            e.next = 63;
                            break;
                          }
                          if (
                            (this.logger.warn(
                              'current camera in use is lost, deviceId: '.concat(
                                v.deviceId
                              )
                            ),
                            !E)
                          ) {
                            e.next = 63;
                            break;
                          }
                          return (
                            (e.next = 62),
                            o.updateStream({ audio: !1, video: !0 })
                          );
                        case 62:
                          this._emitter.emit('auto-switch-device', {
                            type: 'video',
                          });
                        case 63:
                          (s.length &&
                            a.length &&
                            this.remoteStreams.forEach(function (e) {
                              e.setAudioOutput('default');
                            }),
                            r.forEach(function (e) {
                              switch (e.kind) {
                                case 'audioinput':
                                  (T.logger.info(
                                    'The new microphone device be detected is',
                                    e.label
                                  ),
                                    T._emitter.emit(
                                      'recording-device-changed',
                                      { deviceId: e.deviceId, state: 'ADD' }
                                    ));
                                  break;
                                case 'videoinput':
                                  (T.logger.info(
                                    'The new camera device be detected is',
                                    e.label
                                  ),
                                    T._emitter.emit('camera-changed', {
                                      deviceId: e.deviceId,
                                      state: 'ADD',
                                    }));
                                  break;
                                case 'audiooutput':
                                  (T.logger.info(
                                    'The new speaker device be detected is',
                                    e.label
                                  ),
                                    T._emitter.emit('playback-device-changed', {
                                      deviceId: e.deviceId,
                                      state: 'ADD',
                                    }));
                              }
                            }),
                            n.forEach(function (e) {
                              switch (e.kind) {
                                case 'audioinput':
                                  (T.logger.info(
                                    'The microphone device is detected to be removed: ',
                                    e.label
                                  ),
                                    T._emitter.emit(
                                      'recording-device-changed',
                                      { deviceId: e.deviceId, state: 'REMOVE' }
                                    ));
                                  break;
                                case 'videoinput':
                                  (T.logger.info(
                                    'The camera device is detected to be removed: ',
                                    e.label
                                  ),
                                    T._emitter.emit('camera-changed', {
                                      deviceId: e.deviceId,
                                      state: 'REMOVE',
                                    }));
                                  break;
                                case 'audiooutput':
                                  (T.logger.info(
                                    'The speaker device is detected to be removed: ',
                                    e.label
                                  ),
                                    T._emitter.emit('playback-device-changed', {
                                      deviceId: e.deviceId,
                                      state: 'REMOVE',
                                    }));
                              }
                            }),
                            (e.next = 71));
                          break;
                        case 68:
                          ((e.prev = 68),
                            (e.t0 = e.catch(0)),
                            this.logger.onError(
                              { c: Ue.TOP_ERROR, v: B.SWITCH_DEVICE_FAILED },
                              'on device change error, '.concat(e.t0)
                            ));
                        case 71:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this,
                  [[0, 68]]
                );
              })
            )),
            function () {
              return r.apply(this, arguments);
            }),
        },
        {
          key: 'enableAudioVolumeEvaluation',
          value: function () {
            var e = this,
              t =
                arguments.length > 0 && void 0 !== arguments[0]
                  ? arguments[0]
                  : 2e3;
            if (
              (this.logger.info(
                'enableAudioVolumeEvaluation with interval: ' + t
              ),
              this.logger.buriedLog({
                c: Ue.ENABLE_AUDIO_VOLUME_EVALUATION,
                v: 'time:'.concat(t),
              }),
              'number' != typeof t)
            )
              throw (
                this.logger.onError({
                  c: Ue.TOP_ERROR,
                  v: B.INVALID_PARAMETER,
                }),
                new X({
                  code: B.INVALID_PARAMETER,
                  message: 'parameter must be numeric type',
                })
              );
            t <= 0
              ? (window.clearInterval(this.audioVolumeInterval),
                (this.audioVolumeInterval = null))
              : (this.audioVolumeInterval &&
                  (window.clearInterval(this.audioVolumeInterval),
                  (this.audioVolumeInterval = null)),
                (this.audioVolumeInterval = window.setInterval(
                  function () {
                    var t = [];
                    e.localStreams.forEach(function (e) {
                      if (!e.screen && e.published) {
                        var i = Math.floor(100 * e.getAudioLevel());
                        t.push({
                          userId: e.getUserId(),
                          audioVolume: i,
                          stream: e,
                        });
                      }
                    });
                    var i,
                      r = Ri(e.remoteStreams);
                    try {
                      for (r.s(); !(i = r.n()).done; ) {
                        var n = C(i.value, 2)[1];
                        if ('main' === n.getType() && n.subscribed) {
                          var o = Math.floor(100 * n.getAudioLevel());
                          t.push({
                            userId: n.getUserId(),
                            audioVolume: o,
                            stream: n,
                          });
                        }
                      }
                    } catch (e) {
                      r.e(e);
                    } finally {
                      r.f();
                    }
                    e._emitter.emit('audio-volume', { result: t });
                  },
                  Math.floor(Math.max(t, 16))
                )));
          },
        },
        {
          key: 'addEventListenser',
          value: function (e) {
            (this.ssl &&
              navigator.mediaDevices &&
              'devicechange' === e &&
              navigator.mediaDevices.addEventListener(e, this.deviceChange),
              'visibilitychange' === e &&
                document.addEventListener(e, this.visibilitychange));
          },
        },
        {
          key: 'removeEventListenser',
          value: function (e) {
            (this.ssl &&
              navigator.mediaDevices &&
              'devicechange' === e &&
              navigator.mediaDevices.removeEventListener(e, this.deviceChange),
              'visibilitychange' === e &&
                document.removeEventListener(e, this.visibilitychange));
          },
        },
        {
          key: 'startWaterMark',
          value:
            ((i = T(
              A.mark(function e(t) {
                var i,
                  r,
                  n,
                  o,
                  s = this;
                return A.wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          if (!this.isWaterMark) {
                            e.next = 2;
                            break;
                          }
                          return e.abrupt('return');
                        case 2:
                          return (
                            (this.isWaterMark = !0),
                            (i = {
                              fontColor: 'rgba(200,200,200,0.6)',
                              fontSize: '12',
                              fontType: 'Microsoft Yahei',
                            }),
                            (r = t.fontColor),
                            (n = t.fontSize),
                            (o = t.fontType),
                            t &&
                              (r && (i.fontColor = r),
                              n && (i.fontSize = n),
                              o && (i.fontType = o)),
                            (e.next = 8),
                            tt(i, this.userId)
                          );
                        case 8:
                          ((this.waterMarkImage = e.sent),
                            (this.waterMarkoptions = i),
                            this.remoteStreams.size &&
                              this.remoteStreams.forEach(
                                (function () {
                                  var e = T(
                                    A.mark(function e(t) {
                                      return A.wrap(function (e) {
                                        for (;;)
                                          switch ((e.prev = e.next)) {
                                            case 0:
                                              if (t.getType() !== N) {
                                                e.next = 3;
                                                break;
                                              }
                                              return (
                                                (e.next = 3),
                                                t.startWaterMark(
                                                  i,
                                                  s.waterMarkImage
                                                )
                                              );
                                            case 3:
                                            case 'end':
                                              return e.stop();
                                          }
                                      }, e);
                                    })
                                  );
                                  return function (t) {
                                    return e.apply(this, arguments);
                                  };
                                })()
                              ));
                        case 11:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this
                );
              })
            )),
            function (e) {
              return i.apply(this, arguments);
            }),
        },
        {
          key: 'closeWaterMark',
          value: function () {
            this.isWaterMark &&
              ((this.isWaterMark = !1),
              (this.waterMarkImage = null),
              this.remoteStreams.size &&
                this.remoteStreams.forEach(function (e) {
                  e.getType() === N && e.closeWaterMark();
                }));
          },
        },
        {
          key: 'enableSmallStream',
          value: function () {
            var e = this.localStreams.find(function (e) {
              return e.videoStreamId && !e.screen;
            });
            if (e && e.published)
              throw new X({
                code: B.INVALID_OPERATION,
                message:
                  'Cannot enable small stream after localStream published.',
              });
            if (!Ge())
              throw new X({
                code: B.INVALID_OPERATION,
                message: 'Your browser does not support opening small stream',
              });
            return (
              this.setIsEnableSmallStream(!0),
              this.logger.info('SmallStream successfully enabled'),
              this.logger.buriedLog({ c: Ue.ENABLE_SMALL_STREAM }),
              Promise.resolve(!0)
            );
          },
        },
        {
          key: 'disableSmallStream',
          value: function () {
            var e = this.localStreams.find(function (e) {
              return e.videoStreamId && !e.screen;
            });
            if (e && e.published)
              throw new X({
                code: B.INVALID_OPERATION,
                message: 'Cannot enable small stream after having published.',
              });
            return (
              this.setIsEnableSmallStream(!1),
              this.logger.info('SmallStream successfully disabled'),
              this.logger.buriedLog({ c: Ue.DISABLE_SMALL_STREAM }),
              Promise.resolve(!0)
            );
          },
        },
        {
          key: 'setSmallStreamProfile',
          value: function (e) {
            var t = e.width,
              i = e.height,
              r = e.bitrate,
              n = e.framerate;
            if (
              (this.logger.info(
                'setSmallStreamProfile:width='
                  .concat(t, ',height=')
                  .concat(i, ',bitrate=')
                  .concat(r, ',framerate=')
                  .concat(n)
              ),
              t < 0 || i < 0 || r < 0 || n < 0)
            )
              throw new X({
                code: B.INVALID_OPERATION,
                message: 'Small stream profile is invalid.',
              });
            (this.logger.buriedLog({
              c: Ue.SET_SMALL_STREAM_PROFILE,
              v: JSON.stringify(e),
            }),
              (this.smallStreamConfig = {
                width: t,
                height: i,
                bitrate: r,
                framerate: n,
              }));
          },
        },
        {
          key: 'setIsEnableSmallStream',
          value: function (e) {
            this.isEnableSmallStream = e;
          },
        },
        {
          key: 'onVisibilitychange',
          value: function () {
            'visible' === document.visibilityState
              ? (this.logger.warn('User enter the page'),
                this._emitter.emit('page-visibility-state', {
                  state: 'visible',
                }))
              : 'hidden' === document.visibilityState &&
                (this.logger.warn('User leave the pag'),
                this._emitter.emit('page-visibility-state', {
                  state: 'hidden',
                }));
          },
        },
        {
          key: 'isJoinRoomSupported',
          value:
            ((t = T(
              A.mark(function e() {
                var t, i, r, n, o, s, a, c, u;
                return A.wrap(function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        return ((e.next = 2), Fe());
                      case 2:
                        if (
                          ((i = (t = e.sent.detail).isBrowserSupported),
                          (n = t.isH264Supported),
                          (r = t.isWebRTCSupported) && n && i)
                        ) {
                          e.next = 9;
                          break;
                        }
                        return (
                          (o = ee()),
                          (s = o.browser),
                          (a = o.version),
                          (c = r
                            ? n
                              ? B.BROWSER_NOT_SUPPORTED
                              : B.H264_NOT_SUPPORTED
                            : B.WEBRTC_NOT_SUPPORTED),
                          (u = r
                            ? n
                              ? ''
                                  .concat(s)
                                  .concat(a, ' browser is not supported')
                              : 'your device does not support H.264 encoding.'
                            : 'your browser does NOT support WebRTC!'),
                          e.abrupt(
                            'return',
                            Promise.resolve({
                              isSupported: !1,
                              code: c,
                              message: u,
                            })
                          )
                        );
                      case 9:
                        return e.abrupt(
                          'return',
                          Promise.resolve({
                            isSupported: !0,
                            code: 0,
                            message: '',
                          })
                        );
                      case 10:
                      case 'end':
                        return e.stop();
                    }
                }, e);
              })
            )),
            function () {
              return t.apply(this, arguments);
            }),
        },
        {
          key: 'enableMicVolume',
          value: function () {
            var e =
                arguments.length > 0 && void 0 !== arguments[0]
                  ? arguments[0]
                  : 1e3,
              t = arguments.length > 1 ? arguments[1] : void 0,
              i = this;
            if (e >= 0) {
              if ('number' != typeof e)
                throw new X({
                  code: B.INVALID_PARAMETER,
                  message: 'parameter must be numeric type',
                });
              navigator.mediaDevices
                .getUserMedia({ audio: { deviceId: { exact: t } } })
                .then(function (t) {
                  (i.logger.info('microphone permission is ok'),
                    (i.micStream = t),
                    (i.soundMeter = new Q()),
                    i.soundMeter.connectToSource(
                      i.micStream.getAudioTracks()[0]
                    ),
                    (i.timer = setInterval(
                      function () {
                        i._emitter.emit('mic-volume', {
                          volumes: Math.round(100 * i.soundMeter.getVolume()),
                        });
                      },
                      Math.floor(Math.max(e, 100))
                    )));
                })
                .catch(function (e) {
                  i.logger.error('init error ', e);
                });
            } else
              (clearInterval(i.timer),
                (i.timer = null),
                i.micStream && i.micStream.getAudioTracks()[0].stop());
          },
        },
      ]),
      e
    );
  })();
function Ai(e, t) {
  var i = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      i.push.apply(i, r));
  }
  return i;
}
function Pi(e) {
  for (var t = 1; t < arguments.length; t++) {
    var i = null != arguments[t] ? arguments[t] : {};
    t % 2
      ? Ai(Object(i), !0).forEach(function (t) {
          S(e, t, i[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(i))
        : Ai(Object(i)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(i, t));
          });
  }
  return e;
}
(!(function (e) {
  ((e[(e.TRACE = 0)] = 'TRACE'),
    (e[(e.DEBUG = 1)] = 'DEBUG'),
    (e[(e.INFO = 2)] = 'INFO'),
    (e[(e.WARN = 3)] = 'WARN'),
    (e[(e.ERROR = 4)] = 'ERROR'),
    (e[(e.NONE = 5)] = 'NONE'));
})(ki || (ki = {})),
  (function (e) {
    ((e.NORMAL = 'normal'), (e.POINT = 'point'), (e.MEDIA = 'media'));
  })(Oi || (Oi = {})));
var Li = (function () {
  function e() {
    (_(this, e),
      (this.LogLevel = {
        TRACE: ki.TRACE,
        DEBUG: ki.DEBUG,
        INFO: ki.INFO,
        WARN: ki.WARN,
        ERROR: ki.ERROR,
        NONE: ki.NONE,
      }),
      (this.level = ki.INFO),
      (this.myConsole = window.console),
      (this.uploadLog = !1),
      (this.logList = []),
      (this.buriedLogList = []),
      (this.mediaLogList = []),
      (this.maxNumber = 10),
      (this.timeout = 1e4),
      (this._interval = 0),
      (this._intervalBuried = 0),
      (this.roomId = null),
      (this.serverUrl = ''),
      (this.appConfig = null),
      (this.roomUniqueId = null),
      (this.reUploadMaxCount = 30),
      (this.logReUploadCount = 0),
      (this.buriedlogReUploadCount = 0),
      this.enableUploadLog(),
      window.addEventListener('beforeunload', this.beforeUnload.bind(this), {
        once: !0,
      }));
  }
  return (
    O(e, [
      {
        key: 'setLogLevel',
        value: function (e) {
          ((this.level = e),
            this.buriedLog({
              c: dt.SET_LOG_LEVEL,
              v: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE'][e],
            }));
        },
      },
      {
        key: 'getLogLevel',
        value: function () {
          return this.level;
        },
      },
      {
        key: 'setUserId',
        value: function (e) {
          this.userId = e;
        },
      },
      {
        key: 'setRoomId',
        value: function (e) {
          this.roomId = e;
        },
      },
      {
        key: 'setRoomUniqueId',
        value: function (e) {
          this.roomUniqueId = e;
        },
      },
      {
        key: 'setServerUrl',
        value: function (e) {
          (e ||
            ((this.uploadLogList = this.logList.splice(0, this.logList.length)),
            this.upload(this.uploadLogList)),
            (this.serverUrl = e));
        },
      },
      {
        key: 'setAppConfig',
        value: function (e) {
          var t, i;
          ((this.appConfig = e),
            null !== (t = this.appConfig) && void 0 !== t && t.enableLog
              ? this.enableUploadLog()
              : this.disableUploadLog(),
            null !== (i = this.appConfig) && void 0 !== i && i.enableEvent
              ? this.enableUploadBuriedLogs()
              : this.disableUploadBuriedLogs());
        },
      },
      {
        key: 'debug',
        value: function (e) {
          var t;
          if (!(this.level === ki.NONE || ki.DEBUG < this.level)) {
            for (
              var i = arguments.length, r = new Array(i > 1 ? i - 1 : 0), n = 1;
              n < i;
              n++
            )
              r[n - 1] = arguments[n];
            ((t = this.myConsole).debug.apply(
              t,
              [
                'XRTC <Debug> '.concat(
                  this.userId ? '['.concat(this.userId, ']') : ''
                ),
                e,
              ].concat(r)
            ),
              this.collect(ki.DEBUG, e, r));
          }
        },
      },
      {
        key: 'info',
        value: function (e) {
          for (
            var t,
              i = arguments.length,
              r = new Array(i > 1 ? i - 1 : 0),
              n = 1;
            n < i;
            n++
          )
            r[n - 1] = arguments[n];
          (this.collect(ki.INFO, e, r),
            this.level === ki.NONE ||
              ki.INFO < this.level ||
              (t = this.myConsole).info.apply(
                t,
                [
                  'XRTC <Info> '.concat(
                    this.userId ? '['.concat(this.userId, ']') : ''
                  ),
                  e,
                ].concat(r)
              ));
        },
      },
      {
        key: 'warn',
        value: function (e) {
          for (
            var t,
              i = arguments.length,
              r = new Array(i > 1 ? i - 1 : 0),
              n = 1;
            n < i;
            n++
          )
            r[n - 1] = arguments[n];
          (this.collect(ki.WARN, e, r),
            this.level === ki.NONE ||
              ki.WARN < this.level ||
              (t = this.myConsole).warn.apply(
                t,
                [
                  'XRTC <Warn> '.concat(
                    this.userId ? '['.concat(this.userId, ']') : ''
                  ),
                  e,
                ].concat(r)
              ));
        },
      },
      {
        key: 'error',
        value: function (e) {
          for (
            var t,
              i = arguments.length,
              r = new Array(i > 1 ? i - 1 : 0),
              n = 1;
            n < i;
            n++
          )
            r[n - 1] = arguments[n];
          (this.collect(ki.ERROR, e, r),
            this.level === ki.NONE ||
              ki.ERROR < this.level ||
              (t = this.myConsole).error.apply(
                t,
                [
                  'XRTC <Error> '.concat(
                    this.userId ? '['.concat(this.userId, ']') : ''
                  ),
                  e,
                ].concat(r)
              ));
        },
      },
      {
        key: 'enableUploadLog',
        value: function () {
          var e = this;
          this._interval ||
            ((this.uploadLog = !0),
            (this._interval = window.setInterval(function () {
              e.roomId &&
                e.logList.length > 0 &&
                ((e.uploadLogList = e.logList.splice(0, e.logList.length)),
                e.upload(e.uploadLogList));
            }, this.timeout)),
            this.buriedLog({ c: dt.ENABLE_UPLOAD_LOG }));
        },
      },
      {
        key: 'disableUploadLog',
        value: function () {
          ((this.uploadLog = !1),
            window.clearInterval(this._interval),
            (this._interval = 0),
            this.buriedLog({ c: dt.DISABLE_UPLOAD_LOG }));
        },
      },
      {
        key: 'collect',
        value: function (e, t, i) {
          this.uploadLog &&
            (this.logList.push({
              t: Date.now(),
              lv: e,
              mdu: 'XRTC',
              msg: 'XRTC '
                .concat(this.userId ? '['.concat(this.userId, ']') : '', ' ')
                .concat(t, ' ')
                .concat((i || []).join(' '), '\r\n'),
            }),
            this.roomId &&
              this.logList.length >= this.maxNumber &&
              ((this.uploadLogList = this.logList.splice(
                0,
                this.logList.length
              )),
              this.upload(this.uploadLogList)));
        },
      },
      {
        key: 'upload',
        value: function (e) {
          var t = this;
          this.serverUrl &&
            Ci.upload({
              type: Oi.NORMAL,
              app: Ci.appKey,
              rid: this.roomId,
              uid: this.userId,
              pf: 'web',
              list: e,
            })
              .then(function () {})
              .catch(function () {
                ((t.logReUploadCount = t.logReUploadCount + 1),
                  t.logReUploadCount > t.reUploadMaxCount
                    ? ((t.logList = []),
                      (t.logReUploadCount = 0),
                      t.info(
                        'SDK has tried reupload log '.concat(
                          t.reUploadMaxCount,
                          ' times, but all failed, and old log cleared'
                        )
                      ))
                    : (t.logList = [].concat(R(e), R(t.logList))));
              });
        },
      },
      {
        key: 'buriedLog',
        value: function (e, t) {
          var i,
            r = this;
          if (
            (!this.appConfig || this.appConfig.enableEvent) &&
            (this.buriedLogList.push(
              Pi(Pi({}, e), {}, { t: this.adjustServerTime(Date.now()) })
            ),
            e.c === dt.JOIN_SUCCESS &&
              this.buriedLogList.forEach(function (e) {
                e.c !== dt.JOIN_SUCCESS && (e.t = r.adjustServerTime(e.t));
              }),
            null !== (i = this.appConfig) &&
              void 0 !== i &&
              i.enableEvent &&
              this.roomUniqueId &&
              (t || this.buriedLogList.length >= this.maxNumber))
          ) {
            var n = this.buriedLogList.splice(0, this.buriedLogList.length);
            this.uploadBuriedLogs(n, Oi.POINT);
          }
        },
      },
      {
        key: 'mediaLog',
        value: function (e, t) {
          var i;
          if (
            (!this.appConfig || this.appConfig.enableEvent) &&
            (this.mediaLogList.push(
              Pi(Pi({}, e), {}, { t: this.adjustServerTime(Date.now()) })
            ),
            null !== (i = this.appConfig) &&
              void 0 !== i &&
              i.enableEvent &&
              this.roomUniqueId &&
              (t || this.mediaLogList.length >= this.maxNumber))
          ) {
            var r = this.mediaLogList.splice(0, this.mediaLogList.length);
            this.uploadBuriedLogs(r, Oi.MEDIA);
          }
        },
      },
      {
        key: 'uploadBuriedLogs',
        value: function (e, t) {
          var i = this;
          !this.serverUrl ||
            (this.appConfig && !this.appConfig.enableEvent) ||
            Ci.upload({
              type: t,
              app: Ci.appKey,
              ruid: this.roomUniqueId,
              uid: this.userId,
              pf: 'web',
              list: e,
            })
              .then(function () {})
              .catch(function (r) {
                ((i.buriedlogReUploadCount = i.buriedlogReUploadCount + 1),
                  i.buriedlogReUploadCount > i.reUploadMaxCount
                    ? (t === Oi.POINT && (i.buriedLogList = []),
                      t === Oi.MEDIA && (i.mediaLogList = []),
                      (i.buriedlogReUploadCount = 0),
                      i.info(
                        'SDK has tried reupload buried log '.concat(
                          i.reUploadMaxCount,
                          ' times, but all failed, and old log cleared'
                        )
                      ))
                    : t === Oi.POINT
                      ? (i.buriedLogList = [].concat(R(e), R(i.buriedLogList)))
                      : t === Oi.MEDIA &&
                        (i.mediaLogList = [].concat(R(e), R(i.mediaLogList))));
              });
        },
      },
      {
        key: 'enableUploadBuriedLogs',
        value: function () {
          var e = this;
          this._intervalBuried ||
            (this._intervalBuried = window.setInterval(function () {
              if (e.buriedLogList.length > 0) {
                var t = e.buriedLogList.splice(0, e.buriedLogList.length);
                e.uploadBuriedLogs(t, Oi.POINT);
              }
              if (e.mediaLogList.length > 0) {
                var i = e.mediaLogList.splice(0, e.mediaLogList.length);
                e.uploadBuriedLogs(i, Oi.MEDIA);
              }
            }, this.timeout));
        },
      },
      {
        key: 'disableUploadBuriedLogs',
        value: function () {
          (window.clearInterval(this._intervalBuried),
            (this._intervalBuried = 0));
        },
      },
      {
        key: 'beforeUnload',
        value: function () {
          if (this.logList.length > 0) {
            var e = this.logList.splice(0, this.logList.length);
            this.upload(e);
          }
          if (this.buriedLogList.length > 0) {
            var t = this.buriedLogList.splice(0, this.buriedLogList.length);
            this.uploadBuriedLogs(t, Oi.POINT);
          }
          if (this.mediaLogList.length > 0) {
            var i = this.mediaLogList.splice(0, this.mediaLogList.length);
            this.uploadBuriedLogs(i, Oi.MEDIA);
          }
          (this.disableUploadLog(), this.disableUploadBuriedLogs());
        },
      },
      {
        key: 'adjustServerTime',
        value: function (e) {
          var t;
          return null !== (t = this.appConfig) && void 0 !== t && t.timeDiff
            ? e - this.appConfig.timeDiff
            : e;
        },
      },
      {
        key: 'onError',
        value: function (e, t, i) {
          (i ? this.buriedLog(e, i) : this.buriedLog(e), t && this.error(t));
        },
      },
    ]),
    e
  );
})();
let Di = !0,
  xi = !0;
function Mi(e, t, i) {
  const r = e.match(t);
  return r && r.length >= i && parseInt(r[i], 10);
}
function Ui(e, t, i) {
  if (!e.RTCPeerConnection) return;
  const r = e.RTCPeerConnection.prototype,
    n = r.addEventListener;
  r.addEventListener = function (e, r) {
    if (e !== t) return n.apply(this, arguments);
    const o = e => {
      const t = i(e);
      t && (r.handleEvent ? r.handleEvent(t) : r(t));
    };
    return (
      (this._eventMap = this._eventMap || {}),
      this._eventMap[t] || (this._eventMap[t] = new Map()),
      this._eventMap[t].set(r, o),
      n.apply(this, [e, o])
    );
  };
  const o = r.removeEventListener;
  ((r.removeEventListener = function (e, i) {
    if (e !== t || !this._eventMap || !this._eventMap[t])
      return o.apply(this, arguments);
    if (!this._eventMap[t].has(i)) return o.apply(this, arguments);
    const r = this._eventMap[t].get(i);
    return (
      this._eventMap[t].delete(i),
      0 === this._eventMap[t].size && delete this._eventMap[t],
      0 === Object.keys(this._eventMap).length && delete this._eventMap,
      o.apply(this, [e, r])
    );
  }),
    Object.defineProperty(r, 'on' + t, {
      get() {
        return this['_on' + t];
      },
      set(e) {
        (this['_on' + t] &&
          (this.removeEventListener(t, this['_on' + t]),
          delete this['_on' + t]),
          e && this.addEventListener(t, (this['_on' + t] = e)));
      },
      enumerable: !0,
      configurable: !0,
    }));
}
function Ni(e) {
  return 'boolean' != typeof e
    ? new Error('Argument type: ' + typeof e + '. Please use a boolean.')
    : ((Di = e),
      e ? 'adapter.js logging disabled' : 'adapter.js logging enabled');
}
function Vi(e) {
  return 'boolean' != typeof e
    ? new Error('Argument type: ' + typeof e + '. Please use a boolean.')
    : ((xi = !e),
      'adapter.js deprecation warnings ' + (e ? 'disabled' : 'enabled'));
}
function Fi() {
  if ('object' == typeof window) {
    if (Di) return;
    'undefined' != typeof console && console.log;
  }
}
function ji(e) {
  return '[object Object]' === Object.prototype.toString.call(e);
}
function Bi(e) {
  return ji(e)
    ? Object.keys(e).reduce(function (t, i) {
        const r = ji(e[i]),
          n = r ? Bi(e[i]) : e[i],
          o = r && !Object.keys(n).length;
        return void 0 === n || o ? t : Object.assign(t, { [i]: n });
      }, {})
    : e;
}
function Wi(e, t, i) {
  t &&
    !i.has(t.id) &&
    (i.set(t.id, t),
    Object.keys(t).forEach(r => {
      r.endsWith('Id')
        ? Wi(e, e.get(t[r]), i)
        : r.endsWith('Ids') &&
          t[r].forEach(t => {
            Wi(e, e.get(t), i);
          });
    }));
}
function Hi(e, t, i) {
  const r = i ? 'outbound-rtp' : 'inbound-rtp',
    n = new Map();
  if (null === t) return n;
  const o = [];
  return (
    e.forEach(e => {
      'track' === e.type && e.trackIdentifier === t.id && o.push(e);
    }),
    o.forEach(t => {
      e.forEach(i => {
        i.type === r && i.trackId === t.id && Wi(e, i, n);
      });
    }),
    n
  );
}
const Gi = Fi;
function Ji(e, t) {
  const i = e && e.navigator;
  if (!i.mediaDevices) return;
  const r = function (e) {
      if ('object' != typeof e || e.mandatory || e.optional) return e;
      const t = {};
      return (
        Object.keys(e).forEach(i => {
          if ('require' === i || 'advanced' === i || 'mediaSource' === i)
            return;
          const r = 'object' == typeof e[i] ? e[i] : { ideal: e[i] };
          void 0 !== r.exact &&
            'number' == typeof r.exact &&
            (r.min = r.max = r.exact);
          const n = function (e, t) {
            return e
              ? e + t.charAt(0).toUpperCase() + t.slice(1)
              : 'deviceId' === t
                ? 'sourceId'
                : t;
          };
          if (void 0 !== r.ideal) {
            t.optional = t.optional || [];
            let e = {};
            'number' == typeof r.ideal
              ? ((e[n('min', i)] = r.ideal),
                t.optional.push(e),
                (e = {}),
                (e[n('max', i)] = r.ideal),
                t.optional.push(e))
              : ((e[n('', i)] = r.ideal), t.optional.push(e));
          }
          void 0 !== r.exact && 'number' != typeof r.exact
            ? ((t.mandatory = t.mandatory || {}),
              (t.mandatory[n('', i)] = r.exact))
            : ['min', 'max'].forEach(e => {
                void 0 !== r[e] &&
                  ((t.mandatory = t.mandatory || {}),
                  (t.mandatory[n(e, i)] = r[e]));
              });
        }),
        e.advanced && (t.optional = (t.optional || []).concat(e.advanced)),
        t
      );
    },
    n = function (e, n) {
      if (t.version >= 61) return n(e);
      if ((e = JSON.parse(JSON.stringify(e))) && 'object' == typeof e.audio) {
        const t = function (e, t, i) {
          t in e && !(i in e) && ((e[i] = e[t]), delete e[t]);
        };
        (t(
          (e = JSON.parse(JSON.stringify(e))).audio,
          'autoGainControl',
          'googAutoGainControl'
        ),
          t(e.audio, 'noiseSuppression', 'googNoiseSuppression'),
          (e.audio = r(e.audio)));
      }
      if (e && 'object' == typeof e.video) {
        let o = e.video.facingMode;
        o = o && ('object' == typeof o ? o : { ideal: o });
        const s = t.version < 66;
        if (
          o &&
          ('user' === o.exact ||
            'environment' === o.exact ||
            'user' === o.ideal ||
            'environment' === o.ideal) &&
          (!i.mediaDevices.getSupportedConstraints ||
            !i.mediaDevices.getSupportedConstraints().facingMode ||
            s)
        ) {
          let t;
          if (
            (delete e.video.facingMode,
            'environment' === o.exact || 'environment' === o.ideal
              ? (t = ['back', 'rear'])
              : ('user' !== o.exact && 'user' !== o.ideal) || (t = ['front']),
            t)
          )
            return i.mediaDevices.enumerateDevices().then(i => {
              let s = (i = i.filter(e => 'videoinput' === e.kind)).find(e =>
                t.some(t => e.label.toLowerCase().includes(t))
              );
              return (
                !s && i.length && t.includes('back') && (s = i[i.length - 1]),
                s &&
                  (e.video.deviceId = o.exact
                    ? { exact: s.deviceId }
                    : { ideal: s.deviceId }),
                (e.video = r(e.video)),
                Gi('chrome: ' + JSON.stringify(e)),
                n(e)
              );
            });
        }
        e.video = r(e.video);
      }
      return (Gi('chrome: ' + JSON.stringify(e)), n(e));
    },
    o = function (e) {
      return t.version >= 64
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
            toString() {
              return this.name + (this.message && ': ') + this.message;
            },
          };
    };
  if (
    ((i.getUserMedia = function (e, t, r) {
      n(e, e => {
        i.webkitGetUserMedia(e, t, e => {
          r && r(o(e));
        });
      });
    }.bind(i)),
    i.mediaDevices.getUserMedia)
  ) {
    const e = i.mediaDevices.getUserMedia.bind(i.mediaDevices);
    i.mediaDevices.getUserMedia = function (t) {
      return n(t, t =>
        e(t).then(
          e => {
            if (
              (t.audio && !e.getAudioTracks().length) ||
              (t.video && !e.getVideoTracks().length)
            )
              throw (
                e.getTracks().forEach(e => {
                  e.stop();
                }),
                new DOMException('', 'NotFoundError')
              );
            return e;
          },
          e => Promise.reject(o(e))
        )
      );
    };
  }
}
function Ki(e) {
  e.MediaStream = e.MediaStream || e.webkitMediaStream;
}
function Yi(e) {
  if (
    'object' == typeof e &&
    e.RTCPeerConnection &&
    !('ontrack' in e.RTCPeerConnection.prototype)
  ) {
    Object.defineProperty(e.RTCPeerConnection.prototype, 'ontrack', {
      get() {
        return this._ontrack;
      },
      set(e) {
        (this._ontrack && this.removeEventListener('track', this._ontrack),
          this.addEventListener('track', (this._ontrack = e)));
      },
      enumerable: !0,
      configurable: !0,
    });
    const t = e.RTCPeerConnection.prototype.setRemoteDescription;
    e.RTCPeerConnection.prototype.setRemoteDescription = function () {
      return (
        this._ontrackpoly ||
          ((this._ontrackpoly = t => {
            (t.stream.addEventListener('addtrack', i => {
              let r;
              r = e.RTCPeerConnection.prototype.getReceivers
                ? this.getReceivers().find(
                    e => e.track && e.track.id === i.track.id
                  )
                : { track: i.track };
              const n = new Event('track');
              ((n.track = i.track),
                (n.receiver = r),
                (n.transceiver = { receiver: r }),
                (n.streams = [t.stream]),
                this.dispatchEvent(n));
            }),
              t.stream.getTracks().forEach(i => {
                let r;
                r = e.RTCPeerConnection.prototype.getReceivers
                  ? this.getReceivers().find(
                      e => e.track && e.track.id === i.id
                    )
                  : { track: i };
                const n = new Event('track');
                ((n.track = i),
                  (n.receiver = r),
                  (n.transceiver = { receiver: r }),
                  (n.streams = [t.stream]),
                  this.dispatchEvent(n));
              }));
          }),
          this.addEventListener('addstream', this._ontrackpoly)),
        t.apply(this, arguments)
      );
    };
  } else
    Ui(
      e,
      'track',
      e => (
        e.transceiver ||
          Object.defineProperty(e, 'transceiver', {
            value: { receiver: e.receiver },
          }),
        e
      )
    );
}
function zi(e) {
  if (
    'object' == typeof e &&
    e.RTCPeerConnection &&
    !('getSenders' in e.RTCPeerConnection.prototype) &&
    'createDTMFSender' in e.RTCPeerConnection.prototype
  ) {
    const t = function (e, t) {
      return {
        track: t,
        get dtmf() {
          return (
            void 0 === this._dtmf &&
              (this._dtmf = 'audio' === t.kind ? e.createDTMFSender(t) : null),
            this._dtmf
          );
        },
        _pc: e,
      };
    };
    if (!e.RTCPeerConnection.prototype.getSenders) {
      e.RTCPeerConnection.prototype.getSenders = function () {
        return ((this._senders = this._senders || []), this._senders.slice());
      };
      const i = e.RTCPeerConnection.prototype.addTrack;
      e.RTCPeerConnection.prototype.addTrack = function (e, r) {
        let n = i.apply(this, arguments);
        return (n || ((n = t(this, e)), this._senders.push(n)), n);
      };
      const r = e.RTCPeerConnection.prototype.removeTrack;
      e.RTCPeerConnection.prototype.removeTrack = function (e) {
        r.apply(this, arguments);
        const t = this._senders.indexOf(e);
        -1 !== t && this._senders.splice(t, 1);
      };
    }
    const i = e.RTCPeerConnection.prototype.addStream;
    e.RTCPeerConnection.prototype.addStream = function (e) {
      ((this._senders = this._senders || []),
        i.apply(this, [e]),
        e.getTracks().forEach(e => {
          this._senders.push(t(this, e));
        }));
    };
    const r = e.RTCPeerConnection.prototype.removeStream;
    e.RTCPeerConnection.prototype.removeStream = function (e) {
      ((this._senders = this._senders || []),
        r.apply(this, [e]),
        e.getTracks().forEach(e => {
          const t = this._senders.find(t => t.track === e);
          t && this._senders.splice(this._senders.indexOf(t), 1);
        }));
    };
  } else if (
    'object' == typeof e &&
    e.RTCPeerConnection &&
    'getSenders' in e.RTCPeerConnection.prototype &&
    'createDTMFSender' in e.RTCPeerConnection.prototype &&
    e.RTCRtpSender &&
    !('dtmf' in e.RTCRtpSender.prototype)
  ) {
    const t = e.RTCPeerConnection.prototype.getSenders;
    ((e.RTCPeerConnection.prototype.getSenders = function () {
      const e = t.apply(this, []);
      return (e.forEach(e => (e._pc = this)), e);
    }),
      Object.defineProperty(e.RTCRtpSender.prototype, 'dtmf', {
        get() {
          return (
            void 0 === this._dtmf &&
              (this._dtmf =
                'audio' === this.track.kind
                  ? this._pc.createDTMFSender(this.track)
                  : null),
            this._dtmf
          );
        },
      }));
  }
}
function qi(e) {
  if (!e.RTCPeerConnection) return;
  const t = e.RTCPeerConnection.prototype.getStats;
  e.RTCPeerConnection.prototype.getStats = function () {
    const [e, i, r] = arguments;
    if (arguments.length > 0 && 'function' == typeof e)
      return t.apply(this, arguments);
    if (0 === t.length && (0 === arguments.length || 'function' != typeof e))
      return t.apply(this, []);
    const n = function (e) {
        const t = {};
        return (
          e.result().forEach(e => {
            const i = {
              id: e.id,
              timestamp: e.timestamp,
              type:
                {
                  localcandidate: 'local-candidate',
                  remotecandidate: 'remote-candidate',
                }[e.type] || e.type,
            };
            (e.names().forEach(t => {
              i[t] = e.stat(t);
            }),
              (t[i.id] = i));
          }),
          t
        );
      },
      o = function (e) {
        return new Map(Object.keys(e).map(t => [t, e[t]]));
      };
    return arguments.length >= 2
      ? t.apply(this, [
          function (e) {
            i(o(n(e)));
          },
          e,
        ])
      : new Promise((e, i) => {
          t.apply(this, [
            function (t) {
              e(o(n(t)));
            },
            i,
          ]);
        }).then(i, r);
  };
}
function Xi(e) {
  if (
    !(
      'object' == typeof e &&
      e.RTCPeerConnection &&
      e.RTCRtpSender &&
      e.RTCRtpReceiver
    )
  )
    return;
  if (!('getStats' in e.RTCRtpSender.prototype)) {
    const t = e.RTCPeerConnection.prototype.getSenders;
    t &&
      (e.RTCPeerConnection.prototype.getSenders = function () {
        const e = t.apply(this, []);
        return (e.forEach(e => (e._pc = this)), e);
      });
    const i = e.RTCPeerConnection.prototype.addTrack;
    (i &&
      (e.RTCPeerConnection.prototype.addTrack = function () {
        const e = i.apply(this, arguments);
        return ((e._pc = this), e);
      }),
      (e.RTCRtpSender.prototype.getStats = function () {
        const e = this;
        return this._pc.getStats().then(t => Hi(t, e.track, !0));
      }));
  }
  if (!('getStats' in e.RTCRtpReceiver.prototype)) {
    const t = e.RTCPeerConnection.prototype.getReceivers;
    (t &&
      (e.RTCPeerConnection.prototype.getReceivers = function () {
        const e = t.apply(this, []);
        return (e.forEach(e => (e._pc = this)), e);
      }),
      Ui(e, 'track', e => ((e.receiver._pc = e.srcElement), e)),
      (e.RTCRtpReceiver.prototype.getStats = function () {
        const e = this;
        return this._pc.getStats().then(t => Hi(t, e.track, !1));
      }));
  }
  if (
    !('getStats' in e.RTCRtpSender.prototype) ||
    !('getStats' in e.RTCRtpReceiver.prototype)
  )
    return;
  const t = e.RTCPeerConnection.prototype.getStats;
  e.RTCPeerConnection.prototype.getStats = function () {
    if (arguments.length > 0 && arguments[0] instanceof e.MediaStreamTrack) {
      const e = arguments[0];
      let t, i, r;
      return (
        this.getSenders().forEach(i => {
          i.track === e && (t ? (r = !0) : (t = i));
        }),
        this.getReceivers().forEach(
          t => (t.track === e && (i ? (r = !0) : (i = t)), t.track === e)
        ),
        r || (t && i)
          ? Promise.reject(
              new DOMException(
                'There are more than one sender or receiver for the track.',
                'InvalidAccessError'
              )
            )
          : t
            ? t.getStats()
            : i
              ? i.getStats()
              : Promise.reject(
                  new DOMException(
                    'There is no sender or receiver for the track.',
                    'InvalidAccessError'
                  )
                )
      );
    }
    return t.apply(this, arguments);
  };
}
function Qi(e) {
  e.RTCPeerConnection.prototype.getLocalStreams = function () {
    return (
      (this._shimmedLocalStreams = this._shimmedLocalStreams || {}),
      Object.keys(this._shimmedLocalStreams).map(
        e => this._shimmedLocalStreams[e][0]
      )
    );
  };
  const t = e.RTCPeerConnection.prototype.addTrack;
  e.RTCPeerConnection.prototype.addTrack = function (e, i) {
    if (!i) return t.apply(this, arguments);
    this._shimmedLocalStreams = this._shimmedLocalStreams || {};
    const r = t.apply(this, arguments);
    return (
      this._shimmedLocalStreams[i.id]
        ? -1 === this._shimmedLocalStreams[i.id].indexOf(r) &&
          this._shimmedLocalStreams[i.id].push(r)
        : (this._shimmedLocalStreams[i.id] = [i, r]),
      r
    );
  };
  const i = e.RTCPeerConnection.prototype.addStream;
  e.RTCPeerConnection.prototype.addStream = function (e) {
    ((this._shimmedLocalStreams = this._shimmedLocalStreams || {}),
      e.getTracks().forEach(e => {
        if (this.getSenders().find(t => t.track === e))
          throw new DOMException('Track already exists.', 'InvalidAccessError');
      }));
    const t = this.getSenders();
    i.apply(this, arguments);
    const r = this.getSenders().filter(e => -1 === t.indexOf(e));
    this._shimmedLocalStreams[e.id] = [e].concat(r);
  };
  const r = e.RTCPeerConnection.prototype.removeStream;
  e.RTCPeerConnection.prototype.removeStream = function (e) {
    return (
      (this._shimmedLocalStreams = this._shimmedLocalStreams || {}),
      delete this._shimmedLocalStreams[e.id],
      r.apply(this, arguments)
    );
  };
  const n = e.RTCPeerConnection.prototype.removeTrack;
  e.RTCPeerConnection.prototype.removeTrack = function (e) {
    return (
      (this._shimmedLocalStreams = this._shimmedLocalStreams || {}),
      e &&
        Object.keys(this._shimmedLocalStreams).forEach(t => {
          const i = this._shimmedLocalStreams[t].indexOf(e);
          (-1 !== i && this._shimmedLocalStreams[t].splice(i, 1),
            1 === this._shimmedLocalStreams[t].length &&
              delete this._shimmedLocalStreams[t]);
        }),
      n.apply(this, arguments)
    );
  };
}
function $i(e, t) {
  if (!e.RTCPeerConnection) return;
  if (e.RTCPeerConnection.prototype.addTrack && t.version >= 65) return Qi(e);
  const i = e.RTCPeerConnection.prototype.getLocalStreams;
  e.RTCPeerConnection.prototype.getLocalStreams = function () {
    const e = i.apply(this);
    return (
      (this._reverseStreams = this._reverseStreams || {}),
      e.map(e => this._reverseStreams[e.id])
    );
  };
  const r = e.RTCPeerConnection.prototype.addStream;
  e.RTCPeerConnection.prototype.addStream = function (t) {
    if (
      ((this._streams = this._streams || {}),
      (this._reverseStreams = this._reverseStreams || {}),
      t.getTracks().forEach(e => {
        if (this.getSenders().find(t => t.track === e))
          throw new DOMException('Track already exists.', 'InvalidAccessError');
      }),
      !this._reverseStreams[t.id])
    ) {
      const i = new e.MediaStream(t.getTracks());
      ((this._streams[t.id] = i), (this._reverseStreams[i.id] = t), (t = i));
    }
    r.apply(this, [t]);
  };
  const n = e.RTCPeerConnection.prototype.removeStream;
  function o(e, t) {
    let i = t.sdp;
    return (
      Object.keys(e._reverseStreams || []).forEach(t => {
        const r = e._reverseStreams[t];
        i = i.replace(new RegExp(e._streams[r.id].id, 'g'), r.id);
      }),
      new RTCSessionDescription({ type: t.type, sdp: i })
    );
  }
  ((e.RTCPeerConnection.prototype.removeStream = function (e) {
    ((this._streams = this._streams || {}),
      (this._reverseStreams = this._reverseStreams || {}),
      n.apply(this, [this._streams[e.id] || e]),
      delete this._reverseStreams[
        this._streams[e.id] ? this._streams[e.id].id : e.id
      ],
      delete this._streams[e.id]);
  }),
    (e.RTCPeerConnection.prototype.addTrack = function (t, i) {
      if ('closed' === this.signalingState)
        throw new DOMException(
          "The RTCPeerConnection's signalingState is 'closed'.",
          'InvalidStateError'
        );
      const r = [].slice.call(arguments, 1);
      if (1 !== r.length || !r[0].getTracks().find(e => e === t))
        throw new DOMException(
          'The adapter.js addTrack polyfill only supports a single  stream which is associated with the specified track.',
          'NotSupportedError'
        );
      const n = this.getSenders().find(e => e.track === t);
      if (n)
        throw new DOMException('Track already exists.', 'InvalidAccessError');
      ((this._streams = this._streams || {}),
        (this._reverseStreams = this._reverseStreams || {}));
      const o = this._streams[i.id];
      if (o)
        (o.addTrack(t),
          Promise.resolve().then(() => {
            this.dispatchEvent(new Event('negotiationneeded'));
          }));
      else {
        const r = new e.MediaStream([t]);
        ((this._streams[i.id] = r),
          (this._reverseStreams[r.id] = i),
          this.addStream(r));
      }
      return this.getSenders().find(e => e.track === t);
    }),
    ['createOffer', 'createAnswer'].forEach(function (t) {
      const i = e.RTCPeerConnection.prototype[t];
      e.RTCPeerConnection.prototype[t] = {
        [t]() {
          const e = arguments;
          return arguments.length && 'function' == typeof arguments[0]
            ? i.apply(this, [
                t => {
                  const i = o(this, t);
                  e[0].apply(null, [i]);
                },
                t => {
                  e[1] && e[1].apply(null, t);
                },
                arguments[2],
              ])
            : i.apply(this, arguments).then(e => o(this, e));
        },
      }[t];
    }));
  const s = e.RTCPeerConnection.prototype.setLocalDescription;
  e.RTCPeerConnection.prototype.setLocalDescription = function () {
    return arguments.length && arguments[0].type
      ? ((arguments[0] = (function (e, t) {
          let i = t.sdp;
          return (
            Object.keys(e._reverseStreams || []).forEach(t => {
              const r = e._reverseStreams[t],
                n = e._streams[r.id];
              i = i.replace(new RegExp(r.id, 'g'), n.id);
            }),
            new RTCSessionDescription({ type: t.type, sdp: i })
          );
        })(this, arguments[0])),
        s.apply(this, arguments))
      : s.apply(this, arguments);
  };
  const a = Object.getOwnPropertyDescriptor(
    e.RTCPeerConnection.prototype,
    'localDescription'
  );
  (Object.defineProperty(e.RTCPeerConnection.prototype, 'localDescription', {
    get() {
      const e = a.get.apply(this);
      return '' === e.type ? e : o(this, e);
    },
  }),
    (e.RTCPeerConnection.prototype.removeTrack = function (e) {
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
      let t;
      ((this._streams = this._streams || {}),
        Object.keys(this._streams).forEach(i => {
          this._streams[i].getTracks().find(t => e.track === t) &&
            (t = this._streams[i]);
        }),
        t &&
          (1 === t.getTracks().length
            ? this.removeStream(this._reverseStreams[t.id])
            : t.removeTrack(e.track),
          this.dispatchEvent(new Event('negotiationneeded'))));
    }));
}
function Zi(e, t) {
  (!e.RTCPeerConnection &&
    e.webkitRTCPeerConnection &&
    (e.RTCPeerConnection = e.webkitRTCPeerConnection),
    e.RTCPeerConnection &&
      t.version < 53 &&
      [
        'setLocalDescription',
        'setRemoteDescription',
        'addIceCandidate',
      ].forEach(function (t) {
        const i = e.RTCPeerConnection.prototype[t];
        e.RTCPeerConnection.prototype[t] = {
          [t]() {
            return (
              (arguments[0] = new (
                'addIceCandidate' === t
                  ? e.RTCIceCandidate
                  : e.RTCSessionDescription
              )(arguments[0])),
              i.apply(this, arguments)
            );
          },
        }[t];
      }));
}
function er(e, t) {
  Ui(e, 'negotiationneeded', e => {
    const i = e.target;
    if (
      !(
        t.version < 72 ||
        (i.getConfiguration && 'plan-b' === i.getConfiguration().sdpSemantics)
      ) ||
      'stable' === i.signalingState
    )
      return e;
  });
}
var tr = Object.freeze({
  __proto__: null,
  shimMediaStream: Ki,
  shimOnTrack: Yi,
  shimGetSendersWithDtmf: zi,
  shimGetStats: qi,
  shimSenderReceiverGetStats: Xi,
  shimAddTrackRemoveTrackWithNative: Qi,
  shimAddTrackRemoveTrack: $i,
  shimPeerConnection: Zi,
  fixNegotiationNeeded: er,
  shimGetUserMedia: Ji,
  shimGetDisplayMedia: function (e, t) {
    (e.navigator.mediaDevices &&
      'getDisplayMedia' in e.navigator.mediaDevices) ||
      (e.navigator.mediaDevices &&
        'function' == typeof t &&
        (e.navigator.mediaDevices.getDisplayMedia = function (i) {
          return t(i).then(t => {
            const r = i.video && i.video.width,
              n = i.video && i.video.height;
            return (
              (i.video = {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: t,
                  maxFrameRate: (i.video && i.video.frameRate) || 3,
                },
              }),
              r && (i.video.mandatory.maxWidth = r),
              n && (i.video.mandatory.maxHeight = n),
              e.navigator.mediaDevices.getUserMedia(i)
            );
          });
        }));
  },
});
function ir(e, t) {
  const i = e && e.navigator,
    r = e && e.MediaStreamTrack;
  if (
    ((i.getUserMedia = function (e, t, r) {
      i.mediaDevices.getUserMedia(e).then(t, r);
    }),
    !(
      t.version > 55 &&
      'autoGainControl' in i.mediaDevices.getSupportedConstraints()
    ))
  ) {
    const e = function (e, t, i) {
        t in e && !(i in e) && ((e[i] = e[t]), delete e[t]);
      },
      t = i.mediaDevices.getUserMedia.bind(i.mediaDevices);
    if (
      ((i.mediaDevices.getUserMedia = function (i) {
        return (
          'object' == typeof i &&
            'object' == typeof i.audio &&
            ((i = JSON.parse(JSON.stringify(i))),
            e(i.audio, 'autoGainControl', 'mozAutoGainControl'),
            e(i.audio, 'noiseSuppression', 'mozNoiseSuppression')),
          t(i)
        );
      }),
      r && r.prototype.getSettings)
    ) {
      const t = r.prototype.getSettings;
      r.prototype.getSettings = function () {
        const i = t.apply(this, arguments);
        return (
          e(i, 'mozAutoGainControl', 'autoGainControl'),
          e(i, 'mozNoiseSuppression', 'noiseSuppression'),
          i
        );
      };
    }
    if (r && r.prototype.applyConstraints) {
      const t = r.prototype.applyConstraints;
      r.prototype.applyConstraints = function (i) {
        return (
          'audio' === this.kind &&
            'object' == typeof i &&
            ((i = JSON.parse(JSON.stringify(i))),
            e(i, 'autoGainControl', 'mozAutoGainControl'),
            e(i, 'noiseSuppression', 'mozNoiseSuppression')),
          t.apply(this, [i])
        );
      };
    }
  }
}
function rr(e) {
  'object' == typeof e &&
    e.RTCTrackEvent &&
    'receiver' in e.RTCTrackEvent.prototype &&
    !('transceiver' in e.RTCTrackEvent.prototype) &&
    Object.defineProperty(e.RTCTrackEvent.prototype, 'transceiver', {
      get() {
        return { receiver: this.receiver };
      },
    });
}
function nr(e, t) {
  if ('object' != typeof e || (!e.RTCPeerConnection && !e.mozRTCPeerConnection))
    return;
  (!e.RTCPeerConnection &&
    e.mozRTCPeerConnection &&
    (e.RTCPeerConnection = e.mozRTCPeerConnection),
    t.version < 53 &&
      [
        'setLocalDescription',
        'setRemoteDescription',
        'addIceCandidate',
      ].forEach(function (t) {
        const i = e.RTCPeerConnection.prototype[t];
        e.RTCPeerConnection.prototype[t] = {
          [t]() {
            return (
              (arguments[0] = new (
                'addIceCandidate' === t
                  ? e.RTCIceCandidate
                  : e.RTCSessionDescription
              )(arguments[0])),
              i.apply(this, arguments)
            );
          },
        }[t];
      }));
  const i = {
      inboundrtp: 'inbound-rtp',
      outboundrtp: 'outbound-rtp',
      candidatepair: 'candidate-pair',
      localcandidate: 'local-candidate',
      remotecandidate: 'remote-candidate',
    },
    r = e.RTCPeerConnection.prototype.getStats;
  e.RTCPeerConnection.prototype.getStats = function () {
    const [e, n, o] = arguments;
    return r
      .apply(this, [e || null])
      .then(e => {
        if (t.version < 53 && !n)
          try {
            e.forEach(e => {
              e.type = i[e.type] || e.type;
            });
          } catch (t) {
            if ('TypeError' !== t.name) throw t;
            e.forEach((t, r) => {
              e.set(r, Object.assign({}, t, { type: i[t.type] || t.type }));
            });
          }
        return e;
      })
      .then(n, o);
  };
}
function or(e) {
  if ('object' != typeof e || !e.RTCPeerConnection || !e.RTCRtpSender) return;
  if (e.RTCRtpSender && 'getStats' in e.RTCRtpSender.prototype) return;
  const t = e.RTCPeerConnection.prototype.getSenders;
  t &&
    (e.RTCPeerConnection.prototype.getSenders = function () {
      const e = t.apply(this, []);
      return (e.forEach(e => (e._pc = this)), e);
    });
  const i = e.RTCPeerConnection.prototype.addTrack;
  (i &&
    (e.RTCPeerConnection.prototype.addTrack = function () {
      const e = i.apply(this, arguments);
      return ((e._pc = this), e);
    }),
    (e.RTCRtpSender.prototype.getStats = function () {
      return this.track
        ? this._pc.getStats(this.track)
        : Promise.resolve(new Map());
    }));
}
function sr(e) {
  if ('object' != typeof e || !e.RTCPeerConnection || !e.RTCRtpSender) return;
  if (e.RTCRtpSender && 'getStats' in e.RTCRtpReceiver.prototype) return;
  const t = e.RTCPeerConnection.prototype.getReceivers;
  (t &&
    (e.RTCPeerConnection.prototype.getReceivers = function () {
      const e = t.apply(this, []);
      return (e.forEach(e => (e._pc = this)), e);
    }),
    Ui(e, 'track', e => ((e.receiver._pc = e.srcElement), e)),
    (e.RTCRtpReceiver.prototype.getStats = function () {
      return this._pc.getStats(this.track);
    }));
}
function ar(e) {
  e.RTCPeerConnection &&
    !('removeStream' in e.RTCPeerConnection.prototype) &&
    (e.RTCPeerConnection.prototype.removeStream = function (e) {
      this.getSenders().forEach(t => {
        t.track && e.getTracks().includes(t.track) && this.removeTrack(t);
      });
    });
}
function cr(e) {
  e.DataChannel && !e.RTCDataChannel && (e.RTCDataChannel = e.DataChannel);
}
function ur(e) {
  if ('object' != typeof e || !e.RTCPeerConnection) return;
  const t = e.RTCPeerConnection.prototype.addTransceiver;
  t &&
    (e.RTCPeerConnection.prototype.addTransceiver = function () {
      this.setParametersPromises = [];
      const e = arguments[1],
        i = e && 'sendEncodings' in e;
      i &&
        e.sendEncodings.forEach(e => {
          if ('rid' in e && !/^[a-z0-9]{0,16}$/i.test(e.rid))
            throw new TypeError('Invalid RID value provided.');
          if (
            'scaleResolutionDownBy' in e &&
            !(parseFloat(e.scaleResolutionDownBy) >= 1)
          )
            throw new RangeError('scale_resolution_down_by must be >= 1.0');
          if ('maxFramerate' in e && !(parseFloat(e.maxFramerate) >= 0))
            throw new RangeError('max_framerate must be >= 0.0');
        });
      const r = t.apply(this, arguments);
      if (i) {
        const { sender: t } = r,
          i = t.getParameters();
        (!('encodings' in i) ||
          (1 === i.encodings.length &&
            0 === Object.keys(i.encodings[0]).length)) &&
          ((i.encodings = e.sendEncodings),
          (t.sendEncodings = e.sendEncodings),
          this.setParametersPromises.push(
            t
              .setParameters(i)
              .then(() => {
                delete t.sendEncodings;
              })
              .catch(() => {
                delete t.sendEncodings;
              })
          ));
      }
      return r;
    });
}
function dr(e) {
  if ('object' != typeof e || !e.RTCRtpSender) return;
  const t = e.RTCRtpSender.prototype.getParameters;
  t &&
    (e.RTCRtpSender.prototype.getParameters = function () {
      const e = t.apply(this, arguments);
      return (
        'encodings' in e ||
          (e.encodings = [].concat(this.sendEncodings || [{}])),
        e
      );
    });
}
function lr(e) {
  if ('object' != typeof e || !e.RTCPeerConnection) return;
  const t = e.RTCPeerConnection.prototype.createOffer;
  e.RTCPeerConnection.prototype.createOffer = function () {
    return this.setParametersPromises && this.setParametersPromises.length
      ? Promise.all(this.setParametersPromises)
          .then(() => t.apply(this, arguments))
          .finally(() => {
            this.setParametersPromises = [];
          })
      : t.apply(this, arguments);
  };
}
function hr(e) {
  if ('object' != typeof e || !e.RTCPeerConnection) return;
  const t = e.RTCPeerConnection.prototype.createAnswer;
  e.RTCPeerConnection.prototype.createAnswer = function () {
    return this.setParametersPromises && this.setParametersPromises.length
      ? Promise.all(this.setParametersPromises)
          .then(() => t.apply(this, arguments))
          .finally(() => {
            this.setParametersPromises = [];
          })
      : t.apply(this, arguments);
  };
}
var pr = Object.freeze({
  __proto__: null,
  shimOnTrack: rr,
  shimPeerConnection: nr,
  shimSenderGetStats: or,
  shimReceiverGetStats: sr,
  shimRemoveStream: ar,
  shimRTCDataChannel: cr,
  shimAddTransceiver: ur,
  shimGetParameters: dr,
  shimCreateOffer: lr,
  shimCreateAnswer: hr,
  shimGetUserMedia: ir,
  shimGetDisplayMedia: function (e, t) {
    (e.navigator.mediaDevices &&
      'getDisplayMedia' in e.navigator.mediaDevices) ||
      (e.navigator.mediaDevices &&
        (e.navigator.mediaDevices.getDisplayMedia = function (i) {
          if (!i || !i.video) {
            const e = new DOMException(
              'getDisplayMedia without video constraints is undefined'
            );
            return (
              (e.name = 'NotFoundError'),
              (e.code = 8),
              Promise.reject(e)
            );
          }
          return (
            !0 === i.video
              ? (i.video = { mediaSource: t })
              : (i.video.mediaSource = t),
            e.navigator.mediaDevices.getUserMedia(i)
          );
        }));
  },
});
function fr(e) {
  if ('object' == typeof e && e.RTCPeerConnection) {
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
      const t = e.RTCPeerConnection.prototype.addTrack;
      ((e.RTCPeerConnection.prototype.addStream = function (e) {
        (this._localStreams || (this._localStreams = []),
          this._localStreams.includes(e) || this._localStreams.push(e),
          e.getAudioTracks().forEach(i => t.call(this, i, e)),
          e.getVideoTracks().forEach(i => t.call(this, i, e)));
      }),
        (e.RTCPeerConnection.prototype.addTrack = function (e, ...i) {
          return (
            i &&
              i.forEach(e => {
                this._localStreams
                  ? this._localStreams.includes(e) || this._localStreams.push(e)
                  : (this._localStreams = [e]);
              }),
            t.apply(this, arguments)
          );
        }));
    }
    'removeStream' in e.RTCPeerConnection.prototype ||
      (e.RTCPeerConnection.prototype.removeStream = function (e) {
        this._localStreams || (this._localStreams = []);
        const t = this._localStreams.indexOf(e);
        if (-1 === t) return;
        this._localStreams.splice(t, 1);
        const i = e.getTracks();
        this.getSenders().forEach(e => {
          i.includes(e.track) && this.removeTrack(e);
        });
      });
  }
}
function mr(e) {
  if (
    'object' == typeof e &&
    e.RTCPeerConnection &&
    ('getRemoteStreams' in e.RTCPeerConnection.prototype ||
      (e.RTCPeerConnection.prototype.getRemoteStreams = function () {
        return this._remoteStreams ? this._remoteStreams : [];
      }),
    !('onaddstream' in e.RTCPeerConnection.prototype))
  ) {
    Object.defineProperty(e.RTCPeerConnection.prototype, 'onaddstream', {
      get() {
        return this._onaddstream;
      },
      set(e) {
        (this._onaddstream &&
          (this.removeEventListener('addstream', this._onaddstream),
          this.removeEventListener('track', this._onaddstreampoly)),
          this.addEventListener('addstream', (this._onaddstream = e)),
          this.addEventListener(
            'track',
            (this._onaddstreampoly = e => {
              e.streams.forEach(e => {
                if (
                  (this._remoteStreams || (this._remoteStreams = []),
                  this._remoteStreams.includes(e))
                )
                  return;
                this._remoteStreams.push(e);
                const t = new Event('addstream');
                ((t.stream = e), this.dispatchEvent(t));
              });
            })
          ));
      },
    });
    const t = e.RTCPeerConnection.prototype.setRemoteDescription;
    e.RTCPeerConnection.prototype.setRemoteDescription = function () {
      const e = this;
      return (
        this._onaddstreampoly ||
          this.addEventListener(
            'track',
            (this._onaddstreampoly = function (t) {
              t.streams.forEach(t => {
                if (
                  (e._remoteStreams || (e._remoteStreams = []),
                  e._remoteStreams.indexOf(t) >= 0)
                )
                  return;
                e._remoteStreams.push(t);
                const i = new Event('addstream');
                ((i.stream = t), e.dispatchEvent(i));
              });
            })
          ),
        t.apply(e, arguments)
      );
    };
  }
}
function gr(e) {
  if ('object' != typeof e || !e.RTCPeerConnection) return;
  const t = e.RTCPeerConnection.prototype,
    i = t.createOffer,
    r = t.createAnswer,
    n = t.setLocalDescription,
    o = t.setRemoteDescription,
    s = t.addIceCandidate;
  ((t.createOffer = function (e, t) {
    const r = arguments.length >= 2 ? arguments[2] : arguments[0],
      n = i.apply(this, [r]);
    return t ? (n.then(e, t), Promise.resolve()) : n;
  }),
    (t.createAnswer = function (e, t) {
      const i = arguments.length >= 2 ? arguments[2] : arguments[0],
        n = r.apply(this, [i]);
      return t ? (n.then(e, t), Promise.resolve()) : n;
    }));
  let a = function (e, t, i) {
    const r = n.apply(this, [e]);
    return i ? (r.then(t, i), Promise.resolve()) : r;
  };
  ((t.setLocalDescription = a),
    (a = function (e, t, i) {
      const r = o.apply(this, [e]);
      return i ? (r.then(t, i), Promise.resolve()) : r;
    }),
    (t.setRemoteDescription = a),
    (a = function (e, t, i) {
      const r = s.apply(this, [e]);
      return i ? (r.then(t, i), Promise.resolve()) : r;
    }),
    (t.addIceCandidate = a));
}
function vr(e) {
  const t = e && e.navigator;
  if (t.mediaDevices && t.mediaDevices.getUserMedia) {
    const e = t.mediaDevices,
      i = e.getUserMedia.bind(e);
    t.mediaDevices.getUserMedia = e => i(br(e));
  }
  !t.getUserMedia &&
    t.mediaDevices &&
    t.mediaDevices.getUserMedia &&
    (t.getUserMedia = function (e, i, r) {
      t.mediaDevices.getUserMedia(e).then(i, r);
    }.bind(t));
}
function br(e) {
  return e && void 0 !== e.video
    ? Object.assign({}, e, { video: Bi(e.video) })
    : e;
}
function Sr(e) {
  if (!e.RTCPeerConnection) return;
  const t = e.RTCPeerConnection;
  ((e.RTCPeerConnection = function (e, i) {
    if (e && e.iceServers) {
      const t = [];
      for (let i = 0; i < e.iceServers.length; i++) {
        let r = e.iceServers[i];
        !r.hasOwnProperty('urls') && r.hasOwnProperty('url')
          ? ((r = JSON.parse(JSON.stringify(r))),
            (r.urls = r.url),
            delete r.url,
            t.push(r))
          : t.push(e.iceServers[i]);
      }
      e.iceServers = t;
    }
    return new t(e, i);
  }),
    (e.RTCPeerConnection.prototype = t.prototype),
    'generateCertificate' in t &&
      Object.defineProperty(e.RTCPeerConnection, 'generateCertificate', {
        get: () => t.generateCertificate,
      }));
}
function yr(e) {
  'object' == typeof e &&
    e.RTCTrackEvent &&
    'receiver' in e.RTCTrackEvent.prototype &&
    !('transceiver' in e.RTCTrackEvent.prototype) &&
    Object.defineProperty(e.RTCTrackEvent.prototype, 'transceiver', {
      get() {
        return { receiver: this.receiver };
      },
    });
}
function Er(e) {
  const t = e.RTCPeerConnection.prototype.createOffer;
  e.RTCPeerConnection.prototype.createOffer = function (e) {
    if (e) {
      void 0 !== e.offerToReceiveAudio &&
        (e.offerToReceiveAudio = !!e.offerToReceiveAudio);
      const t = this.getTransceivers().find(
        e => 'audio' === e.receiver.track.kind
      );
      (!1 === e.offerToReceiveAudio && t
        ? 'sendrecv' === t.direction
          ? t.setDirection
            ? t.setDirection('sendonly')
            : (t.direction = 'sendonly')
          : 'recvonly' === t.direction &&
            (t.setDirection
              ? t.setDirection('inactive')
              : (t.direction = 'inactive'))
        : !0 !== e.offerToReceiveAudio || t || this.addTransceiver('audio'),
        void 0 !== e.offerToReceiveVideo &&
          (e.offerToReceiveVideo = !!e.offerToReceiveVideo));
      const i = this.getTransceivers().find(
        e => 'video' === e.receiver.track.kind
      );
      !1 === e.offerToReceiveVideo && i
        ? 'sendrecv' === i.direction
          ? i.setDirection
            ? i.setDirection('sendonly')
            : (i.direction = 'sendonly')
          : 'recvonly' === i.direction &&
            (i.setDirection
              ? i.setDirection('inactive')
              : (i.direction = 'inactive'))
        : !0 !== e.offerToReceiveVideo || i || this.addTransceiver('video');
    }
    return t.apply(this, arguments);
  };
}
function Cr(e) {
  'object' != typeof e ||
    e.AudioContext ||
    (e.AudioContext = e.webkitAudioContext);
}
var Ir = Object.freeze({
    __proto__: null,
    shimLocalStreamsAPI: fr,
    shimRemoteStreamsAPI: mr,
    shimCallbacksAPI: gr,
    shimGetUserMedia: vr,
    shimConstraints: br,
    shimRTCIceServerUrls: Sr,
    shimTrackEventTransceiver: yr,
    shimCreateOfferLegacy: Er,
    shimAudioContext: Cr,
  }),
  Tr = w(function (e) {
    const t = {
      generateIdentifier: function () {
        return Math.random().toString(36).substr(2, 10);
      },
    };
    ((t.localCName = t.generateIdentifier()),
      (t.splitLines = function (e) {
        return e
          .trim()
          .split('\n')
          .map(e => e.trim());
      }),
      (t.splitSections = function (e) {
        return e
          .split('\nm=')
          .map((e, t) => (t > 0 ? 'm=' + e : e).trim() + '\r\n');
      }),
      (t.getDescription = function (e) {
        const i = t.splitSections(e);
        return i && i[0];
      }),
      (t.getMediaSections = function (e) {
        const i = t.splitSections(e);
        return (i.shift(), i);
      }),
      (t.matchPrefix = function (e, i) {
        return t.splitLines(e).filter(e => 0 === e.indexOf(i));
      }),
      (t.parseCandidate = function (e) {
        let t;
        t =
          0 === e.indexOf('a=candidate:')
            ? e.substring(12).split(' ')
            : e.substring(10).split(' ');
        const i = {
          foundation: t[0],
          component: { 1: 'rtp', 2: 'rtcp' }[t[1]] || t[1],
          protocol: t[2].toLowerCase(),
          priority: parseInt(t[3], 10),
          ip: t[4],
          address: t[4],
          port: parseInt(t[5], 10),
          type: t[7],
        };
        for (let e = 8; e < t.length; e += 2)
          switch (t[e]) {
            case 'raddr':
              i.relatedAddress = t[e + 1];
              break;
            case 'rport':
              i.relatedPort = parseInt(t[e + 1], 10);
              break;
            case 'tcptype':
              i.tcpType = t[e + 1];
              break;
            case 'ufrag':
              ((i.ufrag = t[e + 1]), (i.usernameFragment = t[e + 1]));
              break;
            default:
              void 0 === i[t[e]] && (i[t[e]] = t[e + 1]);
          }
        return i;
      }),
      (t.writeCandidate = function (e) {
        const t = [];
        t.push(e.foundation);
        const i = e.component;
        (t.push('rtp' === i ? 1 : 'rtcp' === i ? 2 : i),
          t.push(e.protocol.toUpperCase()),
          t.push(e.priority),
          t.push(e.address || e.ip),
          t.push(e.port));
        const r = e.type;
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
      (t.parseIceOptions = function (e) {
        return e.substr(14).split(' ');
      }),
      (t.parseRtpMap = function (e) {
        let t = e.substr(9).split(' ');
        const i = { payloadType: parseInt(t.shift(), 10) };
        return (
          (t = t[0].split('/')),
          (i.name = t[0]),
          (i.clockRate = parseInt(t[1], 10)),
          (i.channels = 3 === t.length ? parseInt(t[2], 10) : 1),
          (i.numChannels = i.channels),
          i
        );
      }),
      (t.writeRtpMap = function (e) {
        let t = e.payloadType;
        void 0 !== e.preferredPayloadType && (t = e.preferredPayloadType);
        const i = e.channels || e.numChannels || 1;
        return (
          'a=rtpmap:' +
          t +
          ' ' +
          e.name +
          '/' +
          e.clockRate +
          (1 !== i ? '/' + i : '') +
          '\r\n'
        );
      }),
      (t.parseExtmap = function (e) {
        const t = e.substr(9).split(' ');
        return {
          id: parseInt(t[0], 10),
          direction: t[0].indexOf('/') > 0 ? t[0].split('/')[1] : 'sendrecv',
          uri: t[1],
        };
      }),
      (t.writeExtmap = function (e) {
        return (
          'a=extmap:' +
          (e.id || e.preferredId) +
          (e.direction && 'sendrecv' !== e.direction ? '/' + e.direction : '') +
          ' ' +
          e.uri +
          '\r\n'
        );
      }),
      (t.parseFmtp = function (e) {
        const t = {};
        let i;
        const r = e.substr(e.indexOf(' ') + 1).split(';');
        for (let e = 0; e < r.length; e++)
          ((i = r[e].trim().split('=')), (t[i[0].trim()] = i[1]));
        return t;
      }),
      (t.writeFmtp = function (e) {
        let t = '',
          i = e.payloadType;
        if (
          (void 0 !== e.preferredPayloadType && (i = e.preferredPayloadType),
          e.parameters && Object.keys(e.parameters).length)
        ) {
          const r = [];
          (Object.keys(e.parameters).forEach(t => {
            r.push(void 0 !== e.parameters[t] ? t + '=' + e.parameters[t] : t);
          }),
            (t += 'a=fmtp:' + i + ' ' + r.join(';') + '\r\n'));
        }
        return t;
      }),
      (t.parseRtcpFb = function (e) {
        const t = e.substr(e.indexOf(' ') + 1).split(' ');
        return { type: t.shift(), parameter: t.join(' ') };
      }),
      (t.writeRtcpFb = function (e) {
        let t = '',
          i = e.payloadType;
        return (
          void 0 !== e.preferredPayloadType && (i = e.preferredPayloadType),
          e.rtcpFeedback &&
            e.rtcpFeedback.length &&
            e.rtcpFeedback.forEach(e => {
              t +=
                'a=rtcp-fb:' +
                i +
                ' ' +
                e.type +
                (e.parameter && e.parameter.length ? ' ' + e.parameter : '') +
                '\r\n';
            }),
          t
        );
      }),
      (t.parseSsrcMedia = function (e) {
        const t = e.indexOf(' '),
          i = { ssrc: parseInt(e.substr(7, t - 7), 10) },
          r = e.indexOf(':', t);
        return (
          r > -1
            ? ((i.attribute = e.substr(t + 1, r - t - 1)),
              (i.value = e.substr(r + 1)))
            : (i.attribute = e.substr(t + 1)),
          i
        );
      }),
      (t.parseSsrcGroup = function (e) {
        const t = e.substr(13).split(' ');
        return { semantics: t.shift(), ssrcs: t.map(e => parseInt(e, 10)) };
      }),
      (t.getMid = function (e) {
        const i = t.matchPrefix(e, 'a=mid:')[0];
        if (i) return i.substr(6);
      }),
      (t.parseFingerprint = function (e) {
        const t = e.substr(14).split(' ');
        return { algorithm: t[0].toLowerCase(), value: t[1].toUpperCase() };
      }),
      (t.getDtlsParameters = function (e, i) {
        return {
          role: 'auto',
          fingerprints: t
            .matchPrefix(e + i, 'a=fingerprint:')
            .map(t.parseFingerprint),
        };
      }),
      (t.writeDtlsParameters = function (e, t) {
        let i = 'a=setup:' + t + '\r\n';
        return (
          e.fingerprints.forEach(e => {
            i += 'a=fingerprint:' + e.algorithm + ' ' + e.value + '\r\n';
          }),
          i
        );
      }),
      (t.parseCryptoLine = function (e) {
        const t = e.substr(9).split(' ');
        return {
          tag: parseInt(t[0], 10),
          cryptoSuite: t[1],
          keyParams: t[2],
          sessionParams: t.slice(3),
        };
      }),
      (t.writeCryptoLine = function (e) {
        return (
          'a=crypto:' +
          e.tag +
          ' ' +
          e.cryptoSuite +
          ' ' +
          ('object' == typeof e.keyParams
            ? t.writeCryptoKeyParams(e.keyParams)
            : e.keyParams) +
          (e.sessionParams ? ' ' + e.sessionParams.join(' ') : '') +
          '\r\n'
        );
      }),
      (t.parseCryptoKeyParams = function (e) {
        if (0 !== e.indexOf('inline:')) return null;
        const t = e.substr(7).split('|');
        return {
          keyMethod: 'inline',
          keySalt: t[0],
          lifeTime: t[1],
          mkiValue: t[2] ? t[2].split(':')[0] : void 0,
          mkiLength: t[2] ? t[2].split(':')[1] : void 0,
        };
      }),
      (t.writeCryptoKeyParams = function (e) {
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
      (t.getCryptoParameters = function (e, i) {
        return t.matchPrefix(e + i, 'a=crypto:').map(t.parseCryptoLine);
      }),
      (t.getIceParameters = function (e, i) {
        const r = t.matchPrefix(e + i, 'a=ice-ufrag:')[0],
          n = t.matchPrefix(e + i, 'a=ice-pwd:')[0];
        return r && n
          ? { usernameFragment: r.substr(12), password: n.substr(10) }
          : null;
      }),
      (t.writeIceParameters = function (e) {
        let t =
          'a=ice-ufrag:' +
          e.usernameFragment +
          '\r\na=ice-pwd:' +
          e.password +
          '\r\n';
        return (e.iceLite && (t += 'a=ice-lite\r\n'), t);
      }),
      (t.parseRtpParameters = function (e) {
        const i = {
            codecs: [],
            headerExtensions: [],
            fecMechanisms: [],
            rtcp: [],
          },
          r = t.splitLines(e)[0].split(' ');
        for (let n = 3; n < r.length; n++) {
          const o = r[n],
            s = t.matchPrefix(e, 'a=rtpmap:' + o + ' ')[0];
          if (s) {
            const r = t.parseRtpMap(s),
              n = t.matchPrefix(e, 'a=fmtp:' + o + ' ');
            switch (
              ((r.parameters = n.length ? t.parseFmtp(n[0]) : {}),
              (r.rtcpFeedback = t
                .matchPrefix(e, 'a=rtcp-fb:' + o + ' ')
                .map(t.parseRtcpFb)),
              i.codecs.push(r),
              r.name.toUpperCase())
            ) {
              case 'RED':
              case 'ULPFEC':
                i.fecMechanisms.push(r.name.toUpperCase());
            }
          }
        }
        return (
          t.matchPrefix(e, 'a=extmap:').forEach(e => {
            i.headerExtensions.push(t.parseExtmap(e));
          }),
          i
        );
      }),
      (t.writeRtpDescription = function (e, i) {
        let r = '';
        ((r += 'm=' + e + ' '),
          (r += i.codecs.length > 0 ? '9' : '0'),
          (r += ' UDP/TLS/RTP/SAVPF '),
          (r +=
            i.codecs
              .map(e =>
                void 0 !== e.preferredPayloadType
                  ? e.preferredPayloadType
                  : e.payloadType
              )
              .join(' ') + '\r\n'),
          (r += 'c=IN IP4 0.0.0.0\r\n'),
          (r += 'a=rtcp:9 IN IP4 0.0.0.0\r\n'),
          i.codecs.forEach(e => {
            ((r += t.writeRtpMap(e)),
              (r += t.writeFmtp(e)),
              (r += t.writeRtcpFb(e)));
          }));
        let n = 0;
        return (
          i.codecs.forEach(e => {
            e.maxptime > n && (n = e.maxptime);
          }),
          n > 0 && (r += 'a=maxptime:' + n + '\r\n'),
          i.headerExtensions &&
            i.headerExtensions.forEach(e => {
              r += t.writeExtmap(e);
            }),
          r
        );
      }),
      (t.parseRtpEncodingParameters = function (e) {
        const i = [],
          r = t.parseRtpParameters(e),
          n = -1 !== r.fecMechanisms.indexOf('RED'),
          o = -1 !== r.fecMechanisms.indexOf('ULPFEC'),
          s = t
            .matchPrefix(e, 'a=ssrc:')
            .map(e => t.parseSsrcMedia(e))
            .filter(e => 'cname' === e.attribute),
          a = s.length > 0 && s[0].ssrc;
        let c;
        const u = t.matchPrefix(e, 'a=ssrc-group:FID').map(e =>
          e
            .substr(17)
            .split(' ')
            .map(e => parseInt(e, 10))
        );
        (u.length > 0 && u[0].length > 1 && u[0][0] === a && (c = u[0][1]),
          r.codecs.forEach(e => {
            if ('RTX' === e.name.toUpperCase() && e.parameters.apt) {
              let t = {
                ssrc: a,
                codecPayloadType: parseInt(e.parameters.apt, 10),
              };
              (a && c && (t.rtx = { ssrc: c }),
                i.push(t),
                n &&
                  ((t = JSON.parse(JSON.stringify(t))),
                  (t.fec = { ssrc: a, mechanism: o ? 'red+ulpfec' : 'red' }),
                  i.push(t)));
            }
          }),
          0 === i.length && a && i.push({ ssrc: a }));
        let d = t.matchPrefix(e, 'b=');
        return (
          d.length &&
            ((d =
              0 === d[0].indexOf('b=TIAS:')
                ? parseInt(d[0].substr(7), 10)
                : 0 === d[0].indexOf('b=AS:')
                  ? 1e3 * parseInt(d[0].substr(5), 10) * 0.95 - 16e3
                  : void 0),
            i.forEach(e => {
              e.maxBitrate = d;
            })),
          i
        );
      }),
      (t.parseRtcpParameters = function (e) {
        const i = {},
          r = t
            .matchPrefix(e, 'a=ssrc:')
            .map(e => t.parseSsrcMedia(e))
            .filter(e => 'cname' === e.attribute)[0];
        r && ((i.cname = r.value), (i.ssrc = r.ssrc));
        const n = t.matchPrefix(e, 'a=rtcp-rsize');
        ((i.reducedSize = n.length > 0), (i.compound = 0 === n.length));
        const o = t.matchPrefix(e, 'a=rtcp-mux');
        return ((i.mux = o.length > 0), i);
      }),
      (t.writeRtcpParameters = function (e) {
        let t = '';
        return (
          e.reducedSize && (t += 'a=rtcp-rsize\r\n'),
          e.mux && (t += 'a=rtcp-mux\r\n'),
          void 0 !== e.ssrc &&
            e.cname &&
            (t += 'a=ssrc:' + e.ssrc + ' cname:' + e.cname + '\r\n'),
          t
        );
      }),
      (t.parseMsid = function (e) {
        let i;
        const r = t.matchPrefix(e, 'a=msid:');
        if (1 === r.length)
          return (
            (i = r[0].substr(7).split(' ')),
            { stream: i[0], track: i[1] }
          );
        const n = t
          .matchPrefix(e, 'a=ssrc:')
          .map(e => t.parseSsrcMedia(e))
          .filter(e => 'msid' === e.attribute);
        return n.length > 0
          ? ((i = n[0].value.split(' ')), { stream: i[0], track: i[1] })
          : void 0;
      }),
      (t.parseSctpDescription = function (e) {
        const i = t.parseMLine(e),
          r = t.matchPrefix(e, 'a=max-message-size:');
        let n;
        (r.length > 0 && (n = parseInt(r[0].substr(19), 10)),
          isNaN(n) && (n = 65536));
        const o = t.matchPrefix(e, 'a=sctp-port:');
        if (o.length > 0)
          return {
            port: parseInt(o[0].substr(12), 10),
            protocol: i.fmt,
            maxMessageSize: n,
          };
        const s = t.matchPrefix(e, 'a=sctpmap:');
        if (s.length > 0) {
          const e = s[0].substr(10).split(' ');
          return {
            port: parseInt(e[0], 10),
            protocol: e[1],
            maxMessageSize: n,
          };
        }
      }),
      (t.writeSctpDescription = function (e, t) {
        let i = [];
        return (
          (i =
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
                  'm=' + e.kind + ' 9 ' + e.protocol + ' ' + t.port + '\r\n',
                  'c=IN IP4 0.0.0.0\r\n',
                  'a=sctpmap:' + t.port + ' ' + t.protocol + ' 65535\r\n',
                ]),
          void 0 !== t.maxMessageSize &&
            i.push('a=max-message-size:' + t.maxMessageSize + '\r\n'),
          i.join('')
        );
      }),
      (t.generateSessionId = function () {
        return Math.random().toString().substr(2, 21);
      }),
      (t.writeSessionBoilerplate = function (e, i, r) {
        let n;
        const o = void 0 !== i ? i : 2;
        return (
          (n = e || t.generateSessionId()),
          'v=0\r\no=' +
            (r || 'thisisadapterortc') +
            ' ' +
            n +
            ' ' +
            o +
            ' IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n'
        );
      }),
      (t.getDirection = function (e, i) {
        const r = t.splitLines(e);
        for (let e = 0; e < r.length; e++)
          switch (r[e]) {
            case 'a=sendrecv':
            case 'a=sendonly':
            case 'a=recvonly':
            case 'a=inactive':
              return r[e].substr(2);
          }
        return i ? t.getDirection(i) : 'sendrecv';
      }),
      (t.getKind = function (e) {
        return t.splitLines(e)[0].split(' ')[0].substr(2);
      }),
      (t.isRejected = function (e) {
        return '0' === e.split(' ', 2)[1];
      }),
      (t.parseMLine = function (e) {
        const i = t.splitLines(e)[0].substr(2).split(' ');
        return {
          kind: i[0],
          port: parseInt(i[1], 10),
          protocol: i[2],
          fmt: i.slice(3).join(' '),
        };
      }),
      (t.parseOLine = function (e) {
        const i = t.matchPrefix(e, 'o=')[0].substr(2).split(' ');
        return {
          username: i[0],
          sessionId: i[1],
          sessionVersion: parseInt(i[2], 10),
          netType: i[3],
          addressType: i[4],
          address: i[5],
        };
      }),
      (t.isValidSDP = function (e) {
        if ('string' != typeof e || 0 === e.length) return !1;
        const i = t.splitLines(e);
        for (let e = 0; e < i.length; e++)
          if (i[e].length < 2 || '=' !== i[e].charAt(1)) return !1;
        return !0;
      }),
      (e.exports = t));
  }),
  Rr = Object.freeze(Object.assign(Object.create(null), Tr, { default: Tr }));
function _r(e) {
  if (
    !e.RTCIceCandidate ||
    (e.RTCIceCandidate && 'foundation' in e.RTCIceCandidate.prototype)
  )
    return;
  const t = e.RTCIceCandidate;
  ((e.RTCIceCandidate = function (e) {
    if (
      ('object' == typeof e &&
        e.candidate &&
        0 === e.candidate.indexOf('a=') &&
        ((e = JSON.parse(JSON.stringify(e))).candidate = e.candidate.substr(2)),
      e.candidate && e.candidate.length)
    ) {
      const i = new t(e),
        r = Tr.parseCandidate(e.candidate),
        n = Object.assign(i, r);
      return (
        (n.toJSON = function () {
          return {
            candidate: n.candidate,
            sdpMid: n.sdpMid,
            sdpMLineIndex: n.sdpMLineIndex,
            usernameFragment: n.usernameFragment,
          };
        }),
        n
      );
    }
    return new t(e);
  }),
    (e.RTCIceCandidate.prototype = t.prototype),
    Ui(
      e,
      'icecandidate',
      t => (
        t.candidate &&
          Object.defineProperty(t, 'candidate', {
            value: new e.RTCIceCandidate(t.candidate),
            writable: 'false',
          }),
        t
      )
    ));
}
function kr(e, t) {
  if (!e.RTCPeerConnection) return;
  'sctp' in e.RTCPeerConnection.prototype ||
    Object.defineProperty(e.RTCPeerConnection.prototype, 'sctp', {
      get() {
        return void 0 === this._sctp ? null : this._sctp;
      },
    });
  const i = function (e) {
      let i = 65536;
      return (
        'firefox' === t.browser &&
          (i =
            t.version < 57
              ? -1 === e
                ? 16384
                : 2147483637
              : t.version < 60
                ? 57 === t.version
                  ? 65535
                  : 65536
                : 2147483637),
        i
      );
    },
    r = function (e, i) {
      let r = 65536;
      'firefox' === t.browser && 57 === t.version && (r = 65535);
      const n = Tr.matchPrefix(e.sdp, 'a=max-message-size:');
      return (
        n.length > 0
          ? (r = parseInt(n[0].substr(19), 10))
          : 'firefox' === t.browser && -1 !== i && (r = 2147483637),
        r
      );
    },
    n = e.RTCPeerConnection.prototype.setRemoteDescription;
  e.RTCPeerConnection.prototype.setRemoteDescription = function () {
    if (((this._sctp = null), 'chrome' === t.browser && t.version >= 76)) {
      const { sdpSemantics: e } = this.getConfiguration();
      'plan-b' === e &&
        Object.defineProperty(this, 'sctp', {
          get() {
            return void 0 === this._sctp ? null : this._sctp;
          },
          enumerable: !0,
          configurable: !0,
        });
    }
    if (
      (function (e) {
        if (!e || !e.sdp) return !1;
        const t = Tr.splitSections(e.sdp);
        return (
          t.shift(),
          t.some(e => {
            const t = Tr.parseMLine(e);
            return (
              t && 'application' === t.kind && -1 !== t.protocol.indexOf('SCTP')
            );
          })
        );
      })(arguments[0])
    ) {
      const e = (function (e) {
          const t = e.sdp.match(/mozilla...THIS_IS_SDPARTA-(\d+)/);
          if (null === t || t.length < 2) return -1;
          const i = parseInt(t[1], 10);
          return i != i ? -1 : i;
        })(arguments[0]),
        t = i(e),
        n = r(arguments[0], e);
      let o;
      o =
        0 === t && 0 === n
          ? Number.POSITIVE_INFINITY
          : 0 === t || 0 === n
            ? Math.max(t, n)
            : Math.min(t, n);
      const s = {};
      (Object.defineProperty(s, 'maxMessageSize', { get: () => o }),
        (this._sctp = s));
    }
    return n.apply(this, arguments);
  };
}
function Or(e) {
  if (
    !e.RTCPeerConnection ||
    !('createDataChannel' in e.RTCPeerConnection.prototype)
  )
    return;
  function t(e, t) {
    const i = e.send;
    e.send = function () {
      const r = arguments[0],
        n = r.length || r.size || r.byteLength;
      if ('open' === e.readyState && t.sctp && n > t.sctp.maxMessageSize)
        throw new TypeError(
          'Message too large (can send a maximum of ' +
            t.sctp.maxMessageSize +
            ' bytes)'
        );
      return i.apply(e, arguments);
    };
  }
  const i = e.RTCPeerConnection.prototype.createDataChannel;
  ((e.RTCPeerConnection.prototype.createDataChannel = function () {
    const e = i.apply(this, arguments);
    return (t(e, this), e);
  }),
    Ui(e, 'datachannel', e => (t(e.channel, e.target), e)));
}
function wr(e) {
  if (
    !e.RTCPeerConnection ||
    'connectionState' in e.RTCPeerConnection.prototype
  )
    return;
  const t = e.RTCPeerConnection.prototype;
  (Object.defineProperty(t, 'connectionState', {
    get() {
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
      get() {
        return this._onconnectionstatechange || null;
      },
      set(e) {
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
    ['setLocalDescription', 'setRemoteDescription'].forEach(e => {
      const i = t[e];
      t[e] = function () {
        return (
          this._connectionstatechangepoly ||
            ((this._connectionstatechangepoly = e => {
              const t = e.target;
              if (t._lastConnectionState !== t.connectionState) {
                t._lastConnectionState = t.connectionState;
                const i = new Event('connectionstatechange', e);
                t.dispatchEvent(i);
              }
              return e;
            }),
            this.addEventListener(
              'iceconnectionstatechange',
              this._connectionstatechangepoly
            )),
          i.apply(this, arguments)
        );
      };
    }));
}
function Ar(e, t) {
  if (!e.RTCPeerConnection) return;
  if ('chrome' === t.browser && t.version >= 71) return;
  if ('safari' === t.browser && t.version >= 605) return;
  const i = e.RTCPeerConnection.prototype.setRemoteDescription;
  e.RTCPeerConnection.prototype.setRemoteDescription = function (t) {
    if (t && t.sdp && -1 !== t.sdp.indexOf('\na=extmap-allow-mixed')) {
      const i = t.sdp
        .split('\n')
        .filter(e => 'a=extmap-allow-mixed' !== e.trim())
        .join('\n');
      e.RTCSessionDescription && t instanceof e.RTCSessionDescription
        ? (arguments[0] = new e.RTCSessionDescription({ type: t.type, sdp: i }))
        : (t.sdp = i);
    }
    return i.apply(this, arguments);
  };
}
function Pr(e, t) {
  if (!e.RTCPeerConnection || !e.RTCPeerConnection.prototype) return;
  const i = e.RTCPeerConnection.prototype.addIceCandidate;
  i &&
    0 !== i.length &&
    (e.RTCPeerConnection.prototype.addIceCandidate = function () {
      return arguments[0]
        ? (('chrome' === t.browser && t.version < 78) ||
            ('firefox' === t.browser && t.version < 68) ||
            'safari' === t.browser) &&
          arguments[0] &&
          '' === arguments[0].candidate
          ? Promise.resolve()
          : i.apply(this, arguments)
        : (arguments[1] && arguments[1].apply(null), Promise.resolve());
    });
}
function Lr(e, t) {
  if (!e.RTCPeerConnection || !e.RTCPeerConnection.prototype) return;
  const i = e.RTCPeerConnection.prototype.setLocalDescription;
  i &&
    0 !== i.length &&
    (e.RTCPeerConnection.prototype.setLocalDescription = function () {
      let e = arguments[0] || {};
      if ('object' != typeof e || (e.type && e.sdp))
        return i.apply(this, arguments);
      if (((e = { type: e.type, sdp: e.sdp }), !e.type))
        switch (this.signalingState) {
          case 'stable':
          case 'have-local-offer':
          case 'have-remote-pranswer':
            e.type = 'offer';
            break;
          default:
            e.type = 'answer';
        }
      if (e.sdp || ('offer' !== e.type && 'answer' !== e.type))
        return i.apply(this, [e]);
      return ('offer' === e.type ? this.createOffer : this.createAnswer)
        .apply(this)
        .then(e => i.apply(this, [e]));
    });
}
var Dr = Object.freeze({
  __proto__: null,
  shimRTCIceCandidate: _r,
  shimMaxMessageSize: kr,
  shimSendThrowTypeError: Or,
  shimConnectionState: wr,
  removeExtmapAllowMixed: Ar,
  shimAddIceCandidateNullOrEmpty: Pr,
  shimParameterlessSetLocalDescription: Lr,
});
const xr = (function (
  { window: e } = {},
  t = { shimChrome: !0, shimFirefox: !0, shimSafari: !0 }
) {
  const i = Fi,
    r = (function (e) {
      const t = { browser: null, version: null };
      if (void 0 === e || !e.navigator)
        return ((t.browser = 'Not a browser.'), t);
      const { navigator: i } = e;
      if (i.mozGetUserMedia)
        ((t.browser = 'firefox'),
          (t.version = Mi(i.userAgent, /Firefox\/(\d+)\./, 1)));
      else if (
        i.webkitGetUserMedia ||
        (!1 === e.isSecureContext &&
          e.webkitRTCPeerConnection &&
          !e.RTCIceGatherer)
      )
        ((t.browser = 'chrome'),
          (t.version = Mi(i.userAgent, /Chrom(e|ium)\/(\d+)\./, 2)));
      else {
        if (!e.RTCPeerConnection || !i.userAgent.match(/AppleWebKit\/(\d+)\./))
          return ((t.browser = 'Not a supported browser.'), t);
        ((t.browser = 'safari'),
          (t.version = Mi(i.userAgent, /AppleWebKit\/(\d+)\./, 1)),
          (t.supportsUnifiedPlan =
            e.RTCRtpTransceiver &&
            'currentDirection' in e.RTCRtpTransceiver.prototype));
      }
      return t;
    })(e),
    n = {
      browserDetails: r,
      commonShim: Dr,
      extractVersion: Mi,
      disableLog: Ni,
      disableWarnings: Vi,
      sdp: Rr,
    };
  switch (r.browser) {
    case 'chrome':
      if (!tr || !Zi || !t.shimChrome)
        return (i('Chrome shim is not included in this adapter release.'), n);
      if (null === r.version)
        return (i('Chrome shim can not determine version, not shimming.'), n);
      (i('adapter.js shimming chrome.'),
        (n.browserShim = tr),
        Pr(e, r),
        Lr(e),
        Ji(e, r),
        Ki(e),
        Zi(e, r),
        Yi(e),
        $i(e, r),
        zi(e),
        qi(e),
        Xi(e),
        er(e, r),
        _r(e),
        wr(e),
        kr(e, r),
        Or(e),
        Ar(e, r));
      break;
    case 'firefox':
      if (!pr || !nr || !t.shimFirefox)
        return (i('Firefox shim is not included in this adapter release.'), n);
      (i('adapter.js shimming firefox.'),
        (n.browserShim = pr),
        Pr(e, r),
        Lr(e),
        ir(e, r),
        nr(e, r),
        rr(e),
        ar(e),
        or(e),
        sr(e),
        cr(e),
        ur(e),
        dr(e),
        lr(e),
        hr(e),
        _r(e),
        wr(e),
        kr(e, r),
        Or(e));
      break;
    case 'safari':
      if (!Ir || !t.shimSafari)
        return (i('Safari shim is not included in this adapter release.'), n);
      (i('adapter.js shimming safari.'),
        (n.browserShim = Ir),
        Pr(e, r),
        Lr(e),
        Sr(e),
        Er(e),
        gr(e),
        fr(e),
        mr(e),
        yr(e),
        vr(e),
        Cr(e),
        _r(e),
        kr(e, r),
        Or(e),
        Ar(e, r));
      break;
    default:
      i('Unsupported browser!');
  }
  return n;
})({ window: 'undefined' == typeof window ? void 0 : window });
var Mr;
(Mr = (Mr = window) || self).RTCBeautyPlugin = (function (e) {
  function t(e, t) {
    if (!(e instanceof t))
      throw new TypeError('Cannot call a class as a function');
  }
  function i(e, t) {
    for (var i = 0; i < t.length; i++) {
      var r = t[i];
      ((r.enumerable = r.enumerable || !1),
        (r.configurable = !0),
        'value' in r && (r.writable = !0),
        Object.defineProperty(e, r.key, r));
    }
  }
  function r(e, t, r) {
    return (t && i(e.prototype, t), r && i(e, r), e);
  }
  e = e && Object.prototype.hasOwnProperty.call(e, 'default') ? e.default : e;
  var n =
    'undefined' != typeof globalThis
      ? globalThis
      : 'undefined' != typeof window
        ? window
        : 'undefined' != typeof global
          ? global
          : 'undefined' != typeof self
            ? self
            : {};
  function o(e, t) {
    return (e((t = { exports: {} }), t.exports), t.exports);
  }
  var s,
    a,
    c = function (e) {
      return e && e.Math == Math && e;
    },
    u =
      c(
        'object' ==
          ('undefined' == typeof globalThis ? 'undefined' : G(globalThis)) &&
          globalThis
      ) ||
      c(
        'object' == ('undefined' == typeof window ? 'undefined' : G(window)) &&
          window
      ) ||
      c(
        'object' == ('undefined' == typeof self ? 'undefined' : G(self)) && self
      ) ||
      c('object' == G(n) && n) ||
      (function () {
        return this;
      })() ||
      Function('return this')(),
    d = function (e) {
      try {
        return !!e();
      } catch (e) {
        return !0;
      }
    },
    l = !d(function () {
      return (
        7 !=
        Object.defineProperty({}, 1, {
          get: function () {
            return 7;
          },
        })[1]
      );
    }),
    h = {}.propertyIsEnumerable,
    p = Object.getOwnPropertyDescriptor,
    f = {
      f:
        p && !h.call({ 1: 2 }, 1)
          ? function (e) {
              var t = p(this, e);
              return !!t && t.enumerable;
            }
          : h,
    },
    m = function (e, t) {
      return {
        enumerable: !(1 & e),
        configurable: !(2 & e),
        writable: !(4 & e),
        value: t,
      };
    },
    g = {}.toString,
    v = function (e) {
      return g.call(e).slice(8, -1);
    },
    b = ''.split,
    S = d(function () {
      return !Object('z').propertyIsEnumerable(0);
    })
      ? function (e) {
          return 'String' == v(e) ? b.call(e, '') : Object(e);
        }
      : Object,
    y = function (e) {
      if (null == e) throw TypeError("Can't call method on " + e);
      return e;
    },
    E = function (e) {
      return S(y(e));
    },
    C = function (e) {
      return 'object' == G(e) ? null !== e : 'function' == typeof e;
    },
    I = function (e, t) {
      return arguments.length < 2
        ? (function (e) {
            return 'function' == typeof e ? e : void 0;
          })(u[e])
        : u[e] && u[e][t];
    },
    T = I('navigator', 'userAgent') || '',
    R = u.process,
    _ = u.Deno,
    k = (R && R.versions) || (_ && _.version),
    O = k && k.v8;
  O
    ? (a = (s = O.split('.'))[0] < 4 ? 1 : s[0] + s[1])
    : T &&
      (!(s = T.match(/Edge\/(\d+)/)) || s[1] >= 74) &&
      (s = T.match(/Chrome\/(\d+)/)) &&
      (a = s[1]);
  var w = a && +a,
    A =
      !!Object.getOwnPropertySymbols &&
      !d(function () {
        var e = Symbol();
        return (
          !String(e) ||
          !(Object(e) instanceof Symbol) ||
          (!Symbol.sham && w && w < 41)
        );
      }),
    P = A && !Symbol.sham && 'symbol' == G(Symbol.iterator),
    L = P
      ? function (e) {
          return 'symbol' == G(e);
        }
      : function (e) {
          var t = I('Symbol');
          return 'function' == typeof t && Object(e) instanceof t;
        },
    D = function (e, t) {
      try {
        Object.defineProperty(u, e, {
          value: t,
          configurable: !0,
          writable: !0,
        });
      } catch (i) {
        u[e] = t;
      }
      return t;
    },
    x = u['__core-js_shared__'] || D('__core-js_shared__', {}),
    M = o(function (e) {
      (e.exports = function (e, t) {
        return x[e] || (x[e] = void 0 !== t ? t : {});
      })('versions', []).push({
        version: '3.16.0',
        mode: 'global',
        copyright: '© 2021 Denis Pushkarev (zloirock.ru)',
      });
    }),
    U = function (e) {
      return Object(y(e));
    },
    N = {}.hasOwnProperty,
    V =
      Object.hasOwn ||
      function (e, t) {
        return N.call(U(e), t);
      },
    F = 0,
    j = Math.random(),
    B = function (e) {
      return (
        'Symbol(' +
        String(void 0 === e ? '' : e) +
        ')_' +
        (++F + j).toString(36)
      );
    },
    W = M('wks'),
    H = u.Symbol,
    J = P ? H : (H && H.withoutSetter) || B,
    K = function (e) {
      return (
        (V(W, e) && (A || 'string' == typeof W[e])) ||
          (W[e] = A && V(H, e) ? H[e] : J('Symbol.' + e)),
        W[e]
      );
    },
    Y = K('toPrimitive'),
    z = function (e) {
      var t = (function (e, t) {
        if (!C(e) || L(e)) return e;
        var i,
          r = e[Y];
        if (void 0 !== r) {
          if (
            (void 0 === t && (t = 'default'), (i = r.call(e, t)), !C(i) || L(i))
          )
            return i;
          throw TypeError("Can't convert object to primitive value");
        }
        return (
          void 0 === t && (t = 'number'),
          (function (e, t) {
            var i, r;
            if (
              'string' === t &&
              'function' == typeof (i = e.toString) &&
              !C((r = i.call(e)))
            )
              return r;
            if ('function' == typeof (i = e.valueOf) && !C((r = i.call(e))))
              return r;
            if (
              'string' !== t &&
              'function' == typeof (i = e.toString) &&
              !C((r = i.call(e)))
            )
              return r;
            throw TypeError("Can't convert object to primitive value");
          })(e, t)
        );
      })(e, 'string');
      return L(t) ? t : String(t);
    },
    q = u.document,
    X = C(q) && C(q.createElement),
    Q = function (e) {
      return X ? q.createElement(e) : {};
    },
    $ =
      !l &&
      !d(function () {
        return (
          7 !=
          Object.defineProperty(Q('div'), 'a', {
            get: function () {
              return 7;
            },
          }).a
        );
      }),
    Z = Object.getOwnPropertyDescriptor,
    ee = {
      f: l
        ? Z
        : function (e, t) {
            if (((e = E(e)), (t = z(t)), $))
              try {
                return Z(e, t);
              } catch (e) {}
            if (V(e, t)) return m(!f.f.call(e, t), e[t]);
          },
    },
    te = function (e) {
      if (!C(e)) throw TypeError(String(e) + ' is not an object');
      return e;
    },
    ie = Object.defineProperty,
    re = {
      f: l
        ? ie
        : function (e, t, i) {
            if ((te(e), (t = z(t)), te(i), $))
              try {
                return ie(e, t, i);
              } catch (e) {}
            if ('get' in i || 'set' in i)
              throw TypeError('Accessors not supported');
            return ('value' in i && (e[t] = i.value), e);
          },
    },
    ne = l
      ? function (e, t, i) {
          return re.f(e, t, m(1, i));
        }
      : function (e, t, i) {
          return ((e[t] = i), e);
        },
    oe = Function.toString;
  'function' != typeof x.inspectSource &&
    (x.inspectSource = function (e) {
      return oe.call(e);
    });
  var se,
    ae,
    ce,
    ue = x.inspectSource,
    de = u.WeakMap,
    le = 'function' == typeof de && /native code/.test(ue(de)),
    he = M('keys'),
    pe = function (e) {
      return he[e] || (he[e] = B(e));
    },
    fe = {},
    me = u.WeakMap;
  if (le || x.state) {
    var ge = x.state || (x.state = new me()),
      ve = ge.get,
      be = ge.has,
      Se = ge.set;
    ((se = function (e, t) {
      if (be.call(ge, e)) throw new TypeError('Object already initialized');
      return ((t.facade = e), Se.call(ge, e, t), t);
    }),
      (ae = function (e) {
        return ve.call(ge, e) || {};
      }),
      (ce = function (e) {
        return be.call(ge, e);
      }));
  } else {
    var ye = pe('state');
    ((fe[ye] = !0),
      (se = function (e, t) {
        if (V(e, ye)) throw new TypeError('Object already initialized');
        return ((t.facade = e), ne(e, ye, t), t);
      }),
      (ae = function (e) {
        return V(e, ye) ? e[ye] : {};
      }),
      (ce = function (e) {
        return V(e, ye);
      }));
  }
  var Ee = {
      set: se,
      get: ae,
      has: ce,
      enforce: function (e) {
        return ce(e) ? ae(e) : se(e, {});
      },
      getterFor: function (e) {
        return function (t) {
          var i;
          if (!C(t) || (i = ae(t)).type !== e)
            throw TypeError('Incompatible receiver, ' + e + ' required');
          return i;
        };
      },
    },
    Ce = o(function (e) {
      var t = Ee.get,
        i = Ee.enforce,
        r = String(String).split('String');
      (e.exports = function (e, t, n, o) {
        var s,
          a = !!o && !!o.unsafe,
          c = !!o && !!o.enumerable,
          d = !!o && !!o.noTargetGet;
        ('function' == typeof n &&
          ('string' != typeof t || V(n, 'name') || ne(n, 'name', t),
          (s = i(n)).source ||
            (s.source = r.join('string' == typeof t ? t : ''))),
          e !== u
            ? (a ? !d && e[t] && (c = !0) : delete e[t],
              c ? (e[t] = n) : ne(e, t, n))
            : c
              ? (e[t] = n)
              : D(t, n));
      })(Function.prototype, 'toString', function () {
        return ('function' == typeof this && t(this).source) || ue(this);
      });
    }),
    Ie = Math.ceil,
    Te = Math.floor,
    Re = function (e) {
      return isNaN((e = +e)) ? 0 : (e > 0 ? Te : Ie)(e);
    },
    _e = Math.min,
    ke = function (e) {
      return e > 0 ? _e(Re(e), 9007199254740991) : 0;
    },
    Oe = Math.max,
    we = Math.min,
    Ae = function (e, t) {
      var i = Re(e);
      return i < 0 ? Oe(i + t, 0) : we(i, t);
    },
    Pe = function (e) {
      return function (t, i, r) {
        var n,
          o = E(t),
          s = ke(o.length),
          a = Ae(r, s);
        if (e && i != i) {
          for (; s > a; ) if ((n = o[a++]) != n) return !0;
        } else
          for (; s > a; a++)
            if ((e || a in o) && o[a] === i) return e || a || 0;
        return !e && -1;
      };
    },
    Le = { includes: Pe(!0), indexOf: Pe(!1) },
    De = Le.indexOf,
    xe = function (e, t) {
      var i,
        r = E(e),
        n = 0,
        o = [];
      for (i in r) !V(fe, i) && V(r, i) && o.push(i);
      for (; t.length > n; ) V(r, (i = t[n++])) && (~De(o, i) || o.push(i));
      return o;
    },
    Me = [
      'constructor',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'toLocaleString',
      'toString',
      'valueOf',
    ],
    Ue = Me.concat('length', 'prototype'),
    Ne = {
      f:
        Object.getOwnPropertyNames ||
        function (e) {
          return xe(e, Ue);
        },
    },
    Ve = { f: Object.getOwnPropertySymbols },
    Fe =
      I('Reflect', 'ownKeys') ||
      function (e) {
        var t = Ne.f(te(e)),
          i = Ve.f;
        return i ? t.concat(i(e)) : t;
      },
    je = function (e, t) {
      for (var i = Fe(t), r = re.f, n = ee.f, o = 0; o < i.length; o++) {
        var s = i[o];
        V(e, s) || r(e, s, n(t, s));
      }
    },
    Be = /#|\.prototype\./,
    We = function (e, t) {
      var i = Ge[He(e)];
      return i == Ke || (i != Je && ('function' == typeof t ? d(t) : !!t));
    },
    He = (We.normalize = function (e) {
      return String(e).replace(Be, '.').toLowerCase();
    }),
    Ge = (We.data = {}),
    Je = (We.NATIVE = 'N'),
    Ke = (We.POLYFILL = 'P'),
    Ye = We,
    ze = ee.f,
    qe = function (e, t) {
      var i,
        r,
        n,
        o,
        s,
        a = e.target,
        c = e.global,
        d = e.stat;
      if ((i = c ? u : d ? u[a] || D(a, {}) : (u[a] || {}).prototype))
        for (r in t) {
          if (
            ((o = t[r]),
            (n = e.noTargetGet ? (s = ze(i, r)) && s.value : i[r]),
            !Ye(c ? r : a + (d ? '.' : '#') + r, e.forced) && void 0 !== n)
          ) {
            if (G(o) == G(n)) continue;
            je(o, n);
          }
          ((e.sham || (n && n.sham)) && ne(o, 'sham', !0), Ce(i, r, o, e));
        }
    },
    Xe = function (e) {
      if ('function' != typeof e)
        throw TypeError(String(e) + ' is not a function');
      return e;
    },
    Qe = function (e, t, i) {
      if ((Xe(e), void 0 === t)) return e;
      switch (i) {
        case 0:
          return function () {
            return e.call(t);
          };
        case 1:
          return function (i) {
            return e.call(t, i);
          };
        case 2:
          return function (i, r) {
            return e.call(t, i, r);
          };
        case 3:
          return function (i, r, n) {
            return e.call(t, i, r, n);
          };
      }
      return function () {
        return e.apply(t, arguments);
      };
    },
    $e =
      Array.isArray ||
      function (e) {
        return 'Array' == v(e);
      },
    Ze = K('species'),
    et = function (e, t) {
      return new ((function (e) {
        var t;
        return (
          $e(e) &&
            ('function' != typeof (t = e.constructor) ||
            (t !== Array && !$e(t.prototype))
              ? C(t) && null === (t = t[Ze]) && (t = void 0)
              : (t = void 0)),
          void 0 === t ? Array : t
        );
      })(e))(0 === t ? 0 : t);
    },
    tt = [].push,
    it = function (e) {
      var t = 1 == e,
        i = 2 == e,
        r = 3 == e,
        n = 4 == e,
        o = 6 == e,
        s = 7 == e,
        a = 5 == e || o;
      return function (c, u, d, l) {
        for (
          var h,
            p,
            f = U(c),
            m = S(f),
            g = Qe(u, d, 3),
            v = ke(m.length),
            b = 0,
            y = l || et,
            E = t ? y(c, v) : i || s ? y(c, 0) : void 0;
          v > b;
          b++
        )
          if ((a || b in m) && ((p = g((h = m[b]), b, f)), e))
            if (t) E[b] = p;
            else if (p)
              switch (e) {
                case 3:
                  return !0;
                case 5:
                  return h;
                case 6:
                  return b;
                case 2:
                  tt.call(E, h);
              }
            else
              switch (e) {
                case 4:
                  return !1;
                case 7:
                  tt.call(E, h);
              }
        return o ? -1 : r || n ? n : E;
      };
    },
    rt = {
      forEach: it(0),
      map: it(1),
      filter: it(2),
      some: it(3),
      every: it(4),
      find: it(5),
      findIndex: it(6),
      filterReject: it(7),
    },
    nt = K('species'),
    ot = rt.filter,
    st =
      w >= 51 ||
      !d(function () {
        var e = [];
        return (
          ((e.constructor = {})[nt] = function () {
            return { foo: 1 };
          }),
          1 !== e.filter(Boolean).foo
        );
      });
  qe(
    { target: 'Array', proto: !0, forced: !st },
    {
      filter: function (e) {
        return ot(this, e, arguments.length > 1 ? arguments[1] : void 0);
      },
    }
  );
  var at = Date.prototype,
    ct = at.toString,
    ut = at.getTime;
  'Invalid Date' != String(new Date(NaN)) &&
    Ce(at, 'toString', function () {
      var e = ut.call(this);
      return e == e ? ct.call(this) : 'Invalid Date';
    });
  var dt = [].slice,
    lt = {};
  qe(
    { target: 'Function', proto: !0 },
    {
      bind:
        Function.bind ||
        function (e) {
          var t = Xe(this),
            i = dt.call(arguments, 1),
            r = function r() {
              var n = i.concat(dt.call(arguments));
              return this instanceof r
                ? (function (e, t, i) {
                    if (!(t in lt)) {
                      for (var r = [], n = 0; n < t; n++) r[n] = 'a[' + n + ']';
                      lt[t] = Function(
                        'C,a',
                        'return new C(' + r.join(',') + ')'
                      );
                    }
                    return lt[t](e, i);
                  })(t, n.length, n)
                : t.apply(e, n);
            };
          return (C(t.prototype) && (r.prototype = t.prototype), r);
        },
    }
  );
  var ht = [].slice,
    pt = /MSIE .\./.test(T),
    ft = function (e) {
      return function (t, i) {
        var r = arguments.length > 2,
          n = r ? ht.call(arguments, 2) : void 0;
        return e(
          r
            ? function () {
                ('function' == typeof t ? t : Function(t)).apply(this, n);
              }
            : t,
          i
        );
      };
    };
  qe(
    { global: !0, bind: !0, forced: pt },
    { setTimeout: ft(u.setTimeout), setInterval: ft(u.setInterval) }
  );
  var mt,
    gt =
      Object.keys ||
      function (e) {
        return xe(e, Me);
      },
    vt = l
      ? Object.defineProperties
      : function (e, t) {
          te(e);
          for (var i, r = gt(t), n = r.length, o = 0; n > o; )
            re.f(e, (i = r[o++]), t[i]);
          return e;
        },
    bt = I('document', 'documentElement'),
    St = pe('IE_PROTO'),
    yt = function () {},
    Et = function (e) {
      return '<script>' + e + '<\/script>';
    },
    Ct = function (e) {
      (e.write(Et('')), e.close());
      var t = e.parentWindow.Object;
      return ((e = null), t);
    },
    It = function () {
      try {
        mt = new ActiveXObject('htmlfile');
      } catch (e) {}
      It =
        document.domain && mt
          ? Ct(mt)
          : (function () {
              var e,
                t = Q('iframe');
              if (t.style)
                return (
                  (t.style.display = 'none'),
                  bt.appendChild(t),
                  (t.src = String('javascript:')),
                  (e = t.contentWindow.document).open(),
                  e.write(Et('document.F=Object')),
                  e.close(),
                  e.F
                );
            })() || Ct(mt);
      for (var e = Me.length; e--; ) delete It.prototype[Me[e]];
      return It();
    };
  fe[St] = !0;
  var Tt =
      Object.create ||
      function (e, t) {
        var i;
        return (
          null !== e
            ? ((yt.prototype = te(e)),
              (i = new yt()),
              (yt.prototype = null),
              (i[St] = e))
            : (i = It()),
          void 0 === t ? i : vt(i, t)
        );
      },
    Rt = K('unscopables'),
    _t = Array.prototype;
  null == _t[Rt] && re.f(_t, Rt, { configurable: !0, value: Tt(null) });
  var kt,
    Ot,
    wt,
    At = function (e) {
      _t[Rt][e] = !0;
    },
    Pt = {},
    Lt = !d(function () {
      function e() {}
      return (
        (e.prototype.constructor = null),
        Object.getPrototypeOf(new e()) !== e.prototype
      );
    }),
    Dt = pe('IE_PROTO'),
    xt = Object.prototype,
    Mt = Lt
      ? Object.getPrototypeOf
      : function (e) {
          return (
            (e = U(e)),
            V(e, Dt)
              ? e[Dt]
              : 'function' == typeof e.constructor && e instanceof e.constructor
                ? e.constructor.prototype
                : e instanceof Object
                  ? xt
                  : null
          );
        },
    Ut = K('iterator'),
    Nt = !1;
  ([].keys &&
    ('next' in (wt = [].keys())
      ? (Ot = Mt(Mt(wt))) !== Object.prototype && (kt = Ot)
      : (Nt = !0)),
    (null == kt ||
      d(function () {
        var e = {};
        return kt[Ut].call(e) !== e;
      })) &&
      (kt = {}),
    V(kt, Ut) ||
      ne(kt, Ut, function () {
        return this;
      }));
  var Vt = { IteratorPrototype: kt, BUGGY_SAFARI_ITERATORS: Nt },
    Ft = re.f,
    jt = K('toStringTag'),
    Bt = function (e, t, i) {
      e &&
        !V((e = i ? e : e.prototype), jt) &&
        Ft(e, jt, { configurable: !0, value: t });
    },
    Wt = Vt.IteratorPrototype,
    Ht = function () {
      return this;
    },
    Gt =
      Object.setPrototypeOf ||
      ('__proto__' in {}
        ? (function () {
            var e,
              t = !1,
              i = {};
            try {
              ((e = Object.getOwnPropertyDescriptor(
                Object.prototype,
                '__proto__'
              ).set).call(i, []),
                (t = i instanceof Array));
            } catch (e) {}
            return function (i, r) {
              return (
                te(i),
                (function (e) {
                  if (!C(e) && null !== e)
                    throw TypeError(
                      "Can't set " + String(e) + ' as a prototype'
                    );
                })(r),
                t ? e.call(i, r) : (i.__proto__ = r),
                i
              );
            };
          })()
        : void 0),
    Jt = Vt.IteratorPrototype,
    Kt = Vt.BUGGY_SAFARI_ITERATORS,
    Yt = K('iterator'),
    zt = function () {
      return this;
    },
    qt = function (e, t, i, r, n, o, s) {
      !(function (e, t, i) {
        var r = t + ' Iterator';
        ((e.prototype = Tt(Wt, { next: m(1, i) })), Bt(e, r, !1), (Pt[r] = Ht));
      })(i, t, r);
      var a,
        c,
        u,
        d = function (e) {
          if (e === n && g) return g;
          if (!Kt && e in p) return p[e];
          switch (e) {
            case 'keys':
            case 'values':
            case 'entries':
              return function () {
                return new i(this, e);
              };
          }
          return function () {
            return new i(this);
          };
        },
        l = t + ' Iterator',
        h = !1,
        p = e.prototype,
        f = p[Yt] || p['@@iterator'] || (n && p[n]),
        g = (!Kt && f) || d(n),
        v = ('Array' == t && p.entries) || f;
      if (
        (v &&
          ((a = Mt(v.call(new e()))),
          Jt !== Object.prototype &&
            a.next &&
            (Mt(a) !== Jt &&
              (Gt ? Gt(a, Jt) : 'function' != typeof a[Yt] && ne(a, Yt, zt)),
            Bt(a, l, !0))),
        'values' == n &&
          f &&
          'values' !== f.name &&
          ((h = !0),
          (g = function () {
            return f.call(this);
          })),
        p[Yt] !== g && ne(p, Yt, g),
        (Pt[t] = g),
        n)
      )
        if (
          ((c = {
            values: d('values'),
            keys: o ? g : d('keys'),
            entries: d('entries'),
          }),
          s)
        )
          for (u in c) (Kt || h || !(u in p)) && Ce(p, u, c[u]);
        else qe({ target: t, proto: !0, forced: Kt || h }, c);
      return c;
    },
    Xt = Ee.set,
    Qt = Ee.getterFor('Array Iterator'),
    $t = qt(
      Array,
      'Array',
      function (e, t) {
        Xt(this, { type: 'Array Iterator', target: E(e), index: 0, kind: t });
      },
      function () {
        var e = Qt(this),
          t = e.target,
          i = e.kind,
          r = e.index++;
        return !t || r >= t.length
          ? ((e.target = void 0), { value: void 0, done: !0 })
          : 'keys' == i
            ? { value: r, done: !1 }
            : 'values' == i
              ? { value: t[r], done: !1 }
              : { value: [r, t[r]], done: !1 };
      },
      'values'
    );
  ((Pt.Arguments = Pt.Array), At('keys'), At('values'), At('entries'));
  var Zt = Ne.f,
    ei = {}.toString,
    ti =
      'object' == ('undefined' == typeof window ? 'undefined' : G(window)) &&
      window &&
      Object.getOwnPropertyNames
        ? Object.getOwnPropertyNames(window)
        : [],
    ii = {
      f: function (e) {
        return ti && '[object Window]' == ei.call(e)
          ? (function (e) {
              try {
                return Zt(e);
              } catch (e) {
                return ti.slice();
              }
            })(e)
          : Zt(E(e));
      },
    },
    ri = !d(function () {
      return Object.isExtensible(Object.preventExtensions({}));
    }),
    ni = o(function (e) {
      var t = re.f,
        i = !1,
        r = B('meta'),
        n = 0,
        o =
          Object.isExtensible ||
          function () {
            return !0;
          },
        s = function (e) {
          t(e, r, { value: { objectID: 'O' + n++, weakData: {} } });
        },
        a = (e.exports = {
          enable: function () {
            ((a.enable = function () {}), (i = !0));
            var e = Ne.f,
              t = [].splice,
              n = {};
            ((n[r] = 1),
              e(n).length &&
                ((Ne.f = function (i) {
                  for (var n = e(i), o = 0, s = n.length; o < s; o++)
                    if (n[o] === r) {
                      t.call(n, o, 1);
                      break;
                    }
                  return n;
                }),
                qe(
                  { target: 'Object', stat: !0, forced: !0 },
                  { getOwnPropertyNames: ii.f }
                )));
          },
          fastKey: function (e, t) {
            if (!C(e))
              return 'symbol' == G(e)
                ? e
                : ('string' == typeof e ? 'S' : 'P') + e;
            if (!V(e, r)) {
              if (!o(e)) return 'F';
              if (!t) return 'E';
              s(e);
            }
            return e[r].objectID;
          },
          getWeakData: function (e, t) {
            if (!V(e, r)) {
              if (!o(e)) return !0;
              if (!t) return !1;
              s(e);
            }
            return e[r].weakData;
          },
          onFreeze: function (e) {
            return (ri && i && o(e) && !V(e, r) && s(e), e);
          },
        });
      fe[r] = !0;
    }),
    oi = K('iterator'),
    si = Array.prototype,
    ai = function (e) {
      return void 0 !== e && (Pt.Array === e || si[oi] === e);
    },
    ci = {};
  ci[K('toStringTag')] = 'z';
  var ui = '[object z]' === String(ci),
    di = K('toStringTag'),
    li =
      'Arguments' ==
      v(
        (function () {
          return arguments;
        })()
      ),
    hi = ui
      ? v
      : function (e) {
          var t, i, r;
          return void 0 === e
            ? 'Undefined'
            : null === e
              ? 'Null'
              : 'string' ==
                  typeof (i = (function (e, t) {
                    try {
                      return e[t];
                    } catch (e) {}
                  })((t = Object(e)), di))
                ? i
                : li
                  ? v(t)
                  : 'Object' == (r = v(t)) && 'function' == typeof t.callee
                    ? 'Arguments'
                    : r;
        },
    pi = K('iterator'),
    fi = function (e) {
      if (null != e) return e[pi] || e['@@iterator'] || Pt[hi(e)];
    },
    mi = function (e) {
      var t = e.return;
      if (void 0 !== t) return te(t.call(e)).value;
    },
    gi = function (e, t) {
      ((this.stopped = e), (this.result = t));
    },
    vi = function (e, t, i) {
      var r,
        n,
        o,
        s,
        a,
        c,
        u,
        d = !(!i || !i.AS_ENTRIES),
        l = !(!i || !i.IS_ITERATOR),
        h = !(!i || !i.INTERRUPTED),
        p = Qe(t, i && i.that, 1 + d + h),
        f = function (e) {
          return (r && mi(r), new gi(!0, e));
        },
        m = function (e) {
          return d
            ? (te(e), h ? p(e[0], e[1], f) : p(e[0], e[1]))
            : h
              ? p(e, f)
              : p(e);
        };
      if (l) r = e;
      else {
        if ('function' != typeof (n = fi(e)))
          throw TypeError('Target is not iterable');
        if (ai(n)) {
          for (o = 0, s = ke(e.length); s > o; o++)
            if ((a = m(e[o])) && a instanceof gi) return a;
          return new gi(!1);
        }
        r = n.call(e);
      }
      for (c = r.next; !(u = c.call(r)).done; ) {
        try {
          a = m(u.value);
        } catch (e) {
          throw (mi(r), e);
        }
        if ('object' == G(a) && a && a instanceof gi) return a;
      }
      return new gi(!1);
    },
    bi = function (e, t, i) {
      if (!(e instanceof t))
        throw TypeError('Incorrect ' + (i ? i + ' ' : '') + 'invocation');
      return e;
    },
    Si = K('iterator'),
    yi = !1;
  try {
    var Ei = 0,
      Ci = {
        next: function () {
          return { done: !!Ei++ };
        },
        return: function () {
          yi = !0;
        },
      };
    ((Ci[Si] = function () {
      return this;
    }),
      Array.from(Ci, function () {
        throw 2;
      }));
  } catch (e) {}
  var Ii = function (e, t) {
      if (!t && !yi) return !1;
      var i = !1;
      try {
        var r = {};
        ((r[Si] = function () {
          return {
            next: function () {
              return { done: (i = !0) };
            },
          };
        }),
          e(r));
      } catch (e) {}
      return i;
    },
    Ti = function (e, t, i) {
      var r, n;
      return (
        Gt &&
          'function' == typeof (r = t.constructor) &&
          r !== i &&
          C((n = r.prototype)) &&
          n !== i.prototype &&
          Gt(e, n),
        e
      );
    },
    Ri = function (e, t, i) {
      for (var r in t) Ce(e, r, t[r], i);
      return e;
    },
    _i = K('species'),
    ki = function (e) {
      var t = I(e);
      l &&
        t &&
        !t[_i] &&
        (0, re.f)(t, _i, {
          configurable: !0,
          get: function () {
            return this;
          },
        });
    },
    Oi = re.f,
    wi = ni.fastKey,
    Ai = Ee.set,
    Pi = Ee.getterFor,
    Li =
      ((function (e, t, i) {
        var r = -1 !== e.indexOf('Map'),
          n = -1 !== e.indexOf('Weak'),
          o = r ? 'set' : 'add',
          s = u[e],
          a = s && s.prototype,
          c = s,
          l = {},
          h = function (e) {
            var t = a[e];
            Ce(
              a,
              e,
              'add' == e
                ? function (e) {
                    return (t.call(this, 0 === e ? 0 : e), this);
                  }
                : 'delete' == e
                  ? function (e) {
                      return !(n && !C(e)) && t.call(this, 0 === e ? 0 : e);
                    }
                  : 'get' == e
                    ? function (e) {
                        return n && !C(e)
                          ? void 0
                          : t.call(this, 0 === e ? 0 : e);
                      }
                    : 'has' == e
                      ? function (e) {
                          return !(n && !C(e)) && t.call(this, 0 === e ? 0 : e);
                        }
                      : function (e, i) {
                          return (t.call(this, 0 === e ? 0 : e, i), this);
                        }
            );
          };
        if (
          Ye(
            e,
            'function' != typeof s ||
              !(
                n ||
                (a.forEach &&
                  !d(function () {
                    new s().entries().next();
                  }))
              )
          )
        )
          ((c = i.getConstructor(t, e, r, o)), ni.enable());
        else if (Ye(e, !0)) {
          var p = new c(),
            f = p[o](n ? {} : -0, 1) != p,
            m = d(function () {
              p.has(1);
            }),
            g = Ii(function (e) {
              new s(e);
            }),
            v =
              !n &&
              d(function () {
                for (var e = new s(), t = 5; t--; ) e[o](t, t);
                return !e.has(-0);
              });
          (g ||
            (((c = t(function (t, i) {
              bi(t, c, e);
              var n = Ti(new s(), t, c);
              return (null != i && vi(i, n[o], { that: n, AS_ENTRIES: r }), n);
            })).prototype = a),
            (a.constructor = c)),
            (m || v) && (h('delete'), h('has'), r && h('get')),
            (v || f) && h(o),
            n && a.clear && delete a.clear);
        }
        ((l[e] = c),
          qe({ global: !0, forced: c != s }, l),
          Bt(c, e),
          n || i.setStrong(c, e, r));
      })(
        'Map',
        function (e) {
          return function () {
            return e(this, arguments.length ? arguments[0] : void 0);
          };
        },
        {
          getConstructor: function (e, t, i, r) {
            var n = e(function (e, o) {
                (bi(e, n, t),
                  Ai(e, {
                    type: t,
                    index: Tt(null),
                    first: void 0,
                    last: void 0,
                    size: 0,
                  }),
                  l || (e.size = 0),
                  null != o && vi(o, e[r], { that: e, AS_ENTRIES: i }));
              }),
              o = Pi(t),
              s = function (e, t, i) {
                var r,
                  n,
                  s = o(e),
                  c = a(e, t);
                return (
                  c
                    ? (c.value = i)
                    : ((s.last = c =
                        {
                          index: (n = wi(t, !0)),
                          key: t,
                          value: i,
                          previous: (r = s.last),
                          next: void 0,
                          removed: !1,
                        }),
                      s.first || (s.first = c),
                      r && (r.next = c),
                      l ? s.size++ : e.size++,
                      'F' !== n && (s.index[n] = c)),
                  e
                );
              },
              a = function (e, t) {
                var i,
                  r = o(e),
                  n = wi(t);
                if ('F' !== n) return r.index[n];
                for (i = r.first; i; i = i.next) if (i.key == t) return i;
              };
            return (
              Ri(n.prototype, {
                clear: function () {
                  for (var e = o(this), t = e.index, i = e.first; i; )
                    ((i.removed = !0),
                      i.previous && (i.previous = i.previous.next = void 0),
                      delete t[i.index],
                      (i = i.next));
                  ((e.first = e.last = void 0),
                    l ? (e.size = 0) : (this.size = 0));
                },
                delete: function (e) {
                  var t = o(this),
                    i = a(this, e);
                  if (i) {
                    var r = i.next,
                      n = i.previous;
                    (delete t.index[i.index],
                      (i.removed = !0),
                      n && (n.next = r),
                      r && (r.previous = n),
                      t.first == i && (t.first = r),
                      t.last == i && (t.last = n),
                      l ? t.size-- : this.size--);
                  }
                  return !!i;
                },
                forEach: function (e) {
                  for (
                    var t,
                      i = o(this),
                      r = Qe(
                        e,
                        arguments.length > 1 ? arguments[1] : void 0,
                        3
                      );
                    (t = t ? t.next : i.first);

                  )
                    for (r(t.value, t.key, this); t && t.removed; )
                      t = t.previous;
                },
                has: function (e) {
                  return !!a(this, e);
                },
              }),
              Ri(
                n.prototype,
                i
                  ? {
                      get: function (e) {
                        var t = a(this, e);
                        return t && t.value;
                      },
                      set: function (e, t) {
                        return s(this, 0 === e ? 0 : e, t);
                      },
                    }
                  : {
                      add: function (e) {
                        return s(this, (e = 0 === e ? 0 : e), e);
                      },
                    }
              ),
              l &&
                Oi(n.prototype, 'size', {
                  get: function () {
                    return o(this).size;
                  },
                }),
              n
            );
          },
          setStrong: function (e, t, i) {
            var r = t + ' Iterator',
              n = Pi(t),
              o = Pi(r);
            (qt(
              e,
              t,
              function (e, t) {
                Ai(this, {
                  type: r,
                  target: e,
                  state: n(e),
                  kind: t,
                  last: void 0,
                });
              },
              function () {
                for (var e = o(this), t = e.kind, i = e.last; i && i.removed; )
                  i = i.previous;
                return e.target && (e.last = i = i ? i.next : e.state.first)
                  ? 'keys' == t
                    ? { value: i.key, done: !1 }
                    : 'values' == t
                      ? { value: i.value, done: !1 }
                      : { value: [i.key, i.value], done: !1 }
                  : ((e.target = void 0), { value: void 0, done: !0 });
              },
              i ? 'entries' : 'values',
              !i,
              !0
            ),
              ki(t));
          },
        }
      ),
      ui
        ? {}.toString
        : function () {
            return '[object ' + hi(this) + ']';
          });
  ui || Ce(Object.prototype, 'toString', Li, { unsafe: !0 });
  var Di = function (e) {
      if (L(e)) throw TypeError('Cannot convert a Symbol value to a string');
      return String(e);
    },
    xi = function (e) {
      return function (t, i) {
        var r,
          n,
          o = Di(y(t)),
          s = Re(i),
          a = o.length;
        return s < 0 || s >= a
          ? e
            ? ''
            : void 0
          : (r = o.charCodeAt(s)) < 55296 ||
              r > 56319 ||
              s + 1 === a ||
              (n = o.charCodeAt(s + 1)) < 56320 ||
              n > 57343
            ? e
              ? o.charAt(s)
              : r
            : e
              ? o.slice(s, s + 2)
              : n - 56320 + ((r - 55296) << 10) + 65536;
      };
    },
    Mi = { codeAt: xi(!1), charAt: xi(!0) },
    Ui = Mi.charAt,
    Ni = Ee.set,
    Vi = Ee.getterFor('String Iterator');
  qt(
    String,
    'String',
    function (e) {
      Ni(this, { type: 'String Iterator', string: Di(e), index: 0 });
    },
    function () {
      var e,
        t = Vi(this),
        i = t.string,
        r = t.index;
      return r >= i.length
        ? { value: void 0, done: !0 }
        : ((e = Ui(i, r)), (t.index += e.length), { value: e, done: !1 });
    }
  );
  var Fi = {
      CSSRuleList: 0,
      CSSStyleDeclaration: 0,
      CSSValueList: 0,
      ClientRectList: 0,
      DOMRectList: 0,
      DOMStringList: 0,
      DOMTokenList: 1,
      DataTransferItemList: 0,
      FileList: 0,
      HTMLAllCollection: 0,
      HTMLCollection: 0,
      HTMLFormElement: 0,
      HTMLSelectElement: 0,
      MediaList: 0,
      MimeTypeArray: 0,
      NamedNodeMap: 0,
      NodeList: 1,
      PaintRequestList: 0,
      Plugin: 0,
      PluginArray: 0,
      SVGLengthList: 0,
      SVGNumberList: 0,
      SVGPathSegList: 0,
      SVGPointList: 0,
      SVGStringList: 0,
      SVGTransformList: 0,
      SourceBufferList: 0,
      StyleSheetList: 0,
      TextTrackCueList: 0,
      TextTrackList: 0,
      TouchList: 0,
    },
    ji = K('iterator'),
    Bi = K('toStringTag'),
    Wi = $t.values;
  for (var Hi in Fi) {
    var Gi = u[Hi],
      Ji = Gi && Gi.prototype;
    if (Ji) {
      if (Ji[ji] !== Wi)
        try {
          ne(Ji, ji, Wi);
        } catch (e) {
          Ji[ji] = Wi;
        }
      if ((Ji[Bi] || ne(Ji, Bi, Hi), Fi[Hi]))
        for (var Ki in $t)
          if (Ji[Ki] !== $t[Ki])
            try {
              ne(Ji, Ki, $t[Ki]);
            } catch (e) {
              Ji[Ki] = $t[Ki];
            }
    }
  }
  var Yi = 'undefined' != typeof ArrayBuffer && 'undefined' != typeof DataView,
    zi = function (e) {
      if (void 0 === e) return 0;
      var t = Re(e),
        i = ke(t);
      if (t !== i) throw RangeError('Wrong length or index');
      return i;
    },
    qi = Math.abs,
    Xi = Math.pow,
    Qi = Math.floor,
    $i = Math.log,
    Zi = Math.LN2,
    er = function (e) {
      for (
        var t = U(this),
          i = ke(t.length),
          r = arguments.length,
          n = Ae(r > 1 ? arguments[1] : void 0, i),
          o = r > 2 ? arguments[2] : void 0,
          s = void 0 === o ? i : Ae(o, i);
        s > n;

      )
        t[n++] = e;
      return t;
    },
    tr = Ne.f,
    ir = re.f,
    rr = Ee.get,
    nr = Ee.set,
    or = u.ArrayBuffer,
    sr = or,
    ar = u.DataView,
    cr = ar && ar.prototype,
    ur = Object.prototype,
    dr = u.RangeError,
    lr = function (e, t, i) {
      var r,
        n,
        o,
        s = new Array(i),
        a = 8 * i - t - 1,
        c = (1 << a) - 1,
        u = c >> 1,
        d = 23 === t ? Xi(2, -24) - Xi(2, -77) : 0,
        l = e < 0 || (0 === e && 1 / e < 0) ? 1 : 0,
        h = 0;
      for (
        (e = qi(e)) != e || 1 / 0 === e
          ? ((n = e != e ? 1 : 0), (r = c))
          : ((r = Qi($i(e) / Zi)),
            e * (o = Xi(2, -r)) < 1 && (r--, (o *= 2)),
            (e += r + u >= 1 ? d / o : d * Xi(2, 1 - u)) * o >= 2 &&
              (r++, (o /= 2)),
            r + u >= c
              ? ((n = 0), (r = c))
              : r + u >= 1
                ? ((n = (e * o - 1) * Xi(2, t)), (r += u))
                : ((n = e * Xi(2, u - 1) * Xi(2, t)), (r = 0)));
        t >= 8;
        s[h++] = 255 & n, n /= 256, t -= 8
      );
      for (r = (r << t) | n, a += t; a > 0; s[h++] = 255 & r, r /= 256, a -= 8);
      return ((s[--h] |= 128 * l), s);
    },
    hr = function (e, t) {
      var i,
        r = e.length,
        n = 8 * r - t - 1,
        o = (1 << n) - 1,
        s = o >> 1,
        a = n - 7,
        c = r - 1,
        u = e[c--],
        d = 127 & u;
      for (u >>= 7; a > 0; d = 256 * d + e[c], c--, a -= 8);
      for (
        i = d & ((1 << -a) - 1), d >>= -a, a += t;
        a > 0;
        i = 256 * i + e[c], c--, a -= 8
      );
      if (0 === d) d = 1 - s;
      else {
        if (d === o) return i ? NaN : u ? -1 / 0 : 1 / 0;
        ((i += Xi(2, t)), (d -= s));
      }
      return (u ? -1 : 1) * i * Xi(2, d - t);
    },
    pr = function (e) {
      return [255 & e];
    },
    fr = function (e) {
      return [255 & e, (e >> 8) & 255];
    },
    mr = function (e) {
      return [255 & e, (e >> 8) & 255, (e >> 16) & 255, (e >> 24) & 255];
    },
    gr = function (e) {
      return (e[3] << 24) | (e[2] << 16) | (e[1] << 8) | e[0];
    },
    vr = function (e) {
      return lr(e, 23, 4);
    },
    br = function (e) {
      return lr(e, 52, 8);
    },
    Sr = function (e, t) {
      ir(e.prototype, t, {
        get: function () {
          return rr(this)[t];
        },
      });
    },
    yr = function (e, t, i, r) {
      var n = zi(i),
        o = rr(e);
      if (n + t > o.byteLength) throw dr('Wrong index');
      var s = rr(o.buffer).bytes,
        a = n + o.byteOffset,
        c = s.slice(a, a + t);
      return r ? c : c.reverse();
    },
    Er = function (e, t, i, r, n, o) {
      var s = zi(i),
        a = rr(e);
      if (s + t > a.byteLength) throw dr('Wrong index');
      for (
        var c = rr(a.buffer).bytes, u = s + a.byteOffset, d = r(+n), l = 0;
        l < t;
        l++
      )
        c[u + l] = d[o ? l : t - l - 1];
    };
  if (Yi) {
    if (
      !d(function () {
        or(1);
      }) ||
      !d(function () {
        new or(-1);
      }) ||
      d(function () {
        return (new or(), new or(1.5), new or(NaN), 'ArrayBuffer' != or.name);
      })
    ) {
      for (
        var Cr,
          Ir = ((sr = function (e) {
            return (bi(this, sr), new or(zi(e)));
          }).prototype = or.prototype),
          Tr = tr(or),
          Rr = 0;
        Tr.length > Rr;

      )
        (Cr = Tr[Rr++]) in sr || ne(sr, Cr, or[Cr]);
      Ir.constructor = sr;
    }
    Gt && Mt(cr) !== ur && Gt(cr, ur);
    var _r = new ar(new sr(2)),
      kr = cr.setInt8;
    (_r.setInt8(0, 2147483648),
      _r.setInt8(1, 2147483649),
      (!_r.getInt8(0) && _r.getInt8(1)) ||
        Ri(
          cr,
          {
            setInt8: function (e, t) {
              kr.call(this, e, (t << 24) >> 24);
            },
            setUint8: function (e, t) {
              kr.call(this, e, (t << 24) >> 24);
            },
          },
          { unsafe: !0 }
        ));
  } else
    ((sr = function (e) {
      bi(this, sr, 'ArrayBuffer');
      var t = zi(e);
      (nr(this, { bytes: er.call(new Array(t), 0), byteLength: t }),
        l || (this.byteLength = t));
    }),
      (ar = function (e, t, i) {
        (bi(this, ar, 'DataView'), bi(e, sr, 'DataView'));
        var r = rr(e).byteLength,
          n = Re(t);
        if (n < 0 || n > r) throw dr('Wrong offset');
        if (n + (i = void 0 === i ? r - n : ke(i)) > r)
          throw dr('Wrong length');
        (nr(this, { buffer: e, byteLength: i, byteOffset: n }),
          l ||
            ((this.buffer = e), (this.byteLength = i), (this.byteOffset = n)));
      }),
      l &&
        (Sr(sr, 'byteLength'),
        Sr(ar, 'buffer'),
        Sr(ar, 'byteLength'),
        Sr(ar, 'byteOffset')),
      Ri(ar.prototype, {
        getInt8: function (e) {
          return (yr(this, 1, e)[0] << 24) >> 24;
        },
        getUint8: function (e) {
          return yr(this, 1, e)[0];
        },
        getInt16: function (e) {
          var t = yr(this, 2, e, arguments.length > 1 ? arguments[1] : void 0);
          return (((t[1] << 8) | t[0]) << 16) >> 16;
        },
        getUint16: function (e) {
          var t = yr(this, 2, e, arguments.length > 1 ? arguments[1] : void 0);
          return (t[1] << 8) | t[0];
        },
        getInt32: function (e) {
          return gr(
            yr(this, 4, e, arguments.length > 1 ? arguments[1] : void 0)
          );
        },
        getUint32: function (e) {
          return (
            gr(yr(this, 4, e, arguments.length > 1 ? arguments[1] : void 0)) >>>
            0
          );
        },
        getFloat32: function (e) {
          return hr(
            yr(this, 4, e, arguments.length > 1 ? arguments[1] : void 0),
            23
          );
        },
        getFloat64: function (e) {
          return hr(
            yr(this, 8, e, arguments.length > 1 ? arguments[1] : void 0),
            52
          );
        },
        setInt8: function (e, t) {
          Er(this, 1, e, pr, t);
        },
        setUint8: function (e, t) {
          Er(this, 1, e, pr, t);
        },
        setInt16: function (e, t) {
          Er(this, 2, e, fr, t, arguments.length > 2 ? arguments[2] : void 0);
        },
        setUint16: function (e, t) {
          Er(this, 2, e, fr, t, arguments.length > 2 ? arguments[2] : void 0);
        },
        setInt32: function (e, t) {
          Er(this, 4, e, mr, t, arguments.length > 2 ? arguments[2] : void 0);
        },
        setUint32: function (e, t) {
          Er(this, 4, e, mr, t, arguments.length > 2 ? arguments[2] : void 0);
        },
        setFloat32: function (e, t) {
          Er(this, 4, e, vr, t, arguments.length > 2 ? arguments[2] : void 0);
        },
        setFloat64: function (e, t) {
          Er(this, 8, e, br, t, arguments.length > 2 ? arguments[2] : void 0);
        },
      }));
  (Bt(sr, 'ArrayBuffer'), Bt(ar, 'DataView'));
  var Or = { ArrayBuffer: sr, DataView: ar },
    wr = K('species'),
    Ar = function (e, t) {
      var i,
        r = te(e).constructor;
      return void 0 === r || null == (i = te(r)[wr]) ? t : Xe(i);
    },
    Pr = Or.ArrayBuffer,
    Lr = Or.DataView,
    Dr = Pr.prototype.slice,
    xr = d(function () {
      return !new Pr(2).slice(1, void 0).byteLength;
    });
  qe(
    { target: 'ArrayBuffer', proto: !0, unsafe: !0, forced: xr },
    {
      slice: function (e, t) {
        if (void 0 !== Dr && void 0 === t) return Dr.call(te(this), e);
        for (
          var i = te(this).byteLength,
            r = Ae(e, i),
            n = Ae(void 0 === t ? i : t, i),
            o = new (Ar(this, Pr))(ke(n - r)),
            s = new Lr(this),
            a = new Lr(o),
            c = 0;
          r < n;

        )
          a.setUint8(c++, s.getUint8(r++));
        return o;
      },
    }
  );
  var Mr,
    Ur,
    Nr,
    Vr = re.f,
    Fr = u.Int8Array,
    jr = Fr && Fr.prototype,
    Br = u.Uint8ClampedArray,
    Wr = Br && Br.prototype,
    Hr = Fr && Mt(Fr),
    Gr = jr && Mt(jr),
    Jr = Object.prototype,
    Kr = Jr.isPrototypeOf,
    Yr = K('toStringTag'),
    zr = B('TYPED_ARRAY_TAG'),
    qr = B('TYPED_ARRAY_CONSTRUCTOR'),
    Xr = Yi && !!Gt && 'Opera' !== hi(u.opera),
    Qr = !1,
    $r = {
      Int8Array: 1,
      Uint8Array: 1,
      Uint8ClampedArray: 1,
      Int16Array: 2,
      Uint16Array: 2,
      Int32Array: 4,
      Uint32Array: 4,
      Float32Array: 4,
      Float64Array: 8,
    },
    Zr = { BigInt64Array: 8, BigUint64Array: 8 },
    en = function (e) {
      if (!C(e)) return !1;
      var t = hi(e);
      return V($r, t) || V(Zr, t);
    };
  for (Mr in $r)
    (Nr = (Ur = u[Mr]) && Ur.prototype) ? ne(Nr, qr, Ur) : (Xr = !1);
  for (Mr in Zr) (Nr = (Ur = u[Mr]) && Ur.prototype) && ne(Nr, qr, Ur);
  if (
    (!Xr || 'function' != typeof Hr || Hr === Function.prototype) &&
    ((Hr = function () {
      throw TypeError('Incorrect invocation');
    }),
    Xr)
  )
    for (Mr in $r) u[Mr] && Gt(u[Mr], Hr);
  if ((!Xr || !Gr || Gr === Jr) && ((Gr = Hr.prototype), Xr))
    for (Mr in $r) u[Mr] && Gt(u[Mr].prototype, Gr);
  if ((Xr && Mt(Wr) !== Gr && Gt(Wr, Gr), l && !V(Gr, Yr)))
    for (Mr in ((Qr = !0),
    Vr(Gr, Yr, {
      get: function () {
        return C(this) ? this[zr] : void 0;
      },
    }),
    $r))
      u[Mr] && ne(u[Mr], zr, Mr);
  var tn = {
      NATIVE_ARRAY_BUFFER_VIEWS: Xr,
      TYPED_ARRAY_CONSTRUCTOR: qr,
      TYPED_ARRAY_TAG: Qr && zr,
      aTypedArray: function (e) {
        if (en(e)) return e;
        throw TypeError('Target is not a typed array');
      },
      aTypedArrayConstructor: function (e) {
        if (Gt && !Kr.call(Hr, e))
          throw TypeError('Target is not a typed array constructor');
        return e;
      },
      exportTypedArrayMethod: function (e, t, i) {
        if (l) {
          if (i)
            for (var r in $r) {
              var n = u[r];
              if (n && V(n.prototype, e))
                try {
                  delete n.prototype[e];
                } catch (e) {}
            }
          (Gr[e] && !i) || Ce(Gr, e, i ? t : (Xr && jr[e]) || t);
        }
      },
      exportTypedArrayStaticMethod: function (e, t, i) {
        var r, n;
        if (l) {
          if (Gt) {
            if (i)
              for (r in $r)
                if ((n = u[r]) && V(n, e))
                  try {
                    delete n[e];
                  } catch (e) {}
            if (Hr[e] && !i) return;
            try {
              return Ce(Hr, e, i ? t : (Xr && Hr[e]) || t);
            } catch (e) {}
          }
          for (r in $r) !(n = u[r]) || (n[e] && !i) || Ce(n, e, t);
        }
      },
      isView: function (e) {
        if (!C(e)) return !1;
        var t = hi(e);
        return 'DataView' === t || V($r, t) || V(Zr, t);
      },
      isTypedArray: en,
      TypedArray: Hr,
      TypedArrayPrototype: Gr,
    },
    rn = u.ArrayBuffer,
    nn = u.Int8Array,
    on =
      !tn.NATIVE_ARRAY_BUFFER_VIEWS ||
      !d(function () {
        nn(1);
      }) ||
      !d(function () {
        new nn(-1);
      }) ||
      !Ii(function (e) {
        (new nn(), new nn(null), new nn(1.5), new nn(e));
      }, !0) ||
      d(function () {
        return 1 !== new nn(new rn(2), 1, void 0).length;
      }),
    sn = Math.floor,
    an = function (e, t) {
      var i = (function (e) {
        var t = Re(e);
        if (t < 0) throw RangeError("The argument can't be less than 0");
        return t;
      })(e);
      if (i % t) throw RangeError('Wrong offset');
      return i;
    },
    cn = tn.aTypedArrayConstructor,
    un = function (e) {
      var t,
        i,
        r,
        n,
        o,
        s,
        a = U(e),
        c = arguments.length,
        u = c > 1 ? arguments[1] : void 0,
        d = void 0 !== u,
        l = fi(a);
      if (null != l && !ai(l))
        for (s = (o = l.call(a)).next, a = []; !(n = s.call(o)).done; )
          a.push(n.value);
      for (
        d && c > 2 && (u = Qe(u, arguments[2], 2)),
          i = ke(a.length),
          r = new (cn(this))(i),
          t = 0;
        i > t;
        t++
      )
        r[t] = d ? u(a[t], t) : a[t];
      return r;
    };
  o(function (e) {
    var t = Ne.f,
      i = rt.forEach,
      r = Ee.get,
      n = Ee.set,
      o = re.f,
      s = ee.f,
      a = Math.round,
      c = u.RangeError,
      d = Or.ArrayBuffer,
      h = Or.DataView,
      p = tn.NATIVE_ARRAY_BUFFER_VIEWS,
      f = tn.TYPED_ARRAY_CONSTRUCTOR,
      g = tn.TYPED_ARRAY_TAG,
      v = tn.TypedArray,
      b = tn.TypedArrayPrototype,
      S = tn.aTypedArrayConstructor,
      y = tn.isTypedArray,
      E = function (e, t) {
        for (var i = 0, r = t.length, n = new (S(e))(r); r > i; ) n[i] = t[i++];
        return n;
      },
      I = function (e, t) {
        o(e, t, {
          get: function () {
            return r(this)[t];
          },
        });
      },
      T = function (e) {
        var t;
        return (
          e instanceof d ||
          'ArrayBuffer' == (t = hi(e)) ||
          'SharedArrayBuffer' == t
        );
      },
      R = function (e, t) {
        return (
          y(e) &&
          !L(t) &&
          t in e &&
          !C((i = +t)) &&
          isFinite(i) &&
          sn(i) === i &&
          t >= 0
        );
        var i;
      },
      _ = function (e, t) {
        return ((t = z(t)), R(e, t) ? m(2, e[t]) : s(e, t));
      },
      k = function (e, t, i) {
        return (
          (t = z(t)),
          !(R(e, t) && C(i) && V(i, 'value')) ||
          V(i, 'get') ||
          V(i, 'set') ||
          i.configurable ||
          (V(i, 'writable') && !i.writable) ||
          (V(i, 'enumerable') && !i.enumerable)
            ? o(e, t, i)
            : ((e[t] = i.value), e)
        );
      };
    l
      ? (p ||
          ((ee.f = _),
          (re.f = k),
          I(b, 'buffer'),
          I(b, 'byteOffset'),
          I(b, 'byteLength'),
          I(b, 'length')),
        qe(
          { target: 'Object', stat: !0, forced: !p },
          { getOwnPropertyDescriptor: _, defineProperty: k }
        ),
        (e.exports = function (e, s, l) {
          var m = e.match(/\d+$/)[0] / 8,
            S = e + (l ? 'Clamped' : '') + 'Array',
            I = 'get' + e,
            R = 'set' + e,
            _ = u[S],
            k = _,
            O = k && k.prototype,
            w = {},
            A = function (e, t) {
              o(e, t, {
                get: function () {
                  return (function (e, t) {
                    var i = r(e);
                    return i.view[I](t * m + i.byteOffset, !0);
                  })(this, t);
                },
                set: function (e) {
                  return (function (e, t, i) {
                    var n = r(e);
                    (l && (i = (i = a(i)) < 0 ? 0 : i > 255 ? 255 : 255 & i),
                      n.view[R](t * m + n.byteOffset, i, !0));
                  })(this, t, e);
                },
                enumerable: !0,
              });
            };
          (p
            ? on &&
              ((k = s(function (e, t, i, r) {
                return (
                  bi(e, k, S),
                  Ti(
                    C(t)
                      ? T(t)
                        ? void 0 !== r
                          ? new _(t, an(i, m), r)
                          : void 0 !== i
                            ? new _(t, an(i, m))
                            : new _(t)
                        : y(t)
                          ? E(k, t)
                          : un.call(k, t)
                      : new _(zi(t)),
                    e,
                    k
                  )
                );
              })),
              Gt && Gt(k, v),
              i(t(_), function (e) {
                e in k || ne(k, e, _[e]);
              }),
              (k.prototype = O))
            : ((k = s(function (e, t, i, r) {
                bi(e, k, S);
                var o,
                  s,
                  a,
                  u = 0,
                  l = 0;
                if (C(t)) {
                  if (!T(t)) return y(t) ? E(k, t) : un.call(k, t);
                  ((o = t), (l = an(i, m)));
                  var p = t.byteLength;
                  if (void 0 === r) {
                    if (p % m) throw c('Wrong length');
                    if ((s = p - l) < 0) throw c('Wrong length');
                  } else if ((s = ke(r) * m) + l > p) throw c('Wrong length');
                  a = s / m;
                } else ((a = zi(t)), (o = new d((s = a * m))));
                for (
                  n(e, {
                    buffer: o,
                    byteOffset: l,
                    byteLength: s,
                    length: a,
                    view: new h(o),
                  });
                  u < a;

                )
                  A(e, u++);
              })),
              Gt && Gt(k, v),
              (O = k.prototype = Tt(b))),
            O.constructor !== k && ne(O, 'constructor', k),
            ne(O, f, k),
            g && ne(O, g, S),
            (w[S] = k),
            qe({ global: !0, forced: k != _, sham: !p }, w),
            'BYTES_PER_ELEMENT' in k || ne(k, 'BYTES_PER_ELEMENT', m),
            'BYTES_PER_ELEMENT' in O || ne(O, 'BYTES_PER_ELEMENT', m),
            ki(S));
        }))
      : (e.exports = function () {});
  })('Float32', function (e) {
    return function (t, i, r) {
      return e(this, t, i, r);
    };
  });
  var dn = Math.min,
    ln =
      [].copyWithin ||
      function (e, t) {
        var i = U(this),
          r = ke(i.length),
          n = Ae(e, r),
          o = Ae(t, r),
          s = arguments.length > 2 ? arguments[2] : void 0,
          a = dn((void 0 === s ? r : Ae(s, r)) - o, r - n),
          c = 1;
        for (
          o < n && n < o + a && ((c = -1), (o += a - 1), (n += a - 1));
          a-- > 0;

        )
          (o in i ? (i[n] = i[o]) : delete i[n], (n += c), (o += c));
        return i;
      },
    hn = tn.aTypedArray;
  (0, tn.exportTypedArrayMethod)('copyWithin', function (e, t) {
    return ln.call(
      hn(this),
      e,
      t,
      arguments.length > 2 ? arguments[2] : void 0
    );
  });
  var pn = rt.every,
    fn = tn.aTypedArray;
  (0, tn.exportTypedArrayMethod)('every', function (e) {
    return pn(fn(this), e, arguments.length > 1 ? arguments[1] : void 0);
  });
  var mn = tn.aTypedArray;
  (0, tn.exportTypedArrayMethod)('fill', function (e) {
    return er.apply(mn(this), arguments);
  });
  var gn = tn.TYPED_ARRAY_CONSTRUCTOR,
    vn = tn.aTypedArrayConstructor,
    bn = function (e) {
      return vn(Ar(e, e[gn]));
    },
    Sn = rt.filter,
    yn = tn.aTypedArray;
  (0, tn.exportTypedArrayMethod)('filter', function (e) {
    return (function (e, t) {
      return (function (e, t) {
        for (var i = 0, r = t.length, n = new e(r); r > i; ) n[i] = t[i++];
        return n;
      })(bn(e), t);
    })(this, Sn(yn(this), e, arguments.length > 1 ? arguments[1] : void 0));
  });
  var En = rt.find,
    Cn = tn.aTypedArray;
  (0, tn.exportTypedArrayMethod)('find', function (e) {
    return En(Cn(this), e, arguments.length > 1 ? arguments[1] : void 0);
  });
  var In = rt.findIndex,
    Tn = tn.aTypedArray;
  (0, tn.exportTypedArrayMethod)('findIndex', function (e) {
    return In(Tn(this), e, arguments.length > 1 ? arguments[1] : void 0);
  });
  var Rn = rt.forEach,
    _n = tn.aTypedArray;
  (0, tn.exportTypedArrayMethod)('forEach', function (e) {
    Rn(_n(this), e, arguments.length > 1 ? arguments[1] : void 0);
  });
  var kn = Le.includes,
    On = tn.aTypedArray;
  (0, tn.exportTypedArrayMethod)('includes', function (e) {
    return kn(On(this), e, arguments.length > 1 ? arguments[1] : void 0);
  });
  var wn = Le.indexOf,
    An = tn.aTypedArray;
  (0, tn.exportTypedArrayMethod)('indexOf', function (e) {
    return wn(An(this), e, arguments.length > 1 ? arguments[1] : void 0);
  });
  var Pn = K('iterator'),
    Ln = u.Uint8Array,
    Dn = $t.values,
    xn = $t.keys,
    Mn = $t.entries,
    Un = tn.aTypedArray,
    Nn = tn.exportTypedArrayMethod,
    Vn = Ln && Ln.prototype[Pn],
    Fn = !!Vn && ('values' == Vn.name || null == Vn.name),
    jn = function () {
      return Dn.call(Un(this));
    };
  (Nn('entries', function () {
    return Mn.call(Un(this));
  }),
    Nn('keys', function () {
      return xn.call(Un(this));
    }),
    Nn('values', jn, !Fn),
    Nn(Pn, jn, !Fn));
  var Bn = tn.aTypedArray,
    Wn = [].join;
  (0, tn.exportTypedArrayMethod)('join', function (e) {
    return Wn.apply(Bn(this), arguments);
  });
  var Hn = function (e, t) {
      var i = [][e];
      return (
        !!i &&
        d(function () {
          i.call(
            null,
            t ||
              function () {
                throw 1;
              },
            1
          );
        })
      );
    },
    Gn = Math.min,
    Jn = [].lastIndexOf,
    Kn = !!Jn && 1 / [1].lastIndexOf(1, -0) < 0,
    Yn = Hn('lastIndexOf'),
    zn =
      Kn || !Yn
        ? function (e) {
            if (Kn) return Jn.apply(this, arguments) || 0;
            var t = E(this),
              i = ke(t.length),
              r = i - 1;
            for (
              arguments.length > 1 && (r = Gn(r, Re(arguments[1]))),
                r < 0 && (r = i + r);
              r >= 0;
              r--
            )
              if (r in t && t[r] === e) return r || 0;
            return -1;
          }
        : Jn,
    qn = tn.aTypedArray;
  (0, tn.exportTypedArrayMethod)('lastIndexOf', function (e) {
    return zn.apply(qn(this), arguments);
  });
  var Xn = rt.map,
    Qn = tn.aTypedArray;
  (0, tn.exportTypedArrayMethod)('map', function (e) {
    return Xn(
      Qn(this),
      e,
      arguments.length > 1 ? arguments[1] : void 0,
      function (e, t) {
        return new (bn(e))(t);
      }
    );
  });
  var $n = function (e) {
      return function (t, i, r, n) {
        Xe(i);
        var o = U(t),
          s = S(o),
          a = ke(o.length),
          c = e ? a - 1 : 0,
          u = e ? -1 : 1;
        if (r < 2)
          for (;;) {
            if (c in s) {
              ((n = s[c]), (c += u));
              break;
            }
            if (((c += u), e ? c < 0 : a <= c))
              throw TypeError('Reduce of empty array with no initial value');
          }
        for (; e ? c >= 0 : a > c; c += u) c in s && (n = i(n, s[c], c, o));
        return n;
      };
    },
    Zn = { left: $n(!1), right: $n(!0) },
    eo = Zn.left,
    to = tn.aTypedArray;
  (0, tn.exportTypedArrayMethod)('reduce', function (e) {
    return eo(
      to(this),
      e,
      arguments.length,
      arguments.length > 1 ? arguments[1] : void 0
    );
  });
  var io = Zn.right,
    ro = tn.aTypedArray;
  (0, tn.exportTypedArrayMethod)('reduceRight', function (e) {
    return io(
      ro(this),
      e,
      arguments.length,
      arguments.length > 1 ? arguments[1] : void 0
    );
  });
  var no = tn.aTypedArray,
    oo = Math.floor;
  (0, tn.exportTypedArrayMethod)('reverse', function () {
    for (var e, t = no(this).length, i = oo(t / 2), r = 0; r < i; )
      ((e = this[r]), (this[r++] = this[--t]), (this[t] = e));
    return this;
  });
  var so = tn.aTypedArray;
  (0, tn.exportTypedArrayMethod)(
    'set',
    function (e) {
      so(this);
      var t = an(arguments.length > 1 ? arguments[1] : void 0, 1),
        i = this.length,
        r = U(e),
        n = ke(r.length),
        o = 0;
      if (n + t > i) throw RangeError('Wrong length');
      for (; o < n; ) this[t + o] = r[o++];
    },
    d(function () {
      new Int8Array(1).set({});
    })
  );
  var ao = tn.aTypedArray,
    co = [].slice;
  (0, tn.exportTypedArrayMethod)(
    'slice',
    function (e, t) {
      for (
        var i = co.call(ao(this), e, t),
          r = bn(this),
          n = 0,
          o = i.length,
          s = new r(o);
        o > n;

      )
        s[n] = i[n++];
      return s;
    },
    d(function () {
      new Int8Array(1).slice();
    })
  );
  var uo = rt.some,
    lo = tn.aTypedArray;
  (0, tn.exportTypedArrayMethod)('some', function (e) {
    return uo(lo(this), e, arguments.length > 1 ? arguments[1] : void 0);
  });
  var ho = Math.floor,
    po = function (e, t) {
      for (var i, r, n = e.length, o = 1; o < n; ) {
        for (r = o, i = e[o]; r && t(e[r - 1], i) > 0; ) e[r] = e[--r];
        r !== o++ && (e[r] = i);
      }
      return e;
    },
    fo = function (e, t, i) {
      for (
        var r = e.length, n = t.length, o = 0, s = 0, a = [];
        o < r || s < n;

      )
        a.push(
          o < r && s < n
            ? i(e[o], t[s]) <= 0
              ? e[o++]
              : t[s++]
            : o < r
              ? e[o++]
              : t[s++]
        );
      return a;
    },
    mo = function e(t, i) {
      var r = t.length,
        n = ho(r / 2);
      return r < 8 ? po(t, i) : fo(e(t.slice(0, n), i), e(t.slice(n), i), i);
    },
    go = T.match(/firefox\/(\d+)/i),
    vo = !!go && +go[1],
    bo = /MSIE|Trident/.test(T),
    So = T.match(/AppleWebKit\/(\d+)\./),
    yo = !!So && +So[1],
    Eo = tn.aTypedArray,
    Co = tn.exportTypedArrayMethod,
    Io = u.Uint16Array,
    To = Io && Io.prototype.sort,
    Ro =
      !!To &&
      !d(function () {
        var e = new Io(2);
        (e.sort(null), e.sort({}));
      }),
    _o =
      !!To &&
      !d(function () {
        if (w) return w < 74;
        if (vo) return vo < 67;
        if (bo) return !0;
        if (yo) return yo < 602;
        var e,
          t,
          i = new Io(516),
          r = Array(516);
        for (e = 0; e < 516; e++)
          ((t = e % 4), (i[e] = 515 - e), (r[e] = e - 2 * t + 3));
        for (
          i.sort(function (e, t) {
            return ((e / 4) | 0) - ((t / 4) | 0);
          }),
            e = 0;
          e < 516;
          e++
        )
          if (i[e] !== r[e]) return !0;
      });
  Co(
    'sort',
    function (e) {
      if ((void 0 !== e && Xe(e), _o)) return To.call(this, e);
      Eo(this);
      var t,
        i = ke(this.length),
        r = Array(i);
      for (t = 0; t < i; t++) r[t] = this[t];
      for (
        r = mo(
          this,
          (function (e) {
            return function (t, i) {
              return void 0 !== e
                ? +e(t, i) || 0
                : i != i
                  ? -1
                  : t != t
                    ? 1
                    : 0 === t && 0 === i
                      ? 1 / t > 0 && 1 / i < 0
                        ? 1
                        : -1
                      : t > i;
            };
          })(e)
        ),
          t = 0;
        t < i;
        t++
      )
        this[t] = r[t];
      return this;
    },
    !_o || Ro
  );
  var ko = tn.aTypedArray;
  (0, tn.exportTypedArrayMethod)('subarray', function (e, t) {
    var i = ko(this),
      r = i.length,
      n = Ae(e, r);
    return new (bn(i))(
      i.buffer,
      i.byteOffset + n * i.BYTES_PER_ELEMENT,
      ke((void 0 === t ? r : Ae(t, r)) - n)
    );
  });
  var Oo = u.Int8Array,
    wo = tn.aTypedArray,
    Ao = tn.exportTypedArrayMethod,
    Po = [].toLocaleString,
    Lo = [].slice,
    Do =
      !!Oo &&
      d(function () {
        Po.call(new Oo(1));
      });
  Ao(
    'toLocaleString',
    function () {
      return Po.apply(Do ? Lo.call(wo(this)) : wo(this), arguments);
    },
    d(function () {
      return [1, 2].toLocaleString() != new Oo([1, 2]).toLocaleString();
    }) ||
      !d(function () {
        Oo.prototype.toLocaleString.call([1, 2]);
      })
  );
  var xo = tn.exportTypedArrayMethod,
    Mo = u.Uint8Array,
    Uo = (Mo && Mo.prototype) || {},
    No = [].toString,
    Vo = [].join;
  (d(function () {
    No.call({});
  }) &&
    (No = function () {
      return Vo.call(this);
    }),
    xo('toString', No, Uo.toString != No));
  var Fo = function () {
      var e = te(this),
        t = '';
      return (
        e.global && (t += 'g'),
        e.ignoreCase && (t += 'i'),
        e.multiline && (t += 'm'),
        e.dotAll && (t += 's'),
        e.unicode && (t += 'u'),
        e.sticky && (t += 'y'),
        t
      );
    },
    jo = function (e, t) {
      return RegExp(e, t);
    },
    Bo = {
      UNSUPPORTED_Y: d(function () {
        var e = jo('a', 'y');
        return ((e.lastIndex = 2), null != e.exec('abcd'));
      }),
      BROKEN_CARET: d(function () {
        var e = jo('^r', 'gy');
        return ((e.lastIndex = 2), null != e.exec('str'));
      }),
    },
    Wo = d(function () {
      var e = RegExp('.', 'string'.charAt(0));
      return !(e.dotAll && e.exec('\n') && 's' === e.flags);
    }),
    Ho = d(function () {
      var e = RegExp('(?<a>b)', 'string'.charAt(5));
      return 'b' !== e.exec('b').groups.a || 'bc' !== 'b'.replace(e, '$<a>c');
    }),
    Go = Ee.get,
    Jo = RegExp.prototype.exec,
    Ko = M('native-string-replace', String.prototype.replace),
    Yo = Jo,
    zo = (function () {
      var e = /a/,
        t = /b*/g;
      return (
        Jo.call(e, 'a'),
        Jo.call(t, 'a'),
        0 !== e.lastIndex || 0 !== t.lastIndex
      );
    })(),
    qo = Bo.UNSUPPORTED_Y || Bo.BROKEN_CARET,
    Xo = void 0 !== /()??/.exec('')[1];
  (zo || Xo || qo || Wo || Ho) &&
    (Yo = function (e) {
      var t,
        i,
        r,
        n,
        o,
        s,
        a,
        c = this,
        u = Go(c),
        d = Di(e),
        l = u.raw;
      if (l)
        return (
          (l.lastIndex = c.lastIndex),
          (t = Yo.call(l, d)),
          (c.lastIndex = l.lastIndex),
          t
        );
      var h = u.groups,
        p = qo && c.sticky,
        f = Fo.call(c),
        m = c.source,
        g = 0,
        v = d;
      if (
        (p &&
          (-1 === (f = f.replace('y', '')).indexOf('g') && (f += 'g'),
          (v = d.slice(c.lastIndex)),
          c.lastIndex > 0 &&
            (!c.multiline ||
              (c.multiline && '\n' !== d.charAt(c.lastIndex - 1))) &&
            ((m = '(?: ' + m + ')'), (v = ' ' + v), g++),
          (i = new RegExp('^(?:' + m + ')', f))),
        Xo && (i = new RegExp('^' + m + '$(?!\\s)', f)),
        zo && (r = c.lastIndex),
        (n = Jo.call(p ? i : c, v)),
        p
          ? n
            ? ((n.input = n.input.slice(g)),
              (n[0] = n[0].slice(g)),
              (n.index = c.lastIndex),
              (c.lastIndex += n[0].length))
            : (c.lastIndex = 0)
          : zo && n && (c.lastIndex = c.global ? n.index + n[0].length : r),
        Xo &&
          n &&
          n.length > 1 &&
          Ko.call(n[0], i, function () {
            for (o = 1; o < arguments.length - 2; o++)
              void 0 === arguments[o] && (n[o] = void 0);
          }),
        n && h)
      )
        for (n.groups = s = Tt(null), o = 0; o < h.length; o++)
          s[(a = h[o])[0]] = n[a[1]];
      return n;
    });
  var Qo = Yo;
  qe({ target: 'RegExp', proto: !0, forced: /./.exec !== Qo }, { exec: Qo });
  K('species');
  var $o = RegExp.prototype,
    Zo = Mi.charAt,
    es = function (e, t, i) {
      return t + (i ? Zo(e, t).length : 1);
    },
    ts = Math.floor,
    is = ''.replace,
    rs = /\$([$&'`]|\d{1,2}|<[^>]*>)/g,
    ns = /\$([$&'`]|\d{1,2})/g,
    os = function (e, t, i, r, n, o) {
      var s = i + e.length,
        a = r.length,
        c = ns;
      return (
        void 0 !== n && ((n = U(n)), (c = rs)),
        is.call(o, c, function (o, c) {
          var u;
          switch (c.charAt(0)) {
            case '$':
              return '$';
            case '&':
              return e;
            case '`':
              return t.slice(0, i);
            case "'":
              return t.slice(s);
            case '<':
              u = n[c.slice(1, -1)];
              break;
            default:
              var d = +c;
              if (0 === d) return o;
              if (d > a) {
                var l = ts(d / 10);
                return 0 === l
                  ? o
                  : l <= a
                    ? void 0 === r[l - 1]
                      ? c.charAt(1)
                      : r[l - 1] + c.charAt(1)
                    : o;
              }
              u = r[d - 1];
          }
          return void 0 === u ? '' : u;
        })
      );
    },
    ss = function (e, t) {
      var i = e.exec;
      if ('function' == typeof i) {
        var r = i.call(e, t);
        if ('object' != G(r))
          throw TypeError(
            'RegExp exec method returned something other than an Object or null'
          );
        return r;
      }
      if ('RegExp' !== v(e))
        throw TypeError('RegExp#exec called on incompatible receiver');
      return Qo.call(e, t);
    },
    as = K('replace'),
    cs = Math.max,
    us = Math.min,
    ds = '$0' === 'a'.replace(/./, '$0'),
    ls = !!/./[as] && '' === /./[as]('a', '$0');
  !(function (e, t, i, r) {
    var n = K(e),
      o = !d(function () {
        var t = {};
        return (
          (t[n] = function () {
            return 7;
          }),
          7 != ''[e](t)
        );
      }),
      s =
        o &&
        !d(function () {
          var e = !1,
            t = /a/;
          return (
            (t.exec = function () {
              return ((e = !0), null);
            }),
            t[n](''),
            !e
          );
        });
    if (!o || !s || i) {
      var a = /./[n],
        c = (function (e, t, i) {
          var r = ls ? '$' : '$0';
          return [
            function (e, i) {
              var r = y(this),
                n = null == e ? void 0 : e[as];
              return void 0 !== n ? n.call(e, r, i) : t.call(Di(r), e, i);
            },
            function (e, n) {
              var o = te(this),
                s = Di(e);
              if (
                'string' == typeof n &&
                -1 === n.indexOf(r) &&
                -1 === n.indexOf('$<')
              ) {
                var a = i(t, o, s, n);
                if (a.done) return a.value;
              }
              var c = 'function' == typeof n;
              c || (n = Di(n));
              var u = o.global;
              if (u) {
                var d = o.unicode;
                o.lastIndex = 0;
              }
              for (var l = []; ; ) {
                var h = ss(o, s);
                if (null === h) break;
                if ((l.push(h), !u)) break;
                '' === Di(h[0]) && (o.lastIndex = es(s, ke(o.lastIndex), d));
              }
              for (var p, f = '', m = 0, g = 0; g < l.length; g++) {
                for (
                  var v = Di((h = l[g])[0]),
                    b = cs(us(Re(h.index), s.length), 0),
                    S = [],
                    y = 1;
                  y < h.length;
                  y++
                )
                  S.push(void 0 === (p = h[y]) ? p : String(p));
                var E = h.groups;
                if (c) {
                  var C = [v].concat(S, b, s);
                  void 0 !== E && C.push(E);
                  var I = Di(n.apply(void 0, C));
                } else I = os(v, s, b, S, E, n);
                b >= m && ((f += s.slice(m, b) + I), (m = b + v.length));
              }
              return f + s.slice(m);
            },
          ];
        })(0, ''[e], function (e, t, i, r, n) {
          var s = t.exec;
          return s === Qo || s === $o.exec
            ? o && !n
              ? { done: !0, value: a.call(t, i, r) }
              : { done: !0, value: e.call(i, t, r) }
            : { done: !1 };
        });
      (Ce(String.prototype, e, c[0]), Ce($o, n, c[1]));
    }
  })(
    'replace',
    0,
    !!d(function () {
      var e = /./;
      return (
        (e.exec = function () {
          var e = [];
          return ((e.groups = { a: '7' }), e);
        }),
        '7' !== ''.replace(e, '$<a>')
      );
    }) ||
      !ds ||
      ls
  );
  var hs = RegExp.prototype,
    ps = hs.toString,
    fs = d(function () {
      return '/a/b' != ps.call({ source: 'a', flags: 'b' });
    }),
    ms = 'toString' != ps.name;
  (fs || ms) &&
    Ce(
      RegExp.prototype,
      'toString',
      function () {
        var e = te(this),
          t = Di(e.source),
          i = e.flags;
        return (
          '/' +
          t +
          '/' +
          Di(
            void 0 === i && e instanceof RegExp && !('flags' in hs)
              ? Fo.call(e)
              : i
          )
        );
      },
      { unsafe: !0 }
    );
  var gs = K('match'),
    vs = re.f,
    bs = Ne.f,
    Ss = Ee.enforce,
    ys = K('match'),
    Es = u.RegExp,
    Cs = Es.prototype,
    Is = /^\?<[^\s\d!#%&*+<=>@^][^\s!#%&*+<=>@^]*>/,
    Ts = /a/g,
    Rs = /a/g,
    _s = new Es(Ts) !== Ts,
    ks = Bo.UNSUPPORTED_Y,
    Os =
      l &&
      (!_s ||
        ks ||
        Wo ||
        Ho ||
        d(function () {
          return (
            (Rs[ys] = !1),
            Es(Ts) != Ts || Es(Rs) == Rs || '/a/i' != Es(Ts, 'i')
          );
        }));
  if (Ye('RegExp', Os)) {
    for (
      var ws = function e(t, i) {
          var r,
            n,
            o,
            s,
            a,
            c,
            u,
            d,
            l = this instanceof e,
            h = C((r = t)) && (void 0 !== (n = r[gs]) ? !!n : 'RegExp' == v(r)),
            p = void 0 === i,
            f = [],
            m = t;
          if (!l && h && p && t.constructor === e) return t;
          if (
            ((h || t instanceof e) &&
              ((t = t.source),
              p && (i = ('flags' in m) ? m.flags : Fo.call(m))),
            (t = void 0 === t ? '' : Di(t)),
            (i = void 0 === i ? '' : Di(i)),
            (m = t),
            Wo &&
              ('dotAll' in Ts) &&
              (s = !!i && i.indexOf('s') > -1) &&
              (i = i.replace(/s/g, '')),
            (o = i),
            ks &&
              ('sticky' in Ts) &&
              (a = !!i && i.indexOf('y') > -1) &&
              (i = i.replace(/y/g, '')),
            Ho &&
              ((t = (c = (function (e) {
                for (
                  var t,
                    i = e.length,
                    r = 0,
                    n = '',
                    o = [],
                    s = {},
                    a = !1,
                    c = !1,
                    u = 0,
                    d = '';
                  r <= i;
                  r++
                ) {
                  if ('\\' === (t = e.charAt(r))) t += e.charAt(++r);
                  else if (']' === t) a = !1;
                  else if (!a)
                    switch (!0) {
                      case '[' === t:
                        a = !0;
                        break;
                      case '(' === t:
                        (Is.test(e.slice(r + 1)) && ((r += 2), (c = !0)),
                          (n += t),
                          u++);
                        continue;
                      case '>' === t && c:
                        if ('' === d || V(s, d))
                          throw new SyntaxError('Invalid capture group name');
                        ((s[d] = !0), o.push([d, u]), (c = !1), (d = ''));
                        continue;
                    }
                  c ? (d += t) : (n += t);
                }
                return [n, o];
              })(t))[0]),
              (f = c[1])),
            (u = Ti(Es(t, i), l ? this : Cs, e)),
            (s || a || f.length) &&
              ((d = Ss(u)),
              s &&
                ((d.dotAll = !0),
                (d.raw = e(
                  (function (e) {
                    for (
                      var t, i = e.length, r = 0, n = '', o = !1;
                      r <= i;
                      r++
                    )
                      '\\' !== (t = e.charAt(r))
                        ? o || '.' !== t
                          ? ('[' === t ? (o = !0) : ']' === t && (o = !1),
                            (n += t))
                          : (n += '[\\s\\S]')
                        : (n += t + e.charAt(++r));
                    return n;
                  })(t),
                  o
                ))),
              a && (d.sticky = !0),
              f.length && (d.groups = f)),
            t !== m)
          )
            try {
              ne(u, 'source', '' === m ? '(?:)' : m);
            } catch (e) {}
          return u;
        },
        As = function (e) {
          (e in ws) ||
            vs(ws, e, {
              configurable: !0,
              get: function () {
                return Es[e];
              },
              set: function (t) {
                Es[e] = t;
              },
            });
        },
        Ps = bs(Es),
        Ls = 0;
      Ps.length > Ls;

    )
      As(Ps[Ls++]);
    ((Cs.constructor = ws), (ws.prototype = Cs), Ce(u, 'RegExp', ws));
  }
  ki('RegExp');
  var Ds = [].join,
    xs = S != Object,
    Ms = Hn('join', ',');
  function Us(e, t, i) {
    var r = function (e, t, i) {
        var r = new RegExp('\\b'.concat(t, ' \\w+ (\\w+)'), 'ig');
        e.replace(r, function (e, t) {
          return ((i[t] = 0), e);
        });
      },
      n = function (e, t, i) {
        var r = e.createShader(i);
        return (
          e.shaderSource(r, t),
          e.compileShader(r),
          e.getShaderParameter(r, e.COMPILE_STATUS) ? r : null
        );
      };
    ((this.uniform = {}), (this.attribute = {}));
    var o = n(e, t, e.VERTEX_SHADER),
      s = n(e, i, e.FRAGMENT_SHADER);
    for (var a in ((this.id = e.createProgram()),
    e.attachShader(this.id, o),
    e.attachShader(this.id, s),
    e.linkProgram(this.id),
    e.getProgramParameter(this.id, e.LINK_STATUS),
    e.useProgram(this.id),
    r(t, 'attribute', this.attribute),
    this.attribute))
      this.attribute[a] = e.getAttribLocation(this.id, a);
    for (var c in (r(t, 'uniform', this.uniform),
    r(i, 'uniform', this.uniform),
    this.uniform))
      this.uniform[c] = e.getUniformLocation(this.id, c);
  }
  qe(
    { target: 'Array', proto: !0, forced: xs || !Ms },
    {
      join: function (e) {
        return Ds.call(E(this), void 0 === e ? ',' : e);
      },
    }
  );
  var Ns = (function () {
      function e(i) {
        (t(this, e),
          (this.canvas = i.canvas),
          (this.width = i.width || 640),
          (this.height = i.height || 480),
          (this.gl = this.createGL(i.canvas)),
          (this.sourceTexture = this.gl.createTexture()),
          (this.vertexBuffer = null),
          (this.currentProgram = null),
          (this.applied = !1),
          (this.beautyParams = { beauty: 0.5, brightness: 0.5, ruddy: 0.5 }));
      }
      return (
        r(e, [
          {
            key: 'setRect',
            value: function (e, t) {
              ((this.width = e), (this.height = t));
            },
          },
          {
            key: 'apply',
            value: function (e) {
              if (!this.vertexBuffer) {
                var t = new Float32Array([
                  -1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0, -1, 1, 0, 0, 1, -1, 1,
                  1, 1, 1, 1, 0,
                ]);
                ((this.vertexBuffer = this.gl.createBuffer()),
                  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer),
                  this.gl.bufferData(
                    this.gl.ARRAY_BUFFER,
                    t,
                    this.gl.STATIC_DRAW
                  ),
                  this.gl.pixelStorei(
                    this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
                    !0
                  ));
              }
              (this.gl.viewport(0, 0, this.width, this.height),
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.sourceTexture),
                this.gl.texParameteri(
                  this.gl.TEXTURE_2D,
                  this.gl.TEXTURE_WRAP_S,
                  this.gl.CLAMP_TO_EDGE
                ),
                this.gl.texParameteri(
                  this.gl.TEXTURE_2D,
                  this.gl.TEXTURE_WRAP_T,
                  this.gl.CLAMP_TO_EDGE
                ),
                this.gl.texParameteri(
                  this.gl.TEXTURE_2D,
                  this.gl.TEXTURE_MIN_FILTER,
                  this.gl.NEAREST
                ),
                this.gl.texParameteri(
                  this.gl.TEXTURE_2D,
                  this.gl.TEXTURE_MAG_FILTER,
                  this.gl.NEAREST
                ),
                this.applied
                  ? this.gl.texSubImage2D(
                      this.gl.TEXTURE_2D,
                      0,
                      0,
                      0,
                      this.gl.RGB,
                      this.gl.UNSIGNED_BYTE,
                      e
                    )
                  : (this.gl.texImage2D(
                      this.gl.TEXTURE_2D,
                      0,
                      this.gl.RGB,
                      this.gl.RGB,
                      this.gl.UNSIGNED_BYTE,
                      e
                    ),
                    (this.applied = !0)),
                this.beauty());
            },
          },
          {
            key: 'beauty',
            value: function () {
              var e = this.beautyParams,
                t = e.beauty,
                i = e.brightness,
                r = e.ruddy,
                n = 2 / this.width,
                o = 2 / this.height,
                s = this.compileBeautyShader();
              this.gl.uniform2f(s.uniform.singleStepOffset, n, o);
              var a = new Float32Array([
                1 - 0.8 * t,
                1 - 0.6 * t,
                0.1 + 0.45 * r,
                0.1 + 0.45 * r,
              ]);
              (this.gl.uniform4fv(s.uniform.params, a),
                this.gl.uniform1f(s.uniform.brightness, 0.12 * i),
                this.draw());
            },
          },
          {
            key: 'draw',
            value: function () {
              (this.gl.bindTexture(this.gl.TEXTURE_2D, this.sourceTexture),
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null),
                this.gl.uniform1f(this.currentProgram.uniform.flipY, 1),
                this.gl.drawArrays(this.gl.TRIANGLES, 0, 6));
            },
          },
          {
            key: 'compileBeautyShader',
            value: function () {
              if (this.currentProgram) return this.currentProgram;
              this.currentProgram = new Us(
                this.gl,
                [
                  'precision highp float;',
                  'attribute vec2 pos;',
                  'attribute vec2 uv;',
                  'varying vec2 vUv;',
                  'uniform float flipY;',
                  'void main(void) {',
                  'vUv = uv;',
                  'gl_Position = vec4(pos.x, pos.y*flipY, 0.0, 1.);',
                  '}',
                ].join('\n'),
                [
                  'precision highp float;',
                  'uniform vec2 singleStepOffset;',
                  'uniform sampler2D texture;',
                  'uniform vec4 params;',
                  'uniform float brightness;',
                  'varying vec2 vUv;',
                  'const highp vec3 W = vec3(0.299,0.587,0.114);',
                  'const mat3 saturateMatrix = mat3(1.1102,-0.0598,-0.061,-0.0774,1.0826,-0.1186,-0.0228,-0.0228,1.1772);',
                  'vec2 blurCoordinates[24];',
                  'float hardLight(float color){',
                  'if(color <= 0.5){',
                  'color = color * color * 2.0;',
                  '} else {',
                  'color = 1.0 - ((1.0 - color)*(1.0 - color) * 2.0);',
                  '}',
                  'return color;',
                  '}',
                  'void main(){',
                  'vec3 centralColor = texture2D(texture, vUv).rgb;',
                  'blurCoordinates[0] = vUv.xy + singleStepOffset * vec2(0.0, -10.0);',
                  'blurCoordinates[1] = vUv.xy + singleStepOffset * vec2(0.0, 10.0);',
                  'blurCoordinates[2] = vUv.xy + singleStepOffset * vec2(-10.0, 0.0);',
                  'blurCoordinates[3] = vUv.xy + singleStepOffset * vec2(10.0, 0.0);',
                  'blurCoordinates[4] = vUv.xy + singleStepOffset * vec2(5.0, -8.0);',
                  'blurCoordinates[5] = vUv.xy + singleStepOffset * vec2(5.0, 8.0);',
                  'blurCoordinates[6] = vUv.xy + singleStepOffset * vec2(-5.0, 8.0);',
                  'blurCoordinates[7] = vUv.xy + singleStepOffset * vec2(-5.0, -8.0);',
                  'blurCoordinates[8] = vUv.xy + singleStepOffset * vec2(8.0, -5.0);',
                  'blurCoordinates[9] = vUv.xy + singleStepOffset * vec2(8.0, 5.0);',
                  'blurCoordinates[10] = vUv.xy + singleStepOffset * vec2(-8.0, 5.0);',
                  'blurCoordinates[11] = vUv.xy + singleStepOffset * vec2(-8.0, -5.0);',
                  'blurCoordinates[12] = vUv.xy + singleStepOffset * vec2(0.0, -6.0);',
                  'blurCoordinates[13] = vUv.xy + singleStepOffset * vec2(0.0, 6.0);',
                  'blurCoordinates[14] = vUv.xy + singleStepOffset * vec2(6.0, 0.0);',
                  'blurCoordinates[15] = vUv.xy + singleStepOffset * vec2(-6.0, 0.0);',
                  'blurCoordinates[16] = vUv.xy + singleStepOffset * vec2(-4.0, -4.0);',
                  'blurCoordinates[17] = vUv.xy + singleStepOffset * vec2(-4.0, 4.0);',
                  'blurCoordinates[18] = vUv.xy + singleStepOffset * vec2(4.0, -4.0);',
                  'blurCoordinates[19] = vUv.xy + singleStepOffset * vec2(4.0, 4.0);',
                  'blurCoordinates[20] = vUv.xy + singleStepOffset * vec2(-2.0, -2.0);',
                  'blurCoordinates[21] = vUv.xy + singleStepOffset * vec2(-2.0, 2.0);',
                  'blurCoordinates[22] = vUv.xy + singleStepOffset * vec2(2.0, -2.0);',
                  'blurCoordinates[23] = vUv.xy + singleStepOffset * vec2(2.0, 2.0);',
                  'float sampleColor = centralColor.g * 22.0;',
                  'sampleColor += texture2D(texture, blurCoordinates[0]).g;',
                  'sampleColor += texture2D(texture, blurCoordinates[1]).g;',
                  'sampleColor += texture2D(texture, blurCoordinates[2]).g;',
                  'sampleColor += texture2D(texture, blurCoordinates[3]).g;',
                  'sampleColor += texture2D(texture, blurCoordinates[4]).g;',
                  'sampleColor += texture2D(texture, blurCoordinates[5]).g;',
                  'sampleColor += texture2D(texture, blurCoordinates[6]).g;',
                  'sampleColor += texture2D(texture, blurCoordinates[7]).g;',
                  'sampleColor += texture2D(texture, blurCoordinates[8]).g;',
                  'sampleColor += texture2D(texture, blurCoordinates[9]).g;',
                  'sampleColor += texture2D(texture, blurCoordinates[10]).g;',
                  'sampleColor += texture2D(texture, blurCoordinates[11]).g;',
                  'sampleColor += texture2D(texture, blurCoordinates[12]).g * 2.0;',
                  'sampleColor += texture2D(texture, blurCoordinates[13]).g * 2.0;',
                  'sampleColor += texture2D(texture, blurCoordinates[14]).g * 2.0;',
                  'sampleColor += texture2D(texture, blurCoordinates[15]).g * 2.0;',
                  'sampleColor += texture2D(texture, blurCoordinates[16]).g * 2.0;',
                  'sampleColor += texture2D(texture, blurCoordinates[17]).g * 2.0;',
                  'sampleColor += texture2D(texture, blurCoordinates[18]).g * 2.0;',
                  'sampleColor += texture2D(texture, blurCoordinates[19]).g * 2.0;',
                  'sampleColor += texture2D(texture, blurCoordinates[20]).g * 3.0;',
                  'sampleColor += texture2D(texture, blurCoordinates[21]).g * 3.0;',
                  'sampleColor += texture2D(texture, blurCoordinates[22]).g * 3.0;',
                  'sampleColor += texture2D(texture, blurCoordinates[23]).g * 3.0;',
                  'sampleColor = sampleColor / 62.0;',
                  'float highPass = centralColor.g - sampleColor + 0.5;',
                  'for(int i = 0; i < 5;i++){',
                  'highPass = hardLight(highPass);',
                  '}',
                  'float luminance = dot(centralColor, W);',
                  'float alpha = pow(luminance, params.r);',
                  'vec3 smoothColor = centralColor + (centralColor-vec3(highPass))*alpha*0.1;',
                  'smoothColor.r = clamp(pow(smoothColor.r, params.g),0.0,1.0);',
                  'smoothColor.g = clamp(pow(smoothColor.g, params.g),0.0,1.0);',
                  'smoothColor.b = clamp(pow(smoothColor.b, params.g),0.0,1.0);',
                  'vec3 screen = vec3(1.0) - (vec3(1.0)-smoothColor) * (vec3(1.0)-centralColor);',
                  'vec3 lighten = max(smoothColor, centralColor);',
                  'vec3 softLight = 2.0 * centralColor*smoothColor + centralColor*centralColor - 2.0 * centralColor*centralColor * smoothColor;',
                  'gl_FragColor = vec4(mix(centralColor, screen, alpha), 1.0);',
                  'gl_FragColor.rgb = mix(gl_FragColor.rgb, lighten, alpha);',
                  'gl_FragColor.rgb = mix(gl_FragColor.rgb, softLight, params.b);',
                  'vec3 satColor = gl_FragColor.rgb * saturateMatrix;',
                  'gl_FragColor.rgb = mix(gl_FragColor.rgb, satColor, params.a);',
                  'gl_FragColor.rgb = vec3(gl_FragColor.rgb + vec3(brightness));',
                  '}',
                ].join('\n')
              );
              var e = Float32Array.BYTES_PER_ELEMENT,
                t = 4 * e;
              return (
                this.gl.enableVertexAttribArray(
                  this.currentProgram.attribute.pos
                ),
                this.gl.vertexAttribPointer(
                  this.currentProgram.attribute.pos,
                  2,
                  this.gl.FLOAT,
                  !1,
                  t,
                  0
                ),
                this.gl.enableVertexAttribArray(
                  this.currentProgram.attribute.uv
                ),
                this.gl.vertexAttribPointer(
                  this.currentProgram.attribute.uv,
                  2,
                  this.gl.FLOAT,
                  !1,
                  t,
                  2 * e
                ),
                this.currentProgram
              );
            },
          },
          {
            key: 'createGL',
            value: function (e) {
              var t = e.getContext('webgl');
              if (
                (t ||
                  e.getContext('experimental-webgl', {
                    preserveDrawingBuffer: !0,
                  }),
                !t)
              )
                throw "Couldn't get WebGL context";
              return t;
            },
          },
          {
            key: 'setBeautyParams',
            value: function (e) {
              this.beautyParams = e;
            },
          },
          {
            key: 'reset',
            value: function () {
              this.applied = !1;
            },
          },
        ]),
        e
      );
    })(),
    Vs = function (e) {
      return 'number' == typeof e;
    },
    Fs = (function () {
      function i() {
        (t(this, i),
          (this.video = document.createElement('video')),
          (this.video.loop = !0),
          (this.video.autoplay = !0),
          (this.canvas = document.createElement('canvas')),
          (this.filter = new Ns({ canvas: this.canvas })),
          (this.beautyParams = { beauty: 0.5, brightness: 0.5, ruddy: 0.5 }),
          (this.timeoutId = null),
          (this.rafId = null),
          (this.startTime = null),
          (this.originTrack = null),
          (this.beautyTrack = null),
          (this.localStream = null),
          (this.frameRate = null),
          (this.disableStatus = !1));
      }
      return (
        r(i, [
          {
            key: 'generateBeautyStream',
            value: function (e) {
              var t = e.getVideoTrack();
              if (!t)
                throw new Error(
                  'Your localStream does not contain video track.'
                );
              var i = this.generateBeautyTrack(t);
              return (
                e.replaceTrack(i),
                (this.localStream = e),
                e.setBeautyStatus && e.setBeautyStatus(!0),
                e
              );
            },
          },
          {
            key: 'generateBeautyTrack',
            value: function (e) {
              var t = this;
              this.reset();
              var i = e.getSettings();
              ((this.frameRate = i.frameRate),
                this.filter.setRect(i.width, i.height),
                this.setRect(i.width, i.height));
              var r = new MediaStream();
              (r.addTrack(e), (this.video.srcObject = r), this.video.play());
              var n = this.generateVideoTrackFromCanvasCapture(
                i.frameRate || 15
              );
              return (
                this.rafId && cancelAnimationFrame(this.rafId),
                (this.rafId = requestAnimationFrame(function () {
                  ((t.startTime = new Date().getTime()), t.render());
                })),
                this.installEvents(),
                this.setBeautyTrack({ originTrack: e, beautyTrack: n }),
                (this.originTrack = e),
                (this.beautyTrack = n),
                n
              );
            },
          },
          {
            key: 'draw',
            value: function () {
              this.video &&
                this.video.readyState === this.video.HAVE_ENOUGH_DATA &&
                this.filter.apply(this.video);
            },
          },
          {
            key: 'render',
            value: function () {
              var e = this,
                t = new Date().getTime();
              (t - this.startTime > 1e3 / this.frameRate &&
                (this.draw(), (this.startTime = t)),
                document.hidden
                  ? (clearTimeout(this.timeoutId),
                    (this.timeoutId = setTimeout(function () {
                      e.render();
                    }, 1e3 / this.frameRate)))
                  : (this.timeoutId && clearTimeout(this.timeoutId),
                    this.rafId && cancelAnimationFrame(this.rafId),
                    requestAnimationFrame(this.render.bind(this))));
            },
          },
          {
            key: 'setBeautyParam',
            value: function (e) {
              var t = e.beauty,
                i = e.brightness,
                r = e.ruddy;
              (Vs(t) && (this.beautyParams.beauty = t),
                Vs(i) && (this.beautyParams.brightness = i),
                Vs(r) && (this.beautyParams.ruddy = r),
                this.filter.setBeautyParams(this.beautyParams),
                this.getClose() && !this.disableStatus && this.disable(),
                !this.getClose() && this.disableStatus && this.enable());
            },
          },
          {
            key: 'setRect',
            value: function (e, t) {
              var i = e || 640,
                r = t || 480;
              ((this.video.height = r),
                (this.video.width = i),
                (this.canvas.height = r),
                (this.canvas.width = i));
            },
          },
          {
            key: 'reset',
            value: function () {
              (cancelAnimationFrame(this.rafId),
                clearTimeout(this.timeoutId),
                this.video.pause(),
                this.filter.reset(),
                this.beautyTrack && this.beautyTrack.stop(),
                this.originTrack && this.originTrack.stop());
            },
          },
          {
            key: 'destroy',
            value: function () {
              (cancelAnimationFrame(this.rafId),
                clearTimeout(this.timeoutId),
                this.canvas &&
                  ((this.canvas.width = 0),
                  (this.canvas.height = 0),
                  this.canvas.remove(),
                  delete this.canvas),
                this.video &&
                  (this.video.pause(),
                  this.video.removeAttribute('srcObject'),
                  this.video.removeAttribute('src'),
                  this.video.load(),
                  (this.video.width = 0),
                  (this.video.height = 0),
                  this.video.remove(),
                  delete this.video),
                this.beautyTrack && this.beautyTrack.stop(),
                this.originTrack && this.originTrack.stop(),
                this.uninstallEvents());
            },
          },
          {
            key: 'generateVideoTrackFromCanvasCapture',
            value: function (e) {
              return this.canvas.captureStream(e).getVideoTracks()[0];
            },
          },
          {
            key: 'setBeautyTrack',
            value: function (t) {
              var i = t.originTrack,
                r = t.beautyTrack;
              e &&
                (e.beautyTrackMap || (e.beautyTrackMap = new Map()),
                e.beautyTrackMap.set(r.id, {
                  originTrack: i,
                  beautyTrack: r,
                  param: this.beautyParams,
                  pluginInstance: this,
                }));
            },
          },
          {
            key: 'disable',
            value: function () {
              this.localStream &&
                this.originTrack &&
                (this.localStream.replaceTrack(this.originTrack),
                cancelAnimationFrame(this.rafId),
                clearTimeout(this.timeoutId),
                (this.disableStatus = !0));
            },
          },
          {
            key: 'enable',
            value: function () {
              this.localStream &&
                this.beautyTrack &&
                (this.localStream.replaceTrack(this.beautyTrack),
                this.render(),
                (this.disableStatus = !1));
            },
          },
          {
            key: 'installEvents',
            value: function () {
              document.addEventListener(
                'visibilitychange',
                this.render.bind(this)
              );
            },
          },
          {
            key: 'uninstallEvents',
            value: function () {
              document.removeEventListener(
                'visibilitychange',
                this.render.bind(this)
              );
            },
          },
          {
            key: 'getClose',
            value: function () {
              return (
                0 === this.beautyParams.beauty &&
                0 === this.beautyParams.brightness &&
                0 === this.beautyParams.ruddy
              );
            },
          },
        ]),
        i
      );
    })();
  return (
    e &&
      (e.getRTCBeautyPlugin = function () {
        return new Fs();
      }),
    Fs
  );
})(Mr.XRTC);
var Ur = RTCBeautyPlugin,
  Nr = (function () {
    function e(t) {
      (_(this, e),
        (this.logger = t),
        (this.beautyParams = { beauty: 0.5, brightness: 0.5, ruddy: 0.5 }),
        (this.isBeautyStreamSupported = Je()),
        this.isBeautyStreamSupported && (this.rtcBeautyPlugin = new Ur()));
    }
    return (
      O(e, [
        {
          key: 'generateBeautyStream',
          value: function (e) {
            return (
              this.logger.info(
                'generate beauty stream ,streamId '.concat(e.streamId)
              ),
              this.isBeautyStreamSupported
                ? this.rtcBeautyPlugin.generateBeautyStream(e)
                : e
            );
          },
        },
        {
          key: 'setBeautyParam',
          value: function (e) {
            var t, i;
            if (!this.isBeautyStreamSupported)
              return this.logger.warn(
                'The current browser does not support beauty'
              );
            var r =
              null === (t = this.rtcBeautyPlugin) ||
              void 0 === t ||
              null === (i = t.localStream) ||
              void 0 === i
                ? void 0
                : i.getVideoTrack();
            if (null == r || !r.enabled)
              return this.logger.warn(
                'cannot set beauty param when video track is muted'
              );
            var n,
              o = e.beauty,
              s = e.brightness,
              a = e.ruddy;
            return o >= 0 && o <= 1 && s >= 0 && s <= 1 && a >= 0 && a <= 1
              ? ((this.beautyParams = e),
                this.logger.info(
                  'set beauty param beauty:'
                    .concat(o, ',brightness:')
                    .concat(s, ',ruddy:')
                    .concat(a)
                ),
                o > 0.5 &&
                  (this.beautyParams.beauty = Number(
                    (0.6 * (o - 0.5) + 0.5).toFixed(2)
                  )),
                null === (n = this.rtcBeautyPlugin) || void 0 === n
                  ? void 0
                  : n.setBeautyParam(this.beautyParams))
              : void 0;
          },
        },
        {
          key: 'destroy',
          value: function () {
            var e = this,
              t = setTimeout(function () {
                (clearTimeout(t),
                  (e.rtcBeautyPlugin = null),
                  (e.logger = null),
                  (e.beautyParams = null));
              }, 100);
            return (
              this.logger.info('destroy beauty'),
              this.rtcBeautyPlugin && this.rtcBeautyPlugin.destroy()
            );
          },
        },
        {
          key: 'updateBeautyStream',
          value: function (e) {
            if (!this.isBeautyStreamSupported)
              return this.logger.warn(
                'The current browser does not support beauty'
              );
            (this.logger.info('update beauty stream'),
              this.rtcBeautyPlugin.reset());
            var t = e.getVideoTrack();
            ((t.enabled = !0),
              t &&
                (this.rtcBeautyPlugin.generateBeautyTrack(t),
                this.rtcBeautyPlugin.enable()));
          },
        },
      ]),
      e
    );
  })(),
  Vr = new Li();
(Vr.info('browserDetails.browser', xr.browserDetails), (window.Logger = Vr));
var Fr,
  jr,
  Br,
  Wr,
  Hr,
  Gr,
  Jr,
  Kr,
  Yr,
  zr,
  qr,
  Xr,
  Qr,
  $r,
  Zr,
  en,
  tn,
  rn = {
    VERSION: '5.2024.5.0_00',
    Logger: Vr,
    checkSystemRequirements: Fe,
    isScreenShareSupported: function () {
      return !(
        !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia
      );
    },
    isSmallStreamSupported: Ge,
    isBeautyStreamSupported: Je,
    getDevices: je,
    getCameras: Be,
    getMicrophones: We,
    getSpeakers: He,
    createClient: function (e) {
      return (
        Vr.info('create client with config', JSON.stringify(e)),
        new wi(e, Vr)
      );
    },
    createStream: function (e) {
      return (
        Vr.info('create stream with config', JSON.stringify(e)),
        new nt(e, Vr)
      );
    },
    createBeauty: function () {
      return (Vr.info('create beauty'), new Nr(Vr));
    },
  },
  nn = (function (S) {
    function y() {
      var e;
      return (
        t(this, y),
        (e = i(this, y)),
        Fr.set(r(e), !1),
        jr.set(r(e), !1),
        Br.set(r(e), 1),
        Wr.set(r(e), void 0),
        Hr.set(r(e), void 0),
        Gr.set(r(e), void 0),
        Jr.set(r(e), void 0),
        Kr.set(r(e), void 0),
        Yr.set(r(e), !1),
        zr.set(r(e), void 0),
        qr.set(r(e), void 0),
        Xr.set(r(e), void 0),
        Qr.set(r(e), !1),
        $r.set(r(e), function (t) {
          var i, u;
          n.record(
            o.debug,
            '[player state]',
            ''
              .concat(t.type, ' player is ')
              .concat(t.state, ' because of ')
              .concat(t.reason)
          );
          try {
            switch (t.state) {
              case 'PLAYING':
                'unmute' === t.reason && 'video' === t.type
                  ? e.emit(s.playing)
                  : 'playing' === t.reason &&
                    (a(r(e), Qr, 'f') || (c(r(e), Qr, !0, 'f'), e.emit(s.play)),
                    'audio' === t.type && e.emit(s.playing));
                break;
              case 'PAUSED':
                'mute' === t.reason && 'video' === t.type
                  ? e.emit(s.waiting)
                  : 'video' === t.type &&
                    (null ===
                      (u =
                        null === (i = a(r(e), Gr, 'f')) || void 0 === i
                          ? void 0
                          : i.resume()) ||
                      void 0 === u ||
                      u.catch(function (e) {
                        n.record(
                          o.warn,
                          '[player] failed',
                          null == e ? void 0 : e.message
                        );
                      }));
            }
          } catch (e) {
            n.record(o.verbose, '[player state listener]', e);
          }
        }),
        Zr.set(r(e), function () {
          e.emit(s.stop);
        }),
        en.set(r(e), function () {
          var t, i, s, c;
          (null === (t = a(r(e), Jr, 'f')) ||
            void 0 === t ||
            t.off('error', a(r(e), zr, 'f')),
            null === (i = a(r(e), Jr, 'f')) ||
              void 0 === i ||
              i.off('stream-added', a(r(e), qr, 'f')),
            null === (s = a(r(e), Jr, 'f')) ||
              void 0 === s ||
              s.off('stream-subscribed', a(r(e), Xr, 'f')),
            a(r(e), Yr, 'f') &&
              (null === (c = a(r(e), Jr, 'f')) ||
                void 0 === c ||
                c.leave().catch(function (e) {
                  n.record(o.verbose, '[leave room]', e);
                })),
            a(r(e), tn, 'f').call(r(e)),
            rn.Logger.disableUploadLog());
        }),
        tn.set(r(e), function () {
          var t, i, n;
          (null === (t = a(r(e), Gr, 'f')) || void 0 === t || t.stop(),
            a(r(e), Jr, 'f') &&
              a(r(e), Gr, 'f') &&
              (null === (n = (i = a(r(e), Jr, 'f')).unsubscribe) ||
                void 0 === n ||
                n.call(i, a(r(e), Gr, 'f'))));
        }),
        rn.Logger.setLogLevel(rn.Logger.LogLevel.WARN),
        e
      );
    }
    return (
      e(y, b),
      u(y, [
        {
          key: 'muted',
          get: function () {
            var e = a(this, jr, 'f');
            if (a(this, Gr, 'f'))
              try {
                e = a(this, Gr, 'f').getAudioMuted();
              } catch (e) {
                n.record(o.info, '[error]', e);
              }
            return e;
          },
          set: function (e) {
            var t;
            c(this, jr, e, 'f');
            try {
              a(this, Gr, 'f') &&
                (e
                  ? a(this, Gr, 'f').muteAudio()
                  : (null === (t = a(this, Gr, 'f').resume()) ||
                      void 0 === t ||
                      t.catch(function (e) {
                        n.record(
                          o.warn,
                          '[player] failed',
                          null == e ? void 0 : e.message
                        );
                      }),
                    a(this, Gr, 'f').unmuteAudio()));
            } catch (e) {
              n.record(o.info, '[error]', e);
            }
          },
        },
        {
          key: 'volume',
          get: function () {
            return a(this, Br, 'f');
          },
          set: function (e) {
            (e > 1 && (e = 1),
              c(this, Br, e, 'f'),
              a(this, Gr, 'f') && a(this, Gr, 'f').setAudioVolume(e));
          },
        },
        {
          key: 'stream',
          set: function (e) {
            c(this, Wr, e, 'f');
          },
        },
        {
          key: 'videoWrapper',
          set: function (e) {
            c(this, Hr, e, 'f');
          },
        },
        {
          key: 'play',
          value: function () {
            return d(
              this,
              void 0,
              void 0,
              l().mark(function e() {
                var t,
                  i,
                  r,
                  u,
                  g,
                  v,
                  b,
                  S,
                  y,
                  E,
                  C,
                  I,
                  T,
                  R,
                  _ = this;
                return l().wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          if (a(this, Wr, 'f')) {
                            e.next = 2;
                            break;
                          }
                          return e.abrupt(
                            'return',
                            Promise.reject(
                              new f(
                                h.EmptyStreamError.message,
                                h.EmptyStreamError.code,
                                m.MediaError
                              )
                            )
                          );
                        case 2:
                          return (
                            c(this, Qr, !1, 'f'),
                            (t = a(this, Wr, 'f')),
                            (i = t.server),
                            (r = t.auth),
                            (u = t.appid),
                            (g = t.userId),
                            (v = t.roomId),
                            (b = c(
                              this,
                              Jr,
                              rn.createClient({
                                wsUrl: i,
                                mode: 'live',
                                sdkAppId: u,
                                userId: g,
                                userSig: r,
                              }),
                              'f'
                            )),
                            (S = p()),
                            (y = S.promise),
                            (E = S.controller),
                            (C = !1),
                            (I = p()),
                            (T = I.promise),
                            (R = I.controller),
                            c(
                              this,
                              Xr,
                              function (e) {
                                var t,
                                  i,
                                  r = e.stream,
                                  n = null;
                                (r.on('player-state-changed', function (e) {
                                  return d(
                                    _,
                                    void 0,
                                    void 0,
                                    l().mark(function t() {
                                      var i = this;
                                      return l().wrap(
                                        function (t) {
                                          for (;;)
                                            switch ((t.prev = t.next)) {
                                              case 0:
                                                return (
                                                  C ||
                                                    'PLAYING' !== e.state ||
                                                    n ||
                                                    (n = setTimeout(
                                                      function () {
                                                        var e;
                                                        ((C = !0),
                                                          null ===
                                                            (e = E.resolve) ||
                                                            void 0 === e ||
                                                            e.call(E, 16451));
                                                      },
                                                      500
                                                    )),
                                                  (t.next = 3),
                                                  y
                                                );
                                              case 3:
                                                c(
                                                  this,
                                                  Kr,
                                                  setTimeout(function () {
                                                    a(i, $r, 'f').call(i, e);
                                                  }),
                                                  'f'
                                                );
                                              case 4:
                                              case 'end':
                                                return t.stop();
                                            }
                                        },
                                        t,
                                        this
                                      );
                                    })
                                  );
                                }),
                                  null == r ||
                                    r.on('error', function (e) {
                                      var t,
                                        i,
                                        r = null == e ? void 0 : e.getCode();
                                      16451 === r
                                        ? C
                                          ? (_.emit(
                                              s.playNotAllowed,
                                              h.PlayNotAllowed.code
                                            ),
                                            c(_, Fr, !0, 'f'),
                                            (_.muted = !0))
                                          : ((C = !0),
                                            null === (t = E.resolve) ||
                                              void 0 === t ||
                                              t.call(E, 16451))
                                        : (C ||
                                            ((C = !0),
                                            null === (i = E.reject) ||
                                              void 0 === i ||
                                              i.call(E, r)),
                                          _.emit(
                                            s.play,
                                            new f(
                                              h.Unknown.message +
                                                ' '.concat(
                                                  null == e
                                                    ? void 0
                                                    : e.getCode()
                                                ),
                                              h.Unknown.code,
                                              m.MediaError
                                            )
                                          ));
                                    }),
                                  null ===
                                    (i =
                                      null ===
                                        (t =
                                          null == r
                                            ? void 0
                                            : r
                                                .play(a(_, Hr, 'f'), {
                                                  isEleLisenter: !1,
                                                  objectFit: 'cover',
                                                })
                                                .then(function () {
                                                  (r.setAudioVolume(
                                                    a(_, Br, 'f')
                                                  ),
                                                    r.resize(),
                                                    a(_, jr, 'f')
                                                      ? r.muteAudio()
                                                      : r.unmuteAudio());
                                                })
                                                .then(function () {
                                                  var e;
                                                  ((C = !0),
                                                    null === (e = E.resolve) ||
                                                      void 0 === e ||
                                                      e.call(E, !0));
                                                })) || void 0 === t
                                        ? void 0
                                        : t.catch) ||
                                    void 0 === i ||
                                    i.call(t, function (e) {
                                      var t, i;
                                      ((C = !0),
                                        16451 === e.getCode()
                                          ? null === (t = E.resolve) ||
                                            void 0 === t ||
                                            t.call(E, 16451)
                                          : (a(_, en, 'f').call(_),
                                            null === (i = E.reject) ||
                                              void 0 === i ||
                                              i.call(E, e)));
                                    }));
                              },
                              'f'
                            ),
                            c(
                              this,
                              zr,
                              function (e) {
                                var t;
                                (n.record(o.error, '[error]', e.getCode()),
                                  257 === e.getCode() &&
                                    (null === (t = R.reject) ||
                                      void 0 === t ||
                                      t.call(
                                        R,
                                        new f(
                                          h.H264NotSupported.message,
                                          h.H264NotSupported.code,
                                          m.MediaError
                                        )
                                      ),
                                    _.emit(
                                      s.error,
                                      new f(
                                        h.H264NotSupported.message,
                                        h.H264NotSupported.code,
                                        m.MediaError
                                      )
                                    ),
                                    a(_, en, 'f').call(_)));
                              },
                              'f'
                            ),
                            b.on('stream-subscribed', a(this, Xr, 'f')),
                            b.on('error', a(this, zr, 'f')),
                            c(
                              this,
                              qr,
                              function (e) {
                                var t = c(_, Gr, e.stream, 'f');
                                (t.setPlayBackground('#00000000'),
                                  a(_, Jr, 'f')
                                    .subscribe(t, { audio: !0, video: !0 })
                                    .then(function () {
                                      var e;
                                      null === (e = R.resolve) ||
                                        void 0 === e ||
                                        e.call(R, void 0);
                                    })
                                    .catch(function (e) {
                                      var t;
                                      (a(_, en, 'f').call(_),
                                        null === (t = R.reject) ||
                                          void 0 === t ||
                                          t.call(R, e));
                                    }));
                              },
                              'f'
                            ),
                            b.on('stream-added', a(this, qr, 'f')),
                            rn.Logger.enableUploadLog(),
                            (e.prev = 15),
                            this.emit(s.waiting),
                            (e.next = 19),
                            b
                              .join({ roomId: v, role: 'audience' })
                              .then(function () {
                                c(_, Yr, !0, 'f');
                              })
                              .catch(function (e) {
                                return (
                                  a(_, en, 'f').call(_),
                                  Promise.reject(e)
                                );
                              })
                          );
                        case 19:
                          return ((e.next = 21), T);
                        case 21:
                          return ((e.next = 23), y);
                        case 23:
                          (16451 === e.sent &&
                            (this.emit(s.playNotAllowed, h.PlayNotAllowed.code),
                            c(this, Fr, !0, 'f'),
                            (this.muted = !0)),
                            (e.next = 32));
                          break;
                        case 27:
                          throw (
                            (e.prev = 27),
                            (e.t0 = e.catch(15)),
                            this.emit(s.stop),
                            clearTimeout(a(this, Kr, 'f')),
                            e.t0
                          );
                        case 32:
                        case 'end':
                          return e.stop();
                      }
                  },
                  e,
                  this,
                  [[15, 27]]
                );
              })
            );
          },
        },
        {
          key: 'resume',
          value: function () {
            return d(
              this,
              void 0,
              void 0,
              l().mark(function e() {
                var t;
                return l().wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          if (!a(this, Gr, 'f')) {
                            e.next = 3;
                            break;
                          }
                          return (
                            a(this, Fr, 'f') &&
                              ((this.muted = !1), c(this, Fr, !1, 'f')),
                            e.abrupt(
                              'return',
                              null === (t = a(this, Gr, 'f').resume()) ||
                                void 0 === t
                                ? void 0
                                : t.catch(function (e) {
                                    n.record(
                                      o.warn,
                                      '[player] failed',
                                      null == e ? void 0 : e.message
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
            (clearTimeout(a(this, Kr, 'f')),
              a(this, Zr, 'f').call(this),
              a(this, en, 'f').call(this),
              c(this, Yr, !1, 'f'),
              c(this, jr, !1, 'f'),
              c(this, Qr, !1, 'f'),
              c(this, Fr, !1, 'f'));
          },
        },
        {
          key: 'setSinkId',
          value: function (e) {
            return d(
              this,
              void 0,
              void 0,
              l().mark(function t() {
                var i;
                return l().wrap(
                  function (t) {
                    for (;;)
                      switch ((t.prev = t.next)) {
                        case 0:
                          return (
                            (t.next = 2),
                            null === (i = a(this, Gr, 'f')) || void 0 === i
                              ? void 0
                              : i.setAudioOutput(e)
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
            return d(
              this,
              void 0,
              void 0,
              l().mark(function e() {
                var t, i, r;
                return l().wrap(
                  function (e) {
                    for (;;)
                      switch ((e.prev = e.next)) {
                        case 0:
                          return (
                            (e.next = 2),
                            null === (t = a(this, Gr, 'f')) || void 0 === t
                              ? void 0
                              : t.getInuseSpeaker()
                          );
                        case 2:
                          return (
                            (r = e.sent),
                            e.abrupt(
                              'return',
                              (null === (i = null == r ? void 0 : r.speaker) ||
                              void 0 === i
                                ? void 0
                                : i.deviceId) || ''
                            )
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
          key: 'destroy',
          value: function () {
            (this.stop(), g(v(y.prototype), 'destroy', this).call(this));
          },
        },
        {
          key: 'resize',
          value: function () {
            a(this, Gr, 'f') && a(this, Gr, 'f').resize();
          },
        },
      ]),
      y
    );
  })();
((Fr = new WeakMap()),
  (jr = new WeakMap()),
  (Br = new WeakMap()),
  (Wr = new WeakMap()),
  (Hr = new WeakMap()),
  (Gr = new WeakMap()),
  (Jr = new WeakMap()),
  (Kr = new WeakMap()),
  (Yr = new WeakMap()),
  (zr = new WeakMap()),
  (qr = new WeakMap()),
  (Xr = new WeakMap()),
  (Qr = new WeakMap()),
  ($r = new WeakMap()),
  (Zr = new WeakMap()),
  (en = new WeakMap()),
  (tn = new WeakMap()));
export { nn as XRTCPlayer };
