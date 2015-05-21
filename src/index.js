/* eslint strict:0 */

var fs = require( "fs" )
  , path = require( "path" )
  , os = require( "os" )
  , wrench = require( "wrench" )
  , async = require( "async" )
  , Imagemin = require( "imagemin" )
  , config = require( "./config" )
  , logger = null;

var _makeDirectory = function ( dir ) {
  if ( !fs.existsSync( dir ) ) {
    logger.debug( "Making folder [[ " + dir + " ]]" );
    /* eslint no-octal:0 */
    wrench.mkdirSyncRecursive( dir, 0777 );
  }
};

var _overwriteImage = function( from, to ) {
  fs.createReadStream( from ).pipe( fs.createWriteStream( to ) );
  logger.success( "Wrote minified image to back to source destination [[ " + to + " ]]" );
};

var _minifyImage = function( from, to, mimosaConfig, next ) {
  if ( fs.existsSync( to ) ) {
    fs.unlinkSync( to );
  }

  var opts = mimosaConfig.minifyImg.options;

  var imagemin = new Imagemin()
    .src(from)
    .dest(path.dirname(to))
    .use(Imagemin.jpegtran(opts.progressive))
    .use(Imagemin.gifsicle(opts.interlaced))
    .use(Imagemin.optipng(opts.optimizationLevel));

  imagemin.run( function( err, files ) {
    if ( err ) {
      logger.error( "minify-img could not minify [[ " + from + " ]], ", err );
    } else {
      var oldSize = fs.statSync( from ).size;
      var sizeDiff = oldSize - files[0].contents.length;

      if ( sizeDiff < 10 ) {
        logger.info( "minify-img did not change [[ " + from + " ]] as it is already minified." );
      } else {
        var pct = ( sizeDiff / oldSize * 100 ).toFixed() + "%";
        logger.info( "minify-img minified [[ " + from + " ]] and saved [[ " + pct + " (" + sizeDiff + ") ]]." );
        if ( mimosaConfig.minifyImg.overwrite ) {
          _overwriteImage( to, from );
        }
      }
    }

    next();
  });
};

var _buildFromToConfigs = function ( mimosaConfig ) {
  var configs = wrench.readdirSyncRecursive( mimosaConfig.watch.sourceDir ).map( function( shortPath ) {
    // build full path
    return path.join( mimosaConfig.watch.sourceDir, shortPath );
  }).filter( function filterDir( imagePath ) {
    // only care about files
    return fs.statSync( imagePath ).isFile();
  }).filter( function( imagePath ) {
    // only care about those that have the right extensions
    var ext = path.extname( imagePath ).substring( 1 );  // get path, nuke the period
    return mimosaConfig.minifyImg.exts.indexOf( ext ) > -1
  }).map( function( imagePath ) {
    return {
      from: imagePath,
      to: imagePath.replace( mimosaConfig.watch.sourceDir, mimosaConfig.watch.compiledDir )
    };
  });

  if ( logger.isDebug() ) {
    logger.debug( "minify-img configs" );
    logger.debug( JSON.stringify( configs, null, 2 ) );
  }

  return configs;
};

var _minifyImages = function( mimosaConfig ) {
  var configs = _buildFromToConfigs( mimosaConfig );

  async.eachLimit( configs, os.cpus().length, function( minifyConfig, next ) {
    var dir = path.dirname( minifyConfig.to );
    _makeDirectory( dir );
    _minifyImage( minifyConfig.from, minifyConfig.to, mimosaConfig, next);
  });
};

var registerCommand = function ( program, _logger, retrieveConfig ) {
  logger = _logger;

  program
    .command( "minimage" )
    .option("-D, --mdebug", "run in debug mode")
    .option("--overwrite", "overwrite the image in the watch.sourceDir, only do this when you are happy with the minification")
    .description( "minify images from the watch.sourceDir to the watch.compiledDir" )
    .action( function( opts ){
      var retrieveConfigOpts = {
        buildFirst: false,
        mdebug: !!opts.mdebug
      };

      retrieveConfig( retrieveConfigOpts, function( mimosaConfig ) {
        var ms = mimosaConfig.modules;
        if ( ms.indexOf( "minify-img" ) > -1 || ms.indexOf( "mimosa-minify-img" ) > -1 ) {
          mimosaConfig.minifyImg.overwrite = !!opts.overwrite;
          _minifyImages( mimosaConfig );
        } else {
          logger.error( "You have called the minimage command on a project that does not have minify-img included. To include bower, add \"minify-img\" to the \"modules\" array." );
        }

      });
    });
};

module.exports = {
  registerCommand: registerCommand,
  defaults:        config.defaults,
  validate:        config.validate
};
