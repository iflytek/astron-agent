function e(e, r, n) {
  return (
    (r = u(r)),
    (function (e, t) {
      if (t && ('object' == typeof t || 'function' == typeof t)) return t;
      if (void 0 !== t)
        throw new TypeError(
          'Derived constructors may only return object or undefined'
        );
      return d(e);
    })(e, t() ? Reflect.construct(r, n || [], u(e).constructor) : r.apply(e, n))
  );
}
function t() {
  try {
    var e = !Boolean.prototype.valueOf.call(
      Reflect.construct(Boolean, [], function () {})
    );
  } catch (e) {}
  return (t = function () {
    return !!e;
  })();
}
function r() {
  r = function () {
    return t;
  };
  var e,
    t = {},
    n = Object.prototype,
    i = n.hasOwnProperty,
    o =
      Object.defineProperty ||
      function (e, t, r) {
        e[t] = r.value;
      },
    a = 'function' == typeof Symbol ? Symbol : {},
    s = a.iterator || '@@iterator',
    c = a.asyncIterator || '@@asyncIterator',
    u = a.toStringTag || '@@toStringTag';
  function l(e, t, r) {
    return (
      Object.defineProperty(e, t, {
        value: r,
        enumerable: !0,
        configurable: !0,
        writable: !0,
      }),
      e[t]
    );
  }
  try {
    l({}, '');
  } catch (e) {
    l = function (e, t, r) {
      return (e[t] = r);
    };
  }
  function f(e, t, r, n) {
    var i = t && t.prototype instanceof g ? t : g,
      a = Object.create(i.prototype),
      s = new W(n || []);
    return (o(a, '_invoke', { value: S(e, r, s) }), a);
  }
  function d(e, t, r) {
    try {
      return { type: 'normal', arg: e.call(t, r) };
    } catch (e) {
      return { type: 'throw', arg: e };
    }
  }
  t.wrap = f;
  var v = 'suspendedStart',
    h = 'suspendedYield',
    p = 'executing',
    y = 'completed',
    m = {};
  function g() {}
  function w() {}
  function b() {}
  var _ = {};
  l(_, s, function () {
    return this;
  });
  var x = Object.getPrototypeOf,
    k = x && x(x(T([])));
  k && k !== n && i.call(k, s) && (_ = k);
  var j = (b.prototype = g.prototype = Object.create(_));
  function O(e) {
    ['next', 'throw', 'return'].forEach(function (t) {
      l(e, t, function (e) {
        return this._invoke(t, e);
      });
    });
  }
  function M(e, t) {
    function r(n, o, a, s) {
      var c = d(e[n], e, o);
      if ('throw' !== c.type) {
        var u = c.arg,
          l = u.value;
        return l && 'object' == typeof l && i.call(l, '__await')
          ? t.resolve(l.__await).then(
              function (e) {
                r('next', e, a, s);
              },
              function (e) {
                r('throw', e, a, s);
              }
            )
          : t.resolve(l).then(
              function (e) {
                ((u.value = e), a(u));
              },
              function (e) {
                return r('throw', e, a, s);
              }
            );
      }
      s(c.arg);
    }
    var n;
    o(this, '_invoke', {
      value: function (e, i) {
        function o() {
          return new t(function (t, n) {
            r(e, i, t, n);
          });
        }
        return (n = n ? n.then(o, o) : o());
      },
    });
  }
  function S(t, r, n) {
    var i = v;
    return function (o, a) {
      if (i === p) throw new Error('Generator is already running');
      if (i === y) {
        if ('throw' === o) throw a;
        return { value: e, done: !0 };
      }
      for (n.method = o, n.arg = a; ; ) {
        var s = n.delegate;
        if (s) {
          var c = E(s, n);
          if (c) {
            if (c === m) continue;
            return c;
          }
        }
        if ('next' === n.method) n.sent = n._sent = n.arg;
        else if ('throw' === n.method) {
          if (i === v) throw ((i = y), n.arg);
          n.dispatchException(n.arg);
        } else 'return' === n.method && n.abrupt('return', n.arg);
        i = p;
        var u = d(t, r, n);
        if ('normal' === u.type) {
          if (((i = n.done ? y : h), u.arg === m)) continue;
          return { value: u.arg, done: n.done };
        }
        'throw' === u.type && ((i = y), (n.method = 'throw'), (n.arg = u.arg));
      }
    };
  }
  function E(t, r) {
    var n = r.method,
      i = t.iterator[n];
    if (i === e)
      return (
        (r.delegate = null),
        ('throw' === n &&
          t.iterator.return &&
          ((r.method = 'return'),
          (r.arg = e),
          E(t, r),
          'throw' === r.method)) ||
          ('return' !== n &&
            ((r.method = 'throw'),
            (r.arg = new TypeError(
              "The iterator does not provide a '" + n + "' method"
            )))),
        m
      );
    var o = d(i, t.iterator, r.arg);
    if ('throw' === o.type)
      return ((r.method = 'throw'), (r.arg = o.arg), (r.delegate = null), m);
    var a = o.arg;
    return a
      ? a.done
        ? ((r[t.resultName] = a.value),
          (r.next = t.nextLoc),
          'return' !== r.method && ((r.method = 'next'), (r.arg = e)),
          (r.delegate = null),
          m)
        : a
      : ((r.method = 'throw'),
        (r.arg = new TypeError('iterator result is not an object')),
        (r.delegate = null),
        m);
  }
  function A(e) {
    var t = { tryLoc: e[0] };
    (1 in e && (t.catchLoc = e[1]),
      2 in e && ((t.finallyLoc = e[2]), (t.afterLoc = e[3])),
      this.tryEntries.push(t));
  }
  function P(e) {
    var t = e.completion || {};
    ((t.type = 'normal'), delete t.arg, (e.completion = t));
  }
  function W(e) {
    ((this.tryEntries = [{ tryLoc: 'root' }]),
      e.forEach(A, this),
      this.reset(!0));
  }
  function T(t) {
    if (t || '' === t) {
      var r = t[s];
      if (r) return r.call(t);
      if ('function' == typeof t.next) return t;
      if (!isNaN(t.length)) {
        var n = -1,
          o = function r() {
            for (; ++n < t.length; )
              if (i.call(t, n)) return ((r.value = t[n]), (r.done = !1), r);
            return ((r.value = e), (r.done = !0), r);
          };
        return (o.next = o);
      }
    }
    throw new TypeError(typeof t + ' is not iterable');
  }
  return (
    (w.prototype = b),
    o(j, 'constructor', { value: b, configurable: !0 }),
    o(b, 'constructor', { value: w, configurable: !0 }),
    (w.displayName = l(b, u, 'GeneratorFunction')),
    (t.isGeneratorFunction = function (e) {
      var t = 'function' == typeof e && e.constructor;
      return (
        !!t && (t === w || 'GeneratorFunction' === (t.displayName || t.name))
      );
    }),
    (t.mark = function (e) {
      return (
        Object.setPrototypeOf
          ? Object.setPrototypeOf(e, b)
          : ((e.__proto__ = b), l(e, u, 'GeneratorFunction')),
        (e.prototype = Object.create(j)),
        e
      );
    }),
    (t.awrap = function (e) {
      return { __await: e };
    }),
    O(M.prototype),
    l(M.prototype, c, function () {
      return this;
    }),
    (t.AsyncIterator = M),
    (t.async = function (e, r, n, i, o) {
      void 0 === o && (o = Promise);
      var a = new M(f(e, r, n, i), o);
      return t.isGeneratorFunction(r)
        ? a
        : a.next().then(function (e) {
            return e.done ? e.value : a.next();
          });
    }),
    O(j),
    l(j, u, 'Generator'),
    l(j, s, function () {
      return this;
    }),
    l(j, 'toString', function () {
      return '[object Generator]';
    }),
    (t.keys = function (e) {
      var t = Object(e),
        r = [];
      for (var n in t) r.push(n);
      return (
        r.reverse(),
        function e() {
          for (; r.length; ) {
            var n = r.pop();
            if (n in t) return ((e.value = n), (e.done = !1), e);
          }
          return ((e.done = !0), e);
        }
      );
    }),
    (t.values = T),
    (W.prototype = {
      constructor: W,
      reset: function (t) {
        if (
          ((this.prev = 0),
          (this.next = 0),
          (this.sent = this._sent = e),
          (this.done = !1),
          (this.delegate = null),
          (this.method = 'next'),
          (this.arg = e),
          this.tryEntries.forEach(P),
          !t)
        )
          for (var r in this)
            't' === r.charAt(0) &&
              i.call(this, r) &&
              !isNaN(+r.slice(1)) &&
              (this[r] = e);
      },
      stop: function () {
        this.done = !0;
        var e = this.tryEntries[0].completion;
        if ('throw' === e.type) throw e.arg;
        return this.rval;
      },
      dispatchException: function (t) {
        if (this.done) throw t;
        var r = this;
        function n(n, i) {
          return (
            (s.type = 'throw'),
            (s.arg = t),
            (r.next = n),
            i && ((r.method = 'next'), (r.arg = e)),
            !!i
          );
        }
        for (var o = this.tryEntries.length - 1; o >= 0; --o) {
          var a = this.tryEntries[o],
            s = a.completion;
          if ('root' === a.tryLoc) return n('end');
          if (a.tryLoc <= this.prev) {
            var c = i.call(a, 'catchLoc'),
              u = i.call(a, 'finallyLoc');
            if (c && u) {
              if (this.prev < a.catchLoc) return n(a.catchLoc, !0);
              if (this.prev < a.finallyLoc) return n(a.finallyLoc);
            } else if (c) {
              if (this.prev < a.catchLoc) return n(a.catchLoc, !0);
            } else {
              if (!u) throw new Error('try statement without catch or finally');
              if (this.prev < a.finallyLoc) return n(a.finallyLoc);
            }
          }
        }
      },
      abrupt: function (e, t) {
        for (var r = this.tryEntries.length - 1; r >= 0; --r) {
          var n = this.tryEntries[r];
          if (
            n.tryLoc <= this.prev &&
            i.call(n, 'finallyLoc') &&
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
        var a = o ? o.completion : {};
        return (
          (a.type = e),
          (a.arg = t),
          o
            ? ((this.method = 'next'), (this.next = o.finallyLoc), m)
            : this.complete(a)
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
          var r = this.tryEntries[t];
          if (r.finallyLoc === e)
            return (this.complete(r.completion, r.afterLoc), P(r), m);
        }
      },
      catch: function (e) {
        for (var t = this.tryEntries.length - 1; t >= 0; --t) {
          var r = this.tryEntries[t];
          if (r.tryLoc === e) {
            var n = r.completion;
            if ('throw' === n.type) {
              var i = n.arg;
              P(r);
            }
            return i;
          }
        }
        throw new Error('illegal catch attempt');
      },
      delegateYield: function (t, r, n) {
        return (
          (this.delegate = { iterator: T(t), resultName: r, nextLoc: n }),
          'next' === this.method && (this.arg = e),
          m
        );
      },
    }),
    t
  );
}
function n(e) {
  var t = (function (e, t) {
    if ('object' != typeof e || !e) return e;
    var r = e[Symbol.toPrimitive];
    if (void 0 !== r) {
      var n = r.call(e, t || 'default');
      if ('object' != typeof n) return n;
      throw new TypeError('@@toPrimitive must return a primitive value.');
    }
    return ('string' === t ? String : Number)(e);
  })(e, 'string');
  return 'symbol' == typeof t ? t : String(t);
}
function i(e) {
  return (
    (i =
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
          }),
    i(e)
  );
}
function o(e, t) {
  if (!(e instanceof t))
    throw new TypeError('Cannot call a class as a function');
}
function a(e, t) {
  for (var r = 0; r < t.length; r++) {
    var i = t[r];
    ((i.enumerable = i.enumerable || !1),
      (i.configurable = !0),
      'value' in i && (i.writable = !0),
      Object.defineProperty(e, n(i.key), i));
  }
}
function s(e, t, r) {
  return (
    t && a(e.prototype, t),
    r && a(e, r),
    Object.defineProperty(e, 'prototype', { writable: !1 }),
    e
  );
}
function c(e, t) {
  if ('function' != typeof t && null !== t)
    throw new TypeError('Super expression must either be null or a function');
  ((e.prototype = Object.create(t && t.prototype, {
    constructor: { value: e, writable: !0, configurable: !0 },
  })),
    Object.defineProperty(e, 'prototype', { writable: !1 }),
    t && l(e, t));
}
function u(e) {
  return (
    (u = Object.setPrototypeOf
      ? Object.getPrototypeOf.bind()
      : function (e) {
          return e.__proto__ || Object.getPrototypeOf(e);
        }),
    u(e)
  );
}
function l(e, t) {
  return (
    (l = Object.setPrototypeOf
      ? Object.setPrototypeOf.bind()
      : function (e, t) {
          return ((e.__proto__ = t), e);
        }),
    l(e, t)
  );
}
function f(e) {
  var r = 'function' == typeof Map ? new Map() : void 0;
  return (
    (f = function (e) {
      if (
        null === e ||
        !(function (e) {
          try {
            return -1 !== Function.toString.call(e).indexOf('[native code]');
          } catch (t) {
            return 'function' == typeof e;
          }
        })(e)
      )
        return e;
      if ('function' != typeof e)
        throw new TypeError(
          'Super expression must either be null or a function'
        );
      if (void 0 !== r) {
        if (r.has(e)) return r.get(e);
        r.set(e, n);
      }
      function n() {
        return (function (e, r, n) {
          if (t()) return Reflect.construct.apply(null, arguments);
          var i = [null];
          i.push.apply(i, r);
          var o = new (e.bind.apply(e, i))();
          return (n && l(o, n.prototype), o);
        })(e, arguments, u(this).constructor);
      }
      return (
        (n.prototype = Object.create(e.prototype, {
          constructor: {
            value: n,
            enumerable: !1,
            writable: !0,
            configurable: !0,
          },
        })),
        l(n, e)
      );
    }),
    f(e)
  );
}
function d(e) {
  if (void 0 === e)
    throw new ReferenceError(
      "this hasn't been initialised - super() hasn't been called"
    );
  return e;
}
function v() {
  return (
    (v =
      'undefined' != typeof Reflect && Reflect.get
        ? Reflect.get.bind()
        : function (e, t, r) {
            var n = (function (e, t) {
              for (
                ;
                !Object.prototype.hasOwnProperty.call(e, t) &&
                null !== (e = u(e));

              );
              return e;
            })(e, t);
            if (n) {
              var i = Object.getOwnPropertyDescriptor(n, t);
              return i.get ? i.get.call(arguments.length < 3 ? e : r) : i.value;
            }
          }),
    v.apply(this, arguments)
  );
}
function h(e, t) {
  return (
    (function (e) {
      if (Array.isArray(e)) return e;
    })(e) ||
    (function (e, t) {
      var r =
        null == e
          ? null
          : ('undefined' != typeof Symbol && e[Symbol.iterator]) ||
            e['@@iterator'];
      if (null != r) {
        var n,
          i,
          o,
          a,
          s = [],
          c = !0,
          u = !1;
        try {
          if (((o = (r = r.call(e)).next), 0 === t)) {
            if (Object(r) !== r) return;
            c = !1;
          } else
            for (
              ;
              !(c = (n = o.call(r)).done) && (s.push(n.value), s.length !== t);
              c = !0
            );
        } catch (e) {
          ((u = !0), (i = e));
        } finally {
          try {
            if (!c && null != r.return && ((a = r.return()), Object(a) !== a))
              return;
          } finally {
            if (u) throw i;
          }
        }
        return s;
      }
    })(e, t) ||
    y(e, t) ||
    (function () {
      throw new TypeError(
        'Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
      );
    })()
  );
}
function p(e) {
  return (
    (function (e) {
      if (Array.isArray(e)) return m(e);
    })(e) ||
    (function (e) {
      if (
        ('undefined' != typeof Symbol && null != e[Symbol.iterator]) ||
        null != e['@@iterator']
      )
        return Array.from(e);
    })(e) ||
    y(e) ||
    (function () {
      throw new TypeError(
        'Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
      );
    })()
  );
}
function y(e, t) {
  if (e) {
    if ('string' == typeof e) return m(e, t);
    var r = Object.prototype.toString.call(e).slice(8, -1);
    return (
      'Object' === r && e.constructor && (r = e.constructor.name),
      'Map' === r || 'Set' === r
        ? Array.from(e)
        : 'Arguments' === r ||
            /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)
          ? m(e, t)
          : void 0
    );
  }
}
function m(e, t) {
  (null == t || t > e.length) && (t = e.length);
  for (var r = 0, n = new Array(t); r < t; r++) n[r] = e[r];
  return n;
}
function g(e, t) {
  var r = {};
  for (var n in e)
    Object.prototype.hasOwnProperty.call(e, n) &&
      t.indexOf(n) < 0 &&
      (r[n] = e[n]);
  if (null != e && 'function' == typeof Object.getOwnPropertySymbols) {
    var i = 0;
    for (n = Object.getOwnPropertySymbols(e); i < n.length; i++)
      t.indexOf(n[i]) < 0 &&
        Object.prototype.propertyIsEnumerable.call(e, n[i]) &&
        (r[n[i]] = e[n[i]]);
  }
  return r;
}
function w(e, t, r, n) {
  return new (r || (r = Promise))(function (i, o) {
    function a(e) {
      try {
        c(n.next(e));
      } catch (e) {
        o(e);
      }
    }
    function s(e) {
      try {
        c(n.throw(e));
      } catch (e) {
        o(e);
      }
    }
    function c(e) {
      var t;
      e.done
        ? i(e.value)
        : ((t = e.value),
          t instanceof r
            ? t
            : new r(function (e) {
                e(t);
              })).then(a, s);
    }
    c((n = n.apply(e, t || [])).next());
  });
}
function b(e, t, r, n) {
  if ('a' === r && !n)
    throw new TypeError('Private accessor was defined without a getter');
  if ('function' == typeof t ? e !== t || !n : !t.has(e))
    throw new TypeError(
      'Cannot read private member from an object whose class did not declare it'
    );
  return 'm' === r ? n : 'a' === r ? n.call(e) : n ? n.value : t.get(e);
}
function _(e, t, r, n, i) {
  if ('m' === n) throw new TypeError('Private method is not writable');
  if ('a' === n && !i)
    throw new TypeError('Private accessor was defined without a setter');
  if ('function' == typeof t ? e !== t || !i : !t.has(e))
    throw new TypeError(
      'Cannot write private member to an object whose class did not declare it'
    );
  return ('a' === n ? i.call(e, r) : i ? (i.value = r) : t.set(e, r), r);
}
var x, k, j, O, M, S, E, A;
('function' == typeof SuppressedError && SuppressedError,
  (function (e) {
    ((e[(e.start = 0)] = 'start'),
      (e[(e.intermediate = 1)] = 'intermediate'),
      (e[(e.end = 2)] = 'end'));
  })(x || (x = {})),
  (function (e) {
    ((e[(e.disconnected = 0)] = 'disconnected'),
      (e[(e.connecting = 2)] = 'connecting'),
      (e[(e.connected = 1)] = 'connected'));
  })(k || (k = {})),
  (function (e) {
    ((e[(e.start = 0)] = 'start'),
      (e[(e.processing = 1)] = 'processing'),
      (e[(e.stop = 2)] = 'stop'));
  })(j || (j = {})),
  (function (e) {
    ((e[(e.start = 0)] = 'start'), (e[(e.stop = 2)] = 'stop'));
  })(O || (O = {})),
  (function (e) {
    ((e[(e.append = 0)] = 'append'), (e[(e.break = 1)] = 'break'));
  })(M || (M = {})),
  (function (e) {
    ((e[(e.offline = 0)] = 'offline'), (e[(e.realtime = 1)] = 'realtime'));
  })(S || (S = {})),
  (function (e) {
    ((e.live = 'live'), (e.genneral = 'genneral'));
  })(E || (E = {})),
  (function (e) {
    e.action = 'action';
  })(A || (A = {})));
var P = (function (t) {
  function r(t, n, i, a, s) {
    var c;
    return (
      o(this, r),
      ((c = e(this, r, [t])).name = i),
      (c.code = n),
      (c.request_id = s || ''),
      (c.sid = a || ''),
      c
    );
  }
  return (c(r, f(Error)), s(r));
})();
function W() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, function (e) {
      var t = (16 * Math.random()) | 0;
      return ('x' == e ? t : (3 & t) | 8).toString(16);
    })
    .replace(/-/g, '');
}
var T = function () {
  var e = { resolve: function () {}, reject: function () {} };
  return {
    promise: new Promise(function (t, r) {
      ((e.resolve = t), (e.reject = r));
    }),
    controller: e,
  };
};
function I() {
  for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++)
    t[r] = arguments[r];
  return t.reduce(function (e, t) {
    for (var r in t)
      if (t.hasOwnProperty(r)) {
        var n = t[r],
          o = e[r];
        'object' === i(n) && null != n && 'object' === i(o) && null != o
          ? Array.isArray(n)
            ? (e[r] = p(n))
            : (e[r] = I(o, n))
          : (e[r] = n);
      }
    return e;
  }, {});
}
const C = 'function' == typeof Buffer,
  L =
    ('function' == typeof TextDecoder && new TextDecoder(),
    'function' == typeof TextEncoder && new TextEncoder(),
    Array.prototype.slice.call(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    )),
  R = (e => {
    let t = {};
    return (L.forEach((e, r) => (t[e] = r)), t);
  })(),
  U = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/,
  z = String.fromCharCode.bind(String),
  B =
    ('function' == typeof Uint8Array.from && Uint8Array.from.bind(Uint8Array),
    e => e.replace(/=/g, '').replace(/[+\/]/g, e => ('+' == e ? '-' : '_'))),
  F = e => e.replace(/[^A-Za-z0-9\+\/]/g, ''),
  D = e => {
    let t,
      r,
      n,
      i,
      o = '';
    const a = e.length % 3;
    for (let a = 0; a < e.length; ) {
      if (
        (r = e.charCodeAt(a++)) > 255 ||
        (n = e.charCodeAt(a++)) > 255 ||
        (i = e.charCodeAt(a++)) > 255
      )
        throw new TypeError('invalid character found');
      ((t = (r << 16) | (n << 8) | i),
        (o +=
          L[(t >> 18) & 63] +
          L[(t >> 12) & 63] +
          L[(t >> 6) & 63] +
          L[63 & t]));
    }
    return a ? o.slice(0, a - 3) + '==='.substring(a) : o;
  },
  N =
    'function' == typeof btoa
      ? e => btoa(e)
      : C
        ? e => Buffer.from(e, 'binary').toString('base64')
        : D,
  q = C
    ? e => Buffer.from(e).toString('base64')
    : e => {
        let t = [];
        for (let r = 0, n = e.length; r < n; r += 4096)
          t.push(z.apply(null, e.subarray(r, r + 4096)));
        return N(t.join(''));
      },
  V = (e, t = !1) => (t ? B(q(e)) : q(e)),
  H = e => {
    if (((e = e.replace(/\s+/g, '')), !U.test(e)))
      throw new TypeError('malformed base64.');
    e += '=='.slice(2 - (3 & e.length));
    let t,
      r,
      n,
      i = '';
    for (let o = 0; o < e.length; )
      ((t =
        (R[e.charAt(o++)] << 18) |
        (R[e.charAt(o++)] << 12) |
        ((r = R[e.charAt(o++)]) << 6) |
        (n = R[e.charAt(o++)])),
        (i +=
          64 === r
            ? z((t >> 16) & 255)
            : 64 === n
              ? z((t >> 16) & 255, (t >> 8) & 255)
              : z((t >> 16) & 255, (t >> 8) & 255, 255 & t)));
    return i;
  },
  G = V;
var $,
  K,
  Z,
  J = { code: '600000', message: '必要参数缺失' },
  X = { code: '600003', message: '连接异常' },
  Y = { code: '600004', message: '无效的响应' },
  Q = { code: '999999', message: '未知错误' },
  ee = { code: 10110, message: '敏感词检测不通过' },
  te = {
    EmptyStreamError: { code: '700000', message: '无效的流数据' },
    PlayNotAllowed: { code: '700006', message: '播放不允许' },
    MissingPlayerLibsError: { code: '700001', message: '缺失播放插件' },
    H264NotSupported: { code: '700002', message: '当前设备不支持 H.264' },
    Unknown: { code: '700005', message: '播放失败' },
  },
  re = { code: '800000', message: '不支持的环境' },
  ne = { code: '800001', message: '未找到指定约束的设备' },
  ie = { code: '800002', message: '设备访问权限异常/无法请求使用源设备' },
  oe = {
    code: '800003',
    message:
      '暂时无法访问摄像头/麦克风，请确保当前没有其他应用请求访问设备，并重试',
  },
  ae = { code: '800004', message: '无效的设备请求参数' },
  se = { code: '800005', message: '未知原因操作已终止' },
  ce = { code: '800006', message: '当前页面未处于激活状态' },
  ue = { code: '800007', message: '页面未发生用户交互，请求被终止' };
(!(function (e) {
  ((e.InvalidParam = 'InvalidParam'),
    (e.InvalidResponse = 'InvalidResponse'),
    (e.ContextError = 'ContextError'),
    (e.NetworkError = 'NetworkError'),
    (e.ConnectError = 'ConnectError'),
    (e.InvalidConnect = 'InvalidConnect'),
    (e.MediaError = 'MediaError'),
    (e.UserMediaError = 'UserMediaError'));
})($ || ($ = {})),
  (function (e) {
    ((e[(e.verbose = 0)] = 'verbose'),
      (e[(e.debug = 1)] = 'debug'),
      (e[(e.info = 2)] = 'info'),
      (e[(e.warn = 3)] = 'warn'),
      (e[(e.error = 4)] = 'error'),
      (e[(e.none = 5)] = 'none'));
  })(K || (K = {})));
var le = (function () {
  function e() {
    (o(this, e), Z.set(this, K.warn));
  }
  return (
    s(e, [
      {
        key: 'setLogLevel',
        value: function (e) {
          _(this, Z, e, 'f');
        },
      },
      {
        key: 'record',
        value: function (e) {
          var t, r, n, i, o;
          if (e >= b(this, Z, 'f')) {
            for (
              var a = arguments.length, s = new Array(a > 1 ? a - 1 : 0), c = 1;
              c < a;
              c++
            )
              s[c - 1] = arguments[c];
            switch (e) {
              case K.verbose:
                (t = console).log.apply(t, ['[SDK] [VERBOSE] '].concat(s));
                break;
              case K.debug:
                (r = console).log.apply(r, ['[SDK] [DEBUG] '].concat(s));
                break;
              case K.info:
                (n = console).log.apply(n, ['[SDK] [INFO] '].concat(s));
                break;
              case K.warn:
                (i = console).warn.apply(i, ['[SDK] [WARN] '].concat(s));
                break;
              case K.error:
                (o = console).error.apply(o, ['[SDK] [ERROR] '].concat(s));
            }
          }
        },
      },
    ]),
    e
  );
})();
Z = new WeakMap();
var fe,
  de,
  ve,
  he,
  pe,
  ye,
  me,
  ge,
  we,
  be,
  _e,
  xe,
  ke,
  je = new le(),
  Oe = (function () {
    function e(t, r) {
      var n = this;
      (o(this, e),
        de.set(this, void 0),
        ve.set(this, fe.CLOSED),
        he.set(this, 'web'),
        pe.set(this, void 0),
        ye.set(this, void 0),
        me.set(this, void 0),
        ge.set(this, void 0),
        'undefined' != typeof wx && wx.env && _(this, he, 'miniprogram', 'f'),
        je.record(K.debug, '[ws]', b(this, he, 'f'), t),
        _(this, de, void 0, 'f'),
        _(this, ve, fe.CONNECTING, 'f'),
        'miniprogram' === b(this, he, 'f')
          ? (_(this, de, wx.connectSocket({ url: encodeURI(t) }), 'f'),
            b(this, de, 'f').onOpen(function () {
              var e, t;
              (je.record(K.debug, '[ws]', 'channel open'),
                _(n, ve, fe.OPEN, 'f'));
              for (
                var r = arguments.length, i = new Array(r), o = 0;
                o < r;
                o++
              )
                i[o] = arguments[o];
              null === (t = b(n, pe, 'f')) ||
                void 0 === t ||
                (e = t).call.apply(e, [n].concat(i));
            }),
            b(this, de, 'f').onMessage(function () {
              for (
                var e, t, r = arguments.length, i = new Array(r), o = 0;
                o < r;
                o++
              )
                i[o] = arguments[o];
              null === (t = b(n, ye, 'f')) ||
                void 0 === t ||
                (e = t).call.apply(e, [n].concat(i));
            }),
            b(this, de, 'f').onClose(function () {
              var e, t;
              (je.record(K.debug, '[ws]', 'channel closed'),
                _(n, ve, fe.CLOSED, 'f'));
              for (
                var r = arguments.length, i = new Array(r), o = 0;
                o < r;
                o++
              )
                i[o] = arguments[o];
              null === (t = b(n, ge, 'f')) ||
                void 0 === t ||
                (e = t).call.apply(e, [n].concat(i));
            }),
            b(this, de, 'f').onError(function (e) {
              var t;
              (je.record(K.error, '[ws]', 'channel error', e),
                null === (t = b(n, me, 'f')) || void 0 === t || t.call(n, e));
            }))
          : (_(this, de, new WebSocket(t), 'f'),
            (null == r ? void 0 : r.binaryData) &&
              (je.record(K.debug, '[ws]', 'binaryType:ab'),
              (b(this, de, 'f').binaryType = 'arraybuffer')),
            (b(this, de, 'f').onopen = function () {
              var e, t;
              je.record(K.debug, '[ws]', 'channel open');
              for (
                var r = arguments.length, i = new Array(r), o = 0;
                o < r;
                o++
              )
                i[o] = arguments[o];
              null === (t = b(n, pe, 'f')) ||
                void 0 === t ||
                (e = t).call.apply(e, [n].concat(i));
            }),
            (b(this, de, 'f').onmessage = function () {
              for (
                var e, t, r = arguments.length, i = new Array(r), o = 0;
                o < r;
                o++
              )
                i[o] = arguments[o];
              null === (t = b(n, ye, 'f')) ||
                void 0 === t ||
                (e = t).call.apply(e, [n].concat(i));
            }),
            (b(this, de, 'f').onclose = function () {
              var e, t;
              je.record(K.debug, '[ws]', 'channel closed');
              for (
                var r = arguments.length, i = new Array(r), o = 0;
                o < r;
                o++
              )
                i[o] = arguments[o];
              null === (t = b(n, ge, 'f')) ||
                void 0 === t ||
                (e = t).call.apply(e, [n].concat(i));
            }),
            (b(this, de, 'f').onerror = function (e) {
              var t;
              (je.record(K.error, '[ws]', 'channel error', e),
                null === (t = b(n, me, 'f')) || void 0 === t || t.call(n, e));
            })));
    }
    return (
      s(e, [
        {
          key: 'readyState',
          get: function () {
            return 'miniprogram' === b(this, he, 'f')
              ? b(this, ve, 'f')
              : b(this, de, 'f').readyState;
          },
        },
        {
          key: 'onopen',
          set: function (e) {
            _(this, pe, e, 'f');
          },
        },
        {
          key: 'onmessage',
          set: function (e) {
            _(this, ye, e, 'f');
          },
        },
        {
          key: 'onclose',
          set: function (e) {
            _(this, ge, e, 'f');
          },
        },
        {
          key: 'onerror',
          set: function (e) {
            _(this, me, e, 'f');
          },
        },
        {
          key: 'send',
          value: function (e) {
            'miniprogram' === b(this, he, 'f')
              ? b(this, de, 'f').send({ data: e })
              : b(this, de, 'f').send(e);
          },
        },
        {
          key: 'close',
          value: function (e) {
            var t, r, n, i;
            (_(this, ve, fe.CLOSING, 'f'),
              je.record(
                K.debug,
                '[ws]',
                'close channel',
                null !== (t = null == e ? void 0 : e.code) && void 0 !== t
                  ? t
                  : '',
                null !== (r = null == e ? void 0 : e.reason) && void 0 !== r
                  ? r
                  : ''
              ),
              'miniprogram' === b(this, he, 'f')
                ? null === (n = b(this, de, 'f')) || void 0 === n || n.close(e)
                : null === (i = b(this, de, 'f')) ||
                  void 0 === i ||
                  i.close(
                    null == e ? void 0 : e.code,
                    null == e ? void 0 : e.reason
                  ));
          },
        },
      ]),
      e
    );
  })();
function Me(e, t) {
  var r,
    n = !1;
  return {
    abort: function () {
      var e;
      ((n = !0),
        clearTimeout(undefined),
        r &&
          ((r.onerror = null),
          (r.onopen = null),
          (r.onmessage = null),
          null === (e = r.close) || void 0 === e || e.call(r)));
    },
    instablishPromise: new Promise(function (i, o) {
      try {
        var a = 0;
        (((r = new Oe(e, t)).onopen = function () {
          ((r.onerror = null),
            (r.onopen = null),
            (a = setTimeout(function () {
              n ? r.close() : i(r);
            }, 50)));
        }),
          (r.onclose = function (e) {
            (clearTimeout(a),
              (r.onerror = null),
              (r.onopen = null),
              (r.onclose = null),
              n || o(e));
          }),
          (r.onerror = function (e) {
            (clearTimeout(a),
              (r.onerror = null),
              (r.onopen = null),
              (r.onclose = null),
              n || o(e));
          }));
      } catch (e) {
        o(e);
      }
    }),
  };
}
((fe = Oe),
  (de = new WeakMap()),
  (ve = new WeakMap()),
  (he = new WeakMap()),
  (pe = new WeakMap()),
  (ye = new WeakMap()),
  (me = new WeakMap()),
  (ge = new WeakMap()),
  (Oe.CONNECTING = 0),
  (Oe.OPEN = 1),
  (Oe.CLOSING = 2),
  (Oe.CLOSED = 3));
var Se,
  Ee,
  Ae,
  Pe,
  We,
  Te,
  Ie,
  Ce,
  Le,
  Re,
  Ue,
  ze,
  Be,
  Fe,
  De,
  Ne,
  qe,
  Ve,
  He = 0,
  Ge = (function () {
    function e(t) {
      var r,
        n = this;
      (o(this, e),
        we.set(this, He),
        be.set(this, {}),
        _e.set(this, []),
        xe.set(this, function (e, t, r) {
          if ('function' != typeof t)
            throw TypeError('listener must be a function');
          (-1 === b(n, _e, 'f').indexOf(e) && b(n, _e, 'f').push(e),
            (b(n, be, 'f')[e] = b(n, be, 'f')[e] || []),
            b(n, be, 'f')[e].push({ once: r || !1, fn: t }));
        }),
        ke.set(this, function (e, t) {
          var r = b(n, be, 'f')[e],
            i = [];
          (null == r ||
            r.forEach(function (e, r) {
              (e.fn.apply(null, t), e.once && i.unshift(r));
            }),
            null == i ||
              i.forEach(function (e) {
                r.splice(e, 1);
              }));
        }),
        _(
          this,
          we,
          null !== (r = null == t ? void 0 : t.emitDelay) && void 0 !== r
            ? r
            : He,
          'f'
        ));
    }
    return (
      s(e, [
        {
          key: 'on',
          value: function (e, t) {
            return (b(this, xe, 'f').call(this, e, t, !1), this);
          },
        },
        {
          key: 'once',
          value: function (e, t) {
            return (b(this, xe, 'f').call(this, e, t, !0), this);
          },
        },
        {
          key: 'off',
          value: function (e, t) {
            var r = b(this, _e, 'f').indexOf(e);
            if (e && -1 !== r)
              if (t) {
                var n = [],
                  i = b(this, be, 'f')[e];
                (null == i ||
                  i.forEach(function (e, r) {
                    e.fn === t && n.unshift(r);
                  }),
                  null == n ||
                    n.forEach(function (e) {
                      i.splice(e, 1);
                    }),
                  i.length ||
                    (b(this, _e, 'f').splice(r, 1),
                    delete b(this, be, 'f')[e]));
              } else
                (delete b(this, be, 'f')[e], b(this, _e, 'f').splice(r, 1));
            return this;
          },
        },
        {
          key: 'removeAllListeners',
          value: function () {
            return (_(this, be, {}, 'f'), _(this, _e, [], 'f'), this);
          },
        },
        {
          key: 'emit',
          value: function (e) {
            for (
              var t = this,
                r = arguments.length,
                n = new Array(r > 1 ? r - 1 : 0),
                i = 1;
              i < r;
              i++
            )
              n[i - 1] = arguments[i];
            b(this, we, 'f')
              ? setTimeout(
                  function () {
                    b(t, ke, 'f').call(t, e, n);
                  },
                  b(this, we, 'f')
                )
              : b(this, ke, 'f').call(this, e, n);
          },
        },
        {
          key: 'emitSync',
          value: function (e) {
            for (
              var t = arguments.length, r = new Array(t > 1 ? t - 1 : 0), n = 1;
              n < t;
              n++
            )
              r[n - 1] = arguments[n];
            b(this, ke, 'f').call(this, e, r);
          },
        },
        {
          key: 'destroy',
          value: function () {
            (_(this, be, {}, 'f'), _(this, _e, [], 'f'));
          },
        },
      ]),
      e
    );
  })();
((we = new WeakMap()),
  (be = new WeakMap()),
  (_e = new WeakMap()),
  (xe = new WeakMap()),
  (ke = new WeakMap()),
  (function (e) {
    ((e.connected = 'connected'),
      (e.disconnected = 'disconnected'),
      (e.nlp = 'nlp'),
      (e.asr = 'asr'),
      (e.stream_start = 'stream_start'),
      (e.frame_start = 'frame_start'),
      (e.frame_stop = 'frame_stop'),
      (e.action_start = 'action_start'),
      (e.action_stop = 'action_stop'),
      (e.tts_duration = 'tts_duration'),
      (e.subtitle_info = 'subtitle_info'),
      (e.error = 'error'));
  })(Se || (Se = {})),
  (function (e) {
    ((e.play = 'play'),
      (e.waiting = 'waiting'),
      (e.playing = 'playing'),
      (e.stop = 'stop'),
      (e.playNotAllowed = 'not-allowed'),
      (e.error = 'error'));
  })(Ee || (Ee = {})));
var $e,
  Ke = (function (t) {
    function n() {
      var t;
      return (
        o(this, n),
        (t = e(this, n)),
        Ae.set(d(t), void 0),
        Pe.set(d(t), 'xrtc'),
        We.set(d(t), void 0),
        Te.set(d(t), !1),
        Ie.set(d(t), 1),
        Ce.set(d(t), 'center'),
        Le.set(d(t), void 0),
        Re.set(d(t), void 0),
        Ue.set(d(t), void 0),
        ze.set(d(t), void 0),
        Be.set(d(t), { width: 1080, height: 1920 }),
        Fe.set(d(t), 1),
        De.set(d(t), function () {
          return w(
            d(t),
            void 0,
            void 0,
            r().mark(function e() {
              var t,
                n,
                i,
                o,
                a,
                s,
                c = this;
              return r().wrap(
                function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        if (
                          (b(this, Ae, 'f') && b(this, Ae, 'f').destroy(),
                          (n = void 0),
                          (e.prev = 2),
                          'xrtc' !== b(this, Pe, 'f'))
                        ) {
                          e.next = 11;
                          break;
                        }
                        return (
                          (e.next = 6),
                          import('./xrtc-player-BJTnVhG9.js')
                        );
                      case 6:
                        ((i = e.sent),
                          (o = i.XRTCPlayer),
                          _(this, Ae, new o(), 'f'),
                          (e.next = 17));
                        break;
                      case 11:
                        if ('webrtc' !== b(this, Pe, 'f')) {
                          e.next = 17;
                          break;
                        }
                        return (
                          (e.next = 14),
                          import('./webrtc-player--YuOiwFd.js')
                        );
                      case 14:
                        ((a = e.sent),
                          (s = a.WebRTCPlayer),
                          _(this, Ae, new s(), 'f'));
                      case 17:
                        e.next = 22;
                        break;
                      case 19:
                        ((e.prev = 19),
                          (e.t0 = e.catch(2)),
                          (n = new P(
                            te.MissingPlayerLibsError.message,
                            te.MissingPlayerLibsError.code,
                            $.MediaError
                          )));
                      case 22:
                        if (!n) {
                          e.next = 24;
                          break;
                        }
                        return e.abrupt('return', Promise.reject(n));
                      case 24:
                        null === (t = b(this, Ae, 'f')) ||
                          void 0 === t ||
                          t
                            .on(Ee.play, function () {
                              c.emit(Ee.play);
                            })
                            .on(Ee.waiting, function () {
                              c.emit(Ee.waiting);
                            })
                            .on(Ee.playing, function () {
                              c.emit(Ee.playing);
                            })
                            .on(Ee.playNotAllowed, function () {
                              c.emit(Ee.playNotAllowed);
                            })
                            .on(Ee.stop, function () {
                              c.emit(Ee.stop);
                            })
                            .on(Ee.error, function (e) {
                              c.emit(Ee.error, e);
                            });
                      case 25:
                      case 'end':
                        return e.stop();
                    }
                },
                e,
                this,
                [[2, 19]]
              );
            })
          );
        }),
        Ne.set(d(t), function () {
          var e, r;
          if (!b(d(t), Ue, 'f')) {
            var n = _(d(t), Ue, document.createElement('div'), 'f');
            (n.setAttribute('id', 'xvideo'),
              (n.style.position = 'relative'),
              (n.style.width = '100%'),
              (n.style.height = '100%'),
              (n.style.minWidth = '100%'),
              (n.style.minHeight = '100%'),
              (n.style.pointerEvents = 'none'),
              null === (e = b(d(t), Re, 'f')) ||
                void 0 === e ||
                e.appendChild(n));
          }
          if (!b(d(t), ze, 'f')) {
            var i = _(d(t), ze, document.createElement('div'), 'f');
            ((i.style.position = 'absolute'),
              t.resize(),
              b(d(t), Ue, 'f').appendChild(i),
              window.addEventListener('resize', b(d(t), qe, 'f')));
          }
          if (b(d(t), Re, 'f'))
            try {
              null === (r = b(d(t), We, 'f')) ||
                void 0 === r ||
                r.observe(b(d(t), Re, 'f'));
            } catch (e) {}
        }),
        qe.set(d(t), function () {
          var e,
            r,
            n = b(d(t), Be, 'f'),
            i = n.width,
            o = n.height,
            a =
              (null === (e = b(d(t), Ue, 'f')) || void 0 === e
                ? void 0
                : e.offsetWidth) || 0,
            s =
              (null === (r = b(d(t), Ue, 'f')) || void 0 === r
                ? void 0
                : r.offsetHeight) || 0;
          if (b(d(t), ze, 'f')) {
            var c = 1;
            ((c = a / s > i / o ? s / o : a / i),
              (b(d(t), ze, 'f').style.left = '50%'));
            var u = '-50%';
            'bottom' === b(d(t), Ce, 'f')
              ? ((u = '0'),
                (b(d(t), ze, 'f').style.bottom = '0px'),
                (b(d(t), ze, 'f').style.transformOrigin = 'center bottom'))
              : ((b(d(t), ze, 'f').style.top = '50%'),
                (b(d(t), ze, 'f').style.transformOrigin = 'center center'));
            var l = b(d(t), Fe, 'f') * c;
            b(d(t), ze, 'f').style.transform = 'translate3d(-50%,'
              .concat(u, ',0) scale(')
              .concat(l, ', ')
              .concat(c, ')');
          }
        }),
        Ve.set(d(t), function () {
          var e;
          if (b(d(t), Re, 'f'))
            try {
              null === (e = b(d(t), We, 'f')) ||
                void 0 === e ||
                e.unobserve(b(d(t), Re, 'f'));
            } catch (e) {}
          (window.removeEventListener('resize', b(d(t), qe, 'f')),
            b(d(t), ze, 'f') &&
              (b(d(t), ze, 'f').remove(), _(d(t), ze, void 0, 'f')),
            b(d(t), Ue, 'f') &&
              (b(d(t), Ue, 'f').remove(), _(d(t), Ue, void 0, 'f')));
        }),
        void 0 !== window.ResizeObserver &&
          _(
            d(t),
            We,
            new ResizeObserver(function (e) {
              e.forEach(function () {
                var e;
                null === (e = b(d(t), qe, 'f')) || void 0 === e || e.call(d(t));
              });
            }),
            'f'
          ),
        t
      );
    }
    return (
      c(n, Ge),
      s(
        n,
        [
          {
            key: 'renderAlign',
            set: function (e) {
              _(this, Ce, e, 'f');
            },
          },
          {
            key: 'playerType',
            set: function (e) {
              _(this, Pe, e, 'f');
            },
          },
          {
            key: 'muted',
            get: function () {
              var e,
                t = b(this, Te, 'f');
              return (
                b(this, Ae, 'f') &&
                  (t =
                    null === (e = b(this, Ae, 'f')) || void 0 === e
                      ? void 0
                      : e.muted),
                t
              );
            },
            set: function (e) {
              (_(this, Te, e, 'f'),
                b(this, Ae, 'f') &&
                  (e
                    ? (b(this, Ae, 'f').muted = !0)
                    : ((b(this, Ae, 'f').muted = !1),
                      b(this, Ae, 'f').resume())));
            },
          },
          {
            key: 'volume',
            get: function () {
              var e;
              return (
                (null === (e = b(this, Ae, 'f')) || void 0 === e
                  ? void 0
                  : e.volume) || b(this, Ie, 'f')
              );
            },
            set: function (e) {
              (e > 1 && (e = 1),
                _(this, Ie, e, 'f'),
                b(this, Ae, 'f') && (b(this, Ae, 'f').volume = e));
            },
          },
          {
            key: 'stream',
            set: function (e) {
              (_(this, Le, e, 'f'),
                b(this, Ae, 'f') && (b(this, Ae, 'f').stream = e));
            },
          },
          {
            key: 'container',
            set: function (e) {
              var t;
              if (b(this, Re, 'f'))
                try {
                  null === (t = b(this, We, 'f')) ||
                    void 0 === t ||
                    t.unobserve(b(this, Re, 'f'));
                } catch (e) {}
              _(this, Re, e, 'f');
            },
          },
          {
            key: 'videoSize',
            set: function (e) {
              _(this, Be, e, 'f');
            },
          },
          {
            key: 'playStream',
            value: function (e) {
              return w(
                this,
                void 0,
                void 0,
                r().mark(function t() {
                  var n;
                  return r().wrap(
                    function (t) {
                      for (;;)
                        switch ((t.prev = t.next)) {
                          case 0:
                            return (
                              _(this, Le, e, 'f'),
                              b(this, Ne, 'f').call(this),
                              (t.next = 5),
                              b(this, De, 'f').call(this)
                            );
                          case 5:
                            return (
                              b(this, Ae, 'f') &&
                                (b(this, Ae, 'f') &&
                                  (b(this, Ae, 'f').stream = e),
                                (b(this, Ae, 'f').videoWrapper = b(
                                  this,
                                  ze,
                                  'f'
                                ))),
                              (t.prev = 6),
                              (t.next = 9),
                              null === (n = b(this, Ae, 'f')) || void 0 === n
                                ? void 0
                                : n.play()
                            );
                          case 9:
                            t.next = 15;
                            break;
                          case 11:
                            ((t.prev = 11), (t.t0 = t.catch(6)), this.stop());
                          case 15:
                          case 'end':
                            return t.stop();
                        }
                    },
                    t,
                    this,
                    [[6, 11]]
                  );
                })
              );
            },
          },
          {
            key: 'resume',
            value: function () {
              return w(
                this,
                void 0,
                void 0,
                r().mark(function e() {
                  var t = this;
                  return r().wrap(
                    function (e) {
                      for (;;)
                        switch ((e.prev = e.next)) {
                          case 0:
                            if (!b(this, Ae, 'f')) {
                              e.next = 2;
                              break;
                            }
                            return e.abrupt(
                              'return',
                              b(this, Ae, 'f')
                                .resume()
                                .then(function () {
                                  b(t, Ae, 'f') && (b(t, Ae, 'f').muted = !1);
                                })
                            );
                          case 2:
                            return e.abrupt(
                              'return',
                              Promise.reject('player not found')
                            );
                          case 3:
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
              var e;
              (b(this, Ve, 'f').call(this),
                null === (e = b(this, Ae, 'f')) || void 0 === e || e.stop());
            },
          },
          {
            key: 'scaleX',
            get: function () {
              return b(this, Fe, 'f') || 1;
            },
            set: function (e) {
              (_(this, Fe, e, 'f'), b(this, qe, 'f').call(this));
            },
          },
          {
            key: 'setSinkId',
            value: function (e) {
              return w(
                this,
                void 0,
                void 0,
                r().mark(function t() {
                  var n;
                  return r().wrap(
                    function (t) {
                      for (;;)
                        switch ((t.prev = t.next)) {
                          case 0:
                            return (
                              (t.next = 2),
                              null === (n = b(this, Ae, 'f')) || void 0 === n
                                ? void 0
                                : n.setSinkId(e)
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
              return w(
                this,
                void 0,
                void 0,
                r().mark(function e() {
                  var t;
                  return r().wrap(
                    function (e) {
                      for (;;)
                        switch ((e.prev = e.next)) {
                          case 0:
                            return e.abrupt(
                              'return',
                              (null === (t = b(this, Ae, 'f')) || void 0 === t
                                ? void 0
                                : t.getSinkId()) || ''
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
              var e;
              try {
                null === (e = b(this, We, 'f')) ||
                  void 0 === e ||
                  e.disconnect();
              } catch (e) {}
              (_(this, We, void 0, 'f'),
                this.stop(),
                v(u(n.prototype), 'destroy', this).call(this));
            },
          },
          {
            key: 'resize',
            value: function () {
              var e;
              (b(this, ze, 'f') &&
                ((b(this, ze, 'f').style.width = ''.concat(
                  b(this, Be, 'f').width,
                  'px'
                )),
                (b(this, ze, 'f').style.height = ''.concat(
                  b(this, Be, 'f').height,
                  'px'
                ))),
                null === (e = b(this, Ae, 'f')) || void 0 === e || e.resize(),
                b(this, qe, 'f').call(this));
            },
          },
        ],
        [
          {
            key: 'getVersion',
            value: function () {
              return '3.1.2-1002';
            },
          },
          {
            key: 'setLogLevel',
            value: function (e) {
              je.setLogLevel(e);
            },
          },
        ]
      ),
      n
    );
  })();
function Ze() {
  var e = {
    transF32ToRawData: function (t) {
      var r =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 16e3,
        n =
          arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 16e3,
        i = e.transSamplingRate(t, r, n);
      return e.transF32ToS16(i).buffer;
    },
    transSamplingRate: function (e) {
      var t =
          arguments.length > 1 && void 0 !== arguments[1]
            ? arguments[1]
            : 44100,
        r =
          arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 16e3;
      if (t === r) return e;
      var n = Math.round(e.length * (r / t)),
        i = new Float32Array(n),
        o = (e.length - 1) / (n - 1);
      i[0] = e[0];
      for (var a = 1; a < n - 1; a++) {
        var s = a * o,
          c = Number(Math.floor(s).toFixed()),
          u = Number(Math.ceil(s).toFixed()),
          l = s - c;
        i[a] = e[c] + (e[u] - e[c]) * l;
      }
      return ((i[n - 1] = e[e.length - 1]), i);
    },
    transF32ToS16: function (e) {
      for (var t = [], r = 0; r < e.length; r++) {
        var n = e[r] < 0 ? 32768 * e[r] : 32767 * e[r];
        t.push(n);
      }
      return new Int16Array(t);
    },
  };
  self.onmessage = function (t) {
    var r = t.data,
      n = r.audio,
      i = r.sampleRate,
      o = void 0 === i ? 16e3 : i,
      a = r.destSampleRate,
      s = void 0 === a ? 16e3 : a;
    try {
      var c = e.transF32ToRawData(n, o, s);
      self.postMessage({ data: c });
    } catch (t) {
      self.postMessage({ error: { code: t.type, message: t.message } });
    }
  };
}
((Ae = new WeakMap()),
  (Pe = new WeakMap()),
  (We = new WeakMap()),
  (Te = new WeakMap()),
  (Ie = new WeakMap()),
  (Ce = new WeakMap()),
  (Le = new WeakMap()),
  (Re = new WeakMap()),
  (Ue = new WeakMap()),
  (ze = new WeakMap()),
  (Be = new WeakMap()),
  (Fe = new WeakMap()),
  (De = new WeakMap()),
  (Ne = new WeakMap()),
  (qe = new WeakMap()),
  (Ve = new WeakMap()),
  (function (e) {
    ((e.recoder_audio = 'recoder_audio'),
      (e.ended = 'ended'),
      (e.mute = 'mute'),
      (e.unmute = 'unmute'),
      (e.error = 'error'),
      (e.deviceAutoSwitched = 'device-auto-switched'));
  })($e || ($e = {})));
var Je,
  Xe,
  Ye,
  Qe,
  et,
  tt,
  rt,
  nt,
  it,
  ot,
  at,
  st,
  ct,
  ut,
  lt,
  ft,
  dt,
  vt,
  ht,
  pt,
  yt,
  mt,
  gt,
  wt,
  bt,
  _t,
  xt,
  kt,
  jt,
  Ot,
  Mt,
  St,
  Et,
  At = (function () {
    function e() {
      o(this, e);
    }
    return (
      s(e, null, [
        {
          key: 'requestPermissions',
          value: function (t) {
            return w(
              this,
              void 0,
              void 0,
              r().mark(function n() {
                var i, o, a;
                return r().wrap(function (r) {
                  for (;;)
                    switch ((r.prev = r.next)) {
                      case 0:
                        ((i = ''),
                          (r.t0 = t),
                          (r.next =
                            'audioinput' === r.t0 || 'audiooutput' === r.t0
                              ? 4
                              : 'videoinput' === r.t0
                                ? 6
                                : 8));
                        break;
                      case 4:
                        return ((i = 'microphone'), r.abrupt('break', 8));
                      case 6:
                        return ((i = 'camera'), r.abrupt('break', 8));
                      case 8:
                        if (!i) {
                          r.next = 22;
                          break;
                        }
                        if (((o = 'prompt'), !navigator.permissions)) {
                          r.next = 17;
                          break;
                        }
                        return (
                          (r.next = 13),
                          navigator.permissions.query({ name: i })
                        );
                      case 13:
                        if (((a = r.sent), 'denied' !== (o = a.state))) {
                          r.next = 17;
                          break;
                        }
                        return r.abrupt(
                          'return',
                          Promise.reject(
                            new P(ie.message, ie.code, $.UserMediaError)
                          )
                        );
                      case 17:
                        if ('prompt' !== o) {
                          r.next = 22;
                          break;
                        }
                        return (
                          (r.next = 20),
                          e.getUserMedia({
                            video: 'camera' === i,
                            audio: 'microphone' === i,
                          })
                        );
                      case 20:
                        r.sent.getTracks().forEach(function (e) {
                          e.stop();
                        });
                      case 22:
                      case 'end':
                        return r.stop();
                    }
                }, n);
              })
            );
          },
        },
        {
          key: 'getEnumerateDevices',
          value: function (t) {
            return w(
              this,
              void 0,
              void 0,
              r().mark(function n() {
                var i;
                return r().wrap(function (r) {
                  for (;;)
                    switch ((r.prev = r.next)) {
                      case 0:
                        if (
                          navigator.mediaDevices &&
                          navigator.mediaDevices.enumerateDevices
                        ) {
                          r.next = 2;
                          break;
                        }
                        return r.abrupt(
                          'return',
                          Promise.reject(
                            new P(re.message, re.code, $.UserMediaError)
                          )
                        );
                      case 2:
                        return ((r.next = 4), e.requestPermissions(t));
                      case 4:
                        return (
                          (r.next = 6),
                          navigator.mediaDevices
                            .enumerateDevices()
                            .then(function (e) {
                              return e.filter(function (e) {
                                return e.kind === t && e.deviceId;
                              });
                            })
                            .catch(function (e) {
                              return Promise.reject(
                                new P(
                                  e.message || e.name || ce.message,
                                  ce.code,
                                  $.UserMediaError
                                )
                              );
                            })
                        );
                      case 6:
                        return ((i = r.sent), r.abrupt('return', i));
                      case 8:
                      case 'end':
                        return r.stop();
                    }
                }, n);
              })
            );
          },
        },
        {
          key: 'getUserMedia',
          value: function (e) {
            return w(
              this,
              void 0,
              void 0,
              r().mark(function t() {
                return r().wrap(function (t) {
                  for (;;)
                    switch ((t.prev = t.next)) {
                      case 0:
                        return (
                          (t.next = 2),
                          navigator.mediaDevices
                            .getUserMedia(e)
                            .catch(function (e) {
                              var t = new P(
                                se.message,
                                se.code,
                                $.UserMediaError
                              );
                              switch (null == e ? void 0 : e.name) {
                                case 'NotAllowedError':
                                  t = new P(
                                    ie.message,
                                    ie.code,
                                    $.UserMediaError
                                  );
                                  break;
                                case 'SecurityError':
                                  t = new P(
                                    re.message,
                                    re.code,
                                    $.UserMediaError
                                  );
                                  break;
                                case 'NotReadableError':
                                  t = new P(
                                    oe.message,
                                    oe.code,
                                    $.UserMediaError
                                  );
                                  break;
                                case 'NotFoundError':
                                  t = new P(
                                    ne.message,
                                    ne.code,
                                    $.UserMediaError
                                  );
                                  break;
                                case 'OverconstrainedError':
                                  t = new P(
                                    ae.message,
                                    ae.code,
                                    $.UserMediaError
                                  );
                              }
                              return Promise.reject(t);
                            })
                        );
                      case 2:
                        return t.abrupt('return', t.sent);
                      case 3:
                      case 'end':
                        return t.stop();
                    }
                }, t);
              })
            );
          },
        },
      ]),
      e
    );
  })(),
  Pt = (function (t) {
    function n(t) {
      var i, a;
      return (
        o(this, n),
        (a = e(this, n)),
        Je.add(d(a)),
        Xe.set(d(a), !1),
        Ye.set(d(a), new window.AudioContext()),
        Qe.set(d(a), void 0),
        et.set(d(a), void 0),
        tt.set(d(a), []),
        rt.set(d(a), { sampleRate: 16e3, analyser: !1 }),
        nt.set(d(a), void 0),
        it.set(d(a), void 0),
        ot.set(d(a), void 0),
        at.set(d(a), void 0),
        st.set(d(a), void 0),
        ct.set(d(a), void 0),
        ut.set(d(a), void 0),
        lt.set(d(a), 0),
        ft.set(d(a), !1),
        dt.set(d(a), !1),
        vt.set(d(a), 12e4),
        ht.set(d(a), void 0),
        pt.set(d(a), !1),
        yt.set(d(a), !1),
        mt.set(d(a), void 0),
        gt.set(d(a), void 0),
        wt.set(d(a), function () {
          var e;
          if (!b(d(a), ut, 'f'))
            try {
              var t = URL.createObjectURL(
                new Blob([
                  (null ===
                    (e = Ze.toLocaleString().match(
                      /(?:\/\*[\s\S]*?\*\/|\/\/.*?\r?\n|[^{])+\{([\s\S]*)\}$/
                    )) || void 0 === e
                    ? void 0
                    : e[1]) || '',
                ])
              );
              (_(d(a), ut, new Worker(t), 'f'),
                URL.revokeObjectURL(t),
                (b(d(a), ut, 'f').onmessage = function (e) {
                  var t, r;
                  b(d(a), lt, 'f') > 0 &&
                    _(d(a), lt, ((r = b(d(a), lt, 'f')), --r), 'f');
                  var o = e.data.data;
                  (v(((i = d(a)), u(n.prototype)), 'emitSync', i).call(
                    i,
                    $e.recoder_audio,
                    {
                      s16buffer: o,
                      frameStatus: b(d(a), ft, 'f')
                        ? b(d(a), pt, 'f') && 0 === b(d(a), lt, 'f')
                          ? x.end
                          : x.intermediate
                        : x.start,
                      fullDuplex:
                        null !== (t = b(d(a), yt, 'f')) && void 0 !== t && t,
                      extend: Object.assign(
                        { sampleRate: a.sampleRate },
                        I(b(d(a), mt, 'f') || {}, {})
                      ),
                    }
                  ),
                    b(d(a), ft, 'f') ||
                      b(d(a), pt, 'f') ||
                      _(d(a), ft, !0, 'f'));
                }),
                (b(d(a), ut, 'f').onerror = function (e) {
                  (b(d(a), bt, 'f').call(d(a)),
                    je.record(K.error, '[audioWorker]', e));
                }));
            } catch (e) {
              je.record(K.error, '[prepareAudioWorker]', e);
            }
          if (!b(d(a), ut, 'f'))
            return Promise.reject(new P(se.message, se.code, $.UserMediaError));
        }),
        bt.set(d(a), function () {
          var e, t;
          (_(d(a), lt, 0, 'f'),
            null ===
              (t =
                null === (e = b(d(a), ut, 'f')) || void 0 === e
                  ? void 0
                  : e.terminate) ||
              void 0 === t ||
              t.call(e),
            _(d(a), ut, void 0, 'f'));
        }),
        _t.set(d(a), function () {
          (b(d(a), ct, 'f') ||
            (_(
              d(a),
              ct,
              b(d(a), Ye, 'f').createScriptProcessor(4096, 1, 1),
              'f'
            ),
            (b(d(a), ct, 'f').onaudioprocess = function (e) {
              var t,
                r = e.inputBuffer.getChannelData(0).slice(0);
              (null === (t = b(d(a), ut, 'f')) ||
                void 0 === t ||
                t.postMessage({
                  audio: r,
                  sampleRate: b(d(a), Ye, 'f').sampleRate,
                  destSampleRate: b(d(a), rt, 'f').sampleRate || 16e3,
                }),
                _(d(a), lt, b(d(a), lt, 'f') + 1, 'f'));
            })),
            b(d(a), Qe, 'f') ||
              (_(d(a), Qe, b(d(a), Ye, 'f').createAnalyser(), 'f'),
              (b(d(a), Qe, 'f').fftSize = 2048),
              _(
                d(a),
                et,
                new Uint8Array(b(d(a), Qe, 'f').frequencyBinCount),
                'f'
              )));
        }),
        xt.set(d(a), function () {
          a.emitSync($e.mute);
        }),
        kt.set(d(a), function () {
          a.emitSync($e.unmute);
        }),
        jt.set(d(a), function () {
          (b(d(a), Ot, 'f').call(d(a)),
            a.emitSync($e.ended),
            b(d(a), yt, 'f')
              ? (a.stopRecord(),
                a
                  .startRecord(0, b(d(a), gt, 'f'), b(d(a), mt, 'f'))
                  .then(function () {
                    a.emit($e.deviceAutoSwitched);
                  })
                  .catch(function (e) {
                    a.emitSync($e.error, e);
                  }))
              : (a.stopRecord(),
                a.emitSync(
                  $e.error,
                  new P(ie.message, ie.code, $.UserMediaError)
                )));
        }),
        Ot.set(d(a), function () {
          var e, t, r;
          (null === (e = b(d(a), ot, 'f')) ||
            void 0 === e ||
            e.removeEventListener('mute', b(d(a), xt, 'f')),
            null === (t = b(d(a), ot, 'f')) ||
              void 0 === t ||
              t.removeEventListener('unmute', b(d(a), xt, 'f')),
            null === (r = b(d(a), ot, 'f')) ||
              void 0 === r ||
              r.removeEventListener('ended', b(d(a), xt, 'f')));
        }),
        Mt.set(d(a), function () {
          for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++)
            t[n] = arguments[n];
          return w(d(a), [].concat(t), void 0, function () {
            var e = this,
              t =
                arguments.length > 0 && void 0 !== arguments[0]
                  ? arguments[0]
                  : 0,
              n = arguments.length > 1 ? arguments[1] : void 0,
              i = arguments.length > 2 ? arguments[2] : void 0;
            return r().mark(function o() {
              var a, s, c, u, l;
              return r().wrap(function (r) {
                for (;;)
                  switch ((r.prev = r.next)) {
                    case 0:
                      if (
                        ((s = t <= 0), b(e, _t, 'f').call(e), b(e, ct, 'f'))
                      ) {
                        r.next = 5;
                        break;
                      }
                      return (
                        je.record(K.warn, 'none scriptProcessor'),
                        r.abrupt('return')
                      );
                    case 5:
                      return (
                        _(
                          e,
                          at,
                          new Promise(function (t) {
                            _(e, st, { resolve: t }, 'f');
                          }),
                          'f'
                        ),
                        (r.next = 8),
                        At.getUserMedia({
                          audio: {
                            noiseSuppression: !0,
                            echoCancellation: !0,
                            autoGainControl: !0,
                          },
                          video: !1,
                        })
                      );
                    case 8:
                      ((c = r.sent),
                        _(e, it, c, 'f'),
                        (u = _(
                          e,
                          ot,
                          c.getAudioTracks()[0],
                          'f'
                        )).addEventListener('mute', b(e, xt, 'f')),
                        u.addEventListener('unmute', b(e, kt, 'f')),
                        u.addEventListener('ended', b(e, jt, 'f')),
                        c.addEventListener('addtrack', function () {
                          je.record(K.verbose, 'addtrack');
                        }),
                        c.addEventListener('removetrack', function () {
                          je.record(K.verbose, 'removetrack');
                        }),
                        _(e, ft, !1, 'f'),
                        _(e, pt, !1, 'f'),
                        _(e, nt, b(e, Ye, 'f').createMediaStreamSource(c), 'f'),
                        (l = []),
                        (null === (a = b(e, rt, 'f')) || void 0 === a
                          ? void 0
                          : a.analyser) &&
                          b(e, Qe, 'f') &&
                          l.push(b(e, Qe, 'f')),
                        b(e, ct, 'f') && l.push(b(e, ct, 'f')),
                        b(e, Je, 'm', St).call(e, l),
                        _(e, tt, l, 'f'),
                        _(e, dt, !0, 'f'),
                        _(e, yt, s, 'f'),
                        _(e, mt, I({ nlp: !0 }, i || {}), 'f'),
                        _(e, gt, n, 'f'),
                        s ||
                          _(
                            e,
                            ht,
                            setTimeout(
                              function () {
                                e.stopRecord();
                              },
                              t || b(e, vt, 'f')
                            ),
                            'f'
                          ));
                    case 29:
                    case 'end':
                      return r.stop();
                  }
              }, o);
            })();
          });
        }),
        _(d(a), rt, Object.assign(Object.assign({}, b(d(a), rt, 'f')), t), 'f'),
        a
      );
    }
    return (
      c(n, Ge),
      s(
        n,
        [
          {
            key: 'recording',
            get: function () {
              return b(this, dt, 'f') || !1;
            },
          },
          {
            key: 'byteTimeDomainData',
            get: function () {
              var e, t;
              if (b(this, dt, 'f')) {
                if (b(this, Qe, 'f'))
                  return (
                    b(this, et, 'f') ||
                      _(
                        this,
                        et,
                        new Uint8Array(
                          (null === (e = b(this, Qe, 'f')) || void 0 === e
                            ? void 0
                            : e.frequencyBinCount) || 0
                        ),
                        'f'
                      ),
                    null === (t = b(this, Qe, 'f')) ||
                      void 0 === t ||
                      t.getByteTimeDomainData(b(this, et, 'f')),
                    b(this, et, 'f')
                  );
                je.record(K.error, 'none analyser inited');
              }
            },
          },
          {
            key: 'startRecord',
            value: function (e, t, n) {
              return w(
                this,
                void 0,
                void 0,
                r().mark(function i() {
                  var o,
                    a,
                    s = this;
                  return r().wrap(
                    function (r) {
                      for (;;)
                        switch ((r.prev = r.next)) {
                          case 0:
                            if (!b(this, dt, 'f')) {
                              r.next = 3;
                              break;
                            }
                            return (
                              je.record(
                                K.warn,
                                '[recorder]',
                                'conflicted recorder start'
                              ),
                              r.abrupt('return')
                            );
                          case 3:
                            if (window.isSecureContext) {
                              r.next = 5;
                              break;
                            }
                            return r.abrupt(
                              'return',
                              Promise.reject(
                                new P(re.message, re.code, $.UserMediaError)
                              )
                            );
                          case 5:
                            return (
                              (r.next = 7),
                              new Promise(function (e, t) {
                                (b(s, Ye, 'f')
                                  .resume()
                                  .then(e)
                                  .catch(function (e) {
                                    (je.record(K.error, '[resume]', e),
                                      t(
                                        new P(
                                          se.message,
                                          se.code,
                                          $.UserMediaError
                                        )
                                      ));
                                  }),
                                  setTimeout(function () {
                                    t(
                                      new P(
                                        ue.message,
                                        ue.code,
                                        $.UserMediaError
                                      )
                                    );
                                  }, 1500));
                              })
                            );
                          case 7:
                            return (
                              b(this, wt, 'f').call(this),
                              (r.prev = 8),
                              (r.next = 11),
                              b(this, Mt, 'f').call(this, e, t, n)
                            );
                          case 11:
                            r.next = 17;
                            break;
                          case 13:
                            throw (
                              (r.prev = 13),
                              (r.t0 = r.catch(8)),
                              _(this, dt, !1, 'f'),
                              r.t0
                            );
                          case 17:
                            return (
                              (r.prev = 17),
                              null ===
                                (a =
                                  null === (o = b(this, st, 'f')) ||
                                  void 0 === o
                                    ? void 0
                                    : o.resolve) ||
                                void 0 === a ||
                                a.call(o),
                              r.finish(17)
                            );
                          case 20:
                          case 'end':
                            return r.stop();
                        }
                    },
                    i,
                    this,
                    [[8, 13, 17, 20]]
                  );
                })
              );
            },
          },
          {
            key: 'stopRecord',
            value: function () {
              var e = this,
                t = Object.create(null, {
                  emitSync: {
                    get: function () {
                      return v(u(n.prototype), 'emitSync', e);
                    },
                  },
                });
              return w(this, arguments, void 0, function () {
                var e = this,
                  n =
                    arguments.length > 0 &&
                    void 0 !== arguments[0] &&
                    arguments[0];
                return r().mark(function i() {
                  var o, a, s, c, u, l, f;
                  return r().wrap(function (r) {
                    for (;;)
                      switch ((r.prev = r.next)) {
                        case 0:
                          return ((r.next = 2), b(e, at, 'f'));
                        case 2:
                          if (b(e, dt, 'f')) {
                            r.next = 4;
                            break;
                          }
                          return r.abrupt('return');
                        case 4:
                          for (
                            clearTimeout(b(e, ht, 'f')),
                              _(e, dt, !1, 'f'),
                              b(e, Ot, 'f').call(e),
                              u =
                                null === (o = b(e, it, 'f')) || void 0 === o
                                  ? void 0
                                  : o.getAudioTracks(),
                              l = 0,
                              f = (null == u ? void 0 : u.length) || 0;
                            l < f;
                            l++
                          )
                            null === (a = null == u ? void 0 : u[l]) ||
                              void 0 === a ||
                              a.stop();
                          (_(e, pt, !0, 'f'),
                            (!0 !== n && 0 !== b(e, lt, 'f')) ||
                              (t.emitSync.call(e, $e.recoder_audio, {
                                s16buffer: new ArrayBuffer(2),
                                frameStatus: x.end,
                                fullDuplex:
                                  null !== (s = b(e, yt, 'f')) &&
                                  void 0 !== s &&
                                  s,
                                extend: Object.assign(
                                  { sampleRate: e.sampleRate },
                                  I(b(e, mt, 'f') || {}, {})
                                ),
                              }),
                              !0 === n && b(e, bt, 'f').call(e)));
                          try {
                            b(e, Je, 'm', Et).call(e, b(e, tt, 'f'));
                          } catch (e) {
                            je.record(K.warn, '[disconnect media]', e);
                          } finally {
                            _(e, tt, [], 'f');
                          }
                          (null === (c = b(e, gt, 'f')) ||
                            void 0 === c ||
                            c.call(e),
                            _(e, gt, void 0, 'f'));
                        case 14:
                        case 'end':
                          return r.stop();
                      }
                  }, i);
                })();
              });
            },
          },
          {
            key: 'switchDevice',
            value: function (e) {
              return w(
                this,
                void 0,
                void 0,
                r().mark(function t() {
                  var n, i;
                  return r().wrap(
                    function (t) {
                      for (;;)
                        switch ((t.prev = t.next)) {
                          case 0:
                            if (b(this, ct, 'f')) {
                              t.next = 2;
                              break;
                            }
                            return t.abrupt('return');
                          case 2:
                            return (
                              (t.next = 4),
                              At.getUserMedia({
                                audio: {
                                  deviceId: { exact: e },
                                  noiseSuppression: !0,
                                  echoCancellation: !0,
                                },
                                video: !1,
                              })
                            );
                          case 4:
                            ((i = t.sent),
                              b(this, Je, 'm', Et).call(this, b(this, tt, 'f')),
                              b(this, Ot, 'f').call(this),
                              null === (n = b(this, it, 'f')) ||
                                void 0 === n ||
                                n.getAudioTracks().forEach(function (e) {
                                  return e.stop();
                                }),
                              _(this, it, i, 'f'),
                              _(
                                this,
                                nt,
                                b(this, Ye, 'f').createMediaStreamSource(i),
                                'f'
                              ),
                              b(this, Je, 'm', St).call(
                                this,
                                b(this, tt, 'f')
                              ));
                          case 11:
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
            key: 'destroy',
            value: function () {
              (_(this, Xe, !0, 'f'),
                this.stopRecord(),
                v(u(n.prototype), 'destroy', this).call(this));
            },
          },
          {
            key: 'isDestroyed',
            value: function () {
              return b(this, Xe, 'f');
            },
          },
          {
            key: 'sampleRate',
            get: function () {
              return b(this, rt, 'f').sampleRate || 16e3;
            },
          },
        ],
        [
          {
            key: 'getVersion',
            value: function () {
              return '3.1.2-1002';
            },
          },
          {
            key: 'setLogLevel',
            value: function (e) {
              je.setLogLevel(e);
            },
          },
        ]
      ),
      n
    );
  })();
((Xe = new WeakMap()),
  (Ye = new WeakMap()),
  (Qe = new WeakMap()),
  (et = new WeakMap()),
  (tt = new WeakMap()),
  (rt = new WeakMap()),
  (nt = new WeakMap()),
  (it = new WeakMap()),
  (ot = new WeakMap()),
  (at = new WeakMap()),
  (st = new WeakMap()),
  (ct = new WeakMap()),
  (ut = new WeakMap()),
  (lt = new WeakMap()),
  (ft = new WeakMap()),
  (dt = new WeakMap()),
  (vt = new WeakMap()),
  (ht = new WeakMap()),
  (pt = new WeakMap()),
  (yt = new WeakMap()),
  (mt = new WeakMap()),
  (gt = new WeakMap()),
  (wt = new WeakMap()),
  (bt = new WeakMap()),
  (_t = new WeakMap()),
  (xt = new WeakMap()),
  (kt = new WeakMap()),
  (jt = new WeakMap()),
  (Ot = new WeakMap()),
  (Mt = new WeakMap()),
  (Je = new WeakSet()),
  (St = function (e) {
    var t, r;
    if (!e.length)
      return (
        _(this, tt, [], 'f'),
        null === (t = b(this, nt, 'f')) || void 0 === t
          ? void 0
          : t.connect(b(this, Ye, 'f').destination)
      );
    null === (r = b(this, nt, 'f')) || void 0 === r || r.connect(e[0]);
    for (var n = 1; n < e.length; n++) e[n - 1].connect(e[n]);
    e[e.length - 1].connect(b(this, Ye, 'f').destination);
  }),
  (Et = function (e) {
    var t, r;
    if (!(null == e ? void 0 : e.length))
      return null === (t = b(this, nt, 'f')) || void 0 === t
        ? void 0
        : t.disconnect(b(this, Ye, 'f').destination);
    null === (r = b(this, nt, 'f')) || void 0 === r || r.disconnect(e[0]);
    for (var n = 1; n < e.length; n++) e[n - 1].disconnect(e[n]);
    e[e.length - 1].disconnect(b(this, Ye, 'f').destination);
  }));
var Wt = [
  'src',
  'img',
  'video',
  'link',
  'txt',
  'action',
  'cmd',
  'options',
  'h5_url',
];
function Tt(e) {
  var t = !1;
  return (function () {
    var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : '';
    return e && '[object String]' === Object.prototype.toString.call(e)
      ? e.replace(/\[={0,1}([a-zA-Z_-])+\d*:?-?\d*\]/g, '')
      : e || '';
  })(e)
    .replace(
      /(\[打招呼\])|(\[鞠躬\])|(\[左手点赞\])|(\[右手点赞\])|(\[双手比心\])|(\[拜拜\])|(\[看上边摄像头\])|(\[放交通卡\])|(\[左边出口\])|(\[右边出口\])|(\[左上内容-单手\])|(\[左中内容-单手\])|(\[左下内容-单手\])|(\[右上内容-单手\])|(\[右中内容-单手\])|(\[右下内容-单手\])|(\[左上内容-双手\])|(\[左中内容-双手\])|(\[左下内容-双手\])|(\[右上内容-双手\])|(\[右中内容-双手\])|(\[右下内容-双手\])|(\[展开双手\])|(\[聆听点头\])|(\[轻微摇头\])|(\[双手放下\])/g,
      ''
    )
    .replace(/\[\[(\w+)=(((?!\]\]).)+)\]\]/g, function (e, t) {
      return -1 === Wt.indexOf(t) ? '' : e;
    })
    .replace(
      /(\[\[txt=[^\[\]]+\]\])|(\[\[cmd=[^\[\]]+\]\])|(\[\[action=[^\[\]]+\]\])|(\[\[txt=(((?!\]\]).)+)\]\])/g,
      ''
    )
    .replace(/\[\[link=([^\[\]]+)\]\]/g, function (e, t) {
      return '<a class="llm-content-link" target="_blank"  href="'
        .concat(encodeURI(t), '">')
        .concat(t, '</a>');
    })
    .replace(/\[\[h5_url=([^\[\]]+)\]\]/g, function (e, t) {
      return '<div class="llm-content-iframe"><iframe class="content-iframe" src="'.concat(
        encodeURI(t),
        '" frameborder="no" border="0" marginwidth="0" marginheight="0" allowtransparency="yes"></iframe></div>'
      );
    })
    .replace(/\[\[(src|img)=(((?!\]\]).)+)\]\]/g, function (e, t) {
      var r =
          arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : '',
        n = r.split(';');
      r = n[0].replace('ceph.xfyousheng.com', 'ossbj.xfinfr.com');
      for (var i = {}, o = 1; o < n.length; o++) {
        var a = h(n[o].split('='), 2),
          s = a[0],
          c = a[1];
        i[s] = c;
      }
      return '<div class="llm-content-img"  style="width:'
        .concat(i.width || 100, '%;" ><img src=\'')
        .concat(
          r,
          '\' onload="globalImgLoad(this)" onerror="globalImgError(this)"></div>'
        );
    })
    .replace(/\[\[video=(((?!\]\]).)+)\]\]/g, function (e) {
      var r =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : '',
        n = r.split(';');
      if (1 === n.length)
        return t
          ? ''
          : ((t = !0),
            "<div class=\"llm-content-video\">\n                        <video \n                          onloadstart='imVideoWaiting(this)'\n                          ontimeupdate='imVideoPlaying(this)'\n                          onwaiting='imVideoWaiting(this)'\n                          onended='imVideoEnded(this)' \n                          onerror='imVideoError(this)' \n                          onplay='imVideoPlay(this)' \n                          onplaying='imVideoPlaying(this)' \n                          webkit-playsinline \n                          playsinline \n                          x5-playsinline \n                          autoplay=\"autoplay\"  \n                          preload=\"auto\" \n                          src='".concat(
              r,
              '\' \n                          loop=\'loop\'\n                          controls\n                          class="content-video">\n                        </video>\n                        <div class="loading-icon">\n                          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="60px" height="60px" viewBox="0 0 40 40" enable-background="new 0 0 40 40" xml:space="preserve">\n                            <path opacity="0.2" fill="#FF6700" d="M20.201,5.169c-8.254,0-14.946,6.692-14.946,14.946c0,8.255,6.692,14.946,14.946,14.946\n                                s14.946-6.691,14.946-14.946C35.146,11.861,28.455,5.169,20.201,5.169z M20.201,31.749c-6.425,0-11.634-5.208-11.634-11.634\n                                c0-6.425,5.209-11.634,11.634-11.634c6.425,0,11.633,5.209,11.633,11.634C31.834,26.541,26.626,31.749,20.201,31.749z"></path>\n                            <path fill="#FF6700" d="M26.013,10.047l1.654-2.866c-2.198-1.272-4.743-2.012-7.466-2.012h0v3.312h0\n                                C22.32,8.481,24.301,9.057,26.013,10.047z" transform="rotate(42.1171 20 20)">\n                                <animateTransform attributeType="xml" attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="0.5s" repeatCount="indefinite"></animateTransform>\n                            </path>\n                          </svg>\n                        </div>\n                      </div>'
            ));
      if (2 === n.length) {
        if (t) return '';
        t = !0;
        var i = n[1] || '';
        return (
          (i = Number(i.split('=')[1])),
          (r = n[0]),
          1 === i
            ? "<div class=\"llm-content-video\">\n                          <video  \n                            onloadstart='imVideoWaiting(this)'\n                            ontimeupdate='imVideoPlaying(this)'\n                            onwaiting='imVideoWaiting(this)'\n                            onended='imVideoEnded(this)' \n                            onerror='imVideoError(this)' \n                            onplay='imVideoPlay(this)' \n                            onplaying='imVideoPlaying(this)' \n                            webkit-playsinline \n                            playsinline \n                            x5-playsinline \n                            autoplay=\"autoplay\"  \n                            preload=\"auto\" \n                            src='".concat(
                r,
                '\' \n                            muted \n                            loop=\'loop\'\n                            style="width:100%;" \n                            controls\n                            class="content-video">\n                          </video>\n                          <div class="loading-icon">\n                            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="60px" height="60px" viewBox="0 0 40 40" enable-background="new 0 0 40 40" xml:space="preserve">\n                              <path opacity="0.2" fill="#FF6700" d="M20.201,5.169c-8.254,0-14.946,6.692-14.946,14.946c0,8.255,6.692,14.946,14.946,14.946\n                                  s14.946-6.691,14.946-14.946C35.146,11.861,28.455,5.169,20.201,5.169z M20.201,31.749c-6.425,0-11.634-5.208-11.634-11.634\n                                  c0-6.425,5.209-11.634,11.634-11.634c6.425,0,11.633,5.209,11.633,11.634C31.834,26.541,26.626,31.749,20.201,31.749z"></path>\n                              <path fill="#FF6700" d="M26.013,10.047l1.654-2.866c-2.198-1.272-4.743-2.012-7.466-2.012h0v3.312h0\n                                  C22.32,8.481,24.301,9.057,26.013,10.047z" transform="rotate(42.1171 20 20)">\n                                  <animateTransform attributeType="xml" attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="0.5s" repeatCount="indefinite"></animateTransform>\n                              </path>\n                            </svg>\n                          </div>\n                        </div>'
              )
            : "<div class=\"llm-content-video\">\n                          <video \n                            onloadstart='imVideoWaiting(this)'\n                            ontimeupdate='imVideoPlaying(this)'\n                            onwaiting='imVideoWaiting(this)'\n                            onended='imVideoEnded(this)' \n                            onerror='imVideoError(this)' \n                            onplay='imVideoPlay(this)' \n                            onplaying='imVideoPlaying(this)' \n                            webkit-playsinline \n                            playsinline \n                            x5-playsinline \n                            autoplay=\"autoplay\"  \n                            preload=\"auto\" \n                            src='".concat(
                r,
                '\' \n                            loop=\'loop\'\n                            controls\n                            class="content-video">\n                          </video>\n                          <div class="loading-icon">\n                            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="60px" height="60px" viewBox="0 0 40 40" enable-background="new 0 0 40 40" xml:space="preserve">\n                              <path opacity="0.2" fill="#FF6700" d="M20.201,5.169c-8.254,0-14.946,6.692-14.946,14.946c0,8.255,6.692,14.946,14.946,14.946\n                                  s14.946-6.691,14.946-14.946C35.146,11.861,28.455,5.169,20.201,5.169z M20.201,31.749c-6.425,0-11.634-5.208-11.634-11.634\n                                  c0-6.425,5.209-11.634,11.634-11.634c6.425,0,11.633,5.209,11.633,11.634C31.834,26.541,26.626,31.749,20.201,31.749z"></path>\n                              <path fill="#FF6700" d="M26.013,10.047l1.654-2.866c-2.198-1.272-4.743-2.012-7.466-2.012h0v3.312h0\n                                  C22.32,8.481,24.301,9.057,26.013,10.047z" transform="rotate(42.1171 20 20)">\n                                  <animateTransform attributeType="xml" attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="0.5s" repeatCount="indefinite"></animateTransform>\n                              </path>\n                            </svg>\n                          </div>\n                        </div>'
              )
        );
      }
      return e;
    });
}
var It =
  'undefined' != typeof globalThis
    ? globalThis
    : 'undefined' != typeof window
      ? window
      : 'undefined' != typeof global
        ? global
        : 'undefined' != typeof self
          ? self
          : {};
function Ct(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, 'default')
    ? e.default
    : e;
}
function Lt(e) {
  if (e.__esModule) return e;
  var t = e.default;
  if ('function' == typeof t) {
    var r = function e() {
      return this instanceof e
        ? Reflect.construct(t, arguments, this.constructor)
        : t.apply(this, arguments);
    };
    r.prototype = t.prototype;
  } else r = {};
  return (
    Object.defineProperty(r, '__esModule', { value: !0 }),
    Object.keys(e).forEach(function (t) {
      var n = Object.getOwnPropertyDescriptor(e, t);
      Object.defineProperty(
        r,
        t,
        n.get
          ? n
          : {
              enumerable: !0,
              get: function () {
                return e[t];
              },
            }
      );
    }),
    r
  );
}
var Rt = { exports: {} };
function Ut(e) {
  throw new Error(
    'Could not dynamically require "' +
      e +
      '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.'
  );
}
var zt,
  Bt = { exports: {} },
  Ft = Lt(Object.freeze({ __proto__: null, default: {} }));
function Dt() {
  return (
    zt ||
      ((zt = 1),
      (Bt.exports =
        ((e =
          e ||
          (function (e, t) {
            var r;
            if (
              ('undefined' != typeof window &&
                window.crypto &&
                (r = window.crypto),
              'undefined' != typeof self && self.crypto && (r = self.crypto),
              'undefined' != typeof globalThis &&
                globalThis.crypto &&
                (r = globalThis.crypto),
              !r &&
                'undefined' != typeof window &&
                window.msCrypto &&
                (r = window.msCrypto),
              !r && void 0 !== It && It.crypto && (r = It.crypto),
              !r)
            )
              try {
                r = Ft;
              } catch (e) {}
            var n = function () {
                if (r) {
                  if ('function' == typeof r.getRandomValues)
                    try {
                      return r.getRandomValues(new Uint32Array(1))[0];
                    } catch (e) {}
                  if ('function' == typeof r.randomBytes)
                    try {
                      return r.randomBytes(4).readInt32LE();
                    } catch (e) {}
                }
                throw new Error(
                  'Native crypto module could not be used to get secure random number.'
                );
              },
              i =
                Object.create ||
                (function () {
                  function e() {}
                  return function (t) {
                    var r;
                    return (
                      (e.prototype = t),
                      (r = new e()),
                      (e.prototype = null),
                      r
                    );
                  };
                })(),
              o = {},
              a = (o.lib = {}),
              s = (a.Base = {
                extend: function (e) {
                  var t = i(this);
                  return (
                    e && t.mixIn(e),
                    (t.hasOwnProperty('init') && this.init !== t.init) ||
                      (t.init = function () {
                        t.$super.init.apply(this, arguments);
                      }),
                    (t.init.prototype = t),
                    (t.$super = this),
                    t
                  );
                },
                create: function () {
                  var e = this.extend();
                  return (e.init.apply(e, arguments), e);
                },
                init: function () {},
                mixIn: function (e) {
                  for (var t in e) e.hasOwnProperty(t) && (this[t] = e[t]);
                  e.hasOwnProperty('toString') && (this.toString = e.toString);
                },
                clone: function () {
                  return this.init.prototype.extend(this);
                },
              }),
              c = (a.WordArray = s.extend({
                init: function (e, r) {
                  ((e = this.words = e || []),
                    (this.sigBytes = r != t ? r : 4 * e.length));
                },
                toString: function (e) {
                  return (e || l).stringify(this);
                },
                concat: function (e) {
                  var t = this.words,
                    r = e.words,
                    n = this.sigBytes,
                    i = e.sigBytes;
                  if ((this.clamp(), n % 4))
                    for (var o = 0; o < i; o++) {
                      var a = (r[o >>> 2] >>> (24 - (o % 4) * 8)) & 255;
                      t[(n + o) >>> 2] |= a << (24 - ((n + o) % 4) * 8);
                    }
                  else
                    for (var s = 0; s < i; s += 4)
                      t[(n + s) >>> 2] = r[s >>> 2];
                  return ((this.sigBytes += i), this);
                },
                clamp: function () {
                  var t = this.words,
                    r = this.sigBytes;
                  ((t[r >>> 2] &= 4294967295 << (32 - (r % 4) * 8)),
                    (t.length = e.ceil(r / 4)));
                },
                clone: function () {
                  var e = s.clone.call(this);
                  return ((e.words = this.words.slice(0)), e);
                },
                random: function (e) {
                  for (var t = [], r = 0; r < e; r += 4) t.push(n());
                  return new c.init(t, e);
                },
              })),
              u = (o.enc = {}),
              l = (u.Hex = {
                stringify: function (e) {
                  for (
                    var t = e.words, r = e.sigBytes, n = [], i = 0;
                    i < r;
                    i++
                  ) {
                    var o = (t[i >>> 2] >>> (24 - (i % 4) * 8)) & 255;
                    (n.push((o >>> 4).toString(16)),
                      n.push((15 & o).toString(16)));
                  }
                  return n.join('');
                },
                parse: function (e) {
                  for (var t = e.length, r = [], n = 0; n < t; n += 2)
                    r[n >>> 3] |=
                      parseInt(e.substr(n, 2), 16) << (24 - (n % 8) * 4);
                  return new c.init(r, t / 2);
                },
              }),
              f = (u.Latin1 = {
                stringify: function (e) {
                  for (
                    var t = e.words, r = e.sigBytes, n = [], i = 0;
                    i < r;
                    i++
                  ) {
                    var o = (t[i >>> 2] >>> (24 - (i % 4) * 8)) & 255;
                    n.push(String.fromCharCode(o));
                  }
                  return n.join('');
                },
                parse: function (e) {
                  for (var t = e.length, r = [], n = 0; n < t; n++)
                    r[n >>> 2] |= (255 & e.charCodeAt(n)) << (24 - (n % 4) * 8);
                  return new c.init(r, t);
                },
              }),
              d = (u.Utf8 = {
                stringify: function (e) {
                  try {
                    return decodeURIComponent(escape(f.stringify(e)));
                  } catch (e) {
                    throw new Error('Malformed UTF-8 data');
                  }
                },
                parse: function (e) {
                  return f.parse(unescape(encodeURIComponent(e)));
                },
              }),
              v = (a.BufferedBlockAlgorithm = s.extend({
                reset: function () {
                  ((this._data = new c.init()), (this._nDataBytes = 0));
                },
                _append: function (e) {
                  ('string' == typeof e && (e = d.parse(e)),
                    this._data.concat(e),
                    (this._nDataBytes += e.sigBytes));
                },
                _process: function (t) {
                  var r,
                    n = this._data,
                    i = n.words,
                    o = n.sigBytes,
                    a = this.blockSize,
                    s = o / (4 * a),
                    u =
                      (s = t
                        ? e.ceil(s)
                        : e.max((0 | s) - this._minBufferSize, 0)) * a,
                    l = e.min(4 * u, o);
                  if (u) {
                    for (var f = 0; f < u; f += a) this._doProcessBlock(i, f);
                    ((r = i.splice(0, u)), (n.sigBytes -= l));
                  }
                  return new c.init(r, l);
                },
                clone: function () {
                  var e = s.clone.call(this);
                  return ((e._data = this._data.clone()), e);
                },
                _minBufferSize: 0,
              }));
            a.Hasher = v.extend({
              cfg: s.extend(),
              init: function (e) {
                ((this.cfg = this.cfg.extend(e)), this.reset());
              },
              reset: function () {
                (v.reset.call(this), this._doReset());
              },
              update: function (e) {
                return (this._append(e), this._process(), this);
              },
              finalize: function (e) {
                return (e && this._append(e), this._doFinalize());
              },
              blockSize: 16,
              _createHelper: function (e) {
                return function (t, r) {
                  return new e.init(r).finalize(t);
                };
              },
              _createHmacHelper: function (e) {
                return function (t, r) {
                  return new h.HMAC.init(e, r).finalize(t);
                };
              },
            });
            var h = (o.algo = {});
            return o;
          })(Math)),
        e))),
    Bt.exports
  );
  var e;
}
var Nt,
  qt = { exports: {} };
function Vt() {
  return Nt
    ? qt.exports
    : ((Nt = 1),
      (qt.exports =
        ((e = Dt()),
        (function (t) {
          var r = e,
            n = r.lib,
            i = n.WordArray,
            o = n.Hasher,
            a = r.algo,
            s = [],
            c = [];
          !(function () {
            function e(e) {
              for (var r = t.sqrt(e), n = 2; n <= r; n++)
                if (!(e % n)) return !1;
              return !0;
            }
            function r(e) {
              return (4294967296 * (e - (0 | e))) | 0;
            }
            for (var n = 2, i = 0; i < 64; )
              (e(n) &&
                (i < 8 && (s[i] = r(t.pow(n, 0.5))),
                (c[i] = r(t.pow(n, 1 / 3))),
                i++),
                n++);
          })();
          var u = [],
            l = (a.SHA256 = o.extend({
              _doReset: function () {
                this._hash = new i.init(s.slice(0));
              },
              _doProcessBlock: function (e, t) {
                for (
                  var r = this._hash.words,
                    n = r[0],
                    i = r[1],
                    o = r[2],
                    a = r[3],
                    s = r[4],
                    l = r[5],
                    f = r[6],
                    d = r[7],
                    v = 0;
                  v < 64;
                  v++
                ) {
                  if (v < 16) u[v] = 0 | e[t + v];
                  else {
                    var h = u[v - 15],
                      p =
                        ((h << 25) | (h >>> 7)) ^
                        ((h << 14) | (h >>> 18)) ^
                        (h >>> 3),
                      y = u[v - 2],
                      m =
                        ((y << 15) | (y >>> 17)) ^
                        ((y << 13) | (y >>> 19)) ^
                        (y >>> 10);
                    u[v] = p + u[v - 7] + m + u[v - 16];
                  }
                  var g = (n & i) ^ (n & o) ^ (i & o),
                    w =
                      ((n << 30) | (n >>> 2)) ^
                      ((n << 19) | (n >>> 13)) ^
                      ((n << 10) | (n >>> 22)),
                    b =
                      d +
                      (((s << 26) | (s >>> 6)) ^
                        ((s << 21) | (s >>> 11)) ^
                        ((s << 7) | (s >>> 25))) +
                      ((s & l) ^ (~s & f)) +
                      c[v] +
                      u[v];
                  ((d = f),
                    (f = l),
                    (l = s),
                    (s = (a + b) | 0),
                    (a = o),
                    (o = i),
                    (i = n),
                    (n = (b + (w + g)) | 0));
                }
                ((r[0] = (r[0] + n) | 0),
                  (r[1] = (r[1] + i) | 0),
                  (r[2] = (r[2] + o) | 0),
                  (r[3] = (r[3] + a) | 0),
                  (r[4] = (r[4] + s) | 0),
                  (r[5] = (r[5] + l) | 0),
                  (r[6] = (r[6] + f) | 0),
                  (r[7] = (r[7] + d) | 0));
              },
              _doFinalize: function () {
                var e = this._data,
                  r = e.words,
                  n = 8 * this._nDataBytes,
                  i = 8 * e.sigBytes;
                return (
                  (r[i >>> 5] |= 128 << (24 - (i % 32))),
                  (r[14 + (((i + 64) >>> 9) << 4)] = t.floor(n / 4294967296)),
                  (r[15 + (((i + 64) >>> 9) << 4)] = n),
                  (e.sigBytes = 4 * r.length),
                  this._process(),
                  this._hash
                );
              },
              clone: function () {
                var e = o.clone.call(this);
                return ((e._hash = this._hash.clone()), e);
              },
            }));
          ((r.SHA256 = o._createHelper(l)),
            (r.HmacSHA256 = o._createHmacHelper(l)));
        })(Math),
        e.SHA256)));
  var e;
}
var Ht,
  Gt,
  $t = { exports: {} };
Rt.exports = (function (e) {
  return e.HmacSHA256;
})(
  Dt(),
  Vt(),
  Ht ||
    ((Ht = 1),
    ($t.exports =
      ((Gt = Dt()),
      void (function () {
        var e = Gt,
          t = e.lib.Base,
          r = e.enc.Utf8;
        e.algo.HMAC = t.extend({
          init: function (e, t) {
            ((e = this._hasher = new e.init()),
              'string' == typeof t && (t = r.parse(t)));
            var n = e.blockSize,
              i = 4 * n;
            (t.sigBytes > i && (t = e.finalize(t)), t.clamp());
            for (
              var o = (this._oKey = t.clone()),
                a = (this._iKey = t.clone()),
                s = o.words,
                c = a.words,
                u = 0;
              u < n;
              u++
            )
              ((s[u] ^= 1549556828), (c[u] ^= 909522486));
            ((o.sigBytes = a.sigBytes = i), this.reset());
          },
          reset: function () {
            var e = this._hasher;
            (e.reset(), e.update(this._iKey));
          },
          update: function (e) {
            return (this._hasher.update(e), this);
          },
          finalize: function (e) {
            var t = this._hasher,
              r = t.finalize(e);
            return (t.reset(), t.finalize(this._oKey.clone().concat(r)));
          },
        });
      })())))
);
var Kt = Ct(Rt.exports),
  Zt = { exports: {} };
Zt.exports = (function (e) {
  return (
    (function () {
      var t = e,
        r = t.lib.WordArray;
      function n(e, t, n) {
        for (var i = [], o = 0, a = 0; a < t; a++)
          if (a % 4) {
            var s =
              (n[e.charCodeAt(a - 1)] << ((a % 4) * 2)) |
              (n[e.charCodeAt(a)] >>> (6 - (a % 4) * 2));
            ((i[o >>> 2] |= s << (24 - (o % 4) * 8)), o++);
          }
        return r.create(i, o);
      }
      t.enc.Base64 = {
        stringify: function (e) {
          var t = e.words,
            r = e.sigBytes,
            n = this._map;
          e.clamp();
          for (var i = [], o = 0; o < r; o += 3)
            for (
              var a =
                  (((t[o >>> 2] >>> (24 - (o % 4) * 8)) & 255) << 16) |
                  (((t[(o + 1) >>> 2] >>> (24 - ((o + 1) % 4) * 8)) & 255) <<
                    8) |
                  ((t[(o + 2) >>> 2] >>> (24 - ((o + 2) % 4) * 8)) & 255),
                s = 0;
              s < 4 && o + 0.75 * s < r;
              s++
            )
              i.push(n.charAt((a >>> (6 * (3 - s))) & 63));
          var c = n.charAt(64);
          if (c) for (; i.length % 4; ) i.push(c);
          return i.join('');
        },
        parse: function (e) {
          var t = e.length,
            r = this._map,
            i = this._reverseMap;
          if (!i) {
            i = this._reverseMap = [];
            for (var o = 0; o < r.length; o++) i[r.charCodeAt(o)] = o;
          }
          var a = r.charAt(64);
          if (a) {
            var s = e.indexOf(a);
            -1 !== s && (t = s);
          }
          return n(e, t, i);
        },
        _map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
      };
    })(),
    e.enc.Base64
  );
})(Dt());
var Jt = Ct(Zt.exports),
  Xt = { exports: {} };
Xt.exports = (function (e) {
  return e.enc.Utf8;
})(Dt());
var Yt = Ct(Xt.exports);
function Qt(e, t, r) {
  var n = h(e.match(/^wss?:\/\/([^\/]+)(\/.*)/) || [], 3);
  n[0];
  var i = n[1],
    o = n[2],
    a = new Date().toUTCString(),
    s = 'host: '
      .concat(i, '\ndate: ')
      .concat(a, '\n')
      .concat('GET', ' ')
      .concat(o, ' HTTP/1.1'),
    c = Kt(s, r),
    u = Jt.stringify(c),
    l = 'api_key="'
      .concat(t, '", algorithm="')
      .concat('hmac-sha256', '", headers="')
      .concat('host date request-line', '", signature="')
      .concat(u, '"'),
    f = Jt.stringify(Yt.parse(l));
  return ''
    .concat(e, '?authorization=')
    .concat(f, '&date=')
    .concat(a, '&host=')
    .concat(i);
}
var er = function () {
  ((this.__data__ = []), (this.size = 0));
};
var tr = function (e, t) {
    return e === t || (e != e && t != t);
  },
  rr = tr;
var nr = function (e, t) {
    for (var r = e.length; r--; ) if (rr(e[r][0], t)) return r;
    return -1;
  },
  ir = nr,
  or = Array.prototype.splice;
var ar = nr;
var sr = nr;
var cr = nr;
var ur = er,
  lr = function (e) {
    var t = this.__data__,
      r = ir(t, e);
    return (
      !(r < 0) &&
      (r == t.length - 1 ? t.pop() : or.call(t, r, 1), --this.size, !0)
    );
  },
  fr = function (e) {
    var t = this.__data__,
      r = ar(t, e);
    return r < 0 ? void 0 : t[r][1];
  },
  dr = function (e) {
    return sr(this.__data__, e) > -1;
  },
  vr = function (e, t) {
    var r = this.__data__,
      n = cr(r, e);
    return (n < 0 ? (++this.size, r.push([e, t])) : (r[n][1] = t), this);
  };
function hr(e) {
  var t = -1,
    r = null == e ? 0 : e.length;
  for (this.clear(); ++t < r; ) {
    var n = e[t];
    this.set(n[0], n[1]);
  }
}
((hr.prototype.clear = ur),
  (hr.prototype.delete = lr),
  (hr.prototype.get = fr),
  (hr.prototype.has = dr),
  (hr.prototype.set = vr));
var pr = hr,
  yr = pr;
var mr = function () {
  ((this.__data__ = new yr()), (this.size = 0));
};
var gr = function (e) {
  var t = this.__data__,
    r = t.delete(e);
  return ((this.size = t.size), r);
};
var wr = function (e) {
  return this.__data__.get(e);
};
var br = function (e) {
    return this.__data__.has(e);
  },
  _r = 'object' == typeof It && It && It.Object === Object && It,
  xr = _r,
  kr = 'object' == typeof self && self && self.Object === Object && self,
  jr = xr || kr || Function('return this')(),
  Or = jr.Symbol,
  Mr = Or,
  Sr = Object.prototype,
  Er = Sr.hasOwnProperty,
  Ar = Sr.toString,
  Pr = Mr ? Mr.toStringTag : void 0;
var Wr = function (e) {
    var t = Er.call(e, Pr),
      r = e[Pr];
    try {
      e[Pr] = void 0;
      var n = !0;
    } catch (e) {}
    var i = Ar.call(e);
    return (n && (t ? (e[Pr] = r) : delete e[Pr]), i);
  },
  Tr = Object.prototype.toString;
var Ir = Wr,
  Cr = function (e) {
    return Tr.call(e);
  },
  Lr = Or ? Or.toStringTag : void 0;
var Rr = function (e) {
  return null == e
    ? void 0 === e
      ? '[object Undefined]'
      : '[object Null]'
    : Lr && Lr in Object(e)
      ? Ir(e)
      : Cr(e);
};
var Ur = function (e) {
    var t = typeof e;
    return null != e && ('object' == t || 'function' == t);
  },
  zr = Rr,
  Br = Ur;
var Fr,
  Dr = function (e) {
    if (!Br(e)) return !1;
    var t = zr(e);
    return (
      '[object Function]' == t ||
      '[object GeneratorFunction]' == t ||
      '[object AsyncFunction]' == t ||
      '[object Proxy]' == t
    );
  },
  Nr = jr['__core-js_shared__'],
  qr = (Fr = /[^.]+$/.exec((Nr && Nr.keys && Nr.keys.IE_PROTO) || ''))
    ? 'Symbol(src)_1.' + Fr
    : '';
var Vr = function (e) {
    return !!qr && qr in e;
  },
  Hr = Function.prototype.toString;
var Gr = function (e) {
    if (null != e) {
      try {
        return Hr.call(e);
      } catch (e) {}
      try {
        return e + '';
      } catch (e) {}
    }
    return '';
  },
  $r = Dr,
  Kr = Vr,
  Zr = Ur,
  Jr = Gr,
  Xr = /^\[object .+?Constructor\]$/,
  Yr = Function.prototype,
  Qr = Object.prototype,
  en = Yr.toString,
  tn = Qr.hasOwnProperty,
  rn = RegExp(
    '^' +
      en
        .call(tn)
        .replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
        .replace(
          /hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,
          '$1.*?'
        ) +
      '$'
  );
var nn = function (e) {
    return !(!Zr(e) || Kr(e)) && ($r(e) ? rn : Xr).test(Jr(e));
  },
  on = function (e, t) {
    return null == e ? void 0 : e[t];
  };
var an = function (e, t) {
    var r = on(e, t);
    return nn(r) ? r : void 0;
  },
  sn = an(jr, 'Map'),
  cn = an(Object, 'create'),
  un = cn;
var ln = function () {
  ((this.__data__ = un ? un(null) : {}), (this.size = 0));
};
var fn = function (e) {
    var t = this.has(e) && delete this.__data__[e];
    return ((this.size -= t ? 1 : 0), t);
  },
  dn = cn,
  vn = Object.prototype.hasOwnProperty;
var hn = function (e) {
    var t = this.__data__;
    if (dn) {
      var r = t[e];
      return '__lodash_hash_undefined__' === r ? void 0 : r;
    }
    return vn.call(t, e) ? t[e] : void 0;
  },
  pn = cn,
  yn = Object.prototype.hasOwnProperty;
var mn = cn;
var gn = ln,
  wn = fn,
  bn = hn,
  _n = function (e) {
    var t = this.__data__;
    return pn ? void 0 !== t[e] : yn.call(t, e);
  },
  xn = function (e, t) {
    var r = this.__data__;
    return (
      (this.size += this.has(e) ? 0 : 1),
      (r[e] = mn && void 0 === t ? '__lodash_hash_undefined__' : t),
      this
    );
  };
function kn(e) {
  var t = -1,
    r = null == e ? 0 : e.length;
  for (this.clear(); ++t < r; ) {
    var n = e[t];
    this.set(n[0], n[1]);
  }
}
((kn.prototype.clear = gn),
  (kn.prototype.delete = wn),
  (kn.prototype.get = bn),
  (kn.prototype.has = _n),
  (kn.prototype.set = xn));
var jn = kn,
  On = pr,
  Mn = sn;
var Sn = function (e) {
  var t = typeof e;
  return 'string' == t || 'number' == t || 'symbol' == t || 'boolean' == t
    ? '__proto__' !== e
    : null === e;
};
var En = function (e, t) {
    var r = e.__data__;
    return Sn(t) ? r['string' == typeof t ? 'string' : 'hash'] : r.map;
  },
  An = En;
var Pn = En;
var Wn = En;
var Tn = En;
var In = function () {
    ((this.size = 0),
      (this.__data__ = {
        hash: new jn(),
        map: new (Mn || On)(),
        string: new jn(),
      }));
  },
  Cn = function (e) {
    var t = An(this, e).delete(e);
    return ((this.size -= t ? 1 : 0), t);
  },
  Ln = function (e) {
    return Pn(this, e).get(e);
  },
  Rn = function (e) {
    return Wn(this, e).has(e);
  },
  Un = function (e, t) {
    var r = Tn(this, e),
      n = r.size;
    return (r.set(e, t), (this.size += r.size == n ? 0 : 1), this);
  };
function zn(e) {
  var t = -1,
    r = null == e ? 0 : e.length;
  for (this.clear(); ++t < r; ) {
    var n = e[t];
    this.set(n[0], n[1]);
  }
}
((zn.prototype.clear = In),
  (zn.prototype.delete = Cn),
  (zn.prototype.get = Ln),
  (zn.prototype.has = Rn),
  (zn.prototype.set = Un));
var Bn = pr,
  Fn = sn,
  Dn = zn;
var Nn = pr,
  qn = mr,
  Vn = gr,
  Hn = wr,
  Gn = br,
  $n = function (e, t) {
    var r = this.__data__;
    if (r instanceof Bn) {
      var n = r.__data__;
      if (!Fn || n.length < 199)
        return (n.push([e, t]), (this.size = ++r.size), this);
      r = this.__data__ = new Dn(n);
    }
    return (r.set(e, t), (this.size = r.size), this);
  };
function Kn(e) {
  var t = (this.__data__ = new Nn(e));
  this.size = t.size;
}
((Kn.prototype.clear = qn),
  (Kn.prototype.delete = Vn),
  (Kn.prototype.get = Hn),
  (Kn.prototype.has = Gn),
  (Kn.prototype.set = $n));
var Zn = Kn;
var Jn = function (e, t) {
    for (
      var r = -1, n = null == e ? 0 : e.length;
      ++r < n && !1 !== t(e[r], r, e);

    );
    return e;
  },
  Xn = an,
  Yn = (function () {
    try {
      var e = Xn(Object, 'defineProperty');
      return (e({}, '', {}), e);
    } catch (e) {}
  })();
var Qn = function (e, t, r) {
    '__proto__' == t && Yn
      ? Yn(e, t, { configurable: !0, enumerable: !0, value: r, writable: !0 })
      : (e[t] = r);
  },
  ei = Qn,
  ti = tr,
  ri = Object.prototype.hasOwnProperty;
var ni = function (e, t, r) {
    var n = e[t];
    (ri.call(e, t) && ti(n, r) && (void 0 !== r || t in e)) || ei(e, t, r);
  },
  ii = ni,
  oi = Qn;
var ai = function (e, t, r, n) {
  var i = !r;
  r || (r = {});
  for (var o = -1, a = t.length; ++o < a; ) {
    var s = t[o],
      c = n ? n(r[s], e[s], s, r, e) : void 0;
    (void 0 === c && (c = e[s]), i ? oi(r, s, c) : ii(r, s, c));
  }
  return r;
};
var si = function (e, t) {
  for (var r = -1, n = Array(e); ++r < e; ) n[r] = t(r);
  return n;
};
var ci = function (e) {
    return null != e && 'object' == typeof e;
  },
  ui = Rr,
  li = ci;
var fi = function (e) {
    return li(e) && '[object Arguments]' == ui(e);
  },
  di = ci,
  vi = Object.prototype,
  hi = vi.hasOwnProperty,
  pi = vi.propertyIsEnumerable,
  yi = fi(
    (function () {
      return arguments;
    })()
  )
    ? fi
    : function (e) {
        return di(e) && hi.call(e, 'callee') && !pi.call(e, 'callee');
      },
  mi = Array.isArray,
  gi = { exports: {} };
var wi = function () {
  return !1;
};
!(function (e, t) {
  var r = jr,
    n = wi,
    i = t && !t.nodeType && t,
    o = i && e && !e.nodeType && e,
    a = o && o.exports === i ? r.Buffer : void 0,
    s = (a ? a.isBuffer : void 0) || n;
  e.exports = s;
})(gi, gi.exports);
var bi = gi.exports,
  _i = /^(?:0|[1-9]\d*)$/;
var xi = function (e, t) {
  var r = typeof e;
  return (
    !!(t = null == t ? 9007199254740991 : t) &&
    ('number' == r || ('symbol' != r && _i.test(e))) &&
    e > -1 &&
    e % 1 == 0 &&
    e < t
  );
};
var ki = function (e) {
    return (
      'number' == typeof e && e > -1 && e % 1 == 0 && e <= 9007199254740991
    );
  },
  ji = Rr,
  Oi = ki,
  Mi = ci,
  Si = {};
((Si['[object Float32Array]'] =
  Si['[object Float64Array]'] =
  Si['[object Int8Array]'] =
  Si['[object Int16Array]'] =
  Si['[object Int32Array]'] =
  Si['[object Uint8Array]'] =
  Si['[object Uint8ClampedArray]'] =
  Si['[object Uint16Array]'] =
  Si['[object Uint32Array]'] =
    !0),
  (Si['[object Arguments]'] =
    Si['[object Array]'] =
    Si['[object ArrayBuffer]'] =
    Si['[object Boolean]'] =
    Si['[object DataView]'] =
    Si['[object Date]'] =
    Si['[object Error]'] =
    Si['[object Function]'] =
    Si['[object Map]'] =
    Si['[object Number]'] =
    Si['[object Object]'] =
    Si['[object RegExp]'] =
    Si['[object Set]'] =
    Si['[object String]'] =
    Si['[object WeakMap]'] =
      !1));
var Ei = function (e) {
  return Mi(e) && Oi(e.length) && !!Si[ji(e)];
};
var Ai = function (e) {
    return function (t) {
      return e(t);
    };
  },
  Pi = { exports: {} };
!(function (e, t) {
  var r = _r,
    n = t && !t.nodeType && t,
    i = n && e && !e.nodeType && e,
    o = i && i.exports === n && r.process,
    a = (function () {
      try {
        var e = i && i.require && i.require('util').types;
        return e || (o && o.binding && o.binding('util'));
      } catch (e) {}
    })();
  e.exports = a;
})(Pi, Pi.exports);
var Wi = Pi.exports,
  Ti = Ei,
  Ii = Ai,
  Ci = Wi && Wi.isTypedArray,
  Li = Ci ? Ii(Ci) : Ti,
  Ri = si,
  Ui = yi,
  zi = mi,
  Bi = bi,
  Fi = xi,
  Di = Li,
  Ni = Object.prototype.hasOwnProperty;
var qi = function (e, t) {
    var r = zi(e),
      n = !r && Ui(e),
      i = !r && !n && Bi(e),
      o = !r && !n && !i && Di(e),
      a = r || n || i || o,
      s = a ? Ri(e.length, String) : [],
      c = s.length;
    for (var u in e)
      (!t && !Ni.call(e, u)) ||
        (a &&
          ('length' == u ||
            (i && ('offset' == u || 'parent' == u)) ||
            (o && ('buffer' == u || 'byteLength' == u || 'byteOffset' == u)) ||
            Fi(u, c))) ||
        s.push(u);
    return s;
  },
  Vi = Object.prototype;
var Hi = function (e) {
  var t = e && e.constructor;
  return e === (('function' == typeof t && t.prototype) || Vi);
};
var Gi = function (e, t) {
    return function (r) {
      return e(t(r));
    };
  },
  $i = Gi(Object.keys, Object),
  Ki = Hi,
  Zi = $i,
  Ji = Object.prototype.hasOwnProperty;
var Xi = Dr,
  Yi = ki;
var Qi = function (e) {
    return null != e && Yi(e.length) && !Xi(e);
  },
  eo = qi,
  to = function (e) {
    if (!Ki(e)) return Zi(e);
    var t = [];
    for (var r in Object(e)) Ji.call(e, r) && 'constructor' != r && t.push(r);
    return t;
  },
  ro = Qi;
var no = function (e) {
    return ro(e) ? eo(e) : to(e);
  },
  io = ai,
  oo = no;
var ao = function (e, t) {
  return e && io(t, oo(t), e);
};
var so = Ur,
  co = Hi,
  uo = function (e) {
    var t = [];
    if (null != e) for (var r in Object(e)) t.push(r);
    return t;
  },
  lo = Object.prototype.hasOwnProperty;
var fo = qi,
  vo = function (e) {
    if (!so(e)) return uo(e);
    var t = co(e),
      r = [];
    for (var n in e) ('constructor' != n || (!t && lo.call(e, n))) && r.push(n);
    return r;
  },
  ho = Qi;
var po = function (e) {
    return ho(e) ? fo(e, !0) : vo(e);
  },
  yo = ai,
  mo = po;
var go = function (e, t) {
    return e && yo(t, mo(t), e);
  },
  wo = { exports: {} };
!(function (e, t) {
  var r = jr,
    n = t && !t.nodeType && t,
    i = n && e && !e.nodeType && e,
    o = i && i.exports === n ? r.Buffer : void 0,
    a = o ? o.allocUnsafe : void 0;
  e.exports = function (e, t) {
    if (t) return e.slice();
    var r = e.length,
      n = a ? a(r) : new e.constructor(r);
    return (e.copy(n), n);
  };
})(wo, wo.exports);
var bo = wo.exports;
var _o = function (e, t) {
  var r = -1,
    n = e.length;
  for (t || (t = Array(n)); ++r < n; ) t[r] = e[r];
  return t;
};
var xo = function () {
    return [];
  },
  ko = function (e, t) {
    for (var r = -1, n = null == e ? 0 : e.length, i = 0, o = []; ++r < n; ) {
      var a = e[r];
      t(a, r, e) && (o[i++] = a);
    }
    return o;
  },
  jo = xo,
  Oo = Object.prototype.propertyIsEnumerable,
  Mo = Object.getOwnPropertySymbols,
  So = Mo
    ? function (e) {
        return null == e
          ? []
          : ((e = Object(e)),
            ko(Mo(e), function (t) {
              return Oo.call(e, t);
            }));
      }
    : jo,
  Eo = ai,
  Ao = So;
var Po = function (e, t) {
  return Eo(e, Ao(e), t);
};
var Wo = function (e, t) {
    for (var r = -1, n = t.length, i = e.length; ++r < n; ) e[i + r] = t[r];
    return e;
  },
  To = Gi(Object.getPrototypeOf, Object),
  Io = Wo,
  Co = To,
  Lo = So,
  Ro = xo,
  Uo = Object.getOwnPropertySymbols
    ? function (e) {
        for (var t = []; e; ) (Io(t, Lo(e)), (e = Co(e)));
        return t;
      }
    : Ro,
  zo = ai,
  Bo = Uo;
var Fo = function (e, t) {
    return zo(e, Bo(e), t);
  },
  Do = Wo,
  No = mi;
var qo = function (e, t, r) {
    var n = t(e);
    return No(e) ? n : Do(n, r(e));
  },
  Vo = qo,
  Ho = So,
  Go = no;
var $o = function (e) {
    return Vo(e, Go, Ho);
  },
  Ko = qo,
  Zo = Uo,
  Jo = po;
var Xo = function (e) {
    return Ko(e, Jo, Zo);
  },
  Yo = an(jr, 'DataView'),
  Qo = sn,
  ea = an(jr, 'Promise'),
  ta = an(jr, 'Set'),
  ra = an(jr, 'WeakMap'),
  na = Rr,
  ia = Gr,
  oa = '[object Map]',
  aa = '[object Promise]',
  sa = '[object Set]',
  ca = '[object WeakMap]',
  ua = '[object DataView]',
  la = ia(Yo),
  fa = ia(Qo),
  da = ia(ea),
  va = ia(ta),
  ha = ia(ra),
  pa = na;
((Yo && pa(new Yo(new ArrayBuffer(1))) != ua) ||
  (Qo && pa(new Qo()) != oa) ||
  (ea && pa(ea.resolve()) != aa) ||
  (ta && pa(new ta()) != sa) ||
  (ra && pa(new ra()) != ca)) &&
  (pa = function (e) {
    var t = na(e),
      r = '[object Object]' == t ? e.constructor : void 0,
      n = r ? ia(r) : '';
    if (n)
      switch (n) {
        case la:
          return ua;
        case fa:
          return oa;
        case da:
          return aa;
        case va:
          return sa;
        case ha:
          return ca;
      }
    return t;
  });
var ya = pa,
  ma = Object.prototype.hasOwnProperty;
var ga = function (e) {
    var t = e.length,
      r = new e.constructor(t);
    return (
      t &&
        'string' == typeof e[0] &&
        ma.call(e, 'index') &&
        ((r.index = e.index), (r.input = e.input)),
      r
    );
  },
  wa = jr.Uint8Array;
var ba = function (e) {
    var t = new e.constructor(e.byteLength);
    return (new wa(t).set(new wa(e)), t);
  },
  _a = ba;
var xa = function (e, t) {
    var r = t ? _a(e.buffer) : e.buffer;
    return new e.constructor(r, e.byteOffset, e.byteLength);
  },
  ka = /\w*$/;
var ja = function (e) {
    var t = new e.constructor(e.source, ka.exec(e));
    return ((t.lastIndex = e.lastIndex), t);
  },
  Oa = Or ? Or.prototype : void 0,
  Ma = Oa ? Oa.valueOf : void 0;
var Sa = ba;
var Ea = ba,
  Aa = xa,
  Pa = ja,
  Wa = function (e) {
    return Ma ? Object(Ma.call(e)) : {};
  },
  Ta = function (e, t) {
    var r = t ? Sa(e.buffer) : e.buffer;
    return new e.constructor(r, e.byteOffset, e.length);
  };
var Ia = function (e, t, r) {
    var n = e.constructor;
    switch (t) {
      case '[object ArrayBuffer]':
        return Ea(e);
      case '[object Boolean]':
      case '[object Date]':
        return new n(+e);
      case '[object DataView]':
        return Aa(e, r);
      case '[object Float32Array]':
      case '[object Float64Array]':
      case '[object Int8Array]':
      case '[object Int16Array]':
      case '[object Int32Array]':
      case '[object Uint8Array]':
      case '[object Uint8ClampedArray]':
      case '[object Uint16Array]':
      case '[object Uint32Array]':
        return Ta(e, r);
      case '[object Map]':
      case '[object Set]':
        return new n();
      case '[object Number]':
      case '[object String]':
        return new n(e);
      case '[object RegExp]':
        return Pa(e);
      case '[object Symbol]':
        return Wa(e);
    }
  },
  Ca = Ur,
  La = Object.create,
  Ra = (function () {
    function e() {}
    return function (t) {
      if (!Ca(t)) return {};
      if (La) return La(t);
      e.prototype = t;
      var r = new e();
      return ((e.prototype = void 0), r);
    };
  })(),
  Ua = To,
  za = Hi;
var Ba = function (e) {
    return 'function' != typeof e.constructor || za(e) ? {} : Ra(Ua(e));
  },
  Fa = ya,
  Da = ci;
var Na = function (e) {
    return Da(e) && '[object Map]' == Fa(e);
  },
  qa = Ai,
  Va = Wi && Wi.isMap,
  Ha = Va ? qa(Va) : Na,
  Ga = ya,
  $a = ci;
var Ka = function (e) {
    return $a(e) && '[object Set]' == Ga(e);
  },
  Za = Ai,
  Ja = Wi && Wi.isSet,
  Xa = Ja ? Za(Ja) : Ka,
  Ya = Zn,
  Qa = Jn,
  es = ni,
  ts = ao,
  rs = go,
  ns = bo,
  is = _o,
  os = Po,
  as = Fo,
  ss = $o,
  cs = Xo,
  us = ya,
  ls = ga,
  fs = Ia,
  ds = Ba,
  vs = mi,
  hs = bi,
  ps = Ha,
  ys = Ur,
  ms = Xa,
  gs = no,
  ws = po,
  bs = '[object Arguments]',
  _s = '[object Function]',
  xs = '[object Object]',
  ks = {};
((ks[bs] =
  ks['[object Array]'] =
  ks['[object ArrayBuffer]'] =
  ks['[object DataView]'] =
  ks['[object Boolean]'] =
  ks['[object Date]'] =
  ks['[object Float32Array]'] =
  ks['[object Float64Array]'] =
  ks['[object Int8Array]'] =
  ks['[object Int16Array]'] =
  ks['[object Int32Array]'] =
  ks['[object Map]'] =
  ks['[object Number]'] =
  ks[xs] =
  ks['[object RegExp]'] =
  ks['[object Set]'] =
  ks['[object String]'] =
  ks['[object Symbol]'] =
  ks['[object Uint8Array]'] =
  ks['[object Uint8ClampedArray]'] =
  ks['[object Uint16Array]'] =
  ks['[object Uint32Array]'] =
    !0),
  (ks['[object Error]'] = ks[_s] = ks['[object WeakMap]'] = !1));
var js = function e(t, r, n, i, o, a) {
    var s,
      c = 1 & r,
      u = 2 & r,
      l = 4 & r;
    if ((n && (s = o ? n(t, i, o, a) : n(t)), void 0 !== s)) return s;
    if (!ys(t)) return t;
    var f = vs(t);
    if (f) {
      if (((s = ls(t)), !c)) return is(t, s);
    } else {
      var d = us(t),
        v = d == _s || '[object GeneratorFunction]' == d;
      if (hs(t)) return ns(t, c);
      if (d == xs || d == bs || (v && !o)) {
        if (((s = u || v ? {} : ds(t)), !c))
          return u ? as(t, rs(s, t)) : os(t, ts(s, t));
      } else {
        if (!ks[d]) return o ? t : {};
        s = fs(t, d, c);
      }
    }
    a || (a = new Ya());
    var h = a.get(t);
    if (h) return h;
    (a.set(t, s),
      ms(t)
        ? t.forEach(function (i) {
            s.add(e(i, r, n, i, t, a));
          })
        : ps(t) &&
          t.forEach(function (i, o) {
            s.set(o, e(i, r, n, o, t, a));
          }));
    var p = f ? void 0 : (l ? (u ? cs : ss) : u ? ws : gs)(t);
    return (
      Qa(p || t, function (i, o) {
        (p && (i = t[(o = i)]), es(s, o, e(i, r, n, o, t, a)));
      }),
      s
    );
  },
  Os = js;
var Ms,
  Ss,
  Es,
  As,
  Ps,
  Ws,
  Ts,
  Is,
  Cs,
  Ls,
  Rs,
  Us,
  zs,
  Bs,
  Fs,
  Ds,
  Ns,
  qs,
  Vs,
  Hs,
  Gs,
  $s,
  Ks,
  Zs,
  Js,
  Xs,
  Ys,
  Qs,
  ec,
  tc,
  rc,
  nc,
  ic,
  oc,
  ac,
  sc,
  cc,
  uc,
  lc,
  fc,
  dc,
  vc = Ct(function (e) {
    return Os(e, 5);
  }),
  hc = (function (t) {
    function n(t) {
      var i;
      return (
        o(this, n),
        (i = e(this, n)),
        Ms.add(d(i)),
        Ss.set(d(i), { useInlinePlayer: !0 }),
        Es.set(d(i), k.disconnected),
        As.set(d(i), void 0),
        Ps.set(d(i), void 0),
        Ws.set(d(i), !1),
        Ts.set(d(i), {
          appId: '',
          apiKey: '',
          apiSecret: '',
          serverUrl: 'wss://avatar.cn-huadong-1.xf-yun.com/v1/interact',
          sceneId: '',
          sceneVersion: '',
        }),
        Is.set(d(i), 'avatar'),
        Cs.set(d(i), !1),
        Ls.set(d(i), {
          avatar_dispatch: {
            interactive_mode: M.break,
            enable_action_status: 1,
            content_analysis: 0,
          },
          avatar: { avatar_id: '', width: 720, height: 1280, audio_format: 1 },
          stream: { protocol: 'xrtc', bitrate: 1e6, fps: 25, alpha: 0 },
          tts: { vcn: '', speed: 50, pitch: 50, volume: 100 },
          air: { air: 0, add_nonsemantic: 0 },
        }),
        Rs.set(d(i), void 0),
        Us.set(d(i), void 0),
        zs.set(d(i), void 0),
        Bs.set(d(i), void 0),
        Fs.set(d(i), void 0),
        Ds.set(d(i), function () {
          return w(
            d(i),
            void 0,
            void 0,
            r().mark(function e() {
              var t, n;
              return r().wrap(
                function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        if (!b(this, Bs, 'f')) {
                          e.next = 2;
                          break;
                        }
                        return e.abrupt('return', b(this, Bs, 'f'));
                      case 2:
                        return (
                          (e.next = 4),
                          null === (t = b(this, zs, 'f')) || void 0 === t
                            ? void 0
                            : t.websocketPromise
                        );
                      case 4:
                        if ((n = e.sent)) {
                          e.next = 7;
                          break;
                        }
                        return e.abrupt(
                          'return',
                          Promise.reject(new Error($.InvalidConnect))
                        );
                      case 7:
                        return e.abrupt('return', n);
                      case 8:
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
        Ns.set(d(i), function (e, t) {
          var r,
            n,
            o = e;
          if ('[object String]' !== Object.prototype.toString.call(e)) {
            var a = e;
            ((null == a ? void 0 : a.header) &&
              !a.header.request_id &&
              (a.header.request_id = W()),
              (o = JSON.stringify(a)));
          }
          (t
            ? je.record(
                K.debug,
                '[ws]',
                '[msg send]:ignore record audio data, req_id:',
                (null === (r = null == e ? void 0 : e.header) || void 0 === r
                  ? void 0
                  : r.request_id) || ''
              )
            : je.record(K.debug, '[ws]', '[msg send]', o),
            null === (n = b(d(i), Bs, 'f')) || void 0 === n || n.send(o));
        }),
        qs.set(d(i), void 0),
        Vs.set(d(i), void 0),
        Hs.set(d(i), function (e) {
          _(d(i), qs, e, 'f');
        }),
        Gs.set(d(i), 0),
        $s.set(d(i), void 0),
        Ks.set(d(i), function () {
          clearTimeout(b(d(i), $s, 'f'));
        }),
        Zs.set(d(i), function () {
          return w(
            d(i),
            void 0,
            void 0,
            r().mark(function e() {
              var t, n, i, o, a, s, c, u, l, f;
              return r().wrap(
                function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        return (
                          _(this, qs, void 0, 'f'),
                          (s =
                            (null === (t = b(this, Ts, 'f')) || void 0 === t
                              ? void 0
                              : t.signedUrl) ||
                            Qt(
                              (null === (n = b(this, Ts, 'f')) || void 0 === n
                                ? void 0
                                : n.serverUrl) || '',
                              (null === (i = b(this, Ts, 'f')) || void 0 === i
                                ? void 0
                                : i.apiKey) || '',
                              (null === (o = b(this, Ts, 'f')) || void 0 === o
                                ? void 0
                                : o.apiSecret) || ''
                            )),
                          _(this, Es, k.connecting, 'f'),
                          (c = Me(s, {
                            binaryData:
                              null !== (a = b(this, Ss, 'f').binaryData) &&
                              void 0 !== a &&
                              a,
                          })),
                          (u = c.instablishPromise),
                          (l = c.abort),
                          _(this, zs, { websocketPromise: u, abort: l }, 'f'),
                          (e.next = 7),
                          u
                        );
                      case 7:
                        return (
                          (f = e.sent),
                          _(this, Bs, f, 'f'),
                          e.abrupt('return', f)
                        );
                      case 10:
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
        Ys.set(d(i), function (e) {
          var t,
            r,
            n,
            i,
            o,
            a,
            s,
            c,
            u,
            l,
            f,
            d,
            v = null,
            h = null;
          try {
            v = JSON.parse(e);
          } catch (e) {
            null == e || e.message;
          }
          var p = !1;
          if (
            0 !==
            (null === (t = null == v ? void 0 : v.header) || void 0 === t
              ? void 0
              : t.code)
          )
            ((h = {
              code:
                null === (r = null == v ? void 0 : v.header) || void 0 === r
                  ? void 0
                  : r.code,
              message:
                null === (n = null == v ? void 0 : v.header) || void 0 === n
                  ? void 0
                  : n.message,
              sid:
                (null === (i = null == v ? void 0 : v.header) || void 0 === i
                  ? void 0
                  : i.sid) || '',
            }),
              (p = !0));
          else if (
            null === (o = null == v ? void 0 : v.payload) || void 0 === o
              ? void 0
              : o.nlp
          ) {
            var y = v.payload.nlp;
            0 !== y.error_code &&
              (h = {
                code: y.error_code,
                message: y.error_message,
                sid:
                  (null === (a = null == v ? void 0 : v.header) || void 0 === a
                    ? void 0
                    : a.sid) || '',
                request_id: (null == y ? void 0 : y.request_id) || '',
              });
          } else if (
            null === (s = null == v ? void 0 : v.payload) || void 0 === s
              ? void 0
              : s.asr
          ) {
            var m = v.payload.asr;
            0 !== m.error_code &&
              (h = {
                code: m.error_code,
                message: m.error_message,
                sid:
                  (null === (c = null == v ? void 0 : v.header) || void 0 === c
                    ? void 0
                    : c.sid) || '',
                request_id: (null == m ? void 0 : m.request_id) || '',
              });
          } else if (
            null === (u = null == v ? void 0 : v.payload) || void 0 === u
              ? void 0
              : u.tts
          ) {
            var g = v.payload.tts;
            0 !== g.error_code &&
              (h = {
                code: g.error_code,
                message: g.error_message,
                sid:
                  (null === (l = null == v ? void 0 : v.header) || void 0 === l
                    ? void 0
                    : l.sid) || '',
                request_id: (null == g ? void 0 : g.request_id) || '',
              });
          } else if (
            null === (f = null == v ? void 0 : v.payload) || void 0 === f
              ? void 0
              : f.avatar
          ) {
            var w = v.payload.avatar;
            0 !== w.error_code &&
              (h = {
                code: w.error_code || Q.code,
                message: w.error_message || Q.message,
                sid:
                  (null === (d = null == v ? void 0 : v.header) || void 0 === d
                    ? void 0
                    : d.sid) || '',
                request_id: (null == w ? void 0 : w.request_id) || '',
              });
          }
          return { data: v, error: h, is_socket_error: p };
        }),
        Qs.set(d(i), function () {
          return w(
            d(i),
            void 0,
            void 0,
            r().mark(function e() {
              var t,
                n,
                i = this;
              return r().wrap(
                function (e) {
                  for (;;)
                    switch ((e.prev = e.next)) {
                      case 0:
                        if (
                          ((t = b(this, Ms, 'm', Xs).call(this)),
                          b(this, Ns, 'f').call(this, t),
                          !(n = b(this, Bs, 'f')))
                        ) {
                          e.next = 5;
                          break;
                        }
                        return e.abrupt(
                          'return',
                          new Promise(function (e, t) {
                            n.onmessage = function (r) {
                              var o,
                                a,
                                s,
                                c,
                                u,
                                l,
                                f,
                                d,
                                v,
                                h,
                                p,
                                y,
                                m,
                                g,
                                w = b(i, Ys, 'f').call(i, r.data),
                                _ = w.data,
                                x = w.error;
                              n.onmessage = null;
                              var k = void 0,
                                j = void 0;
                              if (x)
                                j = new P(
                                  null !== (o = x.message) && void 0 !== o
                                    ? o
                                    : Q.message,
                                  null !== (a = x.code) && void 0 !== a
                                    ? a
                                    : Q.code,
                                  $.ConnectError
                                );
                              else {
                                je.record(
                                  K.debug,
                                  '[stream_url]',
                                  null ===
                                    (c =
                                      null ===
                                        (s = null == _ ? void 0 : _.payload) ||
                                      void 0 === s
                                        ? void 0
                                        : s.avatar) || void 0 === c
                                    ? void 0
                                    : c.stream_url
                                );
                                var O =
                                    (null ===
                                      (l =
                                        null ===
                                          (u =
                                            null == _ ? void 0 : _.payload) ||
                                        void 0 === u
                                          ? void 0
                                          : u.avatar) || void 0 === l
                                      ? void 0
                                      : l.stream_url) || '',
                                  M =
                                    (null ===
                                      (f = null == _ ? void 0 : _.header) ||
                                    void 0 === f
                                      ? void 0
                                      : f.sid) || '';
                                O
                                  ? (k = {
                                      stream_url: O,
                                      sid: M,
                                      session:
                                        (null ===
                                          (d = null == _ ? void 0 : _.header) ||
                                        void 0 === d
                                          ? void 0
                                          : d.session) || '',
                                      appid:
                                        (null ===
                                          (p =
                                            null ===
                                              (h =
                                                null ===
                                                  (v =
                                                    null == _
                                                      ? void 0
                                                      : _.payload) ||
                                                void 0 === v
                                                  ? void 0
                                                  : v.avatar) || void 0 === h
                                              ? void 0
                                              : h.stream_extend) || void 0 === p
                                          ? void 0
                                          : p.appid) || '',
                                      user_sign:
                                        (null ===
                                          (g =
                                            null ===
                                              (m =
                                                null ===
                                                  (y =
                                                    null == _
                                                      ? void 0
                                                      : _.payload) ||
                                                void 0 === y
                                                  ? void 0
                                                  : y.avatar) || void 0 === m
                                              ? void 0
                                              : m.stream_extend) || void 0 === g
                                          ? void 0
                                          : g.user_sign) || '',
                                    })
                                  : (j = new P(
                                      Y.message,
                                      Y.code,
                                      $.InvalidResponse
                                    ));
                              }
                              !j && k
                                ? e(k)
                                : ((n.onerror = null),
                                  t(j),
                                  b(i, Ms, 'm', dc).call(i, !0));
                            };
                          })
                        );
                      case 5:
                        return e.abrupt(
                          'return',
                          Promise.reject(
                            new P(Y.message, Y.code, $.InvalidResponse)
                          )
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
        ec.set(d(i), function () {
          if (b(d(i), Bs, 'f')) {
            b(d(i), Bs, 'f').onclose = function () {
              b(d(i), Ms, 'm', dc).call(d(i));
            };
            var e = null;
            b(d(i), Bs, 'f').onmessage = function (t) {
              var r,
                n,
                o,
                a,
                s,
                c,
                u,
                l,
                f,
                v,
                h,
                p,
                y,
                m = b(d(i), Ys, 'f').call(d(i), t.data),
                g = m.data,
                w = m.error,
                x = m.is_socket_error;
              if (
                (je.record(
                  K.verbose,
                  '[msg handler]',
                  null === (r = null == g ? void 0 : g.header) || void 0 === r
                    ? void 0
                    : r.sid
                ),
                w &&
                  (je.record(K.error, '[error]', w),
                  x ||
                  ('nlp' === b(d(i), Is, 'f') &&
                    (null === (n = null == g ? void 0 : g.payload) ||
                    void 0 === n
                      ? void 0
                      : n.nlp))
                    ? (_(d(i), Cs, !1, 'f'), b(d(i), Hs, 'f').call(d(i), w))
                    : i.emit(
                        Se.error,
                        new P(
                          null !== (o = w.message) && void 0 !== o
                            ? o
                            : Q.message,
                          null !== (a = w.code) && void 0 !== a ? a : Q.code,
                          $.ConnectError
                        ),
                        g
                      )),
                !w || w.code === ee.code)
              )
                if (
                  null === (s = null == g ? void 0 : g.payload) || void 0 === s
                    ? void 0
                    : s.nlp
                ) {
                  var k =
                      null === (c = null == g ? void 0 : g.payload) ||
                      void 0 === c
                        ? void 0
                        : c.nlp,
                    M = null == k ? void 0 : k.request_id,
                    S = null == e ? void 0 : e.request_id;
                  (null == w ? void 0 : w.code) === ee.code
                    ? ((k.content = ''),
                      (k.status = 2),
                      k.answer || (k.answer = {}),
                      (k.answer.text = ''),
                      (k.text = ''))
                    : M === S && (k.streamNlp || k.stream_nlp)
                      ? (k.content = ''
                          .concat((null == e ? void 0 : e.content) || '')
                          .concat(
                            (null === (u = null == k ? void 0 : k.answer) ||
                            void 0 === u
                              ? void 0
                              : u.text) || ''
                          ))
                      : (k.content =
                          (null === (l = null == k ? void 0 : k.answer) ||
                          void 0 === l
                            ? void 0
                            : l.text) || '');
                  var E = Object.assign(Object.assign({}, k), {
                    displayContent: Tt(k.content),
                  });
                  ('nlp' !== b(d(i), Is, 'f') ||
                    (void 0 !== (null == E ? void 0 : E.status) &&
                      2 !== (null == E ? void 0 : E.status)) ||
                    _(d(i), Cs, !0, 'f'),
                    (e = E),
                    i.emit(Se.nlp, vc(E), vc(g)));
                } else if (
                  null === (f = null == g ? void 0 : g.payload) || void 0 === f
                    ? void 0
                    : f.asr
                ) {
                  var A =
                    null === (v = null == g ? void 0 : g.payload) ||
                    void 0 === v
                      ? void 0
                      : v.asr;
                  ((null == w ? void 0 : w.code) === ee.code &&
                    (A = Object.assign(Object.assign({}, A), {
                      status: 2,
                      text: '',
                    })),
                    i.emit(Se.asr, A));
                } else if (
                  null === (h = null == g ? void 0 : g.payload) || void 0 === h
                    ? void 0
                    : h.avatar
                ) {
                  var W =
                    null === (p = null == g ? void 0 : g.payload) ||
                    void 0 === p
                      ? void 0
                      : p.avatar;
                  if ((null == w ? void 0 : w.code) === ee.code) {
                    var T =
                      null === (y = null == W ? void 0 : W.request_id) ||
                      void 0 === y
                        ? void 0
                        : y.replace(/_\d+$/, '');
                    (i.emit(Se.asr, {
                      error_code: ee.code,
                      request_id: T,
                      status: 2,
                      text: '',
                    }),
                      i.emit(Se.nlp, {
                        error_code: ee.code,
                        request_id: T,
                        answer: { text: '' },
                        content: '',
                        displayContent: '',
                        status: 2,
                        text: '',
                      }));
                  }
                  switch (W.event_type) {
                    case 'stream_start':
                      i.emit(Se.stream_start);
                      break;
                    case 'driver_status':
                      W.vmr_status === j.start
                        ? (i.emit(Se.frame_start, W),
                          clearTimeout(b(d(i), $s, 'f')))
                        : W.vmr_status === j.stop &&
                          (i.emit(Se.frame_stop, W),
                          b(d(i), Ks, 'f').call(d(i)));
                      break;
                    case 'action_status':
                      W.action_status === O.start
                        ? i.emit(Se.action_start, W)
                        : W.action_status === O.stop &&
                          i.emit(Se.action_stop, W);
                      break;
                    case 'tts_duration':
                      i.emit(Se.tts_duration, W);
                      break;
                    case 'subtitle_info':
                      var I = !1;
                      (clearTimeout(b(d(i), oc, 'f')),
                        b(d(i), rc, 'f') !== W.request_id &&
                          ((I = !0),
                          _(d(i), nc, 0, 'f'),
                          _(d(i), rc, W.request_id, 'f'),
                          _(d(i), tc, [], 'f')),
                        b(d(i), tc, 'f').push(W),
                        I &&
                          (cancelAnimationFrame(b(d(i), ic, 'f')),
                          _(d(i), ic, 0, 'f')),
                        b(d(i), ic, 'f') || b(d(i), Ms, 'm', cc).call(d(i)));
                  }
                }
            };
          }
        }),
        tc.set(d(i), []),
        rc.set(d(i), ''),
        nc.set(d(i), 0),
        ic.set(d(i), 0),
        oc.set(d(i), 0),
        ac.set(d(i), 100),
        uc.set(d(i), function () {
          _(
            d(i),
            Gs,
            setInterval(function () {
              b(d(i), Ds, 'f')
                .call(d(i))
                .then(function () {
                  var e;
                  b(d(i), Ns, 'f').call(d(i), {
                    header: {
                      request_id: W(),
                      app_id:
                        (null === (e = b(d(i), Ts, 'f')) || void 0 === e
                          ? void 0
                          : e.appId) || '',
                      ctrl: 'ping',
                    },
                  });
                })
                .catch(function (e) {
                  je.record(K.error, '[heartbeat error]', e);
                });
            }, 4e3),
            'f'
          );
        }),
        lc.set(d(i), function (e) {
          var t,
            r,
            n,
            o = b(d(i), qs, 'f');
          ((t = i).emit.apply(
            t,
            [Se.disconnected].concat(
              p(
                e ||
                  ('nlp' === b(d(i), Is, 'f') &&
                    ('nlp' !== b(d(i), Is, 'f') || b(d(i), Cs, 'f')))
                  ? []
                  : [
                      o
                        ? new P(
                            null == o ? void 0 : o.message,
                            null == o ? void 0 : o.code,
                            null == o ? void 0 : o.name,
                            (null == o ? void 0 : o.sid) || ''
                          )
                        : new P(
                            X.message,
                            X.code,
                            $.NetworkError,
                            (null === (r = b(d(i), Us, 'f')) || void 0 === r
                              ? void 0
                              : r.sid) || ''
                          ),
                    ]
              )
            )
          ),
            b(d(i), Ss, 'f').useInlinePlayer &&
              (null === (n = b(d(i), As, 'f')) || void 0 === n || n.stop()));
        }),
        fc.set(d(i), function (e, t) {
          return w(
            d(i),
            void 0,
            void 0,
            r().mark(function n() {
              var i, o, a, s, c, u, l;
              return r().wrap(
                function (r) {
                  for (;;)
                    switch ((r.prev = r.next)) {
                      case 0:
                        if (
                          !b(this, Ss, 'f').useInlinePlayer ||
                          !['xrtc', 'webrtc'].includes(
                            null === (i = b(this, Ls, 'f').stream) ||
                              void 0 === i
                              ? void 0
                              : i.protocol
                          )
                        ) {
                          r.next = 14;
                          break;
                        }
                        if (
                          (je.record(
                            K.debug,
                            '[player]:useInlinePlayer',
                            'inited'
                          ),
                          b(this, Ss, 'f').useInlinePlayer &&
                            this.createPlayer(),
                          b(this, As, 'f'))
                        ) {
                          r.next = 5;
                          break;
                        }
                        return r.abrupt(
                          'return',
                          Promise.reject(
                            new P(
                              te.MissingPlayerLibsError.message,
                              te.MissingPlayerLibsError.code,
                              $.MediaError
                            )
                          )
                        );
                      case 5:
                        return (
                          e.stream_url.startsWith('xrtc')
                            ? ((l =
                                null === (o = e.stream_url) || void 0 === o
                                  ? void 0
                                  : o.match(/^xrtc(s?):\/\/([^/]*)\/([^/]+)/)),
                              (u = {
                                sid: e.sid,
                                server: 'http'.concat(l[1], '://').concat(l[2]),
                                auth:
                                  null !==
                                    (s =
                                      null === (a = e.user_sign) || void 0 === a
                                        ? void 0
                                        : a.replace(/^Bearer /, '')) &&
                                  void 0 !== s
                                    ? s
                                    : '',
                                appid: e.appid,
                                timeStr: ''.concat(Date.now()),
                                userId: 'c' + l[3],
                                roomId: l[3],
                              }),
                              (b(this, As, 'f').playerType = 'xrtc'))
                            : ((b(this, As, 'f').playerType = 'webrtc'),
                              (u = { sid: e.sid, streamUrl: e.stream_url })),
                          je.record(
                            K.debug,
                            '[player]: playerType',
                            b(this, As, 'f').playerType
                          ),
                          (b(this, As, 'f').videoSize = {
                            width: b(this, Ls, 'f').avatar.width,
                            height: b(this, Ls, 'f').avatar.height,
                          }),
                          (b(this, As, 'f').container = t),
                          je.record(
                            K.debug,
                            '[player]',
                            'preset streamSize:',
                            b(this, As, 'f').videoSize
                          ),
                          (r.next = 12),
                          b(this, As, 'f').playStream(u)
                        );
                      case 12:
                        r.next = 15;
                        break;
                      case 14:
                        je.record(
                          K.debug,
                          '[player]: ingore; [inline]/[protocol]',
                          b(this, Ss, 'f').useInlinePlayer,
                          ['xrtc', 'webrtc'].includes(
                            null === (c = b(this, Ls, 'f').stream) ||
                              void 0 === c
                              ? void 0
                              : c.protocol
                          )
                        );
                      case 15:
                      case 'end':
                        return r.stop();
                    }
                },
                n,
                this
              );
            })
          );
        }),
        _(d(i), Ss, Object.assign(Object.assign({}, b(d(i), Ss, 'f')), t), 'f'),
        b(d(i), Ss, 'f').useInlinePlayer && i.createPlayer(),
        i
      );
    }
    return (
      c(n, Ge),
      s(
        n,
        [
          {
            key: 'player',
            get: function () {
              return b(this, As, 'f');
            },
          },
          {
            key: 'setApiInfo',
            value: function (e) {
              return (_(this, Ts, I(b(this, Ts, 'f'), e), 'f'), this);
            },
          },
          {
            key: 'setGlobalParams',
            value: function (e) {
              return (_(this, Ls, I(b(this, Ls, 'f'), e), 'f'), this);
            },
          },
          {
            key: 'start',
            value: function (e) {
              return w(
                this,
                void 0,
                void 0,
                r().mark(function t() {
                  var n, i, o, a, s, c, u;
                  return r().wrap(
                    function (t) {
                      for (;;)
                        switch ((t.prev = t.next)) {
                          case 0:
                            if (
                              (_(this, qs, void 0, 'f'),
                              _(this, Is, 'avatar', 'f'),
                              (s = (a = e || {}).wrapper),
                              (c = a.preRes),
                              b(this, Ts, 'f') &&
                                (null === (n = b(this, Ls, 'f').avatar) ||
                                void 0 === n
                                  ? void 0
                                  : n.avatar_id) &&
                                (null === (i = b(this, Ls, 'f').tts) ||
                                void 0 === i
                                  ? void 0
                                  : i.vcn) &&
                                b(this, Ls, 'f').avatar.width &&
                                b(this, Ls, 'f').avatar.height)
                            ) {
                              t.next = 5;
                              break;
                            }
                            return t.abrupt(
                              'return',
                              Promise.reject(
                                new P(J.message, J.code, $.InvalidParam)
                              )
                            );
                          case 5:
                            if (
                              void 0 !== s ||
                              !b(this, Ss, 'f').useInlinePlayer ||
                              !['xrtc', 'webrtc'].includes(
                                null === (o = b(this, Ls, 'f').stream) ||
                                  void 0 === o
                                  ? void 0
                                  : o.protocol
                              )
                            ) {
                              t.next = 7;
                              break;
                            }
                            return t.abrupt(
                              'return',
                              Promise.reject(
                                new P('播放节点未指定', J.code, $.InvalidParam)
                              )
                            );
                          case 7:
                            return (
                              b(this, Ms, 'm', dc).call(this, !0),
                              (t.prev = 8),
                              _(this, Rs, c || void 0, 'f'),
                              (t.next = 12),
                              b(this, Zs, 'f').call(this)
                            );
                          case 12:
                            t.next = 19;
                            break;
                          case 14:
                            return (
                              (t.prev = 14),
                              (t.t0 = t.catch(8)),
                              je.record(
                                K.error,
                                '[ws]:connect failed',
                                (null === t.t0 || void 0 === t.t0
                                  ? void 0
                                  : t.t0.message) || ''
                              ),
                              _(this, Es, k.disconnected, 'f'),
                              t.abrupt(
                                'return',
                                Promise.reject(
                                  new P(
                                    (null === t.t0 || void 0 === t.t0
                                      ? void 0
                                      : t.t0.message) || X.message,
                                    (null === t.t0 || void 0 === t.t0
                                      ? void 0
                                      : t.t0.code) || X.code,
                                    $.ConnectError
                                  )
                                )
                              )
                            );
                          case 19:
                            return (
                              (t.prev = 19),
                              (t.next = 22),
                              b(this, Qs, 'f').call(this)
                            );
                          case 22:
                            return (
                              (u = t.sent),
                              b(this, ec, 'f').call(this),
                              _(this, Us, vc(u), 'f'),
                              _(this, Es, k.connected, 'f'),
                              this.emit(Se.connected, u),
                              je.record(K.debug, '[interact]:success', u),
                              b(this, uc, 'f').call(this),
                              b(this, Ks, 'f').call(this),
                              (t.next = 32),
                              b(this, fc, 'f').call(this, u, s)
                            );
                          case 32:
                            t.next = 39;
                            break;
                          case 34:
                            throw (
                              (t.prev = 34),
                              (t.t1 = t.catch(19)),
                              b(this, Ms, 'm', dc).call(this, !0),
                              _(this, Es, k.disconnected, 'f'),
                              t.t1
                            );
                          case 39:
                          case 'end':
                            return t.stop();
                        }
                    },
                    t,
                    this,
                    [
                      [8, 14],
                      [19, 34],
                    ]
                  );
                })
              );
            },
          },
          {
            key: 'connectNlp',
            value: function () {
              return w(
                this,
                void 0,
                void 0,
                r().mark(function e() {
                  return r().wrap(
                    function (e) {
                      for (;;)
                        switch ((e.prev = e.next)) {
                          case 0:
                            if (
                              (_(this, Is, 'nlp', 'f'),
                              _(this, Cs, !1, 'f'),
                              b(this, Ts, 'f'))
                            ) {
                              e.next = 4;
                              break;
                            }
                            return e.abrupt(
                              'return',
                              Promise.reject(
                                new P(J.message, J.code, $.InvalidParam)
                              )
                            );
                          case 4:
                            return (
                              b(this, Ms, 'm', dc).call(this, !0),
                              (e.prev = 5),
                              (e.next = 8),
                              b(this, Zs, 'f').call(this)
                            );
                          case 8:
                            e.next = 15;
                            break;
                          case 10:
                            return (
                              (e.prev = 10),
                              (e.t0 = e.catch(5)),
                              je.record(
                                K.error,
                                '[ws]:connect failed',
                                (null === e.t0 || void 0 === e.t0
                                  ? void 0
                                  : e.t0.message) || ''
                              ),
                              _(this, Es, k.disconnected, 'f'),
                              e.abrupt(
                                'return',
                                Promise.reject(
                                  new P(
                                    (null === e.t0 || void 0 === e.t0
                                      ? void 0
                                      : e.t0.message) || X.message,
                                    (null === e.t0 || void 0 === e.t0
                                      ? void 0
                                      : e.t0.code) || X.code,
                                    $.ConnectError
                                  )
                                )
                              )
                            );
                          case 15:
                            (b(this, ec, 'f').call(this),
                              _(this, Es, k.connected, 'f'),
                              this.emit(Se.connected),
                              je.record(K.debug, '[interact]:success'));
                          case 19:
                          case 'end':
                            return e.stop();
                        }
                    },
                    e,
                    this,
                    [[5, 10]]
                  );
                })
              );
            },
          },
          {
            key: 'interrupt',
            value: function () {
              return w(
                this,
                void 0,
                void 0,
                r().mark(function e() {
                  var t = this;
                  return r().wrap(
                    function (e) {
                      for (;;)
                        switch ((e.prev = e.next)) {
                          case 0:
                            return (
                              (e.next = 2),
                              b(this, Ds, 'f')
                                .call(this)
                                .then(function () {
                                  var e;
                                  b(t, Ns, 'f').call(t, {
                                    header: {
                                      app_id:
                                        (null === (e = b(t, Ts, 'f')) ||
                                        void 0 === e
                                          ? void 0
                                          : e.appId) || '',
                                      ctrl: 'reset',
                                    },
                                  });
                                })
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
              );
            },
          },
          {
            key: 'writeText',
            value: function (e, t) {
              return w(
                this,
                void 0,
                void 0,
                r().mark(function n() {
                  var i, o, a, s, c, u, l, f, d, v, h, p, y, m, g, w;
                  return r().wrap(
                    function (r) {
                      for (;;)
                        switch ((r.prev = r.next)) {
                          case 0:
                            return (
                              (l = (u = t || {}).request_id),
                              (f = u.session),
                              (d = u.uid),
                              (v = u.nlp),
                              (h = u.avatar_dispatch),
                              (p = u.air),
                              (y = u.parameter),
                              (m = u.tts),
                              (l = l || W()),
                              (g = null != p ? p : b(this, Ls, 'f').air),
                              (w = {}),
                              g && (w = { air: I(b(this, Ls, 'f').air, p) }),
                              (r.prev = 5),
                              (r.next = 8),
                              b(this, Ds, 'f').call(this)
                            );
                          case 8:
                            r.next = 14;
                            break;
                          case 10:
                            return (
                              (r.prev = 10),
                              (r.t0 = r.catch(5)),
                              je.record(K.error, '[writeText]', r.t0),
                              r.abrupt(
                                'return',
                                Promise.reject(
                                  new P(X.message, X.code, $.InvalidConnect)
                                )
                              )
                            );
                          case 14:
                            return (
                              b(this, Ns, 'f').call(this, {
                                header: {
                                  app_id:
                                    (null === (i = b(this, Ts, 'f')) ||
                                    void 0 === i
                                      ? void 0
                                      : i.appId) || '',
                                  request_id: l,
                                  ctrl: v ? 'text_interact' : 'text_driver',
                                  session: f || '',
                                  uid: d || '',
                                  scene_id:
                                    (null === (o = b(this, Ts, 'f')) ||
                                    void 0 === o
                                      ? void 0
                                      : o.sceneId) || '',
                                  scene_version:
                                    (null === (a = b(this, Ts, 'f')) ||
                                    void 0 === a
                                      ? void 0
                                      : a.sceneVersion) || '',
                                },
                                parameter: Object.assign(
                                  Object.assign(
                                    {
                                      avatar_dispatch: Object.assign(
                                        Object.assign(
                                          {},
                                          I(b(this, Ls, 'f').avatar_dispatch, h)
                                        ),
                                        {
                                          interactive_mode:
                                            null !==
                                              (s =
                                                null == h
                                                  ? void 0
                                                  : h.interactive_mode) &&
                                            void 0 !== s
                                              ? s
                                              : null ===
                                                    (c = b(
                                                      this,
                                                      Ls,
                                                      'f'
                                                    ).avatar_dispatch) ||
                                                  void 0 === c
                                                ? void 0
                                                : c.interactive_mode,
                                        }
                                      ),
                                      tts: Object.assign(
                                        {},
                                        I(b(this, Ls, 'f').tts, m, {
                                          audio: {
                                            sample_rate:
                                              2 ===
                                              b(this, Ms, 'm', Js).call(this)
                                                ? 24e3
                                                : 16e3,
                                          },
                                        })
                                      ),
                                    },
                                    w
                                  ),
                                  y
                                ),
                                payload: { text: { content: e } },
                              }),
                              r.abrupt('return', l)
                            );
                          case 16:
                          case 'end':
                            return r.stop();
                        }
                    },
                    n,
                    this,
                    [[5, 10]]
                  );
                })
              );
            },
          },
          {
            key: 'writeJsonText',
            value: function (e, t, n) {
              return w(
                this,
                void 0,
                void 0,
                r().mark(function i() {
                  var o, a, s, c, u, l, f, d, v, h, p;
                  return r().wrap(
                    function (r) {
                      for (;;)
                        switch ((r.prev = r.next)) {
                          case 0:
                            return (
                              (c = t.request_id),
                              (u = t.nlp),
                              (l = t.avatar_dispatch),
                              (f = t.air),
                              (d = t.tts),
                              (v = t.parameter),
                              (c = c || W()),
                              (h = null != f ? f : b(this, Ls, 'f').air),
                              (p = {}),
                              h && (p = { air: I(b(this, Ls, 'f').air, f) }),
                              (r.prev = 5),
                              (r.next = 8),
                              b(this, Ds, 'f').call(this)
                            );
                          case 8:
                            r.next = 14;
                            break;
                          case 10:
                            return (
                              (r.prev = 10),
                              (r.t0 = r.catch(5)),
                              je.record(K.error, '[writeJsonText]', r.t0),
                              r.abrupt(
                                'return',
                                Promise.reject(
                                  new P(X.message, X.code, $.InvalidConnect)
                                )
                              )
                            );
                          case 14:
                            return (
                              b(this, Ns, 'f').call(this, {
                                header: {
                                  app_id:
                                    (null === (o = b(this, Ts, 'f')) ||
                                    void 0 === o
                                      ? void 0
                                      : o.appId) || '',
                                  request_id: c,
                                  ctrl: u ? 'text_interact' : 'text_driver',
                                },
                                parameter: Object.assign(
                                  Object.assign(
                                    {
                                      avatar_dispatch: Object.assign(
                                        Object.assign(
                                          {},
                                          I(b(this, Ls, 'f').avatar_dispatch, l)
                                        ),
                                        {
                                          interactive_mode:
                                            null !==
                                              (a =
                                                null == l
                                                  ? void 0
                                                  : l.interactive_mode) &&
                                            void 0 !== a
                                              ? a
                                              : null ===
                                                    (s = b(
                                                      this,
                                                      Ls,
                                                      'f'
                                                    ).avatar_dispatch) ||
                                                  void 0 === s
                                                ? void 0
                                                : s.interactive_mode,
                                        }
                                      ),
                                      tts: Object.assign(
                                        {},
                                        I(b(this, Ls, 'f').tts, d, {
                                          audio: {
                                            sample_rate:
                                              2 ===
                                              b(this, Ms, 'm', Js).call(this)
                                                ? 24e3
                                                : 16e3,
                                          },
                                        })
                                      ),
                                    },
                                    p
                                  ),
                                  v
                                ),
                                payload: { json_text: { text: e, cmd: n } },
                              }),
                              r.abrupt('return', c)
                            );
                          case 16:
                          case 'end':
                            return r.stop();
                        }
                    },
                    i,
                    this,
                    [[5, 10]]
                  );
                })
              );
            },
          },
          {
            key: 'writeAudio',
            value: function (e, t, n) {
              return w(
                this,
                void 0,
                void 0,
                r().mark(function i() {
                  var o,
                    a,
                    s,
                    c,
                    u,
                    l,
                    f,
                    d,
                    v,
                    h,
                    p,
                    y,
                    m,
                    w,
                    k,
                    j,
                    O,
                    M,
                    S,
                    E,
                    A,
                    T,
                    C;
                  return r().wrap(
                    function (r) {
                      for (;;)
                        switch ((r.prev = r.next)) {
                          case 0:
                            return (
                              (r.prev = 0),
                              (r.next = 3),
                              b(this, Ds, 'f').call(this)
                            );
                          case 3:
                            r.next = 9;
                            break;
                          case 5:
                            return (
                              (r.prev = 5),
                              (r.t0 = r.catch(0)),
                              je.record(K.error, '[writeAudio]', r.t0),
                              r.abrupt(
                                'return',
                                Promise.reject(
                                  new P(X.message, X.code, $.InvalidConnect)
                                )
                              )
                            );
                          case 9:
                            return (
                              '',
                              (h = !1),
                              (t === x.start ||
                                (!b(this, Ws, 'f') && t === x.end)) &&
                                ((h = !0),
                                _(this, Fs, W(), 'f'),
                                je.record(
                                  K.info,
                                  '[writeAudio]',
                                  'audio is first Frame, reset'
                                )),
                              _(this, Fs, (v = b(this, Fs, 'f') || W()), 'f'),
                              t === x.end
                                ? _(this, Ws, !1, 'f')
                                : _(this, Ws, !0, 'f'),
                              (y = (p = n || {}).nlp),
                              (m = p.full_duplex),
                              (w = p.avatar),
                              (k = p.vc),
                              (j = p.avatar_dispatch),
                              (O = p.air),
                              (M = p.audio),
                              (S = p.session),
                              (E = p.uid),
                              (A = g(p, [
                                'nlp',
                                'full_duplex',
                                'avatar',
                                'vc',
                                'avatar_dispatch',
                                'air',
                                'audio',
                                'session',
                                'uid',
                              ])),
                              (T = null != O ? O : b(this, Ls, 'f').air),
                              (C = {}),
                              T && (C = { air: I(b(this, Ls, 'f').air, O) }),
                              b(this, Ns, 'f').call(
                                this,
                                {
                                  header: {
                                    app_id:
                                      (null === (o = b(this, Ts, 'f')) ||
                                      void 0 === o
                                        ? void 0
                                        : o.appId) || '',
                                    request_id: v,
                                    ctrl: y ? 'audio_interact' : 'audio_driver',
                                    session: S || '',
                                    uid: E || '',
                                  },
                                  parameter: Object.assign(
                                    Object.assign(
                                      Object.assign(
                                        {
                                          avatar_dispatch: Object.assign(
                                            Object.assign(
                                              Object.assign({}, j),
                                              !y && h
                                                ? {
                                                    interactive_mode:
                                                      null !==
                                                        (a =
                                                          null == j
                                                            ? void 0
                                                            : j.interactive_mode) &&
                                                      void 0 !== a
                                                        ? a
                                                        : null ===
                                                              (s = b(
                                                                this,
                                                                Ls,
                                                                'f'
                                                              ).avatar_dispatch) ||
                                                            void 0 === s
                                                          ? void 0
                                                          : s.interactive_mode,
                                                  }
                                                : {}
                                            ),
                                            {
                                              audio_mode:
                                                null !==
                                                  (c =
                                                    null == j
                                                      ? void 0
                                                      : j.audio_mode) &&
                                                void 0 !== c
                                                  ? c
                                                  : 0,
                                              content_analysis:
                                                (y
                                                  ? null !==
                                                      (u =
                                                        null == j
                                                          ? void 0
                                                          : j.content_analysis) &&
                                                    void 0 !== u
                                                    ? u
                                                    : null ===
                                                          (l = b(
                                                            this,
                                                            Ls,
                                                            'f'
                                                          ).avatar_dispatch) ||
                                                        void 0 === l
                                                      ? void 0
                                                      : l.content_analysis
                                                  : 0) || 0,
                                            }
                                          ),
                                        },
                                        y
                                          ? { asr: { full_duplex: m ? 1 : 0 } }
                                          : {}
                                      ),
                                      (null == k ? void 0 : k.vc)
                                        ? {
                                            vc: {
                                              vc:
                                                null !==
                                                  (f =
                                                    null == k
                                                      ? void 0
                                                      : k.vc) && void 0 !== f
                                                  ? f
                                                  : 0,
                                              voice_name:
                                                (null == k
                                                  ? void 0
                                                  : k.voice_name) || '',
                                            },
                                          }
                                        : {}
                                    ),
                                    C
                                  ),
                                  payload: {
                                    audio: Object.assign(
                                      Object.assign(Object.assign({}, M), {
                                        sample_rate:
                                          null !==
                                            (d =
                                              null == M
                                                ? void 0
                                                : M.sample_rate) && void 0 !== d
                                            ? d
                                            : y ||
                                                2 !==
                                                  b(this, Ms, 'm', Js).call(
                                                    this
                                                  )
                                              ? 16e3
                                              : 24e3,
                                        status: t,
                                        audio: G(new Uint8Array(e)),
                                        frame_size: e.byteLength,
                                      }),
                                      A
                                    ),
                                    avatar: w || [],
                                  },
                                },
                                !0
                              ),
                              r.abrupt('return', v)
                            );
                          case 20:
                          case 'end':
                            return r.stop();
                        }
                    },
                    i,
                    this,
                    [[0, 5]]
                  );
                })
              );
            },
          },
          {
            key: 'writeCmd',
            value: function (e, t) {
              return w(
                this,
                void 0,
                void 0,
                r().mark(function n() {
                  var i, o, a;
                  return r().wrap(
                    function (r) {
                      for (;;)
                        switch ((r.prev = r.next)) {
                          case 0:
                            return (
                              (o = W()),
                              (r.prev = 1),
                              (r.next = 4),
                              b(this, Ds, 'f').call(this)
                            );
                          case 4:
                            r.next = 10;
                            break;
                          case 6:
                            return (
                              (r.prev = 6),
                              (r.t0 = r.catch(1)),
                              je.record(K.error, '[writeCmd]', r.t0),
                              r.abrupt(
                                'return',
                                Promise.reject(
                                  new P(X.message, X.code, $.InvalidConnect)
                                )
                              )
                            );
                          case 10:
                            ((a = null),
                              (r.prev = 11),
                              (r.t1 = e),
                              (r.next = 'action' === r.t1 ? 15 : 17));
                            break;
                          case 15:
                            return (
                              (a = {
                                cmd_text: { avatar: [{ type: e, value: t }] },
                              }),
                              r.abrupt('break', 17)
                            );
                          case 17:
                            r.next = 21;
                            break;
                          case 19:
                            ((r.prev = 19), (r.t2 = r.catch(11)));
                          case 21:
                            return (
                              a &&
                                b(this, Ns, 'f').call(this, {
                                  header: {
                                    app_id:
                                      (null === (i = b(this, Ts, 'f')) ||
                                      void 0 === i
                                        ? void 0
                                        : i.appId) || '',
                                    request_id: o,
                                    ctrl: 'cmd',
                                  },
                                  payload: a,
                                }),
                              r.abrupt('return', o)
                            );
                          case 23:
                          case 'end':
                            return r.stop();
                        }
                    },
                    n,
                    this,
                    [
                      [1, 6],
                      [11, 19],
                    ]
                  );
                })
              );
            },
          },
          {
            key: 'recorder',
            get: function () {
              return b(this, Ps, 'f');
            },
          },
          {
            key: 'destroyRecorder',
            value: function () {
              var e, t;
              (null === (e = b(this, Ps, 'f')) ||
                void 0 === e ||
                e.stopRecord(),
                null === (t = b(this, Ps, 'f')) || void 0 === t || t.destroy(),
                _(this, Ps, void 0, 'f'));
            },
          },
          {
            key: 'createRecorder',
            value: function (e) {
              var t,
                r = this;
              if (
                b(this, Ps, 'f') &&
                !(null === (t = b(this, Ps, 'f')) || void 0 === t
                  ? void 0
                  : t.isDestroyed())
              )
                return b(this, Ps, 'f');
              var n = -1;
              return (
                _(
                  this,
                  Ps,
                  new Pt(Object.assign({ sampleRate: 16e3 }, e)),
                  'f'
                ).on($e.recoder_audio, function (e) {
                  var t, i;
                  if (b(r, Es, 'f') === k.connected) {
                    var o = e.frameStatus;
                    (-1 === n && e.frameStatus !== x.end && ((o = 0), (n = 0)),
                      r
                        .writeAudio(e.s16buffer, o, {
                          nlp:
                            null !==
                              (i =
                                null === (t = null == e ? void 0 : e.extend) ||
                                void 0 === t
                                  ? void 0
                                  : t.nlp) &&
                            void 0 !== i &&
                            i,
                          full_duplex: e.fullDuplex ? 1 : 0,
                        })
                        .catch(function (e) {
                          je.record(K.error, '[writeAudio]', e);
                        }));
                  } else
                    je.record(
                      K.info,
                      '[writeAudio]',
                      'channel disconnected, ignore audio data'
                    );
                }),
                b(this, Ps, 'f')
              );
            },
          },
          {
            key: 'createPlayer',
            value: function () {
              return b(this, As, 'f')
                ? b(this, As, 'f')
                : _(this, As, new Ke(), 'f');
            },
          },
          {
            key: 'stop',
            value: function () {
              b(this, Ms, 'm', dc).call(this, !0);
            },
          },
          {
            key: 'destroy',
            value: function () {
              var e, t;
              (null === (e = b(this, As, 'f')) || void 0 === e || e.destroy(),
                _(this, As, void 0, 'f'),
                b(this, Ms, 'm', dc).call(this, !0),
                null === (t = b(this, Ps, 'f')) || void 0 === t || t.destroy(),
                _(this, Ps, void 0, 'f'),
                v(u(n.prototype), 'destroy', this).call(this));
            },
          },
        ],
        [
          {
            key: 'getVersion',
            value: function () {
              return '3.1.2-1002';
            },
          },
          {
            key: 'setLogLevel',
            value: function (e) {
              je.setLogLevel(e);
            },
          },
        ]
      ),
      n
    );
  })();
((Ss = new WeakMap()),
  (Es = new WeakMap()),
  (As = new WeakMap()),
  (Ps = new WeakMap()),
  (Ws = new WeakMap()),
  (Ts = new WeakMap()),
  (Is = new WeakMap()),
  (Cs = new WeakMap()),
  (Ls = new WeakMap()),
  (Rs = new WeakMap()),
  (Us = new WeakMap()),
  (zs = new WeakMap()),
  (Bs = new WeakMap()),
  (Fs = new WeakMap()),
  (Ds = new WeakMap()),
  (Ns = new WeakMap()),
  (qs = new WeakMap()),
  (Vs = new WeakMap()),
  (Hs = new WeakMap()),
  (Gs = new WeakMap()),
  ($s = new WeakMap()),
  (Ks = new WeakMap()),
  (Zs = new WeakMap()),
  (Ys = new WeakMap()),
  (Qs = new WeakMap()),
  (ec = new WeakMap()),
  (tc = new WeakMap()),
  (rc = new WeakMap()),
  (nc = new WeakMap()),
  (ic = new WeakMap()),
  (oc = new WeakMap()),
  (ac = new WeakMap()),
  (uc = new WeakMap()),
  (lc = new WeakMap()),
  (fc = new WeakMap()),
  (Ms = new WeakSet()),
  (Js = function () {
    var e, t, r;
    return null !==
      (r =
        null ===
          (t =
            null === (e = b(this, Ls, 'f')) || void 0 === e
              ? void 0
              : e.avatar) || void 0 === t
          ? void 0
          : t.audio_format) && void 0 !== r
      ? r
      : 1;
  }),
  (Xs = function () {
    var e,
      t,
      r,
      n,
      i,
      o,
      a = null !== (e = b(this, Ls, 'f').stream) && void 0 !== e ? e : {},
      s = a.protocol,
      c = void 0 === s ? 'xrtc' : s,
      u = a.bitrate,
      l = void 0 === u ? 1e6 : u,
      f = g(a, ['protocol', 'bitrate']),
      d = b(this, Ls, 'f').avatar,
      v = d.avatar_id,
      h = d.width,
      p = d.height,
      y = g(d, ['avatar_id', 'width', 'height']),
      m = b(this, Ls, 'f').tts,
      w = m.vcn,
      _ = m.speed,
      x = m.pitch,
      k = m.volume,
      j = g(m, ['vcn', 'speed', 'pitch', 'volume']),
      O = b(this, Ls, 'f').subtitle || {},
      M = O.subtitle,
      S = O.font_color,
      E = g(O, ['subtitle', 'font_color']),
      A = b(this, Ls, 'f').background,
      P = b(this, Ls, 'f').air,
      W = {};
    return (
      P && (W = { air: P }),
      Object.assign(
        {
          header: {
            app_id:
              (null === (t = b(this, Ts, 'f')) || void 0 === t
                ? void 0
                : t.appId) || '',
            ctrl: 'start',
            scene_id:
              (null === (r = b(this, Ts, 'f')) || void 0 === r
                ? void 0
                : r.sceneId) || '',
            scene_version:
              (null === (n = b(this, Ts, 'f')) || void 0 === n
                ? void 0
                : n.sceneVersion) || '',
          },
          parameter: Object.assign(
            Object.assign(
              {
                avatar_dispatch: {
                  enable_action_status:
                    null !==
                      (o =
                        null === (i = b(this, Ls, 'f').avatar_dispatch) ||
                        void 0 === i
                          ? void 0
                          : i.enable_action_status) && void 0 !== o
                      ? o
                      : 0,
                },
                avatar: Object.assign(
                  Object.assign(
                    {
                      stream: Object.assign(Object.assign({}, f), {
                        protocol: c,
                        bitrate: Math.floor((l || 1e6) / 1024),
                      }),
                      avatar_id: v,
                      width: h,
                      height: p,
                    },
                    y
                  ),
                  { audio_format: b(this, Ms, 'm', Js).call(this) }
                ),
                tts: Object.assign(
                  {
                    vcn: w,
                    speed: null != _ ? _ : 50,
                    pitch: null != x ? x : 50,
                    volume: null != k ? k : 100,
                    audio: {
                      sample_rate:
                        2 === b(this, Ms, 'm', Js).call(this) ? 24e3 : 16e3,
                    },
                  },
                  j
                ),
              },
              M
                ? {
                    subtitle: Object.assign(
                      { subtitle: M, font_color: null != S ? S : '#FFFFFF' },
                      E
                    ),
                  }
                : {}
            ),
            W
          ),
        },
        (null == A ? void 0 : A.data) || b(this, Rs, 'f')
          ? {
              payload: Object.assign(
                { background: A },
                b(this, Rs, 'f') ? { preload_resources: b(this, Rs, 'f') } : {}
              ),
            }
          : void 0
      )
    );
  }),
  (sc = function (e, t) {
    if (0 === e.length || t < e[0].bg) return { target: null, index: -1 };
    if (t > e[e.length - 1].ed) return { target: null, index: -2 };
    for (var r = 0, n = e.length - 1; r <= n; ) {
      var i = Math.floor((r + n) / 2),
        o = e[i],
        a = o.bg,
        s = o.ed;
      if (t >= a && t <= s) return { target: e[i], index: i };
      t < a ? (n = i - 1) : (r = i + 1);
    }
    return { target: null, index: -1 };
  }),
  (cc = function e() {
    var t = this;
    _(
      this,
      ic,
      requestAnimationFrame(function (r) {
        b(t, nc, 'f') || _(t, nc, r, 'f');
        var n = null;
        if (b(t, tc, 'f').length && b(t, nc, 'f')) {
          var i = b(t, Ms, 'm', sc).call(
              t,
              b(t, tc, 'f'),
              r - b(t, nc, 'f') - b(t, ac, 'f')
            ),
            o = i.target,
            a = i.index;
          o
            ? ((n = o),
              t.emit(Se.subtitle_info, o),
              b(t, tc, 'f').splice(0, a + 1))
            : -2 === a &&
              ((b(t, tc, 'f').length = 0),
              cancelAnimationFrame(b(t, ic, 'f')),
              _(t, ic, 0, 'f'));
        }
        b(t, tc, 'f').length
          ? b(t, Ms, 'm', e).call(t)
          : (cancelAnimationFrame(b(t, ic, 'f')),
            _(t, ic, 0, 'f'),
            _(
              t,
              oc,
              setTimeout(
                function () {
                  t.emit(Se.subtitle_info);
                },
                ((null == n ? void 0 : n.ed) || 0) -
                  ((null == n ? void 0 : n.bg) || 0) +
                  1e3
              ),
              'f'
            ));
      }),
      'f'
    );
  }),
  (dc = function () {
    var e,
      t,
      r,
      n,
      i,
      o = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
    (_(this, Ws, !1, 'f'),
      clearInterval(b(this, Gs, 'f')),
      clearTimeout(b(this, $s, 'f')),
      o && _(this, qs, void 0, 'f'),
      clearTimeout(b(this, Vs, 'f')),
      _(this, Rs, void 0, 'f'),
      _(this, Es, k.disconnected, 'f'));
    var a = b(this, Bs, 'f');
    (null === (e = b(this, Ps, 'f')) || void 0 === e || e.stopRecord(),
      null === (t = b(this, As, 'f')) || void 0 === t || t.stop(),
      (null == a ? void 0 : a.readyState) === Oe.OPEN
        ? ((a.onclose = null),
          (a.onmessage = null),
          b(this, Ns, 'f').call(this, {
            header: {
              request_id: W(),
              app_id:
                (null === (r = b(this, Ts, 'f')) || void 0 === r
                  ? void 0
                  : r.appId) || '',
              ctrl: 'stop',
            },
          }),
          a.close())
        : (null === (n = b(this, zs, 'f')) || void 0 === n || n.abort(),
          null === (i = null == a ? void 0 : a.close) ||
            void 0 === i ||
            i.call(a)),
      b(this, Bs, 'f') &&
        (b(this, lc, 'f').call(this, o),
        _(this, zs, void 0, 'f'),
        _(this, Bs, void 0, 'f'),
        _(this, Us, void 0, 'f')));
  }));
export {
  hc as A,
  P as C,
  $ as E,
  je as L,
  Ee as P,
  $e as R,
  Se as S,
  At as U,
  c as _,
  o as a,
  e as b,
  d as c,
  K as d,
  b as e,
  _ as f,
  s as g,
  w as h,
  r as i,
  te as j,
  T as k,
  v as l,
  u as m,
  Ge as n,
  i as o,
  Ut as p,
};
