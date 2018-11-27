const PlanetMath = {
  cartesianToSpherical: function(cartesian) {
    const r = Math.sqrt(
      cartesian.x * cartesian.x +
        cartesian.y * cartesian.y +
        cartesian.z * cartesian.z);
    return {
      theta: Math.atan2(cartesian.y, cartesian.x),
      phi: Math.atan2(Math.sqrt(cartesian.x*cartesian.x+cartesian.y*cartesian.y),cartesian.z),
      r: r,
    };
  },
  sphericalToCartesian: function(spherical) {
    return {
      x: spherical.r * Math.cos(spherical.theta) * Math.sin(spherical.phi),
      y: spherical.r * Math.sin(spherical.theta) * Math.sin(spherical.phi),
      z: spherical.r * Math.cos(spherical.phi),
    };
  },
};

export default PlanetMath;
