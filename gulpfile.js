var gulp = require('gulp')
var replace = require('gulp-replace')
var ngAnnotate = require('gulp-ng-annotate')
var htmlmin = require('gulp-htmlmin')
var rename = require('gulp-rename')
var uglify = require('gulp-uglify')
var fs = require('fs')

gulp.task('build', ['htmlmin'], function() {
    gulp.src('src/**.{css,scss}')
        .pipe(gulp.dest('dist'))

    return gulp.src('src/**.js')
        .pipe(replace("/*the place to place the generated angular templateCache*/", function() {
            return fs.readFileSync('.tmp/borderLayout.tpl.html', 'utf8').toString().replace(/'/gm, '\\\'').replace(/"/gm, '\\"')
        }))
        .pipe(ngAnnotate())
        .pipe(gulp.dest('dist'))
        .pipe(uglify())
        .pipe(rename(function(path) {
            path.basename += ".min";
        }))
        .pipe(gulp.dest('dist'))
})

gulp.task('htmlmin', function() {
    return gulp.src('src/**.html')
        .pipe(htmlmin({
            collapseWhitespace: true,
            conservativeCollapse: true
        }))
        .pipe(gulp.dest('.tmp/'))
})
