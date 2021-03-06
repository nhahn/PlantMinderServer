var gulp = require('gulp');
var gutil = require('gulp-util');
var gulpif = require('gulp-if');
var streamify = require('gulp-streamify');
var autoprefixer = require('gulp-autoprefixer');
var cssmin = require('gulp-cssmin');
var less = require('gulp-less');
var concat = require('gulp-concat');
var plumber = require('gulp-plumber');
var source = require('vinyl-source-stream');
var babelify = require('babelify');
var browserify = require('browserify');
var watchify = require('watchify');
var uglify = require('gulp-uglify');
var removeCode = require('gulp-remove-code');
var aliasify = require('aliasify').configure
var sass = require('gulp-sass');

var production = process.env.NODE_ENV === 'production';

var dependencies = [
  'alt',
  'react',
  'react/addons',
  'react-router',
  'underscore',
  'react-select',
  'react-bootstrap',
  'react-router-active-component',
  'sms-address',
  'react-bootstrap-switch'
];

/*
 |--------------------------------------------------------------------------
 | Combine all JS libraries into a single file for fewer HTTP requests.
 |--------------------------------------------------------------------------
 */
gulp.task('vendor', function() {
  return gulp.src([
    'vendor/jquery/dist/jquery.js',
    'vendor/bootstrap/dist/js/bootstrap.js',
    'vendor/magnific-popup/dist/jquery.magnific-popup.js',
    'vendor/toastr/toastr.js',
    'vendor/scrollmagic/scrollmagic/minified/ScrollMagic.min.js',
    'vendor/scrollmagic/scrollmagic/minified/plugins/animation.gsap.min.js',
    'vendor/cropit/dist/jquery.cropit.js',
    'vendor/gsap/src/minified/TweenMax.min.js',
    'vendor/chartist/dist/chartist.min.js'
  ]).pipe(concat('vendor.js'))
    .pipe(gulpif(production, uglify({ mangle: false })))
    .pipe(gulp.dest('public/js'));
});

gulp.task('config', function() {
  return gulp.src([
    'config.js'
  ]).pipe(removeCode({frontEnd: true}))
  .pipe(gulp.dest('app/'));
});

/*
 |--------------------------------------------------------------------------
 | Compile third-party dependencies separately for faster performance.
 |--------------------------------------------------------------------------
 */
gulp.task('browserify-vendor', function() {
  return browserify()
    .require(dependencies)
    .transform(aliasify, {aliases: { "react": "./node_modules/react/react.js"}})
    .bundle()
    .pipe(source('vendor.bundle.js'))
    .pipe(gulpif(production, streamify(uglify({ mangle: false }))))
    .pipe(gulp.dest('public/js'));
});

/*
 |--------------------------------------------------------------------------
 | Compile only project files, excluding all third-party dependencies.
 |--------------------------------------------------------------------------
 */
gulp.task('browserify', ['browserify-vendor'], function() {
  return browserify('app/main.js')
    .external(dependencies)
    .transform(babelify)
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(gulpif(production, streamify(uglify({ mangle: false }))))
    .pipe(gulp.dest('public/js'));
});

/*
 |--------------------------------------------------------------------------
 | Same as browserify task, but will also watch for changes and re-compile.
 |--------------------------------------------------------------------------
 */
gulp.task('browserify-watch', ['browserify-vendor'], function() {
  var bundler = watchify(browserify('app/main.js', watchify.args));
  bundler.external(dependencies);
  bundler.transform(babelify);
  bundler.on('update', rebundle);
  return rebundle();

  function rebundle() {
    var start = Date.now();
    return bundler.bundle()
      .on('error', function(err) {
        gutil.log(gutil.colors.red(err.toString()));
      })
      .on('end', function() {
        gutil.log(gutil.colors.green('Finished rebundling in', (Date.now() - start) + 'ms.'));
      })
      .pipe(source('bundle.js'))
      .pipe(gulp.dest('public/js/'));
  }
});

/*
 |--------------------------------------------------------------------------
 | Compile LESS stylesheets.
 |--------------------------------------------------------------------------
 */
gulp.task('styles', function() {
    return gulp.src([
      'vendor/chartist/dist/chartist.min.css',
      'node_modules/react-select/less/default.less',
      'vendor/nvd3/build/nv.d3.css',
      'app/stylesheets/main.less'])
    .pipe(plumber())
    .pipe(less())
    .pipe(autoprefixer())
    .pipe(concat('main.css'))
    .pipe(gulpif(production, cssmin()))
    .pipe(gulp.dest('public/css'));
});

gulp.task('watch', function() {
  gulp.watch('app/stylesheets/**/*.less', ['styles']);
});

gulp.task('default', ['styles', 'vendor', 'config', 'browserify-watch', 'watch']);
gulp.task('build', ['styles', 'vendor', 'config', 'browserify']);
