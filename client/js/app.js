var CLIENT_ID = 'Q0KN1OEXVIMQIKARJYQVRM5YRCKWPDKMOSFKA2ZII4IV4AUI';
var CLIENT_SECRET = 'V0OTRPCPPUJDZPEQCELUGLHFYBADAVNXDQ5ZW04CZ0RYXY0X';

var map;
var largeInfowindow;
var bounds;

function googleMapsErr() {
  alert('Google Maps Failed To Load. Please refresh!')
}

// initialize google maps
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 37.558546, lng: -122.271079 },
    zoom: 10,
    styles: styles,
    mapTypeControl: false
  });

  largeInfowindow = new google.maps.InfoWindow();
  bounds = new google.maps.LatLngBounds();

  ko.applyBindings(new ViewModel());
}

// creates window of info about the location
function populateInfoWindow(marker, street, city, infowindow) {
  if (infowindow.marker != marker) {
    infowindow.setContent('');
    infowindow.marker = marker;

    infowindow.addListener('closeclick', function () {
      infowindow.marker = null;
    });

    var streetViewService = new google.maps.StreetViewService();
    var radius = 50;

    // to get streetivew
    function getStreetView(data, status) {
      if (status == google.maps.StreetViewStatus.OK) {
        var nearStreetViewLocation = data.location.latLng;
        var heading = google.maps.geometry.spherical.computeHeading(
          nearStreetViewLocation, marker.position);
        infowindow.setContent('<div><h3>' + marker.title + '</h3>' + '<p>' + street + '<br>' + city + '</p></div><div id="pano"></div>');
        var panoramaOptions = {
          position: nearStreetViewLocation,
          pov: {
            heading: heading,
            pitch: 30
          }
        };
        var panorama = new google.maps.StreetViewPanorama(
          document.getElementById('pano'), panoramaOptions);
      } else {
        infowindow.setContent('<div><h3>' + marker.title + '</h3>' + '<p>' + street + '<br>' + city + '</p></div>' +
          '<div>No Street View Found</div>');
      }
    }

    streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);

    infowindow.open(map, marker);
  }
}

// marker icon design
function makeMarkerIcon(markerColor) {
  var markerImage = new google.maps.MarkerImage(
    'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor +
    '|40|_|%E2%80%A2',
    new google.maps.Size(21, 34),
    new google.maps.Point(0, 0),
    new google.maps.Point(10, 34),
    new google.maps.Size(21, 34));
  return markerImage;
}

var MapMarker = function (data) {
  var self = this;

  this.title = data.title;
  this.location = data.location;

  this.visible = ko.observable(true)

  var credentials = '&client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET
  var fourSquareApi = 'https://api.foursquare.com/v2/venues/search?ll=' + this.location.lat + ',' + this.location.lng + credentials + '&v=20180826';

  // fetch data from foursquare api
  $.getJSON(fourSquareApi).done(function (data) {
    var results = data.response.venues[0];

    self.street = results.location.address;
    self.cityStateZip = results.location.formattedAddress[1];
  }).fail(function () {
    alert('FourSquare API Error Occurred')
  });

  var defaultIcon = makeMarkerIcon('0091ff');
  var highlightedIcon = makeMarkerIcon('FFFF24');

  this.marker = new google.maps.Marker({
    position: this.location,
    title: this.title,
    animation: google.maps.Animation.DROP,
    icon: defaultIcon
  });

  this.showMarker = ko.computed(function () {
    if (this.visible() === true) {
      this.marker.setMap(map);
      bounds.extend(this.marker.position);
    } else {
      return this.marker.setMap(null);
    }
  }, this);

  // when clicked, does animation on marker and populate window
  this.marker.addListener('click', function () {
    populateInfoWindow(this, self.street, self.cityStateZip, largeInfowindow);

    self.marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function () {
      self.marker.setAnimation(null);
    }, 1000);
  });

  // to change color when hover for marker
  this.marker.addListener('mouseover', function () {
    this.setIcon(highlightedIcon);
  });

  this.marker.addListener('mouseout', function () {
    this.setIcon(defaultIcon);
  });

  this.showInfo = function (location) {
    google.maps.event.trigger(self.marker, 'click');
  };
};

var ViewModel = function () {
  var self = this;

  this.searchLocation = ko.observable('');
  this.locationList = ko.observableArray([]);

  locations.forEach(function (location) {
    self.locationList.push(new MapMarker(location))
  });

  map.fitBounds(bounds);

  // filters location list depending on search
  this.searchList = ko.computed(function () {
    var filter = self.searchLocation().toLowerCase();
    if (!filter) {
      self.locationList().forEach(function (location) {
        location.visible(true);
      });
      return self.locationList();
    }

    return ko.utils.arrayFilter(self.locationList(), function (location) {
      result = location.title.toLowerCase().indexOf(self.searchLocation().toLowerCase()) !== -1;
      location.visible(result);
      return result;
    });
  }, self);
};
