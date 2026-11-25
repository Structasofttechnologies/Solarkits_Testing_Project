// ─── geolocation_db/index.js ──────────────────────────────────────────────────
module.exports = {
  GeoLevel0:            require('./geolocation_level_0.schema'),
  GeoLevel1:            require('./geolocation_level_1.schema'),
  GeoLevel2:            require('./geolocation_level_2.schema'),
  GeoLevel3:            require('./geolocation_level_3.schema'),
  GeoLevel4:            require('./geolocation_level_4.schema'),
  Level0:               require('./geolocation_level_0.schema'),
  Level1:               require('./geolocation_level_1.schema'),
  Level2:               require('./geolocation_level_2.schema'),
  Level3:               require('./geolocation_level_3.schema'),
  Level4:               require('./geolocation_level_4.schema'),
  Cluster:              require('./clusters.schema'),
  Zone:                 require('./zones.schema'),
  ExcludedUrbanCity:    require('./excluded_urban_cities.schema'),
  ExcludedRuralCity:    require('./excluded_rural_cities.schema'),
};
