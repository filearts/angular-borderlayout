var app = angular.module('app',
	["fa.directive.borderLayout", "ngRoute"]);

app.config(function ($routeProvider) {
	$routeProvider.when("/", {
		templateUrl: "home.html",
		controller: 'testCtrl'
	});
	$routeProvider.when("/home", {
		templateUrl: "home.html",
		controller: 'testCtrl'
	});
	$routeProvider.when("/about", {
		templateUrl: "about.html"
	});
});

app.controller('MainCtrl', function ($scope) {
	$scope.name = 'World';
	$scope.panes = ["north", "south"];
});

app.controller('testCtrl', function ($scope) {
	$scope.name = 'hello';
	$scope.panes = ["ha", "he"];
	$scope.$on("$viewContentLoaded", function () {
		console.log('$viewContentLoaded')
	});
});
