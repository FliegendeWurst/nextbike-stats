L.AnimatedMarker = L.Marker.extend({
  options: {
    // meters
    distance: 200,
    chunks: 10,
    // ms
    interval: 1000,
    // animate on add?
    autoStart: true,
    rawChunks: false,
    // callback onend
    onEnd: function(){},
    clickable: false
  },

  initialize: function (latlngs, options) {
    this.options.rawChunks = options.rawChunks;
    if (options.distance && options.chunks) {
      this.options.distance = options.distance / options.chunks;
    }
    this.setLine(latlngs);
    L.Marker.prototype.initialize.call(this, latlngs[0], options);
  },

  // Breaks the line up into tiny chunks (see options) ONLY if CSS3 animations
  // are not supported.
  _chunk: function(latlngs) {
    if (this.options.rawChunks) {
      return latlngs;
    }
    console.error("not doing raw chunks");
    var i,
        len = latlngs.length,
        chunkedLatLngs = [];

    chunkedLatLngs.push(latlngs[0]);
    for (i=1;i<len;i++) {
      var cur = latlngs[i-1],
          next = latlngs[i],
          dist = cur.distanceTo(next),
          factor = this.options.distance / dist,
          dLat = factor * (next.lat - cur.lat),
          dLng = factor * (next.lng - cur.lng);

      if (dist > this.options.distance) {
        while (dist > this.options.distance) {
          cur = new L.LatLng(cur.lat + dLat, cur.lng + dLng);
          dist = cur.distanceTo(next);
          chunkedLatLngs.push(cur);
        }
      } else {
        chunkedLatLngs.push(cur);
      }
    }
    chunkedLatLngs.push(latlngs[len-1]);
    //console.log(`chunked into ${chunkedLatLngs.length}`);

    return chunkedLatLngs;
  },

  onAdd: function (map) {
    L.Marker.prototype.onAdd.call(this, map);

    // Start animating when added to the map
    if (this.options.autoStart) {
      this.start();
    }
  },

  animate: function() {
    var self = this,
        len = this._latlngs.length,
        speed = this.options.interval;

    // Only if CSS3 transitions are supported
    if (L.DomUtil.TRANSITION) {
      if (this._icon) { this._icon.style[L.DomUtil.TRANSITION] = ('all ' + speed + 'ms linear'); }
      if (this._shadow) { this._shadow.style[L.DomUtil.TRANSITION] = 'all ' + speed + 'ms linear'; }
    }
   //console.log(`have ${this._latlngs.length}`);
    // Move to the next vertex
    this.setLatLng(this._latlngs[this._i]);
    if (this._i > 0) {
      if (this._latlngs[this._i].distanceTo(this._latlngs[this._i-1]) < 20) {
        this.setOpacity(0.3);
      } else {
        this.setOpacity(1);
      }
    }
    this._i++;

    // Queue up the animation to the next next vertex
    this._tid = setTimeout(function(){
      if (self._i === len) {
        self.options.onEnd.apply(self, Array.prototype.slice.call(arguments));
      } else {
        self.animate();
      }
    }, speed);
  },

  // Start the animation
  start: function() {
    this.animate();
  },

  // Stop the animation in place
  stop: function() {
    if (this._tid) {
      clearTimeout(this._tid);
    }
  },

  setLine: function(latlngs){
    // Chunk up the lines into options.distance bits
    this._latlngs = this._chunk(latlngs);
    this._i = 0;
  }

});

L.animatedMarker = function (latlngs, options) {
  return new L.AnimatedMarker(latlngs, options);
};
