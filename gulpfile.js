var gulp = require('gulp')
var replace = require('gulp-replace')
var ngAnnotate = require('gulp-ng-annotate')
var htmlmin = require('gulp-htmlmin')
var rename = require('gulp-rename')
var uglify = require('gulp-uglify')
var sass = require('gulp-sass')
var cssmin = require('gulp-cssmin')
var autoprefixer = require('gulp-autoprefixer')
var templateCache = require('gulp-angular-templatecache')
const babel = require('gulp-babel')
var header = require('gulp-header')
var fs = require('fs')
var runSequence = require('run-sequence')
var del = require('del')

gulp.task('build', function (cb) {
	runSequence('backup', 'clean', 'build-html', 'build-js', 'build-sass', 'banner', cb)
})

gulp.task('banner', function () {
	var pkg = require('./package.json');
	var banner = ['/**',
		' * <%= pkg.name %> - <%= pkg.description %>',
		' * @version v<%= pkg.version %>',
		' * @link <%= pkg.homepage %>',
		' * @license <%= pkg.license %>',
		' */',
		''].join('\n')

	return gulp.src('dist/**.{js,css}')
		.pipe(header(banner, {pkg: pkg}))
		.pipe(gulp.dest('dist'))
})

gulp.task('build-js', ['templateCache'], function () {
	return gulp.src('src/**.js')
		.pipe(replace("/*the place to place the generated angular templateCache*/", function () {
			return fs.readFileSync('.tmp/template.js', 'utf-8').toString()
		}))
		.pipe(babel({
			presets: ['es2015']
		}))
		.pipe(ngAnnotate())
		.pipe(gulp.dest('dist'))
		.pipe(uglify())
		.pipe(rename({suffix: '.min'}))
		.pipe(gulp.dest('dist'))
})

gulp.task('build-html', function () {
	return gulp.src('src/**.html')
		.pipe(htmlmin({
			collapseWhitespace: true,
			conservativeCollapse: true
		}))
		.pipe(gulp.dest('.tmp/'))
})

gulp.task('build-sass', function () {
	return gulp.src('src/**.scss')
		.pipe(sass({
			errLogToConsole: true,
			outputStyle: 'expanded'
		}))
		.pipe(autoprefixer('last 5 version', '> 1%', 'ie 9'))
		.pipe(gulp.dest('dist'))
		.pipe(cssmin())
		.pipe(rename({suffix: '.min'}))
		.pipe(gulp.dest('dist'))
})

gulp.task('backup', function () {
	return gulp.src('dist/**')
		.pipe(gulp.dest('backup/dist-' + Date.now()))
})

gulp.task('clean', function (cb) {
	del.sync('dist')
	del.sync('.tmp')
	cb()
})

gulp.task('templateCache', function () {
	return gulp.src('src/**.html')
		.pipe(htmlmin({
			collapseWhitespace: true,
			conservativeCollapse: true
		}))
		.pipe(templateCache({
			filename: 'template.js',
			root: 'template/',
			module: 'fa.directive.borderLayout'
		}))
		.pipe(gulp.dest('.tmp'))
})
