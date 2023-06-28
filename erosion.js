var roi = table
var year='2002'
var st_date=year+'-01-01'
var en_date=year+'-12-31'
var myScale = 500
var filter=ee.Filter.and(
                ee.Filter.date(st_date,en_date),
                ee.Filter.bounds(roi)
             )
             
Map.centerObject(roi, 6);

/************************************************************************
 * 
 *                            palettes 
 *  
 * *********************************************************************/
var palettes = require('users/gena/packages:palettes');
var palette_rainbow = palettes.kovesi.rainbow_bgyr_35_85_c72[7];

// Define the color palette
var palette = ['e41a1c', '377eb8', '4daf4a', '984ea3', 'ff7f00'];
// Define the visualization parameters
var visParams = {
  min: 1,  // Minimum value of the data
  max: 5,  // Maximum value of the data
  palette: palette
};

/************************************************************************
 * 
 *                           dataset 
 *  
 * *********************************************************************/
var SRTM = ee.Image('USGS/SRTMGL1_003');  //Slope, elevation, slope length
var col_a1 = ee.ImageCollection('MODIS/006/MOD09A1').filter(filter) // ndvi
var sand = ee.Image("projects/soilgrids-isric/sand_mean").clip(roi).select("sand_0-5cm_mean").divide(10).unmask(0).clip(roi);
var silt = ee.Image("projects/soilgrids-isric/silt_mean").clip(roi).select("silt_0-5cm_mean").divide(10).unmask(0).clip(roi);
var clay = ee.Image("projects/soilgrids-isric/clay_mean").clip(roi).select("clay_0-5cm_mean").divide(10).unmask(0).clip(roi);
var era5_tp = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD')
                  .select('precipitation')
                  .filter(filter)
                  .sum().multiply(10)
                  .clip(roi);
                  


var elevation = SRTM.select('elevation').clip(roi).float();
var slope = ee.Terrain.slope(elevation);  

var bandNames = ['elevation', 'slope'];
var combinedImage = elevation.addBands(slope)
var soil = combinedImage.select([0, 1], bandNames);

var a1_index={
   // NDVI
   NDVI:function(img){
      var ndvi = img.normalizedDifference(["nir1","red"]);  //0.85 - 0.88 µm
      return img.addBands(ndvi.rename("NDVI"));
   }
}

var slopeRank=slope.where(slope.lte(8),1)
                .where(slope.gt(8).and(slope.lte(15)),2)
                .where(slope.gt(15).and(slope.lte(25)),3)
                .where(slope.gt(25).and(slope.lte(35)),4)
                .where(slope.gt(35),5)
                
var elevationRank=elevation.where(elevation.lte(1000),1)
                .where(elevation.gt(1000).and(elevation.lte(1300)),2)
                .where(elevation.gt(1300).and(elevation.lte(1700)),3)
                .where(elevation.gt(1700).and(elevation.lte(2500)),4)
                .where(elevation.gt(2500),5)
                
var expressionSlopeLength = 'elevation / (sin(slope/180))';

var slopeLength = soil.expression(expressionSlopeLength, {
  'elevation': soil.select('elevation').multiply(Math.PI),
  'slope': soil.select('slope'), 
});

var slopeLengthRank = slopeLength.where(slopeLength.lte(150000),1)
                                  .where(slopeLength.gt(150000).and(slopeLength.lte(300000)),2)
                                  .where(slopeLength.gt(300000).and(slopeLength.lte(400000)),3)
                                  .where(slopeLength.gt(400000).and(slopeLength.lte(600000)),4)
                                  .where(slopeLength.gt(600000),5)


var blankData = ee.FeatureCollection([
  ee.Feature(roi, {})
]);
var filledData = blankData.map(function(feature) {
  return feature.set('value', 0);
});

var sandRank=sand.where(sand.lte(40),5)
                .where(sand.gt(40).and(sand.lte(50)),4)
                .where(sand.gt(50).and(sand.lte(60)),3)
                .where(sand.gt(60).and(sand.lte(80)),2)
                .where(sand.gt(80),1)
                
var siltRank=elevation.where(silt.lte(15),5)
                .where(silt.gt(15).and(silt),4)
                .where(silt.gt(25).and(silt.lte(30)),3)
                .where(silt.gt(30).and(silt.lte(35)),2)
                .where(silt.gt(35),1)
                
var clayRank=clay.where(clay.lte(10),5)
                .where(clay.gt(10).and(clay.lte(15)),4)
                .where(clay.gt(15).and(clay.lte(20)),3)
                .where(clay.gt(20).and(clay.lte(30)),2)
                .where(clay.gt(30),1)

var era5_tpRank=era5_tp.where(era5_tp.lte(2500),1)
                .where(era5_tp.gt(2500).and(era5_tp.lte(4000)),2)
                .where(era5_tp.gt(4000).and(era5_tp.lte(5000)),3)
                .where(era5_tp.gt(5000).and(era5_tp.lte(6500)),4)
                .where(era5_tp.gt(6500),1)



var ndvi = col_a1.median().clip(roi).normalizedDifference(["sur_refl_b02","sur_refl_b01"]).rename('ndvi');
soil = soil.addBands(ndvi.rename('ndvi'))

var ndviRank=ndvi.where(ndvi.lte(0),5)
                .where(ndvi.gt(0).and(ndvi.lte(0.3)),4)
                .where(ndvi.gt(0.3).and(ndvi.lte(0.5)),3)
                .where(ndvi.gt(0.5),1)


var landUse = ee.ImageCollection('ESA/WorldCover/v100').first().clip(roi);

var landUseRank=landUse.where(landUse.eq(10),1)
                .where(landUse.eq(20),1)
                .where(landUse.eq(30),2)
                .where(landUse.eq(40),3)
                .where(landUse.eq(50),4)
                .where(landUse.eq(60),5)
                .where(landUse.eq(70),2)
                .where(landUse.eq(80),0)
                .where(landUse.eq(90),2)
                .where(landUse.eq(95),1)
                .where(landUse.eq(100),5)
                


var rankBandNames = ['slopeRank', 'elevationRank', 'slopeLengthRank','ndviRank','landUseRank','era5_tpRank','sandRank','siltRank','clayRank'];
var combinedImage = slopeRank.addBands(elevationRank)
                                  .addBands(slopeLengthRank)
                                  .addBands(ndviRank)
                                  .addBands(landUseRank)
                                  .addBands(era5_tpRank)
                                  .addBands(sandRank)
                                  .addBands(siltRank)
                                  .addBands(clayRank)
var rank = combinedImage.select([0,1,2,3,4,5,6,7,8], rankBandNames);
print(rank)

var expressionErosion = '0.15*slope+0.05*elevation+slopeLength*0.1+ndvi*0.15+landUse*0.1+tp*0.15+sand*0.1+silt*0.1+clay*0.1';

var erosion = rank.expression(expressionErosion, {
  'slope': rank.select('slopeRank'),
  'elevation': rank.select('elevationRank'),
  'slopeLength': rank.select('slopeLengthRank'),
  'ndvi': rank.select('ndviRank'),
  'landUse': rank.select('landUseRank'),
  'tp': rank.select('era5_tpRank'),
  'sand': rank.select('sandRank'),
  'silt': rank.select('siltRank'),
  'clay': rank.select('clayRank'),
});


/****************************************************************************************************************************
 * 
 *                                             Display
 * 
 * **************************************************************************************************************************/

Map.addLayer(erosion, {min:0, max:5, palette: palette_rainbow}, 'erosion');
Map.addLayer(slopeRank, visParams, 'slopeRank');
Map.addLayer(elevationRank, visParams, 'elevationRank');
Map.addLayer(slopeLengthRank, visParams, 'slopeLengthRank');
Map.addLayer(ndviRank, visParams, 'ndviRank');
Map.addLayer(landUseRank, visParams, 'landUseRank');
Map.addLayer(era5_tpRank, visParams, 'era5_tpRank');
Map.addLayer(sandRank, visParams, 'sandRank');
Map.addLayer(siltRank, visParams, 'siltRank');
Map.addLayer(clayRank, visParams, 'clayRank');



/****************************************************************************************************************************
 * 
 *                                             Export
 * 
 * **************************************************************************************************************************/
 Export.image.toDrive({
  image:erosion.clip(roi),
  folder:'Erosion',
  fileNamePrefix :year+'erosion',
  description:year+'erosion',
  region:roi,
  scale:myScale,
  crs:"EPSG:4326",
  maxPixels:1e13
})