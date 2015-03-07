"use strict";

exports.defaults = function() {
  return {
    minifyImg: {
      options: {
        interlaced: false,
        progressive: false,
        cache: false,
        optimizationLevel: 2
      },
      exts: [ "gif","jpeg","jpg","png" ]
    }
  };
};

exports.validate = function ( config, validators ) {
  var errors = [];

  if ( validators.ifExistsIsObject( errors, "minifyImg config", config.minifyImg ) ) {
    var mI = config.minifyImg;
    if ( validators.ifExistsIsObject( errors, "minifyImg.options", mI.options ) ) {
      validators.ifExistsIsBoolean( errors, "minifyImg.interlaced", mI.options.interlaced );
      validators.ifExistsIsBoolean( errors, "minifyImg.progressive", mI.options.progressive );
      validators.ifExistsIsNumber( errors, "minifyImg.optimizationLevel", mI.options.optimizationLevel );
    }

    validators.ifExistsIsArrayOfStrings( errors, "minifyImg.exts", mI.exts );
  }

  return errors;
};