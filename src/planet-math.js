const PlanetMath = {
  cartesianToPolar: function(cartesian) {
    const r = Math.sqrt(
        cartesian.x * cartesian.x +
        cartesian.y * cartesian.y +
        cartesian.z * cartesian.z);
    return {
      theta: Math.atan(cartesian.y / cartesian.x),
      phi: Math.acos(cartesian.z / r),
      r: r,
    };
  },
  polarToCartesian: function(polar) {
    return {
      x: polar.r * Math.cos(polar.theta) * Math.sin(polar.phi),
      y: polar.r * Math.sin(polar.theta) * Math.sin(polar.phi),
      z: polar.r * Math.cos(polar.phi),
    };
  },
};

export default PlanetMath;
